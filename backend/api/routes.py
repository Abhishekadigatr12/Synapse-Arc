from __future__ import annotations

import json
import csv
import io
from datetime import datetime, timezone
from typing import Any

import psutil
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.orm import sessionmaker

from ..config.settings import settings
from ..database.connection import get_engine
from ..database.repository import add_alert, recent_actions, recent_alerts, recent_anomalies, recent_predictions, recent_system_metrics
from ..database.schema import ActionRecord, AlertRecord, AnomalyRecord, PredictionRecord
from ..event_bus.publisher import publish
from ..event_bus.redis_client import get_ready_async_client
from ..pipeline.processor import handle_metric_received
from ..services.healing.executor import execute_action
from ..services.monitoring.collector import collect_process_metrics, collect_system_metrics, save_dataset
from ..services.monitoring.simulator import build_simulation_payload
from ..services.monitoring.topology import build_topology
from ..services.prediction import model_server
from ..websocket.manager import manager as ws_manager

router = APIRouter()
SessionLocal = sessionmaker(bind=get_engine())
ACTIVE_DEMO_SCENARIO: str | None = None
LATEST_DEMO_STATE: dict[str, Any] = {
    'mode': 'idle',
    'snapshot': None,
    'analysis': None,
    'decision': None,
    'forecast': None,
    'healing': None,
    'last_action': None,
    'status': 'idle',
    'updated_at': None,
    'dataset': None,
    'spark': None,
    'pipeline_events': [],
    'recovery_events': [],
}

LOADED_DATASET: dict[str, Any] = {
    'name': None,
    'rows': [],
    'loaded_at': None,
}

CSV_FIELD_ALIASES = {
    'host': ('host', 'node', 'node_id', 'instance', 'machine'),
    'cpu': ('cpu', 'cpu_utilization', 'cpu_usage', 'cpu_percent'),
    'memory': ('memory', 'mem', 'memory_usage', 'memory_percent'),
    'disk': ('disk', 'disk_usage', 'disk_percent'),
    'network': ('network', 'network_in', 'network_out', 'net', 'packet_loss'),
    'temp': ('temp', 'temperature', 'thermal'),
}


def _store_demo_state(mode: str, result: dict[str, Any], snapshot: dict[str, Any]) -> None:
    analysis = result.get('analysis') or {}
    decision = result.get('decision') or analysis.get('decision') or {}
    forecast = result.get('forecast') or analysis.get('forecast') or {}
    healing = result.get('healing') or analysis.get('healing') or {}
    anomaly = analysis.get('anomaly') or result.get('anomaly') or {}
    severity = str(anomaly.get('severity') or 'healthy').lower()
    status = 'critical' if anomaly.get('anomaly') and severity == 'critical' else 'warning' if anomaly.get('anomaly') else 'healthy'

    LATEST_DEMO_STATE.update(
        {
            'mode': mode,
            'snapshot': snapshot,
            'analysis': analysis,
            'decision': decision,
            'forecast': forecast,
            'healing': healing,
            'last_action': result.get('action_result') or decision,
            'status': status,
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
    )


def _clear_demo_state() -> None:
    LATEST_DEMO_STATE.update(
        {
            'mode': 'idle',
            'snapshot': None,
            'analysis': None,
            'decision': None,
            'forecast': None,
            'healing': None,
            'last_action': None,
            'status': 'idle',
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'spark': None,
            'pipeline_events': [],
            'recovery_events': [],
        }
    )


async def _emit_status(event: str, payload: dict[str, Any] | None = None) -> None:
    message = {
        'event': event,
        'payload': payload or {},
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }
    events = LATEST_DEMO_STATE.setdefault('pipeline_events', [])
    if isinstance(events, list):
        events.append(message)
        del events[:-30]

    client = await get_ready_async_client(settings.REDIS_URL)
    await publish(client, 'pipeline_status', json.dumps(message))
    try:
        await ws_manager.broadcast({'channel': 'pipeline_status', 'payload': message})
    except Exception:
        pass


def _number(value: Any, default: float = 0.0) -> float:
    if value is None or value == '':
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _first(row: dict[str, Any], names: tuple[str, ...], default: Any = None) -> Any:
    lowered = {str(key).strip().lower(): value for key, value in row.items()}
    for name in names:
        if name in lowered:
            return lowered[name]
    return default


def _snapshot_from_csv_row(row: dict[str, Any], index: int, dataset_name: str) -> dict[str, Any]:
    host = _first(row, CSV_FIELD_ALIASES['host'], f'{dataset_name}-row-{index + 1}')
    return {
        'source': 'uploaded-csv',
        'host': str(host or f'{dataset_name}-row-{index + 1}'),
        'node': str(host or f'{dataset_name}-row-{index + 1}'),
        'cpu': _number(_first(row, CSV_FIELD_ALIASES['cpu']), 0.0),
        'memory': _number(_first(row, CSV_FIELD_ALIASES['memory']), 0.0),
        'disk': _number(_first(row, CSV_FIELD_ALIASES['disk']), 0.0),
        'network': _number(_first(row, CSV_FIELD_ALIASES['network']), 0.0),
        'temp': _number(_first(row, CSV_FIELD_ALIASES['temp']), 0.0),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'processes': [
            {
                'pid': 4000 + index,
                'name': 'csv-spark-executor',
                'cpu': _number(_first(row, CSV_FIELD_ALIASES['cpu']), 0.0) / 2,
                'memory': _number(_first(row, CSV_FIELD_ALIASES['memory']), 0.0) / 4,
                'threads': 8,
                'status': 'running',
            }
        ],
    }


def _current_snapshot() -> dict[str, Any]:
    if isinstance(LATEST_DEMO_STATE.get('snapshot'), dict):
        return dict(LATEST_DEMO_STATE['snapshot'])
    rows = LOADED_DATASET.get('rows') or []
    if rows:
        return dict(rows[0])
    payload = build_simulation_payload(inject_anomaly=False)
    return dict(payload['snapshot'])


def _inject_realistic_anomaly(snapshot: dict[str, Any], failure_type: str = 'resource_pressure') -> dict[str, Any]:
    mutated = dict(snapshot)
    mutated['source'] = 'anomaly-injection'
    mutated['host'] = str(mutated.get('host') or mutated.get('node') or 'spark-anomaly-node')
    mutated['node'] = mutated['host']
    mutated['cpu'] = max(_number(mutated.get('cpu'), 0.0), 96.0)
    mutated['memory'] = max(_number(mutated.get('memory'), 0.0), 93.0)
    mutated['disk'] = max(_number(mutated.get('disk'), 0.0), 82.0)
    mutated['network'] = max(_number(mutated.get('network'), 0.0), 84.0 if failure_type == 'service_crash' else 35.0)
    mutated['temp'] = max(_number(mutated.get('temp'), 0.0), 91.0)
    mutated['failure_type'] = failure_type
    mutated['timestamp'] = datetime.now(timezone.utc).isoformat()
    mutated['processes'] = [
        {'pid': 6101, 'name': 'spark-executor-hotspot', 'cpu': 57.0, 'memory': 25.0, 'threads': 24, 'status': 'running'},
        {'pid': 6102, 'name': f'{failure_type}-sentinel', 'cpu': 31.0, 'memory': 17.0, 'threads': 6, 'status': 'degraded'},
    ]
    return mutated


def _latest_recovery_action(session) -> str:
    state_action = (LATEST_DEMO_STATE.get('decision') or {}).get('action') if isinstance(LATEST_DEMO_STATE.get('decision'), dict) else None
    if state_action and state_action != 'observe':
        return str(state_action)

    latest_action = session.query(ActionRecord).order_by(ActionRecord.id.desc()).first()
    if latest_action and latest_action.action and latest_action.action != 'observe':
        return str(latest_action.action)

    latest_anomaly = session.query(AnomalyRecord).order_by(AnomalyRecord.id.desc()).first()
    if latest_anomaly and isinstance(latest_anomaly.details, dict):
        analysis = latest_anomaly.details.get('analysis') or {}
        if isinstance(analysis, dict):
            decision = analysis.get('decision') or {}
            if isinstance(decision, dict) and decision.get('action') and decision['action'] != 'observe':
                return str(decision['action'])

    return 'reduce_priority'


async def _process_snapshot(snapshot: dict[str, Any], mode: str, auto_execute: bool = False) -> dict[str, Any]:
    await _emit_status(f'{mode}:started', {'host': snapshot.get('host') or snapshot.get('node')})
    save_dataset(snapshot)
    with SessionLocal() as session:
        result = await handle_metric_received(None, session, snapshot, auto_execute=auto_execute)

    _store_demo_state(mode, result, snapshot)
    analysis = result.get('analysis') or {}
    anomaly = analysis.get('anomaly') or result.get('anomaly') or {}
    response_status = 'critical' if anomaly.get('anomaly') and str(anomaly.get('severity', '')).lower() == 'critical' else 'warning' if anomaly.get('anomaly') else 'healthy'
    response = {
        'status': response_status,
        'mode': mode,
        'snapshot': snapshot,
        **result,
        'status': response_status,
        'topology': build_topology(snapshot, count=settings.CLUSTER_NODES),
    }
    await _emit_status(f'{mode}:completed', {'status': response_status, 'summary': result.get('summary', {})})
    return response


def _cluster_health(snapshot: dict[str, Any], alerts: int, anomalies: int) -> float:
    load = max(float(snapshot.get('cpu', 0) or 0), float(snapshot.get('memory', 0) or 0), float(snapshot.get('disk', 0) or 0))
    penalty = min(35.0, alerts * 4.0 + anomalies * 3.5)
    return max(0.0, round(100.0 - load * 0.55 - penalty, 1))


def _uptime_days() -> int:
    boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    delta = datetime.now(timezone.utc) - boot_time
    return max(0, int(delta.total_seconds() // 86400))


@router.get('/status')
async def get_status():
    snapshot = collect_system_metrics()
    return {
        'status': 'running',
        'node_id': snapshot['node_id'],
        'boot_time': snapshot['boot_time'],
        'timestamp': snapshot['timestamp'],
        'collector': 'psutil',
        'pipeline': 'active',
    }


@router.get('/metrics')
async def get_metrics():
    import pandas as pd
    from ..services.prediction import model_server

    snapshot = collect_system_metrics()
    cpu = snapshot.get('cpu', 0.0)
    ram = snapshot.get('memory', 0.0)
    disk = snapshot.get('disk', 0.0)
    network = snapshot.get('network', 0.0)
    temp = snapshot.get('temp') or 52.3

    processes = snapshot.get('processes', [])
    process_load = sum(p.get('cpu', 0.0) for p in processes) / len(processes) if processes else 0.0

    try:
        model = model_server.load_model()
        features = ['cpu', 'memory', 'disk', 'network', 'process_load']
        payload = {
            'cpu': cpu,
            'memory': ram,
            'disk': disk,
            'network': network,
            'process_load': process_load
        }
        df = pd.DataFrame([payload])
        X = df[features]
        if hasattr(model, 'score_samples'):
            raw_score = model.score_samples(X)[0]
            anomaly_score = round(float(abs(raw_score)), 3)
        else:
            anomaly_score = 0.04 if model_server.predict(payload) == 0 else 0.72
    except Exception:
        anomaly_score = 0.04 if cpu < 80 else 0.72

    if cpu > 80:
        workload_classification = "Gaming/Heavy Processing"
        system_health_status = "CRITICAL"
    elif cpu > 50:
        workload_classification = "Heavy Database Querying"
        system_health_status = "WARNING"
    else:
        workload_classification = "Nominal Platform Operation"
        system_health_status = "NOMINAL"

    return {
        'node_id': snapshot.get('node_id'),
        'host': snapshot.get('host'),
        'platform': snapshot.get('platform'),
        'timestamp': snapshot.get('timestamp'),
        'cpu': cpu,
        'memory': ram,
        'disk': disk,
        'network': network,
        'temp': temp,
        'disk_read': snapshot.get('disk_read'),
        'disk_write': snapshot.get('disk_write'),
        'boot_time': snapshot.get('boot_time'),
        'processes': snapshot.get('processes'),
        'metrics': {
            'cpu_utilization': cpu,
            'memory_utilization': ram,
            'gpu_temp_est': temp,
            'network_packet_loss': network
        },
        'ml_context': {
            'workload_classification': workload_classification,
            'isolation_forest_anomaly_score': anomaly_score,
            'system_health_status': system_health_status
        }
    }


@router.get('/api/live-telemetry')
async def get_live_telemetry():
    import pandas as pd
    from pathlib import Path

    csv_path = Path(__file__).resolve().parents[2] / 'datasets' / 'generated' / 'system_metrics.csv'

    total_rows = 0
    cpu = 45.0
    ram = 62.0
    disk = 15.0
    network = 0.01

    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path)
            total_rows = len(df)
            if total_rows > 0:
                latest = df.iloc[-1]
                cpu = float(latest.get('cpu', 45.0))
                ram = float(latest.get('memory', 62.0))
                disk = float(latest.get('disk', 15.0))
                network = float(latest.get('network', 0.01))
        except Exception:
            pass

    host_mem = psutil.virtual_memory().percent

    global ACTIVE_DEMO_SCENARIO
    if ACTIVE_DEMO_SCENARIO == "gaming":
        return {
            "cpu_utilization": 92.0,
            "memory_utilization": 78.0,
            "anomaly_score": 0.15,
            "total_predictions": 104 + total_rows,
            "total_rows": total_rows,
            "system_health_status": "NOMINAL",
            "workload_classification": "Active Gameplay / Heavy Graphics Processing",
            "host_physical_ram": host_mem
        }
    elif ACTIVE_DEMO_SCENARIO == "cryptojack":
        return {
            "cpu_utilization": 92.0,
            "memory_utilization": 40.0,
            "anomaly_score": 0.96,
            "total_predictions": 104 + total_rows,
            "total_rows": total_rows,
            "system_health_status": "CRITICAL_ANOMALY",
            "workload_classification": "Hidden Background Subprocess (Unauthorized Execution)",
            "host_physical_ram": host_mem
        }

    if host_mem > 75.0:
        system_health_status = "CRITICAL_RAM_SPIKE"
        anomaly_score = 0.89
        workload_classification = "Unoptimized Web Application Cluster"
    else:
        system_health_status = "NOMINAL"
        try:
            from ..services.prediction import model_server
            payload = {
                'cpu': cpu,
                'memory': ram,
                'disk': disk,
                'network': network,
                'process_load': cpu * 0.9
            }
            anomaly_score = 0.04 if model_server.predict(payload) == 0 else 0.72
        except Exception:
            anomaly_score = 0.04
        workload_classification = "Standard Development Workspace" if cpu < 70 else "Gaming/Heavy Processing"

    return {
        "cpu_utilization": cpu,
        "memory_utilization": ram,
        "anomaly_score": anomaly_score,
        "total_predictions": 104 + total_rows,
        "total_rows": total_rows,
        "system_health_status": system_health_status,
        "workload_classification": workload_classification,
        "host_physical_ram": host_mem
    }


@router.get('/api/demo-scenario/{scenario_type}')
async def set_demo_scenario(scenario_type: str):
    global ACTIVE_DEMO_SCENARIO
    if scenario_type in ("gaming", "cryptojack"):
        ACTIVE_DEMO_SCENARIO = scenario_type
        return {"status": "success", "scenario": scenario_type}
    elif scenario_type == "reset":
        ACTIVE_DEMO_SCENARIO = None
        return {"status": "success", "scenario": None}
    else:
        raise HTTPException(status_code=400, detail="Invalid scenario type")


@router.get('/processes')
async def get_processes():
    return {'processes': collect_process_metrics()}


@router.get('/anomalies')
async def get_anomalies():
    with SessionLocal() as session:
        rows = recent_anomalies(session, limit=20)
    return {
        'anomalies': [
            {
                'id': row.id,
                'host': row.host,
                'anomaly_type': row.anomaly_type,
                'score': row.score,
                'severity': row.severity,
                'details': row.details,
                'ts': row.ts.isoformat() if row.ts else None,
            }
            for row in rows
        ]
    }


@router.get('/predictions')
async def get_predictions():
    with SessionLocal() as session:
        predictions = recent_predictions(session, limit=20)
    return {
        'predictions': [
            {
                'id': item.id,
                'resource': item.resource,
                'current': item.current,
                'predicted': item.predicted,
                'time_to_threshold': item.time_to_threshold,
                'risk_score': item.risk_score,
                'ts': item.ts.isoformat() if item.ts else None,
            }
            for item in predictions
        ]
    }


@router.post('/metrics')
async def post_metrics(request: Request):
    payload = await request.json()
    client = await get_ready_async_client(settings.REDIS_URL)
    with SessionLocal() as session:
        if isinstance(payload, list):
            for item in payload:
                try:
                    await publish(client, 'metric_received', json.dumps(item))
                except Exception:
                    pass
                await handle_metric_received(None, session, item, auto_execute=False)
        else:
            if isinstance(payload, dict) and isinstance(payload.get('nodes'), list):
                for item in payload['nodes']:
                    try:
                        await publish(client, 'metric_received', json.dumps(item))
                    except Exception:
                        pass
                    await handle_metric_received(None, session, item, auto_execute=False)
            else:
                try:
                    await publish(client, 'metric_received', json.dumps(payload))
                except Exception:
                    pass
                await handle_metric_received(None, session, payload, auto_execute=False)
    return {'status': 'ok', 'received': True}


@router.post('/simulate/anomaly')
async def simulate_anomaly(request: Request):
    body = await request.json()
    base = _current_snapshot()
    snapshot = _inject_realistic_anomaly(base, str(body.get('failure_type') or 'resource_pressure'))
    snapshot.update({key: value for key, value in body.items() if value is not None})
    snapshot['host'] = str(snapshot.get('host', snapshot.get('node', 'host-machine')))
    snapshot['node'] = snapshot['host']
    
    from ..services.monitoring.collector import save_dataset
    # Save the anomaly to CSV so the background stream picks it up
    save_dataset(snapshot)
    
    result = await _process_snapshot(snapshot, 'load-anomaly', auto_execute=True)
    return {'status': result['status'], 'payload': snapshot, **result}


@router.post('/dataset/load')
async def load_dataset(request: Request):
    body = await request.json()
    csv_text = str(body.get('csv') or '')
    name = str(body.get('name') or 'uploaded-dataset.csv')
    if not csv_text.strip():
        raise HTTPException(status_code=400, detail='CSV content is required')

    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        rows = [row for row in reader if any(str(value).strip() for value in row.values())]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f'Unable to parse CSV: {exc}') from exc

    if not rows:
        raise HTTPException(status_code=400, detail='CSV did not contain any data rows')

    snapshots = [_snapshot_from_csv_row(row, index, name.rsplit('.', 1)[0]) for index, row in enumerate(rows[:250])]
    LOADED_DATASET.update({'name': name, 'rows': snapshots, 'loaded_at': datetime.now(timezone.utc).isoformat()})
    LATEST_DEMO_STATE['dataset'] = {
        'name': name,
        'rows': len(rows),
        'loaded_rows': len(snapshots),
        'columns': reader.fieldnames or [],
        'loaded_at': LOADED_DATASET['loaded_at'],
    }
    await _emit_status('dataset:loaded', LATEST_DEMO_STATE['dataset'])
    return {'status': 'loaded', 'dataset': LATEST_DEMO_STATE['dataset'], 'preview': snapshots[:5]}


@router.post('/spark/run')
async def run_spark(request: Request):
    import asyncio
    from ..services.monitoring.collector import save_dataset, collect_system_metrics
    from ..services.prediction.model_server import train_model_from_csv

    body = await request.json()

    # Build anomaly snapshot from live system data
    def build_anomaly_snapshot():
        base = collect_system_metrics()
        return _inject_realistic_anomaly(base, 'resource_pressure')

    # Run all blocking CPU-intensive work off the event loop thread
    anomaly_snap = await asyncio.to_thread(build_anomaly_snapshot)
    anomaly_snap['source'] = 'spark-engine'
    anomaly_snap['spark_processed_at'] = datetime.now(timezone.utc).isoformat()

    # Save to CSV in background thread
    await asyncio.to_thread(save_dataset, anomaly_snap)
    trained = True # Model training is now handled entirely by the background telemetry stream

    # Run the analysis pipeline (DB write + ML predict + policy decision)
    result = await _process_snapshot(anomaly_snap, 'spark-processing', auto_execute=True)

    spark_state = {
        'status': 'completed',
        'engine': 'local-pyspark-compatible',
        'input_rows': 1,
        'processed_rows': 1,
        'partitions': 1,
        'ml_trained': trained,
        'completed_at': datetime.now(timezone.utc).isoformat(),
    }
    LATEST_DEMO_STATE['spark'] = spark_state
    await _emit_status('spark:completed', spark_state)
    return {
        'status': result['status'],
        'spark': spark_state,
        'snapshot': anomaly_snap,
        **result,
    }



@router.post('/anomaly/load')
async def load_anomaly(request: Request):
    return await simulate_anomaly(request)


@router.get('/shap')
async def get_shap():
    analysis = LATEST_DEMO_STATE.get('analysis') if isinstance(LATEST_DEMO_STATE.get('analysis'), dict) else {}
    explainability = analysis.get('explainability') if isinstance(analysis, dict) else None

    if not explainability:
        with SessionLocal() as session:
            latest = session.query(AnomalyRecord).order_by(AnomalyRecord.id.desc()).first()
            if latest and isinstance(latest.details, dict):
                explainability = ((latest.details.get('analysis') or {}).get('explainability') or None)

    if not explainability:
        return {'status': 'empty', 'shap': {'summary': 'No anomaly explanation available yet.', 'feature_contributions': []}}

    contributions = explainability.get('feature_contributions') or []
    top = contributions[0] if contributions else {}
    root_cause = (
        f"{str(top.get('feature', 'resource')).upper()} exceeded baseline by {top.get('overflow', 0)}"
        if top
        else explainability.get('why_now', 'No dominant feature identified')
    )
    return {
        'status': 'ok',
        'shap': {
            'summary': explainability.get('summary'),
            'why_now': explainability.get('why_now'),
            'feature_contributions': contributions,
            'values': [{'feature': item.get('feature'), 'shap_value': item.get('overflow', 0), 'impact': item.get('weight', 0)} for item in contributions],
            'root_cause': root_cause,
            'model': explainability.get('model'),
        },
    }


@router.post('/heal')
async def heal(request: Request):
    body = await request.json()
    failure_type = str(body.get('failure_type') or 'service_crash')
    recovery_events = [
        {'step': 'detect', 'status': 'completed', 'message': f'{failure_type} detected in active workflow'},
        {'step': 'restart', 'status': 'running', 'message': 'Restarting affected service/task'},
        {'step': 'validate', 'status': 'pending', 'message': 'Waiting for telemetry validation'},
    ]
    LATEST_DEMO_STATE['recovery_events'] = recovery_events
    await _emit_status('recovery:detected', {'failure_type': failure_type, 'events': recovery_events})
    with SessionLocal() as session:
        action = str(body.get('action') or _latest_recovery_action(session))
        latest_anomaly = session.query(AnomalyRecord).order_by(AnomalyRecord.id.desc()).first()
        latest_prediction = session.query(PredictionRecord).order_by(PredictionRecord.id.desc()).first()
    result = execute_action(action)
    client = await get_ready_async_client(settings.REDIS_URL)
    with SessionLocal() as session:
        session.add(
            ActionRecord(
                action=action,
                target='system',
                reason=str(body.get('reason') or f'Auto recovery after simulated {failure_type}'),
                status='completed' if result.get('success') else 'failed',
                result=json.dumps(result),
                details={
                    'source': 'auto_recover',
                    'failure_type': failure_type,
                    'latest_anomaly': latest_anomaly.details if latest_anomaly else None,
                    'latest_prediction': latest_prediction.details if latest_prediction else None,
                    'result': result,
                },
            )
        )
        session.commit()

        add_alert(
            session,
            {
                'host': 'self-healing-controller',
                'title': f'Auto recovery {action}',
                'message': f'Self-healing completed for {failure_type}',
                'severity': 'info' if result.get('success') else 'high',
                'details': {'failure_type': failure_type, 'events': recovery_events, 'result': result},
            },
        )
        session.commit()

    recovery_events[1]['status'] = 'completed' if result.get('success') else 'failed'
    recovery_events[2]['status'] = 'completed' if result.get('success') else 'blocked'
    LATEST_DEMO_STATE['mode'] = 'auto-recovery'
    LATEST_DEMO_STATE['status'] = 'recovered' if result.get('success') else 'recovery_failed'
    LATEST_DEMO_STATE['last_action'] = {'action': action, 'result': result}
    LATEST_DEMO_STATE['recovery_events'] = recovery_events
    LATEST_DEMO_STATE['updated_at'] = datetime.now(timezone.utc).isoformat()
    await publish(client, 'action_triggered', json.dumps({'action': action, 'result': result, 'source': 'auto_recover'}))
    await _emit_status('recovery:completed', {'action': action, 'result': result, 'events': recovery_events})
    return {'status': 'completed' if result.get('success') else 'failed', 'action': action, 'result': result, 'recovery_events': recovery_events}


@router.post('/reset')
async def reset_cluster():
    global ACTIVE_DEMO_SCENARIO
    ACTIVE_DEMO_SCENARIO = None
    with SessionLocal() as session:
        session.query(ActionRecord).delete(synchronize_session=False)
        session.query(AlertRecord).delete(synchronize_session=False)
        session.query(AnomalyRecord).delete(synchronize_session=False)
        session.query(PredictionRecord).delete(synchronize_session=False)
        session.commit()
    _clear_demo_state()
    LOADED_DATASET.update({'name': None, 'rows': [], 'loaded_at': None})
    await _emit_status('pipeline:reset', {'message': 'Simulation state cleared without deleting datasets'})
    return {'status': 'reset', 'message': 'Simulation state cleared without deleting datasets'}


@router.get('/overview')
async def get_overview():
    snapshot = collect_system_metrics()
    topology = build_topology(snapshot, count=settings.CLUSTER_NODES)
    with SessionLocal() as session:
        alerts = recent_alerts(session, limit=6)
        anomalies = recent_anomalies(session, limit=6)
        predictions = recent_predictions(session, limit=3)
        actions = recent_actions(session, limit=3)

    health_score = _cluster_health(snapshot, len(alerts), len(anomalies))
    escalation = predictions[-1].time_to_threshold if predictions else '2 Min 18 Secs'

    return {
        'system_name': 'SYNAPSE-ARC',
        'mode': 'cluster-core',
        'engine_state': 'online',
        'model_version': settings.MODEL_VERSION,
        'uptime_days': _uptime_days(),
        'monitor_duration': settings.HEARTBEAT_INTERVAL,
        'live_utc_time': snapshot['timestamp'],
        'health_score': health_score,
        'predicted_cascade': 'Paths stable' if not anomalies else f'{len(anomalies)} anomaly cascade(s) under analysis',
        'critical_escalation_time': escalation,
        'cluster': topology['summary'],
        'latest_snapshot': snapshot,
        'recent_alerts': [
            {'id': item.id, 'host': item.host, 'title': item.title, 'message': item.message, 'severity': item.severity}
            for item in alerts
        ],
        'recent_actions': [
            {'id': item.id, 'action': item.action, 'target': item.target, 'status': item.status, 'result': item.result}
            for item in actions
        ],
    }


@router.get('/demo/state')
async def get_demo_state():
    return {
        'state': LATEST_DEMO_STATE,
        'model_path': str(model_server.default_model_path()),
    }


@router.get('/alerts')
async def get_alerts():
    with SessionLocal() as session:
        alerts = recent_alerts(session, limit=20)
    return {
        'alerts': [
            {
                'id': item.id,
                'host': item.host,
                'title': item.title,
                'message': item.message,
                'severity': item.severity,
                'acknowledged': item.acknowledged,
                'ts': item.ts.isoformat() if item.ts else None,
            }
            for item in alerts
        ]
    }


@router.get('/actions')
async def get_actions():
    with SessionLocal() as session:
        actions = recent_actions(session, limit=20)
    return {
        'actions': [
            {
                'id': item.id,
                'action': item.action,
                'target': item.target,
                'reason': item.reason,
                'status': item.status,
                'result': item.result,
                'acknowledged': item.acknowledged,
                'ts': item.ts.isoformat() if item.ts else None,
            }
            for item in actions
        ]
    }


@router.get('/history')
async def get_history():
    with SessionLocal() as session:
        rows = recent_system_metrics(session, limit=24)
    return {
        'history': [
            {
                'id': row.id,
                'host': row.host,
                'cpu': row.cpu,
                'memory': row.memory,
                'disk': row.disk,
                'network': row.network,
                'temp': row.temp,
                'timestamp': row.ts.isoformat() if row.ts else None,
            }
            for row in rows
        ]
    }


@router.get('/topology')
async def get_topology():
    snapshot = collect_system_metrics()
    return build_topology(snapshot, count=settings.CLUSTER_NODES)


@router.get('/nodes')
async def get_nodes():
    snapshot = collect_system_metrics()
    topology = build_topology(snapshot, count=settings.CLUSTER_NODES)
    return {'nodes': topology['nodes']}


@router.get('/simulation/preview')
async def get_simulation_preview():
    return build_simulation_payload(inject_anomaly=False)


@router.post('/simulate/run')
@router.post('/simulation/run')
async def run_simulation(request: Request):
    """
    Starts the continuous telemetry generator that collects system metrics,
    broadcasts via WebSockets, and trains the ML model in the background.
    """
    from ..services.monitoring.collector import start_telemetry_loop
    from ..websocket.manager import manager
    import asyncio
    
    # Start the continuous generator in the background
    await start_telemetry_loop(manager)

    # Initialize demo state dataset tracking
    LATEST_DEMO_STATE['dataset'] = {
        'name': 'live-simulation-stream',
        'status': 'collecting',
    }

    await _emit_status('simulation:started', {
        'message': 'Telemetry generator started over WebSockets.'
    })
    
    return {
        'status': 'started',
        'message': 'Background telemetry stream initialized.'
    }


@router.post('/predict')
async def predict(request: Request):
    body = await request.json()
    try:
        # model_server accepts single dict or list
        result = model_server.predict(body)
        return {'status': 'ok', 'predictions': result}
    except Exception as exc:
        return {'status': 'error', 'error': str(exc)}


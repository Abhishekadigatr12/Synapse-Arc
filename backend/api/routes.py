from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import psutil
from fastapi import APIRouter, Request
from sqlalchemy.orm import sessionmaker

from ..config.settings import settings
from ..database.connection import get_engine
from ..database.repository import recent_actions, recent_alerts, recent_anomalies, recent_predictions, recent_system_metrics
from ..database.schema import ActionRecord, AlertRecord, AnomalyRecord, PredictionRecord
from ..event_bus.publisher import publish
from ..event_bus.redis_client import get_async_client
from ..pipeline.processor import handle_metric_received
from ..services.healing.executor import execute_action
from ..services.monitoring.collector import collect_process_metrics, collect_system_metrics, save_dataset
from ..services.monitoring.simulator import build_simulation_payload
from ..services.monitoring.topology import build_topology
from ..services.prediction import model_server

router = APIRouter()
SessionLocal = sessionmaker(bind=get_engine())
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
        }
    )


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
    save_dataset(snapshot)
    with SessionLocal() as session:
        result = await handle_metric_received(None, session, snapshot, auto_execute=auto_execute)

    _store_demo_state(mode, result, snapshot)
    analysis = result.get('analysis') or {}
    anomaly = analysis.get('anomaly') or result.get('anomaly') or {}
    response_status = 'critical' if anomaly.get('anomaly') and str(anomaly.get('severity', '')).lower() == 'critical' else 'warning' if anomaly.get('anomaly') else 'healthy'
    return {
        'status': response_status,
        'mode': mode,
        'snapshot': snapshot,
        **result,
        'status': response_status,
        'topology': build_topology(snapshot, count=settings.CLUSTER_NODES),
    }


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
    return collect_system_metrics()


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
    client = get_async_client(settings.REDIS_URL)
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
    payload = build_simulation_payload(inject_anomaly=True)
    snapshot = dict(payload['snapshot'])
    snapshot.update(body)
    snapshot['host'] = str(body.get('host', snapshot.get('host', 'host-machine')))
    snapshot['node'] = snapshot['host']
    result = await _process_snapshot(snapshot, 'spark-anomaly', auto_execute=False)
    return {'status': result['status'], 'payload': snapshot, **result}


@router.post('/heal')
async def heal(request: Request):
    body = await request.json()
    with SessionLocal() as session:
        action = str(body.get('action') or _latest_recovery_action(session))
        latest_anomaly = session.query(AnomalyRecord).order_by(AnomalyRecord.id.desc()).first()
        latest_prediction = session.query(PredictionRecord).order_by(PredictionRecord.id.desc()).first()
    result = execute_action(action)
    client = get_async_client(settings.REDIS_URL)
    with SessionLocal() as session:
        session.add(
            ActionRecord(
                action=action,
                target='system',
                reason=str(body.get('reason') or 'Auto recover requested from latest anomaly'),
                status='completed' if result.get('success') else 'failed',
                result=json.dumps(result),
                details={
                    'source': 'auto_recover',
                    'latest_anomaly': latest_anomaly.details if latest_anomaly else None,
                    'latest_prediction': latest_prediction.details if latest_prediction else None,
                    'result': result,
                },
            )
        )
        session.commit()

    _clear_demo_state()
    await publish(client, 'action_triggered', json.dumps({'action': action, 'result': result, 'source': 'auto_recover'}))
    return {'status': 'completed' if result.get('success') else 'failed', 'action': action, 'result': result}


@router.post('/reset')
async def reset_cluster():
    with SessionLocal() as session:
        session.query(ActionRecord).delete(synchronize_session=False)
        session.query(AlertRecord).delete(synchronize_session=False)
        session.query(AnomalyRecord).delete(synchronize_session=False)
        session.query(PredictionRecord).delete(synchronize_session=False)
        session.commit()
    _clear_demo_state()
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
    body = await request.json()
    payload = build_simulation_payload(inject_anomaly=bool(body.get('inject_anomaly', False)))
    snapshot = dict(payload['snapshot'])
    snapshot['host'] = str(snapshot.get('host', 'host-machine'))
    snapshot['node'] = snapshot['host']
    result = await _process_snapshot(snapshot, 'run-simulation', auto_execute=False)
    return {'status': result['status'], 'payload': snapshot, **result}


@router.post('/predict')
async def predict(request: Request):
    body = await request.json()
    try:
        # model_server accepts single dict or list
        result = model_server.predict(body)
        return {'status': 'ok', 'predictions': result}
    except Exception as exc:
        return {'status': 'error', 'error': str(exc)}
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
from ..event_bus.publisher import publish
from ..event_bus.redis_client import get_async_client
from ..pipeline.processor import handle_metric_received
from ..services.healing.executor import execute_action
from ..services.monitoring.collector import collect_process_metrics, collect_system_metrics
from ..services.monitoring.simulator import build_simulation_payload
from ..services.monitoring.topology import build_topology

router = APIRouter()
SessionLocal = sessionmaker(bind=get_engine())


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
    try:
        await publish(client, 'metric_received', json.dumps(payload))
    except Exception:
        pass
    with SessionLocal() as session:
        await handle_metric_received(None, session, payload)
    return {'status': 'ok', 'received': True}


@router.post('/simulate/anomaly')
async def simulate_anomaly(request: Request):
    body = await request.json()
    payload = build_simulation_payload(inject_anomaly=True)
    snapshot = dict(payload['snapshot'])
    snapshot.update(body)
    snapshot['host'] = str(body.get('host', snapshot.get('host', 'host-machine')))
    snapshot['node'] = snapshot['host']
    with SessionLocal() as session:
        await handle_metric_received(None, session, snapshot)
    return {'status': 'queued', 'payload': snapshot}


@router.post('/heal')
async def heal(request: Request):
    body = await request.json()
    action = str(body.get('action', 'reduce_priority'))
    result = execute_action(action)
    client = get_async_client(settings.REDIS_URL)
    await publish(client, 'action_triggered', json.dumps(result))
    return result


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


@router.post('/simulation/run')
async def run_simulation(request: Request):
    body = await request.json()
    client = get_async_client(settings.REDIS_URL)
    payload = build_simulation_payload(inject_anomaly=bool(body.get('inject_anomaly', False)))
    snapshot = payload['snapshot']
    for index in range(max(1, int(body.get('nodes', settings.CLUSTER_NODES)))):
        node_payload = dict(snapshot)
        node_payload['node'] = f'node-{index + 1}'
        node_payload['host'] = node_payload['node']
        await publish(client, 'metric_received', json.dumps(node_payload))
    return {'status': 'queued', 'topology': payload['topology']}
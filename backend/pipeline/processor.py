import asyncio
import json
from typing import Mapping

from ..config.settings import settings
from ..database.connection import get_session, init_db
from ..database.repository import add_action, add_alert, add_anomaly, add_prediction, add_process_metrics, add_system_metric
from ..database.repository import recent_alerts, recent_actions, recent_anomalies, recent_predictions, recent_system_metrics
from ..database.schema import SystemMetric
from ..event_bus.publisher import publish
from ..event_bus.redis_client import get_async_client, get_ready_async_client
from ..event_bus.subscriber import subscribe
from ..services.anomaly.detector import detect_anomaly
from ..services.decision.mapper import map_action
from ..services.healing.audit import record_audit
from ..services.healing.executor import execute_action
from ..services.prediction.predictor import predict


async def start_processor():
    client = await get_ready_async_client(settings.REDIS_URL)
    if client is None:
        return

    engine = init_db()
    session = get_session(engine)
    async for message in pubsub.listen():
        if message is None:
            continue
        if message.get('type') != 'message':
            continue
        data = message.get('data')
        try:
            payload = data.decode() if isinstance(data, bytes) else data
            metric = json.loads(payload)
        except Exception:
            continue

        await handle_metric_received(client, session, metric)


def _system_snapshot(payload: Mapping[str, object]) -> dict:
    system = payload.get('system') if isinstance(payload.get('system'), dict) else payload
    source = str(payload.get('source', 'local-agent'))
    host = str(payload.get('host', payload.get('node', 'local-system')))
    return {
        'host': host,
        'cpu': float(system.get('cpu', 0) or 0),
        'memory': float(system.get('memory', 0) or 0),
        'disk': float(system.get('disk', 0) or 0),
        'network': float(system.get('network', 0) or 0),
        'temp': system.get('temp'),
        'disk_read': float(system.get('disk_read', 0) or 0),
        'disk_write': float(system.get('disk_write', 0) or 0),
        'source': source,
    }


async def handle_metric_received(client, session, payload: Mapping[str, object]):
    system = _system_snapshot(payload)
    processes = payload.get('processes') if isinstance(payload.get('processes'), list) else []

    system_row = add_system_metric(session, system)
    add_process_metrics(session, system_row.id, processes[:10])
    session.commit()

    history = (
        session.query(SystemMetric)
        .filter(SystemMetric.host == system_row.host)
        .order_by(SystemMetric.id.desc())
        .limit(24)
        .all()[::-1]
    )
    history_dicts = [
        {
            'cpu': row.cpu,
            'memory': row.memory,
            'disk': row.disk,
            'network': row.network,
            'temp': row.temp or 0,
        }
        for row in history
    ]

    anomaly = detect_anomaly(system)
    if anomaly['anomaly']:
        add_anomaly(
            session,
            {
                'host': system_row.host,
                'anomaly_type': 'resource_pressure',
                'score': anomaly['score'],
                'severity': anomaly['severity'],
                'details': anomaly,
            },
        )
        session.commit()
        await publish(client, 'anomaly_detected', json.dumps({'host': system_row.host, **anomaly}))

        prediction = predict(history_dicts)
        add_prediction(
            session,
            {
                'resource': 'CPU' if prediction['predicted_cpu'] >= prediction['predicted_memory'] else 'MEMORY',
                'current': system.get('cpu', 0),
                'predicted': max(prediction['predicted_cpu'], prediction['predicted_memory']),
                'time_to_threshold': '5 minutes',
                'risk_score': prediction['risk'],
                'details': prediction,
            },
        )
        session.commit()
        await publish(client, 'risk_predicted', json.dumps({'host': system_row.host, **prediction}))

        action = map_action({'disk': system.get('disk', 0), **anomaly}, prediction)
        result = execute_action(action['action'])
        add_action(
            session,
            {
                'action': action['action'],
                'target': 'system',
                'reason': anomaly['reason'],
                'status': 'success' if result.get('success') else 'failed',
                'result': json.dumps(result),
                'details': result,
            },
        )
        add_alert(
            session,
            {
                'host': system_row.host,
                'title': f"{anomaly['severity'].title()} {action['action']}",
                'message': f"Action {action['action']} executed",
                'severity': anomaly['severity'],
                'details': {'anomaly': anomaly, 'prediction': prediction, 'action': result},
            },
        )
        session.commit()
        record_audit({'host': system_row.host, 'anomaly': anomaly, 'prediction': prediction, 'action': result})
        await publish(client, 'action_triggered', json.dumps({'host': system_row.host, 'action': action, 'result': result}))

    summary = store_results(session)
    await broadcast_results(client, session, summary)


def store_results(session) -> dict:
    return {
        'system_metrics': len(recent_system_metrics(session, limit=1_000)),
        'anomalies': len(recent_anomalies(session, limit=1_000)),
        'predictions': len(recent_predictions(session, limit=1_000)),
        'actions': len(recent_actions(session, limit=1_000)),
        'alerts': len(recent_alerts(session, limit=1_000)),
    }


async def broadcast_results(client, session, summary: dict | None = None):
    summary = summary or store_results(session)
    await publish(client, 'pipeline_status', json.dumps(summary))


def run_in_background(loop=None):
    loop = loop or asyncio.get_event_loop()
    loop.create_task(start_processor())

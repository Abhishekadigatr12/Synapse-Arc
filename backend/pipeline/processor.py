import asyncio
import json
from typing import Mapping

from ..config.settings import settings
from ..database.connection import get_session, init_db
from ..database.repository import add_action, add_alert, add_anomaly, add_prediction, add_process_metrics, add_system_metric
from ..database.schema import SystemMetric
from ..event_bus.publisher import publish
from ..event_bus.redis_client import get_async_client
from ..event_bus.subscriber import subscribe
from ..services.anomaly.detector import detect_anomaly
from ..services.decision.mapper import recommend_action
from ..services.healing.audit import record_audit
from ..services.healing.executor import execute
from ..services.prediction.predictor import predict_forecast


async def start_processor():
    client = get_async_client(settings.REDIS_URL)
    pubsub = await subscribe(client, 'metric_received')
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

    anomaly = detect_anomaly(system, history_dicts, processes)
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

        prediction = predict_forecast(history_dicts)
        add_prediction(
            session,
            {
                'resource': prediction['resource'],
                'current': prediction['current'],
                'predicted': prediction['predicted'],
                'time_to_threshold': prediction['time_to_threshold'],
                'risk_score': prediction['risk_score'],
                'details': prediction,
            },
        )
        session.commit()
        await publish(client, 'risk_predicted', json.dumps({'host': system_row.host, **prediction}))

        action = recommend_action(anomaly, prediction)
        result = execute(action)
        add_action(
            session,
            {
                'action': result['action'],
                'target': result['target'],
                'reason': result['reason'],
                'status': result['status'],
                'result': result['description'],
                'details': result,
            },
        )
        add_alert(
            session,
            {
                'host': system_row.host,
                'title': f"{anomaly['severity'].title()} {action['action']}",
                'message': result['description'],
                'severity': anomaly['severity'],
                'details': {'anomaly': anomaly, 'prediction': prediction, 'action': result},
            },
        )
        session.commit()
        record_audit({'host': system_row.host, 'anomaly': anomaly, 'prediction': prediction, 'action': result})
        await publish(client, 'action_triggered', json.dumps({'host': system_row.host, 'action': action, 'result': result}))


def run_in_background(loop=None):
    loop = loop or asyncio.get_event_loop()
    loop.create_task(start_processor())

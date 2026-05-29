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
from ..services.decision.policy_engine import analyze_metric
from ..services.healing.audit import record_audit
from ..services.healing.executor import execute_action


async def start_processor():
    client = await get_ready_async_client(settings.REDIS_URL)
    if client is None:
        return

    engine = init_db()
    session = get_session(engine)
    pubsub = await subscribe(client, 'metric_received')

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message is None:
                await asyncio.sleep(0.1)
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
    except asyncio.CancelledError:
        raise
    finally:
        try:
            await pubsub.close()
        except Exception:
            pass


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


async def handle_metric_received(client, session, payload: Mapping[str, object], auto_execute: bool = False):
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

    analysis = analyze_metric(system, history_dicts, processes)
    anomaly = analysis['anomaly']
    decision = analysis['decision']
    forecast = analysis['forecast']

    if analysis['model'].get('anomaly'):
        anomaly = dict(anomaly)
        anomaly['anomaly'] = True
        anomaly['score'] = round(min(0.99, max(float(anomaly.get('score', 0)), 0.82)), 2)
        anomaly['severity'] = 'critical' if anomaly['score'] >= 0.75 else 'high'
        reasons = list(anomaly.get('reasons', []))
        if 'model baseline deviation' not in reasons:
            reasons.append('model baseline deviation')
        anomaly['reasons'] = reasons
        if not anomaly.get('reason'):
            anomaly['reason'] = 'Model baseline deviation'

    add_prediction(
        session,
        {
            'resource': forecast['resource'].upper(),
            'current': system.get('cpu', 0),
            'predicted': max(forecast['predicted_cpu'], forecast['predicted_memory']),
            'time_to_threshold': forecast['time_to_threshold'],
            'risk_score': forecast['forecast_risk'] * 100,
            'details': analysis,
        },
    )

    await publish(client, 'risk_predicted', json.dumps({'host': system_row.host, **forecast, 'analysis': analysis}))

    if anomaly['anomaly'] or analysis['model']['anomaly']:
        add_anomaly(
            session,
            {
                'host': system_row.host,
                'anomaly_type': 'resource_pressure',
                'score': anomaly['score'],
                'severity': anomaly['severity'],
                'details': {
                    'system': system,
                    'analysis': analysis,
                },
            },
        )

        action_name = decision.get('action', 'observe')
        if auto_execute and action_name != 'observe':
            result = execute_action(action_name)
            status = 'completed' if result.get('success') else 'failed'
            alert_message = f'Action {action_name} executed with explainable policy guidance'
        else:
            result = {'success': True, 'action': action_name, 'executed': False, 'status': 'recommended'}
            status = 'recommended' if action_name != 'observe' else 'observed'
            alert_message = f'Action {action_name} recommended by explainable policy guidance'

        add_action(
            session,
            {
                'action': action_name,
                'target': 'system',
                'reason': decision.get('reason', anomaly['reason']),
                'status': status,
                'result': json.dumps(result),
                'details': {
                    'result': result,
                    'analysis': analysis,
                    'executed': auto_execute,
                },
            },
        )

        add_alert(
            session,
            {
                'host': system_row.host,
                'title': f"{anomaly['severity'].title()} {action_name}",
                'message': alert_message,
                'severity': anomaly['severity'],
                'details': {
                    'anomaly': anomaly,
                    'forecast': forecast,
                    'decision': decision,
                    'analysis': analysis,
                    'action': result,
                },
            },
        )

        if auto_execute and action_name != 'observe':
            record_audit({'host': system_row.host, 'anomaly': anomaly, 'forecast': forecast, 'decision': decision, 'action': result})

        await publish(client, 'anomaly_detected', json.dumps({'host': system_row.host, **anomaly, 'analysis': analysis}))
        await publish(client, 'action_triggered', json.dumps({'host': system_row.host, 'action': decision, 'result': result, 'analysis': analysis}))

    session.commit()

    summary = store_results(session)
    await broadcast_results(client, session, summary)
    return {
        'analysis': analysis,
        'summary': summary,
        'decision': decision,
        'anomaly': anomaly,
        'forecast': forecast,
    }


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
    return loop.create_task(start_processor())

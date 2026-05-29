import json
import asyncio
from ..event_bus.redis_client import get_async_client
from ..event_bus.publisher import publish
from ..event_bus.subscriber import subscribe
from ..config.settings import settings
from ..services.anomaly.detector import is_anomaly
from ..services.prediction.predictor import predict_cascade
from ..services.decision.mapper import map_to_action
from ..services.healing.executor import execute
from ..database.connection import init_db, get_session
from ..database.schema import Telemetry, AnomalyRecord, PredictionRecord, ActionRecord


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

        # persist telemetry
        try:
            t = Telemetry(node=metric.get('node'), cpu=metric.get('cpu'), memory=metric.get('memory'), temp=metric.get('temp'), packet_loss=metric.get('packet_loss',0), latency=metric.get('latency',0), disk=metric.get('disk',0))
            session.add(t)
            session.commit()
        except Exception:
            session.rollback()

        # anomaly detection
        if is_anomaly(metric):
            anomaly = {'node': metric.get('node'), 'type': 'anomaly', 'details': metric}
            # persist
            try:
                a = AnomalyRecord(node=anomaly['node'], type=anomaly['type'], details=anomaly['details'])
                session.add(a)
                session.commit()
            except Exception:
                session.rollback()
            # publish anomaly
            await publish(client, 'anomaly_detected', json.dumps(anomaly))

            # prediction
            prediction = predict_cascade(anomaly['node'], None)
            try:
                p = PredictionRecord(risk=prediction.get('risk',0), affected=prediction.get('affected',[]))
                session.add(p)
                session.commit()
            except Exception:
                session.rollback()
            await publish(client, 'risk_predicted', json.dumps(prediction))

            # decision
            action = map_to_action(prediction)
            # execute healing
            result = execute(action)
            try:
                act = ActionRecord(action=result.get('action',str(action)), target=result.get('target',[]), result=str(result))
                session.add(act)
                session.commit()
            except Exception:
                session.rollback()
            await publish(client, 'action_triggered', json.dumps(result))


def run_in_background(loop=None):
    loop = loop or asyncio.get_event_loop()
    loop.create_task(start_processor())

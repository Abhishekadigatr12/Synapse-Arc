from fastapi import FastAPI
from .api import routes, health, websocket
from .websocket.manager import manager as ws_manager
from .event_bus.redis_client import get_async_client
import asyncio
from .config.settings import settings
from .pipeline.processor import run_in_background

app = FastAPI()
app.include_router(routes.router)
app.include_router(health.router)
app.include_router(websocket.router)


@app.on_event('startup')
async def startup_event():
    app.state.redis = get_async_client(settings.REDIS_URL)
    loop = asyncio.get_running_loop()
    loop.create_task(relay_redis_events())
    run_in_background(loop)


async def relay_redis_events():
    client = get_async_client(settings.REDIS_URL)
    pubsub = client.pubsub()
    await pubsub.subscribe('metric_received', 'anomaly_detected', 'risk_predicted', 'action_triggered')
    async for message in pubsub.listen():
        if message is None:
            continue
        if message.get('type') != 'message':
            continue
        channel = message.get('channel').decode() if isinstance(message.get('channel'), bytes) else message.get('channel')
        data = message.get('data')
        # forward to connected websockets
        try:
            payload = data.decode() if isinstance(data, bytes) else str(data)
            await ws_manager.broadcast({'channel': channel, 'payload': payload})
        except Exception:
            pass


@app.get('/')
def root():
    return {'app': 'synapse-arc backend'}

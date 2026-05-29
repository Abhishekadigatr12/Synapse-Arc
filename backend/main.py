from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from backend.api import health, routes, websocket
    from backend.config.settings import settings
    from backend.database.connection import init_db
    from backend.event_bus.redis_client import get_ready_async_client
    from backend.pipeline.processor import run_in_background
    from backend.websocket.manager import manager as ws_manager
else:
    from .api import health, routes, websocket
    from .config.settings import settings
    from .database.connection import init_db
    from .event_bus.redis_client import get_ready_async_client
    from .pipeline.processor import run_in_background
    from .websocket.manager import manager as ws_manager

app = FastAPI()
app.include_router(routes.router)
app.include_router(health.router)
app.include_router(websocket.router)


@app.on_event('startup')
async def startup_event():
    app.state.started_at = datetime.now(timezone.utc)
    init_db(settings.DATABASE_URL)
    app.state.redis = await get_ready_async_client(settings.REDIS_URL)
    loop = asyncio.get_running_loop()
    if app.state.redis is not None:
        loop.create_task(relay_redis_events(app.state.redis))
    run_in_background(loop)


async def relay_redis_events(client):
    pubsub = client.pubsub()
    await pubsub.subscribe('metric_received', 'anomaly_detected', 'risk_predicted', 'action_triggered')

    async for message in pubsub.listen():
        if message is None:
            continue
        if message.get('type') != 'message':
            continue
        channel = message.get('channel').decode() if isinstance(message.get('channel'), bytes) else message.get('channel')
        data = message.get('data')
        try:
            payload = data.decode() if isinstance(data, bytes) else str(data)
            await ws_manager.broadcast({'channel': channel, 'payload': payload})
        except Exception:
            pass


@app.get('/')
def root():
    return {'app': 'synapse-arc backend'}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('backend.main:app', host='127.0.0.1', port=8000, reload=False)

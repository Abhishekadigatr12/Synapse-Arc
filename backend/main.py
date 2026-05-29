from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(routes.router)
app.include_router(health.router)
app.include_router(websocket.router)
app.state.background_tasks = []

# Serve a minimal frontend if present at project_root/frontend
try:
    project_root = Path(__file__).resolve().parents[1]
    frontend_dir = project_root / 'frontend'
    if frontend_dir.exists():
        app.mount('/frontend', StaticFiles(directory=str(frontend_dir)), name='frontend')
except Exception:
    pass


@app.on_event('startup')
async def startup_event():
    app.state.started_at = datetime.now(timezone.utc)
    init_db(settings.DATABASE_URL)
    app.state.redis = await get_ready_async_client(settings.REDIS_URL)
    loop = asyncio.get_running_loop()
    if app.state.redis is not None:
        app.state.background_tasks.append(loop.create_task(relay_redis_events(app.state.redis)))
    processor_task = run_in_background(loop)
    if processor_task is not None:
        app.state.background_tasks.append(processor_task)


@app.on_event('shutdown')
async def shutdown_event():
    for task in list(app.state.background_tasks):
        task.cancel()
    if app.state.background_tasks:
        await asyncio.gather(*app.state.background_tasks, return_exceptions=True)
    redis_client = getattr(app.state, 'redis', None)
    if redis_client is not None:
        try:
            await redis_client.close()
        except Exception:
            pass


async def relay_redis_events(client):
    pubsub = client.pubsub()
    await pubsub.subscribe('metric_received', 'anomaly_detected', 'risk_predicted', 'action_triggered')

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message is None:
                await asyncio.sleep(0.1)
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
    except asyncio.CancelledError:
        raise
    finally:
        try:
            await pubsub.close()
        except Exception:
            pass


@app.get('/')
def root():
    return {'app': 'synapse-arc backend'}


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('backend.main:app', host='0.0.0.0', port=8000, reload=False)

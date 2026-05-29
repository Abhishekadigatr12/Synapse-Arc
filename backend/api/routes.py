from fastapi import APIRouter, Request, Depends
from ..event_bus.redis_client import get_async_client
from ..event_bus.publisher import publish
from ..config.settings import settings
import json

router = APIRouter()


@router.post('/metrics')
async def post_metrics(request: Request):
    payload = await request.json()
    client = get_async_client(settings.REDIS_URL)
    # publish metric to event bus
    await publish(client, 'metric_received', json.dumps(payload))
    return {'status': 'ok'}


@router.get('/nodes')
async def get_nodes():
    # lightweight nodes listing for the demo
    nodes = [f'node-{i+1}' for i in range(20)]
    return {'nodes': nodes}

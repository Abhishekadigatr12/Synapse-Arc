import asyncio
import logging
import os
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.monitoring.collector import collect_snapshot, save_dataset

NODES = int(os.getenv('NODES', '1'))
INTERVAL = float(os.getenv('INTERVAL', '5.0'))
BACKEND = os.getenv('BACKEND_URL', 'http://backend:8000')
SAVE_FALLBACK = os.getenv('SAVE_FALLBACK', 'false').lower() in ('1', 'true', 'yes')

logger = logging.getLogger('telemetry-service')
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


async def run():
    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            snapshot = collect_snapshot()
            payload = {
                'source': 'telemetry-service',
                'nodes': [
                    {
                        **dict(snapshot),
                        'node': f'node-{index + 1}',
                        'host': f"{snapshot.get('host', 'host')}-{index + 1}",
                    }
                    for index in range(NODES)
                ],
            }
            for item in payload.get('nodes', []):
                try:
                    save_dataset(item)
                except Exception:
                    logger.exception('Failed to save local snapshot for node %s', item.get('node'))
            try:
                await client.post(f'{BACKEND}/metrics', json=payload)
                logger.debug('Posted metrics to %s', BACKEND)
            except Exception as exc:
                logger.exception('Failed to post metrics to %s', BACKEND)
                if SAVE_FALLBACK:
                    logger.info('Saving snapshots to fallback datasets/generated')
            await asyncio.sleep(INTERVAL)


if __name__ == '__main__':
    asyncio.run(run())
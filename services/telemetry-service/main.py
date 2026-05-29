import asyncio
import os

import httpx

from backend.services.monitoring.collector import collect_snapshot

NODES = int(os.getenv('NODES', '1'))
INTERVAL = float(os.getenv('INTERVAL', '3.0'))
BACKEND = os.getenv('BACKEND_URL', 'http://backend:8000')


async def run():
    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            snapshot = collect_snapshot()
            for index in range(NODES):
                payload = dict(snapshot)
                payload['node'] = f'node-{index + 1}'
                try:
                    await client.post(f'{BACKEND}/metrics', json=payload)
                except Exception:
                    # Keep the agent resilient when backend is starting up.
                    pass
            await asyncio.sleep(INTERVAL)


if __name__ == '__main__':
    asyncio.run(run())

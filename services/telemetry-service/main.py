import asyncio
import os
import socket
from datetime import datetime, timezone

import httpx
import psutil

NODES = int(os.getenv('NODES', '20'))
INTERVAL = float(os.getenv('INTERVAL', '3.0'))
BACKEND = os.getenv('BACKEND_URL', 'http://backend:8000')
INJECT_ANOMALY = os.getenv('INJECT_ANOMALY', '0') == '1'


async def get_temperature():
    try:
        temps = psutil.sensors_temperatures(fahrenheit=False)
        for readings in temps.values():
            if readings:
                return round(readings[0].current, 1)
    except Exception:
        pass
    return None


async def build_snapshot():
    cpu = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    disk_io = psutil.disk_io_counters()
    net_io = psutil.net_io_counters()
    processes = []

    for proc in sorted(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'num_threads', 'open_files']), key=lambda p: (p.info.get('cpu_percent') or 0), reverse=True)[:10]:
        try:
            info = proc.info
            processes.append({
                'pid': info.get('pid'),
                'name': info.get('name'),
                'cpu': round(info.get('cpu_percent') or 0.0, 1),
                'memory': round(info.get('memory_percent') or 0.0, 1),
                'threads': info.get('num_threads') or 0,
                'open_files': len(info.get('open_files') or []),
            })
        except Exception:
            continue

    metrics = {
        'host': socket.gethostname(),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'cpu': round(cpu, 1),
        'memory': round(memory.percent, 1),
        'temp': await get_temperature(),
        'disk': round(disk.percent, 1),
        'disk_read': getattr(disk_io, 'read_bytes', 0) if disk_io else 0,
        'disk_write': getattr(disk_io, 'write_bytes', 0) if disk_io else 0,
        'network': round(((getattr(net_io, 'bytes_sent', 0) or 0) + (getattr(net_io, 'bytes_recv', 0) or 0)) / 1024 / 1024, 2),
        'processes': processes,
    }

    if INJECT_ANOMALY:
        metrics['cpu'] = min(100.0, metrics['cpu'] + 25.0)
        metrics['memory'] = min(100.0, metrics['memory'] + 20.0)
        metrics['temp'] = (metrics['temp'] or 60) + 15

    return metrics


async def run():
    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            snapshot = await build_snapshot()
            for node_index in range(NODES):
                payload = dict(snapshot)
                payload['node'] = f'node-{node_index + 1}'
                try:
                    await client.post(f'{BACKEND}/metrics', json=payload)
                except Exception:
                    # Keep the agent resilient when backend is restarting.
                    pass
            await asyncio.sleep(INTERVAL)


if __name__ == '__main__':
    asyncio.run(run())

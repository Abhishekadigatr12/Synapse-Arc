from __future__ import annotations

import socket
from datetime import datetime, timezone
from typing import Any

import psutil


def _temperature() -> float | None:
    try:
        temperatures = psutil.sensors_temperatures(fahrenheit=False)
        for sensor_readings in temperatures.values():
            if sensor_readings:
                return round(float(sensor_readings[0].current), 1)
    except Exception:
        return None
    return None


def collect_process_metrics(limit: int = 10) -> list[dict[str, Any]]:
    processes: list[dict[str, Any]] = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'num_threads', 'open_files']):
        try:
            info = proc.info
            processes.append(
                {
                    'pid': int(info.get('pid') or 0),
                    'name': info.get('name') or 'unknown',
                    'cpu': round(float(info.get('cpu_percent') or 0.0), 1),
                    'memory': round(float(info.get('memory_percent') or 0.0), 1),
                    'threads': int(info.get('num_threads') or 0),
                    'open_files': len(info.get('open_files') or []),
                }
            )
        except Exception:
            continue

    processes.sort(key=lambda item: (item['cpu'], item['memory']), reverse=True)
    return processes[:limit]


def collect_system_metrics() -> dict[str, Any]:
    disk = psutil.disk_usage('/')
    disk_io = psutil.disk_io_counters()
    net_io = psutil.net_io_counters()

    return {
        'host': socket.gethostname(),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'cpu': round(psutil.cpu_percent(interval=None), 1),
        'memory': round(psutil.virtual_memory().percent, 1),
        'disk': round(disk.percent, 1),
        'network': round(((net_io.bytes_sent + net_io.bytes_recv) / 1024 / 1024), 2) if net_io else 0.0,
        'temp': _temperature(),
        'disk_read': float(getattr(disk_io, 'read_bytes', 0) or 0),
        'disk_write': float(getattr(disk_io, 'write_bytes', 0) or 0),
        'processes': collect_process_metrics(),
    }


def collect_snapshot() -> dict[str, Any]:
    snapshot = collect_system_metrics()
    snapshot['source'] = 'local-agent'
    return snapshot

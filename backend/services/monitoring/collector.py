from __future__ import annotations

import csv
import platform
import socket
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psutil

REPO_ROOT = Path(__file__).resolve().parents[3]
GENERATED_DIR = REPO_ROOT / 'datasets' / 'generated'
SYSTEM_DATASET = GENERATED_DIR / 'system_metrics.csv'
PROCESS_DATASET = GENERATED_DIR / 'process_metrics.csv'


def _ensure_datasets() -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    if not SYSTEM_DATASET.exists():
        SYSTEM_DATASET.write_text('timestamp,node_id,cpu,memory,disk,network,boot_time\n', encoding='utf-8')
    if not PROCESS_DATASET.exists():
        PROCESS_DATASET.write_text('timestamp,node_id,pid,name,cpu,memory,threads,status\n', encoding='utf-8')


def save_dataset(snapshot: dict[str, Any]) -> None:
    _ensure_datasets()
    timestamp = snapshot.get('timestamp') or datetime.now(timezone.utc).isoformat()
    node_id = snapshot.get('node_id') or snapshot.get('host') or 'host-machine'

    with SYSTEM_DATASET.open('a', newline='', encoding='utf-8') as system_file:
        writer = csv.writer(system_file)
        writer.writerow(
            [
                timestamp,
                node_id,
                snapshot.get('cpu', 0),
                snapshot.get('memory', 0),
                snapshot.get('disk', 0),
                snapshot.get('network', 0),
                snapshot.get('boot_time', ''),
            ]
        )

    with PROCESS_DATASET.open('a', newline='', encoding='utf-8') as process_file:
        writer = csv.writer(process_file)
        for process in snapshot.get('processes', []):
            writer.writerow(
                [
                    timestamp,
                    node_id,
                    process.get('pid', 0),
                    process.get('name', 'unknown'),
                    process.get('cpu', 0),
                    process.get('memory', 0),
                    process.get('threads', 0),
                    process.get('status', 'unknown'),
                ]
            )


def _temperature() -> float | None:
    try:
        sensor_reader = getattr(psutil, 'sensors_temperatures', None)
        if sensor_reader is None:
            return None
        temperatures = sensor_reader(fahrenheit=False)
        for sensor_readings in temperatures.values():
            if sensor_readings:
                return round(float(sensor_readings[0].current), 1)
    except Exception:
        return None
    return None


def collect_process_metrics(limit: int = 10) -> list[dict[str, Any]]:
    processes: list[dict[str, Any]] = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'num_threads', 'status']):
        try:
            info = proc.info
            processes.append(
                {
                    'pid': int(info.get('pid') or 0),
                    'name': info.get('name') or 'unknown',
                    'cpu': round(float(info.get('cpu_percent') or 0.0), 1),
                    'memory': round(float(info.get('memory_percent') or 0.0), 1),
                    'threads': int(info.get('num_threads') or 0),
                    'status': str(info.get('status') or 'unknown'),
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
    boot_time = psutil.boot_time()

    return {
        'node_id': socket.gethostname(),
        'host': socket.gethostname(),
        'platform': platform.platform(),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'cpu': round(psutil.cpu_percent(interval=None), 1),
        'memory': round(psutil.virtual_memory().percent, 1),
        'disk': round(disk.percent, 1),
        'network': round(min(100.0, ((net_io.bytes_sent + net_io.bytes_recv) / 10_000_000)), 2) if net_io else 0.0,
        'temp': _temperature(),
        'disk_read': float(getattr(disk_io, 'read_bytes', 0) or 0),
        'disk_write': float(getattr(disk_io, 'write_bytes', 0) or 0),
        'boot_time': boot_time,
        'processes': collect_process_metrics(),
    }


def collect_snapshot() -> dict[str, Any]:
    snapshot = collect_system_metrics()
    snapshot['source'] = 'local-agent'
    return snapshot

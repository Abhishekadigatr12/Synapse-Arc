from __future__ import annotations

import asyncio
import csv
import platform
import random
import socket
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psutil

REPO_ROOT = Path(__file__).resolve().parents[3]
GENERATED_DIR = REPO_ROOT / 'datasets' / 'generated'
SYSTEM_DATASET = GENERATED_DIR / 'system_metrics.csv'
PROCESS_DATASET = GENERATED_DIR / 'process_metrics.csv'

SYSTEM_HEADER = [
    'timestamp',
    'node_id',
    'cpu_usage',
    'gpu_temperature',
    'memory_usage',
    'network_latency',
    'packet_loss',
    'power_consumption',
    'host',
    'disk',
    'network',
    'temp',
    'process_load',
    'boot_time',
]

RUNTIME_STATE: dict[str, Any] = {
    'running': False,
    'tick': 0,
    'anomaly_node': None,
    'cascade_path': [],
    'cascade_step': 0,
    'healing': False,
    'healing_step': 0,
    'recovered': False,
    'incident_events': [],
}

_TELEMETRY_TASK: asyncio.Task | None = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def runtime_state() -> dict[str, Any]:
    return dict(RUNTIME_STATE)


def record_incident_event(stage: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    event = {'stage': stage, 'timestamp': _utc_now(), 'payload': payload or {}}
    RUNTIME_STATE.setdefault('incident_events', []).append(event)
    del RUNTIME_STATE['incident_events'][:-100]
    return event


def reset_runtime_state() -> None:
    RUNTIME_STATE.update({
        'running': False,
        'tick': 0,
        'anomaly_node': None,
        'cascade_path': [],
        'cascade_step': 0,
        'healing': False,
        'healing_step': 0,
        'recovered': False,
        'incident_events': [],
    })


def mark_simulation_running() -> None:
    RUNTIME_STATE['running'] = True
    RUNTIME_STATE['recovered'] = False
    record_incident_event('info', {'message': 'Telemetry generator online', 'channel': 'simulation_start'})


def inject_runtime_anomaly(node_id: str = 'node-08') -> None:
    RUNTIME_STATE['running'] = True
    RUNTIME_STATE['anomaly_node'] = node_id
    RUNTIME_STATE['recovered'] = False
    record_incident_event('anomaly', {'node_id': node_id})


def trigger_runtime_cascade(path: list[str] | None = None) -> list[str]:
    cascade_path = path or ['node-01', 'node-03', 'node-07', 'node-12']
    RUNTIME_STATE['running'] = True
    RUNTIME_STATE['cascade_path'] = cascade_path
    RUNTIME_STATE['cascade_step'] = 0
    RUNTIME_STATE['recovered'] = False
    record_incident_event('cascade', {'path': cascade_path})
    return cascade_path


def start_runtime_healing() -> list[dict[str, str]]:
    RUNTIME_STATE['healing'] = True
    RUNTIME_STATE['healing_step'] = 0
    actions = [
        {'step': 'workload_migration', 'message': 'Workload migration started'},
        {'step': 'node_isolation', 'message': 'Affected node isolated'},
        {'step': 'traffic_rerouting', 'message': 'Traffic rerouted through healthy path'},
        {'step': 'cooling_activation', 'message': 'Cooling activation requested'},
    ]
    record_incident_event('healing', {'actions': actions})
    return actions


def complete_runtime_recovery() -> dict[str, Any]:
    RUNTIME_STATE.update({
        'anomaly_node': None,
        'cascade_path': [],
        'cascade_step': 0,
        'healing': False,
        'healing_step': 4,
        'recovered': True,
    })
    validation = {
        'temperature': 'normalized',
        'packet_loss': 'normalized',
        'traffic': 'stabilized',
        'risk': 'reduced',
        'status': 'VERIFIED',
        'system_health': 'RESTORED',
    }
    record_incident_event('recovery', validation)
    return validation


def _ensure_datasets() -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    if not SYSTEM_DATASET.exists():
        SYSTEM_DATASET.write_text(','.join(SYSTEM_HEADER) + '\n', encoding='utf-8')
    else:
        with SYSTEM_DATASET.open('r', encoding='utf-8') as f:
            header = f.readline().strip().split(',')
        if any(column not in header for column in SYSTEM_HEADER):
            import shutil

            shutil.copy2(SYSTEM_DATASET, SYSTEM_DATASET.with_suffix('.csv.bak'))
            SYSTEM_DATASET.write_text(','.join(SYSTEM_HEADER) + '\n', encoding='utf-8')

    if not PROCESS_DATASET.exists():
        PROCESS_DATASET.write_text('timestamp,node_id,pid,name,cpu,memory,threads,status\n', encoding='utf-8')


def save_dataset(snapshot: dict[str, Any]) -> None:
    _ensure_datasets()
    timestamp = snapshot.get('timestamp') or _utc_now()
    node_id = snapshot.get('node_id') or snapshot.get('host') or snapshot.get('node') or 'node-01'
    host = snapshot.get('host') or node_id
    cpu = round(float(snapshot.get('cpu') or snapshot.get('cpu_usage') or 0), 1)
    memory = round(float(snapshot.get('memory') or snapshot.get('memory_usage') or 0), 1)
    disk = round(float(snapshot.get('disk') or 0), 1)
    network = round(float(snapshot.get('network') or 0), 2)
    temp_raw = snapshot.get('temp') if snapshot.get('temp') is not None else snapshot.get('gpu_temperature')
    temp = round(float(temp_raw), 1) if temp_raw is not None and temp_raw != '' else ''
    process_load = round(float(snapshot.get('process_load') if snapshot.get('process_load') is not None else cpu * 0.88), 1)

    with SYSTEM_DATASET.open('a', newline='', encoding='utf-8') as system_file:
        writer = csv.writer(system_file)
        writer.writerow([
            timestamp,
            node_id,
            cpu,
            temp,
            memory,
            round(float(snapshot.get('network_latency') or 18 + network * 1.7), 1),
            round(float(snapshot.get('packet_loss') or max(0.0, network / 55)), 2),
            round(float(snapshot.get('power_consumption') or 5.0 + cpu * 0.14 + memory * 0.04), 1),
            host,
            disk,
            network,
            temp,
            process_load,
            snapshot.get('boot_time', ''),
        ])

    with PROCESS_DATASET.open('a', newline='', encoding='utf-8') as process_file:
        writer = csv.writer(process_file)
        for process in snapshot.get('processes', []):
            writer.writerow([
                timestamp,
                node_id,
                process.get('pid', 0),
                process.get('name', 'unknown'),
                process.get('cpu', 0),
                process.get('memory', 0),
                process.get('threads', 0),
                process.get('status', 'unknown'),
            ])


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


def collect_process_metrics(limit: int = 5) -> list[dict[str, Any]]:
    processes = []
    base_pid = 4000
    names = ['python.exe', 'node.exe', 'postgres.exe', 'chrome.exe', 'java.exe']
    for index in range(limit):
        processes.append({
            'pid': base_pid + index,
            'name': names[index % len(names)],
            'cpu': round(random.uniform(0.5, 15.0), 1),
            'memory': round(random.uniform(1.0, 10.0), 1),
            'threads': random.randint(5, 40),
            'status': 'running',
        })
    return sorted(processes, key=lambda item: (item['cpu'], item['memory']), reverse=True)


def collect_system_metrics() -> dict[str, Any]:
    disk = psutil.disk_usage('/')
    disk_io = psutil.disk_io_counters()
    net_io = psutil.net_io_counters()
    return {
        'node_id': socket.gethostname(),
        'host': socket.gethostname(),
        'platform': platform.platform(),
        'timestamp': _utc_now(),
        'cpu': round(psutil.cpu_percent(interval=None), 1),
        'memory': round(psutil.virtual_memory().percent, 1),
        'disk': round(disk.percent, 1),
        'network': round(min(100.0, ((net_io.bytes_sent + net_io.bytes_recv) / 10_000_000)), 2) if net_io else 0.0,
        'temp': _temperature(),
        'disk_read': float(getattr(disk_io, 'read_bytes', 0) or 0),
        'disk_write': float(getattr(disk_io, 'write_bytes', 0) or 0),
        'boot_time': psutil.boot_time(),
        'processes': collect_process_metrics(),
    }


def collect_snapshot() -> dict[str, Any]:
    snapshot = collect_system_metrics()
    snapshot['source'] = 'local-agent'
    return snapshot


def _node_snapshot(index: int, base: dict[str, Any]) -> dict[str, Any]:
    node_id = f'node-{index:02d}'
    cpu = min(100.0, max(3.0, float(base.get('cpu') or 25.0) + random.uniform(-8, 18)))
    memory = min(100.0, max(8.0, float(base.get('memory') or 45.0) + random.uniform(-6, 12)))
    network_latency = round(random.uniform(14, 42), 1)
    packet_loss = round(random.uniform(0.01, 0.18), 2)
    temp = round(float(base.get('temp') or random.uniform(42, 68)), 1)
    power = round(5.5 + cpu * 0.13 + memory * 0.035, 1)
    status = 'healthy'

    anomaly_node = RUNTIME_STATE.get('anomaly_node')
    cascade_path = list(RUNTIME_STATE.get('cascade_path') or [])
    if anomaly_node == node_id:
        cpu = max(cpu, random.uniform(91, 99))
        memory = max(memory, random.uniform(88, 96))
        temp = max(temp, random.uniform(88, 96))
        packet_loss = max(packet_loss, random.uniform(3.2, 7.8))
        network_latency = max(network_latency, random.uniform(110, 185))
        power = max(power, random.uniform(21, 29))
        status = 'critical'

    if node_id in cascade_path[: int(RUNTIME_STATE.get('cascade_step') or 0) + 1]:
        cpu = max(cpu, random.uniform(76, 94))
        temp = max(temp, random.uniform(78, 91))
        packet_loss = max(packet_loss, random.uniform(1.1, 4.2))
        network_latency = max(network_latency, random.uniform(78, 150))
        power = max(power, random.uniform(17, 25))
        status = 'critical' if cpu >= 88 or temp >= 86 else 'warning'

    if RUNTIME_STATE.get('healing') or RUNTIME_STATE.get('recovered'):
        cpu = min(cpu, random.uniform(24, 58))
        memory = min(memory, random.uniform(36, 64))
        temp = min(temp, random.uniform(39, 66))
        packet_loss = min(packet_loss, random.uniform(0.01, 0.22))
        network_latency = min(network_latency, random.uniform(15, 44))
        power = min(power, random.uniform(8, 15.5))
        status = 'recovering' if RUNTIME_STATE.get('healing') else 'healthy'

    return {
        'timestamp': _utc_now(),
        'node_id': node_id,
        'host': node_id,
        'node': node_id,
        'cpu': round(cpu, 1),
        'memory': round(memory, 1),
        'disk': round(random.uniform(22, 64), 1),
        'network': round(min(100.0, packet_loss * 18), 2),
        'temp': round(temp, 1),
        'gpu_temperature': round(temp, 1),
        'network_latency': network_latency,
        'packet_loss': round(packet_loss, 2),
        'power_consumption': round(power, 1),
        'status': status,
        'process_load': round(min(100.0, cpu * 0.88), 1),
        'processes': collect_process_metrics(3),
    }


def collect_infrastructure_metrics(nodes: int = 12) -> list[dict[str, Any]]:
    base = collect_system_metrics()
    RUNTIME_STATE['tick'] = int(RUNTIME_STATE.get('tick') or 0) + 1
    if RUNTIME_STATE.get('cascade_path') and RUNTIME_STATE['tick'] % 2 == 0:
        RUNTIME_STATE['cascade_step'] = min(
            len(RUNTIME_STATE['cascade_path']) - 1,
            int(RUNTIME_STATE.get('cascade_step') or 0) + 1,
        )
    if RUNTIME_STATE.get('healing'):
        RUNTIME_STATE['healing_step'] = min(4, int(RUNTIME_STATE.get('healing_step') or 0) + 1)
        if RUNTIME_STATE['healing_step'] >= 4:
            complete_runtime_recovery()
    return [_node_snapshot(index, base) for index in range(1, nodes + 1)]


async def start_telemetry_loop(manager):
    global _TELEMETRY_TASK
    mark_simulation_running()
    if _TELEMETRY_TASK and not _TELEMETRY_TASK.done():
        return

    async def _loop():
        rows_collected = 0
        from ..prediction.model_server import train_model_from_csv

        while True:
            try:
                nodes = await asyncio.to_thread(collect_infrastructure_metrics)
                for snapshot in nodes:
                    await asyncio.to_thread(save_dataset, snapshot)
                rows_collected += len(nodes)
                worst = max(nodes, key=lambda item: (item.get('cpu', 0), item.get('temp', 0), item.get('packet_loss', 0)))
                await manager.broadcast({
                    'type': 'TELEMETRY_UPDATE',
                    'payload': worst,
                    'nodes': nodes,
                    'runtime': runtime_state(),
                    'csv_path': str(SYSTEM_DATASET),
                    'rows_collected': rows_collected,
                })
                if rows_collected >= 360 and rows_collected % 360 == 0:
                    trained = await asyncio.to_thread(train_model_from_csv)
                    await manager.broadcast({
                        'type': 'MODEL_TRAINED',
                        'message': 'Baseline established. AI Anomaly Engine Online.',
                        'trained': bool(trained),
                    })
            except Exception as exc:
                await manager.broadcast({'type': 'TELEMETRY_ERROR', 'message': str(exc)})
            await asyncio.sleep(1)

    _TELEMETRY_TASK = asyncio.create_task(_loop())


def stop_telemetry_loop():
    global _TELEMETRY_TASK
    if _TELEMETRY_TASK:
        _TELEMETRY_TASK.cancel()
        _TELEMETRY_TASK = None

from __future__ import annotations

from typing import Sequence

from ..constants import SYSTEM_THRESHOLDS


DEFAULT_NODE_COUNT = 12


def node_status(cpu: float, memory: float, disk: float, temp: float | None) -> str:
    if cpu >= SYSTEM_THRESHOLDS['cpu'] or memory >= SYSTEM_THRESHOLDS['memory'] or disk >= SYSTEM_THRESHOLDS['disk']:
        return 'critical'
    if temp is not None and temp >= SYSTEM_THRESHOLDS['temp']:
        return 'anomaly'
    if cpu >= 70 or memory >= 70 or disk >= 80:
        return 'warning'
    return 'stable'


def build_nodes(snapshot: dict, count: int = DEFAULT_NODE_COUNT) -> list[dict]:
    nodes: list[dict] = []
    processes = snapshot.get('processes') if isinstance(snapshot.get('processes'), list) else []
    top_process = processes[0] if processes else {}

    for index in range(count):
        drift = index * 1.6
        cpu = min(100.0, float(snapshot.get('cpu', 0) or 0) + drift)
        memory = min(100.0, float(snapshot.get('memory', 0) or 0) + drift * 0.8)
        disk = min(100.0, float(snapshot.get('disk', 0) or 0) + drift * 0.35)
        temp = snapshot.get('temp')
        status = node_status(cpu, memory, disk, temp)

        nodes.append(
            {
                'id': f'node-{index + 1}',
                'label': f'Enclave {index + 1:02d}',
                'role': 'primary' if index == 0 else 'worker',
                'status': status,
                'cpu': round(cpu, 1),
                'memory': round(memory, 1),
                'disk': round(disk, 1),
                'temp': temp,
                'top_process': top_process.get('name') if top_process else None,
            }
        )

    return nodes


def build_edges(nodes: Sequence[dict]) -> list[dict]:
    edges: list[dict] = []
    for index, node in enumerate(nodes[1:], start=1):
        parent = 'node-1' if index < 4 else f'node-{max(1, index // 2)}'
        edges.append({'source': parent, 'target': node['id']})
    return edges


def build_topology(snapshot: dict, count: int = DEFAULT_NODE_COUNT) -> dict:
    nodes = build_nodes(snapshot, count=count)
    edges = build_edges(nodes)
    return {
        'nodes': nodes,
        'edges': edges,
        'summary': {
            'node_count': len(nodes),
            'stable': sum(1 for node in nodes if node['status'] == 'stable'),
            'warning': sum(1 for node in nodes if node['status'] == 'warning'),
            'anomaly': sum(1 for node in nodes if node['status'] == 'anomaly'),
            'critical': sum(1 for node in nodes if node['status'] == 'critical'),
        },
    }

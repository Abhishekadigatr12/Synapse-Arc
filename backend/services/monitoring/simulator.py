from __future__ import annotations

from typing import Any

from .collector import collect_snapshot
from .topology import build_topology


def build_simulation_payload(inject_anomaly: bool = False) -> dict[str, Any]:
    snapshot = collect_snapshot()
    if inject_anomaly:
        snapshot['cpu'] = min(100.0, float(snapshot.get('cpu', 0) or 0) + 32.0)
        snapshot['memory'] = min(100.0, float(snapshot.get('memory', 0) or 0) + 24.0)
        if snapshot.get('temp') is not None:
            snapshot['temp'] = float(snapshot['temp']) + 12.0
    topology = build_topology(snapshot)
    return {
        'snapshot': snapshot,
        'topology': topology,
    }

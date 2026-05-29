from __future__ import annotations

from typing import Any

from ...config.constants import DEMO_SPARK_ANOMALY
from .collector import collect_snapshot
from .topology import build_topology


def build_simulation_payload(inject_anomaly: bool = False) -> dict[str, Any]:
    snapshot = collect_snapshot()
    if inject_anomaly:
        snapshot.update(DEMO_SPARK_ANOMALY)
    topology = build_topology(snapshot)
    return {
        'snapshot': snapshot,
        'topology': topology,
    }

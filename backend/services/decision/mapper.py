from __future__ import annotations

from typing import Mapping

from .policies import POLICIES


def _as_float(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return 0.0
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return 0.0


def map_action(anomaly: Mapping[str, object], prediction: Mapping[str, object]) -> dict:
    cpu = _as_float(prediction.get('predicted_cpu', 0))
    memory = _as_float(prediction.get('predicted_memory', 0))
    disk = _as_float(anomaly.get('disk', 0))

    if cpu >= 90:
        return {'action': POLICIES['cpu']['action']}
    if memory >= 90:
        return {'action': POLICIES['memory']['action']}
    if disk >= 95:
        return {'action': POLICIES['disk']['action']}
    return {'action': 'none'}
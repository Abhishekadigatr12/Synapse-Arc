from __future__ import annotations

from typing import Mapping, Sequence


def _trend(values: Sequence[float]) -> float:
    if len(values) < 2:
        return 0.0
    return float(values[-1] - values[0]) / max(1, len(values) - 1)


def _predict(value: float, slope: float, minutes: int) -> float:
    return max(0.0, min(100.0, value + slope * minutes))


def predict(metrics_history: Sequence[Mapping[str, float]]) -> dict:
    if not metrics_history:
        return {'predicted_cpu': 0, 'predicted_memory': 0, 'risk': 0}

    cpu_values = [float(item.get('cpu', 0) or 0) for item in metrics_history]
    memory_values = [float(item.get('memory', 0) or 0) for item in metrics_history]

    cpu_slope = _trend(cpu_values)
    memory_slope = _trend(memory_values)

    current_cpu = cpu_values[-1]
    current_memory = memory_values[-1]

    predicted_cpu = round(_predict(current_cpu, cpu_slope, 5), 1)
    predicted_memory = round(_predict(current_memory, memory_slope, 5), 1)
    risk = int(min(100, max(predicted_cpu, predicted_memory)))

    return {
        'predicted_cpu': predicted_cpu,
        'predicted_memory': predicted_memory,
        'risk': risk,
    }
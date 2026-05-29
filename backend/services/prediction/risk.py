from __future__ import annotations

from ..constants import FORECAST_THRESHOLDS


def time_to_threshold(predictions: list[float], steps: list[int], resource: str) -> str:
    threshold = FORECAST_THRESHOLDS.get(resource.lower(), 90)
    for value, step in zip(predictions, steps):
        if value >= threshold:
            return f'{step} minutes'
    return 'beyond 10 minutes'


def risk_score(current: float, predicted: float, resource: str) -> float:
    threshold = FORECAST_THRESHOLDS.get(resource.lower(), 90)
    score = max(current, predicted) / threshold
    return round(min(score, 1.0), 2)

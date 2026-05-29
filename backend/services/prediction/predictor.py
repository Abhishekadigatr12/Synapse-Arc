from __future__ import annotations

from typing import Mapping, Sequence

import numpy as np
from sklearn.linear_model import LinearRegression

RESOURCE_THRESHOLDS = {
    'cpu': 90.0,
    'memory': 90.0,
    'disk': 95.0,
    'network': 90.0,
}


def _fit_forecast(values: Sequence[float], steps: Sequence[int]) -> list[float]:
    if len(values) < 2:
        return [float(values[-1]) if values else 0.0 for _ in steps]

    x = np.arange(len(values)).reshape(-1, 1)
    y = np.array(values, dtype=float)
    model = LinearRegression()
    model.fit(x, y)

    future_points = np.array([[len(values) + step] for step in steps])
    predictions = model.predict(future_points)
    return [float(max(0.0, min(100.0, prediction))) for prediction in predictions]


def _time_to_threshold(predictions: list[float], steps: Sequence[int], threshold: float) -> str:
    for prediction, step in zip(predictions, steps):
        if prediction >= threshold:
            return f'{step} minutes'
    return 'beyond 10 minutes'


def predict_forecast(history: Sequence[Mapping[str, float]]) -> dict:
    if not history:
        return {
            'resource': 'cpu',
            'current': 0.0,
            'predicted': 0.0,
            'time_to_threshold': 'insufficient data',
            'risk_score': 0.0,
            'forecasts': {},
        }

    steps = [5, 10]
    forecasts: dict[str, dict] = {}
    risk_scores: dict[str, float] = {}

    for resource, threshold in RESOURCE_THRESHOLDS.items():
        values = [float(row.get(resource, 0) or 0) for row in history]
        predicted_values = _fit_forecast(values, steps)
        current_value = float(values[-1])
        predicted_peak = max(predicted_values)
        risk_score = min(1.0, max(0.0, predicted_peak / threshold))
        forecasts[resource] = {
            'current': round(current_value, 2),
            'predicted_5m': round(predicted_values[0], 2),
            'predicted_10m': round(predicted_values[1], 2),
            'time_to_threshold': _time_to_threshold(predicted_values, steps, threshold),
            'risk_score': round(risk_score, 2),
        }
        risk_scores[resource] = risk_score

    primary_resource = max(risk_scores, key=risk_scores.get)
    primary = forecasts[primary_resource]

    return {
        'resource': primary_resource.upper(),
        'current': primary['current'],
        'predicted': primary['predicted_10m'],
        'time_to_threshold': primary['time_to_threshold'],
        'risk_score': round(risk_scores[primary_resource], 2),
        'forecasts': forecasts,
    }
from __future__ import annotations

from typing import Iterable, Mapping, Sequence

import numpy as np
from sklearn.ensemble import IsolationForest

RULE_THRESHOLDS = {
    'cpu': 85,
    'memory': 85,
    'disk': 90,
    'network': 80,
    'temp': 80,
}


def _severity_from_score(score: float) -> str:
    if score >= 0.8:
        return 'critical'
    if score >= 0.6:
        return 'high'
    if score >= 0.4:
        return 'medium'
    return 'low'


def _score_rule(metric: Mapping[str, float], processes: Sequence[Mapping[str, float]] | None = None) -> tuple[float, list[str]]:
    reasons: list[str] = []
    score = 0.0

    for key, threshold in RULE_THRESHOLDS.items():
        value = float(metric.get(key, 0) or 0)
        if value >= threshold:
            score += 0.2
            reasons.append(f'{key}={value:.1f} >= {threshold}')

    if processes:
        heavy_processes = [proc for proc in processes if float(proc.get('cpu', 0) or 0) >= 20 or float(proc.get('memory', 0) or 0) >= 15]
        if heavy_processes:
            score += min(0.25, 0.05 * len(heavy_processes))
            reasons.append(f'{len(heavy_processes)} resource-heavy processes')

    return min(score, 0.99), reasons


def _score_isolation_forest(history: Sequence[Mapping[str, float]], current_metric: Mapping[str, float]) -> float:
    if len(history) < 8:
        return 0.0

    features = np.array(
        [
            [
                float(item.get('cpu', 0) or 0),
                float(item.get('memory', 0) or 0),
                float(item.get('disk', 0) or 0),
                float(item.get('network', 0) or 0),
                float(item.get('temp', 0) or 0),
            ]
            for item in history
        ]
    )
    current = np.array([
        [
            float(current_metric.get('cpu', 0) or 0),
            float(current_metric.get('memory', 0) or 0),
            float(current_metric.get('disk', 0) or 0),
            float(current_metric.get('network', 0) or 0),
            float(current_metric.get('temp', 0) or 0),
        ]
    ])

    model = IsolationForest(n_estimators=100, contamination=0.12, random_state=42)
    model.fit(features)
    prediction = model.predict(current)[0]
    return 0.25 if prediction == -1 else 0.0


def detect_anomaly(current_metric: Mapping[str, float], history: Sequence[Mapping[str, float]] | None = None, processes: Sequence[Mapping[str, float]] | None = None) -> dict:
    rule_score, reasons = _score_rule(current_metric, processes)
    if history:
        rule_score += _score_isolation_forest(history, current_metric)

    score = min(rule_score, 0.99)
    severity = _severity_from_score(score)

    if not reasons and score > 0.0:
        reasons.append('statistical deviation detected')

    return {
        'anomaly': score >= 0.45,
        'score': round(score, 2),
        'severity': severity,
        'reasons': reasons,
        'primary_resource': max(
            ('cpu', 'memory', 'disk', 'network', 'temp'),
            key=lambda key: float(current_metric.get(key, 0) or 0),
        ),
    }
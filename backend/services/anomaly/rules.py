from __future__ import annotations

from ...config.constants import SYSTEM_THRESHOLDS


def rule_based_anomaly(metric: dict) -> tuple[bool, list[str], float]:
    reasons: list[str] = []
    score = 0.0

    for key in ('cpu', 'memory', 'disk'):
        threshold = SYSTEM_THRESHOLDS[key]
        value = float(metric.get(key, 0) or 0)
        if value >= threshold:
            score += 0.34
            reasons.append(f'{key}={value:.1f} >= {threshold}')

    score = min(score, 0.99)
    return score >= 0.4, reasons, round(score, 2)

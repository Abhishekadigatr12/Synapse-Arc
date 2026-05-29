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


def threshold_overflow(metric: dict) -> list[dict]:
    contributions: list[dict] = []
    for key in ('cpu', 'memory', 'disk', 'network', 'temp'):
        threshold = float(SYSTEM_THRESHOLDS.get(key, 0) or 0)
        value = float(metric.get(key, 0) or 0)
        overflow = max(0.0, value - threshold)
        ratio = round((value / threshold) if threshold else 0.0, 2)
        contributions.append(
            {
                'feature': key,
                'value': round(value, 1),
                'threshold': threshold,
                'overflow': round(overflow, 1),
                'ratio': ratio,
                'weight': round(min(1.0, ratio / 1.5 if ratio else 0.0), 2),
            }
        )
    return sorted(contributions, key=lambda item: (item['overflow'], item['ratio']), reverse=True)

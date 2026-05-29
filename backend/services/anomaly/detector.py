from __future__ import annotations

from typing import Mapping

from .rules import rule_based_anomaly


def detect_anomaly(metrics: Mapping[str, object]) -> dict:
    payload = dict(metrics)
    anomaly, reasons, score = rule_based_anomaly(payload)
    severity = 'critical' if score >= 0.75 else 'high' if score >= 0.55 else 'medium' if score >= 0.4 else 'low'
    reason = reasons[0] if reasons else 'No anomaly detected'
    return {
        'anomaly': anomaly,
        'severity': severity,
        'reason': reason,
        'score': score,
        'reasons': reasons,
    }
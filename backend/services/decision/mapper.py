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
    feature_values = {
        'cpu': _as_float(anomaly.get('cpu', prediction.get('predicted_cpu', 0))),
        'memory': _as_float(anomaly.get('memory', prediction.get('predicted_memory', 0))),
        'disk': _as_float(anomaly.get('disk', 0)),
        'network': _as_float(anomaly.get('network', 0)),
        'temp': _as_float(anomaly.get('temp', 0)),
    }

    scored: list[dict] = []
    for feature, policy in POLICIES.items():
        threshold = _as_float(policy.get('threshold', 0))
        value = feature_values.get(feature, 0.0)
        overflow = max(0.0, value - threshold)
        if overflow > 0:
            scored.append(
                {
                    'feature': feature,
                    'value': value,
                    'threshold': threshold,
                    'overflow': overflow,
                    'action': policy['action'],
                    'reason': policy['reason'],
                    'recovery_hint': policy.get('recovery_hint', policy['reason']),
                }
            )

    if not scored:
        forecast_risk = _as_float(prediction.get('risk', 0))
        if forecast_risk >= 95:
            return {
                'action': 'reduce_priority',
                'reason': 'Forecast risk is elevated',
                'feature': 'forecast',
                'confidence': round(min(0.95, max(0.55, forecast_risk / 100.0)), 2),
            }
        return {
            'action': 'observe',
            'reason': 'No policy threshold exceeded',
            'feature': 'none',
            'confidence': 0.5,
        }

    selected = max(scored, key=lambda item: (item['overflow'], item['value']))
    confidence = min(0.99, 0.5 + selected['overflow'] / 100.0)
    return {
        'action': selected['action'],
        'reason': selected['reason'],
        'feature': selected['feature'],
        'threshold': selected['threshold'],
        'value': selected['value'],
        'confidence': round(confidence, 2),
        'recovery_hint': selected['recovery_hint'],
    }
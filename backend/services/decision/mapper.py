from __future__ import annotations

from typing import Mapping

from .policies import POLICIES


def recommend_action(anomaly: Mapping[str, object], prediction: Mapping[str, object]) -> dict:
    resource = str(prediction.get('resource', '')).lower() or str(anomaly.get('primary_resource', 'cpu')).lower()
    policy = POLICIES.get(resource, {'action': 'notify_only', 'target': 'system', 'reason': 'General protection policy'})

    if anomaly.get('severity') in {'high', 'critical'} and float(prediction.get('risk_score', 0) or 0) >= 0.7:
        policy = {
            'action': 'isolate_node',
            'target': 'system',
            'reason': 'High risk combination of anomaly and forecast',
        }

    return {
        'action': policy['action'],
        'target': policy['target'],
        'reason': policy['reason'],
        'resource': resource,
    }
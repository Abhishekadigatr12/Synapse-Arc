from __future__ import annotations

from typing import Mapping, Sequence

from ..anomaly.detector import detect_anomaly
from ..anomaly.rules import threshold_overflow
from ..prediction import model_server
from ..prediction.predictor import predict as trend_predict
from ..prediction.risk import risk_score
from ..prediction.risk import time_to_threshold
from .mapper import map_action
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


def _feature_snapshot(metric: Mapping[str, object], process_load: float) -> dict[str, float | str | None]:
    return {
        'host': str(metric.get('host', metric.get('node', 'local-system'))),
        'cpu': _as_float(metric.get('cpu', 0)),
        'memory': _as_float(metric.get('memory', 0)),
        'disk': _as_float(metric.get('disk', 0)),
        'network': _as_float(metric.get('network', 0)),
        'temp': _as_float(metric.get('temp', 0)),
        'process_load': process_load,
    }


def _process_load(processes: Sequence[Mapping[str, object]] | None) -> float:
    if not processes:
        return 0.0
    load = 0.0
    for process in processes:
        load += _as_float(process.get('cpu', 0))
    return round(min(100.0, load), 1)


def _process_signal(metric: Mapping[str, object]) -> str:
    cpu = _as_float(metric.get('cpu', 0))
    memory = _as_float(metric.get('memory', 0))
    disk = _as_float(metric.get('disk', 0))
    temp = _as_float(metric.get('temp', 0))
    if temp >= POLICIES['temp']['threshold']:
        return 'Thermal pressure is dominant'
    if disk >= POLICIES['disk']['threshold']:
        return 'Disk pressure is constraining recovery'
    if memory >= POLICIES['memory']['threshold']:
        return 'Memory pressure is driving instability'
    if cpu >= POLICIES['cpu']['threshold']:
        return 'CPU pressure is driving the anomaly'
    return 'No hard threshold exceeded, but trends remain under watch'


def analyze_metric(metric: Mapping[str, object], history: Sequence[Mapping[str, float]] | None = None, processes: Sequence[Mapping[str, object]] | None = None) -> dict:
    history = list(history or [])
    processes = list(processes or [])
    process_load = _process_load(processes)
    snapshot = _feature_snapshot(metric, process_load)
    anomaly = detect_anomaly(snapshot)

    model_payload = {
        'cpu': snapshot['cpu'],
        'memory': snapshot['memory'],
        'disk': snapshot['disk'],
        'network': snapshot['network'],
        'process_load': snapshot['process_load'],
    }

    model_error = None
    model_result = 0
    try:
        model_result = model_server.predict(model_payload)
    except Exception as exc:
        model_error = str(exc)

    model_anomaly = bool(model_result if isinstance(model_result, int) else (model_result[0] if model_result else 0))
    trend = trend_predict(history)
    forecast_resource = 'cpu' if trend.get('predicted_cpu', 0) >= trend.get('predicted_memory', 0) else 'memory'
    forecast_risk = risk_score(_as_float(snapshot.get(forecast_resource, 0)), _as_float(trend.get(f'predicted_{forecast_resource}', 0)), forecast_resource)
    forecast_time = time_to_threshold([
        _as_float(trend.get('predicted_cpu', 0)),
        _as_float(trend.get('predicted_memory', 0)),
    ], [5, 10], forecast_resource)

    decision = map_action(snapshot, {**trend, 'risk': forecast_risk * 100})
    contributions = threshold_overflow(snapshot)

    if decision.get('action') == 'observe' and anomaly['anomaly']:
        top_signal = contributions[0] if contributions else None
        if top_signal:
            decision = {
                'action': POLICIES[top_signal['feature']]['action'],
                'reason': POLICIES[top_signal['feature']]['reason'],
                'feature': top_signal['feature'],
                'threshold': top_signal['threshold'],
                'value': top_signal['value'],
                'confidence': round(min(0.99, 0.55 + top_signal['overflow'] / 100.0), 2),
                'recovery_hint': POLICIES[top_signal['feature']].get('recovery_hint', POLICIES[top_signal['feature']]['reason']),
            }

    recommend_text = decision.get('recovery_hint') or decision.get('reason') or 'Reduce pressure and revalidate telemetry'
    explanation = {
        'summary': f"{_process_signal(snapshot)}. Automated decision selected {decision.get('action')}.",
        'why_now': _process_signal(snapshot),
        'feature_contributions': contributions,
        'forecast': {
            'predicted_cpu': trend.get('predicted_cpu', 0),
            'predicted_memory': trend.get('predicted_memory', 0),
            'risk': trend.get('risk', 0),
            'time_to_threshold': forecast_time,
            'resource': forecast_resource,
            'forecast_risk': forecast_risk,
        },
        'model': {
            'prediction': model_result,
            'anomaly': model_anomaly,
            'error': model_error,
        },
        'anomaly': anomaly,
        'decision': decision,
        'recommendation': recommend_text,
    }

    healing_steps = [
        {
            'step': 1,
            'title': 'Contain and stabilize',
            'action': decision.get('action', 'observe'),
            'reason': decision.get('reason', 'No direct policy match'),
        },
        {
            'step': 2,
            'title': 'Reduce blast radius',
            'action': 'route_traffic_away' if decision.get('action') != 'observe' else 'monitor',
            'reason': 'Keep the affected node isolated while recovery is validated',
        },
        {
            'step': 3,
            'title': 'Validate recovery',
            'action': 'verify_telemetry',
            'reason': 'Confirm metrics return below policy thresholds',
        },
    ]

    return {
        'snapshot': snapshot,
        'anomaly': anomaly,
        'model': explanation['model'],
        'forecast': explanation['forecast'],
        'decision': decision,
        'explainability': explanation,
        'healing': {
            'steps': healing_steps,
            'automated': decision.get('action') != 'observe',
        },
    }

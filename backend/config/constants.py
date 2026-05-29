EVENT_CHANNELS = {
	'metric_received': 'metric_received',
	'anomaly_detected': 'anomaly_detected',
	'risk_predicted': 'risk_predicted',
	'action_triggered': 'action_triggered',
}

SYSTEM_THRESHOLDS = {
	'cpu': 85,
	'memory': 90,
	'disk': 95,
	'network': 80,
	'temp': 80,
}

FORECAST_THRESHOLDS = {
	'cpu': 90,
	'memory': 90,
	'disk': 95,
	'network': 90,
}
METRIC_CHANNEL = 'metric_received'
ANOMALY_CHANNEL = 'anomaly_detected'
PREDICTION_CHANNEL = 'risk_predicted'
ACTION_CHANNEL = 'action_triggered'

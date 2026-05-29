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

DEMO_SPARK_ANOMALY = {
	'source': 'demo-spark',
	'host': 'spark-demo-node',
	'node': 'spark-demo-node',
	'cpu': 98.0,
	'memory': 95.0,
	'disk': 76.0,
	'network': 18.0,
	'temp': 94.0,
	'process_load': 82.0,
	'processes': [
		{'pid': 1101, 'name': 'spark-worker', 'cpu': 46.0, 'memory': 21.0, 'threads': 18, 'status': 'running'},
		{'pid': 1102, 'name': 'spark-executor', 'cpu': 35.0, 'memory': 19.0, 'threads': 14, 'status': 'running'},
	],
}

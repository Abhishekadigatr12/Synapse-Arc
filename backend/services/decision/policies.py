POLICIES = {
    'cpu': {'threshold': 85, 'action': 'restart_service', 'reason': 'CPU pressure', 'recovery_hint': 'Restart service to clear CPU bottleneck'},
    'memory': {'threshold': 90, 'action': 'restart_process', 'reason': 'Memory pressure', 'recovery_hint': 'Reclaim memory and recycle services'},
    'disk': {'threshold': 95, 'action': 'cleanup_temp', 'reason': 'Disk pressure', 'recovery_hint': 'Remove temporary files and cache'},
    'network': {'threshold': 80, 'action': 'restart_service', 'reason': 'Network congestion', 'recovery_hint': 'Restart the affected service and rebuild the path'},
    'temp': {'threshold': 80, 'action': 'terminate_instance', 'reason': 'Thermal pressure', 'recovery_hint': 'Terminate instance to prevent thermal cascade'},
}

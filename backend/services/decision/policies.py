POLICIES = {
    'cpu': {'action': 'reduce_priority', 'reason': 'CPU pressure'},
    'memory': {'action': 'restart_process', 'reason': 'Memory pressure'},
    'disk': {'action': 'cleanup_temp', 'reason': 'Disk pressure'},
}

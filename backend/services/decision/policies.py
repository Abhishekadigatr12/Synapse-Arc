POLICIES = {
    'cpu': {'action': 'reduce_process_priority', 'target': 'top_process', 'reason': 'CPU pressure'},
    'memory': {'action': 'restart_process', 'target': 'top_process', 'reason': 'Memory leak suspected'},
    'disk': {'action': 'clear_temp_files', 'target': 'system', 'reason': 'Disk pressure'},
    'network': {'action': 'block_process', 'target': 'top_process', 'reason': 'Network abuse suspected'},
}

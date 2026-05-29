POLICIES = {
    'high_cpu':'shift_traffic',
    'high_temp':'reduce_load',
    'packet_loss':'restart_service'
}

def decide(anomaly):
    return POLICIES.get(anomaly.get('type'))

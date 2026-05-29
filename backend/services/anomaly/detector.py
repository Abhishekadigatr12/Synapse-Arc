def is_anomaly(metrics):
    if metrics.get('cpu',0)>85 or metrics.get('temp',0)>80 or metrics.get('packet_loss',0)>5:
        return True
    return False

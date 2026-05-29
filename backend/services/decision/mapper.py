def map_to_action(prediction):
    # simple mapping
    return {'action':'restart','target':prediction.get('affected',[])}

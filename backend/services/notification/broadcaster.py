import json

def broadcast(ws, msg):
    ws.send_text(json.dumps(msg))

from typing import Set
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        try:
            self.active.remove(websocket)
        except KeyError:
            pass

    async def send_personal(self, websocket: WebSocket, message: dict):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in list(self.active):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


# Module-level singleton
manager = WebSocketManager()

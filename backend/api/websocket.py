from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..websocket.manager import manager

router = APIRouter()


@router.websocket('/ws/live')
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)

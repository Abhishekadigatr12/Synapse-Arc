from __future__ import annotations

import json


async def broadcast(websocket, message: dict) -> None:
    await websocket.send_text(json.dumps(message))


async def publish_to_channel(client, channel: str, message: dict) -> None:
    await client.publish(channel, json.dumps(message))

async def publish(client, channel, message):
    if client is None:
        return
    try:
        await client.publish(channel, message)
    except Exception:
        return

async def publish(client, channel, message):
    # client is expected to be an aioredis client
    await client.publish(channel, message)

async def subscribe(client, *channels):
    pub = client.pubsub()
    await pub.subscribe(*channels)
    return pub

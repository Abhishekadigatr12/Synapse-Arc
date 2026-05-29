import asyncio, random
async def stream(nodes=5):
    while True:
        for i in range(nodes):
            yield {"node":f"node-{i+1}", "cpu":random.randint(1,100), "memory":random.randint(1,100), "temp":random.randint(20,100)}
        await asyncio.sleep(1)

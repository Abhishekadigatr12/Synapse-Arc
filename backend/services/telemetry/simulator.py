from .generator import stream
async def run_once():
    async for item in stream(nodes=3):
        print(item)
        break

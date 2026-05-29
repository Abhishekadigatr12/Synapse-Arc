import redis.asyncio as aioredis
import redis


def get_async_client(url: str = 'redis://localhost:6379'):
    return aioredis.from_url(url, decode_responses=False)


def get_sync_client(url: str = 'redis://localhost:6379'):
    return redis.from_url(url)

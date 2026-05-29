from __future__ import annotations

import asyncio

import redis.asyncio as aioredis
import redis


def get_async_client(url: str = 'redis://localhost:6379'):
    return aioredis.from_url(url, decode_responses=False)


async def get_ready_async_client(url: str = 'redis://localhost:6379'):
    client = get_async_client(url)
    try:
        await asyncio.wait_for(client.ping(), timeout=1.0)
        return client
    except Exception:
        try:
            await client.close()
        except Exception:
            pass
        return None


def get_sync_client(url: str = 'redis://localhost:6379'):
    return redis.from_url(url)

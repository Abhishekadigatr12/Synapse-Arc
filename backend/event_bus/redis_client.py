from __future__ import annotations

import asyncio

import redis.asyncio as aioredis
import redis


import time

_redis_client = None
_last_redis_check = 0.0
_redis_available = None


def get_async_client(url: str = 'redis://localhost:6379'):
    return aioredis.from_url(url, decode_responses=False)


async def get_ready_async_client(url: str = 'redis://localhost:6379'):
    global _redis_client, _last_redis_check, _redis_available
    current_time = time.time()
    
    # If we recently checked and Redis was down, don't try connecting again immediately
    if _redis_available is False and (current_time - _last_redis_check) < 15.0:
        return None
        
    if _redis_client is not None:
        try:
            await asyncio.wait_for(_redis_client.ping(), timeout=0.5)
            return _redis_client
        except Exception:
            _redis_client = None
            
    _last_redis_check = current_time
    client = get_async_client(url)
    try:
        await asyncio.wait_for(client.ping(), timeout=1.0)
        _redis_client = client
        _redis_available = True
        return client
    except Exception:
        _redis_available = False
        try:
            await client.close()
        except Exception:
            pass
        return None


def get_sync_client(url: str = 'redis://localhost:6379'):
    return redis.from_url(url)

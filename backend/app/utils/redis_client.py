"""
Redis client — token blacklist for logout / account deactivation.

Tokens are identified by their JTI (JWT ID) claim.
On logout or employee deactivation, the JTI is written to Redis
with a TTL matching the token's remaining lifetime.

Fail-open design: if Redis is unavailable, auth is NOT blocked — the
error is logged and the request proceeds. This is intentional; a Redis
outage should degrade gracefully rather than lock out all users.
"""
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings
from app.utils.logger import logger

_redis: Optional[aioredis.Redis] = None

_BLACKLIST_PREFIX = "token_bl:"


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis


async def blacklist_token(jti: str, ttl_seconds: int) -> None:
    """Add a token JTI to the blacklist with the given TTL (seconds)."""
    if ttl_seconds <= 0:
        return
    try:
        r = await get_redis()
        await r.set(f"{_BLACKLIST_PREFIX}{jti}", "1", ex=ttl_seconds)
    except Exception:
        logger.warning("redis_blacklist_write_failed", jti=jti)


async def is_token_blacklisted(jti: str) -> bool:
    """Return True if this JTI has been revoked. Fail-open on Redis errors."""
    try:
        r = await get_redis()
        return (await r.exists(f"{_BLACKLIST_PREFIX}{jti}")) > 0
    except Exception:
        logger.warning("redis_blacklist_read_failed", jti=jti)
        return False  # fail-open

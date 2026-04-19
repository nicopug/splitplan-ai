"""
Redis service: client asincrono singleton + helper di rate limiting.

In ambiente serverless (Vercel) un rate limiter in-memory è inefficace
perché ogni invocazione può finire su un container diverso. Questo modulo
centralizza le chiamate a Redis (Upstash) usando `redis.asyncio`.

Strategia fail-open: se Redis non è raggiungibile il rate limiter NON
blocca le richieste (preferiamo disponibilità a un hard-lock che
chiuderebbe l'autenticazione).
"""
import logging
import os
from typing import Optional

try:
    from redis.asyncio import Redis  # type: ignore
    _REDIS_IMPORTED = True
except Exception:  # pragma: no cover - libreria opzionale
    Redis = None  # type: ignore
    _REDIS_IMPORTED = False

logger = logging.getLogger(__name__)

_redis_client: Optional["Redis"] = None
_init_attempted = False


def get_redis_client() -> Optional["Redis"]:
    """Restituisce un client Redis asincrono (singleton) o None se non disponibile."""
    global _redis_client, _init_attempted

    if _redis_client is not None:
        return _redis_client

    if _init_attempted:
        return None

    _init_attempted = True

    if not _REDIS_IMPORTED:
        logger.error("[Redis] libreria 'redis' non installata: rate limiting disabilitato.")
        return None

    url = os.getenv("REDIS_URL")
    if not url:
        logger.warning("[Redis] REDIS_URL non configurato: rate limiting disabilitato.")
        return None

    try:
        _redis_client = Redis.from_url(
            url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        logger.info("[Redis] client asincrono inizializzato.")
        return _redis_client
    except Exception as e:
        logger.error(f"[Redis] Impossibile inizializzare il client: {e}")
        return None


async def check_rate_limit(key: str, max_attempts: int, window_seconds: int) -> bool:
    """
    Incrementa il contatore associato a `key`. Al primo INCR imposta la
    scadenza della chiave a `window_seconds` (finestra fissa).

    Returns:
        True  → limite superato (il chiamante deve rispondere 429)
        False → richiesta ammessa (anche in caso di Redis down: fail-open)
    """
    client = get_redis_client()
    if client is None:
        return False

    try:
        count = await client.incr(key)
        if count == 1:
            await client.expire(key, window_seconds)
        return count > max_attempts
    except Exception as e:
        logger.error(f"[Redis] Errore durante rate limit su '{key}': {e}")
        return False

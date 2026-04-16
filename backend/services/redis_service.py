"""
SplitPlan AI — Redis Service
============================
Async Redis client singleton per rate-limiting e cache distribuita.

Usa `redis.asyncio` (lib ufficiale `redis-py`) con Upstash Redis via REDIS_URL.

Policy
------
- **Fail-open su errori Redis**: se Redis è irraggiungibile, il rate-limiter
  restituisce `True` (allow) per non bloccare login/register durante un'outage
  del side-service. L'errore viene loggato come ERROR.
- Timeout cortissimi (2s connect + 2s socket) per non allungare la P99 degli
  endpoint di auth quando Redis è lento.
- Tutte le operazioni sono `async` per non bloccare l'event loop FastAPI.

Pattern anti-race
-----------------
`INCR` + `EXPIRE` atomici: la prima INCR su chiave mancante crea il counter,
poi EXPIRE fissa la finestra. Race-free per il caso standard (finestra
scorrevole con granularità = lunghezza finestra).
"""

import logging
import os
from typing import Optional

from redis.asyncio import Redis, from_url

logger = logging.getLogger(__name__)

_redis_client: Optional[Redis] = None
_redis_init_attempted: bool = False


def get_redis() -> Optional[Redis]:
    """
    Ritorna il singleton async Redis client, inizializzandolo alla prima chiamata.
    Ritorna None se REDIS_URL non è configurato o se l'inizializzazione fallisce.
    """
    global _redis_client, _redis_init_attempted

    if _redis_client is not None:
        return _redis_client

    # Evita retry ripetuti se la prima inizializzazione è fallita
    if _redis_init_attempted:
        return None

    _redis_init_attempted = True

    url = os.getenv("REDIS_URL")
    if not url:
        logger.warning(
            "[Redis] REDIS_URL non configurato — rate limiter girerà in fail-open mode."
        )
        return None

    try:
        _redis_client = from_url(
            url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        logger.info("[Redis] Client async inizializzato.")
        return _redis_client
    except Exception as e:
        logger.error(f"[Redis] Inizializzazione fallita: {e}")
        return None


async def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """
    Controlla e incrementa un contatore Redis per un rate-limit a finestra fissa.

    Args:
        key: chiave Redis (es. "rate_limit:login:1.2.3.4")
        max_requests: numero massimo di richieste consentite nella finestra
        window_seconds: dimensione della finestra in secondi

    Returns:
        True se la richiesta è consentita, False se oltre il limite.
        **Fail-open**: True se Redis è irraggiungibile o errore transient.
    """
    client = get_redis()
    if client is None:
        # Redis non disponibile: consentiamo la richiesta ma logghiamo
        logger.error(
            f"[RateLimit] Redis non disponibile, fail-open su chiave {key}"
        )
        return True

    try:
        count = await client.incr(key)
        # Imposta la TTL solo al primo incremento (creazione chiave)
        if count == 1:
            await client.expire(key, window_seconds)
        return count <= max_requests
    except Exception as e:
        logger.error(f"[RateLimit] Errore Redis su chiave {key}: {e} — fail-open")
        return True


async def close_redis() -> None:
    """Chiude la connessione Redis (da chiamare in lifespan shutdown, se desiderato)."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception as e:
            logger.error(f"[Redis] Errore in chiusura connessione: {e}")
        finally:
            _redis_client = None

import logging
import httpx
import time
from typing import Dict, Optional

logger = logging.getLogger(__name__)

_exchange_cache: Dict[str, Dict] = {}
CACHE_DURATION = 3600 * 6

async def get_exchange_rates(base_currency: str = "EUR") -> Optional[Dict[str, float]]:
    global _exchange_cache
    
    now = time.time()
    if base_currency in _exchange_cache:
        cache_data = _exchange_cache[base_currency]
        if now - cache_data["timestamp"] < CACHE_DURATION:
            return cache_data["rates"]

    try:
        url = f"https://open.er-api.com/v6/latest/{base_currency}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("result") == "success":
                    rates = data.get("rates")
                    _exchange_cache[base_currency] = {
                        "rates": rates,
                        "timestamp": now
                    }
                    return rates
    except Exception as e:
        logger.error(f"Impossibile recuperare i tassi: {e}")
    
    return None

async def convert_to_euro(amount: float, from_currency: str) -> float:
    if from_currency.upper() == "EUR":
        return amount
        
    rates = await get_exchange_rates("EUR")
    if rates and from_currency.upper() in rates:
        rate = rates[from_currency.upper()]
        return round(amount / rate, 2)
    
    logger.warning(f"Conversione fallita per {from_currency}, restituisco valore originale.")
    return amount

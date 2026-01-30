import httpx
import time
from typing import Dict, Optional

# Cache semplice in memoria per evitare troppe chiamate API
# Struttura: { "BASE_CURRENCY": { "rates": {...}, "timestamp": 123456789 } }
_exchange_cache: Dict[str, Dict] = {}
CACHE_DURATION = 3600 * 6  # 6 ore

async def get_exchange_rates(base_currency: str = "EUR") -> Optional[Dict[str, float]]:
    global _exchange_cache
    
    now = time.time()
    if base_currency in _exchange_cache:
        cache_data = _exchange_cache[base_currency]
        if now - cache_data["timestamp"] < CACHE_DURATION:
            return cache_data["rates"]

    try:
        # Usiamo l'API gratuita di exchangerate-api.com
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
        print(f"[Currency Error] Impossibile recuperare i tassi: {e}")
    
    return None

async def convert_to_euro(amount: float, from_currency: str) -> float:
    if from_currency.upper() == "EUR":
        return amount
        
    rates = await get_exchange_rates("EUR")
    if rates and from_currency.upper() in rates:
        # L'API restituisce quanti 'from_currency' ci sono in 1 EUR
        # Esempio: 1 EUR = 150 JPY. Se ho 1500 JPY -> 1500 / 150 = 10 EUR
        rate = rates[from_currency.upper()]
        return round(amount / rate, 2)
    
    print(f"[Currency Warning] Conversione fallita per {from_currency}, restituisco valore originale.")
    return amount

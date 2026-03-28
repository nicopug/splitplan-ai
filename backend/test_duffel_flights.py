"""
Test Duffel API v2: BLQ → CDG
Esegui: python backend/test_duffel_flights.py
"""
import os, httpx
from dotenv import load_dotenv
load_dotenv()

KEY = os.getenv("DUFFEL_API_KEY")
if not KEY:
    print("❌ DUFFEL_API_KEY non trovata"); exit(1)

print(f"🔑 Key: {KEY[:25]}...")

headers = {
    "Authorization": f"Bearer {KEY}",
    "Duffel-Version": "v2",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

payload = {
    "data": {
        "slices": [{"origin": "BLQ", "destination": "CDG", "departure_date": "2026-05-01"}],
        "passengers": [{"type": "adult"}],
        "cabin_class": "economy",
    }
}

print("🔍 POST /air/offer_requests?return_offers=true ...")
r = httpx.post("https://api.duffel.com/air/offer_requests?return_offers=true",
               json=payload, headers=headers, timeout=30)

print(f"   Status: {r.status_code}")
if r.status_code in (200, 201):
    offers = r.json().get("data", {}).get("offers", [])
    print(f"✅ {len(offers)} voli trovati")
    for o in offers[:3]:
        print(f"   • {o.get('owner',{}).get('name','?')} — {o.get('total_amount')} {o.get('total_currency')}")
else:
    print(f"❌ Errore: {r.text[:400]}")

import os
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
from models import Trip, Account
from routers.users import get_current_user
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)
router = APIRouter()

try:
    ai_client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
except Exception:
    ai_client = None

DUFFEL_API_KEY = os.getenv("DUFFEL_API_KEY")
DUFFEL_BASE_URL = "https://api.duffel.com"
DUFFEL_VERSION = "v2"


def _skyscanner_url(origin: str, dest: str, depart: str, ret: str = None, adults: int = 1) -> str:
    """Costruisce un deep link Skyscanner con parametri pre-compilati.
    depart / ret formato YYYY-MM-DD → convertiti in YYMMDD per Skyscanner.
    """
    def fmt(d: str) -> str:
        return d.replace("-", "")[2:]  # "2026-06-15" → "260615"

    base = f"https://www.skyscanner.net/transport/flights/{origin.lower()}/{dest.lower()}/{fmt(depart)}"
    if ret and ret != depart:
        base += f"/{fmt(ret)}"
    return f"{base}/?adults={adults}&currency=EUR"


def _parse_duration(iso_duration: str) -> str:
    """Converte 'PT2H30M' → '2h 30m'."""
    try:
        s = str(iso_duration).replace("PT", "")
        hours, mins = "", ""
        if "H" in s:
            parts = s.split("H")
            hours = f"{parts[0]}h "
            s = parts[1]
        if "M" in s:
            mins = f"{s.replace('M','').split('.')[0]}m"
        return (hours + mins).strip() or "–"
    except Exception:
        return "–"


def _duffel_headers() -> dict:
    return {
        "Authorization": f"Bearer {DUFFEL_API_KEY}",
        "Duffel-Version": DUFFEL_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@router.get("/{trip_id}/search-flights")
def search_flights(
    trip_id: int,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user)
):
    """
    Cerca voli reali tramite Duffel API v2.
    Ritorna fino a 6 offerte ordinate per prezzo.
    """
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")

    origin_iata = (trip.departure_airport or trip.departure_city or "").strip()
    dest_iata = (trip.destination_iata or trip.real_destination or trip.destination or "").strip()

    # Se non sono codici IATA da 3 lettere, usiamo l'IA come fallback al volo
    if len(origin_iata) != 3 or len(dest_iata) != 3:
        if ai_client and origin_iata and dest_iata:
            try:
                logger.info(f"[Duffel] Inferring IATA codes via AI for: {origin_iata} -> {dest_iata}")
                prompt = f"Trova i codici aeroportuali IATA ufficiali di 3 lettere. Partenza: '{origin_iata}' (es. Bologna è BLQ). Destinazione: '{dest_iata}'. Rispondi RIGOROSAMENTE E SOLO con i due codici separati da virgola (es. BLQ,JFK). Attenzione ai codici corretti!"
                
                resp = ai_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                parts = [p.strip().upper()[:3] for p in resp.text.split(',')]
                if len(parts) >= 2:
                    origin_iata = parts[0]
                    dest_iata = parts[1]
                    
                    # Salviamo nel DB per le prossime volte
                    trip.departure_airport = origin_iata
                    trip.destination_iata = dest_iata
                    session.add(trip)
                    session.commit()
            except Exception as e:
                logger.error(f"[Duffel] Fallback IATA fallito: {e}")

    # Pulizia finale
    origin_iata = origin_iata[:3].upper()
    dest_iata = dest_iata[:3].upper()

    if len(origin_iata) != 3 or len(dest_iata) != 3:
        raise HTTPException(
            status_code=400,
            detail="Non siamo riusciti a identificare gli aeroporti (codici IATA) per questo viaggio. Genera le proposte dell'IA prima di cercare i voli."
        )

    if not trip.start_date:
        raise HTTPException(status_code=400, detail="Data di partenza non specificata.")

    departure_date = (
        trip.start_date if isinstance(trip.start_date, str) else trip.start_date.strftime("%Y-%m-%d")
    ).split("T")[0]

    num_passengers = max(1, trip.num_people or 1)

    if not DUFFEL_API_KEY:
        raise HTTPException(status_code=500, detail="Chiave API Duffel non configurata nel server.")

    logger.info(f"[Duffel v2] {origin_iata}→{dest_iata} · {departure_date} · {num_passengers}pax")

    slices = [{
        "origin": origin_iata,
        "destination": dest_iata,
        "departure_date": departure_date,
    }]

    is_round_trip = False
    if trip.end_date:
        return_date = (
            trip.end_date if isinstance(trip.end_date, str) else trip.end_date.strftime("%Y-%m-%d")
        ).split("T")[0]
        if return_date != departure_date:
            is_round_trip = True
            slices.append({
                "origin": dest_iata,
                "destination": origin_iata,
                "departure_date": return_date,
            })

    payload = {
        "data": {
            "slices": slices,
            "passengers": [{"type": "adult"} for _ in range(num_passengers)],
            "cabin_class": "economy",
        }
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{DUFFEL_BASE_URL}/air/offer_requests?return_offers=true",
                json=payload,
                headers=_duffel_headers(),
            )

        if resp.status_code >= 400:
            body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            errors = body.get("errors", [])
            msg = errors[0].get("message", resp.text) if errors else resp.text
            logger.error(f"[Duffel] HTTP {resp.status_code}: {msg}")
            raise HTTPException(status_code=400, detail=f"Duffel: {msg}")

        data = resp.json().get("data", {})
        offers = data.get("offers", [])

        if not offers:
            logger.warning(f"[Duffel] Nessun volo per {origin_iata}→{dest_iata}")
            return {"options": []}

        # Ordina per prezzo e prendi i primi 6
        offers_sorted = sorted(offers, key=lambda x: float(x.get("total_amount", 0)))
        top_offers = offers_sorted[:6]

        formatted = []
        for offer in top_offers:
            airline_name = offer.get("owner", {}).get("name", "Compagnia")

            slices = offer.get("slices", [])
            duration_out = "–"
            departure_out = ""
            arrival_out = ""
            
            duration_in = "–"
            departure_in = ""

            if slices and len(slices) >= 1:
                duration_out = _parse_duration(slices[0].get("duration", ""))
                seg_out = slices[0].get("segments", [])
                if seg_out:
                    departure_out = seg_out[0].get("departing_at", "")[:16].replace("T", " ")
                    arrival_out = seg_out[-1].get("arriving_at", "")[:16].replace("T", " ")

            if is_round_trip and len(slices) >= 2:
                duration_in = _parse_duration(slices[1].get("duration", ""))
                seg_in = slices[1].get("segments", [])
                if seg_in:
                    departure_in = seg_in[0].get("departing_at", "")[:16].replace("T", " ")

            price = float(offer.get("total_amount", 0))
            currency = offer.get("total_currency", "EUR")

            # Crea testo dettagli
            if is_round_trip:
                details_parts = [f"Andata: {departure_out}"]
                if departure_in:
                    details_parts.append(f"Ritorno: {departure_in}")
                details_parts.append(f"{num_passengers} pax (A/R)")
            else:
                details_parts = [f"{origin_iata} → {dest_iata}"]
                if departure_out:
                    details_parts.append(f"Partenza: {departure_out}")
                if arrival_out:
                    details_parts.append(f"Arrivo: {arrival_out}")
                if duration_out != "–":
                    details_parts.append(f"Durata: {duration_out}")
                details_parts.append(f"{num_passengers} pax")

            formatted.append({
                "id": offer.get("id", ""),
                "provider": airline_name,
                "title": airline_name,
                "price": price,
                "currency": currency,
                "details": "  ·  ".join(details_parts),
                "booking_url": _skyscanner_url(
                    origin=origin_iata,
                    dest=dest_iata,
                    depart=departure_date,
                    ret=return_date if is_round_trip else None,
                    adults=num_passengers,
                ),
            })

        logger.info(f"[Duffel] Restituisco {len(formatted)} offerte")
        return {"options": formatted}

    except HTTPException:
        raise
    except httpx.RequestError as e:
        logger.error(f"[Duffel] Errore di rete: {e}")
        raise HTTPException(status_code=503, detail="Errore di connessione a Duffel. Riprova.")
    except Exception as e:
        logger.error(f"[Duffel] Errore inaspettato: {e}")
        raise HTTPException(status_code=500, detail=f"Errore interno: {e}")

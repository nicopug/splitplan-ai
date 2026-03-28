import os
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
from models import Trip, Account
from routers.users import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

DUFFEL_API_KEY = os.getenv("DUFFEL_API_KEY")
DUFFEL_BASE_URL = "https://api.duffel.com"
DUFFEL_VERSION = "v2"


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

    origin_iata = (trip.departure_airport or "").strip().upper()
    dest_iata = (trip.destination_iata or "").strip().upper()

    if not origin_iata or not dest_iata:
        raise HTTPException(
            status_code=400,
            detail="Il viaggio non ha aeroporti IATA. Genera prima le proposte AI così vengono calcolati automaticamente."
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

    payload = {
        "data": {
            "slices": [{
                "origin": origin_iata,
                "destination": dest_iata,
                "departure_date": departure_date,
            }],
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
            airline_name = offer.get("owner", {}).get("name", "Compagnia Aerea")

            slices = offer.get("slices", [])
            duration_str = "–"
            departure_time = ""
            arrival_time = ""

            if slices:
                duration_str = _parse_duration(slices[0].get("duration", ""))
                segments = slices[0].get("segments", [])
                if segments:
                    departure_time = segments[0].get("departing_at", "")[:16].replace("T", " ")
                    arrival_time = segments[-1].get("arriving_at", "")[:16].replace("T", " ")

            price = float(offer.get("total_amount", 0))
            currency = offer.get("total_currency", "EUR")

            details_parts = [f"{origin_iata} → {dest_iata}"]
            if departure_time:
                details_parts.append(f"Partenza: {departure_time}")
            if arrival_time:
                details_parts.append(f"Arrivo: {arrival_time}")
            if duration_str != "–":
                details_parts.append(f"Durata: {duration_str}")
            details_parts.append(f"{num_passengers} pax")

            formatted.append({
                "id": offer.get("id", ""),
                "provider": airline_name,
                "title": airline_name,
                "price": price,
                "currency": currency,
                "details": "  ·  ".join(details_parts),
                "booking_url": "#",
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

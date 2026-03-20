from fastapi import APIRouter, Depends, HTTPException, Body, status, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from urllib.parse import quote
import io
from fpdf import FPDF

from sqlmodel import Session, select, func, delete
from typing import List, Dict, Optional

import logging
import os
import json
from datetime import datetime, timezone
import httpx
from sqlalchemy import update
from google import genai
from google.genai import types
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv
import re

from database import get_session
from auth import get_current_user
from models import Trip, TripBase, Participant, Proposal, Vote, ItineraryItem, SQLModel, Account, Expense, Photo
from fastapi_mail import FastMail, MessageSchema, MessageType
from email_templates import booking_confirmation_email
from utils.email_utils import get_smtp_config
from admin_auth import verify_admin_token

load_dotenv()

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ai_client = None

AI_MODEL = "gemini-2.5-flash" 

if GOOGLE_API_KEY:
    logger.info(f"[OK] System: Google Gemini Client initialized.")
    ai_client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    logger.warning(f"[WARNING] System: GOOGLE_API_KEY missing. Running in Mock/Manual mode.")

router = APIRouter(prefix="/trips", tags=["trips"])


class PreferencesRequest(SQLModel):
    destination: str
    departure_airport: str
    budget: float
    budget_max: float = 0.0
    num_people: int = 1
    start_date: str
    end_date: str
    must_have: Optional[str] = ""
    must_avoid: Optional[str] = ""
    vibe: Optional[str] = "" 
    participant_names: List[str] = []
    transport_mode: Optional[str] = None
    trip_intent: str = "LEISURE"
    work_start_time: Optional[str] = "09:00"
    work_end_time: Optional[str] = "18:00"
    work_days: Optional[str] = "Monday,Tuesday,Wednesday,Thursday,Friday"

class HotelSelectionRequest(SQLModel):
    hotel_name: str
    hotel_address: str
    transport_mode: Optional[str] = None
    transport_cost: Optional[float] = 0.0
    hotel_cost: Optional[float] = 0.0
    arrival_time: Optional[str] = None
    return_time: Optional[str] = None

def check_rate_limit(account: Account, session: Session):
    """
    Verifica e incrementa il limite di utilizzo AI giornaliero.
    Free: 20 chiamate/giorno.
    Pro: Illimitato (per ora).
    """
    if account.is_subscribed:
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    if account.last_usage_reset != today:
        account.daily_ai_usage = 0
        account.last_usage_reset = today
        session.add(account)
        session.commit()

    FREE_LIMIT = 20

    result = session.execute(
        update(Account)
        .where(
            Account.id == account.id,
            Account.daily_ai_usage < FREE_LIMIT
        )
        .values(
            daily_ai_usage = Account.daily_ai_usage + 1
        )
    )
    session.commit()

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Hai raggiunto il limite giornaliero di {FREE_LIMIT} chiamate AI per utenti Free. Passa a Pro per navigare senza limiti!"
        )

def require_premium(account: Account, trip: Trip):
    """Solleva un 403 se l'utente non è abbonato e il viaggio non è sbloccato."""
    if not account.is_subscribed and not trip.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Funzionalità Premium. Sblocca il viaggio con un credito o abbonati per accedere."
        )

@router.post("/extract-receipt")
async def extract_receipt(
    type: str = Form(...),
    file: UploadFile = File(...),
    current_user: Account = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    check_rate_limit(current_user, session)
    if not ai_client:
        raise HTTPException(status_code=500, detail="AI Client non inizializzato.")

    MAX_FILE_SIZE = 3 * 1024 * 1024 # 3 MB
    if getattr(file, "size", 0) and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande. Il limite è di 3 MB."
        )

    try:
        contents = await file.read()
        
        if type == 'hotel':
            prompt = f"""
            Analizza questa ricevuta o conferma di prenotazione HOTEL / AIRBNB.
            Estrai i seguenti dati in formato JSON puro, senza markdown:
            {{
                "hotel_name": "Nome della struttura",
                "hotel_address": "Indirizzo completo",
                "hotel_cost": 0.0 (costo totale in Euro),
                "arrival_time": "HH:MM" (orario di check-in o arrivo previsto),
                "return_time": "HH:MM" (orario di check-out o partenza prevista)
            }}
            Se un dato non è presente, usa null o 0.0.
            LINGUA: {current_user.language.upper()}.
            """
        else:
            prompt = f"""
            Analizza questa ricevuta o conferma di prenotazione VOLO / TRENO / BUS.
            Estrai i seguenti dati in formato JSON puro, senza markdown:
            {{
                "transport_cost": 0.0 (costo totale in Euro),
                "arrival_time": "HH:MM" (orario di arrivo a destinazione),
                "return_time": "HH:MM" (orario di partenza per il ritorno)
            }}
            Se un dato non è presente, usa null o 0.0.
            LINGUA: {current_user.language.upper()}.
            """

        response = await ai_client.aio.models.generate_content(
            model=AI_MODEL,
            contents=[
                prompt,
                genai.types.Part.from_bytes(
                    data=contents,
                    mime_type=file.content_type
                )
            ]
        )

        raw_text = response.text.strip()
        logger.info(f"[DEBUG] Receipt AI Response: {raw_text}")

        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group())
                return {"success": True, "data": data}
            except Exception as je:
                logger.error(f"[JSON Error] {je}")
        
        return {"success": False, "data": {}, "message": "L'IA non è riuscita a estrarre i dati. Compila pure a mano."}

    except Exception as e:
        logger.error(f"[Receipt Error] {e}")
        return {"success": False, "data": {}, "message": f"Errore tecnico: {str(e)}"}

class ChatRequest(SQLModel):
    message: str
    history: Optional[List[Dict]] = []

class JoinRequest(SQLModel):
    share_token: str
    participant_name: str

async def get_coordinates(address: str):
    """Trasforma un indirizzo in coordinate Lat/Lon usando Nominatim (OSM)"""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        headers = {'User-Agent': f'SplitPlanApp/1.0 (contact: ({os.getenv("EMAIL_OSM")})'} 
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if data:
                    return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        logger.error(f"[OSM Error] Geocoding fallito per {address}: {e}")
    return None, None

async def get_places_from_overpass(lat: float, lon: float, radius: int = 800):
    """Query Overpass API per trovare nomi reali di ristoranti e bar vicini"""
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|bar|cafe|pub|fast_food"](around:{radius},{lat},{lon});
      way["amenity"~"restaurant|bar|cafe|pub|fast_food"](around:{radius},{lat},{lon});
      node["leisure"~"beach_resort|bath"](around:{radius},{lat},{lon});
      way["leisure"~"beach_resort|bath"](around:{radius},{lat},{lon});
    );
    out center 50;
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(overpass_url, data={'data': query}, timeout=15.0)
            if response.status_code == 200:
                elements = response.json().get('elements', [])
                places_map = {} 
                
                for e in elements:
                    tags = e.get('tags', {})
                    name = tags.get('name')
                    if name:
                        lat_val = e.get('lat') or e.get('center', {}).get('lat')
                        lon_val = e.get('lon') or e.get('center', {}).get('lon')
                        if lat_val and lon_val:
                            if name not in places_map or e.get('type') == 'node':
                                places_map[name] = {"name": name, "lat": lat_val, "lon": lon_val}
                
                return list(places_map.values())
    except Exception as e:
        logger.error(f"[OSM Error] Overpass fallito: {e}")
    return []

@router.get("/migrate-db-coords", dependencies=[Depends(verify_admin_token)])
async def migrate_db_coords(session: Session = Depends(get_session)):
    """Aggiunge lat/lon alla tabella itineraryitem"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE itineraryitem ADD COLUMN IF NOT EXISTS latitude FLOAT;"))
        session.execute(text("ALTER TABLE itineraryitem ADD COLUMN IF NOT EXISTS longitude FLOAT;"))
        session.commit()
        return {"status": "success", "message": "Colonne coordinate aggiunte."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/migrate-share-token", dependencies=[Depends(verify_admin_token)])
async def migrate_share_token(session: Session = Depends(get_session)):
    """Aggiunge share_token alla tabella trip"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS share_token VARCHAR;"))
        session.commit()
        return {"status": "success", "message": "Colonna share_token aggiunte."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/migrate-transport-mode", dependencies=[Depends(verify_admin_token)])
async def migrate_transport_mode(session: Session = Depends(get_session)):
    """Aggiunge transport_mode alla tabella trip"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS transport_mode VARCHAR DEFAULT 'FLIGHT';"))
        session.commit()
        return {"status": "success", "message": "Colonna transport_mode aggiunta."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/migrate-transport-cost", dependencies=[Depends(verify_admin_token)])
async def migrate_transport_cost(session: Session = Depends(get_session)):
    """Rinomina flight_cost in transport_cost nella tabella trip"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip RENAME COLUMN flight_cost TO transport_cost;"))
        session.commit()
        return {"status": "success", "message": "Colonna flight_cost rinominata in transport_cost."}
    except Exception as e:
        session.rollback()
        try:
             session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS transport_cost FLOAT DEFAULT 0.0;"))
             session.commit()
             return {"status": "partial_success", "message": "Colonna transport_cost assicurata."}
        except Exception as e2:
             return {"status": "error", "message": str(e2)}


@router.get("/migrate-trip-intent", dependencies=[Depends(verify_admin_token)])
async def migrate_trip_intent(session: Session = Depends(get_session)):
    """Aggiunge trip_intent alla tabella trip"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS trip_intent VARCHAR DEFAULT 'LEISURE';"))
        session.commit()
        return {"status": "success", "message": "Colonna trip_intent aggiunta."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/migrate-trip-work-hours", dependencies=[Depends(verify_admin_token)])
async def migrate_trip_work_hours(session: Session = Depends(get_session)):
    """Aggiunge work_start_time e work_end_time alla tabella trip"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS work_start_time VARCHAR DEFAULT '09:00';"))
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS work_end_time VARCHAR DEFAULT '18:00';"))
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS work_days VARCHAR DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday';"))
        session.commit()
        return {"status": "success", "message": "Colonne work_start/end_time e work_days aggiunte."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/migrate-budget-max", dependencies=[Depends(verify_admin_token)])
async def migrate_budget_max(session: Session = Depends(get_session)):
    """Aggiunge budget_max alla tabella trip"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS budget_max FLOAT DEFAULT 0.0;"))
        session.commit()
        return {"status": "success", "message": "Colonna budget_max aggiunta."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.post("/{trip_id}/optimize")
async def optimize_itinerary(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Ottimizza l'ordine delle attività per ridurre gli spostamenti (TSP semplice)"""
    try:
        trip = session.get(Trip, trip_id)
        items = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)).all()
        
        if len(items) < 3:
            return {"status": "skipped", "message": "Troppi pochi elementi per ottimizzare."}

        by_day = {}
        for item in items:
            day = item.start_time.split('T')[0]
            if day not in by_day: by_day[day] = []
            by_day[day].append(item)

        total_updated = 0
        for day, day_items in by_day.items():
            fixed = [i for i in day_items if i.type in ['CHECKIN', 'CHECKOUT']]
            to_optimize = [i for i in day_items if i.type not in ['CHECKIN', 'CHECKOUT'] and i.latitude and i.longitude]
            
            if not to_optimize: continue
            start_lat, start_lon = None, None
            if trip.accommodation_location:
                 start_lat, start_lon = await get_coordinates(trip.accommodation_location)
            
            if not start_lat and fixed:
                start_lat, start_lon = fixed[0].latitude, fixed[0].longitude

            curr_lat, curr_lon = start_lat or 0, start_lon or 0
            ordered = []
            pool = to_optimize[:]

            while pool:
                best_idx = 0
                min_dist = float('inf')
                for idx, p in enumerate(pool):
                    dist = ((p.latitude - curr_lat)**2 + (p.longitude - curr_lon)**2)**0.5
                    if dist < min_dist:
                        min_dist = dist
                        best_idx = idx
                
                next_item = pool.pop(best_idx)
                ordered.append(next_item)
                curr_lat, curr_lon = next_item.latitude, next_item.longitude

            times = sorted([i.start_time for i in to_optimize])
            for i, item in enumerate(ordered):
                item.start_time = times[i]
                session.add(item)
                total_updated += 1
        
        session.commit()
        return {"status": "success", "updated_count": total_updated}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/estimate-budget")
async def estimate_budget(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Stima i costi della vita locale tramite AI"""
    check_rate_limit(current_account, session)
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        if not ai_client:
            return {"suggestion": "AI non disponibile", "breakdown": {}}

        try:
            d1 = datetime.fromisoformat(trip.start_date.replace('Z', ''))
            d2 = datetime.fromisoformat(trip.end_date.replace('Z', ''))
            days = abs((d2 - d1).days) + 1
        except Exception:
            logger.error("Errore durante il calcolo dei giorni, utilizzo 7 giorni di default")
            days = 7
            
        car_prompt = ""
        if trip.transport_mode == "CAR":
            car_prompt = f"""
            4. COSTI STRADALI: Il viaggio è in AUTO PROPRIA da {trip.departure_city or trip.departure_airport} a {trip.destination}. 
               CALCOLA L'ESATTO PEDAGGIO E CARBURANTE basandoti sulla rotta specifica e reale delle autostrade italiane/europee. 
               NON usare stime generiche regionali. Sii preciso sui pedaggi reali (es. Bologna-Bressanone).
               Stima il costo totale A/R per {trip.num_people} persone e dividilo per loro.
            """

        prompt = f"""
        Analizza i costi di vita locale (esclusi alloggio) per un viaggio a: {trip.destination}.
        Dati: {trip.num_people} persona/e, durata {days} giorni. Mezzo: {trip.transport_mode}.
        
        {car_prompt}

        Fornisci una stima REALISTICA e ONESTA per una persona (viaggiatore medio, non lussuoso):
        1. Pasti (colazione, pranzo veloce, cena in trattoria): ca. 35-50€/giorno.
        2. Trasporti locali (se non in auto): ca. 5-10€/giorno.
        3. Piccole spese: ca. 10-15€/giorno.
        
        Importante: Se la città è economica (es. Est Europa), i costi devono rifletterlo. 
        Note: 'total_estimated_per_person' DEVE essere il totale realistico per {days} giorni.
        SE IL MEZZO È "CAR", includi OBBLIGATORIAMENTE una stima di carburante e pedaggi nel totale.
        
        RESTITUISCI SOLO JSON:
        {{
            "daily_meal_mid": 35.0,
            "daily_meal_cheap": 20.0,
            "daily_transport": 10.0,
            "road_costs_total_per_person": 0.0,
            "total_estimated_per_person": 0.0, 
            "advice": "Un consiglio utile..."
        }}
        LINGUA: {current_account.language.upper()}.
        """
        
        response = await ai_client.aio.models.generate_content(model=AI_MODEL, contents=prompt)
        data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
        
        data["days_count"] = days
        
        return data
    except Exception as e:
        logger.error(f"[AI Error] Stima budget fallita: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Dict)
async def create_trip(trip_data: TripBase, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Crea un nuovo viaggio e assegna l'organizzatore"""
    try:
        db_trip = Trip.model_validate(trip_data)
        if trip_data.trip_type == "SOLO":
            db_trip.num_people = 1
        
        session.add(db_trip)
        session.commit()
        session.refresh(db_trip)
        
        organizer = Participant(
            name=current_account.name, 
            is_organizer=True, 
            trip_id=db_trip.id,
            account_id=current_account.id 
        )
        session.add(organizer)
        session.commit()
        
        return {"trip_id": db_trip.id, "trip": db_trip}
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] create_trip: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-trips")
async def get_my_trips(session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Ritorna tutti i viaggi a cui partecipa l'utente corrente e che non sono stati nascosti"""
    try:
        participants = session.exec(
            select(Participant).where(
                Participant.account_id == current_account.id,
                Participant.is_active == True
            )
        ).all()
        
        trip_ids = [p.trip_id for p in participants]
        if not trip_ids:
            return []
            
        trips = session.exec(
            select(Trip).where(Trip.id.in_(trip_ids))
        ).all()
        
        return trips
    except Exception as e:
        logger.error(f"[ERROR] get_my_trips: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_user_stats(session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Calcola statistiche aggregate per l'utente corrente"""
    try:
        participants = session.exec(
            select(Participant).where(
                Participant.account_id == current_account.id,
                Participant.is_active == True
            )
        ).all()
        
        trip_ids = [p.trip_id for p in participants]
        if not trip_ids:
            return {
                "total_trips": 0,
                "completed_trips": 0,
                "total_spent": 0.0,
                "total_days": 0,
                "unique_cities": 0,
                "cities_list": []
            }
            
        trips = session.exec(
            select(Trip).where(Trip.id.in_(trip_ids))
        ).all()
        
        completed_trips = [t for t in trips if t.status == "COMPLETED"]
        
        total_spent = session.exec(
            select(func.sum(Expense.amount)).where(
                Expense.trip_id.in_(trip_ids),
                Expense.payer_id.in_([p.id for p in participants])
            )
        ).one() or 0.0

        for t in trips:
            num = (t.num_people or 1)
            total_spent += (t.transport_cost or 0) / num
            total_spent += (t.hotel_cost or 0) / num
        total_days = 0
        unique_cities = set()
        for t in completed_trips:
            unique_cities.add(t.destination or t.real_destination)
            try:
                d1 = datetime.fromisoformat(t.start_date.replace('Z', ''))
                d2 = datetime.fromisoformat(t.end_date.replace('Z', ''))
                total_days += abs((d2 - d1).days) + 1
            except Exception:
                logger.error("Errore durante il calcolo dei giorni, utilizzo 7 giorni di default")

        return {
            "total_trips": len(trips),
            "completed_trips": len(completed_trips),
            "total_spent": round(total_spent, 2),
            "total_days": total_days,
            "unique_cities": len(unique_cities),
            "cities_list": list(unique_cities)
        }
    except Exception as e:
        logger.error(f"[ERROR] get_user_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/complete")
async def complete_trip(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Segna un viaggio come concluso"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        participant = session.exec(
            select(Participant).where(
                Participant.trip_id == trip_id,
                Participant.account_id == current_account.id
            )
        ).first()
        
        if not participant or not participant.is_organizer:
            raise HTTPException(status_code=403, detail="Solo l'organizzatore può segnare il viaggio come concluso")
            
        trip.status = "COMPLETED"
        session.add(trip)
        session.commit()
        return {"status": "success", "message": "Viaggio archiviato con successo"}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] complete_trip: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/{trip_id}/hide")
async def hide_trip(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Nasconde un viaggio dalla cronologia dell'utente (imposta is_active=False per il partecipante)"""
    try:
        participant = session.exec(
            select(Participant).where(
                Participant.trip_id == trip_id,
                Participant.account_id == current_account.id
            )
        ).first()
        
        if not participant:
            raise HTTPException(status_code=404, detail="Partecipante non trovato in questo viaggio")
            
        participant.is_active = False
        session.add(participant)
        session.commit()
        return {"status": "success", "message": "Viaggio nascosto correttamente"}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] hide_trip: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/migrate-participants-active")
async def migrate_participants_active(session: Session = Depends(get_session)):
    """Migrazione per aggiungere la colonna is_active alla tabella participant se non esiste"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE participant ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
        session.commit()
        return {"status": "success", "message": "Colonna is_active aggiunta correttamente."}
    except Exception as e:
        session.rollback()
        if "already exists" in str(e) or "duplicate column" in str(e).lower():
            return {"status": "info", "message": "La colonna is_active esiste già."}
        logger.error(f"[Migration Error] {e}")
        return {"status": "error", "message": str(e)}

@router.get("/migrate-events-cache", dependencies=[Depends(verify_admin_token)])
async def migrate_events_cache(session: Session = Depends(get_session)):
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS events_cache TEXT;"))
        session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS events_cache_date VARCHAR;"))
        session.commit()
        return {"status": "success"}
    except Exception as e:
        session.rollback()
        return {"status": "error", "detail": str(e)}

@router.get("/{trip_id}", response_model=Trip)
async def read_trip(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Recupera i dettagli del viaggio verificando l'appartenenza dell'account"""
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
    participant = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.account_id == current_account.id)).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Non partecipi a questo viaggio")
        
    return trip

@router.get("/{trip_id}/proposals", response_model=List[Proposal])
async def get_proposals(trip_id: int, session: Session = Depends(get_session)):
    """Recupera le proposte generate per un viaggio (Accessibile pubblicamente per votazioni)"""
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
    return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

@router.post("/{trip_id}/share")
async def generate_share_token(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Genera o restituisce il token di condivisione del viaggio"""
    import secrets
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")
    
    participant = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.account_id == current_account.id)).first()
    if not participant or not participant.is_organizer:
        raise HTTPException(status_code=403, detail="Solo l'organizzatore può generare il link di condivisione")
    
    if not trip.share_token:
        trip.share_token = secrets.token_urlsafe(16)
        session.add(trip)
        session.commit()
        session.refresh(trip)
        
    return {"share_token": trip.share_token}

@router.get("/share/{token}")
async def get_shared_trip(token: str, session: Session = Depends(get_session)):
    trip = session.exec(select(Trip).where(Trip.share_token == token)).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Link di condivisione non valido o scaduto")
        
    itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip.id).order_by(ItineraryItem.start_time)).all()
    expenses = session.exec(select(Expense).where(Expense.trip_id == trip.id)).all()
    photos = session.exec(select(Photo).where(Photo.trip_id == trip.id)).all()
    participants = session.exec(select(Participant).where(Participant.trip_id == trip.id)).all()
    
    return {
        "trip": trip.model_dump(exclude={"participants", "proposals", "itinerary_items", "expenses", "photos"}),
        "itinerary": [i.model_dump() for i in itinerary],
        "expenses": [e.model_dump() for e in expenses],
        "photos": [p.model_dump() for p in photos],
        "participants": [
            {
                "id": p.id, 
                "name": p.name, 
                "has_voted": session.exec(select(func.count(Vote.id)).where(Vote.user_id == p.id)).one() > 0
            } for p in participants
        ]
    }

@router.post("/join/{token}")
async def join_trip(token: str, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Unisce un utente a un viaggio tramite token di condivisione.
       Tenta di far corrispondere l'account corrente con un partecipante 'ospite' creato dall'organizzatore.
    """
    try:
        trip = session.exec(select(Trip).where(Trip.share_token == token)).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Link di condivisione non valido o scaduto")
        existing = session.exec(select(Participant).where(Participant.trip_id == trip.id, Participant.account_id == current_account.id)).first()
        if existing:
            return {"status": "success", "message": "Fai già parte di questo viaggio", "trip_id": trip.id}

        search_names = [
            current_account.name.strip().lower(),
            f"{current_account.name} {current_account.surname}".strip().lower()
        ]
        
        guest_participant = None
        all_guests = session.exec(select(Participant).where(Participant.trip_id == trip.id, Participant.account_id == None)).all()
        
        for g in all_guests:
            g_name = g.name.strip().lower()
            if g_name in search_names or any(s in g_name for s in search_names):
                guest_participant = g
                break
        
        if guest_participant:
            guest_participant.account_id = current_account.id
            guest_participant.name = f"{current_account.name} {current_account.surname}"
            session.add(guest_participant)
            session.commit()
            return {"status": "success", "message": f"Benvenuto a bordo, {current_account.name}!", "trip_id": trip.id}
        
        raise HTTPException(
            status_code=403, 
            detail=f"Non è stato trovato un partecipante che corrisponda al tuo nome ({current_account.name}) in questo viaggio. Assicurati che l'organizzatore ti abbia aggiunto con il nome corretto."
        )

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] join_trip: {e}")
        raise HTTPException(status_code=500, detail="Errore durante l'adesione al viaggio.")

@router.patch("/{trip_id}")
async def update_trip(trip_id: int, updates: Dict, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Aggiorna parzialmente i dati di un viaggio"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        check = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.account_id == current_account.id)).first()
        if not check: 
            raise HTTPException(status_code=403, detail="Non autorizzato")

        for key, value in updates.items():
            if hasattr(trip, key):
                setattr(trip, key, value)
        
        session.add(trip)
        session.commit()
        session.refresh(trip)
        return trip
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/generate-proposals", response_model=List[Proposal])
async def generate_proposals(trip_id: int, prefs: PreferencesRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Genera 3 proposte e salva tutti i partecipanti nel Database"""
    try:
        check = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.account_id == current_account.id)).first()
        if not check: 
            raise HTTPException(status_code=403, detail="Non autorizzato")

        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")

        check_rate_limit(current_account, session)
        require_premium(current_account, trip)
            
        trip.budget = prefs.budget
        trip.budget_max = prefs.budget_max
        trip.budget_per_person = (prefs.budget_max or prefs.budget) / prefs.num_people
        trip.num_people = prefs.num_people
        trip.start_date = prefs.start_date
        trip.end_date = prefs.end_date
        trip.departure_airport = prefs.departure_airport 
        trip.departure_city = prefs.departure_airport
        trip.must_have = prefs.must_have
        trip.must_avoid = prefs.must_avoid
        trip.trip_intent = prefs.trip_intent
        trip.work_start_time = prefs.work_start_time
        trip.work_end_time = prefs.work_end_time
        trip.work_days = prefs.work_days
        
        if prefs.transport_mode:
            trip.transport_mode = prefs.transport_mode
            
        session.add(trip)
        
        if prefs.participant_names:
            for name in prefs.participant_names:
                exists = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.name == name)).first()
                if not exists:
                    session.add(Participant(name=name, trip_id=trip.id, is_organizer=False))
        session.commit()

        if ai_client:
            try:
                num_props = 3
                prompt = f"""
                Agisci come un Travel Agent esperto. 
                TASK 1: Trova il codice IATA di 3 lettere per la partenza: "{prefs.departure_airport}".
                TASK 2: Genera {num_props} {"proposta" if num_props == 1 else "proposte UNICHE"} per: {prefs.destination}. 
                {"Sia che la destinazione sia un Paese o una singola città, le 3 proposte devono avere TEMI DIVERSI (es. uno Artistico, uno Gastronomico, uno Storico)." if num_props > 1 else ""}
                SE la destinazione è una singola città (es. Parigi), usa titoli creativi e accattivanti (es. 'Parigi Bohemienne') per differenziarle.
                Dati: Budget tra {prefs.budget}€ e {prefs.budget_max if prefs.budget_max > 0 else prefs.budget}€ (totale gruppo), {prefs.num_people} persone, dal {prefs.start_date} al {prefs.end_date}.
                Preferenze: {prefs.must_have}, Evitare: {prefs.must_avoid}, Vibe: {prefs.vibe}.
                {"ORARIO LAVORO: dalle " + prefs.work_start_time + " alle " + prefs.work_end_time + " nei giorni: " + prefs.work_days if prefs.trip_intent == "BUSINESS" else ""}

                TASK 3: Analizza la distanza tra la partenza ({prefs.departure_airport}) e la destinazione ({prefs.destination}).
                Scegli il "suggested_transport_mode" tra: FLIGHT, TRAIN, CAR.
                REGOLA: Se la destinazione è raggiungibile via terra in meno di 6 ore (es. Milano-Roma, Parigi-Lione), preferisci sempre TRAIN o CAR. Altrimenti usa FLIGHT.

                RESTITUISCI SOLO JSON:
                {{
                    "departure_iata_normalized": "XXX",
                    "departure_city_normalized": "Nome Città (es. Milano)",
                    "suggested_transport_mode": "FLIGHT",
                    "proposals": [
                        {{
                            "destination": "Titolo Creativo (es. Parigi dei Musei)", 
                            "destination_iata": "XXX", 
                            "destination_english": "Paris",
                            "destination_italian": "Parigi",
                            "description": "...", 
                            "price_estimate": 1000, 
                            "image_search_term": "louvre,museum"
                        }}
                    ]
                }}
                NOTE: 
                - 'destination' deve essere il TITOLO CREATIVO (unico per ogni proposta).
                - 'destination_english' deve essere il nome della città principale in INGLESE.
                - 'destination_italian' deve essere il nome della città principale in ITALIANO.
                - 'image_search_term' deve contenere 1 o 2 parole chiave in INGLESE specifiche per quel tema.
                LINGUA: {current_account.language.upper()}.
                """
                
                response = await ai_client.aio.models.generate_content(model=AI_MODEL, contents=prompt)
                data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
                
                if data.get("departure_iata_normalized"):
                    trip.departure_airport = data["departure_iata_normalized"].upper()
                
                if data.get("departure_city_normalized"):
                    trip.departure_city = data["departure_city_normalized"]
                
                ai_suggested = data.get("suggested_transport_mode")
                if ai_suggested and (trip.transport_mode == "FLIGHT" or not trip.transport_mode):
                    trip.transport_mode = ai_suggested
                
                session.add(trip)

                existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
                for e in existing: 
                    session.delete(e)
                
                import random
                import urllib.parse
                new_proposals = []
                for p in data.get("proposals", []):
                    search = p.get("image_search_term") or ""
                    dest_en = p.get("destination_english") or ""
                    curated_tags = f"{dest_en},{search},travel".lower().replace(" ", ",")
                    tag_list = [t.strip() for t in curated_tags.split(",") if t.strip()]
                    final_tags = ",".join(tag_list[:3])
                    
                    seed = random.randint(1, 10000)
                    encoded_tags = urllib.parse.quote(final_tags, safe=',')
                    img_url = f"https://loremflickr.com/1080/720/{encoded_tags}/all?lock={seed}"
                    
                    prop = Proposal(
                        trip_id=trip_id, 
                        destination=p["destination"], 
                        real_destination=p.get("destination_italian") or p.get("destination_english") or "", 
                        destination_iata=p.get("destination_iata"),
                        description=p["description"],
                        price_estimate=p["price_estimate"],
                        image_url=img_url
                    )
                    session.add(prop)
                    new_proposals.append(prop)
                
                session.commit()

                trip.status = "VOTING"
                
                session.add(trip)
                session.commit()
                return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

            except Exception as e:
                logger.error(f"[AI Error] Generazione fallita: {e}")

        logger.info("AI fallita. Uso Mock Data.")
        iata_map = {"roma": "ROM", "milano": "MIL", "napoli": "NAP", "venezia": "VCE", "londra": "LON", "parigi": "PAR"}
        trip.departure_airport = iata_map.get(prefs.departure_airport.lower(), prefs.departure_airport[:3].upper())
        
        if not trip.transport_mode:
            trip.transport_mode = "FLIGHT"

        mock_options = []
        if trip.trip_type == "SOLO":
             mock_options.append(Proposal(trip_id=trip_id, destination=f"{prefs.destination} Smart", destination_iata="ROM", price_estimate=prefs.budget, description="Il tuo viaggio perfetto.", image_url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"))
        else:
            mock_options = [
                Proposal(trip_id=trip_id, destination=f"{prefs.destination} Smart", destination_iata="JFK", price_estimate=prefs.budget, description="Opzione equilibrata.", image_url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"),
                Proposal(trip_id=trip_id, destination=f"{prefs.destination} Budget", destination_iata="LHR", price_estimate=prefs.budget * 0.7, description="Viaggio economico.", image_url="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"),
                Proposal(trip_id=trip_id, destination=f"{prefs.destination} Luxury", destination_iata="CDG", price_estimate=prefs.budget * 1.5, description="Esperienza premium.", image_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c")
            ]
        
        existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
        for e in existing: session.delete(e)
        
        final_props = []
        for o in mock_options: 
            session.add(o)
            final_props.append(o)
        
        session.commit()

        trip.status = "VOTING"
            
        session.add(trip)
        session.commit()
        return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
        
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] generate_proposals: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

async def generate_itinerary_content(trip: Trip, proposal: Proposal, session: Session):
    """Genera l'itinerario finale integrando nomi reali da OSM e AI avanzata"""
    logger.info(f"[System] Generating itinerary for Trip {trip.id}...")
    
    if not ai_client:
        logger.warning("[Warning] AI Client not available, skipping itinerary generation.")
        return

    try:
        try:
            d1 = datetime.fromisoformat(trip.start_date.replace('Z', ''))
            d2 = datetime.fromisoformat(trip.end_date.replace('Z', ''))
            num_days = abs((d2 - d1).days) + 1
        except Exception as e:
            logger.warning(f"[Warning] Date parsing failed: {e}")
            num_days = 5
        
        hotel_lat = trip.hotel_latitude
        hotel_lon = trip.hotel_longitude
        locali_reali = await get_places_from_overpass(hotel_lat, hotel_lon) if hotel_lat else []
        
        places_prompt = ""
        if locali_reali:
            places_list_str = "\n".join([f"- {p['name']} (Lat: {p['lat']}, Lon: {p['lon']})" for p in locali_reali[:15]])
            places_prompt = f"""
            Ecco alcuni luoghi reali verificati vicino all'alloggio (ristoranti, bar, lidi/bagni):
            {places_list_str}
            
            REQUISITO CRITICO PER LA MAPPA:
            Se usi uno di questi luoghi:
            1. Usa il suo NOME REALE come 'title'.
            2. Usa LE SUE COORDINATE (Lat/Lon) esatte fornite sopra nel JSON. NON cambiarle di un solo decimale (Precisione chirurgica).
            3. Se l'attività riguarda la spiaggia o il relax al mare, l'attività DEVE essere posizionata sulla costa (usando i 'Bagni' o 'Lidi' sopra indicati).
            4. Se un luogo NON è nella lista sopra, imposta "lat": 0 e "lon": 0. Il sistema le cercherà. NON INVENTARE COORDINATE.
            """
        

        
        calendar_prompt = ""
        organization_name = ""
        organizer_part = next((p for p in trip.participants if p.is_organizer), None)
        organizer_account = None
        if organizer_part and organizer_part.account_id:
            organizer_account = session.get(Account, organizer_part.account_id)
        
        lang = organizer_account.language.upper() if organizer_account else "ITALIANO"

        if trip.trip_intent == "BUSINESS" and organizer_account:
             if organizer_account and organizer_account.is_calendar_connected and organizer_account.google_calendar_token:
                 try:
                     logger.info(f"[System] Fetching calendar events for Organizer {organizer_account.email}...")
                     creds = Credentials.from_authorized_user_info(json.loads(organizer_account.google_calendar_token), ['https://www.googleapis.com/auth/calendar.events.readonly'])
                     service = build('calendar', 'v3', credentials=creds)
                     
                     t_min = datetime.fromisoformat(trip.start_date.replace('Z', '')).isoformat() + 'Z'
                     t_max = datetime.fromisoformat(trip.end_date.replace('Z', '')).isoformat() + 'Z'
                     
                     events_result = service.events().list(
                         calendarId='primary', timeMin=t_min, timeMax=t_max,
                         singleEvents=True, orderBy='startTime'
                     ).execute()
                     
                     events = events_result.get('items', [])
                     if events:
                         event_lines = []
                         for event in events:
                             start = event['start'].get('dateTime', event['start'].get('date'))
                             end = event['end'].get('dateTime', event['end'].get('date'))
                             summary = event.get('summary', 'Impegno')
                             event_lines.append(f"- {summary}: {start} - {end}")
                         
                         calendar_prompt = f"""
                         IMPEGNI DI LAVORO ESISTENTI (DA RISPETTARE TASSATIVAMENTE):
                         L'utente ha già i seguenti impegni fissati nel calendario. 
                         NON sovrapporre nessuna attività turistica a questi orari.
                         Pianifica spostamenti, pranzi e relax INTORNO a questi blocchi.
                         
                         {chr(10).join(event_lines)}
                         """
                         logger.info(f"[System] Found {len(events)} calendar events.")
                 except Exception as exc:
                     logger.warning(f"[Warning] Failed to fetch calendar events: {exc}")

        prompt = f"""
        Sei un esperto Travel Agent. Genera un itinerario di {num_days} giorni per il viaggio "{trip.name}" a {trip.destination}.
        TEMA: {proposal.destination}. DESCRIZIONE: {proposal.description}.
        PARTENZA: {trip.departure_city or trip.departure_airport}.
        ALLOGGIO: {trip.accommodation or "Hotel centrale"} (Coordinate: {hotel_lat}, {hotel_lon}).
        MEZZO PRINCIPALE: {trip.transport_mode}.
        ARRIVO: {trip.start_date} ore {trip.arrival_time or '14:00'}.
        RITORNO: {trip.end_date} ore {trip.return_time or '18:00'}.

        {places_prompt}

        {calendar_prompt}

        SCOPO DEL VIAGGIO: {trip.trip_intent}
        {"Se il viaggio è BUSINESS (LAVORO), PRIORITÀ ASSOLUTA a: efficienza, hotel con coworking/Wi-Fi eccellente, pasti veloci ma di qualità, posizioni centrali vicino a hub di trasporto. Evita attività troppo rilassate o dispersive. Ottimizza per produttività. RISPETTA L'ORARIO DI LAVORO: dalle " + (trip.work_start_time or '09:00') + " alle " + (trip.work_end_time or '18:00') + " esclusivamente nei giorni: " + (trip.work_days or 'Monday,Tuesday,Wednesday,Thursday,Friday') + ". Negli ALTRI giorni del viaggio (es. Weekend o giorni non lavorativi indicati), pianifica l'itinerario come un normale viaggio di piacere (LEISURE), bilanciando relax e scoperte." if trip.trip_intent == "BUSINESS" else "Se il viaggio è LEISURE, bilancia relax e scoperta. Includi esperienze locali autentiche, tempo libero e varietà di attività."}

        REGOLE CRITICHE:
        1. SEQUENZA LOGICA: Rispetta l'ordine cronologico (Colazione -> Mattina -> Pranzo -> Pomeriggio -> Cena).
        2. TIMING DINAMICO: Non usare orari fissi. Ogni attività deve avere ora inizio e fine realistica.
           - Colazione: ~45 min (07:30-09:00).
           - Pranzo: ~1-1.5 ore (12:30-14:00).
           - Cena: ~1.5-2 ore (19:30-21:30).
           - Attività: Durata variabile 1-4 ore.
        3. LOGISTICA E ORARI: 
           - Il Giorno 1 deve iniziare TASSATIVAMENTE DOPO l'ora di ARRIVO ({trip.arrival_time or '14:00'}).
           - L'ultimo giorno deve terminare il più vicino possibile all'ora di RITORNO ({trip.return_time or '19:00'}). 
           - NON terminare l'itinerario troppo presto se il ritorno è tardi (es. se si parte alle 19:00, pianifica attività/pranzo/relax fino almeno alle 17:30-18:00).
           - NON pianificare nulla DOPO l'ora di ritorno.
        4. TRASPORTI (CAR): Se il mezzo è CAR, calcola l'ESATTA stima di CARBURANTE e PEDAGGI per il viaggio A/R tra {trip.departure_city or trip.departure_airport} e {trip.destination}. Usa i dati reali delle autostrade (es. Autostrade per l'Italia). NON essere generico.
        5. MAPPA: Fornisci COORDINATE GPS (lat, lon) REALI per ogni luogo.
        6. NO TRANSIT FOR LEISURE: Evita stazioni o aeroporti per attività di svago. Se l'attività parla di spiaggia, mare o lungomare, il luogo DEVI posizionarlo sulla costa (Lido/Bagno).
        7. NO NOTES: Non includere MAI note, commenti, disclaimer o spiegazioni (es. "I costi sono calcolati su...") né nel testo delle attività né esternamente. Solo i dati richiesti nel JSON.
        
        RISPONDI SOLO IN JSON:
        {{
            "estimated_road_costs": {{"fuel": 0.0, "tolls": 0.0}},
            "itinerary": [
                {{
                    "title": "...", 
                    "description": "...", 
                    "start_time": "YYYY-MM-DDTHH:MM:SS",
                    "end_time": "YYYY-MM-DDTHH:MM:SS",
                    "type": "ACTIVITY|FOOD|TRANSPORT|CHECKIN",
                    "lat": 0.0,
                    "lon": 0.0
                }}
            ]
        }}
        LINGUA: {lang}.
        """
        
        response = await ai_client.aio.models.generate_content(model=AI_MODEL, contents=prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        
        session.exec(delete(ItineraryItem).where(ItineraryItem.trip_id == trip.id))
        session.commit()
        
        import asyncio
        async def process_item(item):
            try:
                try:
                    i_lat = float(item.get("lat", 0))
                    i_lon = float(item.get("lon", 0))
                except:
                    i_lat, i_lon = 0.0, 0.0

                if not i_lat or i_lat == 0:
                    title_clean = item['title'].lower()
                    query = f"{item['title']}, {trip.destination}"
                    
                    if any(word in title_clean for word in ['bagno', 'lido', 'mare']):
                        if 'bagno' in title_clean or 'lido' in title_clean:
                           query = f"{item['title']}, {trip.destination}"
                        else:
                           query = f"{item['title']}, Lungomare, {trip.destination}"
                    
                    i_lat, i_lon = await get_coordinates(query)
                    
                    if (not i_lat or i_lat == 0) and trip.hotel_latitude:
                       i_lat, i_lon = trip.hotel_latitude, trip.hotel_longitude
                
                return ItineraryItem(
                    trip_id=trip.id,
                    title=item["title"],
                    description=item["description"],
                    start_time=item["start_time"],
                    end_time=item.get("end_time"),
                    type=item["type"],
                    latitude=i_lat,
                    longitude=i_lon
                )
            except Exception as ei:
                logger.error(f"[ERROR] Skip item {item.get('title')}: {ei}")
                return None

        tasks = [process_item(item) for item in data.get("itinerary", [])]
        results = await asyncio.gather(*tasks)
        
        for db_item in results:
            if db_item:
                session.add(db_item)
        
        costs = data.get("estimated_road_costs", {})
        if trip.transport_mode == "CAR":
            total_road = float(costs.get("fuel", 0.0)) + float(costs.get("tolls", 0.0))
            if total_road > 0:
                session.exec(delete(Expense).where(Expense.trip_id == trip.id, Expense.category == "Travel_Road", Expense.description.like("Stima%")))
                
                organizer = session.exec(select(Participant).where(Participant.trip_id == trip.id, Participant.is_organizer == True)).first()
                if organizer:
                    session.add(Expense(
                        trip_id=trip.id,
                        payer_id=organizer.id,
                        amount=total_road,
                        description="Stima Carburante e Pedaggi (AI)",
                        category="Travel_Road",
                        date=str(datetime.now(timezone.utc))
                    ))

        session.commit()
        logger.info(f"[SUCCESS] Itinerary for Trip {trip.id} generated correctly.")

    except Exception as e:
        session.rollback()
        logger.error(f"[AI Error] Generazione itinerario fallita: {e}")
        import traceback
        traceback.print_exc()

@router.post("/{trip_id}/confirm-hotel")
async def confirm_hotel(trip_id: int, hotel_data: HotelSelectionRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Conferma i dati logistici finali e genera l'itinerario"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        check_rate_limit(current_account, session)
        require_premium(current_account, trip)
        
        trip.accommodation = hotel_data.hotel_name
        trip.accommodation_location = hotel_data.hotel_address
        trip.hotel_cost = hotel_data.hotel_cost or 0.0
        trip.transport_cost = hotel_data.transport_cost or 0.0
        trip.arrival_time = hotel_data.arrival_time
        trip.return_time = hotel_data.return_time
        
        if hotel_data.transport_mode and hotel_data.transport_mode != "None":
            trip.transport_mode = hotel_data.transport_mode

        lat, lon = await get_coordinates(f"{hotel_data.hotel_name}, {hotel_data.hotel_address}")
        trip.hotel_latitude = lat
        trip.hotel_longitude = lon
        
        session.add(trip)
        session.commit()
        
        proposal = session.get(Proposal, trip.winning_proposal_id)
        if not proposal:
            proposal = Proposal(destination=trip.destination, trip_id=trip.id, price_estimate=0, description="")
        
        await generate_itinerary_content(trip, proposal, session)
        return {"status": "success", "message": "Logistica confermata. Itinerario generato."}
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] confirm_hotel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/reset-hotel")
async def reset_hotel(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Resetta i dati dell'hotel per permettere la modifica e la rigenerazione dell'itinerario"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        participant = session.exec(
            select(Participant).where(
                Participant.trip_id == trip_id, 
                Participant.account_id == current_account.id
            )
        ).first()
        
        if not participant or not participant.is_organizer:
            raise HTTPException(status_code=403, detail="Solo l'organizzatore può resettare la logistica")

        trip.accommodation = None
        trip.accommodation_location = None
        trip.hotel_latitude = None
        trip.hotel_longitude = None
        trip.hotel_cost = 0.0
        trip.transport_cost = 0.0
        
        session.exec(delete(ItineraryItem).where(ItineraryItem.trip_id == trip_id))
        session.exec(delete(Expense).where(Expense.trip_id == trip_id, Expense.category == "Travel_Road", Expense.description.like("Stima%")))
        
        session.add(trip)
        session.commit()
        return {"status": "success", "message": "Logistica resettata. Ora puoi inserire nuovi dati."}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] reset_hotel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vote/{proposal_id}")
async def vote_proposal(
    proposal_id: int, 
    score: int, 
    user_id: Optional[int] = None, 
    session: Session = Depends(get_session), 
    current_account: Optional[Account] = Depends(get_current_user, use_cache=True)
):
    """Registra il voto (Demo mode con user_id o Secure con token)"""
    try:
        proposal = session.get(Proposal, proposal_id)
        if not proposal: 
            raise HTTPException(status_code=404, detail="Proposta non trovata")
        
        participant = None
        if user_id and user_id > 0:
            participant = session.get(Participant, user_id)
        else:
            participant = session.exec(
                select(Participant).where(
                    Participant.trip_id == proposal.trip_id, 
                    Participant.account_id == current_account.id
                )
            ).first()
        
        if not participant: 
            raise HTTPException(status_code=403, detail="Partecipante non trovato")

        existing = session.exec(
            select(Vote).where(
                Vote.proposal_id == proposal_id, 
                Vote.user_id == participant.id
            )
        ).first()
        
        if existing:
            existing.score = score
            session.add(existing)
        else:
            session.add(Vote(proposal_id=proposal_id, user_id=participant.id, score=score))
        
        session.commit()
        
        trip = session.get(Trip, proposal.trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        total_voters_query = select(func.count(func.distinct(Vote.user_id))).join(
            Proposal
        ).where(Proposal.trip_id == trip.id)
        
        total_voters = session.exec(total_voters_query).one() or 0
        
        logger.info(f"[DEBUG] Voti: {total_voters}/{trip.num_people}")
        
        if total_voters >= trip.num_people:
            all_props = session.exec(select(Proposal).where(Proposal.trip_id == trip.id)).all()
            
            best_p = None
            best_score = -1
            
            for p in all_props:
                score_query = select(func.sum(Vote.score)).where(Vote.proposal_id == p.id)
                total_score = session.exec(score_query).one() or 0
                
                if total_score > best_score:
                    best_score = total_score
                    best_p = p
            
            if best_p:
                trip.winning_proposal_id = best_p.id
                trip.destination = best_p.destination
                trip.real_destination = best_p.real_destination
                trip.destination_iata = best_p.destination_iata
                trip.status = "BOOKED"
                session.add(trip)
                session.commit()
                logger.info(f"[SUCCESS] Consenso raggiunto! Vincitore: {best_p.destination}")

                try:
                    organizer = session.exec(select(Participant).where(Participant.trip_id == trip.id, Participant.is_organizer == True)).first()
                    organizer_account = session.get(Account, organizer.account_id) if organizer and organizer.account_id else None
                    
                    if organizer_account:
                        smtp_user, smtp_password, smtp_conf = get_smtp_config()
                        if smtp_user and smtp_password:
                            frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")
                            itinerary_url = f"{frontend_url}/dashboard/{trip.id}"
                            
                            message = MessageSchema(
                                subject=f"SplitPlan: Viaggio Confermato! \u2708\ufe0f {trip.name}",
                                recipients=[organizer_account.email],
                                body=booking_confirmation_email(
                                    name=organizer_account.name,
                                    trip_name=trip.name,
                                    destination=trip.destination,
                                    dates=f"{trip.start_date} - {trip.end_date}",
                                    price=f"€{best_p.price_estimate}",
                                    itinerary_url=itinerary_url
                                ),
                                subtype=MessageType.html
                            )
                            fm = FastMail(smtp_conf)
                            await fm.send_message(message)
                            logger.info(f"[OK] Email di conferma inviata a {organizer_account.email}")
                except Exception as email_err:
                    logger.error(f"[ERROR] Invio email conferma fallito: {email_err}")
        
        return {
            "status": "voted", 
            "current_voters": total_voters, 
            "required": trip.num_people, 
            "trip_status": trip.status, 
            "votes_count": total_voters
        }
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"[ERROR] vote_proposal: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nel voto: {str(e)}")

@router.post("/{trip_id}/simulate-votes")
async def simulate_votes(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Simula i voti mancanti per chiudere il viaggio in DEMO"""
    try:
        trip = session.get(Trip, trip_id)
        proposals = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
        participants = session.exec(select(Participant).where(Participant.trip_id == trip_id)).all()
        
        if not proposals: return {"error": "Nessuna proposta"}
        
        for p in participants:
            voted = session.exec(select(Vote).where(Vote.user_id == p.id)).first()
            if not voted:
                await vote_proposal(proposals[0].id, 1, session=session, current_account=current_account, user_id=p.id)
                
        return {"status": "votes_simulated", "voters": len(participants)}
    except Exception as e:
        logger.error(f"[ERROR] simulate_votes: {e}")
        return {"status": "error", "message": "Errore durante la simulazione dei voti."}

@router.get("/{trip_id}/itinerary", response_model=List[ItineraryItem])
async def get_itinerary(trip_id: int, session: Session = Depends(get_session)):
    return session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()

@router.get("/{trip_id}/participants")
async def get_participants(trip_id: int, session: Session = Depends(get_session)):
    """Restituisce i partecipanti al viaggio (Accessibile pubblicamente per votazioni)"""
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")
    
    results = session.exec(select(Participant).where(Participant.trip_id == trip_id)).all()
    return [
        {
            "id": p.id, 
            "name": p.name, 
            "is_organizer": p.is_organizer,
            "has_voted": session.exec(select(func.count(Vote.id)).where(Vote.user_id == p.id)).one() > 0
        } for p in results
    ]

@router.post("/{trip_id}/chat")
async def chat_with_ai(trip_id: int, req: ChatRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Chat AI evoluta: gestisce contesto temporale, history e comandi multipli"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        check_rate_limit(current_account, session)
        require_premium(current_account, trip)
            
        itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)).all()
        
        history_text = ""
        if req.history:
            history_text = "\n".join([f"{m.get('role', 'user').upper()}: {m.get('text', '')}" for m in req.history[-5:]])

        prompt = f"""
        Sei SplitPlan Assistant, un esperto Travel Agent. 
        VIAGGIO: {trip.name} a {trip.destination}
        DATE: dal {trip.start_date} al {trip.end_date}
        
        ITINERARIO ATTUALE (Lista di oggetti JSON con ID, Titolo, Orario):
        {json.dumps([i.model_dump() for i in itinerary], indent=2)}
        
        CRONOLOGIA RECENTE:
        {history_text}
        
        RICHIESTA UTENTE: "{req.message}"
        
        ISTRUZIONI:
        1. Rispondi cordialmente in {current_account.language.upper()}.
        2. Se l'utente vuole CAMBIARE o SPOSTARE qualcosa, devi fare DELETE dell'item corrente (usando il suo ID) e ADD di quello nuovo con i dati corretti.
        3. IMPORTANTE: Se riorganizzi l'itinerario, assicurati di NON PERDERE attività. Se cancelli un giorno per spostarlo, devi RIGENERARE tutte le attività di quel giorno.
        4. Se l'utente vuole aggiungere attività ricorrenti (es. ogni mattina), crea un comando ADD per ogni giorno del viaggio.
        5. AZIONI:
           - ADD: {{"action": "ADD", "item": {{"title": "..", "description": "..", "start_time": "ISO8601", "type": "ACTIVITY|FOOD|TRANSPORT"}}}}
           - DELETE: {{"action": "DELETE", "id": 123}}
        
        RISPONDI SEMPRE E SOLO IN JSON (senza testo fuori dal blocco):
        {{
            "reply": "Messaggio di conferma",
            "commands": []
        }}
        LINGUA: {current_account.language.upper()}.
        """
        
        if not ai_client: 
            return {"reply": "AI non disponibile.", "itinerary": [i.model_dump() for i in itinerary]}
        
        response = await ai_client.aio.models.generate_content(model=AI_MODEL, contents=prompt)
        raw_text = response.text.strip()
        
        logger.info(f"[DEBUG] Raw AI Response: {raw_text}")
        
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not json_match:
            return {"reply": "Scusa, non sono riuscito a elaborare la modifica. Prova a chiedermelo in modo diverso.", "itinerary": [i.model_dump() for i in itinerary]}
        
        try:
            data = json.loads(json_match.group())
        except:
            return {"reply": "C'è stato un errore nel formato della risposta AI. Riprova tra un istante.", "itinerary": [i.model_dump() for i in itinerary]}

        for cmd in data.get("commands", []):
            try:
                if cmd["action"] == "ADD":
                    item_data = cmd["item"].copy()
                    item_data.pop("id", None)
                    item_data.pop("trip_id", None)
                    
                    new_item = ItineraryItem(trip_id=trip_id, **item_data)
                    session.add(new_item)
                elif cmd["action"] == "DELETE":
                    item_id = cmd.get("id")
                    if item_id:
                        item = session.get(ItineraryItem, item_id)
                        if item and item.trip_id == trip_id: 
                            session.delete(item)
            except Exception as e:
                logger.error(f"[CMD Error] Fallito comando {cmd.get('action')}: {e}")
        
        session.commit()
        
        updated = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()
        return {
            "reply": data.get("reply", "Itinerario aggiornato!"), 
            "itinerary": [i.model_dump() for i in updated]
        }
        
    except Exception as e:
        session.rollback()
        logger.error(f"[Chat Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        session.rollback()
        logger.error(f"[Chat Error] {e}")
        raise HTTPException(status_code=500, detail=f"Errore elaborazione chat: {str(e)}")
@router.post("/buy-credits")
async def buy_credits(amount: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Simula l'acquisto di crediti"""
    try:
        current_account.credits += amount
        session.add(current_account)
        session.commit()
        session.refresh(current_account)
        return {"status": "success", "credits": current_account.credits}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/unlock")
async def unlock_trip(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Sblocca un viaggio usando 1 credito"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        if trip.is_premium:
            return {"status": "error", "message": "Il viaggio è già premium"}
        
        if current_account.credits < 1:
            raise HTTPException(status_code=403, detail="Crediti insufficienti. Acquistane altri nel negozio!")
            
        current_account.credits -= 1
        trip.is_premium = True
        
        session.add(current_account)
        session.add(trip)
        session.commit()
        
        return {"status": "success", "message": "Viaggio sbloccato!", "credits": current_account.credits}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trip_id}/export-pdf")
async def export_trip_pdf(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Esporta l'itinerario e le spese del viaggio in formato PDF"""
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")
    
    require_premium(current_account, trip)

    def format_pdf_datetime(dt_str):
        if not dt_str: return ""
        try:
            if 'T' in dt_str:
                dt = datetime.fromisoformat(dt_str.replace('Z', ''))
                return dt
            return None
        except:
            return None

    def format_pdf_date_only(d_str):
        if not d_str: return ""
        try:
            dt = datetime.strptime(d_str, "%Y-%m-%d")
            return dt.strftime("%d/%m/%Y")
        except:
            return d_str

    pdf_labels = {
        "it": {
            "header": "SPLITPLAN",
            "your_trip": "Il tuo viaggio a",
            "period": "Periodo",
            "lodging": "Alloggio",
            "hotel": "Hotel",
            "address": "Indirizzo",
            "itinerary": "Itinerario del Viaggio",
            "finances": "Riepilogo Spese",
            "total_spent": "TOTALE SPESE",
            "per_person": "a persona",
            "date": "Data",
            "description": "Descrizione",
            "category": "Categoria",
            "amount": "Importo (EUR)",
            "payer": "Pagato da",
            "day": "Giorno"
        },
        "en": {
            "header": "SPLITPLAN",
            "your_trip": "Your trip to",
            "period": "Period",
            "lodging": "Accommodation",
            "hotel": "Hotel",
            "address": "Address",
            "itinerary": "Travel Itinerary",
            "finances": "Expense Summary",
            "total_spent": "TOTAL EXPENSES",
            "per_person": "per person",
            "date": "Date",
            "description": "Description",
            "category": "Category",
            "amount": "Amount (EUR)",
            "payer": "Paid by",
            "day": "Day"
        }
    }
    L = pdf_labels.get(current_account.language, pdf_labels["it"])

    itinerary = sorted(trip.itinerary_items, key=lambda x: (x.start_time))
    expenses = trip.expenses
    
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    pdf.set_fill_color(25, 42, 86) 
    pdf.rect(0, 0, 210, 40, 'F')
    
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.set_y(10)
    pdf.cell(0, 15, L["header"], ln=True, align="C")
    
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"{L['your_trip']} {trip.real_destination or trip.destination}", ln=True, align="C")
    pdf.ln(10)
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, f"{trip.name}", ln=True)
    
    pdf.set_font("Helvetica", "I", 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 7, f"{L['period']}: {format_pdf_date_only(trip.start_date)} - {format_pdf_date_only(trip.end_date)}", ln=True)
    pdf.ln(5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(10)

    if trip.accommodation:
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_fill_color(240, 244, 255)
        pdf.set_text_color(25, 42, 86)
        pdf.cell(0, 12, f"   {L['lodging']}", ln=True, fill=True)
        pdf.ln(4)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, f"{L['hotel']}: {trip.accommodation}", ln=True)
        if trip.accommodation_location:
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(0, 8, f"{L['address']}: {trip.accommodation_location}")
        pdf.ln(10)

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_fill_color(240, 244, 255)
    pdf.set_text_color(25, 42, 86)
    pdf.cell(0, 12, f"   {L['itinerary']}", ln=True, fill=True)
    pdf.ln(5)
    
    if not itinerary:
        pdf.set_font("Helvetica", "", 12)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, "No itinerary generated yet." if current_account.language == "en" else "Nessun itinerario generato per questo viaggio.", ln=True)
    else:
        current_date_str = None
        day_count = 0
        
        for item in itinerary:
            dt = format_pdf_datetime(item.start_time)
            if not dt: continue
            
            date_str = dt.strftime("%Y-%m-%d")
            
            if date_str != current_date_str:
                current_date_str = date_str
                day_count += 1
                
                if pdf.get_y() > 240: pdf.add_page()
                
                pdf.ln(4)
                pdf.set_font("Helvetica", "B", 14)
                pdf.set_text_color(0, 122, 255) 
                pdf.cell(0, 10, f"{L['day']} {day_count} - {dt.strftime('%d/%m/%Y')}", ln=True)
                pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 50, pdf.get_y())
                pdf.ln(2)
            
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(50, 50, 50)
            time_display = dt.strftime("%H:%M")
            pdf.cell(20, 8, f"{time_display}", ln=False)
            
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, f"{item.title}", ln=True)
            
            if item.description:
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(100, 100, 100)
                pdf.set_x(30) 
                pdf.multi_cell(0, 5, f"{item.description}")
            
            pdf.ln(2)

    pdf.ln(10)
    
    if expenses:
        if pdf.get_y() > 180: pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_fill_color(240, 244, 255)
        pdf.set_text_color(25, 42, 86)
        pdf.cell(0, 12, f"   {L['finances']}", ln=True, fill=True)
        pdf.ln(5)
        
        total_eur = sum(e.amount for e in expenses)
        
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(255, 255, 255)
        pdf.set_fill_color(25, 42, 86)
        pdf.cell(30, 8, f" {L['date']}", border=0, fill=True)
        pdf.cell(80, 8, f" {L['description']}", border=0, fill=True)
        pdf.cell(30, 8, f" {L['category']}", border=0, fill=True)
        pdf.cell(50, 8, f" {L['amount']}", border=0, fill=True, ln=True)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 9)
        fill = False
        for e in expenses:
            pdf.set_fill_color(245, 247, 250) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.cell(30, 8, format_pdf_date_only(e.date), border=0, fill=True)
            pdf.cell(80, 8, f" {str(e.description)[:40]}", border=0, fill=True)
            pdf.cell(30, 8, f" {str(e.category)}", border=0, fill=True)
            pdf.cell(50, 8, f" {e.amount:.2f} EUR", border=0, fill=True, ln=True)
            fill = not fill
            
        pdf.ln(5)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(0, 122, 255)
        pdf.cell(0, 10, f"{L['total_spent']}: {total_eur:.2f} EUR", ln=True, align="R")

    pdf_bytes = pdf.output()
    
    if isinstance(pdf_bytes, bytearray):
        pdf_bytes = bytes(pdf_bytes)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=SplitPlan_{trip_id}.pdf"
        }
    )


@router.get("/{trip_id}/events")
async def get_trip_events(
    trip_id: int,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user),
):
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")

    check = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id,
            Participant.account_id == current_account.id
        )
    ).first()
    if not check:
        raise HTTPException(status_code=403, detail="Non sei un partecipante di questo viaggio.")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if trip.events_cache and trip.events_cache_date:
        cache_date = datetime.strptime(trip.events_cache_date, "%Y-%m-%d")
        diff = (datetime.now(timezone.utc) - cache_date).days
        if diff < 3:
            logger.info(f"Cache eventi usata per viaggio {trip_id} (età: {diff} giorni)")
            return json.loads(trip.events_cache)

    if not ai_client:
        raise HTTPException(status_code=503, detail="AI non disponibile.")

    check_rate_limit(current_account, session)

    destination = trip.real_destination or trip.destination
    lang = current_account.language.upper()

    prompt = f"""
    Sei un esperto di viaggi e cultura locale. 
    Il viaggio è a: {destination}
    Periodo: dal {trip.start_date} al {trip.end_date}
    
    Elenca gli eventi REALI e RILEVANTI che potrebbero impattare questo viaggio:
    - Festività nazionali o locali (musei chiusi, strade affollate)
    - Grandi eventi sportivi (partite importanti, maratone)
    - Festival, concerti, fiere famose
    - Eventi politici o istituzionali (visite di stato, manifestazioni)
    - Periodi di alta stagione turistica con zone molto affollate
    - Lavori stradali o chiusure di attrazioni note
    
    Per ogni evento indica l'impatto pratico sul viaggiatore.
    Se non sei sicuro di un evento specifico per quelle date, non inventarlo.
    
    RESTITUISCI SOLO JSON puro senza markdown:
    {{
        "events": [
            {{
                "title": "Nome evento",
                "type": "festival|concert|sport|political|religious|market|exhibition|disruption|holiday|other",
                "dates": "es. 15-17 agosto",
                "impact": "high|medium|low",
                "description": "Descrizione e impatto pratico",
                "affected_places": ["luogo1", "luogo2"],
                "travel_tip": "Consiglio pratico"
            }}
        ]
    }}
    Massimo 8 eventi. LINGUA: {lang}.
    """

    try:
        response = await ai_client.aio.models.generate_content(
            model=AI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            ),
        )
        raw = response.text.strip().replace("```json", "").replace("```", "")
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
        else:
            logger.warning(f"Nessun JSON trovato nella risposta eventi: {raw[:200]}")
            data = {"events": []}

        trip.events_cache = json.dumps(data)
        trip.events_cache_date = today
        session.add(trip)
        session.commit()

        logger.info(f"Eventi generati e cachati per viaggio {trip_id}")
        return data

    except json.JSONDecodeError as e:
        logger.error(f"Errore parsing JSON eventi viaggio {trip_id}: {e}")
        return {"events": []}
    except Exception as e:
        logger.error(f"Errore generazione eventi viaggio {trip_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlmodel import Session, select, func, delete
from typing import List, Dict, Optional
import os
import json
from datetime import datetime
import httpx
# SDK Ufficiale Google
from google import genai
from dotenv import load_dotenv

from ..database import get_session
from ..auth import get_current_user
from ..models import Trip, TripBase, Participant, Proposal, Vote, ItineraryItem, SQLModel, Account, Expense, Photo

# Caricamento variabili ambiente
load_dotenv()

# --- CONFIGURAZIONE GOOGLE GEMINI ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ai_client = None

# Modello stabile di Google
AI_MODEL = "gemini-2.5-flash" 

if GOOGLE_API_KEY:
    print(f"[OK] System: Google Gemini Client initialized.")
    ai_client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    print(f"[WARNING] System: GOOGLE_API_KEY missing. Running in Mock/Manual mode.")

router = APIRouter(prefix="/trips", tags=["trips"])

# --- MODELLI DI INPUT ---

class PreferencesRequest(SQLModel):
    destination: str
    departure_airport: str
    budget: float
    num_people: int = 1
    start_date: str
    end_date: str
    must_have: Optional[str] = ""
    must_avoid: Optional[str] = ""
    vibe: Optional[str] = "" 
    participant_names: List[str] = []
    transport_mode: Optional[str] = None

class HotelSelectionRequest(SQLModel):
    hotel_name: str
    hotel_address: str
    transport_mode: Optional[str] = None
    transport_cost: Optional[float] = 0.0
    hotel_cost: Optional[float] = 0.0
    arrival_time: Optional[str] = None
    return_time: Optional[str] = None

class ChatRequest(SQLModel):
    message: str
    history: Optional[List[Dict]] = []

class JoinRequest(SQLModel):
    share_token: str
    participant_name: str

# --- HELPER FUNZIONI: OPENSTREETMAP (OSM) & GEODATA ---

async def get_coordinates(address: str):
    """Trasforma un indirizzo in coordinate Lat/Lon usando Nominatim (OSM)"""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        headers = {'User-Agent': 'SplitPlanApp/1.0 (contact: alessiopuglise9@gmail.com)'} 
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if data:
                    return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"[OSM Error] Geocoding fallito per {address}: {e}")
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
                places_map = {} # Usa una mappa per gestire duplicati e preferire nodi
                
                for e in elements:
                    tags = e.get('tags', {})
                    name = tags.get('name')
                    if name:
                        lat_val = e.get('lat') or e.get('center', {}).get('lat')
                        lon_val = e.get('lon') or e.get('center', {}).get('lon')
                        if lat_val and lon_val:
                            # Se abbiamo già questo nome e l'elemento corrente è un nodo (più preciso), sovrascrivi
                            # Gli elementi Overpass hanno 'type': 'node', 'way', 'relation'
                            if name not in places_map or e.get('type') == 'node':
                                places_map[name] = {"name": name, "lat": lat_val, "lon": lon_val}
                
                return list(places_map.values()) # Lista di dict unici
    except Exception as e:
        print(f"[OSM Error] Overpass fallito: {e}")
    return []

@router.get("/migrate-db-coords")
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

@router.get("/migrate-share-token")
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

@router.get("/migrate-transport-mode")
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

@router.get("/migrate-transport-cost")
async def migrate_transport_cost(session: Session = Depends(get_session)):
    """Rinomina flight_cost in transport_cost nella tabella trip"""
    from sqlalchemy import text
    try:
        # Tenta di rinominare la colonna (PostgreSQL syntax)
        session.execute(text("ALTER TABLE trip RENAME COLUMN flight_cost TO transport_cost;"))
        session.commit()
        return {"status": "success", "message": "Colonna flight_cost rinominata in transport_cost."}
    except Exception as e:
        session.rollback()
        # Se fallisce perché già rinomata o altro, proviamo a crearla se non esiste (safety measure)
        try:
             session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS transport_cost FLOAT DEFAULT 0.0;"))
             session.commit()
             return {"status": "partial_success", "message": "Colonna transport_cost assicurata."}
        except Exception as e2:
             return {"status": "error", "message": str(e2)}


@router.get("/migrate-trip-intent")
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

@router.get("/migrate-booking-urls")
async def migrate_booking_urls(session: Session = Depends(get_session)):
    """Aggiunge booking_url e transport_url alla tabella proposal"""
    from sqlalchemy import text
    try:
        session.execute(text("ALTER TABLE proposal ADD COLUMN IF NOT EXISTS booking_url VARCHAR;"))
        session.execute(text("ALTER TABLE proposal ADD COLUMN IF NOT EXISTS transport_url VARCHAR;"))
        session.commit()
        return {"status": "success", "message": "Colonne booking_url e transport_url aggiunte."}
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

        # Raggruppa per giorno
        by_day = {}
        for item in items:
            day = item.start_time.split('T')[0]
            if day not in by_day: by_day[day] = []
            by_day[day].append(item)

        total_updated = 0
        for day, day_items in by_day.items():
            # Separa checkin/checkout (fissi)
            fixed = [i for i in day_items if i.type in ['CHECKIN', 'CHECKOUT']]
            to_optimize = [i for i in day_items if i.type not in ['CHECKIN', 'CHECKOUT'] and i.latitude and i.longitude]
            
            if not to_optimize: continue

            # Algoritmo Nearest Neighbor partendo dall'hotel (se disponibile) o dal primo elemento
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

            # Aggiorna gli orari (mantenendo lo slot originale ma in ordine nuovo)
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
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        if not ai_client:
            return {"suggestion": "AI non disponibile", "breakdown": {}}

        # Calcolo durata viaggio (conversione stringhe in date)
        try:
            d1 = datetime.fromisoformat(trip.start_date.replace('Z', ''))
            d2 = datetime.fromisoformat(trip.end_date.replace('Z', ''))
            days = abs((d2 - d1).days) + 1
        except:
            days = 7 # Fallback
            
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
        LINGUA: ITALIANO.
        """
        
        response = await ai_client.aio.models.generate_content(model=AI_MODEL, contents=prompt)
        data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
        return data
    except Exception as e:
        print(f"[AI Error] Stima budget fallita: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINTS CORE ---

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
        
        # Creazione automatica del partecipante ORGANIZZATORE
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
        print(f"[ERROR] create_trip: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-trips")
async def get_my_trips(session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Ritorna tutti i viaggi a cui partecipa l'utente corrente e che non sono stati nascosti"""
    try:
        # Trova tutti i record Participant collegati all'account e attivi
        participants = session.exec(
            select(Participant).where(
                Participant.account_id == current_account.id,
                Participant.is_active == True
            )
        ).all()
        
        trip_ids = [p.trip_id for p in participants]
        if not trip_ids:
            return []
            
        # Trova i viaggi corrispondenti
        trips = session.exec(
            select(Trip).where(Trip.id.in_(trip_ids))
        ).all()
        
        return trips
    except Exception as e:
        print(f"[ERROR] get_my_trips: {e}")
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
        print(f"[ERROR] hide_trip: {e}")
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
        print(f"[Migration Error] {e}")
        return {"status": "error", "message": str(e)}

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
    
    # Verifica che l'utente sia l'organizzatore
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
        
    # Recuperiamo anche i dati correlati necessari per la visualizzazione
    itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip.id).order_by(ItineraryItem.start_time)).all()
    expenses = session.exec(select(Expense).where(Expense.trip_id == trip.id)).all()
    photos = session.exec(select(Photo).where(Photo.trip_id == trip.id)).all()
    participants = session.exec(select(Participant).where(Participant.trip_id == trip.id)).all()
    
    # Prepariamo un oggetto di risposta che includa tutto il necessario
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
        # 1. Cerca il viaggio tramite token
        trip = session.exec(select(Trip).where(Trip.share_token == token)).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Link di condivisione non valido o scaduto")

        # 2. Verifica se è già dentro
        existing = session.exec(select(Participant).where(Participant.trip_id == trip.id, Participant.account_id == current_account.id)).first()
        if existing:
            return {"status": "success", "message": "Fai già parte di questo viaggio", "trip_id": trip.id}

        # 3. Matching Intelligente del nome
        # L'organizzatore potrebbe aver inserito solo il nome, o nome e cognome.
        # Proviamo diverse combinazioni.
        search_names = [
            current_account.name.strip().lower(),
            f"{current_account.name} {current_account.surname}".strip().lower()
        ]
        
        # Cerchiamo un partecipante senza account_id il cui nome (lower) combacia o è contenuto nei nomi dell'account
        guest_participant = None
        all_guests = session.exec(select(Participant).where(Participant.trip_id == trip.id, Participant.account_id == None)).all()
        
        for g in all_guests:
            g_name = g.name.strip().lower()
            if g_name in search_names or any(s in g_name for s in search_names):
                guest_participant = g
                break
        
        if guest_participant:
            guest_participant.account_id = current_account.id
            # Sincronizziamo il nome con quello dell'account per coerenza
            guest_participant.name = f"{current_account.name} {current_account.surname}"
            session.add(guest_participant)
            session.commit()
            return {"status": "success", "message": f"Benvenuto a bordo, {current_account.name}!", "trip_id": trip.id}
        
        # 4. Fallback: Se non troviamo un match, restituiamo un errore chiaro
        raise HTTPException(
            status_code=403, 
            detail=f"Non è stato trovato un partecipante che corrisponda al tuo nome ({current_account.name}) in questo viaggio. Assicurati che l'organizzatore ti abbia aggiunto con il nome corretto."
        )

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"[ERROR] join_trip: {e}")
        raise HTTPException(status_code=500, detail="Errore durante l'adesione al viaggio.")

@router.patch("/{trip_id}")
async def update_trip(trip_id: int, updates: Dict, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Aggiorna parzialmente i dati di un viaggio"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        # Verifica autorizzazione (solo partecipanti)
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
        # Verifica autorizzazione
        check = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.account_id == current_account.id)).first()
        if not check: 
            raise HTTPException(status_code=403, detail="Non autorizzato")

        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        # Aggiornamento dati viaggio
        trip.budget_per_person = prefs.budget / prefs.num_people
        trip.num_people = prefs.num_people
        trip.start_date = prefs.start_date
        trip.end_date = prefs.end_date
        trip.departure_airport = prefs.departure_airport 
        trip.departure_city = prefs.departure_airport
        trip.must_have = prefs.must_have
        trip.must_avoid = prefs.must_avoid
        
        # SALVA IL MEZZO DI TRASPORTO SCELTO MANUALMENTE SE PRESENTE
        if prefs.transport_mode:
            trip.transport_mode = prefs.transport_mode
            
        session.add(trip)
        
        # SALVATAGGIO PARTECIPANTI EXTRA
        if prefs.participant_names:
            for name in prefs.participant_names:
                exists = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.name == name)).first()
                if not exists:
                    session.add(Participant(name=name, trip_id=trip.id, is_organizer=False))
        session.commit()

        # --- GENERAZIONE AI GOOGLE ---
        if ai_client:
            try:
                prompt = f"""
                Agisci come un Travel Agent esperto. 
                TASK 1: Trova il codice IATA di 3 lettere per la partenza: "{prefs.departure_airport}".
                TASK 2: Genera 3 proposte UNICHE per: {prefs.destination}. 
                Sia che la destinazione sia un Paese o una singola città, le 3 proposte devono avere TEMI DIVERSI (es. uno Artistico, uno Gastronomico, uno Storico). 
                SE la destinazione è una singola città (es. Parigi), usa titoli creativi e accattivanti (es. 'Parigi Bohemienne', 'Parigi Segreta') per differenziarle.
                Dati: Budget TOTALE {prefs.budget}€ per {prefs.num_people} persone, dal {prefs.start_date} al {prefs.end_date}.
                Budget per persona: {prefs.budget / prefs.num_people}€.
                Preferenze: {prefs.must_have}, Evitare: {prefs.must_avoid}, Vibe: {prefs.vibe}.

                TASK 3: Analizza la distanza tra la partenza ({prefs.departure_airport}) e la destinazione ({prefs.destination}).
                Scegli il "suggested_transport_mode" tra: FLIGHT, TRAIN, CAR.
                REGOLA: Se la destinazione è raggiungibile via terra in meno di 6 ore (es. Milano-Roma, Parigi-Lione, Madrid-Barcellona), preferisci sempre TRAIN o CAR. Altrimenti usa FLIGHT.
                
                TASK 4 (CRITICO): Usa Google Search per trovare opzioni REALI di hotel e trasporti:
                - Per ogni proposta, cerca un hotel SPECIFICO nella destinazione che rientri nel budget per persona ({prefs.budget / prefs.num_people}€ per {(datetime.fromisoformat(prefs.end_date) - datetime.fromisoformat(prefs.start_date)).days + 1} notti).
                - Cerca anche trasporti REALI:
                  * Se FLIGHT: cerca voli su Google Flights, Skyscanner, etc.
                  * Se TRAIN: cerca biglietti su Trainline.com o Trenitalia.
                  * Se CAR: lascia transport_url come null (non serve link).
                - Fornisci i link diretti di prenotazione (Booking.com, Expedia, Google Flights, Trainline, etc.).
                - Se non trovi link specifici, lascia "booking_url" e "transport_url" come null.

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
                            "image_search_term": "louvre,museum",
                            "booking_url": "https://www.booking.com/hotel/...",
                            "transport_url": "https://www.thetrainline.com/..."
                        }}
                    ]
                }}
                NOTE: 
                - 'destination' deve essere il TITOLO CREATIVO (unico per ogni proposta).
                - 'destination_english' deve essere il nome della città principale in INGLESE.
                - 'destination_italian' deve essere il nome della città principale in ITALIANO.
                - 'image_search_term' deve contenere 1 o 2 parole chiave in INGLESE specifiche per quel tema.
                - 'booking_url' e 'transport_url' devono essere link REALI trovati tramite Google Search, non inventati.
                LINGUA: ITALIANO.
                """
                
                # Abilita Google Search Grounding
                from google.genai import types
                response = await ai_client.aio.models.generate_content(
                    model=AI_MODEL, 
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())]
                    )
                )
                data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
                
                if data.get("departure_iata_normalized"):
                    trip.departure_airport = data["departure_iata_normalized"].upper()
                
                if data.get("departure_city_normalized"):
                    trip.departure_city = data["departure_city_normalized"]
                
                # Applica il suggerimento AI solo se non contrasta con una scelta manuale forte del tipo 'CAR' o 'TRAIN'
                # Se l'utente ha lasciato 'FLIGHT' (default) ma l'AI vede che è vicino, seguiamo l'AI.
                ai_suggested = data.get("suggested_transport_mode")
                if ai_suggested and (trip.transport_mode == "FLIGHT" or not trip.transport_mode):
                    trip.transport_mode = ai_suggested
                
                session.add(trip)

                # Elimina proposte esistenti
                existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
                for e in existing: 
                    session.delete(e)
                
                # Crea nuove proposte
                import random
                import urllib.parse
                for p in data.get("proposals", []):
                    search = p.get("image_search_term") or ""
                    dest_en = p.get("destination_english") or ""
                    # Prepariamo tag pulite in INGLESE per LoremFlickr
                    curated_tags = f"{dest_en},{search},travel".lower().replace(" ", ",")
                    # Pulizia virgole doppie o vuote
                    tag_list = [t.strip() for t in curated_tags.split(",") if t.strip()]
                    final_tags = ",".join(tag_list[:3]) # Limitiamo a 3 tag per massima compatibilità
                    
                    seed = random.randint(1, 10000)
                    encoded_tags = urllib.parse.quote(final_tags, safe=',')
                    # Usiamo /all per forzare la precisione dei tag
                    img_url = f"https://loremflickr.com/1080/720/{encoded_tags}/all?lock={seed}"
                    
                    session.add(Proposal(
                        trip_id=trip_id, 
                        destination=p["destination"], 
                        real_destination=p.get("destination_italian") or p.get("destination_english") or "", # Salviamo il nome reale in ITALIANO (es. Parigi)
                        destination_iata=p.get("destination_iata"),
                        description=p["description"],
                        price_estimate=p["price_estimate"],
                        image_url=img_url,
                        booking_url=p.get("booking_url"),  # URL specifico per hotel
                        transport_url=p.get("transport_url")     # URL specifico per volo/treno
                    ))
                
                trip.status = "VOTING"
                session.commit()
                return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

            except Exception as e:
                print(f"[AI Error] Generazione fallita: {e}")

        # --- FALLBACK MANUALE (MOCK) ---
        print("AI fallita. Uso Mock Data con 3 opzioni.")
        iata_map = {"roma": "ROM", "milano": "MIL", "napoli": "NAP", "venezia": "VCE", "londra": "LON", "parigi": "PAR"}
        trip.departure_airport = iata_map.get(prefs.departure_airport.lower(), prefs.departure_airport[:3].upper())
        
        # Semplice euristica per il fallback se l'AI fallisce (quota finita)
        # Lo facciamo SOLO se il mezzo è proprio assente (Legacy)
        if not trip.transport_mode:
            short_distance_cities = ['roma', 'milano', 'firenze', 'napoli', 'venezia', 'torino', 'bologna']
            is_short = prefs.destination.lower() in short_distance_cities or prefs.departure_airport.lower() in short_distance_cities
            if is_short:
                trip.transport_mode = "TRAIN"
            else:
                trip.transport_mode = "FLIGHT"

        import random
        mock_options = [
            Proposal(trip_id=trip_id, destination=f"{prefs.destination} Smart", destination_iata="JFK", price_estimate=prefs.budget, description="Opzione equilibrata.", image_url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"),
            Proposal(trip_id=trip_id, destination=f"{prefs.destination} Budget", destination_iata="LHR", price_estimate=prefs.budget * 0.7, description="Viaggio economico.", image_url="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"),
            Proposal(trip_id=trip_id, destination=f"{prefs.destination} Luxury", destination_iata="CDG", price_estimate=prefs.budget * 1.5, description="Esperienza premium.", image_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c")
        ]
        
        existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
        for e in existing: session.delete(e)
        for o in mock_options: session.add(o)
        
        trip.status = "VOTING"
        session.commit()
        return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
        
    except Exception as e:
        session.rollback()
        print(f"[ERROR] generate_proposals: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

async def generate_itinerary_content(trip: Trip, proposal: Proposal, session: Session):
    """Genera l'itinerario finale integrando nomi reali da OSM e AI avanzata"""
    print(f"[System] Generating itinerary for Trip {trip.id}...")
    
    if not ai_client:
        print("[Warning] AI Client not available, skipping itinerary generation.")
        return

    try:
        # 1. Calcolo Durata e Logistica
        try:
            d1 = datetime.fromisoformat(trip.start_date.replace('Z', ''))
            d2 = datetime.fromisoformat(trip.end_date.replace('Z', ''))
            num_days = abs((d2 - d1).days) + 1
        except Exception as e:
            print(f"[Warning] Date parsing failed: {e}")
            num_days = 5 # Fallback
        
        # 2. Recupero nomi reali (OSM)
        hotel_lat = trip.hotel_latitude
        hotel_lon = trip.hotel_longitude
        locali_reali = await get_places_from_overpass(hotel_lat, hotel_lon) if hotel_lat else []
        
        places_prompt = ""
        if locali_reali:
            # Formatta la lista per l'AI
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
        
        # 3. Prompt Avanzato (Merge dei due stili)
        prompt = f"""
        Sei un esperto Travel Agent. Genera un itinerario di {num_days} giorni per il viaggio "{trip.name}" a {trip.destination}.
        TEMA: {proposal.destination}. DESCRIZIONE: {proposal.description}.
        PARTENZA: {trip.departure_city or trip.departure_airport}.
        ALLOGGIO: {trip.accommodation or "Hotel centrale"} (Coordinate: {hotel_lat}, {hotel_lon}).
        MEZZO PRINCIPALE: {trip.transport_mode}.
        ARRIVO: {trip.start_date} ore {trip.arrival_time or '14:00'}.
        RITORNO: {trip.end_date} ore {trip.return_time or '18:00'}.

        {places_prompt}

        SCOPO DEL VIAGGIO: {trip.trip_intent}
        {"Se il viaggio è BUSINESS, PRIORITÀ ASSOLUTA a: efficienza, hotel con coworking/Wi-Fi eccellente, pasti veloci ma di qualità, posizioni centrali vicino a hub di trasporto. Evita attività troppo rilassate o dispersive. Ottimizza per produttività." if trip.trip_intent == "BUSINESS" else "Se il viaggio è LEISURE, bilancia relax e scoperta. Includi esperienze locali autentiche, tempo libero e varietà di attività."}

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
        LINGUA: ITALIANO.
        """
        
        response = await ai_client.aio.models.generate_content(model=AI_MODEL, contents=prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        
        # 4. Salvataggio Itinerario
        # Elimina vecchio itinerario
        session.exec(delete(ItineraryItem).where(ItineraryItem.trip_id == trip.id))
        session.commit()
        
        import asyncio
        async def process_item(item):
            try:
                # Se l'AI non ha dato coordinate o sono 0, fallback su geocoding parallelizzato
                # Forza conversione in float e pulizia
                try:
                    i_lat = float(item.get("lat", 0))
                    i_lon = float(item.get("lon", 0))
                except:
                    i_lat, i_lon = 0.0, 0.0

                if not i_lat or i_lat == 0:
                    title_clean = item['title'].lower()
                    query = f"{item['title']}, {trip.destination}"
                    
                    # Ottimizzazione aggressiva per spiagge/mare: evita il centro città (es. stazione)
                    # Se il titolo contiene già "Bagno" o "Lido", cerchiamo quello direttamente per precisione.
                    # Se è generico, aggiungiamo "Lungomare" che è una strada, quindi a terra.
                    if any(word in title_clean for word in ['bagno', 'lido', 'mare']):
                        if 'bagno' in title_clean or 'lido' in title_clean:
                           query = f"{item['title']}, {trip.destination}"
                        else:
                           query = f"{item['title']}, Lungomare, {trip.destination}"
                    
                    i_lat, i_lon = await get_coordinates(query)
                    
                    # Se ancora fallisce e siamo al mare, usa coordinate hotel come fallback vicino
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
                print(f"[ERROR] Skip item {item.get('title')}: {ei}")
                return None

        # Task paralleli per coordinate se necessario
        tasks = [process_item(item) for item in data.get("itinerary", [])]
        results = await asyncio.gather(*tasks)
        
        for db_item in results:
            if db_item:
                session.add(db_item)
        
        # 5. Salvataggio Stime Spese (CAR)
        costs = data.get("estimated_road_costs", {})
        if trip.transport_mode == "CAR":
            total_road = float(costs.get("fuel", 0.0)) + float(costs.get("tolls", 0.0))
            if total_road > 0:
                # Elimina vecchie stime
                session.exec(delete(Expense).where(Expense.trip_id == trip.id, Expense.category == "Travel_Road", Expense.description.like("Stima%")))
                
                organizer = session.exec(select(Participant).where(Participant.trip_id == trip.id, Participant.is_organizer == True)).first()
                if organizer:
                    session.add(Expense(
                        trip_id=trip.id,
                        payer_id=organizer.id,
                        amount=total_road,
                        description="Stima Carburante e Pedaggi (AI)",
                        category="Travel_Road",
                        date=str(datetime.now())
                    ))

        session.commit()
        print(f"[SUCCESS] Itinerary for Trip {trip.id} generated correctly.")

    except Exception as e:
        session.rollback()
        print(f"[AI Error] Generazione itinerario fallita: {e}")
        import traceback
        traceback.print_exc()

@router.post("/{trip_id}/confirm-hotel")
async def confirm_hotel(trip_id: int, hotel_data: HotelSelectionRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Conferma i dati logistici finali e genera l'itinerario"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        trip.accommodation = hotel_data.hotel_name
        trip.accommodation_location = hotel_data.hotel_address
        trip.hotel_cost = hotel_data.hotel_cost or 0.0
        trip.transport_cost = hotel_data.transport_cost or 0.0
        trip.arrival_time = hotel_data.arrival_time
        trip.return_time = hotel_data.return_time
        
        # Salviamo anche il mezzo se cambiato nell'ultimo step
        if hotel_data.transport_mode and hotel_data.transport_mode != "None":
            trip.transport_mode = hotel_data.transport_mode

        # Otteniamo coordinate dell'hotel
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
        print(f"[ERROR] confirm_hotel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{trip_id}/reset-hotel")
async def reset_hotel(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Resetta i dati dell'hotel per permettere la modifica e la rigenerazione dell'itinerario"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        # Autorizzazione: verifica che l'utente sia l'organizzatore
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
        
        # Elimina anche l'itinerario e le stime spese collegate
        session.exec(delete(ItineraryItem).where(ItineraryItem.trip_id == trip_id))
        session.exec(delete(Expense).where(Expense.trip_id == trip_id, Expense.category == "Travel_Road", Expense.description.like("Stima%")))
        
        session.add(trip)
        session.commit()
        return {"status": "success", "message": "Logistica resettata. Ora puoi inserire nuovi dati."}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"[ERROR] reset_hotel: {e}")
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
        
        # Determina il partecipante
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

        # Registra o aggiorna voto
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
        
        # Ottieni il viaggio
        trip = session.get(Trip, proposal.trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        # Conta i votanti unici
        total_voters_query = select(func.count(func.distinct(Vote.user_id))).join(
            Proposal
        ).where(Proposal.trip_id == trip.id)
        
        total_voters = session.exec(total_voters_query).one() or 0
        
        print(f"[DEBUG] Voti: {total_voters}/{trip.num_people}")
        
        # Verifica consenso raggiunto
        if total_voters >= trip.num_people:
            all_props = session.exec(select(Proposal).where(Proposal.trip_id == trip.id)).all()
            
            # Calcola punteggi
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
                trip.real_destination = best_p.real_destination # Copiamo il nome reale
                trip.destination_iata = best_p.destination_iata
                trip.status = "BOOKED"
                session.add(trip)
                session.commit()
                print(f"[SUCCESS] Consenso raggiunto! Vincitore: {best_p.destination}")
        
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
        print(f"[ERROR] vote_proposal: {e}")
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
            # Se è il creatore, vota la prima proposta se non ha già votato
            voted = session.exec(select(Vote).where(Vote.user_id == p.id)).first()
            if not voted:
                await vote_proposal(proposals[0].id, 1, session=session, current_account=current_account, user_id=p.id)
                
        return {"status": "votes_simulated", "voters": len(participants)}
    except Exception as e:
        # Loggare l'errore reale internamente
        print(f"[ERROR] simulate_votes: {e}")
        # Restituire errore generico al client
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
    import re
    try:
        trip = session.get(Trip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)).all()
        
        # Preparazione Cronologia (ultimi 5 messaggi per contesto)
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
        1. Rispondi cordialmente in ITALIANO.
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
        """
        
        if not ai_client: 
            return {"reply": "AI non disponibile.", "itinerary": [i.model_dump() for i in itinerary]}
        
        response = await ai_client.aio.models.generate_content(model=AI_MODEL, contents=prompt)
        raw_text = response.text.strip()
        
        print(f"[DEBUG] Raw AI Response: {raw_text}")
        
        # Estrazione JSON tramite Regex (più robusta)
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not json_match:
            return {"reply": "Scusa, non sono riuscito a elaborare la modifica. Prova a chiedermelo in modo diverso.", "itinerary": [i.model_dump() for i in itinerary]}
        
        try:
            data = json.loads(json_match.group())
        except:
            return {"reply": "C'è stato un errore nel formato della risposta AI. Riprova tra un istante.", "itinerary": [i.model_dump() for i in itinerary]}

        # Esecuzione Comandi
        for cmd in data.get("commands", []):
            try:
                if cmd["action"] == "ADD":
                    # Pulizia dei dati per evitare errori di argomenti multipli (es. trip_id)
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
                print(f"[CMD Error] Fallito comando {cmd.get('action')}: {e}")
        
        session.commit()
        
        # Recupero e SERIAZIONE ESPLICITA per evitare errori Vercel/FastAPI
        updated = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()
        return {
            "reply": data.get("reply", "Itinerario aggiornato!"), 
            "itinerary": [i.model_dump() for i in updated]
        }
        
    except Exception as e:
        session.rollback()
        print(f"[Chat Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        session.rollback()
        print(f"[Chat Error] {e}")
        raise HTTPException(status_code=500, detail=f"Errore elaborazione chat: {str(e)}")

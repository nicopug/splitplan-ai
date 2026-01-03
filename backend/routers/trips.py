from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlmodel import Session, select, func, delete
from typing import List, Dict, Optional
import os
import json
import requests
import random
from datetime import datetime
# SDK Ufficiale Google
from google import genai
from dotenv import load_dotenv

from ..database import get_session
from ..auth import get_current_user
from ..models import Trip, TripBase, Participant, Proposal, Vote, ItineraryItem, SQLModel, Account

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

class HotelConfirmationRequest(SQLModel):
    hotel_name: str
    hotel_address: str
    flight_cost: Optional[float] = 0.0
    hotel_cost: Optional[float] = 0.0
    arrival_time: Optional[str] = None
    return_time: Optional[str] = None

class ChatRequest(SQLModel):
    message: str
    history: Optional[List[Dict]] = []

# --- HELPER FUNZIONI: OPENSTREETMAP (OSM) & GEODATA ---

def get_coordinates(address: str):
    """Trasforma un indirizzo in coordinate Lat/Lon usando Nominatim (OSM)"""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        headers = {'User-Agent': 'SplitPlanApp/1.0 (contact: alessiopuglise9@gmail.com)'} 
        response = requests.get(url, params=params, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"[OSM Error] Geocoding fallito per {address}: {e}")
    return None, None

def get_places_from_overpass(lat: float, lon: float, radius: int = 800):
    """Query Overpass API per trovare nomi reali di ristoranti e bar vicini"""
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|bar|cafe|pub|fast_food"](around:{radius},{lat},{lon});
      way["amenity"~"restaurant|bar|cafe|pub|fast_food"](around:{radius},{lat},{lon});
    );
    out tags 20;
    """
    try:
        response = requests.post(overpass_url, data={'data': query}, timeout=15)
        if response.status_code == 200:
            elements = response.json().get('elements', [])
            places = [e.get('tags', {}).get('name') for e in elements if e.get('tags', {}).get('name')]
            return list(set(places)) 
    except Exception as e:
        print(f"[OSM Error] Overpass fallito: {e}")
    return []

@router.get("/migrate-db-coords")
def migrate_db_coords(session: Session = Depends(get_session)):
    """Aggiunge lat/lon alla tabella itineraryitem"""
    from sqlalchemy import text
    try:
        session.exec(text("ALTER TABLE itineraryitem ADD COLUMN IF NOT EXISTS latitude FLOAT;"))
        session.exec(text("ALTER TABLE itineraryitem ADD COLUMN IF NOT EXISTS longitude FLOAT;"))
        session.commit()
        return {"status": "success", "message": "Colonne coordinate aggiunte."}
    except Exception as e:
        session.rollback()
        return {"status": "error", "message": str(e)}

@router.post("/{trip_id}/optimize")
def optimize_itinerary(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
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
                 start_lat, start_lon = get_coordinates(trip.accommodation_location)
            
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
def estimate_budget(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Stima i costi della vita locale tramite AI"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        if not ai_client:
            return {"suggestion": "AI non disponibile", "breakdown": {}}

        prompt = f"""
        Analizza i costi di viaggio per: {trip.destination}.
        Dati: {trip.num_people} persone, dal {trip.start_date} al {trip.end_date}.
        
        RESTITUISCI SOLO JSON:
        {{
            "daily_meal_mid": 30.0,
            "daily_meal_cheap": 15.0,
            "daily_transport": 10.0,
            "coffee_drinks": 8.0,
            "total_estimated_per_person": 500.0,
            "advice": "Breve consiglio sulla città..."
        }}
        LINGUA: ITALIANO.
        """
        
        response = ai_client.models.generate_content(model=AI_MODEL, contents=prompt)
        data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
        return data
    except Exception as e:
        print(f"[AI Error] Stima budget fallita: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINTS CORE ---

@router.post("/", response_model=Dict)
def create_trip(trip_data: TripBase, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
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

@router.get("/{trip_id}", response_model=Trip)
def read_trip(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Recupera i dettagli del viaggio verificando l'appartenenza dell'account"""
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
    participant = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.account_id == current_account.id)).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Non partecipi a questo viaggio")
        
    return trip

@router.patch("/{trip_id}")
def update_trip(trip_id: int, updates: Dict, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
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
def generate_proposals(trip_id: int, prefs: PreferencesRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
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
                TASK 2: Genera 3 proposte per: {prefs.destination}.
                Dati: Budget {prefs.budget}€, {prefs.num_people} persone, dal {prefs.start_date} al {prefs.end_date}.
                Preferenze: {prefs.must_have}, Evitare: {prefs.must_avoid}, Vibe: {prefs.vibe}.

                RESTITUISCI SOLO JSON:
                {{
                    "departure_iata_normalized": "XXX",
                    "proposals": [
                        {{"destination": "Città, Nazione", "destination_iata": "XXX", "description": "...", "price_estimate": 1000, "image_search_term": "keyword"}}
                    ]
                }}
                LINGUA: ITALIANO.
                """
                
                response = ai_client.models.generate_content(model=AI_MODEL, contents=prompt)
                data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
                
                if data.get("departure_iata_normalized"):
                    trip.departure_airport = data["departure_iata_normalized"].upper()
                    session.add(trip)

                # Elimina proposte esistenti
                existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
                for e in existing: 
                    session.delete(e)
                
                # Crea nuove proposte
                for p in data.get("proposals", []):
                    search = p.get("destination") or "travel"
                    seed = random.randint(1, 1000000)
                    # Use a more descriptive prompt and flux model for better reliability
                    prompt_encoded = f"{search.replace(' ', '%20')}%20scenic%20city%20landmark%20professional%20photography%20no%20text"
                    img_url = f"https://pollinations.ai/p/{prompt_encoded}?width=1080&height=720&seed={seed}&model=flux&nologo=true"
                    session.add(Proposal(
                        trip_id=trip_id, 
                        destination=p["destination"], 
                        destination_iata=p.get("destination_iata"), 
                        description=p["description"], 
                        price_estimate=p["price_estimate"], 
                        image_url=img_url
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

def generate_itinerary_content(trip: Trip, proposal: Proposal, session: Session):
    """Genera l'itinerario finale integrando nomi reali da OSM"""
    print(f"[System] Generating itinerary for Trip {trip.id}...")
    
    if ai_client:
        try:
            d1 = datetime.strptime(trip.start_date, "%Y-%m-%d")
            d2 = datetime.strptime(trip.end_date, "%Y-%m-%d")
            num_days = abs((d2 - d1).days) + 1
            
            # OSM: Recupero locali reali
            hotel_lat, hotel_lon = get_coordinates(f"{trip.accommodation}, {proposal.destination}")
            real_places = get_places_from_overpass(hotel_lat, hotel_lon) if hotel_lat else []
            places_prompt = f"USA OBBLIGATORIAMENTE QUESTI NOMI REALI PER I PASTI (NON SCRIVERE 'PRANZO IN ZONA' O SIMILI): {', '.join(real_places[:12])}" if real_places else "Cerca di inventare nomi di fantasia realistici o usa locali famosi della zona, NON usare frasi generiche come 'Pasto in ristorante locale'."

            prompt = f"""
            Crea un itinerario di {num_days} giorni a {proposal.destination}. Hotel: {trip.accommodation}.
            {places_prompt}
            Logistica: Arrivo {trip.start_date} ore {trip.arrival_time or '14:00'}, Ritorno {trip.end_date} ore {trip.return_time or '18:00'}.
            
            REGOLE CRITICHE:
            1. JSON ARRAY. 
            2. Ogni pasto (Pranzo/Cena) DEVE avere il nome di un ristorante specifico.
            3. Ogni attività DEVE essere un luogo preciso (es. 'Museo del Prado' non 'Giro al museo').
            4. Se non hai nomi reali da OSM, usa la tua conoscenza per suggerire locali reali e famosi a {proposal.destination}.
            5. Lingua: Italiano.
            FORMATO: [{{"title": "Nome Locale o Attività", "description": "Cosa fare/cosa mangiare", "start_time": "ISO8601", "end_time": "ISO8601", "type": "ACTIVITY/MEAL/CHECKIN", "lat": 0.0, "lon": 0.0}}]
            NOTE: Fornisci coordinate lat/lon il più precise possibile per ogni luogo.
            """
            
            response = ai_client.models.generate_content(model=AI_MODEL, contents=prompt)
            items_data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            
            # Elimina itinerario esistente usando delete statement
            session.exec(delete(ItineraryItem).where(ItineraryItem.trip_id == trip.id))
            session.commit()
            
            for item in items_data:
                # Usa le coordinate fornite dall'AI invece di fare 20 chiamate OSM lente
                lat = item.get("lat")
                lon = item.get("lon")
                # Se mancano o sono 0, fallback solo per questo specifico item (raro)
                if not lat or lat == 0:
                    lat, lon = get_coordinates(f"{item['title']}, {proposal.destination}")
                
                # Rimuovi chiavi lat/lon dal dizionario per evitare doppioni nel costruttore
                clean_item = {k: v for k, v in item.items() if k not in ["lat", "lon"]}
                session.add(ItineraryItem(trip_id=trip.id, latitude=lat, longitude=lon, **clean_item))
            session.commit()
            print(f"[System] Itinerary for Trip {trip.id} generated successfully (Optimized).")
            return
        except Exception as e:
            print(f"[AI Error] Itinerario fallito: {e}")

    # Mock Fallback Itinerary
    session.exec(delete(ItineraryItem).where(ItineraryItem.trip_id == trip.id))
    session.commit()
    
    mock_it = [
        ItineraryItem(trip_id=trip.id, title="Arrivo e Check-in", description=f"Check-in presso {trip.accommodation}", start_time=f"{trip.start_date}T14:30:00", type="CHECKIN"),
        ItineraryItem(trip_id=trip.id, title="Esplorazione Centro", description="Primo contatto con la città", start_time=f"{trip.start_date}T16:30:00", type="ACTIVITY"),
    ]
    for i in mock_it: session.add(i)
    session.commit()

@router.post("/{trip_id}/confirm-hotel")
def confirm_hotel(trip_id: int, hotel_data: HotelConfirmationRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Salva la logica hotel e genera l'itinerario"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip: 
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
        trip.accommodation = hotel_data.hotel_name
        trip.accommodation_location = hotel_data.hotel_address
        trip.flight_cost = hotel_data.flight_cost
        trip.hotel_cost = hotel_data.hotel_cost
        trip.arrival_time = hotel_data.arrival_time
        trip.return_time = hotel_data.return_time
        session.add(trip)
        session.commit()
        
        proposal = session.get(Proposal, trip.winning_proposal_id)
        if not proposal:
            proposal = Proposal(destination=trip.destination, trip_id=trip.id, price_estimate=0, description="")
        
        generate_itinerary_content(trip, proposal, session)
        return {"status": "success", "message": "Logistica confermata. Itinerario generato."}
    except Exception as e:
        session.rollback()
        print(f"[ERROR] confirm_hotel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vote/{proposal_id}")
def vote_proposal(
    proposal_id: int, 
    score: int, 
    user_id: Optional[int] = None, 
    session: Session = Depends(get_session), 
    current_account: Account = Depends(get_current_user)
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Errore nel voto: {str(e)}")

@router.post("/{trip_id}/simulate-votes")
def simulate_votes(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Simula i voti per raggiungere il consenso (Demo mode)"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        proposals = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
        if not proposals: 
            return {"error": "Genera proposte prima"}
        
        # Trova chi ha già votato
        voted_ids_query = select(Vote.user_id).join(Proposal).where(Proposal.trip_id == trip.id)
        voted_ids = [row for row in session.exec(voted_ids_query)]
        
        # Trova chi manca
        missing = session.exec(
            select(Participant).where(
                Participant.trip_id == trip.id, 
                Participant.id.not_in(voted_ids) if voted_ids else True
            )
        ).all()
        
        # Aggiungi voti simulati
        for u in missing:
            session.add(Vote(proposal_id=proposals[0].id, user_id=u.id, score=1))
        session.commit()
        
        # Ricalcola il consenso
        return vote_proposal(proposals[0].id, 1, session=session, current_account=current_account, user_id=missing[0].id if missing else None)
        
    except Exception as e:
        session.rollback()
        print(f"[ERROR] simulate_votes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{trip_id}/itinerary", response_model=List[ItineraryItem])
def get_itinerary(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    return session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()

@router.get("/{trip_id}/participants")
def get_participants(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Restituisce i partecipanti al viaggio in formato pulito per evitare loop JSON"""
    # Verifica accesso
    check = session.exec(select(Participant).where(Participant.trip_id == trip_id, Participant.account_id == current_account.id)).first()
    if not check: 
        raise HTTPException(status_code=403, detail="Non autorizzato")
    
    results = session.exec(select(Participant).where(Participant.trip_id == trip_id)).all()
    return [{"id": p.id, "name": p.name, "is_organizer": p.is_organizer} for p in results]

@router.post("/{trip_id}/chat")
def chat_with_ai(trip_id: int, req: ChatRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Chat AI avanzata: può aggiungere o eliminare item dall'itinerario"""
    try:
        trip = session.get(Trip, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Viaggio non trovato")
            
        itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)).all()
        
        prompt = f"""
        Sei SplitPlan Assistant. Viaggio: {trip.name} ({trip.destination}).
        ITINERARIO: {json.dumps([i.model_dump() for i in itinerary])}
        UTENTE: "{req.message}"
        
        ISTRUZIONI:
        1. Rispondi cordialmente.
        2. Se richiesto, genera comandi JSON in 'commands':
           - ADD: {{"action": "ADD", "item": {{"title": "..", "description": "..", "start_time": "ISO8601", "type": "ACTIVITY"}}}}
           - DELETE: {{"action": "DELETE", "id": 123}}
        RISPONDI JSON: {{"reply": "...", "commands": []}}
        """
        
        if not ai_client: 
            return {"reply": "AI non disponibile.", "itinerary": []}
        
        response = ai_client.models.generate_content(model=AI_MODEL, contents=prompt)
        data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
        
        for cmd in data.get("commands", []):
            if cmd["action"] == "ADD":
                session.add(ItineraryItem(trip_id=trip_id, **cmd["item"]))
            elif cmd["action"] == "DELETE":
                item = session.get(ItineraryItem, cmd["id"])
                if item and item.trip_id == trip_id: 
                    session.delete(item)
        
        session.commit()
        updated = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()
        return {"reply": data["reply"], "itinerary": updated}
        
    except Exception as e:
        session.rollback()
        print(f"[Chat Error] {e}")
        raise HTTPException(status_code=500, detail=f"Errore elaborazione chat: {str(e)}")
from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlmodel import Session, select, func
from typing import List, Dict, Optional
import os
import json
import requests
import random
from datetime import datetime
# SDK Ufficiale Google (Assicurati di avere google-genai in requirements.txt)
from google import genai
from dotenv import load_dotenv

from ..database import get_session
from ..auth import get_current_user
from ..models import Trip, TripBase, User, UserBase, Proposal, Vote, ItineraryItem, SQLModel, Account

# Caricamento variabili ambiente
load_dotenv()

# --- CONFIGURAZIONE GOOGLE GEMINI ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ai_client = None

# USIAMO LA VERSIONE STABILE 1.5 FLASH
AI_MODEL = "gemini-1.5-flash"

if GOOGLE_API_KEY:
    print(f"[OK] System: Google Gemini Client initialized.")
    ai_client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    print(f"[WARNING] GOOGLE_API_KEY not found. Running in Mock Mode.")

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

# --- HELPER FUNZIONI: OPENSTREETMAP (OSM) ---

def get_coordinates(address: str):
    """Trasforma un indirizzo in coordinate Lat/Lon usando Nominatim (OSM)"""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        headers = {'User-Agent': 'SplitPlanApp/1.0'} 
        response = requests.get(url, params=params, headers=headers, timeout=5)
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"[OSM Error] Geocoding fallito: {e}")
    return None, None

def get_places_from_overpass(lat: float, lon: float, radius: int = 600):
    """Trova nomi reali di ristoranti e bar vicini alle coordinate tramite Overpass API"""
    overpass_url = "https://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|bar|cafe|pub"](around:{radius},{lat},{lon});
      way["amenity"~"restaurant|bar|cafe|pub"](around:{radius},{lat},{lon});
    );
    out tags 15;
    """
    try:
        response = requests.post(overpass_url, data={'data': overpass_query}, timeout=10)
        data = response.json()
        places = []
        for element in data.get('elements', []):
            name = element.get('tags', {}).get('name')
            if name:
                places.append(name)
        return list(set(places)) # Rimuove duplicati
    except Exception as e:
        print(f"[OSM Error] Overpass fallito: {e}")
        return []

# --- ENDPOINTS ---

@router.post("/", response_model=Dict)
def create_trip(trip_data: TripBase, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Crea un viaggio e collega l'account loggato come organizzatore"""
    db_trip = Trip.model_validate(trip_data)
    if trip_data.trip_type == "SOLO":
        db_trip.num_people = 1
    session.add(db_trip)
    session.commit()
    session.refresh(db_trip)
    
    organizer = User(
        name=current_account.name, 
        is_organizer=True, 
        trip_id=db_trip.id,
        account_id=current_account.id
    )
    session.add(organizer)
    session.commit()
    session.refresh(organizer)
    
    return {
        "trip_id": db_trip.id,
        "trip": db_trip,
        "organizer": organizer
    }

@router.get("/{trip_id}", response_model=Trip)
def read_trip(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Recupera il viaggio solo se l'utente loggato è un partecipante"""
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    participant = session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Accesso negato: non sei un partecipante")
        
    return trip

@router.post("/{trip_id}/generate-proposals", response_model=List[Proposal])
def generate_proposals(trip_id: int, prefs: PreferencesRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Genera 3 proposte e salva correttamente tutti i partecipanti nel DB"""
    # Verifica accesso
    participant = session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Azione non autorizzata")

    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato")
        
    # Aggiorna i dati del viaggio
    trip.budget_per_person = prefs.budget / prefs.num_people
    trip.num_people = prefs.num_people
    trip.start_date = prefs.start_date
    trip.end_date = prefs.end_date
    trip.departure_airport = prefs.departure_airport 
    trip.must_have = prefs.must_have
    trip.must_avoid = prefs.must_avoid
    session.add(trip)
    
    # --- FIX PARTECIPANTI: SALVATAGGIO NEL DB ---
    # 1. Assicuriamoci che l'organizzatore sia nella lista partecipanti
    # (È già stato creato in create_trip, ma per sicurezza verifichiamo)
    # 2. Aggiungiamo gli amici specificati nel form
    if prefs.participant_names:
        for name in prefs.participant_names:
            # Controlla se esiste già un utente con questo nome per questo viaggio
            exists = session.exec(select(User).where(User.trip_id == trip_id, User.name == name)).first()
            if not exists:
                new_user = User(name=name, trip_id=trip.id, is_organizer=False)
                session.add(new_user)
    
    session.commit()
    # --------------------------------------------

    # --- LOGICA INTELLIGENTE GOOGLE GEMINI ---
    if ai_client:
        try:
            prompt = f"""
            Act as a Travel Agent. 
            TASK 1: Analyze the Departure City: "{prefs.departure_airport}". Identify the 3-letter IATA code.
            TASK 2: Generate 3 distinct travel proposals for: {prefs.destination}.
            Total Budget: {prefs.budget} EUR, {prefs.num_people} people, from {prefs.start_date} to {prefs.end_date}.
            Must include: {prefs.must_have}. Avoid: {prefs.must_avoid}. Vibe: {prefs.vibe}.

            RETURN ONLY VALID JSON:
            {{
                "departure_iata_normalized": "XXX", 
                "proposals": [
                    {{
                        "destination": "City, Country",
                        "destination_iata": "XXX",
                        "description": "2 short sentences",
                        "price_estimate": 1000,
                        "image_search_term": "keyword"
                    }}
                ]
            }}
            THE RESPONSE MUST BE IN ITALIAN.
            """
            
            # Chiamata Google SDK
            response = ai_client.models.generate_content(
                model=AI_MODEL,
                contents=prompt
            )
            
            content = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            
            if data.get("departure_iata_normalized"):
                trip.departure_airport = data["departure_iata_normalized"].upper()
                session.add(trip)

            # Rimuove vecchie proposte e aggiunge le nuove
            existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
            for e in existing: session.delete(e)
            
            for p in data.get("proposals", []):
                search = p.get("image_search_term") or p.get("destination")
                img_url = f"https://image.pollinations.ai/prompt/{search.replace(' ', '%20')}%20travel%20photography%20scenic?width=800&height=600&nologo=true"
                
                new_prop = Proposal(
                    trip_id=trip_id,
                    destination=p["destination"],
                    destination_iata=p.get("destination_iata"),
                    description=p["description"],
                    price_estimate=p["price_estimate"],
                    image_url=img_url 
                )
                session.add(new_prop)
            
            trip.status = "VOTING"
            session.commit()
            return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

        except Exception as e:
            print(f"[AI Error] Proposals generation failed: {e}")

    # --- FALLBACK LOGICA MANUALE (MOCK) ---
    print("AI indisponibile o fallita. Uso Mock Data.")
    iata_mapping = {"roma": "ROM", "milano": "MIL", "napoli": "NAP", "venezia": "VCE", "londra": "LON", "parigi": "PAR"}
    trip.departure_airport = iata_mapping.get(prefs.departure_airport.lower(), prefs.departure_airport[:3].upper())
    
    mock_options = [
        Proposal(trip_id=trip_id, destination=f"{prefs.destination} Smart", destination_iata="JFK", price_estimate=prefs.budget, description="Opzione equilibrata e comoda.", image_url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"),
        Proposal(trip_id=trip_id, destination=f"{prefs.destination} Budget", destination_iata="LHR", price_estimate=prefs.budget * 0.8, description="Viaggio economico e divertente.", image_url="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"),
        Proposal(trip_id=trip_id, destination=f"{prefs.destination} Luxury", destination_iata="CDG", price_estimate=prefs.budget * 1.3, description="L'esperienza premium definitiva.", image_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c")
    ]
    
    existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
    for e in existing: session.delete(e)
    for o in mock_options: session.add(o)
    
    trip.status = "VOTING"
    session.commit()
    return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

def generate_itinerary_content(trip: Trip, proposal: Proposal, session: Session):
    """Genera l'itinerario finale includendo nomi di locali reali da OSM"""
    print(f"Generating itinerary for Trip {trip.id}...")
    
    if ai_client:
        try:
            d1 = datetime.strptime(trip.start_date, "%Y-%m-%d")
            d2 = datetime.strptime(trip.end_date, "%Y-%m-%d")
            num_days = abs((d2 - d1).days) + 1
            
            # OSM INTELLIGENCE
            hotel_lat, hotel_lon = get_coordinates(f"{trip.accommodation}, {proposal.destination}")
            real_places = get_places_from_overpass(hotel_lat, hotel_lon) if hotel_lat else []
            places_text = f"\nREAL PLACES NEARBY (USE THESE NAMES): {', '.join(real_places[:12])}" if real_places else ""

            prompt = f"""
            Create a {num_days}-day itinerary for {proposal.destination}. Hotel: {trip.accommodation}.
            {places_text}
            Dates: {trip.start_date} to {trip.end_date}. Arrival: {trip.arrival_time}, Return: {trip.return_time}.
            
            RULES:
            1. First day starts at arrival time. Last day includes checkout.
            2. When suggesting meals, use the REAL PLACES names provided above.
            3. RESPONSE ONLY VALID JSON ARRAY. 
            Keys: "title", "description", "start_time" (ISO), "end_time" (ISO), "type" (ACTIVITY/FOOD/CHECKIN).
            ITALIAN LANGUAGE.
            """
            
            # Chiamata Google SDK
            response = ai_client.models.generate_content(
                model=AI_MODEL,
                contents=prompt
            )
            
            content = response.text.replace("```json", "").replace("```", "").strip()
            items_data = json.loads(content)
            
            # Pulisce itinerario esistente
            session.exec(SQLModel.metadata.tables['itineraryitem'].delete().where(SQLModel.metadata.tables['itineraryitem'].c.trip_id == trip.id))
            
            for item in items_data:
                db_item = ItineraryItem(
                    trip_id=trip.id, 
                    title=item["title"], 
                    description=item.get("description"), 
                    start_time=item["start_time"], 
                    end_time=item.get("end_time"), 
                    type=item.get("type", "ACTIVITY")
                )
                session.add(db_item)
            session.commit()
            return

        except Exception as e:
            print(f"[Itinerary Gen Failed] Error: {e}")

    # Mock Fallback Itinerary
    mock_items = [
        ItineraryItem(trip_id=trip.id, title="Arrivo e Check-in", description=f"Sistemazione presso {trip.accommodation}", start_time=f"{trip.start_date}T14:30:00", type="CHECKIN"),
        ItineraryItem(trip_id=trip.id, title="Esplorazione Quartiere", description="Primo contatto con la città", start_time=f"{trip.start_date}T16:00:00", type="ACTIVITY"),
        ItineraryItem(trip_id=trip.id, title="Cena di Benvenuto", description="Cena in un tipico locale vicino all'hotel", start_time=f"{trip.start_date}T20:30:00", type="FOOD"),
    ]
    for i in mock_items: session.add(i)
    session.commit()

@router.post("/{trip_id}/confirm-hotel")
def confirm_hotel(trip_id: int, hotel_data: HotelConfirmationRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Salva la scelta dell'hotel e genera l'itinerario basato sulla posizione"""
    trip = session.get(Trip, trip_id)
    if not trip: raise HTTPException(status_code=404, detail="Trip not found")
    
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
    
    # QUI GENERIAMO L'ITINERARIO
    generate_itinerary_content(trip, proposal, session)
    
    return {"status": "success", "message": "Logistica confermata. Itinerario generato."}

@router.post("/vote/{proposal_id}")
def vote_proposal(
    proposal_id: int, 
    score: int, 
    # user_id opzionale: se presente lo usiamo (modalità demo), altrimenti usiamo account
    user_id: Optional[int] = None, 
    session: Session = Depends(get_session), 
    current_account: Account = Depends(get_current_user)
):
    """Registra il voto."""
    proposal = session.get(Proposal, proposal_id)
    if not proposal: raise HTTPException(status_code=404, detail="Proposta non trovata")
    
    # Identificazione Partecipante (Ibrida: Demo vs Sicura)
    participant = None
    
    if user_id: 
        # Modalità Demo/Gruppo: ci fidiamo dell'ID manuale (se appartiene al viaggio)
        participant = session.get(User, user_id)
        if participant and participant.trip_id != proposal.trip_id:
             raise HTTPException(status_code=403, detail="Utente non valido per questo viaggio")
    else:
        # Modalità Sicura: usiamo l'account loggato
        participant = session.exec(select(User).where(User.trip_id == proposal.trip_id, User.account_id == current_account.id)).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Non sei un partecipante autorizzato o non trovato")

    # Gestione Voto
    existing = session.exec(select(Vote).where(Vote.proposal_id == proposal_id, Vote.user_id == participant.id)).first()
    if existing:
        existing.score = score
        session.add(existing)
    else:
        session.add(Vote(proposal_id=proposal_id, user_id=participant.id, score=score))
    session.commit()
    
    # Calcolo Consenso
    trip = session.get(Trip, proposal.trip_id)
    total_voters = session.exec(select(func.count(func.distinct(Vote.user_id))).join(Proposal).where(Proposal.trip_id == trip.id)).one()
    
    status = "VOTING"
    if total_voters >= trip.num_people:
        status = "CONSENSUS_REACHED"
        all_props = session.exec(select(Proposal).where(Proposal.trip_id == trip.id)).all()
        best_p = max(all_props, key=lambda p: session.exec(select(func.sum(Vote.score)).where(Vote.proposal_id == p.id)).one() or 0)
        
        if best_p:
            trip.winning_proposal_id = best_p.id
            trip.destination = best_p.destination
            trip.status = "BOOKED"
            session.add(trip)
            session.commit()
            
            # DISATTIVATO PER EVITARE TIMEOUT VERCEL (si fa al confirm_hotel)
            # generate_itinerary_content(trip, best_p, session)
            
    return {"status": "voted", "current_voters": total_voters, "required": trip.num_people, "trip_status": trip.status, "votes_count": total_voters}

@router.post("/{trip_id}/simulate-votes")
def simulate_votes(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Simula i voti mancanti (Demo)"""
    trip = session.get(Trip, trip_id)
    if not trip: raise HTTPException(status_code=404)
        
    proposals = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
    if not proposals: raise HTTPException(status_code=400, detail="Genera proposte prima")
        
    voted_user_ids = select(Vote.user_id).join(Proposal).where(Proposal.trip_id == trip.id)
    missing_voters = session.exec(select(User).where(User.trip_id == trip.id, User.id.not_in(voted_user_ids))).all()
    
    if not missing_voters:
        return {"status": "already_voted"}

    for u in missing_voters:
        session.add(Vote(proposal_id=proposals[0].id, user_id=u.id, score=1))
    session.commit()
    
    # Passiamo l'ID del primo utente mancante per simulare il voto finale
    return vote_proposal(proposals[0].id, 1, session=session, current_account=current_account, user_id=missing_voters[0].id)

@router.get("/{trip_id}/itinerary", response_model=List[ItineraryItem])
def get_itinerary(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    if not session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first():
         raise HTTPException(status_code=403, detail="Access denied")
    return session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()

@router.get("/{trip_id}/participants", response_model=List[User])
def get_participants(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    if not session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first():
         raise HTTPException(status_code=403, detail="Access denied")
    return session.exec(select(User).where(User.trip_id == trip_id)).all()

@router.post("/{trip_id}/chat")
def chat_with_ai(trip_id: int, req: ChatRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    """Chat AI che può modificare l'itinerario tramite comandi JSON strutturati"""
    participant = session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first()
    if not participant: raise HTTPException(status_code=403)
    
    trip = session.get(Trip, trip_id)
    itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)).all()
    itinerary_list = [item.model_dump() for item in itinerary]
    
    prompt = f"""
    Sei SplitPlan Assistant. Viaggio: {trip.name} ({trip.destination}).
    ITINERARIO ATTUALE: {json.dumps(itinerary_list)}
    CRONOLOGIA MESSAGGI: {json.dumps(req.history[-5:])}

    L'utente dice: "{req.message}"
    
    ISTRUZIONI:
    1. Rispondi cordialmente in Italiano.
    2. Se richiesto, genera comandi JSON per modificare l'itinerario nel campo "commands":
       - ADD: {{ "action": "ADD", "item": {{ "title": "..", "description": "..", "start_time": "ISO8601", "type": "ACTIVITY" }} }}
       - UPDATE: {{ "action": "UPDATE", "id": 123, "update": {{ "title": ".." }} }}
       - DELETE: {{ "action": "DELETE", "id": 123 }}

    RESTITUISCI SEMPRE UN JSON VALIDO: {{ "reply": "Testo", "commands": [] }}
    """
    
    if not ai_client: return {"reply": "AI non attiva.", "itinerary": itinerary}
    
    try:
        # Chiamata Google SDK per la Chat
        response = ai_client.models.generate_content(
            model=AI_MODEL,
            contents=prompt
        )
        content = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        reply = data.get("reply", "Ho aggiornato l'itinerario.")
        commands = data.get("commands", [])
        
        for cmd in commands:
            action = cmd.get("action")
            if action == "ADD":
                session.add(ItineraryItem(trip_id=trip_id, **cmd["item"]))
            elif action == "UPDATE":
                item_id = cmd.get("id")
                db_item = session.get(ItineraryItem, item_id)
                if db_item and db_item.trip_id == trip_id:
                    for key, value in cmd.get("update", {}).items():
                        setattr(db_item, key, value)
                    session.add(db_item)
            elif action == "DELETE":
                item_id = cmd.get("id")
                db_item = session.get(ItineraryItem, item_id)
                if db_item and db_item.trip_id == trip_id:
                    session.delete(db_item)
        
        session.commit()
        updated_itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()
        return {"reply": reply, "itinerary": updated_itinerary}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Errore nell'elaborazione AI della chat")
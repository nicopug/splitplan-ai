from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlmodel import Session, select, func
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
from ..models import Trip, TripBase, User, UserBase, Proposal, Vote, ItineraryItem, SQLModel, Account

load_dotenv()

# --- CONFIGURAZIONE GOOGLE GEMINI ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ai_client = None

# USIAMO LA VERSIONE STABILE 1.5 FLASH (Non Exp)
AI_MODEL = "gemini-1.5-flash"

if GOOGLE_API_KEY:
    print(f"[OK] System: Google Gemini Client initialized.")
    ai_client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    print(f"[WARNING] GOOGLE_API_KEY not found. Running in Mock Mode.")

router = APIRouter(prefix="/trips", tags=["trips"])

# --- MODELLI ---
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

# --- HELPER OSM ---
def get_coordinates(address: str):
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}
        headers = {'User-Agent': 'SplitPlanApp/1.0'} 
        response = requests.get(url, params=params, headers=headers, timeout=5)
        data = response.json()
        if data: return float(data[0]['lat']), float(data[0]['lon'])
    except: return None, None

def get_places_from_overpass(lat: float, lon: float, radius: int = 600):
    url = "https://overpass-api.de/api/interpreter"
    query = f"""[out:json][timeout:25];(node["amenity"~"restaurant|bar|cafe|pub"](around:{radius},{lat},{lon});way["amenity"~"restaurant|bar|cafe|pub"](around:{radius},{lat},{lon}););out tags 15;"""
    try:
        response = requests.post(url, data={'data': query}, timeout=10)
        data = response.json()
        places = []
        for element in data.get('elements', []):
            name = element.get('tags', {}).get('name')
            if name: places.append(name)
        return list(set(places))
    except: return []

# --- ENDPOINTS ---

@router.post("/", response_model=Dict)
def create_trip(trip_data: TripBase, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    db_trip = Trip.model_validate(trip_data)
    if trip_data.trip_type == "SOLO": db_trip.num_people = 1
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
    return {"trip_id": db_trip.id, "trip": db_trip, "organizer": organizer}

@router.get("/{trip_id}", response_model=Trip)
def read_trip(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    trip = session.get(Trip, trip_id)
    if not trip: raise HTTPException(status_code=404, detail="Trip not found")
    participant = session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first()
    if not participant: raise HTTPException(status_code=403, detail="Access denied")
    return trip

@router.post("/{trip_id}/generate-proposals", response_model=List[Proposal])
def generate_proposals(trip_id: int, prefs: PreferencesRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    participant = session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first()
    if not participant: raise HTTPException(status_code=403)

    trip = session.get(Trip, trip_id)
    if not trip: raise HTTPException(status_code=404)
        
    trip.budget_per_person = prefs.budget / prefs.num_people
    trip.num_people = prefs.num_people
    trip.start_date = prefs.start_date
    trip.end_date = prefs.end_date
    trip.departure_airport = prefs.departure_airport 
    trip.must_have = prefs.must_have
    trip.must_avoid = prefs.must_avoid
    session.add(trip)
    
    if prefs.participant_names:
        for name in prefs.participant_names:
            if not session.exec(select(User).where(User.trip_id == trip_id, User.name == name)).first():
                session.add(User(name=name, trip_id=trip.id))
    session.commit()

    if ai_client:
        try:
            prompt = f"""
            Act as a Travel Agent. 
            TASK 1: Find 3-letter IATA code for "{prefs.departure_airport}".
            TASK 2: Generate 3 proposals for {prefs.destination}.
            Budget: {prefs.budget}, People: {prefs.num_people}, Dates: {prefs.start_date} to {prefs.end_date}.
            Must: {prefs.must_have}. Avoid: {prefs.must_avoid}. Vibe: {prefs.vibe}.
            
            RETURN JSON:
            {{
                "departure_iata_normalized": "XXX",
                "proposals": [
                    {{"destination": "City, Country", "destination_iata": "XXX", "description": "...", "price_estimate": 100, "image_search_term": "..."}}
                ]
            }}
            ITALIAN.
            """
            
            response = ai_client.models.generate_content(model=AI_MODEL, contents=prompt)
            data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            
            if data.get("departure_iata_normalized"):
                trip.departure_airport = data["departure_iata_normalized"].upper()
                session.add(trip)

            existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
            for e in existing: session.delete(e)
            
            for p in data.get("proposals", []):
                img = f"https://image.pollinations.ai/prompt/{p.get('image_search_term', 'travel').replace(' ', '%20')}%20scenic?width=800&height=600&nologo=true"
                session.add(Proposal(trip_id=trip_id, destination=p["destination"], destination_iata=p.get("destination_iata"), description=p["description"], price_estimate=p["price_estimate"], image_url=img))
            
            trip.status = "VOTING"
            session.commit()
            return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

        except Exception as e:
            print(f"[AI Error] {e}")

    # Fallback
    iata_map = {"roma": "ROM", "milano": "MIL", "napoli": "NAP"}
    trip.departure_airport = iata_map.get(prefs.departure_airport.lower(), prefs.departure_airport[:3].upper())
    trip.status = "VOTING"
    
    mock_ops = [Proposal(trip_id=trip_id, destination=f"{prefs.destination} Classic", destination_iata="JFK", price_estimate=prefs.budget, description="Opzione standard.", image_url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800")]
    existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
    for e in existing: session.delete(e)
    for o in mock_ops: session.add(o)
    session.commit()
    return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

def generate_itinerary_content(trip: Trip, proposal: Proposal, session: Session):
    print(f"Generating itinerary for Trip {trip.id}")
    if ai_client:
        try:
            d1 = datetime.strptime(trip.start_date, "%Y-%m-%d")
            d2 = datetime.strptime(trip.end_date, "%Y-%m-%d")
            num_days = abs((d2 - d1).days) + 1
            
            hotel_lat, hotel_lon = get_coordinates(f"{trip.accommodation}, {proposal.destination}")
            places = get_places_from_overpass(hotel_lat, hotel_lon) if hotel_lat else []
            places_text = f"USE REAL PLACES: {', '.join(places[:12])}" if places else ""

            prompt = f"""
            Create {num_days}-day itinerary for {proposal.destination}. Hotel: {trip.accommodation}.
            {places_text}
            Dates: {trip.start_date} to {trip.end_date}.
            OUTPUT JSON ARRAY: [{{ "title": "...", "description": "...", "start_time": "ISO", "end_time": "ISO", "type": "ACTIVITY" }}]
            ITALIAN.
            """
            
            response = ai_client.models.generate_content(model=AI_MODEL, contents=prompt)
            items = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            
            session.exec(SQLModel.metadata.tables['itineraryitem'].delete().where(SQLModel.metadata.tables['itineraryitem'].c.trip_id == trip.id))
            for i in items:
                session.add(ItineraryItem(trip_id=trip.id, **i))
            session.commit()
            return
        except Exception as e:
            print(f"[Itinerary Error] {e}")

    # Fallback
    mock_it = [ItineraryItem(trip_id=trip.id, title="Arrivo", description="Check-in", start_time=f"{trip.start_date}T14:00:00", type="CHECKIN")]
    for i in mock_it: session.add(i)
    session.commit()

@router.post("/{trip_id}/confirm-hotel")
def confirm_hotel(trip_id: int, hotel_data: HotelConfirmationRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    trip = session.get(Trip, trip_id)
    if not trip: raise HTTPException(status_code=404)
    
    trip.accommodation = hotel_data.hotel_name
    trip.accommodation_location = hotel_data.hotel_address
    trip.arrival_time = hotel_data.arrival_time
    trip.return_time = hotel_data.return_time
    session.add(trip)
    session.commit()
    
    proposal = session.get(Proposal, trip.winning_proposal_id)
    generate_itinerary_content(trip, proposal, session) # QUI È ATTIVO
    return {"status": "success"}

@router.post("/vote/{proposal_id}")
def vote_proposal(proposal_id: int, score: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    proposal = session.get(Proposal, proposal_id)
    if not proposal: raise HTTPException(status_code=404)
    
    participant = session.exec(select(User).where(User.trip_id == proposal.trip_id, User.account_id == current_account.id)).first()
    if not participant: raise HTTPException(status_code=403)

    existing = session.exec(select(Vote).where(Vote.proposal_id == proposal_id, Vote.user_id == participant.id)).first()
    if existing:
        existing.score = score
        session.add(existing)
    else:
        session.add(Vote(proposal_id=proposal_id, user_id=participant.id, score=score))
    session.commit()
    
    trip = session.get(Trip, proposal.trip_id)
    total_voters = session.exec(select(func.count(func.distinct(Vote.user_id))).join(Proposal).where(Proposal.trip_id == trip.id)).one()
    
    status = "VOTING"
    if total_voters >= trip.num_people:
        status = "CONSENSUS_REACHED"
        all_props = session.exec(select(Proposal).where(Proposal.trip_id == trip.id)).all()
        best_p = max(all_props, key=lambda p: session.exec(select(func.sum(Vote.score)).where(Vote.proposal_id == p.id)).one() or 0)
        
        trip.winning_proposal_id = best_p.id
        trip.destination = best_p.destination
        trip.status = "BOOKED"
        session.add(trip)
        session.commit()
        # generate_itinerary_content(trip, best_p, session) # DISATTIVATO PER EVITARE TIMEOUT
            
    return {"status": "voted", "current_voters": total_voters, "required": trip.num_people, "trip_status": trip.status}

@router.post("/{trip_id}/simulate-votes")
def simulate_votes(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    trip = session.get(Trip, trip_id)
    proposals = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
    if not proposals: return {"error": "No proposals"}
    
    voted_ids = select(Vote.user_id).join(Proposal).where(Proposal.trip_id == trip.id)
    missing = session.exec(select(User).where(User.trip_id == trip.id, User.id.not_in(voted_ids))).all()
    
    for u in missing: session.add(Vote(proposal_id=proposals[0].id, user_id=u.id, score=1))
    session.commit()
    return vote_proposal(proposals[0].id, 1, session, current_account)

@router.get("/{trip_id}/itinerary", response_model=List[ItineraryItem])
def get_itinerary(trip_id: int, session: Session = Depends(get_session)):
    return session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()

@router.get("/{trip_id}/participants", response_model=List[User])
def get_participants(trip_id: int, session: Session = Depends(get_session)):
    return session.exec(select(User).where(User.trip_id == trip_id)).all()

@router.post("/{trip_id}/chat")
def chat_with_ai(trip_id: int, req: ChatRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    trip = session.get(Trip, trip_id)
    itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)).all()
    itinerary_list = [i.model_dump() for i in itinerary]
    
    prompt = f"""
    Sei SplitPlan Assistant. Viaggio: {trip.name} ({trip.destination}).
    ITINERARIO: {json.dumps(itinerary_list)}
    CRONOLOGIA: {json.dumps(req.history[-5:])}
    UTENTE: "{req.message}"
    
    MODIFICA ITINERARIO (opzionale) in 'commands':
    - ADD: {{ "action": "ADD", "item": {{ "title": "..", "description": "..", "start_time": "ISO", "type": "ACTIVITY" }} }}
    - DELETE: {{ "action": "DELETE", "id": 123 }}
    
    RISPONDI JSON: {{ "reply": "...", "commands": [] }}
    """
    
    if not ai_client: return {"reply": "AI non attiva.", "itinerary": itinerary}
    
    try:
        response = ai_client.models.generate_content(model=AI_MODEL, contents=prompt)
        data = json.loads(response.text.replace("```json", "").replace("```", "").strip())
        
        for cmd in data.get("commands", []):
            if cmd["action"] == "ADD": session.add(ItineraryItem(trip_id=trip_id, **cmd["item"]))
            elif cmd["action"] == "DELETE": 
                item = session.get(ItineraryItem, cmd["id"])
                if item: session.delete(item)
        
        session.commit()
        updated = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()
        return {"reply": data["reply"], "itinerary": updated}
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Errore chat")
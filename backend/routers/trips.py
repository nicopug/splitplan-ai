from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select, func
from typing import List, Dict, Optional
import os
import json
from datetime import datetime
# NUOVO SDK
from google import genai
from dotenv import load_dotenv

from ..database import get_session
from ..auth import get_current_user
from ..models import Trip, TripBase, User, UserBase, Proposal, Vote, ItineraryItem, SQLModel, Account

# Configure Google Gen AI Client
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ai_client = None

if GOOGLE_API_KEY:
    print(f"[OK] Loaded Google API Key: {GOOGLE_API_KEY[:5]}***")
    # Inizializzazione nuovo Client
    ai_client = genai.Client(api_key=GOOGLE_API_KEY)
else:
    print(f"[ERROR] GOOGLE_API_KEY not found. CWD: {os.getcwd()}")

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

# --- ENDPOINTS ---

@router.post("/", response_model=Dict)
def create_trip(trip_data: TripBase, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
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
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    participant = session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return trip

@router.post("/{trip_id}/generate-proposals", response_model=List[Proposal])
def generate_proposals(trip_id: int, prefs: PreferencesRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    # Verify access
    participant = session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first()
    if not participant:
        raise HTTPException(status_code=403, detail="Access denied")

    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip.budget_per_person = prefs.budget / prefs.num_people
    trip.num_people = prefs.num_people
    trip.start_date = prefs.start_date
    trip.end_date = prefs.end_date
    trip.departure_airport = prefs.departure_airport 
    trip.must_have = prefs.must_have
    trip.must_avoid = prefs.must_avoid
    session.add(trip)
    session.commit()
    
    current_participants_count = session.exec(select(func.count(User.id)).where(User.trip_id == trip_id)).one()
    
    if prefs.participant_names:
        for name in prefs.participant_names:
            exists = session.exec(select(User).where(User.trip_id == trip_id, User.name == name)).first()
            if not exists:
                new_user = User(name=name, trip_id=trip.id, is_organizer=False)
                session.add(new_user)
        session.commit()
    
    if ai_client:
        try:
            # --- MODIFICA AI: Chiediamo di normalizzare anche l'aeroporto di partenza ---
            prompt = f"""
            Act as a Travel Agent. 
            
            TASK 1: Analyze the Departure City: "{prefs.departure_airport}".
            Identify the general 3-letter IATA code for this city (e.g., if "Roma" -> "ROM", if "Milano" -> "MIL", if "London" -> "LON").
            
            TASK 2: Generate 3 distinct travel proposals for a {trip.trip_type} trip.
            Preferences:
            - Destination/Region: {prefs.destination}
            - Departure Airport: {prefs.departure_airport} (Use the IATA code identified in TASK 1 for logistics)
            - Budget Total: {prefs.budget} EUR
            - People: {prefs.num_people}
            - Dates: {prefs.start_date} to {prefs.end_date}
            - Must Include: {prefs.must_have}
            - Must Avoid: {prefs.must_avoid}
            - Vibe: {prefs.vibe}

            RETURN ONLY A VALID JSON OBJECT with this exact structure:
            {{
                "departure_iata_normalized": "XXX", 
                "proposals": [
                    {{
                        "destination": "City, Country",
                        "destination_iata": "XXX",
                        "description": "2 sentences max, persuasive",
                        "price_estimate": 1000,
                        "image_search_term": "keyword"
                    }},
                    ... (2 more proposals)
                ]
            }}

            THE FINAL RESPONSE MUST BE IN ITALIAN (except keys).
            """
            
            response = ai_client.models.generate_content(
                model='gemini-2.0-flash-exp', 
                contents=prompt
            )
            
            json_str = response.text.replace("```json", "").replace("```", "").strip()
            full_data = json.loads(json_str)
            
            # --- SALVATAGGIO CORREZIONE IATA ---
            clean_departure_iata = full_data.get("departure_iata_normalized")
            if clean_departure_iata and len(clean_departure_iata) == 3:
                trip.departure_airport = clean_departure_iata.upper()
                session.add(trip)
                session.commit() 
            
            proposals_data = full_data.get("proposals", [])
            
            options = []
            for p in proposals_data:
                raw_term = p.get("image_search_term") or p.get("destination", "travel")
                search_term = raw_term.replace(" ", "%20")
                img_url = f"https://image.pollinations.ai/prompt/{search_term}%20travel%20photography%20scenic%204k?width=800&height=600&nologo=true"
                
                prop = Proposal(
                    trip_id=trip_id,
                    destination=p["destination"],
                    destination_iata=p.get("destination_iata"),
                    description=p["description"],
                    price_estimate=p["price_estimate"],
                    image_url=img_url 
                )
                options.append(prop)
                
            existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
            for e in existing:
                session.delete(e)
            
            for o in options:
                session.add(o)
            
            trip.status = "VOTING"
            session.add(trip)
            session.commit()
            
            return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

        except Exception as e:
            print(f"AI Generation Failed: {e}. Falling back to Mock.")
    
    # Fallback Mock Logic
    dest_input = prefs.destination.lower()
    options = []
    
    if "giappone" in dest_input:
         options = [
            Proposal(trip_id=trip_id, destination="Kyoto, Giappone", destination_iata="KIX", price_estimate=prefs.budget, description=f"Focus su {prefs.vibe}. Templi e tradizione.", image_url="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e"),
            Proposal(trip_id=trip_id, destination="Tokyo, Giappone", destination_iata="HND", price_estimate=prefs.budget * 1.1, description="Metropoli futuristica e cibo ovunque.", image_url="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf"),
            Proposal(trip_id=trip_id, destination="Osaka, Giappone", destination_iata="KIX", price_estimate=prefs.budget * 0.9, description="Street food e vita notturna.", image_url="https://images.unsplash.com/photo-1590559899731-a382839e5549")
        ]
    elif "italia" in dest_input:
         options = [
            Proposal(trip_id=trip_id, destination="Costiera Amalfitana", destination_iata="NAP", price_estimate=prefs.budget * 1.2, description="Dolce vita e mare cristallino.", image_url="https://images.unsplash.com/photo-1533904353181-25210c364a1d"),
            Proposal(trip_id=trip_id, destination="Dolomiti", destination_iata="VRN", price_estimate=prefs.budget * 0.8, description="Natura incontaminata e trekking.", image_url="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b"),
            Proposal(trip_id=trip_id, destination="Sicilia Tour", destination_iata="PMO", price_estimate=prefs.budget, description="Cultura, storia e cibo incredibile.", image_url="https://images.unsplash.com/photo-1528659587428-1b209b699949")
        ]
    else:
        options = [
            Proposal(trip_id=trip_id, destination=f"{prefs.destination} Smart", destination_iata="JFK", price_estimate=prefs.budget, description=f"Piano bilanciato per {prefs.vibe}.", image_url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"),
            Proposal(trip_id=trip_id, destination=f"{prefs.destination} Budget", destination_iata="LHR", price_estimate=prefs.budget * 0.8, description="Opzione Low Cost ma divertente.", image_url="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"),
            Proposal(trip_id=trip_id, destination=f"{prefs.destination} Luxury", destination_iata="CDG", price_estimate=prefs.budget * 1.2, description="Esperienza Premium.", image_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c")
        ]

    existing = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
    for e in existing:
        session.delete(e)

    for p in options:
        session.add(p)
    
    trip.status = "VOTING"
    session.add(trip)
    session.commit()
    
    return session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()

def generate_itinerary_content(trip: Trip, proposal: Proposal, session: Session):
    """Helper to generate itinerary items upon booking"""
    print(f"Generating itinerary for {trip.name} to {proposal.destination}")
    
    if ai_client:
        try:
            try:
                d1 = datetime.strptime(trip.start_date, "%Y-%m-%d")
                d2 = datetime.strptime(trip.end_date, "%Y-%m-%d")
                num_days = abs((d2 - d1).days) + 1
            except Exception:
                num_days = 3 
            
            prompt = f"""
            Act as a Travel Assistant. Create a {num_days}-day simple itinerary for a trip to {proposal.destination}.
            The layout is based on this hotel: {trip.accommodation} ({trip.accommodation_location}).
            
            Key Timings:
            - Start Date: {trip.start_date}
            - End Date: {trip.end_date}
            - First Day Arrival: {trip.arrival_time}
            - Last Day Return Flight: {trip.return_time}
            
            Rules:
            1. Plan exactly {num_days} days.
            2. First day: Schedule activities starting from {trip.arrival_time}. If after 18:00, only dinner.
            3. Final day ({trip.end_date}): MUST include checkout from the hotel.
            4. Final day: Ensure all activities end at least 3 hours before the return flight ({trip.return_time}) for airport logistics.
            5. ONLY the final day should have checkout and return flight logistics.
            
            Preferences to strictly respect:
            - Must Include: {trip.must_have}
            - Must Avoid: {trip.must_avoid}
            
            Optimize the route starting from the hotel.
            
            Start Date: {trip.start_date}
            
            Return ONLY valid JSON array of objects. Keys:
            "title" (User friendly title, e.g. "Visit Colosseum"),
            "description" (short detail),
            "start_time" (ISO 8601 string, e.g. "2025-10-10T10:00:00"),
            "end_time" (ISO 8601 string, e.g. "2025-10-10T12:00:00"),
            "type" (ACTIVITY, FOOD, CHECKIN)
            THE FINAL RESPONSE MUST BE IN ITALIAN.
            """
            response = ai_client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt
            )
            json_str = response.text.replace("```json", "").replace("```", "").strip()
            items_data = json.loads(json_str)
            
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
            print(f"Itinerary Gen Failed: {e}")
    
    
    # Fallback Mock Itinerary
    mock_items = [
        ItineraryItem(trip_id=trip.id, title="Arrivo & Check-in", description=f"Check-in presso {trip.accommodation}", start_time=f"{trip.start_date}T14:00:00", type="CHECKIN"),
        ItineraryItem(trip_id=trip.id, title="Cena di Benvenuto", description="Ristorante tipico vicino all'hotel", start_time=f"{trip.start_date}T20:00:00", type="FOOD"),
        ItineraryItem(trip_id=trip.id, title="Tour Guidato", description="Visita ai principali monumenti", start_time=f"{trip.start_date}T10:00:00", type="ACTIVITY"),
    ]
    for i in mock_items:
        session.add(i)
    session.commit()

@router.post("/{trip_id}/confirm-hotel")
def confirm_hotel(trip_id: int, hotel_data: HotelConfirmationRequest, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    if not session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first():
         raise HTTPException(status_code=403, detail="Access denied")
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
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
    
    return {"status": "Hotel Confirmed & Itinerary Generated"}

@router.post("/vote/{proposal_id}")
def vote_proposal(proposal_id: int, user_id: int, score: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_user.account_id != current_account.id:
        raise HTTPException(status_code=403, detail="Unauthorized vote attempt")

    vote = Vote(proposal_id=proposal_id, user_id=user_id, score=score)
    session.add(vote)
    session.commit()
    
    proposal = session.get(Proposal, proposal_id)
    trip = session.get(Trip, proposal.trip_id)
    
    statement = select(func.count(func.distinct(Vote.user_id))).join(Proposal).where(Proposal.trip_id == trip.id)
    total_votes = session.exec(statement).one()
    
    status = "VOTING"
    if total_votes >= trip.num_people:
        status = "CONSENSUS_REACHED"
        proposals = session.exec(select(Proposal).where(Proposal.trip_id == trip.id)).all()
        best_p = None
        max_s = -999999
        for p in proposals:
            total_s = session.exec(select(func.sum(Vote.score)).where(Vote.proposal_id == p.id)).one() or 0
            if total_s > max_s:
                max_s = total_s
                best_p = p
        
        if best_p:
            trip.winning_proposal_id = best_p.id
            trip.destination_iata = best_p.destination_iata
            trip.destination = best_p.destination
            trip.status = "BOOKED"
            session.add(trip)
            session.commit()
            session.refresh(trip)
            generate_itinerary_content(trip, best_p, session)
        
    return {"status": "voted", "trip_status": status, "votes_count": total_votes, "required": trip.num_people}

@router.post("/{trip_id}/simulate-votes")
def simulate_votes(trip_id: int, session: Session = Depends(get_session), current_account: Account = Depends(get_current_user)):
    # Verify access
    if not session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first():
         raise HTTPException(status_code=403, detail="Access denied")

    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    statement = select(func.count(func.distinct(Vote.user_id))).join(Proposal).where(Proposal.trip_id == trip.id)
    current_votes = session.exec(statement).one()
    needed = trip.num_people - current_votes
    
    if needed <= 0:
        return {"message": "Already consensus"}
        
    proposals = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
    if not proposals:
        raise HTTPException(status_code=400, detail="No proposals")
        
    target_proposal = proposals[0]
    
    voted_subquery = select(Vote.user_id).join(Proposal).where(Proposal.trip_id == trip.id)
    missing_voters = session.exec(select(User).where(User.trip_id == trip.id, User.id.not_in(voted_subquery))).all()
    
    votes_to_cast = min(needed, len(missing_voters))
    
    if votes_to_cast < needed:
        extra_needed = needed - votes_to_cast
        start_idx = current_votes + 1
        for i in range(extra_needed):
            mock_user = User(name=f"Partecipante {start_idx + i}", trip_id=trip.id)
            session.add(mock_user)
            session.commit()
            session.refresh(mock_user)
            missing_voters.append(mock_user)
    
    for user in missing_voters[:needed]:
        vote = Vote(proposal_id=target_proposal.id, user_id=user.id, score=1)
        session.add(vote)
    session.commit()
    
    proposals = session.exec(select(Proposal).where(Proposal.trip_id == trip_id)).all()
    best_p = None
    max_s = -999999
    for p in proposals:
        total_s = session.exec(select(func.sum(Vote.score)).where(Vote.proposal_id == p.id)).one() or 0
        if total_s > max_s:
            max_s = total_s
            best_p = p
            
    if best_p:
        trip.winning_proposal_id = best_p.id
        trip.destination_iata = best_p.destination_iata 
        trip.destination = best_p.destination
        trip.status = "BOOKED"
        session.add(trip)
        session.commit()
        session.refresh(trip)
        generate_itinerary_content(trip, best_p, session)
    
    return {"status": "simulated", "added_votes": needed}

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
    if not session.exec(select(User).where(User.trip_id == trip_id, User.account_id == current_account.id)).first():
         raise HTTPException(status_code=403, detail="Access denied")
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)).all()
    itinerary_list = [item.model_dump() for item in itinerary]
    
    history_text = ""
    for msg in req.history[-10:]:
        role = "Utente" if msg.get("role") == "user" else "Assistente"
        history_text += f"{role}: {msg.get('text', '')}\n"
    
    prompt = f"""
    Sei un assistente AI di viaggio per SplitPlan. Il tuo compito è aiutare l'utente a gestire il suo itinerario tramite chat.
    Ecco il viaggio attuale: {trip.name} ({trip.destination}).
    Itinerario attuale (JSON): {json.dumps(itinerary_list)}
    
    CRONOLOGIA DELLA CONVERSAZIONE:
    {history_text}
    
    L'utente dice ora: "{req.message}"
    
    IMPORTANTE: Usa la cronologia sopra per capire il contesto. Se l'utente fa riferimento a qualcosa detto prima (es: "fai quella modifica", "sì", "no"), DEVI capire a cosa si riferisce dalla cronologia.
    
    Rispondi in modo conversazionale e, se richiesto, genera azioni per modificare l'itinerario.
    Restituisci SEMPRE un JSON valido con questa struttura:
    {{
        "reply": "Tua risposta all'utente in italiano",
        "commands": [
            {{ "action": "ADD", "item": {{ "title": "...", "description": "...", "start_time": "...", "type": "ACTIVITY/FOOD/CHECKIN" }} }},
            {{ "action": "UPDATE", "id": 123, "update": {{ "title": "..." }} }},
            {{ "action": "DELETE", "id": 123 }}
        ]
    }}
    
    Regole:
    1. Se l'utente vuole aggiungere qualcosa, usa ADD.
    2. Se l'utente vuole cambiare orario o dettagli, usa UPDATE con l'ID corretto.
    3. Se l'utente vuole rimuovere qualcosa, usa DELETE con l'ID corretto.
    4. Se l'utente fa solo una domanda, "commands" deve essere un array vuoto [].
    5. I formati data devono essere ISO 8601 (es: "2025-10-10T15:00:00").
    6. Non aggiungere markdown o spiegazioni fuori dal JSON.
    """
    
    try:
        if ai_client:
            response = ai_client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt
            )
            content = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
            
            reply = data.get("reply", "Ecco cosa ho fatto per te.")
            commands = data.get("commands", [])
            
            for cmd in commands:
                action = cmd.get("action")
                if action == "ADD":
                    item_data = cmd.get("item")
                    new_item = ItineraryItem(
                        trip_id=trip_id,
                        title=item_data["title"],
                        description=item_data.get("description"),
                        start_time=item_data["start_time"],
                        type=item_data.get("type", "ACTIVITY")
                    )
                    session.add(new_item)
                elif action == "UPDATE":
                    item_id = cmd.get("id")
                    update_data = cmd.get("update")
                    db_item = session.get(ItineraryItem, item_id)
                    if db_item and db_item.trip_id == trip_id:
                        for key, value in update_data.items():
                            setattr(db_item, key, value)
                        session.add(db_item)
                elif action == "DELETE":
                    item_id = cmd.get("id")
                    db_item = session.get(ItineraryItem, item_id)
                    if db_item and db_item.trip_id == trip_id:
                        session.delete(db_item)
            
            session.commit()
            
            updated_itinerary = session.exec(select(ItineraryItem).where(ItineraryItem.trip_id == trip_id).order_by(ItineraryItem.start_time)).all()
            return {
                "reply": reply,
                "itinerary": updated_itinerary
            }
        else:
            return {"reply": "AI non configurata.", "itinerary": []}
            
    except Exception as e:
        print(f"Chat AI Error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore Chat AI: {str(e)}")
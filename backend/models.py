from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    name: str
    surname: str
    is_verified: bool = False
    is_subscribed: bool = False
    reset_in_progress: bool = False
    google_calendar_token: Optional[str] = Field(default=None) # JSON dump of tokens
    is_calendar_connected: bool = False


class TripBase(SQLModel):
    name: str
    destination: str = "" 
    trip_type: str 
    trip_intent: str = "LEISURE"  # "LEISURE" or "BUSINESS"
    budget: float = 0.0
    start_date: str = ""
    end_date: str = ""
    description: Optional[str] = None
    
    num_people: int = 1
    budget_per_person: float = 0.0
    must_have: Optional[str] = ""
    must_avoid: Optional[str] = ""
    vibe: Optional[str] = ""  # Aggiunto per coerenza con l'AI
    
    accommodation: Optional[str] = None
    accommodation_location: Optional[str] = None
    hotel_latitude: Optional[float] = None
    hotel_longitude: Optional[float] = None
    transport_cost: Optional[float] = 0.0
    hotel_cost: Optional[float] = 0.0
    arrival_time: Optional[str] = None
    return_time: Optional[str] = None
    
    # Orario di lavoro per viaggi BUSINESS
    work_start_time: Optional[str] = "09:00"
    work_end_time: Optional[str] = "18:00"
    work_days: Optional[str] = "Monday,Tuesday,Wednesday,Thursday,Friday" # Comma separated days
    
    status: str = "PLANNING"
    winning_proposal_id: Optional[int] = None
    destination_iata: Optional[str] = None
    departure_airport: Optional[str] = None 
    departure_city: Optional[str] = None
    real_destination: Optional[str] = ""
    share_token: Optional[str] = Field(default=None, index=True)
    transport_mode: str = "FLIGHT"

class Trip(TripBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    participants: List["Participant"] = Relationship(back_populates="trip")
    proposals: List["Proposal"] = Relationship(back_populates="trip")
    itinerary_items: List["ItineraryItem"] = Relationship(back_populates="trip")
    expenses: List["Expense"] = Relationship(back_populates="trip")
    photos: List["Photo"] = Relationship(back_populates="trip")

class ParticipantBase(SQLModel):
    name: str
    is_organizer: bool = False
    is_active: bool = True

class Participant(ParticipantBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: Optional[int] = Field(default=None, foreign_key="trip.id")
    account_id: Optional[int] = Field(default=None, foreign_key="account.id")
    
    trip: Optional[Trip] = Relationship(back_populates="participants")
    votes: List["Vote"] = Relationship(back_populates="participant")
    expenses: List["Expense"] = Relationship(back_populates="payer")

class Proposal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    destination: str
    destination_iata: Optional[str] = None
    description: str
    price_estimate: float
    image_url: str
    real_destination: Optional[str] = ""
    
    trip: Optional[Trip] = Relationship(back_populates="proposals")
    votes: List["Vote"] = Relationship(back_populates="proposal")

class Vote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    proposal_id: int = Field(foreign_key="proposal.id")
    user_id: int = Field(foreign_key="participant.id")
    score: int = Field(default=1)  # <--- ECCO IL CAMPO MANCANTE CHE CAUSAVA L'ERRORE!
    
    proposal: Optional[Proposal] = Relationship(back_populates="votes")
    participant: Optional[Participant] = Relationship(back_populates="votes")

class ItineraryItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    title: str
    description: Optional[str] = None
    start_time: str 
    end_time: Optional[str] = None
    type: str 
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    trip: Optional[Trip] = Relationship(back_populates="itinerary_items")

class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    payer_id: int = Field(foreign_key="participant.id")
    description: str
    amount: float # Importo in EUR (valuta base per il bilancio)
    original_amount: Optional[float] = None # Importo inserito (es. Yen)
    currency: str = "EUR" # Valuta originale
    exchange_rate: Optional[float] = 1.0 # Tasso applicato
    date: str
    category: str = "General"
    
    trip: Optional[Trip] = Relationship(back_populates="expenses")
    payer: Optional[Participant] = Relationship(back_populates="expenses")

class Photo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    url: str
    caption: Optional[str] = None
    
    trip: Optional[Trip] = Relationship(back_populates="photos")
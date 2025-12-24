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

class TripBase(SQLModel):
    name: str
    destination: str = "" 
    trip_type: str 
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
    flight_cost: Optional[float] = 0.0
    hotel_cost: Optional[float] = 0.0
    arrival_time: Optional[str] = None
    return_time: Optional[str] = None
    
    status: str = "PLANNING"
    winning_proposal_id: Optional[int] = None
    destination_iata: Optional[str] = None
    departure_airport: Optional[str] = None 

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
    
    trip: Optional[Trip] = Relationship(back_populates="itinerary_items")

class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    payer_id: int = Field(foreign_key="participant.id")
    description: str
    amount: float
    date: str
    
    trip: Optional[Trip] = Relationship(back_populates="expenses")
    payer: Optional[Participant] = Relationship(back_populates="expenses")

class Photo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    url: str
    caption: Optional[str] = None
    
    trip: Optional[Trip] = Relationship(back_populates="photos")
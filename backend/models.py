from typing import List, Optional, Dict
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
import json

# --- Trip & Consensus ---

class TripBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    trip_type: str = Field(default="GROUP") # "GROUP" or "SOLO"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget_per_person: Optional[float] = None
    destination: Optional[str] = None # Final decision
    destination_iata: Optional[str] = None # IATA Code for flights (e.g. JFK)
    departure_airport: Optional[str] = None # Added for flight search
    status: str = Field(default="PLANNING") # PLANNING, VOTING, BOOKED, COMPLETED
    accommodation: Optional[str] = None # Hotel Name / Airbnb Title
    accommodation_location: Optional[str] = None # Address or Area
    flight_cost: Optional[float] = None # Total or per person flight cost
    hotel_cost: Optional[float] = None # Total hotel cost for the trip
    arrival_time: Optional[str] = None # ISO datetime or time string
    return_time: Optional[str] = None # Return flight departure time
    num_people: int = Field(default=1) # Expected number of voters
    must_have: Optional[str] = None
    must_avoid: Optional[str] = None
    winning_proposal_id: Optional[int] = None # ID of the chosen proposal

class Trip(TripBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    participants: List["User"] = Relationship(back_populates="trip")
    proposals: List["Proposal"] = Relationship(back_populates="trip")
    itinerary_items: List["ItineraryItem"] = Relationship(back_populates="trip")
    expenses: List["Expense"] = Relationship(back_populates="trip")
    photos: List["Photo"] = Relationship(back_populates="trip")

class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    name: str
    surname: str
    is_verified: bool = Field(default=False)
    is_subscribed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserBase(SQLModel):
    name: str
    email: Optional[str] = None # Optional for quick onboard
    is_organizer: bool = False
    preferences: Optional[str] = Field(default="{}") # JSON string: { "must_do": [], "must_avoid": [] }

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: Optional[int] = Field(default=None, foreign_key="trip.id")
    account_id: Optional[int] = Field(default=None, foreign_key="account.id")
    
    trip: Optional[Trip] = Relationship(back_populates="participants")
    account: Optional[Account] = Relationship()
    votes: List["Vote"] = Relationship(back_populates="user")
    expenses_paid: List["Expense"] = Relationship(back_populates="payer")

# --- Consensus Engine ---

class ProposalBase(SQLModel):
    destination: str
    destination_iata: Optional[str] = None
    description: str
    price_estimate: float
    image_url: Optional[str] = None

class Proposal(ProposalBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    
    trip: Trip = Relationship(back_populates="proposals")
    votes: List["Vote"] = Relationship(back_populates="proposal")

class Vote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    proposal_id: int = Field(foreign_key="proposal.id")
    score: int = Field(default=1) # 1 = Like, 0 = Neutral (or use 1-5 scale)

    user: User = Relationship(back_populates="votes")
    proposal: Proposal = Relationship(back_populates="votes")

# --- Itinerary ---

class ItineraryItemBase(SQLModel):
    title: str
    description: Optional[str] = None
    start_time: str # ISO format
    end_time: Optional[str] = None
    location: Optional[str] = None
    type: str = "ACTIVITY" # FLIGHT, HOTEL, ACTIVITY, FOOD
    cost_estimate: float = 0.0
    lat: Optional[float] = None
    lng: Optional[float] = None

class ItineraryItem(ItineraryItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    
    trip: Trip = Relationship(back_populates="itinerary_items")

# --- Finance (CFO) ---

class ExpenseBase(SQLModel):
    title: str
    amount: float
    date: str = Field(default_factory=lambda: datetime.now().isoformat())
    category: Optional[str] = "General"
    split_details: Optional[str] = Field(default="{}") # JSON: { userId: amount }

class Expense(ExpenseBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    payer_id: int = Field(foreign_key="user.id")
    
    trip: Trip = Relationship(back_populates="expenses")
    payer: User = Relationship(back_populates="expenses_paid")

# --- Photos ---

class PhotoBase(SQLModel):
    url: str
    caption: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class Photo(PhotoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_id: int = Field(foreign_key="trip.id")
    
    trip: Trip = Relationship(back_populates="photos")

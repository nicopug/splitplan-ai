import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlmodel import Session, select
from backend.database import engine
from backend.models import Trip

with Session(engine) as session:
    trip = session.get(Trip, 235)
    if trip:
        print(f"Trip ID: {trip.id}")
        print(f"Status: {trip.status}")
        print(f"Type: {trip.trip_type}")
        print(f"Intent: {trip.trip_intent}")
    else:
        print("Trip 235 not found")

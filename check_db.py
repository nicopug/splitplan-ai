import os
from sqlmodel import Session, create_engine, select
import sys

# Add backend to path to import models properly
sys.path.append(os.path.abspath('.'))

from backend.models import Participant, Trip

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    # Try .env if not in environment
    from dotenv import load_dotenv
    load_dotenv('.env')
    db_url = os.getenv('DATABASE_URL')

engine = create_engine(db_url)
with Session(engine) as s:
    trips = s.exec(select(Trip)).all()
    participants = s.exec(select(Participant)).all()
    print("--- TRIPS ---")
    for t in trips:
        print(f"ID: {t.id}, Name: {t.name}, Status: {t.status}, Real Dest: {t.real_destination}, Accomm: {t.accommodation}")
    print("\n--- PARTICIPANTS ---")
    for p in participants:
        print(f"TripID: {p.trip_id}, Name: {p.name}, Organizer: {p.is_organizer}, AccountID: {p.account_id}")

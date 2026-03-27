import sys
import os
# Aggiungo la cartella corrente al path per trovare database e models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session
from database import engine
from sqlalchemy import text

def migrate():
    with Session(engine) as session:
        try:
            print("Running migration: ADD COLUMN office_address to trip")
            session.execute(text("ALTER TABLE trip ADD COLUMN IF NOT EXISTS office_address VARCHAR;"))
            session.commit()
            print("Migration successful.")
        except Exception as e:
            session.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()

from sqlmodel import Session, SQLModel
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

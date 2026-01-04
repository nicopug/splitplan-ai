from sqlmodel import SQLModel, create_engine, Session
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment (Supabase PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Use PostgreSQL (Supabase)
    print(f"[OK] Using PostgreSQL: {DATABASE_URL[:30]}...")
    # Add common pooling options for serverless
    engine = create_engine(
        DATABASE_URL, 
        echo=False,
        pool_pre_ping=True,  # Checks connection before using it
        pool_recycle=300      # Recreates connections every 5 mins
    )
else:
    # Fallback to SQLite for local development
    print("[WARNING] DATABASE_URL not found, using SQLite fallback (IN-MEMORY)")
    sqlite_url = "sqlite://" # In-memory for tests/Vercel-fallback to avoid Read-Only error
    connect_args = {"check_same_thread": False}
    engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

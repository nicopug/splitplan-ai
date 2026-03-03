import logging
import os

from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    logger.info(f"Using PostgreSQL: {DATABASE_URL[:30]}...")
    engine = create_engine(
        DATABASE_URL, 
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300
    )
else:
    logger.warning("DATABASE_URL not found, using SQLite fallback (IN-MEMORY)")
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False}
    )

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

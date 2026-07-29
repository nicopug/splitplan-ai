import hashlib
import logging
import os

from dotenv import load_dotenv
from sqlmodel import create_engine, Session

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Impronta della connection string, per capire se il valore configurato
    # nell'ambiente e' quello atteso senza mai stamparne il contenuto.
    # Un fallimento di autenticazione non distingue "password sbagliata" da
    # "variabile con uno spazio in fondo" o "troncata": questi tre numeri si'.
    logger.info(
        "Using PostgreSQL: %s... (len=%d fp=%s pulita=%s)",
        DATABASE_URL[:30],
        len(DATABASE_URL),
        hashlib.sha256(DATABASE_URL.encode()).hexdigest()[:8],
        DATABASE_URL == DATABASE_URL.strip(),
    )

    # Supabase Supavisor/pgbouncer (URL contiene "pooler"): usa transaction-mode pooling.
    # In questo caso SQLAlchemy non deve gestire il pool — ci pensa pgbouncer.
    # Direct connection (porta 5432): SQLAlchemy gestisce il pool direttamente.
    # Supabase free tier ha solo 2 connessioni dirette → usare sempre l'URL pooler in prod.
    is_pooler = "pooler" in DATABASE_URL or "pgbouncer" in DATABASE_URL

    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
        # Con pgbouncer/Supavisor: disabilita il pool SQLAlchemy (usa NullPool equivalente)
        pool_size=0 if is_pooler else 5,
        max_overflow=-1 if is_pooler else 10,
    )
    logger.info(f"DB pool mode: {'supavisor/pgbouncer (pool_size=0)' if is_pooler else 'direct (pool_size=5, max_overflow=10)'}")
else:
    logger.warning("DATABASE_URL not found, using SQLite fallback (IN-MEMORY)")
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})

# def create_db_and_tables():
#     SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

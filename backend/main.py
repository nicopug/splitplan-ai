import sys
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import create_db_and_tables, get_session, engine
from routers import trips, photos, users, expenses, itinerary, payments, calendar
from admin_auth import verify_admin_token

# ---------------------------------------------------------------------------
# LOGGING
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# APP LIFECYCLE
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Avvio applicazione: creazione tabelle DB...")
    create_db_and_tables()
    logger.info("Tabelle DB pronte.")
    yield
    logger.info("Spegnimento applicazione.")


ROOT_PATH = "/api" if os.getenv("VERCEL") else ""
app = FastAPI(root_path=ROOT_PATH, lifespan=lifespan)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://splitplan-ai.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# ROUTER
# ---------------------------------------------------------------------------
app.include_router(trips.router)
app.include_router(photos.router)
app.include_router(users.router)
app.include_router(expenses.router)
app.include_router(itinerary.router)
app.include_router(payments.router)
app.include_router(calendar.router)


# ---------------------------------------------------------------------------
# ADMIN ENDOPOINTS
# Tutti protetti da X-Admin-Token nell'header.
# Esempio curl: curl -H "X-Admin-Token: il_tuo_token_qui" http://localhost:8000/api/admin/init-db
# ---------------------------------------------------------------------------

@app.get("/admin/init-db", dependencies=[Depends(verify_admin_token)], tags=["admin"])
def init_db():
    """Forza la creazione delle tabelle. Richiede header X-Admin-Token."""
    create_db_and_tables()
    logger.info("[ADMIN] init-db eseguito.")
    return {"message": "Tabelle DB create con successo."}


@app.get("/admin/migrate-calendar", dependencies=[Depends(verify_admin_token)], tags=["admin"])
def migrate_db_calendar():
    """Aggiunge le colonne Google Calendar. Richiede header X-Admin-Token."""
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS google_calendar_token TEXT;"))
            conn.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS is_calendar_connected BOOLEAN DEFAULT FALSE;"))
            conn.commit()
        logger.info("[ADMIN] migrate-calendar eseguita.")
        return {"status": "success", "message": "Colonne calendar aggiunte."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-calendar fallita: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GLOBAL EXCEPTION HANDLER
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Errore non gestito su {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Si è verificato un'errore interno del server. Riprova più tardi."}
    )


@app.get("/", tags=["root"])
def root():
    return {"message": "Backend is running correctly!"}

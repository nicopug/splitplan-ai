import sys
import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Carica .env dalla root del progetto
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, "..", ".env"))

from fastapi import FastAPI, Depends, Request
from pydantic import BaseModel
from typing import Optional
from sqlmodel import Session, select
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routers import trips, photos, users, expenses, itinerary, payments, calendar, leads, flights, sso, companies
from admin_auth import verify_admin_token
from database import get_session
from models import Account, Company

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
    logger.info("Avvio applicazione...")
    # create_db_and_tables() # Gestito da Alembic
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
    "https://splitplan-ai.vercel.app",
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
app.include_router(leads.router)
app.include_router(flights.router, prefix="/trips", tags=["Flights"])
app.include_router(sso.router)
app.include_router(companies.router)


# ---------------------------------------------------------------------------
# ADMIN ENDOPOINTS
# Tutti protetti da X-Admin-Token nell'header.
# Esempio curl: curl -H "X-Admin-Token: il_tuo_token_qui" http://localhost:8000/api/admin/init-db
# ---------------------------------------------------------------------------


@app.get("/admin/init-db", dependencies=[Depends(verify_admin_token)], tags=["admin"])
def init_db():
    """Endpoint deprecato. Usare alembic upgrade head."""
    return {
        "message": "Endpoint deprecato. Usare 'alembic upgrade head' dalla riga di comando."
    }


# Endpoint /admin/migrate-calendar rimosso: le colonne sono gestite da Alembic.


# ---------------------------------------------------------------------------
# ADMIN: Approvazione B2B — crea azienda e promuove utente a manager
# ---------------------------------------------------------------------------

class ApproveB2BRequest(BaseModel):
    account_email: str
    company_name: str
    max_budget: Optional[float] = None


@app.post("/admin/approve-b2b", dependencies=[Depends(verify_admin_token)], tags=["admin"])
def approve_b2b(
    body: ApproveB2BRequest,
    session: Session = Depends(get_session),
):
    """
    Sales-Led B2B onboarding:
    Crea una nuova Company, aggancia l'Account specificato come manager.
    Richiede header X-Admin-Token.
    """
    account = session.exec(select(Account).where(Account.email == body.account_email)).first()
    if not account:
        raise HTTPException(status_code=404, detail=f"Nessun account trovato con email: {body.account_email}")

    company = Company(name=body.company_name, max_budget_per_trip=body.max_budget)
    session.add(company)
    session.commit()
    session.refresh(company)

    account.company_id = company.id
    account.is_manager = True
    session.add(account)
    session.commit()

    logger.info(f"[ADMIN] Azienda '{company.name}' creata (id={company.id}), manager: {account.email}")
    return {
        "company_id": company.id,
        "company_name": company.name,
        "manager_email": account.email,
        "max_budget": company.max_budget_per_trip,
    }


# ---------------------------------------------------------------------------
# GLOBAL EXCEPTION HANDLER
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Errore non gestito su {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Si è verificato un'errore interno del server. Riprova più tardi."
        },
    )


@app.get("/", tags=["root"])
def root():
    return {"message": "Backend is running correctly!"}

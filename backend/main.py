from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
from .routers import trips, photos, users, expenses, itinerary

# --- CONFIGURAZIONE APP ---
# root_path="/api" è fondamentale per il deployment su Vercel
app = FastAPI(root_path="/api")

# --- CONFIGURAZIONE CORS ---
# Permette al frontend di parlare con il backend
origins = [
    "http://localhost:3000",
    "http://localhost:5173", # Vite default
    "https://splitplan-ai.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INCLUSIONE ROUTER ---
app.include_router(trips.router)
app.include_router(photos.router)
app.include_router(users.router)
app.include_router(expenses.router)
app.include_router(itinerary.router)

# --- AVVIO AUTOMATICO DB ---
@app.on_event("startup")
def on_startup():
    # Tenta di creare le tabelle all'avvio
    create_db_and_tables()

# --- ENDPOINT MANUALE PER FORZARE LA CREAZIONE TABELLE ---
# Usa questo se Supabase rimane vuoto dopo il deploy
@app.get("/init-db")
def init_db():
    create_db_and_tables()
    return {"message": "Database tables created successfully! Check Supabase now."}

from fastapi import Request
from fastapi.responses import JSONResponse
import logging
import traceback

# Configurazione Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Logghiamo l'errore completo internamente
    logger.error(f"Unhandled error: {exc}")
    logger.error(traceback.format_exc())
    
    # Restituiamo un messaggio pulito all'utente
    return JSONResponse(
        status_code=500,
        content={"detail": "Si è verificato un errore interno al server. Riprova più tardi."},
    )

@app.get("/")
def root():
    return {"message": "Backend is running correctly!"}
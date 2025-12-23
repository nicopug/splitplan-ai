from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
from .routers import trips, photos, users

# --- CONFIGURAZIONE APP ---
# root_path="/api" è fondamentale per il deployment su Vercel
app = FastAPI(root_path="/api")

# --- CONFIGURAZIONE CORS ---
# Permette al frontend di parlare con il backend
origins = [
    "http://localhost:3000",
    "https://splitplan-ai.vercel.app",
    "*" # Lasciamo * per sicurezza in fase di sviluppo
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

@app.get("/")
def root():
    return {"message": "Backend is running correctly!"}
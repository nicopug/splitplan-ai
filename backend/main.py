from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import trips, photos, users

app = FastAPI()

# --- CONFIGURAZIONE CORS FONDAMENTALE ---
# Senza questo, il browser blocca le richieste POST di login/register
origins = [
    "http://localhost:3000",
    "https://splitplan-ai.vercel.app", # Metti qui il dominio del tuo frontend
    "*" # In fase di dev/test puoi lasciare * per accettare tutto
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Usa ["*"] se vuoi permettere a chiunque
    allow_credentials=True,
    allow_methods=["*"], # IMPORTANTE: permette POST, GET, OPTIONS, ecc.
    allow_headers=["*"],
)

# --- INCLUSIONE ROUTER ---
app.include_router(trips.router)
app.include_router(photos.router)
app.include_router(users.router)

@app.get("/")
def root():
    return {"message": "Backend is running"}
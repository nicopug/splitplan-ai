from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Importa tutti i router
from .routers import trips, photos, users 

# --- PUNTO FONDAMENTALE 1: root_path="/api" ---
# Questo dice a FastAPI: "Guarda che ti trovi sotto /api, quindi ignora quel pezzo iniziale"
app = FastAPI(root_path="/api")

# --- CONFIGURAZIONE CORS ---
origins = [
    "http://localhost:3000",
    "https://splitplan-ai.vercel.app",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PUNTO FONDAMENTALE 2: Includi i Router ---
app.include_router(trips.router)
app.include_router(photos.router)
app.include_router(users.router) # <--- ASSICURATI CHE QUESTO NON ABBIA IL # DAVANTI

@app.get("/")
def root():
    return {"message": "Backend is running correctly!"}
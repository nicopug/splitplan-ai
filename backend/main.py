from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
from .routers import trips, itinerary, expenses, photos, users
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 [STARTUP] Iniziando startup...")
    try:
        create_db_and_tables()
        print("✅ [OK] Database tables created/verified.")
    except Exception as e:
        print(f"🔥 [STARTUP ERROR] DB Error: {e}")
        print(traceback.format_exc())
    yield
    print("🛑 [SHUTDOWN] App shutting down...")

app = FastAPI(lifespan=lifespan)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"🔥 CRASH: {str(exc)}\n{traceback.format_exc()}"
    print(error_msg)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    print("📍 [HEALTH CHECK] Request ricevuta")
    return {"status": "ok", "database": "connected"}

@app.get("/debug")
def debug_info():
    return {
        "env_vars": {
            "DATABASE_URL": "***" if os.getenv("DATABASE_URL") else "NOT SET",
            "SMTP_USER": "***" if os.getenv("SMTP_USER") else "NOT SET",
            "SMTP_PASSWORD": "***" if os.getenv("SMTP_PASSWORD") else "NOT SET",
            "SECRET_KEY": "***" if os.getenv("SECRET_KEY") else "NOT SET",
            "GOOGLE_API_KEY": "***" if os.getenv("GOOGLE_API_KEY") else "NOT SET",
            "FRONTEND_URL": os.getenv("FRONTEND_URL", "NOT SET"),
        }
    }

print("📦 [INIT] Loading routers...")
try:
    app.include_router(trips.router)
    print("✅ trips router loaded")
except Exception as e:
    print(f"❌ Error loading trips router: {e}")
    traceback.print_exc()

try:
    app.include_router(itinerary.router)
    print("✅ itinerary router loaded")
except Exception as e:
    print(f"❌ Error loading itinerary router: {e}")
    traceback.print_exc()

try:
    app.include_router(expenses.router)
    print("✅ expenses router loaded")
except Exception as e:
    print(f"❌ Error loading expenses router: {e}")
    traceback.print_exc()

try:
    app.include_router(photos.router)
    print("✅ photos router loaded")
except Exception as e:
    print(f"❌ Error loading photos router: {e}")
    traceback.print_exc()

try:
    app.include_router(users.router)
    print("✅ users router loaded")
except Exception as e:
    print(f"❌ Error loading users router: {e}")
    traceback.print_exc()

# Mount public folder
if not os.path.exists("public"):
    os.makedirs("public")
app.mount("/public", StaticFiles(directory="public"), name="public")

@app.get("/")
def read_root():
    return {"message": "Welcome to SplitPlan API"}

print("✅ [INIT] All routers loaded successfully!")
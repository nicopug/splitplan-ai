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
    try:
        create_db_and_tables()
        print("[OK] Database tables created/verified.")
    except Exception as e:
        print(f"🔥 Startup DB Error: {e}")
        # We don't raise here so the app can still start and return 500s for requests instead of crashing entirely
    yield

app = FastAPI(lifespan=lifespan)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"🔥 CRASH: {str(exc)}\n{traceback.format_exc()}"
    print(error_msg)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"} # Manually enable CORS on 500
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(trips.router)
app.include_router(itinerary.router)
app.include_router(expenses.router)
app.include_router(photos.router)
app.include_router(users.router)

# Mount public folder to serve uploaded photos
if not os.path.exists("public"):
    os.makedirs("public")
app.mount("/public", StaticFiles(directory="public"), name="public")
# Also mount uploads specifically if needed, but /public/uploads should work via /public

@app.get("/")
def read_root():
    return {"message": "Welcome to SplitPlan API"}

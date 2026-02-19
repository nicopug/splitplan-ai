import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from supabase import create_client, Client

from database import get_session
from models import Photo, Trip

router = APIRouter(prefix="/trips", tags=["photos"])

# Configurazione Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
BUCKET_NAME = "trip-photos"

# Verifica configurazione
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[WARN] Supabase credentials not found. Photo upload will fail.")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

@router.post("/{trip_id}/photos", response_model=Photo)
async def upload_photo(
    trip_id: int, 
    file: UploadFile = File(...), 
    session: Session = Depends(get_session)
):
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    supabase = get_supabase()
    
    # Genera un nome file unico per evitare conflitti e mantenere pulizia
    # Struttura: trip_id/uuid.ext
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_name = f"{trip_id}/{uuid.uuid4()}.{file_ext}"
    
    try:
        # Leggi il file in memoria
        file_content = await file.read()
        
        # Upload su Supabase Storage
        supabase.storage.from_(BUCKET_NAME).upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Ottieni l'URL pubblico
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        
        # Salva nel database
        db_photo = Photo(trip_id=trip_id, url=public_url)
        session.add(db_photo)
        session.commit()
        session.refresh(db_photo)
        
        return db_photo
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@router.get("/{trip_id}/photos", response_model=List[Photo])
async def get_photos(trip_id: int, session: Session = Depends(get_session)):
    statement = select(Photo).where(Photo.trip_id == trip_id)
    return session.exec(statement).all()

@router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: int, session: Session = Depends(get_session)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    supabase = get_supabase()
    
    # Estrarre il percorso del file dall'URL pubblico
    # URL tipico: https://xxx.supabase.co/storage/v1/object/public/trip-photos/123/abc.jpg
    # Vogliamo solo: 123/abc.jpg
    try:
        if BUCKET_NAME in photo.url:
            file_path = photo.url.split(f"{BUCKET_NAME}/")[-1]
            
            # Cancella da Supabase Storage
            supabase.storage.from_(BUCKET_NAME).remove([file_path])
    except Exception as e:
        print(f"Error deleting from storage: {e}")
        # Continuiamo per cancellare comunque dal DB
    
    session.delete(photo)
    session.commit()
    return {"message": "Photo deleted successfully"}
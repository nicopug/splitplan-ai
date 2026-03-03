import logging
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from supabase import create_client, Client

from auth import get_current_user
from database import get_session
from models import Photo, Trip, Account, Participant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trips", tags=["photos"])

# Configurazione Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
BUCKET_NAME = "trip-photos"

# Verifica configurazione
if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase credentials not found. Photo upload will fail.")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def _check_partecipant(trip_id: int, account: Account, session: Session):
    """Verifica che l'utente sia un partecipante del viaggio."""
    member = session.exec(
        select(Partecipant).where(
            Partecipant.trip_id == trip_id,
            Partecipant.account_id == account.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Non sei un partecipante di questo viaggio")


@router.post("/{trip_id}/photos", response_model=Photo)
async def upload_photo(
    trip_id: int, 
    file: UploadFile = File(...), 
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user)
):
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato.")
    
    _check_partecipant(trip_id, current_account, session)
    
    supabase = get_supabase()
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_name = f"{trip_id}/{uuid.uuid4()}.{file_ext}"
    
    try:
        file_content = await file.read()
        supabase.storage.from_(BUCKET_NAME).upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        
        db_photo = Photo(trip_id=trip_id, url=public_url)
        session.add(db_photo)
        session.commit()
        session.refresh(db_photo)
        logger.info(f"Foto caricata per viaggio {trip_id} da account {current_account.id}")
        return db_photo
        
    except Exception as e:
        logger.error(f"Errore upload foto viaggio {trip_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@router.get("/{trip_id}/photos", response_model=List[Photo])
async def get_photos(
    trip_id: int,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user)
):
    _check_partecipant(trip_id, current_account, session)
    return session.exec(statement).all()

@router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: int,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user)
):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    
    # Verifica che l'utente sia partecipante del viaggio a cui appartiene la foto
    _check_partecipant(photo.trip_id, current_account, session)
    
    supabase = get_supabase()
    try:
        if BUCKET_NAME in photo.url:
            file_path = photo.url.split(f"{BUCKET_NAME}/")[-1]
            supabase.storage.from_(BUCKET_NAME).remove([file_path])
    except Exception as e:
        logger.error(f"Errore eliminazione da Supabase Storage (photo {photo_id}): {e}")

    session.delete(photo)
    session.commit()
    logging.info(f"Foto {photo_id} eliminata da account {current_account.id}")
    return {"message": "Foto eliminata con successo"}
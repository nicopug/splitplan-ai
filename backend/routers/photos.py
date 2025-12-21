import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from ..database import get_session
from ..models import Photo, Trip

router = APIRouter(prefix="/trips", tags=["photos"])

# Ensure upload directory exists
UPLOAD_DIR = os.path.join(os.getcwd(), "public", "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{trip_id}/photos", response_model=Photo)
async def upload_photo(trip_id: int, file: UploadFile = File(...), session: Session = Depends(get_session)):
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Save file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create record
    # Note: In a real app, we would use a more unique filename and handle relative paths correctly
    photo_url = f"/uploads/{file.filename}"
    db_photo = Photo(trip_id=trip_id, url=photo_url)
    session.add(db_photo)
    session.commit()
    session.refresh(db_photo)
    return db_photo

@router.get("/{trip_id}/photos", response_model=List[Photo])
async def get_photos(trip_id: int, session: Session = Depends(get_session)):
    statement = select(Photo).where(Photo.trip_id == trip_id)
    return session.exec(statement).all()
@router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: int, session: Session = Depends(get_session)):
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete file from disk
    # The URL is stored as "/uploads/filename.ext"
    # We need the physical path: os.path.join(os.getcwd(), "public", "uploads", filename)
    file_name = os.path.basename(photo.url)
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")
        # We continue even if file deletion fails to keep DB consistent
    
    session.delete(photo)
    session.commit()
    return {"message": "Photo deleted successfully"}

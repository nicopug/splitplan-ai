from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel
from typing import List, Optional

from ..database import get_session
from ..models import ItineraryItem

router = APIRouter(prefix="/itinerary", tags=["itinerary"])

# Definiamo uno schema locale per la creazione
class ItineraryItemCreate(SQLModel):
    title: str
    description: Optional[str] = None
    start_time: str 
    end_time: Optional[str] = None
    type: str 

@router.get("/{trip_id}", response_model=List[ItineraryItem])
def get_itinerary(trip_id: int, session: Session = Depends(get_session)):
    statement = select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)
    results = session.exec(statement)
    return results.all()

@router.post("/{trip_id}", response_model=ItineraryItem)
def add_itinerary_item(trip_id: int, item: ItineraryItemCreate, session: Session = Depends(get_session)):
    # Creiamo l'oggetto DB partendo dai dati ricevuti
    db_item = ItineraryItem(
        trip_id=trip_id,
        title=item.title,
        description=item.description,
        start_time=item.start_time,
        end_time=item.end_time,
        type=item.type
    )
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@router.patch("/{item_id}", response_model=ItineraryItem)
def update_itinerary_item(item_id: int, updates: dict, session: Session = Depends(get_session)):
    db_item = session.get(ItineraryItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Attività non trovata")
    
    for key, value in updates.items():
        if hasattr(db_item, key):
            setattr(db_item, key, value)
    
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item
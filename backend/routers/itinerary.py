from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ..database import get_session
from ..models import ItineraryItem, ItineraryItemBase

router = APIRouter(prefix="/itinerary", tags=["itinerary"])

@router.get("/{trip_id}", response_model=List[ItineraryItem])
def get_itinerary(trip_id: int, session: Session = Depends(get_session)):
    statement = select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)
    results = session.exec(statement)
    return results.all()

@router.post("/{trip_id}", response_model=ItineraryItem)
def add_itinerary_item(trip_id: int, item: ItineraryItemBase, session: Session = Depends(get_session)):
    db_item = ItineraryItem.model_validate(item, update={"trip_id": trip_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

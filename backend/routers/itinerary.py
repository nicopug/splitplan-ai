import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel

from auth import get_current_user
from database import get_session
from models import Account, ItineraryItem, Partecipant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/itinerary", tags=["itinerary"])


def _check_participant(trip_id: int, account: Account, session: Session):
    """Verifica che l'utente sia un partecipante del viaggio."""
    member = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id,
            Participant.account_id == account.id
        )
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Non sei un partecipante di questo viaggio.")


class ItineraryItemCreate(SQLModel):
    title: str
    description: Optional[str] = None
    start_time: str 
    end_time: Optional[str] = None
    type: str 

@router.get("/{trip_id}", response_model=List[ItineraryItem])
async def get_itinerary(
    trip_id: int,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user)
):
    _check_participant(trip_id, current_account, session)
    return session.exec(
        select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)
    ).all()

@router.post("/{trip_id}", response_model=ItineraryItem)
async def add_itinerary_item(
    trip_id: int,
    item: ItineraryItemCreate,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user)
):
    _check_participant(trip_id, current_account, session)

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
    logger.info(f"Item itinerario aggiunto al viaggio {trip_id} da account {current_account.id}")
    return db_item
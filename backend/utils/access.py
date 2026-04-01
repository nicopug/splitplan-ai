from fastapi import HTTPException
from sqlmodel import Session, select
from models import Account, Participant


def check_participant(trip_id: int, account: Account, session: Session) -> Participant:
    """Verifica che l'account sia un partecipante del viaggio. Solleva 403 altrimenti."""
    member = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id, Participant.account_id == account.id
        )
    ).first()
    if not member:
        raise HTTPException(
            status_code=403, detail="Non sei un partecipante di questo viaggio."
        )
    return member

"""
Router notifiche — endpoint per gestire le notifiche in-app degli utenti.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from database import get_session
from auth import get_current_user
from models import Account, Notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/unread-count")
async def get_unread_count(
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    count = session.exec(
        select(func.count(Notification.id)).where(
            Notification.account_id == current_user.id,
            Notification.is_read == False,
        )
    ).one()
    return {"count": count}


@router.get("")
async def get_notifications(
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
):
    notifications = session.exec(
        select(Notification)
        .where(Notification.account_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(min(limit, 50))
    ).all()
    return {"notifications": notifications}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    notif = session.get(Notification, notification_id)
    if not notif:
        raise HTTPException(404, "Notifica non trovata")
    if notif.account_id != current_user.id:
        raise HTTPException(403, "Accesso negato")
    notif.is_read = True
    session.add(notif)
    session.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    unread = session.exec(
        select(Notification).where(
            Notification.account_id == current_user.id,
            Notification.is_read == False,
        )
    ).all()
    for notif in unread:
        notif.is_read = True
        session.add(notif)
    session.commit()
    return {"marked": len(unread)}

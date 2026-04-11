"""
Servizio notifiche SplitPlan.
Funzioni helper per creare notifiche in-app e inviare email di notifica.
"""
import logging
import os
from sqlmodel import Session, select
from models import Notification, Account
from email_templates import base_template
from utils.email_utils import get_smtp_config

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")


def create_notification(
    session: Session,
    account_id: int,
    type: str,
    title: str,
    message: str,
    trip_id: int = None,
) -> Notification:
    """Crea e persiste una notifica in-app per un account."""
    notif = Notification(
        account_id=account_id,
        type=type,
        title=title,
        message=message,
        trip_id=trip_id,
    )
    session.add(notif)
    session.flush()  # ottieni l'id senza commit completo
    return notif


def notify_managers(
    session: Session,
    company_id: int,
    type: str,
    title: str,
    message: str,
    trip_id: int = None,
) -> list[Notification]:
    """Crea notifiche per tutti i manager della company."""
    managers = session.exec(
        select(Account).where(
            Account.company_id == company_id,
            Account.is_manager == True,
        )
    ).all()

    notifications = []
    for manager in managers:
        notif = create_notification(
            session, manager.id, type, title, message, trip_id
        )
        notifications.append(notif)
    return notifications


def send_notification_email(account: Account, subject: str, html_content: str):
    """Invia un'email HTML all'account usando la configurazione SMTP centralizzata."""
    try:
        from fastapi_mail import FastMail, MessageSchema, MessageType

        _, _, smtp_conf = get_smtp_config()
        if not smtp_conf:
            logger.warning("[NotifEmail] SMTP non configurato, skip email")
            return

        import asyncio

        message = MessageSchema(
            subject=subject,
            recipients=[account.email],
            body=base_template(html_content),
            subtype=MessageType.html,
        )

        async def _send():
            fm = FastMail(smtp_conf)
            await fm.send_message(message)

        # Esegui la coroutine in un loop dedicato (chiamato da contesto sync)
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, _send())
                    future.result(timeout=10)
            else:
                loop.run_until_complete(_send())
        except Exception as e:
            logger.error(f"[NotifEmail] Errore invio email a {account.email}: {e}")

    except Exception as e:
        logger.error(f"[NotifEmail] Errore critico: {e}")



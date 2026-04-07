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


# ---------------------------------------------------------------------------
# Template email predefiniti
# ---------------------------------------------------------------------------

def _trip_link(trip_id: int) -> str:
    return f"{FRONTEND_URL}/trip/{trip_id}"


def email_approval_requested(manager_name: str, trip_name: str, trip_id: int, requester_name: str) -> str:
    link = _trip_link(trip_id)
    return f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;">Nuova richiesta di approvazione</h2>
    <p style="color:#555;line-height:1.6;">Ciao <strong>{manager_name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
        <strong>{requester_name}</strong> ha richiesto l'approvazione del viaggio aziendale
        <strong>"{trip_name}"</strong>.
    </p>
    <p style="text-align:center;margin:28px 0;">
        <a href="{link}" style="background:#23599E;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
            Visualizza e Approva
        </a>
    </p>
    <p style="color:#888;font-size:12px;">Accedi alla dashboard manager per approvare o rifiutare.</p>
    """


def email_trip_approved(organizer_name: str, trip_name: str, trip_id: int, manager_name: str) -> str:
    link = _trip_link(trip_id)
    return f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;">Viaggio Approvato ✅</h2>
    <p style="color:#555;line-height:1.6;">Ciao <strong>{organizer_name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
        Il tuo viaggio aziendale <strong>"{trip_name}"</strong> è stato
        <span style="color:#16a34a;font-weight:700;">approvato</span>
        da <strong>{manager_name}</strong>.
    </p>
    <p style="text-align:center;margin:28px 0;">
        <a href="{link}" style="background:#16a34a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
            Vai al Viaggio
        </a>
    </p>
    """


def email_trip_rejected(organizer_name: str, trip_name: str, trip_id: int, manager_name: str, reason: str = None) -> str:
    link = _trip_link(trip_id)
    reason_block = f"""
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;margin:16px 0;">
        <p style="margin:0;color:#b91c1c;font-weight:600;">Motivazione:</p>
        <p style="margin:8px 0 0 0;color:#7f1d1d;">{reason}</p>
    </div>
    """ if reason else ""
    return f"""
    <h2 style="color:#1a1a1a;margin:0 0 16px 0;">Viaggio Non Approvato</h2>
    <p style="color:#555;line-height:1.6;">Ciao <strong>{organizer_name}</strong>,</p>
    <p style="color:#555;line-height:1.6;">
        Il tuo viaggio aziendale <strong>"{trip_name}"</strong> è stato
        <span style="color:#dc2626;font-weight:700;">rifiutato</span>
        da <strong>{manager_name}</strong>.
    </p>
    {reason_block}
    <p style="text-align:center;margin:28px 0;">
        <a href="{link}" style="background:#23599E;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
            Vai al Viaggio
        </a>
    </p>
    <p style="color:#888;font-size:12px;">Puoi modificare il piano e richiedere nuovamente l'approvazione.</p>
    """

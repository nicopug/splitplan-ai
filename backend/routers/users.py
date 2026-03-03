import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Body, Depends, Header, HTTPException, status
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel
from sqlalchemy import text
from sqlmodel import Session, select

from auth import (
    create_access_token,
    create_reset_token,
    create_verification_token,
    decode_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from database import get_session
from email_templates import reset_password_email, verification_email
from models import Account, Participant
from utils.email_utils import get_smtp_config

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

if not os.getenv("SMTP_USER") or not os.getenv("SMTP_PASSWORD"):
    logger.warning("SMTP Credentials non trovate in .env. L'invio email fallirà.")


# ---------------------------------------------------------------------------
# ADMIN AUTH DEPENDENCY (condivisa con main.py)
# ---------------------------------------------------------------------------
def verify_admin_token(x_admin_token: str = Header(...)):
    admin_token = os.getenv("ADMIN_TOKEN")
    if not admin_token:
        raise HTTPException(status_code=503, detail="ADMIN_TOKEN non configurato sul server.")
    if x_admin_token != admin_token:
        raise HTTPException(status_code=403, detail="Token admin non valido.")


# ---------------------------------------------------------------------------
# SCHEMAS
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    name: str
    surname: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------------------------------------------------------------------------
# ADMIN: MIGRATION ENDPOINTS
# Tutti protetti da X-Admin-Token. Da eseguire UNA VOLTA via curl/Postman.
# ---------------------------------------------------------------------------

@router.get("/admin/migrate-security", dependencies=[Depends(verify_admin_token)], tags=["admin"])
async def migrate_db_security(session: Session = Depends(get_session)):
    try:
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS reset_in_progress BOOLEAN DEFAULT FALSE;"))
        session.commit()
        logger.info("[ADMIN] Migrazione security completata.")
        return {"message": "Colonna reset_in_progress aggiunta."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-security fallita: {e}")
        return {"error": str(e)}

@router.get("/admin/migrate-rate-limit", dependencies=[Depends(verify_admin_token)], tags=["admin"])
async def migrate_rate_limit_fields(session: Session = Depends(get_session)):
    try:
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS daily_ai_usage INTEGER DEFAULT 0;"))
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS last_usage_reset VARCHAR;"))
        session.commit()
        logger.info("[ADMIN] Migrazione rate limit completata.")
        return {"message": "Campi rate limit aggiunti."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-rate-limit fallita: {e}")
        return {"error": str(e)}

@router.get("/admin/migrate-subscription", dependencies=[Depends(verify_admin_token)], tags=["admin"])
async def migrate_subscription_fields(session: Session = Depends(get_session)):
    try:
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR;"))
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS subscription_expiry VARCHAR;"))
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;"))
        session.commit()
        logger.info("[ADMIN] Migrazione subscription completata.")
        return {"message": "Campi subscription aggiunti."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-subscription fallita: {e}")
        return {"error": str(e)}

@router.get("/admin/migrate-language", dependencies=[Depends(verify_admin_token)], tags=["admin"])
async def migrate_language_field(session: Session = Depends(get_session)):
    try:
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'it';"))
        session.commit()
        logger.info("[ADMIN] Migrazione language completata.")
        return {"message": "Campo language aggiunto."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-language fallita: {e}")
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# AUTH ENDPOINTS
# ---------------------------------------------------------------------------

@router.post("/register")
async def register(req: RegisterRequest, session: Session = Depends(get_session)):
    logger.info(f"Registrazione richiesta per {req.email}")

    existing = session.exec(select(Account).where(Account.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")

    new_account = Account(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        name=req.name,
        surname=req.surname,
    )
    session.add(new_account)
    session.commit()
    session.refresh(new_account)

    smtp_user, smtp_password, smtp_conf = get_smtp_config()
    if smtp_user and smtp_password:
        try:
            verification_token = create_verification_token(email=req.email)
            frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")
            verification_url = f"{frontend_url}/verify?token={verification_token}"
            message = MessageSchema(
                subject="Verifica il tuo account SplitPlan ✈️",
                recipients=[req.email],
                body=verification_email(name=req.name, verification_url=verification_url),
                subtype=MessageType.html,
            )
            fm = FastMail(smtp_conf)
            await fm.send_message(message)
            logger.info(f"Email di verifica inviata a {req.email}")
        except Exception as e:
            logger.error(f"Errore invio email di verifica a {req.email}: {e}")
    else:
        logger.warning("SMTP non configurato. Email di verifica non inviata.")

    return {"message": "Registrazione completata. Controlla la tua email per la verifica."}


@router.get("/verify-email")
async def verify_email(token: str, session: Session = Depends(get_session)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "verification":
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")

    email = payload.get("sub")
    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")

    account.is_verified = True
    session.add(account)
    session.commit()
    logger.info(f"Email verificata per account {account.id}")
    return {"message": "Email verificata con successo!"}


@router.post("/login")
async def login(req: LoginRequest, session: Session = Depends(get_session)):
    account = session.exec(select(Account).where(Account.email == req.email)).first()

    if not account or not verify_password(req.password, account.hashed_password):
        raise HTTPException(status_code=401, detail="Email o password non corretti")

    if account.reset_in_progress:
        raise HTTPException(status_code=403, detail="Reset della password in corso. Usa il link inviato via email.")

    if not account.is_verified:
        raise HTTPException(status_code=403, detail="Profilo non verificato. Controlla la tua email.")

    access_token = create_access_token(data={"sub": account.email})
    logger.info(f"Login effettuato per account {account.id}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": account.id,
            "name": account.name,
            "surname": account.surname,
            "email": account.email,
            "is_subscribed": account.is_subscribed,
            "credits": account.credits,
            "subscription_plan": account.subscription_plan,
            "subscription_expiry": account.subscription_expiry,
            "auto_renew": account.auto_renew,
            "language": account.language,
        },
    }


@router.get("/me")
async def get_me(current_account: Account = Depends(get_current_user)):
    """Restituisce i dati dell'utente autenticato tramite JWT."""
    return current_account


@router.get("/validate-reset-token")
async def validate_reset_token(token: str, session: Session = Depends(get_session)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")

    email = payload.get("sub")
    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")

    account.reset_in_progress = True
    session.add(account)
    session.commit()
    return {"message": "Token valido. Prosegui con il reset."}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, session: Session = Depends(get_session)):
    account = session.exec(select(Account).where(Account.email == req.email)).first()
    if not account:
        # Risposta volutamente ambigua per sicurezza (non rivela se l'email esiste)
        return {"message": "Se l'email è registrata, riceverai un link di reset."}

    smtp_user, smtp_password, smtp_conf = get_smtp_config()
    if smtp_user and smtp_password:
        try:
            reset_token = create_reset_token(email=req.email)
            frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")
            reset_url = f"{frontend_url}/reset-password?token={reset_token}"
            message = MessageSchema(
                subject="Reset della password SplitPlan 🔑",
                recipients=[req.email],
                body=reset_password_email(name=account.name, reset_url=reset_url),
                subtype=MessageType.html,
            )
            fm = FastMail(smtp_conf)
            await fm.send_message(message)
            logger.info(f"Email di reset inviata a {req.email}")
            return {"message": "Email di reset inviata correttamente."}
        except Exception as e:
            logger.error(f"Errore invio email reset per {req.email}: {e}")
            raise HTTPException(status_code=500, detail="Errore nell'invio dell'email di reset")
    else:
        logger.error("SMTP non configurato durante reset password.")
        raise HTTPException(status_code=500, detail="Configurazione email mancante sul server")


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, session: Session = Depends(get_session)):
    payload = decode_token(req.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")

    email = payload.get("sub")
    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")

    if verify_password(req.new_password, account.hashed_password):
        raise HTTPException(status_code=400, detail="La nuova password non può essere uguale a quella attuale")

    account.hashed_password = get_password_hash(req.new_password)
    account.reset_in_progress = False
    session.add(account)
    session.commit()
    logger.info(f"Password aggiornata per account {account.id}")
    return {"message": "Password aggiornata con successo! Ora puoi accedere."}


# ---------------------------------------------------------------------------
# SUBSCRIPTION MANAGEMENT (richiede JWT)
# ---------------------------------------------------------------------------

@router.post("/toggle-subscription")
async def toggle_subscription(
    plan: Optional[str] = Body(None, embed=True),
    current_account: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Attiva/disattiva o cambia piano abbonamento. Richiede autenticazione JWT."""
    if not current_account.is_subscribed:
        current_account.is_subscribed = True
        current_account.subscription_plan = plan or "MONTHLY"
        days = 365 if current_account.subscription_plan == "ANNUAL" else 30
        current_account.subscription_expiry = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
        current_account.auto_renew = True
    else:
        if plan and current_account.subscription_plan != plan:
            current_account.subscription_plan = plan
            days = 365 if plan == "ANNUAL" else 30
            current_account.subscription_expiry = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
        else:
            current_account.is_subscribed = False
            current_account.subscription_plan = None
            current_account.subscription_expiry = None

    session.add(current_account)
    session.commit()
    session.refresh(current_account)
    logger.info(f"Subscription aggiornata per account {current_account.id}: subscribed={current_account.is_subscribed}")

    return {
        "is_subscribed": current_account.is_subscribed,
        "subscription_plan": current_account.subscription_plan,
        "subscription_expiry": current_account.subscription_expiry,
        "auto_renew": current_account.auto_renew,
    }


@router.post("/cancel-subscription")
async def cancel_subscription(
    current_account: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Cancella l'abbonamento dell'utente autenticato. Richiede autenticazione JWT."""
    current_account.is_subscribed = False
    current_account.subscription_plan = None
    current_account.subscription_expiry = None
    current_account.auto_renew = False

    session.add(current_account)
    session.commit()
    logger.info(f"Abbonamento cancellato per account {current_account.id}")

    return {
        "status": "success",
        "message": "Abbonamento annullato con successo. Sei tornato al piano Free.",
        "is_subscribed": False,
    }


@router.post("/update-language")
async def update_language(
    language: str = Body(..., embed=True),
    current_account: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    current_account.language = language
    session.add(current_account)
    session.commit()
    session.refresh(current_account)
    return {"status": "success", "language": current_account.language}
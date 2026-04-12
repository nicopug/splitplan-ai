import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel
from sqlalchemy import text
from sqlmodel import Session, select

from admin_auth import verify_admin_token
from auth import (
    create_access_token_versioned,
    create_refresh_token,
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
# In-memory rate limiter
# ---------------------------------------------------------------------------

# Struttura: { endpoint_key: { ip: [timestamp, ...] } }
_rate_limit_store: dict = defaultdict(lambda: defaultdict(list))

_RATE_LIMITS = {
    "login":           {"max": 10, "window": 900},   # 10 / 15 min
    "register":        {"max": 5,  "window": 3600},  # 5  / 1 ora
    "forgot_password": {"max": 3,  "window": 3600},  # 3  / 1 ora
}


def _check_auth_rate_limit(endpoint: str, ip: str):
    """Solleva 429 se l'IP ha superato il limite per l'endpoint dato."""
    cfg = _RATE_LIMITS.get(endpoint)
    if not cfg:
        return
    now = time.monotonic()
    window = cfg["window"]
    max_req = cfg["max"]

    # Pulisci i timestamp scaduti
    history = _rate_limit_store[endpoint][ip]
    history[:] = [t for t in history if now - t < window]

    if len(history) >= max_req:
        raise HTTPException(
            status_code=429,
            detail=f"Troppi tentativi. Riprova tra {window // 60} minuti.",
            headers={"Retry-After": str(window)},
        )
    history.append(now)


# ---------------------------------------------------------------------------
# SCHEMAS
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    name: str
    surname: str
    email: str
    password: str
    terms_accepted: bool = False
    privacy_accepted: bool = False


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class AccountResponse(BaseModel):
    id: int
    email: str
    name: str
    surname: str
    is_verified: bool
    is_subscribed: bool
    reset_in_progress: bool
    is_calendar_connected: bool
    credits: int
    daily_ai_usage: int
    last_usage_reset: Optional[str]
    subscription_plan: Optional[str]
    subscription_expiry: Optional[str]
    auto_renew: bool
    language: str
    is_manager: bool = False
    company_id: Optional[int] = None


# ---------------------------------------------------------------------------
# ADMIN: MIGRATION ENDPOINTS
# Tutti protetti da X-Admin-Token. Da eseguire UNA VOLTA via curl/Postman.
# ---------------------------------------------------------------------------


@router.get(
    "/admin/migrate-security",
    dependencies=[Depends(verify_admin_token)],
    tags=["admin"],
)
async def migrate_db_security(session: Session = Depends(get_session)):
    try:
        session.execute(
            text(
                "ALTER TABLE account ADD COLUMN IF NOT EXISTS reset_in_progress BOOLEAN DEFAULT FALSE;"
            )
        )
        session.commit()
        logger.info("[ADMIN] Migrazione security completata.")
        return {"message": "Colonna reset_in_progress aggiunta."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-security fallita: {e}")
        return {"error": str(e)}


@router.get(
    "/admin/migrate-rate-limit",
    dependencies=[Depends(verify_admin_token)],
    tags=["admin"],
)
async def migrate_rate_limit_fields(session: Session = Depends(get_session)):
    try:
        session.execute(
            text(
                "ALTER TABLE account ADD COLUMN IF NOT EXISTS daily_ai_usage INTEGER DEFAULT 0;"
            )
        )
        session.execute(
            text(
                "ALTER TABLE account ADD COLUMN IF NOT EXISTS last_usage_reset VARCHAR;"
            )
        )
        session.commit()
        logger.info("[ADMIN] Migrazione rate limit completata.")
        return {"message": "Campi rate limit aggiunti."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-rate-limit fallita: {e}")
        return {"error": str(e)}


@router.get(
    "/admin/migrate-subscription",
    dependencies=[Depends(verify_admin_token)],
    tags=["admin"],
)
async def migrate_subscription_fields(session: Session = Depends(get_session)):
    try:
        session.execute(
            text(
                "ALTER TABLE account ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR;"
            )
        )
        session.execute(
            text(
                "ALTER TABLE account ADD COLUMN IF NOT EXISTS subscription_expiry VARCHAR;"
            )
        )
        session.execute(
            text(
                "ALTER TABLE account ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;"
            )
        )
        session.commit()
        logger.info("[ADMIN] Migrazione subscription completata.")
        return {"message": "Campi subscription aggiunti."}
    except Exception as e:
        logger.error(f"[ADMIN] migrate-subscription fallita: {e}")
        return {"error": str(e)}


@router.get(
    "/admin/migrate-language",
    dependencies=[Depends(verify_admin_token)],
    tags=["admin"],
)
async def migrate_language_field(session: Session = Depends(get_session)):
    try:
        session.execute(
            text(
                "ALTER TABLE account ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'it';"
            )
        )
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
async def register(req: RegisterRequest, request: Request, session: Session = Depends(get_session)):
    ip = request.client.host if request.client else "unknown"
    _check_auth_rate_limit("register", ip)
    logger.info(f"Registrazione richiesta per {req.email}")

    existing = session.exec(select(Account).where(Account.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")

    # Validazione password
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="La password deve essere di almeno 8 caratteri")
    if not any(c.isdigit() for c in req.password):
        raise HTTPException(status_code=422, detail="La password deve contenere almeno un numero")

    new_account = Account(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        name=req.name,
        surname=req.surname,
        terms_accepted=req.terms_accepted,
        privacy_accepted=req.privacy_accepted,
    )
    session.add(new_account)
    session.commit()
    session.refresh(new_account)

    smtp_user, smtp_password, smtp_conf = get_smtp_config()
    is_email_sent = False

    if smtp_user and smtp_password:
        try:
            logger.info(
                f"[AUTH] Tentativo invio email di verifica tramite {smtp_user}..."
            )
            verification_token = create_verification_token(email=req.email)
            frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")
            verification_url = f"{frontend_url}/verify?token={verification_token}"
            message = MessageSchema(
                subject="Verifica il tuo account SplitPlan ✈️",
                recipients=[req.email],
                body=verification_email(
                    name=req.name, verification_url=verification_url
                ),
                subtype=MessageType.html,
            )
            fm = FastMail(smtp_conf)
            await fm.send_message(message)
            logger.info(f"[AUTH] Email di verifica inviata con successo a {req.email}")
            is_email_sent = True
        except Exception as e:
            logger.error(f"[AUTH] Fallimento critico invio email a {req.email}: {e}")
    else:
        logger.warning("[AUTH] SMTP non configurato correttamente.")

    if not is_email_sent:
        logger.error(
            f"[AUTH] Registrazione completata per {req.email} ma l'email di verifica non è partita."
        )
        return {
            "message": "Registrazione completata, ma non siamo riusciti a inviare l'email di verifica. Contatta l'assistenza o riprova più tardi."
        }

    return {
        "message": "Registrazione completata. Controlla la tua email per la verifica."
    }


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
async def login(req: LoginRequest, request: Request, session: Session = Depends(get_session)):
    ip = request.client.host if request.client else "unknown"
    _check_auth_rate_limit("login", ip)
    account = session.exec(select(Account).where(Account.email == req.email)).first()

    if not account or not verify_password(req.password, account.hashed_password):
        raise HTTPException(status_code=401, detail="Email o password non corretti")

    if account.reset_in_progress:
        raise HTTPException(
            status_code=403,
            detail="Reset della password in corso. Usa il link inviato via email.",
        )

    if not account.is_verified:
        raise HTTPException(
            status_code=403, detail="Profilo non verificato. Controlla la tua email."
        )

    access_token = create_access_token_versioned(account.email, account.token_version)
    refresh_token = create_refresh_token(account.email)
    logger.info(f"Login effettuato per account {account.id}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
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
            "is_manager": account.is_manager,
            "company_id": account.company_id,
        },
    }


@router.get("/me", response_model=AccountResponse)
async def get_me(current_account: Account = Depends(get_current_user)):
    """Restituisce i dati dell'utente autenticato tramite JWT."""
    return current_account


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh")
async def refresh_access_token(
    body: RefreshRequest,
    session: Session = Depends(get_session),
):
    """
    Scambia un refresh token valido con un nuovo access token + refresh token.
    Il vecchio refresh token viene invalidato (rotation).
    """
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token non valido o scaduto.")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Refresh token malformato.")

    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        raise HTTPException(status_code=401, detail="Utente non trovato.")

    new_access = create_access_token_versioned(account.email, account.token_version)
    new_refresh = create_refresh_token(account.email)
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout-all")
async def logout_all(
    current_account: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Invalida tutti i JWT attivi dell'utente incrementando token_version.
    Tutti i dispositivi loggati vengono sloggati immediatamente.
    """
    current_account.token_version = (current_account.token_version or 0) + 1
    session.add(current_account)
    session.commit()
    logger.info(f"[LOGOUT-ALL] Account {current_account.id} ha invalidato tutti i token (tv={current_account.token_version})")
    return {"message": "Tutti i dispositivi sono stati disconnessi.", "token_version": current_account.token_version}


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
async def forgot_password(
    req: ForgotPasswordRequest, request: Request, session: Session = Depends(get_session)
):
    ip = request.client.host if request.client else "unknown"
    _check_auth_rate_limit("forgot_password", ip)
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
            raise HTTPException(
                status_code=500, detail="Errore nell'invio dell'email di reset"
            )
    else:
        logger.error("SMTP non configurato durante reset password.")
        raise HTTPException(
            status_code=500, detail="Configurazione email mancante sul server"
        )


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest, session: Session = Depends(get_session)
):
    payload = decode_token(req.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")

    email = payload.get("sub")
    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")

    if verify_password(req.new_password, account.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="La nuova password non può essere uguale a quella attuale",
        )

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
        current_account.subscription_expiry = (
            datetime.now(timezone.utc) + timedelta(days=days)
        ).strftime("%Y-%m-%d")
        current_account.auto_renew = True
    else:
        if plan and current_account.subscription_plan != plan:
            current_account.subscription_plan = plan
            days = 365 if plan == "ANNUAL" else 30
            current_account.subscription_expiry = (
                datetime.now(timezone.utc) + timedelta(days=days)
            ).strftime("%Y-%m-%d")
        else:
            current_account.is_subscribed = False
            current_account.subscription_plan = None
            current_account.subscription_expiry = None

    session.add(current_account)
    session.commit()
    session.refresh(current_account)
    logger.info(
        f"Subscription aggiornata per account {current_account.id}: subscribed={current_account.is_subscribed}"
    )

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


@router.delete("/delete-account")
async def delete_account(
    current_account: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Elimina permanentemente l'account dell'utente autenticato e tutti i dati associati."""
    account_id = current_account.id
    email = current_account.email

    # Elimina partecipazioni (e relative votes/expenses tramite cascade DB)
    participants = session.exec(
        select(Participant).where(Participant.account_id == account_id)
    ).all()
    for p in participants:
        session.delete(p)

    session.delete(current_account)
    session.commit()
    logger.info(f"Account {account_id} ({email}) eliminato permanentemente.")
    return {"message": "Account eliminato con successo."}


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

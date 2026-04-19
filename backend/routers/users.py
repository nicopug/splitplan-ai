import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Body, Cookie, Depends, HTTPException, Request, Response
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
from email_templates import (
    account_exists_attempt_email,
    reset_password_email,
    verification_email,
)
from models import Account, Notification, Participant, RefreshToken, Trip
from services.redis_service import check_rate_limit
from utils.email_utils import get_smtp_config

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

if not os.getenv("SMTP_USER") or not os.getenv("SMTP_PASSWORD"):
    logger.warning("SMTP Credentials non trovate in .env. L'invio email fallirà.")


# ---------------------------------------------------------------------------
# Refresh-token cookie (P0-5)
# ---------------------------------------------------------------------------
# Il refresh token non viaggia più nel body JSON: sta in un cookie
# HttpOnly, inaccessibile a JavaScript. Questo rimuove il vettore di furto
# via XSS sul token a vita lunga (7 giorni). L'access token (24h) resta
# gestito dal frontend come prima.
REFRESH_COOKIE_NAME = "sp_rt"
_IS_PROD = bool(os.getenv("VERCEL"))
# In prod `Secure` è obbligatorio (HTTPS); in dev (http://localhost) il browser
# rifiuta i cookie Secure, quindi lo lasciamo False.
_COOKIE_SECURE = _IS_PROD
# `Lax` bilancia compatibilità e protezione CSRF: i cookie non vengono inviati
# su POST cross-site ma solo su navigazioni top-level.
_COOKIE_SAMESITE = "lax"
_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 giorni, allineato al JWT


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=_REFRESH_COOKIE_MAX_AGE,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
    )


# ---------------------------------------------------------------------------
# Rate limiter (Redis-backed, serverless-safe)
# ---------------------------------------------------------------------------
# In ambiente serverless (Vercel) un rate limiter in-memory è inutile perché
# ogni invocazione può girare su un worker diverso. Lo stato viene quindi
# mantenuto in Redis (Upstash) tramite `services.redis_service`.
# Fail-open: se Redis è down l'autenticazione resta disponibile.

_RATE_LIMITS = {
    "login":           {"max": 10, "window": 900},   # 10 / 15 min
    "register":        {"max": 5,  "window": 3600},  # 5  / 1 ora
    "forgot_password": {"max": 3,  "window": 3600},  # 3  / 1 ora
}


async def _check_auth_rate_limit(endpoint: str, ip: str):
    """Solleva 429 se l'IP ha superato il limite per l'endpoint dato."""
    cfg = _RATE_LIMITS.get(endpoint)
    if not cfg:
        return
    key = f"rate_limit:{endpoint}:{ip}"
    exceeded = await check_rate_limit(key, cfg["max"], cfg["window"])
    if exceeded:
        raise HTTPException(
            status_code=429,
            detail=f"Troppi tentativi. Riprova tra {cfg['window'] // 60} minuti.",
            headers={"Retry-After": str(cfg["window"])},
        )


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


_GENERIC_REGISTER_RESPONSE = {
    "message": "Se l'email è valida, riceverai a breve un link di conferma."
}


@router.post("/register")
async def register(req: RegisterRequest, request: Request, session: Session = Depends(get_session)):
    ip = request.client.host if request.client else "unknown"
    await _check_auth_rate_limit("register", ip)
    logger.info(f"Registrazione richiesta per {req.email}")

    # Validazione password PRIMA del lookup: stessi errori 422 per email
    # esistenti e non, così non si può distinguere i due casi.
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="La password deve essere di almeno 8 caratteri")
    if not any(c.isdigit() for c in req.password):
        raise HTTPException(status_code=422, detail="La password deve contenere almeno un numero")

    smtp_user, smtp_password, smtp_conf = get_smtp_config()
    frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")

    existing = session.exec(select(Account).where(Account.email == req.email)).first()
    if existing:
        # Fix P0-3 (account enumeration): non rivelare che l'email esiste.
        # Inviamo silenziosamente un avviso all'indirizzo già registrato e
        # rispondiamo con lo stesso 200 generico del flusso nuovo utente.
        if smtp_user and smtp_password:
            try:
                login_url = f"{frontend_url}/login"
                reset_token = create_reset_token(email=req.email)
                reset_url = f"{frontend_url}/reset-password?token={reset_token}"
                message = MessageSchema(
                    subject="Tentativo di registrazione al tuo account SplitPlan",
                    recipients=[req.email],
                    body=account_exists_attempt_email(
                        name=existing.name or "utente",
                        login_url=login_url,
                        reset_url=reset_url,
                    ),
                    subtype=MessageType.html,
                )
                fm = FastMail(smtp_conf)
                await fm.send_message(message)
                logger.info(
                    f"[AUTH] Notifica silenziosa inviata a {req.email} (account già esistente)."
                )
            except Exception as e:
                logger.error(
                    f"[AUTH] Errore invio notifica silenziosa a {req.email}: {e}"
                )
        return _GENERIC_REGISTER_RESPONSE

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

    if smtp_user and smtp_password:
        try:
            logger.info(
                f"[AUTH] Tentativo invio email di verifica tramite {smtp_user}..."
            )
            verification_token = create_verification_token(email=req.email)
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
        except Exception as e:
            logger.error(f"[AUTH] Fallimento critico invio email a {req.email}: {e}")
    else:
        logger.warning("[AUTH] SMTP non configurato correttamente.")

    return _GENERIC_REGISTER_RESPONSE


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
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    ip = request.client.host if request.client else "unknown"
    await _check_auth_rate_limit("login", ip)
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
    refresh_token, jti, expires_at = create_refresh_token(account.email)
    session.add(RefreshToken(
        jti=jti,
        account_id=account.id,
        expires_at=expires_at,
    ))
    session.commit()
    logger.info(f"Login effettuato per account {account.id}")

    # P0-5: refresh token viaggia SOLO via cookie HttpOnly.
    _set_refresh_cookie(response, refresh_token)

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
            "is_manager": account.is_manager,
            "company_id": account.company_id,
        },
    }


@router.get("/me", response_model=AccountResponse)
async def get_me(current_account: Account = Depends(get_current_user)):
    """Restituisce i dati dell'utente autenticato tramite JWT."""
    return current_account


@router.post("/refresh")
async def refresh_access_token(
    response: Response,
    session: Session = Depends(get_session),
    sp_rt: Optional[str] = Cookie(default=None),
):
    """
    Scambia il refresh token (cookie HttpOnly `sp_rt`) con un nuovo access
    token + nuovo refresh token (rotato nel cookie).

    Anti-replay (RFC 6819 §5.2.2.3): se un refresh token GIÀ revocato viene
    ripresentato è un segnale di furto → revochiamo l'intera catena attiva
    dell'utente (kill di tutte le sessioni).
    """
    if not sp_rt:
        raise HTTPException(status_code=401, detail="Refresh token mancante.")

    payload = decode_token(sp_rt)
    if payload is None or payload.get("type") != "refresh":
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh token non valido o scaduto.")

    email = payload.get("sub")
    jti = payload.get("jti")
    if not email or not jti:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh token malformato.")

    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Utente non trovato.")

    record = session.exec(select(RefreshToken).where(RefreshToken.jti == jti)).first()
    if not record or record.account_id != account.id:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh token non riconosciuto.")

    now = datetime.now(timezone.utc)
    if record.revoked_at is not None:
        # Possibile riuso di un token già consumato: revoca a cascata tutte
        # le sessioni ancora attive dell'utente per mitigare il furto.
        active = session.exec(
            select(RefreshToken).where(
                RefreshToken.account_id == account.id,
                RefreshToken.revoked_at.is_(None),  # type: ignore[union-attr]
            )
        ).all()
        for r in active:
            r.revoked_at = now
            session.add(r)
        account.token_version = (account.token_version or 0) + 1
        session.add(account)
        session.commit()
        _clear_refresh_cookie(response)
        logger.warning(
            f"[AUTH] Riuso refresh token jti={jti} per account {account.id}: catena revocata."
        )
        raise HTTPException(status_code=401, detail="Refresh token già utilizzato.")

    # Assicura che la scadenza nel DB non sia passata (token legittimo ma scaduto)
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh token scaduto.")

    # Rotation: revoca il vecchio, emetti un nuovo jti.
    record.revoked_at = now
    session.add(record)

    new_access = create_access_token_versioned(account.email, account.token_version)
    new_refresh, new_jti, new_expires = create_refresh_token(account.email)
    session.add(RefreshToken(
        jti=new_jti,
        account_id=account.id,
        expires_at=new_expires,
    ))
    session.commit()

    # Rotation: il nuovo refresh token sostituisce il cookie precedente.
    _set_refresh_cookie(response, new_refresh)

    return {
        "access_token": new_access,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(
    response: Response,
    session: Session = Depends(get_session),
    sp_rt: Optional[str] = Cookie(default=None),
):
    """
    Logout single-device: revoca il refresh token corrente e cancella il
    cookie. Non richiede access token (se l'utente ha già perso l'access
    per XSS o rotazione, deve comunque poter terminare la sessione).
    """
    if sp_rt:
        payload = decode_token(sp_rt)
        if payload and payload.get("type") == "refresh":
            jti = payload.get("jti")
            if jti:
                record = session.exec(
                    select(RefreshToken).where(RefreshToken.jti == jti)
                ).first()
                if record and record.revoked_at is None:
                    record.revoked_at = datetime.now(timezone.utc)
                    session.add(record)
                    session.commit()

    _clear_refresh_cookie(response)
    return {"message": "Logout effettuato."}


@router.post("/logout-all")
async def logout_all(
    response: Response,
    current_account: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Invalida tutti i JWT attivi dell'utente incrementando token_version.
    Tutti i dispositivi loggati vengono sloggati immediatamente.
    """
    current_account.token_version = (current_account.token_version or 0) + 1
    session.add(current_account)

    # Revoca tutti i refresh token ancora attivi dell'utente (P0-4)
    now = datetime.now(timezone.utc)
    active = session.exec(
        select(RefreshToken).where(
            RefreshToken.account_id == current_account.id,
            RefreshToken.revoked_at.is_(None),  # type: ignore[union-attr]
        )
    ).all()
    for r in active:
        r.revoked_at = now
        session.add(r)

    session.commit()
    _clear_refresh_cookie(response)
    logger.info(
        f"[LOGOUT-ALL] Account {current_account.id} ha invalidato tutti i token "
        f"(tv={current_account.token_version}, refresh_revocati={len(active)})"
    )
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
    await _check_auth_rate_limit("forgot_password", ip)
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
    """
    Elimina l'account dell'utente e sanitizza i dati storici (fix P0-7).

    Strategia:
    - `Participant` viene ANONIMIZZATO (name="Utente eliminato", account_id=NULL,
      is_active=False) invece che cancellato: le Expense e i Vote puntano al
      participant.id, cancellarlo romperebbe i bilanci storici dei trip di
      gruppo dove altri utenti hanno ancora interesse legittimo.
    - `events_cache` sui trip interessati viene invalidato perché può
      contenere il nome dell'utente in chiaro (rigenerato al prossimo accesso).
    - `Notification` e `RefreshToken` vengono eliminate (dati personali,
      nessun valore storico).
    - L'Account viene cancellato per ultimo, tutto nella stessa transazione.
    """
    account_id = current_account.id
    email = current_account.email

    # 1. Anonimizza partecipazioni — preserva Expense/Vote dei trip di gruppo
    participants = session.exec(
        select(Participant).where(Participant.account_id == account_id)
    ).all()
    affected_trip_ids: set[int] = set()
    for p in participants:
        p.name = "Utente eliminato"
        p.account_id = None
        p.is_active = False
        if p.trip_id is not None:
            affected_trip_ids.add(p.trip_id)
        session.add(p)

    # 2. Invalida events_cache sui trip toccati (può contenere PII Gemini-generated)
    for trip_id in affected_trip_ids:
        trip = session.get(Trip, trip_id)
        if trip is not None:
            trip.events_cache = None
            trip.events_cache_date = None
            session.add(trip)

    # 3. Cancella notifiche (dati personali, nessun valore post-delete)
    notifications = session.exec(
        select(Notification).where(Notification.account_id == account_id)
    ).all()
    for n in notifications:
        session.delete(n)

    # 4. Cancella refresh token (rimossi anche via FK ON DELETE CASCADE,
    #    ma lo facciamo esplicito per coerenza/leggibilità).
    tokens = session.exec(
        select(RefreshToken).where(RefreshToken.account_id == account_id)
    ).all()
    for t in tokens:
        session.delete(t)

    # 5. Cancella l'account
    session.delete(current_account)
    session.commit()
    logger.info(
        f"[GDPR] Account {account_id} ({email}) eliminato. "
        f"Participant anonimizzati: {len(participants)}, "
        f"trip cache invalidate: {len(affected_trip_ids)}, "
        f"notifiche rimosse: {len(notifications)}, "
        f"refresh token rimossi: {len(tokens)}."
    )
    return {"message": "Account eliminato con successo."}


_ALLOWED_LANGUAGES = {"it", "en", "fr", "de", "es"}


@router.post("/update-language")
async def update_language(
    language: str = Body(..., embed=True),
    current_account: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if language not in _ALLOWED_LANGUAGES:
        raise HTTPException(status_code=422, detail=f"Lingua non supportata. Valori ammessi: {', '.join(sorted(_ALLOWED_LANGUAGES))}")
    current_account.language = language
    session.add(current_account)
    session.commit()
    session.refresh(current_account)
    return {"status": "success", "language": current_account.language}

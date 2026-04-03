import os
import logging
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from database import get_session
from models import Account
from auth import create_access_token
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["SSO"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

SCOPES = "openid email profile"


def _get_callback_url() -> str:
    if os.getenv("VERCEL"):
        return "https://splitplan-ai.vercel.app/api/auth/google/callback"
    return "http://localhost:8000/auth/google/callback"


def _get_client_credentials() -> tuple[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google SSO non configurato sul server")
    return client_id, client_secret


@router.get("/google/login")
async def google_login():
    client_id, _ = _get_client_credentials()

    params = {
        "client_id": client_id,
        "redirect_uri": _get_callback_url(),
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "online",
        "prompt": "select_account",
    }
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(
    code: str = Query(None),
    error: str = Query(None),
    session: Session = Depends(get_session),
):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    if error:
        logger.warning(f"Errore OAuth Google: {error}")
        return RedirectResponse(url=f"{frontend_url}/auth?error={error}")

    if not code:
        raise HTTPException(status_code=400, detail="Codice di autorizzazione mancante")

    client_id, client_secret = _get_client_credentials()

    # Scambia il code per un access token
    token_resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": _get_callback_url(),
            "grant_type": "authorization_code",
        },
        timeout=10,
    )

    if not token_resp.ok:
        logger.error(f"Errore scambio token Google: {token_resp.text}")
        raise HTTPException(status_code=400, detail="Errore durante l'autenticazione con Google")

    access_token = token_resp.json().get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Token non ricevuto da Google")

    # Recupera le info utente da Google
    userinfo_resp = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if not userinfo_resp.ok:
        raise HTTPException(status_code=400, detail="Impossibile recuperare le informazioni utente da Google")

    userinfo = userinfo_resp.json()
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email non disponibile dall'account Google")

    # Trova o crea l'utente
    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        account = Account(
            email=email,
            hashed_password="!SSO_GOOGLE_NO_PASSWORD",
            name=userinfo.get("given_name", ""),
            surname=userinfo.get("family_name", ""),
            is_verified=True,
        )
        session.add(account)
        session.commit()
        session.refresh(account)

    # Genera JWT SplitPlan
    jwt_token = create_access_token(data={"sub": account.email})

    return RedirectResponse(url=f"{frontend_url}/auth?token={jwt_token}")

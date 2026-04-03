import os
import logging
import requests
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from sqlmodel import Session, select
from database import get_session
from models import Account
from auth import create_access_token
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["SSO"])

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def _get_callback_url() -> str:
    if os.getenv("VERCEL"):
        return "https://splitplan-ai.vercel.app/api/auth/google/callback"
    return "http://localhost:8000/auth/google/callback"


def _create_flow() -> Flow:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google SSO non configurato sul server")

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [_get_callback_url()],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = _get_callback_url()
    return flow


@router.get("/google/login")
async def google_login():
    flow = _create_flow()
    auth_url, _ = flow.authorization_url(
        access_type="online",
        include_granted_scopes="true",
        prompt="select_account",
    )
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(
    request: Request,
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

    flow = _create_flow()
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        logger.error(f"Errore scambio token Google: {e}")
        raise HTTPException(status_code=400, detail="Errore durante l'autenticazione con Google")

    # Recupera le info utente da Google
    credentials = flow.credentials
    resp = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {credentials.token}"},
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(status_code=400, detail="Impossibile recuperare le informazioni utente da Google")

    userinfo = resp.json()
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email non disponibile dall'account Google")

    # Trova o crea l'utente
    account = session.exec(select(Account).where(Account.email == email)).first()
    if not account:
        account = Account(
            email=email,
            name=userinfo.get("given_name", ""),
            surname=userinfo.get("family_name", ""),
            is_verified=True,
        )
        session.add(account)
        session.commit()
        session.refresh(account)

    # Genera JWT SplitPlan
    access_token = create_access_token(data={"sub": account.email})

    return RedirectResponse(url=f"{frontend_url}/auth?token={access_token}")

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
from sqlmodel import Session, select
from ..database import get_session
from ..auth import get_current_user
from ..models import Account
import os
import json
import logging
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import datetime

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])

# Configurazione OAuth
SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly']

# Costante per il nome del cookie di sessione temporaneo
COOKIE_NAME = "oauth_session_token"

def get_flow(redirect_uri=None):
    """
    Crea e restituisce un oggetto Flow configurato per Google OAuth2.
    Supporta sia credenziali da file locale (dev) che da variabili d'ambiente (prod/Vercel).
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    # 1. Tentativo da Variabili d'Ambiente (Priorità per Vercel)
    if client_id and client_secret:
        client_config = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }
        flow = Flow.from_client_config(client_config, scopes=SCOPES)
    
    # 2. Fallback a file locale (Dev)
    else:
        # Percorso relativo alla root del progetto backend, aggiustare se necessario
        creds_path = os.path.join(os.path.dirname(__file__), "..", "client_secret.json")
        if os.path.exists(creds_path):
            flow = Flow.from_client_secrets_file(creds_path, scopes=SCOPES)
        else:
            raise HTTPException(status_code=500, detail="OAuth Credentials not found (neither Env Vars nor File)")

    # Configura il Redirect URI
    env_redirect = os.getenv("GOOGLE_REDIRECT_URI")
    
    if redirect_uri:
        # Se passato esplicitamente (es. dal frontend), usalo
        flow.redirect_uri = redirect_uri
    elif env_redirect:
        # Se definito in ENV (es. Vercel), usalo
        flow.redirect_uri = env_redirect
    else:
        # Default locale hardcodato
        flow.redirect_uri = "http://localhost:5678/api/calendar/callback"

    return flow


@router.get("/auth-url")
async def get_auth_url(redirect_uri: str = None):
    """Restituisce l'URL di autorizzazione Google a cui reindirizzare l'utente."""
    try:
        flow = get_flow(redirect_uri)
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent' # Forza il refresh token
        )
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Error generating auth url: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange-token")
async def exchange_token(payload: dict, session: Session = Depends(get_session), current_user: Account = Depends(get_current_user)):
    """
    Scambia l'authorization code ricevuto dal frontend con i token di accesso/refresh.
    Il frontend riceve il 'code' dal redirect di Google e lo invia qui.
    """
    code = payload.get("code")
    redirect_uri = payload.get("redirect_uri") # Deve matchare quello usato per generare l'URL
    
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        flow = get_flow(redirect_uri)
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        # Salva i token nel DB dell'utente corrente
        current_user.google_calendar_token = credentials.to_json()
        current_user.is_calendar_connected = True
        
        session.add(current_user)
        session.commit()
        session.refresh(current_user)
        
        return {"status": "success", "message": "Google Calendar connected successfully"}
        
    except Exception as e:
        logger.error(f"Token exchange failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to exchange token: {str(e)}")


@router.get("/status")
async def check_calendar_status(current_user: Account = Depends(get_current_user)):
    """Verifica se l'utente ha il calendario connesso."""
    return {"connected": current_user.is_calendar_connected}


@router.post("/disconnect")
async def disconnect_calendar(session: Session = Depends(get_session), current_user: Account = Depends(get_current_user)):
    """Disconnette il calendario rimuovendo i token."""
    current_user.google_calendar_token = None
    current_user.is_calendar_connected = False
    session.add(current_user)
    session.commit()
    return {"status": "success", "message": "Calendar disconnected"}

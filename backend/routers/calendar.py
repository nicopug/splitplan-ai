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
import urllib.parse
import traceback

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/ping")
async def ping():
    return {"message": "Calendar router is alive and reachable"}

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
    if os.getenv("VERCEL"):
        # Forza il link di produzione ufficiale - DEVE ESSERE UGUALE A QUELLO NELLA CONSOLE GOOGLE
        flow.redirect_uri = "https://splitplan-ai.vercel.app/api/calendar/callback"
    else:
        # Fallback locale
        flow.redirect_uri = "http://localhost:5678/api/calendar/callback"

    print(f"[CALENDAR] Using REDIRECT_URI: {flow.redirect_uri}", flush=True)
    logger.info(f"Using REDIRECT_URI: {flow.redirect_uri}")

    return flow


@router.get("/auth-url")
async def get_auth_url(trip_id: int, current_user: Account = Depends(get_current_user), redirect_uri: str = None):
    """Restituisce l'URL di autorizzazione Google a cui reindirizzare l'utente."""
    try:
        flow = get_flow(redirect_uri)
        print(f"[DEBUG] Generating Auth URL. Target redirect_uri: {flow.redirect_uri}")
        # Usiamo un formato semplice per lo state per evitare problemi di encoding JSON
        state_data = f"{trip_id}:{current_user.id}"
        
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=state_data
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


@router.get("/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None, 
    state: Optional[str] = None, 
    error: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Callback di Google che riceve il codice di autorizzazione."""
    logger.info(f"CALLBACK RECEIVED - code present: {bool(code)}, state: {state}, error: {error}")
    print(f"[CALENDAR] CALLBACK - code: {bool(code)}, state: {state}, error: {error}", flush=True)
    
    try:
        # Se Google restituisce un errore (es. utente ha annullato)
        if error:
            logger.error(f"Google returned error: {error}")
            return RedirectResponse(f"https://splitplan-ai.vercel.app?calendar_error={error}")

        if not code or not state:
            logger.error("Missing code or state in callback")
            return RedirectResponse("https://splitplan-ai.vercel.app?calendar_error=missing_data")

        # Decodifica lo stato (formato "trip_id:account_id" o "trip_id_account_id")
        # Usiamo un separatore più sicuro se necessario, ma gestiamo entrambi
        separator = ":" if ":" in state else "_"
        parts = state.split(separator)
        
        if len(parts) < 2:
            logger.error(f"Invalid state format: {state}")
            return RedirectResponse("https://splitplan-ai.vercel.app?calendar_error=invalid_state")
            
        trip_id = parts[0]
        account_id = int(parts[1])
        logger.info(f"Processing for trip {trip_id}, account {account_id}")
        
        # Scambia il codice per i token
        flow = get_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        user = session.get(Account, account_id)
        if user:
            user.google_calendar_token = credentials.to_json()
            user.is_calendar_connected = True
            session.add(user)
            session.commit()
            logger.info("Calendar connection saved to DB")
        else:
            logger.error(f"User {account_id} not found")
            return RedirectResponse("https://splitplan-ai.vercel.app?calendar_error=user_not_found")
        
        final_redirect = f"https://splitplan-ai.vercel.app/trip/{trip_id}?calendar_success=true"
        logger.info(f"Success! Redirecting to {final_redirect}")
        return RedirectResponse(final_redirect)
        
    except Exception as e:
        logger.error(f"CALLBACK FATAL ERROR: {str(e)}")
        logger.error(traceback.format_exc())
        err_msg = urllib.parse.quote(str(e))
        return RedirectResponse(f"https://splitplan-ai.vercel.app?calendar_error={err_msg}")


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

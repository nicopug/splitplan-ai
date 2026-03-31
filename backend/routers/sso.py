import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi_sso.sso.google import GoogleSSO
from sqlmodel import Session, select
from database import get_session
from models import Account
from auth import create_access_token
from dotenv import load_dotenv

# Forza il caricamento del .env
load_dotenv()

router = APIRouter(prefix="/auth", tags=["SSO"])

# Debug per te: controlla cosa legge all'avvio
print(f"DEBUG SSO - Client ID: {os.getenv('GOOGLE_CLIENT_ID')}")
print(f"DEBUG SSO - Redirect URI: {os.getenv('REDIRECT_URI')}")

@router.get("/google/login")
async def google_login():
    sso = GoogleSSO(
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        redirect_uri="http://localhost:8000/auth/google/callback" 
    )

    print(f"--- DEBUG: Sto inviando a Google questo redirect_uri: '{sso.redirect_uri}' ---")
    
    if not sso.redirect_uri:
        raise HTTPException(status_code=500, detail="Configurazione REDIRECT_URI mancante nel server")
    async with sso:
        return await sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(session: Session = Depends(get_session)):
    with google_sso:
        user_info = await google_sso.verify_and_process()
    
    email = user_info.email
    
    # 1. Cerchiamo l'utente nel DB
    account = session.exec(select(Account).where(Account.email == email)).first()
    
    # 2. Se non esiste, lo creiamo in automatico (Registrazione Seamless)
    if not account:
        account = Account(
            email=email,
            name=user_info.first_name,
            surname=user_info.last_name or "",
            is_verified=True,  # Google lo ha già verificato!
            sso_provider="google"
        )
        session.add(account)
        session.commit()
        session.refresh(account)
    
    # 3. Generiamo IL TUO Token JWT di SplitPlan
    access_token = create_access_token(data={"sub": account.email})
    
    # 4. Riportiamo l'utente al frontend React con il token
    # (Il frontend leggerà l'URL, salverà il token nel localStorage e pulirà l'URL)
    return RedirectResponse(url=f"https://splitplan-ai.vercel.app/checkout-success?token={access_token}")
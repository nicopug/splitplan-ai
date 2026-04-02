import os
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from fastapi_sso.sso.google import GoogleSSO
from sqlmodel import Session, select
from database import get_session
from models import Account
from auth import create_access_token
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["SSO"])


def _get_callback_url() -> str:
    """Build the OAuth callback URL dynamically based on environment."""
    if os.getenv("VERCEL"):
        return "https://splitplan-ai.vercel.app/api/auth/google/callback"
    return "http://localhost:8000/auth/google/callback"


def _get_google_sso(redirect_uri: str) -> GoogleSSO:
    """Create a GoogleSSO instance with the given redirect_uri."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google SSO non configurato sul server")
    return GoogleSSO(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
    )


@router.get("/google/login")
async def google_login():
    callback_url = _get_callback_url()
    sso = _get_google_sso(callback_url)
    async with sso:
        return await sso.get_login_redirect()


@router.get("/google/callback")
async def google_callback(request: Request, session: Session = Depends(get_session)):
    callback_url = _get_callback_url()
    sso = _get_google_sso(callback_url)
    async with sso:
        user_info = await sso.verify_and_process(request)

    if not user_info or not user_info.email:
        raise HTTPException(status_code=400, detail="Impossibile recuperare le informazioni utente da Google")

    email = user_info.email

    # 1. Cerchiamo l'utente nel DB
    account = session.exec(select(Account).where(Account.email == email)).first()

    # 2. Se non esiste, lo creiamo (Google ha già verificato l'email)
    if not account:
        account = Account(
            email=email,
            name=user_info.first_name or "",
            surname=user_info.last_name or "",
            is_verified=True,
        )
        session.add(account)
        session.commit()
        session.refresh(account)

    # 3. Generiamo il JWT di SplitPlan
    access_token = create_access_token(data={"sub": account.email})

    # 4. Redirect al frontend con il token
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/auth?token={access_token}")

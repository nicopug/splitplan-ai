from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session, select
from typing import List, Optional
from ..database import get_session
from ..models import Account, User
from ..auth import get_password_hash, verify_password, create_access_token, decode_token, create_verification_token
from pydantic import EmailStr, BaseModel
import os
from dotenv import load_dotenv
import resend

load_dotenv()

router = APIRouter(prefix="/users", tags=["users"])

# --- Resend Config ---
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    print(f"[OK] Resend API Key loaded: {RESEND_API_KEY[:10]}***")
else:
    print("[WARNING] RESEND_API_KEY not found. Email sending will fail.")

class RegisterRequest(BaseModel):
    name: str
    surname: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.get("/test-register")
async def test_register():
    return {"message": "Endpoint raggiungibile!"}

@router.post("/register")
async def register(req: RegisterRequest, session: Session = Depends(get_session)):
    print(f"DEBUG: Registrazione richiesta per {req.email}")
    # Check if user already exists
    statement = select(Account).where(Account.email == req.email)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email gia registrata")
    
    # Create account
    new_account = Account(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        name=req.name,
        surname=req.surname
    )
    session.add(new_account)
    session.commit()
    session.refresh(new_account)
    
    # Send verification email via Resend
    token = create_verification_token(req.email)
    verification_url = f"http://localhost:5173/auth?token={token}"
    
    try:
        params = {
            "from": "SplitPlan <onboarding@resend.dev>",
            "to": [req.email],
            "subject": "Verifica il tuo account SplitPlan",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #23599E;">Benvenuto su SplitPlan!</h1>
                    <p>Ciao <strong>{req.name}</strong>,</p>
                    <p>Grazie per esserti registrato. Clicca il pulsante qui sotto per verificare il tuo account:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" 
                           style="background: #23599E; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Verifica Email
                        </a>
                    </div>
                    <p style="color: #666; font-size: 0.9em;">
                        Se non riesci a cliccare il pulsante, copia e incolla questo link nel browser:<br/>
                        <a href="{verification_url}">{verification_url}</a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
                    <p style="color: #999; font-size: 0.8em;">
                        Se non hai richiesto questa registrazione, ignora questa email.
                    </p>
                </div>
            """
        }
        email_response = resend.Emails.send(params)
        print(f"[OK] Email di verifica inviata a {req.email} - ID: {email_response.get('id', 'N/A')}")
    except Exception as e:
        print(f"[ERROR] Errore nell'invio dell'email: {e}")
        # Non blocchiamo la registrazione se l'email fallisce
    
    return {"message": "Registrazione completata. Controlla la tua email per la verifica."}

@router.get("/verify-email")
async def verify_email(token: str, session: Session = Depends(get_session)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "verification":
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    
    email = payload.get("sub")
    statement = select(Account).where(Account.email == email)
    account = session.exec(statement).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    
    account.is_verified = True
    session.add(account)
    session.commit()
    
    return {"message": "Email verificata con successo!"}

@router.post("/login")
async def login(req: LoginRequest, session: Session = Depends(get_session)):
    statement = select(Account).where(Account.email == req.email)
    account = session.exec(statement).first()
    
    if not account or not verify_password(req.password, account.hashed_password):
        raise HTTPException(status_code=401, detail="Email o password non corretti")
    
    if not account.is_verified:
        raise HTTPException(status_code=403, detail="Profilo non verificato. Controlla la tua email.")
    
    access_token = create_access_token(data={"sub": account.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "name": account.name,
            "surname": account.surname,
            "email": account.email,
            "is_subscribed": account.is_subscribed
        }
    }

@router.get("/me")
async def get_me(email: str = Body(..., embed=True), session: Session = Depends(get_session)):
    # In a real app, this would use the JWT from headers, but for simplicity:
    statement = select(Account).where(Account.email == email)
    account = session.exec(statement).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    
    return account

@router.post("/toggle-subscription")
async def toggle_subscription(email: str = Body(..., embed=True), session: Session = Depends(get_session)):
    statement = select(Account).where(Account.email == email)
    account = session.exec(statement).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    
    account.is_subscribed = not account.is_subscribed
    session.add(account)
    session.commit()
    session.refresh(account)
    
    return {"is_subscribed": account.is_subscribed}

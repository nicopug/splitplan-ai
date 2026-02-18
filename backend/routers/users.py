from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session, select
from typing import List, Optional
from ..database import get_session
from ..models import Account, Participant
from ..auth import get_password_hash, verify_password, create_access_token, decode_token, create_verification_token, create_reset_token
from pydantic import EmailStr, BaseModel
import os
from dotenv import load_dotenv
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from sqlalchemy import text

load_dotenv()

router = APIRouter(prefix="/users", tags=["users"])

# --- SMTP Config check ---
if not os.getenv("SMTP_USER") or not os.getenv("SMTP_PASSWORD"):
    print("[WARNING] SMTP Credentials not found in .env. Email sending will fail.")

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

@router.get("/test-register")
async def test_register():
    return {"message": "Endpoint raggiungibile!"}

@router.get("/migrate-db-security")
async def migrate_db_security(session: Session = Depends(get_session)):
    try:
        # Aggiungiamo la colonna reset_in_progress alla tabella account
        # Usiamo text() per eseguire SQL grezzo
        session.execute(text("ALTER TABLE account ADD COLUMN IF NOT EXISTS reset_in_progress BOOLEAN DEFAULT FALSE;"))
        session.commit()
        return {"message": "Migrazione completata con successo! La colonna reset_in_progress è stata aggiunta."}
    except Exception as e:
        return {"error": str(e), "message": "Potrebbe essere che la colonna esiste già o c'è un errore di connessione."}

@router.post("/register")
async def register(req: RegisterRequest, session: Session = Depends(get_session)):
    print(f"DEBUG: Registrazione richiesta per {req.email}")
    # Check if user already exists
    statement = select(Account).where(Account.email == req.email)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
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

    # Send verification email via SMTP (fastapi-mail)
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if smtp_user and smtp_password:
        try:
            verification_token = create_verification_token(email=req.email)
            frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")
            verification_url = f"{frontend_url}/verify?token={verification_token}"
            message = MessageSchema(
                subject="Verifica il tuo account SplitPlan",
                recipients=[req.email],
                body=f"""
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
                """,
                subtype=MessageType.html
            )
            
            # Configure SMTP (Resend uses port 465 with SSL)
            conf = ConnectionConfig(
                MAIL_USERNAME=smtp_user,
                MAIL_PASSWORD=smtp_password,
                MAIL_FROM=os.getenv("SMTP_FROM", smtp_user),
                MAIL_PORT=int(os.getenv("SMTP_PORT", 465)),
                MAIL_SERVER=os.getenv("SMTP_HOST", "smtp.resend.com"),
                MAIL_STARTTLS=False,
                MAIL_SSL_TLS=True,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True
            )

            fm = FastMail(conf)
            await fm.send_message(message)
            print(f"[OK] Email SMTP inviata a {req.email}")
            
        except Exception as e:
            print(f"[ERROR] Errore nell'invio SMTP: {e}")
            # Non blocchiamo la registrazione se l'email fallisce
    else:
        print("[WARNING] SMTP settings missing. Skipping email.")

    return {"message": "Registrazione completata. Controlla la tua email per la verifica."}

@router.get("/debug-env")
async def debug_env():
    return {
        "db_url_set": bool(os.getenv("DATABASE_URL")),
        "smtp_user_set": bool(os.getenv("SMTP_USER")),
        "smtp_password_set": bool(os.getenv("SMTP_PASSWORD")),
        "secret_key_set": bool(os.getenv("SECRET_KEY"))
    }

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

@router.get("/validate-reset-token")
async def validate_reset_token(token: str, session: Session = Depends(get_session)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    
    email = payload.get("sub")
    statement = select(Account).where(Account.email == email)
    account = session.exec(statement).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    
    # Una volta che il link viene "cliccato" (validato), blocchiamo la vecchia password
    account.reset_in_progress = True
    session.add(account)
    session.commit()
    
    return {"message": "Token valido. Prosegui con il reset."}

@router.post("/login")
async def login(req: LoginRequest, session: Session = Depends(get_session)):
    statement = select(Account).where(Account.email == req.email)
    account = session.exec(statement).first()
    
    if not account or not verify_password(req.password, account.hashed_password):
        raise HTTPException(status_code=401, detail="Email o password non corretti")
    
    if account.reset_in_progress:
        raise HTTPException(status_code=403, detail="Reset della password in corso. Usa il link inviato via email.")

    if not account.is_verified:
        raise HTTPException(status_code=403, detail="Profilo non verificato. Controlla la tua email.")
    
    access_token = create_access_token(data={"sub": account.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": account.id,
            "name": account.name,
            "surname": account.surname,
            "email": account.email,
            "is_subscribed": account.is_subscribed,
            "credits": account.credits
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

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, session: Session = Depends(get_session)):
    statement = select(Account).where(Account.email == req.email)
    account = session.exec(statement).first()
    
    if not account:
        return {"message": "Se l'email è registrata, riceverai un link di reset."}
    
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if smtp_user and smtp_password:
        try:
            reset_token = create_reset_token(email=req.email)
            frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")
            reset_url = f"{frontend_url}/reset-password?token={reset_token}"
            
            message = MessageSchema(
                subject="Reset della password SplitPlan",
                recipients=[req.email],
                body=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #23599E;">Reset Password</h1>
                        <p>Ciao <strong>{account.name}</strong>,</p>
                        <p>Abbiamo ricevuto una richiesta di reset per la tua password. Clicca il pulsante qui sotto per impostarne una nuova:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{reset_url}" 
                               style="background: #E87C3E; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Reimposta Password
                            </a>
                        </div>
                        <p style="color: #666; font-size: 0.9em;">Il link scadrà tra 1 ora.</p>
                        <p style="color: #666; font-size: 0.9em;">
                            Se non riesci a cliccare il pulsante, copia e incolla questo link nel browser:<br/>
                            <a href="{reset_url}">{reset_url}</a>
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
                        <p style="color: #999; font-size: 0.8em;">
                            Se non hai richiesto tu il reset, ignora questa email.
                        </p>
                    </div>
                """,
                subtype=MessageType.html
            )
            
            conf = ConnectionConfig(
                MAIL_USERNAME=smtp_user,
                MAIL_PASSWORD=smtp_password,
                MAIL_FROM=os.getenv("SMTP_FROM", smtp_user),
                MAIL_PORT=int(os.getenv("SMTP_PORT", 465)),
                MAIL_SERVER=os.getenv("SMTP_HOST", "smtp.resend.com"),
                MAIL_STARTTLS=False,
                MAIL_SSL_TLS=True,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True
            )

            fm = FastMail(conf)
            await fm.send_message(message)
            return {"message": "Email di reset inviata correttamente."}
            
        except Exception as e:
            print(f"[ERROR] Reset Password Email failed: {e}")
            raise HTTPException(status_code=500, detail="Errore nell'invio dell'email di reset")
    else:
        print("[ERROR] SMTP Credentials missing!")
        raise HTTPException(status_code=500, detail="Configurazione email mancante sul server")


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, session: Session = Depends(get_session)):
    payload = decode_token(req.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    
    email = payload.get("sub")
    statement = select(Account).where(Account.email == email)
    account = session.exec(statement).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    
    # Verifichiamo che la nuova password non sia uguale alla vecchia
    if verify_password(req.new_password, account.hashed_password):
        raise HTTPException(status_code=400, detail="La nuova password non può essere uguale a quella attuale")
    
    account.hashed_password = get_password_hash(req.new_password)
    account.reset_in_progress = False # Sblocchiamo l'accesso con la nuova password
    session.add(account)
    session.commit()
    
    return {"message": "Password aggiornata con successo! Ora puoi accedere."}

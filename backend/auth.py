from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
import bcrypt

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY env variable is not set!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_access_token_versioned(email: str, token_version: int) -> str:
    """Access token con token_version incorporato — supporta logout-all."""
    return create_access_token(data={"sub": email, "tv": token_version})


def create_refresh_token(email: str) -> str:
    return create_access_token(
        data={"sub": email, "type": "refresh"},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_verification_token(email: str):
    return create_access_token(
        data={"sub": email, "type": "verification"}, expires_delta=timedelta(hours=24)
    )


def create_reset_token(email: str):
    return create_access_token(
        data={"sub": email, "type": "reset"}, expires_delta=timedelta(hours=1)
    )


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# --- Security Dependencies ---
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from database import get_session
from models import Account

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # Rifiuta token di verifica email o di reset password usati come access token
    token_type = payload.get("type")
    if token_type in ("verification", "reset"):
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    statement = select(Account).where(Account.email == email)
    account = session.exec(statement).first()

    if account is None:
        raise credentials_exception

    # Se il token porta token_version, verifica che coincida con quello in DB
    token_version = payload.get("tv")
    if token_version is not None and token_version != account.token_version:
        raise credentials_exception

    return account

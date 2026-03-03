from fastapi import Header, HTTPException
import os

def verify_admin_token(x_admin_token: str = Header(...)):
    """
    Protegge gli endpoint admin tramite header X-Admin-Token.
    Imposta ADMIN_TOKEN nelle variabili d'ambiente Vercel.
    """
    admin_token = os.getenv("ADMIN_TOKEN")
    if not admin_token:
        raise HTTPException(status_code=503, detail="ADMIN_TOKEN non configurato sul server.")
    if x_admin_token != admin_token:
        raise HTTPException(status_code=403, detail="Token admin non valido.")
import logging
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from auth import get_current_user, create_access_token, decode_token
from models import Account, Company

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["Companies"])

# Durata del token di invito: 7 giorni
INVITE_TOKEN_EXPIRE = timedelta(days=7)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AccountSummary(BaseModel):
    id: int
    email: str
    name: str
    surname: str
    is_manager: bool

    model_config = {"from_attributes": True}


class CompanyDashboardResponse(BaseModel):
    id: int
    name: str
    max_budget_per_trip: Optional[float]
    total_members: int
    members: list[AccountSummary]

    model_config = {"from_attributes": True}


class JoinCompanyRequest(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# POST /companies/ — RIMOSSO (Sales-Led B2B: solo l'admin può creare aziende)
# La creazione avviene tramite POST /admin/approve-b2b in main.py
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# GET /companies/{company_id}/dashboard
# ---------------------------------------------------------------------------

@router.get("/{company_id}/dashboard", response_model=CompanyDashboardResponse)
async def get_company_dashboard(
    company_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Restituisce i dettagli dell'azienda e la lista dei membri.
    Accessibile solo dal manager della stessa azienda.
    """
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Azienda non trovata.")

    if not current_user.is_manager or current_user.company_id != company_id:
        raise HTTPException(
            status_code=403,
            detail="Accesso negato. Solo i manager dell'azienda possono accedere a questa dashboard.",
        )

    members = session.exec(
        select(Account).where(Account.company_id == company_id)
    ).all()

    return CompanyDashboardResponse(
        id=company.id,
        name=company.name,
        max_budget_per_trip=company.max_budget_per_trip,
        total_members=len(members),
        members=[
            AccountSummary(
                id=m.id,
                email=m.email,
                name=m.name,
                surname=m.surname,
                is_manager=m.is_manager,
            )
            for m in members
        ],
    )


# ---------------------------------------------------------------------------
# GET /companies/invite-token  (solo Manager)
# ---------------------------------------------------------------------------

@router.get("/invite-token", response_model=dict)
async def get_invite_token(
    current_user: Account = Depends(get_current_user),
):
    """
    Genera un JWT di invito valido 7 giorni.
    Solo i manager possono ottenerlo.
    """
    if not current_user.is_manager:
        raise HTTPException(status_code=403, detail="Solo i manager possono generare inviti.")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="L'account non è associato ad alcuna azienda.")

    token = create_access_token(
        data={"action": "join_company", "company_id": current_user.company_id},
        expires_delta=INVITE_TOKEN_EXPIRE,
    )
    logger.info(f"[INVITE] Manager {current_user.email} ha generato un token di invito per company_id={current_user.company_id}")
    return {"invite_token": token, "expires_in_days": 7}


# ---------------------------------------------------------------------------
# POST /companies/join  (Dipendente B2C)
# ---------------------------------------------------------------------------

@router.post("/join", response_model=dict)
async def join_company(
    body: JoinCompanyRequest,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Unisce l'utente loggato all'azienda specificata nel token di invito.
    L'utente NON diventa manager.
    """
    payload = decode_token(body.token)
    if payload is None or payload.get("action") != "join_company":
        raise HTTPException(status_code=400, detail="Token di invito non valido o scaduto.")

    company_id = payload.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Token di invito malformato.")

    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Azienda non trovata.")

    if current_user.company_id == company_id:
        return {"message": "Sei già membro di questa azienda."}

    current_user.company_id = company_id
    current_user.is_manager = False
    session.add(current_user)
    session.commit()

    logger.info(f"[JOIN] {current_user.email} si è unito all'azienda '{company.name}' (id={company_id})")
    return {"message": f"Benvenuto in {company.name}!", "company_id": company_id}

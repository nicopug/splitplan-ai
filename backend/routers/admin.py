import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, func

from database import get_session
from admin_auth import verify_admin_token
from models import Account, Company, DemoLead

logger = logging.getLogger(__name__)

# Tutte le route di questo router sono automaticamente protette da X-Admin-Token
router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_token)],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ApproveB2BRequest(BaseModel):
    account_email: str
    company_name: str
    max_budget: Optional[float] = None


class StatsResponse(BaseModel):
    total_users: int
    total_companies: int
    pending_leads: int


class LeadResponse(BaseModel):
    id: int
    full_name: str
    company_name: str
    work_email: str
    phone_number: Optional[str]
    team_size: str
    travel_frequency: str
    message: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# GET /admin/verify-token
# ---------------------------------------------------------------------------

@router.get("/verify-token")
def verify_token():
    """Verifica che il token admin sia valido. Ritorna 200 se ok, 403 se non valido."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /admin/stats
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=StatsResponse)
def get_stats(session: Session = Depends(get_session)):
    """Statistiche globali per la Super-Admin Dashboard."""
    total_users = session.exec(select(func.count()).select_from(Account)).one()
    total_companies = session.exec(select(func.count()).select_from(Company)).one()
    pending_leads = session.exec(select(func.count()).select_from(DemoLead)).one()

    return StatsResponse(
        total_users=total_users,
        total_companies=total_companies,
        pending_leads=pending_leads,
    )


# ---------------------------------------------------------------------------
# GET /admin/leads
# ---------------------------------------------------------------------------

@router.get("/leads", response_model=List[LeadResponse])
def get_leads(session: Session = Depends(get_session)):
    """Tutti i lead demo, dal più recente al più vecchio."""
    leads = session.exec(
        select(DemoLead).order_by(DemoLead.created_at.desc())
    ).all()

    return [
        LeadResponse(
            id=lead.id,
            full_name=lead.full_name,
            company_name=lead.company_name,
            work_email=lead.work_email,
            phone_number=lead.phone_number,
            team_size=lead.team_size,
            travel_frequency=lead.travel_frequency,
            message=lead.message,
            created_at=lead.created_at.isoformat(),
        )
        for lead in leads
    ]


# ---------------------------------------------------------------------------
# POST /admin/approve-b2b
# ---------------------------------------------------------------------------

@router.post("/approve-b2b")
def approve_b2b(
    body: ApproveB2BRequest,
    session: Session = Depends(get_session),
):
    """
    Sales-Led B2B onboarding:
    Crea una nuova Company e promuove l'Account specificato a manager.
    """
    account = session.exec(
        select(Account).where(Account.email == body.account_email)
    ).first()
    if not account:
        raise HTTPException(
            status_code=404,
            detail=f"Nessun account trovato con email: {body.account_email}",
        )

    company = Company(name=body.company_name, max_budget_per_trip=body.max_budget)
    session.add(company)
    session.commit()
    session.refresh(company)

    account.company_id = company.id
    account.is_manager = True
    session.add(account)
    session.commit()

    logger.info(f"[ADMIN] Azienda '{company.name}' (id={company.id}) creata, manager: {account.email}")
    return {
        "company_id": company.id,
        "company_name": company.name,
        "manager_email": account.email,
        "max_budget": company.max_budget_per_trip,
    }

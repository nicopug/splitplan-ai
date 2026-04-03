import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from auth import get_current_user
from models import Account, Company

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["Companies"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class CompanyCreate(BaseModel):
    name: str
    max_budget_per_trip: Optional[float] = None


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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=dict)
async def create_company(
    body: CompanyCreate,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Crea una nuova azienda e assegna il creatore come manager.
    Chiunque puo' creare un'azienda; il creatore diventa automaticamente manager.
    """
    company = Company(
        name=body.name,
        max_budget_per_trip=body.max_budget_per_trip,
    )
    session.add(company)
    session.commit()
    session.refresh(company)

    # Il creatore diventa manager dell'azienda
    current_user.company_id = company.id
    current_user.is_manager = True
    session.add(current_user)
    session.commit()

    logger.info(f"[COMPANY] Creata azienda '{company.name}' (id={company.id}) da {current_user.email}")
    return {"id": company.id, "name": company.name, "message": "Azienda creata con successo."}


@router.get("/{company_id}/dashboard", response_model=CompanyDashboardResponse)
async def get_company_dashboard(
    company_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Restituisce i dettagli dell'azienda e la lista dei membri.
    Accessibile solo da manager della stessa azienda.
    """
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Azienda non trovata.")

    # Solo manager della stessa azienda possono vedere la dashboard
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

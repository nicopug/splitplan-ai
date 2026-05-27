import os
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel
from sqlmodel import Session, select, func

from database import get_session
from admin_auth import verify_admin_token
from models import Account, Company, DemoLead
from utils.email_utils import get_smtp_config
from email_templates import b2b_manager_welcome_email

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

async def _send_manager_welcome(company_name: str, manager_email: str):
    """Invia al referente B2B (senza account) l'invito a registrarsi e diventare manager."""
    smtp_user, smtp_password, smtp_conf = get_smtp_config()
    if not smtp_user or not smtp_password:
        logger.warning("[ADMIN] SMTP non configurato. Salto email benvenuto manager.")
        return
    frontend_url = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")
    register_url = f"{frontend_url}/auth?mode=register&email={manager_email}"
    try:
        message = MessageSchema(
            subject="Il tuo spazio aziendale SplitPlan è pronto 🎉",
            recipients=[manager_email],
            body=b2b_manager_welcome_email(company_name=company_name, register_url=register_url),
            subtype=MessageType.html,
        )
        await FastMail(smtp_conf).send_message(message)
        logger.info(f"[ADMIN] Email benvenuto manager inviata a {manager_email}")
    except Exception as e:
        logger.error(f"[ADMIN] Invio email benvenuto manager fallito per {manager_email}: {e}")


@router.post("/approve-b2b")
def approve_b2b(
    body: ApproveB2BRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """
    Sales-Led B2B onboarding. Due casi:
    1. Esiste già un account con quell'email -> viene promosso subito a manager.
    2. Nessun account -> l'azienda viene creata con un "manager in attesa"
       (pending_manager_email) e parte una mail di invito. Alla registrazione
       con quella stessa email l'utente diventa automaticamente manager.
    """
    email = body.account_email.strip()
    account = session.exec(
        select(Account).where(func.lower(Account.email) == email.lower())
    ).first()

    company = Company(
        name=body.company_name,
        max_budget_per_trip=body.max_budget,
        pending_manager_email=None if account else email,
    )
    session.add(company)
    session.commit()
    session.refresh(company)

    if account:
        # Caso 1: promozione immediata
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
            "pending_manager": False,
        }

    # Caso 2: manager in attesa di registrazione
    background_tasks.add_task(_send_manager_welcome, company.name, email)
    logger.info(f"[ADMIN] Azienda '{company.name}' (id={company.id}) creata, manager in attesa: {email}")
    return {
        "company_id": company.id,
        "company_name": company.name,
        "manager_email": email,
        "max_budget": company.max_budget_per_trip,
        "pending_manager": True,
    }

import asyncio
import csv
import io
import logging
from datetime import timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from auth import get_current_user, create_access_token, decode_token
from models import Account, Company, Trip, Participant, Expense
from utils.email_utils import get_smtp_config

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


# ---------------------------------------------------------------------------
# POST /companies/{company_id}/invite-bulk  (solo Manager)
# ---------------------------------------------------------------------------

class BulkInviteRequest(BaseModel):
    emails: List[str]


@router.post("/{company_id}/invite-bulk")
async def invite_bulk(
    company_id: int,
    body: BulkInviteRequest,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Invia email di invito a una lista di indirizzi (max 50).
    Solo i manager della stessa company possono usarlo.
    """
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Azienda non trovata.")
    if not current_user.is_manager or current_user.company_id != company_id:
        raise HTTPException(status_code=403, detail="Solo i manager possono inviare inviti.")

    emails = body.emails[:50]  # hard cap
    if not emails:
        raise HTTPException(status_code=400, detail="Nessuna email fornita.")

    # Genera token d'invito condiviso
    invite_token = create_access_token(
        data={"action": "join_company", "company_id": company_id},
        expires_delta=INVITE_TOKEN_EXPIRE,
    )
    frontend_url = __import__("os").getenv("FRONTEND_URL", "https://splitplan.ai")
    invite_url = f"{frontend_url}/join?token={invite_token}"

    _, _, smtp_conf = get_smtp_config()

    sent: List[str] = []
    failed: List[str] = []

    for email in emails:
        email = email.strip().lower()
        if not email or "@" not in email:
            failed.append(email)
            continue

        if smtp_conf:
            try:
                html = (
                    f"<p>{current_user.name} ti ha invitato a unirti a <strong>{company.name}</strong> su SplitPlan.</p>"
                    f"<p><a href='{invite_url}'>Clicca qui per accettare l'invito</a></p>"
                    f"<p style='color:#888;font-size:12px'>Link valido 7 giorni.</p>"
                )
                message = MessageSchema(
                    subject=f"Sei invitato a {company.name} su SplitPlan",
                    recipients=[email],
                    body=html,
                    subtype=MessageType.html,
                )
                fm = FastMail(smtp_conf)
                await fm.send_message(message)
                sent.append(email)
            except Exception as e:
                logger.warning(f"[INVITE-BULK] Email fallita per {email}: {e}")
                failed.append(email)
        else:
            # SMTP non configurato: logga l'URL e segna come "inviato" in test/dev
            logger.info(f"[INVITE-BULK] (no SMTP) {email} → {invite_url}")
            sent.append(email)

    logger.info(f"[INVITE-BULK] Manager {current_user.email}: {len(sent)} inviati, {len(failed)} falliti")
    return {"sent": len(sent), "failed": failed, "invite_url": invite_url}


# ---------------------------------------------------------------------------
# GET /companies/{company_id}/expenses/export  (solo Manager)
# ---------------------------------------------------------------------------

@router.get("/{company_id}/expenses/export")
async def export_company_expenses(
    company_id: int,
    month: Optional[str] = Query(None, description="Filtro mese YYYY-MM"),
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Esporta in CSV tutte le spese dei trip aziendali.
    Colonne: Data, Viaggio, Dipendente, Categoria, Importo (EUR), Valuta.
    Filtro opzionale per mese (YYYY-MM).
    Solo i manager della stessa company possono accedere.
    """
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Azienda non trovata")
    if not current_user.is_manager or current_user.company_id != company_id:
        raise HTTPException(403, "Accesso riservato ai manager dell'azienda")

    # Raccoglie tutti i trip BUSINESS della company tramite i partecipanti
    company_member_ids = [
        a.id for a in session.exec(
            select(Account).where(Account.company_id == company_id)
        ).all()
    ]

    # Trip in cui almeno un organizzatore è membro della company
    company_trips = session.exec(
        select(Trip).join(Participant, Trip.id == Participant.trip_id).where(
            Participant.account_id.in_(company_member_ids),
            Participant.is_organizer == True,
            Trip.trip_intent == "BUSINESS",
        )
    ).all()

    # Raccoglie tutte le spese con filtro mese opzionale
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Data", "Viaggio", "Destinazione", "Dipendente", "Descrizione", "Categoria", "Importo", "Valuta", "Stato"])

    for trip in company_trips:
        expenses = session.exec(
            select(Expense).where(Expense.trip_id == trip.id)
        ).all()

        for exp in expenses:
            # Filtro mese
            if month and exp.date:
                if not str(exp.date).startswith(month):
                    continue

            # Nome pagante
            payer_name = "—"
            if exp.payer_id:
                payer_part = session.get(Participant, exp.payer_id)
                if payer_part:
                    payer_name = payer_part.name

            writer.writerow([
                exp.date or "—",
                trip.name,
                trip.destination or "—",
                payer_name,
                exp.description or "—",
                exp.category or "General",
                f"{exp.amount:.2f}",
                exp.currency or "EUR",
                trip.status,
            ])

    output.seek(0)
    filename = f"SpeseSplitPlan_{company_id}"
    if month:
        filename += f"_{month}"
    filename += ".csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

import csv
import io
import logging
from collections import defaultdict
from datetime import timedelta, datetime, timezone
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
from email_templates import company_invite_email
from services.notification_service import notify_managers

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
    billing_email: Optional[str]
    vat_number: Optional[str]
    billing_address: Optional[str]
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
        billing_email=company.billing_email,
        vat_number=company.vat_number,
        billing_address=company.billing_address,
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

    # Notifica i manager della company del nuovo membro
    notify_managers(
        session=session,
        company_id=company_id,
        type="new_member",
        title="Nuovo membro nel team",
        message=f"{current_user.name} {current_user.surname} ({current_user.email}) si è unito all'azienda.",
    )
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
                message = MessageSchema(
                    subject=f"Sei invitato a {company.name} su SplitPlan",
                    recipients=[email],
                    body=company_invite_email(company_name=company.name, invite_url=invite_url),
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
    date_from: Optional[str] = Query(None, description="Data inizio YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Data fine YYYY-MM-DD"),
    employee_id: Optional[int] = Query(None, description="ID account dipendente"),
    status: Optional[str] = Query(None, description="Stato trip: APPROVED, COMPLETED, ecc."),
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Esporta in CSV le spese dei trip aziendali con filtri opzionali:
    - month: YYYY-MM
    - date_from / date_to: YYYY-MM-DD
    - employee_id: filtra per account_id del pagante
    - status: filtra per stato del trip (APPROVED, COMPLETED, ecc.)
    Solo i manager della stessa company possono accedere.
    """
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Azienda non trovata")
    if not current_user.is_manager or current_user.company_id != company_id:
        raise HTTPException(403, "Accesso riservato ai manager dell'azienda")

    # Tutti i trip BUSINESS della company
    company_trips_q = session.exec(
        select(Trip).where(
            Trip.company_id == company_id,
            Trip.trip_intent == "BUSINESS",
        )
    ).all()

    # Filtra per stato se richiesto
    if status:
        company_trips_q = [t for t in company_trips_q if t.status == status.upper()]

    # Mappa account_id → nome per filtro dipendente
    employee_account: Optional[Account] = None
    if employee_id:
        employee_account = session.get(Account, employee_id)
        if not employee_account or employee_account.company_id != company_id:
            raise HTTPException(404, "Dipendente non trovato nella company")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Data", "Viaggio", "Destinazione", "Dipendente",
        "Descrizione", "Categoria", "Importo (EUR)", "Valuta Originale",
        "Importo Originale", "Stato Viaggio",
    ])

    for trip in company_trips_q:
        expenses = session.exec(
            select(Expense).where(Expense.trip_id == trip.id)
        ).all()

        for exp in expenses:
            date_str = str(exp.date or "")[:10]

            # Filtro mese
            if month and not date_str.startswith(month):
                continue
            # Filtro range date
            if date_from and date_str < date_from:
                continue
            if date_to and date_str > date_to:
                continue

            # Nome pagante e filtro dipendente
            payer_name = "—"
            payer_account_id = None
            if exp.payer_id:
                payer_part = session.get(Participant, exp.payer_id)
                if payer_part:
                    payer_name = payer_part.name
                    payer_account_id = payer_part.account_id

            if employee_id and payer_account_id != employee_id:
                continue

            writer.writerow([
                date_str or "—",
                trip.name,
                trip.destination or "—",
                payer_name,
                exp.description or "—",
                exp.category or "General",
                f"{exp.amount:.2f}",
                exp.currency or "EUR",
                f"{exp.original_amount:.2f}" if exp.original_amount else f"{exp.amount:.2f}",
                trip.status,
            ])

    output.seek(0)
    filename = f"SpeseSplitPlan_{company_id}"
    if month:
        filename += f"_{month}"
    elif date_from or date_to:
        filename += f"_{date_from or ''}__{date_to or ''}"
    filename += ".csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---------------------------------------------------------------------------
# GET /companies/{company_id}/analytics  (solo Manager)
# ---------------------------------------------------------------------------

class CompanySettingsRequest(BaseModel):
    max_budget_per_trip: Optional[float] = None
    billing_email: Optional[str] = None
    vat_number: Optional[str] = None
    billing_address: Optional[str] = None


@router.patch("/{company_id}/settings")
async def update_company_settings(
    company_id: int,
    body: CompanySettingsRequest,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """Aggiorna le impostazioni della company (solo manager)."""
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Azienda non trovata")
    if not current_user.is_manager or current_user.company_id != company_id:
        raise HTTPException(403, "Accesso riservato ai manager dell'azienda")

    if body.max_budget_per_trip is not None:
        company.max_budget_per_trip = body.max_budget_per_trip
    if body.billing_email is not None:
        company.billing_email = body.billing_email
    if body.vat_number is not None:
        company.vat_number = body.vat_number
    if body.billing_address is not None:
        company.billing_address = body.billing_address

    session.add(company)
    session.commit()
    session.refresh(company)
    logger.info(f"[SETTINGS] Company {company_id} aggiornata da manager {current_user.id}")
    return {"message": "Impostazioni aggiornate.", "company": {"id": company.id, "name": company.name, "max_budget_per_trip": company.max_budget_per_trip, "billing_email": company.billing_email, "vat_number": company.vat_number, "billing_address": company.billing_address}}


@router.get("/{company_id}/analytics")
async def get_company_analytics(
    company_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    """
    Dati aggregati per la company: costo medio per viaggio, trend mensile 6 mesi,
    top spenders, breakdown trip per stato.
    """
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(404, "Azienda non trovata")
    if not current_user.is_manager or current_user.company_id != company_id:
        raise HTTPException(403, "Accesso riservato ai manager dell'azienda")

    # --- Trip BUSINESS della company ---
    company_trips = session.exec(
        select(Trip).where(
            Trip.company_id == company_id,
            Trip.trip_intent == "BUSINESS",
        )
    ).all()

    trip_ids = [t.id for t in company_trips]

    # --- Tutte le spese dei trip aziendali ---
    all_expenses = (
        session.exec(select(Expense).where(Expense.trip_id.in_(trip_ids))).all()
        if trip_ids else []
    )

    # --- Costo medio per viaggio ---
    trip_totals = defaultdict(float)
    for exp in all_expenses:
        trip_totals[exp.trip_id] += exp.amount
    avg_cost_per_trip = (
        round(sum(trip_totals.values()) / len(trip_totals), 2) if trip_totals else 0.0
    )

    # --- Trend mensile ultimi 6 mesi ---
    now = datetime.now(timezone.utc)
    monthly: dict[str, float] = {}
    for i in range(5, -1, -1):
        month_dt = datetime(now.year, now.month, 1, tzinfo=timezone.utc) - timedelta(days=i * 30)
        key = month_dt.strftime("%Y-%m")
        monthly[key] = 0.0

    for exp in all_expenses:
        if not exp.date:
            continue
        month_key = str(exp.date)[:7]  # "YYYY-MM"
        if month_key in monthly:
            monthly[month_key] += exp.amount

    monthly_trend = [
        {"month": k, "total": round(v, 2)} for k, v in sorted(monthly.items())
    ]

    # --- Top spenders (dipendenti con spesa maggiore, top 5) ---
    spender_totals: dict[int, float] = defaultdict(float)
    spender_names: dict[int, str] = {}
    for exp in all_expenses:
        if not exp.payer_id:
            continue
        payer = session.get(Participant, exp.payer_id)
        if payer:
            spender_totals[exp.payer_id] += exp.amount
            spender_names[exp.payer_id] = payer.name

    top_spenders = sorted(
        [{"name": spender_names[pid], "total": round(total, 2)} for pid, total in spender_totals.items()],
        key=lambda x: x["total"],
        reverse=True,
    )[:5]

    # --- Breakdown per stato ---
    status_counts: dict[str, int] = defaultdict(int)
    for t in company_trips:
        status_counts[t.status] += 1

    return {
        "total_trips": len(company_trips),
        "avg_cost_per_trip": avg_cost_per_trip,
        "monthly_trend": monthly_trend,
        "top_spenders": top_spenders,
        "trips_by_status": dict(status_counts),
    }

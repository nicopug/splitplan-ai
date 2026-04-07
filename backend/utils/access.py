from datetime import datetime, timezone
from fastapi import HTTPException
from sqlmodel import Session, select, func
from models import Account, Company, Participant, Trip


def check_participant(trip_id: int, account: Account, session: Session) -> Participant:
    """Verifica che l'account sia un partecipante del viaggio. Solleva 403 altrimenti."""
    member = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id, Participant.account_id == account.id
        )
    ).first()
    if not member:
        raise HTTPException(
            status_code=403, detail="Non sei un partecipante di questo viaggio."
        )
    return member


def check_company_limits(company: Company, session: Session, action: str):
    """
    Verifica i limiti aziendali prima di eseguire un'azione.

    action: 'create_trip' | 'ai_call'
    Solleva 429 se il limite è stato raggiunto.
    """
    if action == "create_trip":
        # Conta i trip BUSINESS creati questo mese dai membri della company
        company_member_ids = [
            a.id for a in session.exec(
                select(Account).where(Account.company_id == company.id)
            ).all()
        ]
        if not company_member_ids:
            return

        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Trip con almeno un organizzatore membro della company, con start_date questo mese
        trip_ids_from_members = session.exec(
            select(Participant.trip_id).where(
                Participant.account_id.in_(company_member_ids),
                Participant.is_organizer == True,
            )
        ).all()

        if not trip_ids_from_members:
            return

        trips_this_month = session.exec(
            select(func.count(Trip.id)).where(
                Trip.id.in_(trip_ids_from_members),
                Trip.trip_intent == "BUSINESS",
                Trip.start_date >= month_start,
            )
        ).one()

        if trips_this_month >= company.max_trips_per_month:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Limite mensile raggiunto: la tua azienda ha già creato "
                    f"{trips_this_month}/{company.max_trips_per_month} trasferte questo mese."
                ),
            )

    elif action == "ai_call":
        # Conta le chiamate AI di oggi per la company (somma daily_ai_usage dei membri)
        company_members = session.exec(
            select(Account).where(Account.company_id == company.id)
        ).all()

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        total_today = sum(
            m.daily_ai_usage
            for m in company_members
            if m.last_usage_reset == today
        )

        if total_today >= company.max_ai_calls_per_day:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Limite giornaliero AI raggiunto: la tua azienda ha eseguito "
                    f"{total_today}/{company.max_ai_calls_per_day} chiamate AI oggi."
                ),
            )

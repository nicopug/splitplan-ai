from datetime import datetime, timezone
from fastapi import HTTPException
from sqlmodel import Session, select, func
from models import Account, Company, Participant, Trip


def require_same_company(trip_id: int, current_user: Account, session: Session) -> Account:
    """
    Verifica che il manager e l'organizzatore del trip appartengano alla stessa company.
    Solleva 403 altrimenti. Ritorna current_user per chaining.
    """
    organizer_participant = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id,
            Participant.is_organizer == True,
        )
    ).first()

    organizer_account = None
    if organizer_participant and organizer_participant.account_id:
        organizer_account = session.get(Account, organizer_participant.account_id)

    if not organizer_account:
        raise HTTPException(
            status_code=403, detail="Impossibile verificare l'azienda del viaggio"
        )
    if organizer_account.company_id != current_user.company_id:
        raise HTTPException(
            status_code=403, detail="Non puoi gestire viaggi di un'altra azienda"
        )
    return current_user


def check_participant(trip_id: int, account: Account, session: Session) -> Participant:
    """
    Verifica che l'account sia un partecipante del viaggio. Solleva 403 altrimenti.

    Per i trip BUSINESS applica anche l'enforcement di tenant: l'account deve
    appartenere alla stessa company del trip (P0-6 fix). Questo blocca
    cross-tenant reads/writes anche se — per data drift o bug precedenti —
    esistono righe Participant con account di altra company.
    """
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viaggio non trovato.")

    if (
        trip.trip_intent == "BUSINESS"
        and trip.company_id is not None
        and account.company_id != trip.company_id
    ):
        raise HTTPException(
            status_code=403, detail="Non sei un partecipante di questo viaggio."
        )

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


def check_tenant_for_trip(trip: Trip, account: Account) -> None:
    """
    Enforcement tenant per operazioni *prima* di creare un Participant
    (es. `join_trip`, invite). Se il trip è BUSINESS, account.company_id
    deve combaciare con trip.company_id.
    """
    if (
        trip.trip_intent == "BUSINESS"
        and trip.company_id is not None
        and account.company_id != trip.company_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Non puoi unirti a un viaggio aziendale di un'altra azienda.",
        )


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

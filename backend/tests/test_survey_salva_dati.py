"""Verifica che i dati del survey arrivino davvero sul viaggio.

Il percorso e': Survey -> handleSurveyComplete -> POST /trips/{id}/generate-proposals
-> generate_proposals scrive i campi sul Trip. Se un anello si rompe, l'utente
compila destinazione, partenza, indirizzo dell'ufficio e orari, e poi si ritrova
i link di prenotazione senza destinazione e l'itinerario senza vincoli orari.
"""

from datetime import datetime, timedelta, timezone

from sqlmodel import Session

from auth import create_access_token
from models import Account, Company, Participant, Trip


def auth(account: Account):
    return {"Authorization": f"Bearer {create_access_token({'sub': account.email})}"}


def setup(session: Session, is_manager=False):
    azienda = Company(name="Acme Srl")
    session.add(azienda)
    session.commit()
    session.refresh(azienda)

    account = Account(
        name="Alessio", surname="Rossi", email=f"a{is_manager}@acme.it",
        hashed_password="x", is_verified=True,
        company_id=azienda.id, is_manager=is_manager,
    )
    session.add(account)
    session.commit()
    session.refresh(account)
    return azienda, account


PREFERENZE = {
    "destination": "Bologna",
    "departure_airport": "Milano",
    "office_address": "Via Indipendenza 12, Bologna",
    "work_start_time": "08:30",
    "work_end_time": "17:30",
    "work_days": "Monday,Tuesday,Wednesday",
    "num_people": 1,
    "budget": 0,
    "budget_max": 0,
    "trip_intent": "BUSINESS",
    "transport_mode": "TRAIN",
    "must_have": "",
    "must_avoid": "",
    "participant_names": [],
}


def crea_trasferta(client, session, account):
    res = client.post("/trips/", json={
        "name": "Trasferta", "trip_type": "GROUP", "trip_intent": "BUSINESS",
    }, headers=auth(account))
    return res.json()["trip_id"]


def test_i_dati_del_survey_finiscono_sul_viaggio(client, session: Session):
    """Il caso concreto: compilo i 3 step e mi aspetto di ritrovarli salvati."""
    _, account = setup(session)
    trip_id = crea_trasferta(client, session, account)

    oggi = datetime.now(timezone.utc)
    payload = dict(PREFERENZE)
    payload["start_date"] = oggi.isoformat()
    payload["end_date"] = (oggi + timedelta(days=3)).isoformat()

    res = client.post(f"/trips/{trip_id}/generate-proposals", json=payload,
                      headers=auth(account))
    assert res.status_code == 200, res.text

    session.expire_all()
    trip = session.get(Trip, trip_id)

    assert trip.destination, "la destinazione non e' stata salvata: i link di prenotazione partono a vuoto"
    assert trip.office_address == "Via Indipendenza 12, Bologna"
    assert trip.work_start_time == "08:30"
    assert trip.work_end_time == "17:30"
    assert trip.work_days == "Monday,Tuesday,Wednesday"
    # departure_airport puo' essere normalizzato in codice IATA ("MIL"):
    # il nome digitato dall'utente resta in departure_city.
    assert trip.departure_airport, "la partenza non e' stata salvata"
    assert trip.departure_city == "Milano"
    assert trip.transport_mode == "TRAIN"
    assert trip.start_date is not None and trip.end_date is not None


def test_la_trasferta_del_manager_esce_gia_approvata(client, session: Session):
    _, manager = setup(session, is_manager=True)
    trip_id = crea_trasferta(client, session, manager)

    oggi = datetime.now(timezone.utc)
    payload = dict(PREFERENZE)
    payload["start_date"] = oggi.isoformat()
    payload["end_date"] = (oggi + timedelta(days=2)).isoformat()

    client.post(f"/trips/{trip_id}/generate-proposals", json=payload, headers=auth(manager))

    session.expire_all()
    trip = session.get(Trip, trip_id)
    assert trip.status == "APPROVED", (
        f"stato {trip.status}: il manager resterebbe bloccato ad aspettare se stesso"
    )
    assert trip.approved_by == manager.id


def test_il_dipendente_resta_in_attesa_di_approvazione(client, session: Session):
    _, dipendente = setup(session, is_manager=False)
    trip_id = crea_trasferta(client, session, dipendente)

    oggi = datetime.now(timezone.utc)
    payload = dict(PREFERENZE)
    payload["start_date"] = oggi.isoformat()
    payload["end_date"] = (oggi + timedelta(days=2)).isoformat()

    client.post(f"/trips/{trip_id}/generate-proposals", json=payload, headers=auth(dipendente))

    session.expire_all()
    trip = session.get(Trip, trip_id)
    assert trip.status != "APPROVED", "un dipendente non puo' auto-approvarsi"


def test_partecipante_organizzatore_presente(client, session: Session):
    """Serve a Logistics e alla nota spese: senza organizzatore il payer manca."""
    _, account = setup(session)
    trip_id = crea_trasferta(client, session, account)

    from sqlmodel import select
    org = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id, Participant.is_organizer == True
        )
    ).first()
    assert org is not None
    assert org.account_id == account.id

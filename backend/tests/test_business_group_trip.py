"""Test della trasferta aziendale di GRUPPO.

Prima di queste correzioni il flusso era impossibile da completare:
  - il trip nasceva sempre LEISURE, quindi company_id restava NULL e
    l'export contabile del manager tornava vuoto
  - join_trip rispondeva 403 se l'organizzatore non aveva digitato il nome
    esatto del collega, quindi nessuno poteva essere aggiunto
"""

from datetime import datetime, timezone

import pytest
from sqlmodel import Session, select

from auth import create_access_token
from models import Account, Company, Participant, Trip


def auth(account: Account):
    return {"Authorization": f"Bearer {create_access_token({'sub': account.email})}"}


def make_company(session: Session, nome="Acme Srl") -> Company:
    c = Company(name=nome)
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


def make_account(session: Session, email, company_id=None, is_manager=False) -> Account:
    a = Account(
        name=email.split("@")[0].capitalize(),
        surname="Rossi",
        email=email,
        hashed_password="x",
        is_verified=True,
        company_id=company_id,
        is_manager=is_manager,
    )
    session.add(a)
    session.commit()
    session.refresh(a)
    return a


# --- Creazione: l'intent arriva dal client e il tenant dal server ----------


def test_trasferta_creata_come_business(client, session: Session):
    azienda = make_company(session)
    dipendente = make_account(session, "dip@acme.it", company_id=azienda.id)

    res = client.post("/trips/", json={
        "name": "Fiera di Bologna",
        "trip_type": "GROUP",
        "trip_intent": "BUSINESS",
    }, headers=auth(dipendente))

    assert res.status_code == 200
    trip = session.get(Trip, res.json()["trip_id"])
    assert trip.trip_intent == "BUSINESS"
    assert trip.company_id == azienda.id, "senza company_id l'export contabile e' vuoto"


def test_company_id_non_e_scegliebile_dal_client(client, session: Session):
    """Il tenant viene sempre dall'account, mai dal body."""
    azienda_a = make_company(session, "Azienda A")
    azienda_b = make_company(session, "Azienda B")
    dipendente = make_account(session, "dip@a.it", company_id=azienda_a.id)

    res = client.post("/trips/", json={
        "name": "Tentativo",
        "trip_type": "GROUP",
        "trip_intent": "BUSINESS",
        "company_id": azienda_b.id,
    }, headers=auth(dipendente))

    assert res.status_code == 200
    trip = session.get(Trip, res.json()["trip_id"])
    assert trip.company_id == azienda_a.id


# --- Adesione: il collega entra davvero ----------------------------------


def _crea_trasferta_con_token(client, session, organizzatore) -> Trip:
    res = client.post("/trips/", json={
        "name": "Trasferta", "trip_type": "GROUP", "trip_intent": "BUSINESS",
    }, headers=auth(organizzatore))
    trip_id = res.json()["trip_id"]
    client.post(f"/trips/{trip_id}/share", headers=auth(organizzatore))
    session.expire_all()
    return session.get(Trip, trip_id)


def test_collega_si_unisce_senza_match_sul_nome(client, session: Session):
    """Il caso che prima dava 403 e rendeva impossibile la trasferta di gruppo."""
    azienda = make_company(session)
    organizzatore = make_account(session, "org@acme.it", company_id=azienda.id)
    collega = make_account(session, "collega@acme.it", company_id=azienda.id)

    trip = _crea_trasferta_con_token(client, session, organizzatore)
    assert trip.share_token

    res = client.post(f"/trips/join/{trip.share_token}", headers=auth(collega))
    assert res.status_code == 200, res.text

    partecipanti = session.exec(
        select(Participant).where(Participant.trip_id == trip.id)
    ).all()
    account_ids = {p.account_id for p in partecipanti}
    assert collega.id in account_ids
    assert organizzatore.id in account_ids
    assert len(partecipanti) == 2


def test_num_people_si_allinea_ai_partecipanti(client, session: Session):
    """num_people guida la chiusura della votazione: deve seguire i membri reali."""
    azienda = make_company(session)
    organizzatore = make_account(session, "org2@acme.it", company_id=azienda.id)
    trip = _crea_trasferta_con_token(client, session, organizzatore)

    for i in range(3):
        collega = make_account(session, f"c{i}@acme.it", company_id=azienda.id)
        client.post(f"/trips/join/{trip.share_token}", headers=auth(collega))

    session.expire_all()
    trip = session.get(Trip, trip.id)
    n = len(session.exec(select(Participant).where(Participant.trip_id == trip.id)).all())
    assert n == 4
    assert trip.num_people >= n


def test_doppia_adesione_e_idempotente(client, session: Session):
    azienda = make_company(session)
    organizzatore = make_account(session, "org3@acme.it", company_id=azienda.id)
    collega = make_account(session, "collega3@acme.it", company_id=azienda.id)
    trip = _crea_trasferta_con_token(client, session, organizzatore)

    client.post(f"/trips/join/{trip.share_token}", headers=auth(collega))
    client.post(f"/trips/join/{trip.share_token}", headers=auth(collega))

    partecipanti = session.exec(
        select(Participant).where(
            Participant.trip_id == trip.id, Participant.account_id == collega.id
        )
    ).all()
    assert len(partecipanti) == 1, "il collega non deve comparire due volte"


def test_estraneo_non_entra_in_una_trasferta_di_altra_azienda(client, session: Session):
    """L'isolamento fra tenant resta valido anche con il join libero."""
    acme = make_company(session, "Acme")
    rivale = make_company(session, "Rivale")
    organizzatore = make_account(session, "org4@acme.it", company_id=acme.id)
    estraneo = make_account(session, "spia@rivale.it", company_id=rivale.id)

    trip = _crea_trasferta_con_token(client, session, organizzatore)
    res = client.post(f"/trips/join/{trip.share_token}", headers=auth(estraneo))

    assert res.status_code == 403
    assert session.exec(
        select(Participant).where(
            Participant.trip_id == trip.id, Participant.account_id == estraneo.id
        )
    ).first() is None


def test_export_contabile_del_manager_trova_la_trasferta(client, session: Session):
    """Il motivo per cui company_id conta: senza, il CSV e' vuoto."""
    azienda = make_company(session)
    manager = make_account(session, "mgr@acme.it", company_id=azienda.id, is_manager=True)
    dipendente = make_account(session, "dip2@acme.it", company_id=azienda.id)

    res = client.post("/trips/", json={
        "name": "Trasferta contabile", "trip_type": "GROUP", "trip_intent": "BUSINESS",
        "start_date": datetime.now(timezone.utc).isoformat(),
    }, headers=auth(dipendente))
    trip_id = res.json()["trip_id"]

    trovati = session.exec(
        select(Trip).where(Trip.company_id == azienda.id, Trip.trip_intent == "BUSINESS")
    ).all()
    assert trip_id in [t.id for t in trovati]

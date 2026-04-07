"""
Test Fase 1 — Security & DB foundation

Copertura:
- Password policy (lunghezza minima, cifra obbligatoria)
- approve_trip: 403 se utente non è manager
- approve_trip: 403 se manager di company diversa
- reject_trip: status → REJECTED con rejection_reason
- request_approval: 400 se trip non è BUSINESS
- request_approval: 403 se utente non è partecipante
"""
import pytest
from models import Account, Trip, Participant, Company
from auth import get_password_hash, create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_account(session, *, email, is_manager=False, company_id=None, verified=True):
    acc = Account(
        name="Test",
        surname="User",
        email=email,
        hashed_password=get_password_hash("Password1"),
        is_verified=verified,
        is_manager=is_manager,
        company_id=company_id,
    )
    session.add(acc)
    session.commit()
    session.refresh(acc)
    return acc


def make_trip(session, *, trip_intent="BUSINESS", status="PLANNING"):
    trip = Trip(
        name="Viaggio Test",
        trip_type="BUSINESS",
        trip_intent=trip_intent,
        status=status,
    )
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def token_for(account):
    return create_access_token({"sub": account.email})


def auth(account):
    return {"Authorization": f"Bearer {token_for(account)}"}


# ---------------------------------------------------------------------------
# Password policy tests
# ---------------------------------------------------------------------------

def test_register_password_too_short(client):
    res = client.post("/users/register", json={
        "name": "A", "surname": "B",
        "email": "short@test.com",
        "password": "abc123",  # 6 caratteri
    })
    assert res.status_code == 422
    assert "8 caratteri" in res.json()["detail"]


def test_register_password_no_digit(client):
    res = client.post("/users/register", json={
        "name": "A", "surname": "B",
        "email": "nodigit@test.com",
        "password": "abcdefghij",  # nessun numero
    })
    assert res.status_code == 422
    assert "numero" in res.json()["detail"]


def test_register_valid_password(client):
    res = client.post("/users/register", json={
        "name": "A", "surname": "B",
        "email": "valid@test.com",
        "password": "ValidPass1",
    })
    # 200 o 422 per email già registrata, ma non per password
    assert res.status_code != 422 or "password" not in res.json().get("detail", "")


# ---------------------------------------------------------------------------
# approve_trip tests
# ---------------------------------------------------------------------------

def test_approve_trip_non_manager_gets_403(client, session):
    """Un utente non-manager non può approvare."""
    user = make_account(session, email="regular@test.com", is_manager=False)
    trip = make_trip(session, status="PENDING_APPROVAL")

    res = client.post(f"/trips/{trip.id}/approve", headers=auth(user))
    assert res.status_code == 403


def test_approve_trip_manager_different_company_gets_403(client, session):
    """Un manager di un'altra company non può approvare."""
    company_a = Company(name="Company A")
    company_b = Company(name="Company B")
    session.add(company_a)
    session.add(company_b)
    session.commit()
    session.refresh(company_a)
    session.refresh(company_b)

    organizer = make_account(session, email="org@test.com", company_id=company_a.id)
    manager_b = make_account(session, email="mgr@test.com", is_manager=True, company_id=company_b.id)

    trip = make_trip(session, status="PENDING_APPROVAL")
    part = Participant(name="Org", trip_id=trip.id, account_id=organizer.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(f"/trips/{trip.id}/approve", headers=auth(manager_b))
    assert res.status_code == 403


def test_approve_trip_manager_same_company_succeeds(client, session):
    """Un manager della stessa company può approvare."""
    company = Company(name="Company")
    session.add(company)
    session.commit()
    session.refresh(company)

    organizer = make_account(session, email="org2@test.com", company_id=company.id)
    manager = make_account(session, email="mgr2@test.com", is_manager=True, company_id=company.id)

    trip = make_trip(session, status="PENDING_APPROVAL")
    part = Participant(name="Org", trip_id=trip.id, account_id=organizer.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(f"/trips/{trip.id}/approve", headers=auth(manager))
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

    session.refresh(trip)
    assert trip.status == "APPROVED"
    assert trip.approved_by == manager.id


# ---------------------------------------------------------------------------
# reject_trip tests
# ---------------------------------------------------------------------------

def test_reject_trip_sets_rejected_status(client, session):
    """reject_trip deve settare status REJECTED (non BOOKED)."""
    company = Company(name="RejectCo")
    session.add(company)
    session.commit()
    session.refresh(company)

    organizer = make_account(session, email="org3@test.com", company_id=company.id)
    manager = make_account(session, email="mgr3@test.com", is_manager=True, company_id=company.id)

    trip = make_trip(session, status="PENDING_APPROVAL")
    part = Participant(name="Org", trip_id=trip.id, account_id=organizer.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(
        f"/trips/{trip.id}/reject",
        json={"rejection_reason": "Budget troppo alto"},
        headers=auth(manager),
    )
    assert res.status_code == 200

    session.refresh(trip)
    assert trip.status == "REJECTED"
    assert trip.rejection_reason == "Budget troppo alto"


def test_reject_trip_non_manager_gets_403(client, session):
    user = make_account(session, email="noreg@test.com", is_manager=False)
    trip = make_trip(session, status="PENDING_APPROVAL")

    res = client.post(
        f"/trips/{trip.id}/reject",
        json={"rejection_reason": "No"},
        headers=auth(user),
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# request_approval tests
# ---------------------------------------------------------------------------

def test_request_approval_non_business_trip_gets_400(client, session):
    """request_approval deve fallire per trip non BUSINESS."""
    company = Company(name="LeisureCo")
    session.add(company)
    session.commit()
    session.refresh(company)

    user = make_account(session, email="leisure@test.com", company_id=company.id)
    trip = make_trip(session, trip_intent="LEISURE")
    part = Participant(name="U", trip_id=trip.id, account_id=user.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(f"/trips/{trip.id}/request-approval", headers=auth(user))
    assert res.status_code == 400


def test_request_approval_non_participant_gets_403(client, session):
    """request_approval deve fallire se l'utente non è partecipante."""
    user = make_account(session, email="outsider@test.com")
    trip = make_trip(session, trip_intent="BUSINESS")

    res = client.post(f"/trips/{trip.id}/request-approval", headers=auth(user))
    assert res.status_code == 403


def test_request_approval_sets_pending(client, session):
    """request_approval deve impostare status PENDING_APPROVAL."""
    company = Company(name="BizCo")
    session.add(company)
    session.commit()
    session.refresh(company)

    user = make_account(session, email="biz@test.com", company_id=company.id)
    trip = make_trip(session, trip_intent="BUSINESS", status="PLANNING")
    part = Participant(name="U", trip_id=trip.id, account_id=user.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(f"/trips/{trip.id}/request-approval", headers=auth(user))
    assert res.status_code == 200
    assert res.json()["status"] == "pending_approval"

    session.refresh(trip)
    assert trip.status == "PENDING_APPROVAL"
    assert trip.approval_requested_at is not None

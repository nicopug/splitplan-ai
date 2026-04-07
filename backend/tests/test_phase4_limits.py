"""
Test Fase 4 — Company Limits + Analytics

Copertura:
- create_trip: 429 se company ha raggiunto max_trips_per_month (BUSINESS)
- create_trip: LEISURE non è bloccata dai limiti aziendali
- business-overview: ritorna la nuova struttura con analytics
- business-overview: analytics contiene monthly_spend, top_destinations, trips_by_status
"""
from datetime import datetime, timezone

from models import Account, Company, Trip, Participant, Expense
from auth import get_password_hash, create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_company(session, name="LimitCo", max_trips=2):
    c = Company(name=name, max_trips_per_month=max_trips)
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


def make_account(session, *, email, is_manager=False, company_id=None):
    acc = Account(
        name="Test", surname="User", email=email,
        hashed_password=get_password_hash("Password1"),
        is_verified=True, is_manager=is_manager, company_id=company_id,
    )
    session.add(acc)
    session.commit()
    session.refresh(acc)
    return acc


def auth(account):
    return {"Authorization": f"Bearer {create_access_token({'sub': account.email})}"}


def make_business_trip_with_participant(session, account, *, name="Biz Trip", start_year=2026, start_month=4):
    """Crea un trip BUSINESS con start_date nel mese indicato e aggiunge l'account come organizzatore."""
    trip = Trip(
        name=name, trip_type="BUSINESS", trip_intent="BUSINESS",
        destination="Roma", status="APPROVED",
        start_date=datetime(start_year, start_month, 10, tzinfo=timezone.utc),
    )
    session.add(trip)
    session.commit()
    session.refresh(trip)

    part = Participant(name=account.name, trip_id=trip.id, account_id=account.id, is_organizer=True)
    session.add(part)
    session.commit()
    return trip


# ---------------------------------------------------------------------------
# Tests: Company limits on create_trip
# ---------------------------------------------------------------------------

def test_create_business_trip_within_limit_succeeds(client, session):
    company = make_company(session, "WithinLimitCo", max_trips=5)
    employee = make_account(session, email="emp_wl@test.com", company_id=company.id)

    # Nessun trip esistente: deve funzionare
    res = client.post("/trips/", json={
        "name": "New Biz Trip", "trip_type": "BUSINESS",
        "trip_intent": "BUSINESS", "destination": "Torino",
    }, headers=auth(employee))
    assert res.status_code == 200


def test_create_business_trip_over_limit_gets_429(client, session):
    company = make_company(session, "OverLimitCo", max_trips=2)
    employee = make_account(session, email="emp_ol@test.com", company_id=company.id)

    # Crea 2 trip al limite (con start_date questo mese)
    make_business_trip_with_participant(session, employee, name="Trip 1")
    make_business_trip_with_participant(session, employee, name="Trip 2")

    # Il 3° deve essere bloccato
    res = client.post("/trips/", json={
        "name": "Trip 3 Blocked", "trip_type": "BUSINESS",
        "trip_intent": "BUSINESS", "destination": "Napoli",
        "start_date": datetime(2026, 4, 15, tzinfo=timezone.utc).isoformat(),
    }, headers=auth(employee))
    assert res.status_code == 429


def test_create_leisure_trip_ignores_company_limit(client, session):
    """I trip LEISURE non sono soggetti ai limiti aziendali."""
    company = make_company(session, "LeisureLimitCo", max_trips=0)
    employee = make_account(session, email="emp_leisure@test.com", company_id=company.id)

    res = client.post("/trips/", json={
        "name": "Holiday Trip", "trip_type": "LEISURE",
        "trip_intent": "LEISURE", "destination": "Sicilia",
    }, headers=auth(employee))
    assert res.status_code == 200


def test_create_business_trip_no_company_ignores_limit(client, session):
    """Un utente senza company_id non è soggetto ai limiti aziendali."""
    employee = make_account(session, email="emp_nocomp@test.com", company_id=None)

    res = client.post("/trips/", json={
        "name": "Solo Biz Trip", "trip_type": "BUSINESS",
        "trip_intent": "BUSINESS", "destination": "Roma",
    }, headers=auth(employee))
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# Tests: Business overview analytics
# ---------------------------------------------------------------------------

def test_business_overview_returns_analytics_structure(client, session):
    company = make_company(session, "AnalyticsCo", max_trips=10)
    manager = make_account(session, email="mgr_analytics@test.com", is_manager=True, company_id=company.id)

    res = client.get("/trips/business-overview", headers=auth(manager))
    assert res.status_code == 200
    data = res.json()
    assert "trips" in data
    assert "analytics" in data
    assert "monthly_spend" in data["analytics"]
    assert "trips_by_status" in data["analytics"]
    assert "top_destinations" in data["analytics"]


def test_business_overview_analytics_counts(client, session):
    company = make_company(session, "CountCo", max_trips=10)
    manager = make_account(session, email="mgr_count@test.com", is_manager=True, company_id=company.id)
    employee = make_account(session, email="emp_count@test.com", company_id=company.id)

    make_business_trip_with_participant(session, employee, name="Roma Trip", start_month=3)
    make_business_trip_with_participant(session, employee, name="Milano Trip", start_month=4)

    res = client.get("/trips/business-overview", headers=auth(manager))
    assert res.status_code == 200
    data = res.json()

    assert len(data["trips"]) == 2
    assert data["analytics"]["trips_by_status"].get("APPROVED", 0) == 2
    assert len(data["analytics"]["monthly_spend"]) == 6


def test_business_overview_monthly_spend_with_expenses(client, session):
    company = make_company(session, "SpendCo", max_trips=10)
    manager = make_account(session, email="mgr_spend@test.com", is_manager=True, company_id=company.id)
    employee = make_account(session, email="emp_spend@test.com", company_id=company.id)

    trip = make_business_trip_with_participant(session, employee, name="Spend Trip", start_month=4)
    part = session.exec(
        __import__("sqlmodel").select(Participant).where(Participant.trip_id == trip.id)
    ).first()
    session.add(Expense(trip_id=trip.id, payer_id=part.id, description="Hotel", amount=300.0, date="2026-04-10", category="Alloggio"))
    session.commit()

    res = client.get("/trips/business-overview", headers=auth(manager))
    assert res.status_code == 200
    data = res.json()

    april_entry = next((m for m in data["analytics"]["monthly_spend"] if m["month"] == "2026-04"), None)
    assert april_entry is not None
    assert april_entry["total"] == 300.0

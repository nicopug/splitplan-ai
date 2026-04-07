"""
Test Fase 3 — Export & Reporting

Copertura:
- CSV export: endpoint ritorna 200 con content-type text/csv
- CSV export: contiene le righe corrette per le spese della company
- CSV export: filtro mese funziona
- CSV export: 403 se non manager
- PDF nota spese: endpoint ritorna 200 con content-type application/pdf
"""
from models import Account, Company, Trip, Participant, Expense
from auth import get_password_hash, create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def make_company(session, name="ExportCo"):
    c = Company(name=name)
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


def make_business_trip(session, *, name="Trasferta", status="APPROVED"):
    trip = Trip(
        name=name, trip_type="BUSINESS", trip_intent="BUSINESS",
        destination="Milano", status=status,
    )
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def auth(account):
    return {"Authorization": f"Bearer {create_access_token({'sub': account.email})}"}


# ---------------------------------------------------------------------------
# CSV Export tests
# ---------------------------------------------------------------------------

def test_csv_export_returns_200_and_csv_content_type(client, session):
    company = make_company(session, "CSVCo")
    manager = make_account(session, email="mgr_csv@test.com", is_manager=True, company_id=company.id)

    res = client.get(f"/companies/{company.id}/expenses/export", headers=auth(manager))
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]


def test_csv_export_contains_expense_rows(client, session):
    company = make_company(session, "CSVRows")
    manager = make_account(session, email="mgr_rows@test.com", is_manager=True, company_id=company.id)
    employee = make_account(session, email="emp_rows@test.com", company_id=company.id)

    trip = make_business_trip(session, name="Roma Trip")
    part = Participant(name="Emp", trip_id=trip.id, account_id=employee.id, is_organizer=True)
    session.add(part)
    session.commit()
    session.refresh(part)

    exp = Expense(
        trip_id=trip.id, payer_id=part.id,
        description="Taxi aeroporto", amount=45.50,
        date="2026-04-15", category="Trasporti",
    )
    session.add(exp)
    session.commit()

    res = client.get(f"/companies/{company.id}/expenses/export", headers=auth(manager))
    assert res.status_code == 200
    content = res.text
    assert "Roma Trip" in content
    assert "45.50" in content
    assert "Trasporti" in content


def test_csv_export_month_filter(client, session):
    company = make_company(session, "CSVFilter")
    manager = make_account(session, email="mgr_filter@test.com", is_manager=True, company_id=company.id)
    employee = make_account(session, email="emp_filter@test.com", company_id=company.id)

    trip = make_business_trip(session, name="Filter Trip")
    part = Participant(name="Emp", trip_id=trip.id, account_id=employee.id, is_organizer=True)
    session.add(part)
    session.commit()
    session.refresh(part)

    # Spesa in aprile
    session.add(Expense(trip_id=trip.id, payer_id=part.id, description="Hotel", amount=200.0, date="2026-04-10", category="Alloggio"))
    # Spesa in maggio
    session.add(Expense(trip_id=trip.id, payer_id=part.id, description="Volo", amount=350.0, date="2026-05-20", category="Trasporti"))
    session.commit()

    # Filtro aprile: solo Hotel
    res = client.get(f"/companies/{company.id}/expenses/export?month=2026-04", headers=auth(manager))
    assert res.status_code == 200
    content = res.text
    assert "Hotel" in content
    assert "Volo" not in content


def test_csv_export_non_manager_gets_403(client, session):
    company = make_company(session, "CSVForbid")
    employee = make_account(session, email="emp_forbid@test.com", company_id=company.id)

    res = client.get(f"/companies/{company.id}/expenses/export", headers=auth(employee))
    assert res.status_code == 403


def test_csv_export_different_company_gets_403(client, session):
    company_a = make_company(session, "CompA_csv")
    company_b = make_company(session, "CompB_csv")
    manager_a = make_account(session, email="mgr_a_csv@test.com", is_manager=True, company_id=company_a.id)

    res = client.get(f"/companies/{company_b.id}/expenses/export", headers=auth(manager_a))
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# PDF nota spese test
# ---------------------------------------------------------------------------

def test_pdf_nota_spese_returns_pdf(client, session):
    employee = make_account(session, email="pdfuser@test.com")
    trip = make_business_trip(session, name="PDF Trip")
    part = Participant(name="PDF User", trip_id=trip.id, account_id=employee.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.get(f"/trips/{trip.id}/export-nota-spese", headers=auth(employee))
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    # Il PDF deve iniziare con la signature %PDF
    assert res.content[:4] == b"%PDF"


def test_pdf_nota_spese_non_participant_gets_403(client, session):
    outsider = make_account(session, email="pdfoutsider@test.com")
    trip = make_business_trip(session, name="Other Trip")

    res = client.get(f"/trips/{trip.id}/export-nota-spese", headers=auth(outsider))
    assert res.status_code == 403

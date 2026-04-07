"""
Test Fase 5 — UX: Bulk Invite

Copertura:
- POST /companies/{id}/invite-bulk: 200 con lista inviati per manager
- POST /companies/{id}/invite-bulk: 403 per non-manager
- POST /companies/{id}/invite-bulk: ignora email vuote/malformate
- POST /companies/{id}/invite-bulk: rispetta il cap di 50 email
"""
from models import Account, Company
from auth import get_password_hash, create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_company(session, name="InviteCo"):
    c = Company(name=name)
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


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_bulk_invite_manager_returns_200(client, session):
    company = make_company(session, "BulkCo")
    manager = make_account(session, email="mgr_bulk@test.com", is_manager=True, company_id=company.id)

    res = client.post(
        f"/companies/{company.id}/invite-bulk",
        json={"emails": ["alice@test.com", "bob@test.com"]},
        headers=auth(manager),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["sent"] == 2
    assert data["failed"] == []


def test_bulk_invite_non_manager_gets_403(client, session):
    company = make_company(session, "BulkForbid")
    employee = make_account(session, email="emp_bulk@test.com", company_id=company.id)

    res = client.post(
        f"/companies/{company.id}/invite-bulk",
        json={"emails": ["someone@test.com"]},
        headers=auth(employee),
    )
    assert res.status_code == 403


def test_bulk_invite_filters_invalid_emails(client, session):
    company = make_company(session, "BulkFilter")
    manager = make_account(session, email="mgr_filter_bulk@test.com", is_manager=True, company_id=company.id)

    res = client.post(
        f"/companies/{company.id}/invite-bulk",
        json={"emails": ["valid@test.com", "notanemail", "", "   "]},
        headers=auth(manager),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["sent"] == 1  # solo valid@test.com
    assert len(data["failed"]) >= 1  # notanemail e altri


def test_bulk_invite_caps_at_50(client, session):
    company = make_company(session, "BulkCap")
    manager = make_account(session, email="mgr_cap@test.com", is_manager=True, company_id=company.id)

    emails = [f"user{i}@test.com" for i in range(60)]
    res = client.post(
        f"/companies/{company.id}/invite-bulk",
        json={"emails": emails},
        headers=auth(manager),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["sent"] <= 50


def test_bulk_invite_wrong_company_gets_403(client, session):
    company_a = make_company(session, "BulkA")
    company_b = make_company(session, "BulkB")
    manager_a = make_account(session, email="mgr_a_bulk@test.com", is_manager=True, company_id=company_a.id)

    res = client.post(
        f"/companies/{company_b.id}/invite-bulk",
        json={"emails": ["test@test.com"]},
        headers=auth(manager_a),
    )
    assert res.status_code == 403

"""
Test Fase 2 — Approval Workflow completo + Notifiche

Copertura:
- Notifiche create correttamente su request_approval, approve, reject
- Notifications router: unread-count, list, mark-read, mark-all-read
"""
from models import Account, Trip, Participant, Company, Notification
from auth import get_password_hash, create_access_token


# ---------------------------------------------------------------------------
# Helpers (stessi pattern di test_phase1_security.py)
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


def make_company(session, name="TestCo"):
    c = Company(name=name)
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


def make_trip(session, *, trip_intent="BUSINESS", status="PLANNING"):
    trip = Trip(name="Trasferta Test", trip_type="BUSINESS",
                trip_intent=trip_intent, status=status)
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def auth(account):
    token = create_access_token({"sub": account.email})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Workflow: notifiche su request_approval
# ---------------------------------------------------------------------------

def test_request_approval_notifies_managers(client, session):
    """request_approval deve creare Notification per tutti i manager della company."""
    company = make_company(session, "NotifCo")
    organizer = make_account(session, email="org_notif@test.com", company_id=company.id)
    manager1 = make_account(session, email="mgr1_notif@test.com", is_manager=True, company_id=company.id)
    manager2 = make_account(session, email="mgr2_notif@test.com", is_manager=True, company_id=company.id)

    trip = make_trip(session, trip_intent="BUSINESS")
    part = Participant(name="Org", trip_id=trip.id, account_id=organizer.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(f"/trips/{trip.id}/request-approval", headers=auth(organizer))
    assert res.status_code == 200

    notifs_mgr1 = session.exec(
        __import__('sqlmodel').select(Notification).where(Notification.account_id == manager1.id)
    ).all()
    notifs_mgr2 = session.exec(
        __import__('sqlmodel').select(Notification).where(Notification.account_id == manager2.id)
    ).all()
    assert len(notifs_mgr1) == 1
    assert notifs_mgr1[0].type == "approval_requested"
    assert notifs_mgr1[0].trip_id == trip.id
    assert len(notifs_mgr2) == 1


def test_approve_creates_notification_for_organizer(client, session):
    """approve_trip deve creare Notification per l'organizzatore."""
    company = make_company(session, "ApproveCo")
    organizer = make_account(session, email="org_approve@test.com", company_id=company.id)
    manager = make_account(session, email="mgr_approve@test.com", is_manager=True, company_id=company.id)

    trip = make_trip(session, status="PENDING_APPROVAL")
    part = Participant(name="Org", trip_id=trip.id, account_id=organizer.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(f"/trips/{trip.id}/approve", headers=auth(manager))
    assert res.status_code == 200

    from sqlmodel import select
    notifs = session.exec(
        select(Notification).where(
            Notification.account_id == organizer.id,
            Notification.type == "trip_approved",
        )
    ).all()
    assert len(notifs) == 1
    assert notifs[0].trip_id == trip.id


def test_reject_creates_notification_with_reason(client, session):
    """reject_trip deve creare Notification con il motivo del rifiuto."""
    company = make_company(session, "RejectCo2")
    organizer = make_account(session, email="org_rej2@test.com", company_id=company.id)
    manager = make_account(session, email="mgr_rej2@test.com", is_manager=True, company_id=company.id)

    trip = make_trip(session, status="PENDING_APPROVAL")
    part = Participant(name="Org", trip_id=trip.id, account_id=organizer.id, is_organizer=True)
    session.add(part)
    session.commit()

    res = client.post(
        f"/trips/{trip.id}/reject",
        json={"rejection_reason": "Budget non conforme alla policy"},
        headers=auth(manager),
    )
    assert res.status_code == 200

    from sqlmodel import select
    notifs = session.exec(
        select(Notification).where(
            Notification.account_id == organizer.id,
            Notification.type == "trip_rejected",
        )
    ).all()
    assert len(notifs) == 1
    assert "Budget non conforme" in notifs[0].message


# ---------------------------------------------------------------------------
# Notifications router
# ---------------------------------------------------------------------------

def test_unread_count_empty(client, session):
    user = make_account(session, email="nonotifs@test.com")
    res = client.get("/notifications/unread-count", headers=auth(user))
    assert res.status_code == 200
    assert res.json()["count"] == 0


def test_unread_count_with_notifications(client, session):
    user = make_account(session, email="hasnotifs@test.com")
    # Crea 2 notifiche non lette
    for i in range(2):
        n = Notification(account_id=user.id, type="test", title=f"N{i}", message="msg")
        session.add(n)
    session.commit()

    res = client.get("/notifications/unread-count", headers=auth(user))
    assert res.json()["count"] == 2


def test_get_notifications_list(client, session):
    user = make_account(session, email="listnotifs@test.com")
    for i in range(3):
        n = Notification(account_id=user.id, type="test", title=f"T{i}", message="m")
        session.add(n)
    session.commit()

    res = client.get("/notifications", headers=auth(user))
    assert res.status_code == 200
    data = res.json()
    assert len(data["notifications"]) == 3


def test_mark_notification_read(client, session):
    user = make_account(session, email="markread@test.com")
    n = Notification(account_id=user.id, type="test", title="T", message="m")
    session.add(n)
    session.commit()
    session.refresh(n)

    res = client.post(f"/notifications/{n.id}/read", headers=auth(user))
    assert res.status_code == 200

    session.refresh(n)
    assert n.is_read is True

    # unread count deve essere 0
    count_res = client.get("/notifications/unread-count", headers=auth(user))
    assert count_res.json()["count"] == 0


def test_mark_all_read(client, session):
    user = make_account(session, email="markall@test.com")
    for _ in range(4):
        n = Notification(account_id=user.id, type="test", title="T", message="m")
        session.add(n)
    session.commit()

    res = client.post("/notifications/read-all", headers=auth(user))
    assert res.status_code == 200
    assert res.json()["marked"] == 4

    count_res = client.get("/notifications/unread-count", headers=auth(user))
    assert count_res.json()["count"] == 0


def test_cannot_read_others_notification(client, session):
    owner = make_account(session, email="owner_notif@test.com")
    other = make_account(session, email="other_notif@test.com")
    n = Notification(account_id=owner.id, type="test", title="T", message="m")
    session.add(n)
    session.commit()
    session.refresh(n)

    res = client.post(f"/notifications/{n.id}/read", headers=auth(other))
    assert res.status_code == 403

import pytest
from models import Account, Trip, Expense, Participant

def test_add_expense(client, session):
    # Setup
    from auth import get_password_hash
    account = Account(name="A", surname="B", email="exp@example.com", hashed_password=get_password_hash("p"), is_verified=True)
    session.add(account)
    session.commit()
    
    trip = Trip(name="Budget Trip", trip_type="LEISURE")
    session.add(trip)
    session.commit()

    # Create Participant (Expenses use participant_id as payer_id)
    participant = Participant(name="A", trip_id=trip.id, account_id=account.id)
    session.add(participant)
    session.commit()

    login_res = client.post("/users/login", json={"email": "exp@example.com", "password": "p"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/expenses/",
        json={
            "trip_id": trip.id,
            "payer_id": participant.id,
            "title": "Lunch at Rome",
            "category": "Food",
            "currency": "EUR",
            "amount": 50.5
        },
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["amount"] == 50.5
    assert response.json()["trip_id"] == trip.id

def test_get_balances(client, session):
    # This tests the logic of "who owes whom"
    # Basic check: just ensure the endpoint returns 200 for now
    from auth import get_password_hash
    account = Account(name="A", surname="B", email="bal@example.com", hashed_password=get_password_hash("p"), is_verified=True)
    session.add(account)
    session.commit()
    
    trip = Trip(name="Balance Trip", trip_type="LEISURE")
    session.add(trip)
    session.commit()

    login_res = client.post("/users/login", json={"email": "bal@example.com", "password": "p"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get(f"/expenses/{trip.id}/balances", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

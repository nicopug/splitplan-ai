import pytest
from models import Account, Trip, Participant

def test_create_trip(client, session):
    # Setup: Create a verified user
    from auth import get_password_hash
    account = Account(
        name="Traveler",
        surname="One",
        email="traveler@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True
    )
    session.add(account)
    session.commit()

    # Login to get token (or just use dependency override if we preferred, but let's test the flow)
    login_res = client.post("/users/login", json={"email": "traveler@example.com", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/trips/",
        json={
            "name": "Summer Vacation",
            "destination": "Sicily",
            "trip_type": "LEISURE",
            "trip_intent": "LEISURE",
            "start_date": "2026-07-01",
            "end_date": "2026-07-15",
            "budget_limit": 2000
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["trip"]["name"] == "Summer Vacation"
    assert "trip_id" in data

def test_get_trips(client, session):
    # Setup: Create a trip manually
    from auth import get_password_hash
    account = Account(name="A", surname="B", email="list@example.com", hashed_password=get_password_hash("p"), is_verified=True)
    session.add(account)
    session.commit()
    
    trip = Trip(name="Old Trip", trip_type="LEISURE")
    session.add(trip)
    session.commit()
    
    # MUST add participant for the account to see the trip
    part = Participant(name="A", trip_id=trip.id, account_id=account.id, is_organizer=True)
    session.add(part)
    session.commit()
    login_res = client.post("/users/login", json={"email": "list@example.com", "password": "p"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/trips/my-trips", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Old Trip"

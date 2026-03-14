import pytest
from models import Account

def test_register_user(client):
    response = client.post(
        "/users/register",
        json={
            "name": "Test",
            "surname": "User",
            "email": "test@example.com",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Registrazione completata. Controlla la tua email per la verifica."

def test_login_user(client, session):
    # Setup: Create a verified user manually in the test session
    from auth import get_password_hash
    account = Account(
        name="Test",
        surname="User",
        email="login@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True
    )
    session.add(account)
    session.commit()

    response = client.post(
        "/api/users/login",
        json={
            "email": "login@example.com",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login@example.com"

def test_login_wrong_password(client, session):
    from auth import get_password_hash
    account = Account(
        name="Test",
        surname="User",
        email="wrong@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True
    )
    session.add(account)
    session.commit()

    response = client.post(
        "/api/users/login",
        json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401

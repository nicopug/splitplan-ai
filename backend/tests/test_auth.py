from models import Account
from routers.users import _GENERIC_REGISTER_RESPONSE


def test_register_user(client):
    response = client.post(
        "/users/register",
        json={
            "name": "Test",
            "surname": "User",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    # La risposta e' volutamente generica e identica per email nuove e gia'
    # registrate: e' cio' che impedisce di scoprire chi ha un account.
    assert response.json()["message"] == _GENERIC_REGISTER_RESPONSE["message"]


def test_register_non_rivela_email_gia_registrata(client, session):
    """Email nuova ed email esistente devono dare la stessa identica risposta."""
    from auth import get_password_hash

    session.add(
        Account(
            name="Gia",
            surname="Esiste",
            email="esistente@example.com",
            hashed_password=get_password_hash("password123"),
            is_verified=True,
        )
    )
    session.commit()

    nuova = client.post("/users/register", json={
        "name": "A", "surname": "B", "email": "nuova@example.com", "password": "password123"})
    esistente = client.post("/users/register", json={
        "name": "A", "surname": "B", "email": "esistente@example.com", "password": "password123"})

    assert nuova.status_code == esistente.status_code
    assert nuova.json() == esistente.json()


def test_login_user(client, session):
    # Setup: Create a verified user manually in the test session
    from auth import get_password_hash

    account = Account(
        name="Test",
        surname="User",
        email="login@example.com",
        hashed_password=get_password_hash("password123"),
        is_verified=True,
    )
    session.add(account)
    session.commit()

    response = client.post(
        "/users/login",
        json={"email": "login@example.com", "password": "password123"},
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
        is_verified=True,
    )
    session.add(account)
    session.commit()

    response = client.post(
        "/users/login",
        json={"email": "wrong@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401

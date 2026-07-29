"""Test sulla correttezza monetaria dei saldi.

Copre i bug corretti in expenses.py:
  1. divisione in float -> centesimi persi, i settlement non riconciliavano
  2. payer non appartenente al viaggio -> saldi che non sommano a zero
  3. involved_user_ids estranei -> spesa ridivisa in silenzio su tutti
"""

from decimal import Decimal

from sqlmodel import Session

from models import Account, Expense, Participant, Trip
from routers.expenses import _money


def setup_trip(session: Session, n_partecipanti=3, prefisso="a"):
    trip = Trip(name="Viaggio Saldi", trip_type="GROUP")
    session.add(trip)
    session.commit()
    session.refresh(trip)

    parts = []
    for i in range(n_partecipanti):
        acc = Account(
            name=f"U{i}", surname="T", email=f"{prefisso}{i}@t.com",
            hashed_password="x", is_verified=True,
        )
        session.add(acc)
        session.commit()
        session.refresh(acc)
        p = Participant(name=f"U{i}", trip_id=trip.id, account_id=acc.id, is_organizer=(i == 0))
        session.add(p)
        session.commit()
        session.refresh(p)
        parts.append(p)
    return trip, parts


# --- _money ---------------------------------------------------------------


def test_money_arrotonda_a_due_decimali():
    assert _money(3.333333) == Decimal("3.33")
    assert _money(3.335) == Decimal("3.34")   # arrotondamento commerciale
    assert _money(0.1 + 0.2) == Decimal("0.30")  # niente 0.30000000000000004
    assert _money(None) == Decimal("0.00")


# --- Divisione esatta -----------------------------------------------------


def _calcola_saldi(expenses, participant_ids):
    """Riproduce la logica di get_balances per verificarne l'esattezza."""
    balances = {pid: Decimal("0.00") for pid in participant_ids}
    for amount, payer_id, involved in expenses:
        amount = _money(amount)
        balances[payer_id] += amount
        quota = _money(amount / Decimal(len(involved)))
        resto = amount - quota * len(involved)
        for pos, pid in enumerate(involved):
            balances[pid] -= quota + (resto if pos == 0 else Decimal("0.00"))
    return balances


def test_dieci_euro_diviso_tre_somma_zero():
    """10,00 fra 3: la somma dei saldi deve fare esattamente zero."""
    ids = [1, 2, 3]
    saldi = _calcola_saldi([(10.00, 1, ids)], ids)
    assert sum(saldi.values()) == Decimal("0.00")


def test_nessun_centesimo_perso_su_molte_spese():
    """Su 50 spese non divisibili il totale deve restare a zero."""
    ids = [1, 2, 3]
    spese = [(10.00, (i % 3) + 1, ids) for i in range(50)]
    saldi = _calcola_saldi(spese, ids)
    assert sum(saldi.values()) == Decimal("0.00")


def test_importi_con_decimali_dispari():
    ids = [1, 2, 3, 4, 5, 6, 7]
    saldi = _calcola_saldi([(99.99, 1, ids), (0.07, 2, ids)], ids)
    assert sum(saldi.values()) == Decimal("0.00")


def test_split_parziale_non_tocca_gli_esclusi():
    ids = [1, 2, 3]
    saldi = _calcola_saldi([(30.00, 1, [1, 2])], ids)
    assert saldi[3] == Decimal("0.00")
    assert sum(saldi.values()) == Decimal("0.00")


# --- Validazione payer / involved ----------------------------------------


def test_payer_di_un_altro_viaggio_rifiutato(session: Session, client):
    """Il payer deve appartenere al viaggio della spesa (400, non saldi rotti)."""
    trip_a, parts_a = setup_trip(session, prefisso="viaggioA")
    trip_b, parts_b = setup_trip(session, n_partecipanti=1, prefisso="viaggioB")

    from auth import create_access_token
    account = session.get(Account, parts_a[0].account_id)
    token = create_access_token(data={"sub": account.email})

    res = client.post(
        "/expenses/",
        json={
            "trip_id": trip_a.id,
            "payer_id": parts_b[0].id,   # partecipante di un ALTRO viaggio
            "title": "Cena",
            "amount": 300.0,
            "currency": "EUR",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert session.exec(
        __import__("sqlmodel").select(Expense).where(Expense.trip_id == trip_a.id)
    ).first() is None, "la spesa non deve essere salvata"


def test_involved_estranei_vengono_scartati(session: Session, client):
    """Gli id non appartenenti al viaggio non devono passare nel DB."""
    trip, parts = setup_trip(session)
    from auth import create_access_token
    account = session.get(Account, parts[0].account_id)
    token = create_access_token(data={"sub": account.email})

    res = client.post(
        "/expenses/",
        json={
            "trip_id": trip.id,
            "payer_id": parts[0].id,
            "title": "Taxi",
            "amount": 30.0,
            "currency": "EUR",
            "involved_user_ids": [parts[0].id, 99999],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["involved_ids"] == [parts[0].id]


def test_involved_tutti_estranei_rifiutato(session: Session, client):
    trip, parts = setup_trip(session)
    from auth import create_access_token
    account = session.get(Account, parts[0].account_id)
    token = create_access_token(data={"sub": account.email})

    res = client.post(
        "/expenses/",
        json={
            "trip_id": trip.id,
            "payer_id": parts[0].id,
            "title": "Fantasma",
            "amount": 30.0,
            "currency": "EUR",
            "involved_user_ids": [99998, 99999],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400

"""Test del percorso pagamenti: idempotenza, fail-closed del webhook, revoca.

Copre i tre bug corretti in payments.py:
  1. webhook accettato senza verifica di firma quando STRIPE_WEBHOOK_SECRET manca
  2. webhook e verify-session con chiavi di idempotenza diverse -> doppio accredito
  3. customer.subscription.deleted che leggeva `customer_email` (campo inesistente
     sull'oggetto Subscription) e quindi non revocava mai l'abbonamento
"""

import asyncio

import pytest
from sqlmodel import Session, select

import routers.payments as payments
from models import Account, ProcessedStripeEvent


def make_account(session: Session, email="payer@test.com", credits=0) -> Account:
    account = Account(
        name="Payer",
        surname="Test",
        email=email,
        hashed_password="x",
        credits=credits,
        is_verified=True,
    )
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


def run(coro):
    return asyncio.run(coro)


# --- 1. Idempotenza ------------------------------------------------------


def test_stesso_checkout_accredita_una_sola_volta(session: Session, monkeypatch):
    """Webhook e verify-session sullo stesso pagamento: crediti accreditati 1 volta."""
    monkeypatch.setattr(payments, "get_smtp_config", lambda: (None, None, None))
    account = make_account(session)
    key = payments._checkout_idempotency_key("cs_test_123")

    run(payments.process_successful_checkout(account, "credit_3", key, session))
    dopo_webhook = account.credits

    # Il frontend chiama verify-session subito dopo il redirect: stessa chiave.
    run(payments.process_successful_checkout(account, "credit_3", key, session))

    assert dopo_webhook == 3, "il primo accredito deve dare 3 crediti"
    assert account.credits == 3, "il secondo passaggio non deve riaccreditare"


def test_checkout_diversi_accreditano_entrambi(session: Session, monkeypatch):
    """Due acquisti distinti non devono essere scambiati per un duplicato."""
    monkeypatch.setattr(payments, "get_smtp_config", lambda: (None, None, None))
    account = make_account(session)

    run(payments.process_successful_checkout(
        account, "credit_1", payments._checkout_idempotency_key("cs_A"), session))
    run(payments.process_successful_checkout(
        account, "credit_1", payments._checkout_idempotency_key("cs_B"), session))

    assert account.credits == 2


def test_webhook_e_verify_condividono_la_chiave(session: Session):
    """La chiave non deve dipendere dal percorso: e' derivata dal checkout id."""
    assert payments._checkout_idempotency_key("cs_1") == payments._checkout_idempotency_key("cs_1")


def test_claim_payment_seconda_volta_ritorna_false(session: Session):
    key = "checkout:cs_dup"
    assert payments._claim_payment(key, session) is True
    session.commit()
    assert payments._claim_payment(key, session) is False
    righe = session.exec(
        select(ProcessedStripeEvent).where(ProcessedStripeEvent.stripe_event_id == key)
    ).all()
    assert len(righe) == 1


def test_prodotto_sconosciuto_non_consuma_la_chiave(session: Session):
    """Un product_type invalido non deve bruciare la chiave di idempotenza."""
    account = make_account(session)
    run(payments.process_successful_checkout(account, "prodotto_inesistente", "checkout:cs_x", session))
    assert payments._claim_payment("checkout:cs_x", session) is True


# --- 2. Webhook fail-closed ----------------------------------------------


def test_webhook_rifiutato_senza_secret(client, monkeypatch):
    """Senza STRIPE_WEBHOOK_SECRET il webhook deve fallire, non fidarsi del body."""
    monkeypatch.setattr(payments, "WEBHOOK_SECRET", "")
    res = client.post(
        "/payments/webhook",
        json={
            "id": "evt_falso",
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_falso", "payment_status": "paid",
                                "metadata": {"account_id": "1", "product_type": "sub_annual"}}},
        },
    )
    assert res.status_code == 500, "un webhook non firmato non deve mai essere processato"


def test_webhook_rifiuta_firma_non_valida(client, monkeypatch):
    monkeypatch.setattr(payments, "WEBHOOK_SECRET", "whsec_test")
    res = client.post(
        "/payments/webhook",
        json={"id": "evt_x", "type": "checkout.session.completed", "data": {"object": {}}},
        headers={"stripe-signature": "firma-inventata"},
    )
    assert res.status_code == 400


def test_evento_non_pagato_non_accredita(session: Session, client, monkeypatch):
    """checkout.session.completed con payment_status != paid non deve accreditare."""
    account = make_account(session, email="unpaid@test.com")
    monkeypatch.setattr(payments, "WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(
        payments.stripe.Webhook, "construct_event",
        staticmethod(lambda payload, sig, secret: {
            "id": "evt_1", "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_unpaid", "payment_status": "unpaid",
                                "metadata": {"account_id": str(account.id),
                                             "product_type": "credit_3"}}},
        }),
    )
    res = client.post("/payments/webhook", json={}, headers={"stripe-signature": "s"})
    assert res.json()["status"] == "ignored_unpaid"
    session.refresh(account)
    assert account.credits == 0


# --- 3. Revoca -----------------------------------------------------------


def test_revoca_su_subscription_deleted(session: Session, client, monkeypatch):
    """La disdetta deve togliere Pro risalendo dall'id cliente Stripe."""
    account = make_account(session, email="sub@test.com")
    account.is_subscribed = True
    account.subscription_plan = "ANNUAL"
    account.auto_renew = True
    session.add(account)
    session.commit()

    monkeypatch.setattr(payments, "WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(
        payments.stripe.Webhook, "construct_event",
        staticmethod(lambda payload, sig, secret: {
            "id": "evt_del", "type": "customer.subscription.deleted",
            "data": {"object": {"customer": "cus_123", "status": "canceled"}},
        }),
    )
    # L'oggetto Subscription non ha l'email: si passa da Customer.retrieve
    monkeypatch.setattr(
        payments.stripe.Customer, "retrieve",
        staticmethod(lambda cid: type("C", (), {"email": "sub@test.com"})()),
    )

    client.post("/payments/webhook", json={}, headers={"stripe-signature": "s"})
    session.refresh(account)
    assert account.is_subscribed is False
    assert account.subscription_plan is None
    assert account.auto_renew is False


def test_revoca_su_rimborso(session: Session, client, monkeypatch):
    account = make_account(session, email="refund@test.com")
    account.is_subscribed = True
    session.add(account)
    session.commit()

    monkeypatch.setattr(payments, "WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(
        payments.stripe.Webhook, "construct_event",
        staticmethod(lambda payload, sig, secret: {
            "id": "evt_ref", "type": "charge.refunded",
            "data": {"object": {"customer": "cus_ref"}},
        }),
    )
    monkeypatch.setattr(
        payments.stripe.Customer, "retrieve",
        staticmethod(lambda cid: type("C", (), {"email": "refund@test.com"})()),
    )

    client.post("/payments/webhook", json={}, headers={"stripe-signature": "s"})
    session.refresh(account)
    assert account.is_subscribed is False


def test_prezzi_frontend_allineati_a_stripe():
    """I prezzi mostrati sul sito devono coincidere con quanto Stripe addebita."""
    assert payments.PRODUCTS["sub_monthly"]["amount"] == 799
    assert payments.PRODUCTS["sub_annual"]["amount"] == 7699
    assert payments.PRODUCTS["credit_1"]["amount"] == 399
    assert payments.PRODUCTS["credit_3"]["amount"] == 899

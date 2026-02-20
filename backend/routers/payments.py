from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
import stripe
import os
from datetime import datetime, timedelta

from database import get_session
from models import Account
from auth import get_current_user
from fastapi_mail import FastMail, MessageSchema, MessageType
from email_templates import purchase_receipt_email
from utils.email_utils import get_smtp_config

router = APIRouter(prefix="/payments", tags=["payments"])

# Configurazione Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# URL di ritorno dopo il checkout
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")

# Mappa prodotti: tipo -> configurazione prezzo
PRODUCTS = {
    "credit_1": {
        "name": "SplitPlan - 1 Credito",
        "amount": 399,  # centesimi (3.99€)
        "credits": 1,
        "mode": "payment",
    },
    "credit_3": {
        "name": "SplitPlan - 3 Crediti",
        "amount": 899,  # centesimi (8.99€)
        "credits": 3,
        "mode": "payment",
    },
    "sub_monthly": {
        "name": "SplitPlan Pro - Mensile",
        "amount": 499,  # centesimi (4.99€)
        "plan": "MONTHLY",
        "mode": "subscription",
        "interval": "month",
    },
    "sub_annual": {
        "name": "SplitPlan Pro - Annuale",
        "amount": 2999,  # centesimi (29.99€)
        "plan": "ANNUAL",
        "mode": "subscription",
        "interval": "year",
    },
}


class CheckoutRequest(BaseModel):
    product_type: str  # "credit_1", "credit_3", "sub_monthly", "sub_annual"


@router.post("/create-checkout")
async def create_checkout(
    req: CheckoutRequest,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user),
):
    """Crea una sessione Stripe Checkout e restituisce l'URL"""
    product = PRODUCTS.get(req.product_type)
    if not product:
        raise HTTPException(status_code=400, detail="Tipo di prodotto non valido")

    try:
        checkout_params = {
            "payment_method_types": ["card"],
            "success_url": f"{FRONTEND_URL}/checkout-success?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{FRONTEND_URL}/market",
            "client_reference_id": str(current_account.id),
            "customer_email": current_account.email,
            "metadata": {
                "product_type": req.product_type,
                "account_id": str(current_account.id),
            },
        }

        if product["mode"] == "payment":
            # Pagamento una tantum per crediti
            checkout_params["mode"] = "payment"
            checkout_params["line_items"] = [
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {"name": product["name"]},
                        "unit_amount": product["amount"],
                    },
                    "quantity": 1,
                }
            ]
        else:
            # Abbonamento ricorrente
            checkout_params["mode"] = "subscription"
            checkout_params["line_items"] = [
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {"name": product["name"]},
                        "unit_amount": product["amount"],
                        "recurring": {"interval": product["interval"]},
                    },
                    "quantity": 1,
                }
            ]

        checkout_session = stripe.checkout.Session.create(**checkout_params)
        return {"url": checkout_session.url}

    except stripe.error.StripeError as e:
        print(f"[Stripe Error] {e}")
        raise HTTPException(status_code=500, detail=f"Errore Stripe: {str(e)}")
    except Exception as e:
        print(f"[Checkout Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_successful_checkout(account: Account, product_type: str, session: Session):
    """Logica comune per attivare crediti o abbonamenti dopo un pagamento."""
    product = PRODUCTS.get(product_type)
    if not product:
        return

    # 1. Attivazione Logica
    if product["mode"] == "payment":
        # Nota: l'idempotenza per i crediti è difficile senza una tabella transazioni.
        # Per ora aggiungiamo e basta (il webhook e verify-session potrebbero sovrapporsi, 
        # ma di solito verify-session viene chiamato una volta sola al ritorno).
        # TODO: Implementare processed_sessions per sicurezza totale.
        account.credits += product["credits"]
        print(f"[Activation] +{product['credits']} crediti per account {account.id}")
    else:
        # Attiva abbonamento
        account.is_subscribed = True
        account.subscription_plan = product["plan"]
        days = 365 if product["plan"] == "ANNUAL" else 30
        expiry_date = datetime.now() + timedelta(days=days)
        account.subscription_expiry = expiry_date.strftime("%Y-%m-%d")
        account.auto_renew = True
        print(f"[Activation] Abbonamento {product['plan']} attivato per account {account.id}")

    session.add(account)
    session.commit()
    session.refresh(account)

    # 2. Invio Email di Ricevuta
    try:
        smtp_user, smtp_password, smtp_conf = get_smtp_config()
        if smtp_user and smtp_password:
            amount_str = f"€{product['amount']/100:.2f}"
            credits_text = f"+{product['credits']} Crediti" if "credits" in product else f"Piano {product['plan']}"
            
            message = MessageSchema(
                subject=f"Ricevuta di acquisto SplitPlan \U0001f4b3",
                recipients=[account.email],
                body=purchase_receipt_email(
                    name=account.name,
                    product_name=product["name"],
                    amount=amount_str,
                    credits_added=credits_text,
                    market_url=f"{FRONTEND_URL}/market"
                ),
                subtype=MessageType.html
            )
            fm = FastMail(smtp_conf)
            await fm.send_message(message)
            print(f"[Activation] Ricevuta email inviata a {account.email}")
    except Exception as email_err:
        print(f"[Activation Error] Invio ricevuta email fallito: {email_err}")


@router.post("/webhook")
async def stripe_webhook(request: Request, session: Session = Depends(get_session)):
    """Riceve e gestisce i webhook di Stripe"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        if WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
        else:
            # In sviluppo senza webhook secret, parsiamo direttamente
            import json
            event = json.loads(payload)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        print(f"[Webhook Error] Signature: {e}")
        raise HTTPException(status_code=400, detail="Firma webhook non valida")

    # Gestione evento checkout completato
    if event["type"] == "checkout.session.completed":
        checkout_session = event["data"]["object"]
        metadata = checkout_session.get("metadata", {})
        account_id = metadata.get("account_id")
        product_type = metadata.get("product_type")

        if not account_id or not product_type:
            print(f"[Webhook] Missing metadata: {metadata}")
            return {"status": "ignored"}

        # Carica account
        account = session.get(Account, int(account_id))
        if not account:
            print(f"[Webhook] Account {account_id} non trovato")
            return {"status": "account_not_found"}

        # Processa l'attivazione
        await process_successful_checkout(account, product_type, session)

    elif event["type"] == "customer.subscription.deleted":
        # L'abbonamento è stato cancellato
        sub = event["data"]["object"]
        customer_email = sub.get("customer_email") or ""
        
        if customer_email:
            account = session.exec(
                select(Account).where(Account.email == customer_email)
            ).first()
            if account:
                account.is_subscribed = False
                account.subscription_plan = None
                account.subscription_expiry = None
                account.auto_renew = False
                session.add(account)
                session.commit()
                print(f"[Webhook] Abbonamento cancellato per {customer_email}")

    return {"status": "success"}


@router.get("/verify-session")
async def verify_session(
    session_id: str,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user),
):
    """Verifica lo stato di una sessione Checkout e aggiorna i crediti se necessario"""
    try:
        checkout_session = stripe.checkout.Session.retrieve(session_id)

        if checkout_session.payment_status == "paid":
            metadata = checkout_session.metadata or {}
            product_type = metadata.get("product_type")
            account_id = metadata.get("account_id")

            # Verifica che sia l'utente corretto
            if str(current_account.id) != account_id:
                raise HTTPException(status_code=403, detail="Sessione non autorizzata")

            product = PRODUCTS.get(product_type)
            if not product:
                return {"status": "paid", "credits": current_account.credits}

            # Attiviamo l'abbonamento/crediti anche qui come backup del webhook
            await process_successful_checkout(current_account, product_type, session)

            return {
                "status": "paid",
                "id": current_account.id,
                "email": current_account.email,
                "name": current_account.name,
                "surname": current_account.surname,
                "credits": current_account.credits,
                "is_subscribed": current_account.is_subscribed,
                "subscription_plan": current_account.subscription_plan,
                "subscription_expiry": current_account.subscription_expiry,
                "product_type": product_type,
            }

        return {"status": checkout_session.payment_status}

    except stripe.error.StripeError as e:
        print(f"[Verify Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portal")
async def create_portal_session(
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user),
):
    """Crea un link al portale clienti Stripe per gestire abbonamenti"""
    try:
        # Cerca il customer Stripe per email
        customers = stripe.Customer.list(email=current_account.email, limit=1)
        if not customers.data:
            raise HTTPException(
                status_code=404, detail="Nessun abbonamento attivo trovato"
            )

        portal_session = stripe.billing_portal.Session.create(
            customer=customers.data[0].id,
            return_url=f"{FRONTEND_URL}/market",
        )
        return {"url": portal_session.url}

    except stripe.error.StripeError as e:
        print(f"[Portal Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

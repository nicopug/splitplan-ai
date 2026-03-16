import logging
import os
from datetime import datetime, timezone, timedelta

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel
from sqlmodel import Session, select

from auth import get_current_user
from database import get_session
from email_templates import purchase_receipt_email
from models import Account, ProcessedStripeEvent
from utils.email_utils import get_smtp_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://splitplan-ai.vercel.app")

PRODUCTS = {
    "credit_1":   {"name": "SplitPlan - 1 Credito",       "amount": 399,  "credits": 1, "mode": "payment"},
    "credit_3":   {"name": "SplitPlan - 3 Crediti",        "amount": 899,  "credits": 3, "mode": "payment"},
    "sub_monthly":{"name": "SplitPlan Pro - Mensile",      "amount": 499,  "plan": "MONTHLY", "mode": "subscription", "interval": "month"},
    "sub_annual": {"name": "SplitPlan Pro - Annuale",      "amount": 2999, "plan": "ANNUAL",  "mode": "subscription", "interval": "year"},
}

class CheckoutRequest(BaseModel):
    product_type: str


# ---- IDEMPOTENCY ----

def _is_already_processed(stripe_event_id: str, session: Session) -> bool:
    return session.exec(
        select(ProcessedStripeEvent).where(ProcessedStripeEvent.stripe_event_id == stripe_event_id)
    ).first() is not None

def _mark_as_processed(stripe_event_id: str, session: Session) -> None:
    session.add(ProcessedStripeEvent(stripe_event_id=stripe_event_id))
    session.commit()
    logger.info(f"[Idempotency] Evento {stripe_event_id} marcato come processato.")


# ---- CHECKOUT ----

@router.post("/create-checkout")
async def create_checkout(
    req: CheckoutRequest,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user),
):
    product = PRODUCTS.get(req.product_type)
    if not product:
        raise HTTPException(status_code=400, detail="Tipo di prodotto non valido")
    try:
        params = {
            "payment_method_types": ["card"],
            "success_url": f"{FRONTEND_URL}/checkout-success?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{FRONTEND_URL}/market",
            "client_reference_id": str(current_account.id),
            "customer_email": current_account.email,
            "metadata": {"product_type": req.product_type, "account_id": str(current_account.id)},
        }
        if product["mode"] == "payment":
            params["mode"] = "payment"
            params["line_items"] = [{"price_data": {"currency": "eur", "product_data": {"name": product["name"]}, "unit_amount": product["amount"]}, "quantity": 1}]
        else:
            params["mode"] = "subscription"
            params["line_items"] = [{"price_data": {"currency": "eur", "product_data": {"name": product["name"]}, "unit_amount": product["amount"], "recurring": {"interval": product["interval"]}}, "quantity": 1}]

        checkout_session = stripe.checkout.Session.create(**params)
        logger.info(f"Checkout creato per account {current_account.id}, prodotto {req.product_type}")
        return {"url": checkout_session.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error checkout account {current_account.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore Stripe: {str(e)}")
    except Exception as e:
        logger.exception(f"Errore imprevisto checkout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---- ACTIVATION ----

async def process_successful_checkout(account: Account, product_type: str, stripe_event_id: str, session: Session):
    """
    Attiva crediti/abbonamento. Idempotente: usa stripe_event_id per
    garantire che webhook e verify-session non processino due volte lo stesso pagamento.
    """
    if _is_already_processed(stripe_event_id, session):
        logger.info(f"[Idempotency] Evento {stripe_event_id} gia processato. Skip.")
        return

    product = PRODUCTS.get(product_type)
    if not product:
        logger.warning(f"Prodotto sconosciuto: {product_type}")
        return

    if product["mode"] == "payment":
        account.credits += product["credits"]
        logger.info(f"[Activation] +{product['credits']} crediti per account {account.id}")
    else:
        account.is_subscribed = True
        account.subscription_plan = product["plan"]
        days = 365 if product["plan"] == "ANNUAL" else 30
        account.subscription_expiry = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")
        account.auto_renew = True
        logger.info(f"[Activation] Abbonamento {product['plan']} attivato per account {account.id}")

    session.add(account)
    session.commit()
    session.refresh(account)
    _mark_as_processed(stripe_event_id, session)

    # Email ricevuta
    try:
        smtp_user, smtp_password, smtp_conf = get_smtp_config()
        if smtp_user and smtp_password:
            amount_str = f"EUR{product['amount']/100:.2f}"
            credits_text = f"+{product['credits']} Crediti" if "credits" in product else f"Piano {product['plan']}"
            message = MessageSchema(
                subject="Ricevuta di acquisto SplitPlan",
                recipients=[account.email],
                body=purchase_receipt_email(name=account.name, product_name=product["name"], amount=amount_str, credits_added=credits_text, market_url=f"{FRONTEND_URL}/market"),
                subtype=MessageType.html,
            )
            await FastMail(smtp_conf).send_message(message)
            logger.info(f"Ricevuta email inviata a {account.email}")
    except Exception as e:
        logger.error(f"Invio ricevuta fallito per account {account.id}: {e}")


# ---- WEBHOOK ----

@router.post("/webhook")
async def stripe_webhook(request: Request, session: Session = Depends(get_session)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        if WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
        else:
            import json
            event = json.loads(payload)
            logger.warning("[Webhook] STRIPE_WEBHOOK_SECRET non configurato.")
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"[Webhook] Firma non valida: {e}")
        raise HTTPException(status_code=400, detail="Firma webhook non valida")

    event_id = event.get("id", "unknown")
    event_type = event.get("type")
    logger.info(f"[Webhook] {event_type} (id={event_id})")

    if event_type == "checkout.session.completed":
        cs = event["data"]["object"]
        meta = cs.get("metadata", {})
        account_id, product_type = meta.get("account_id"), meta.get("product_type")
        if not account_id or not product_type:
            return {"status": "ignored"}
        account = session.get(Account, int(account_id))
        if not account:
            return {"status": "account_not_found"}
        await process_successful_checkout(account, product_type, event_id, session)

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        email = sub.get("customer_email") or ""
        if email:
            account = session.exec(select(Account).where(Account.email == email)).first()
            if account:
                account.is_subscribed = False
                account.subscription_plan = None
                account.subscription_expiry = None
                account.auto_renew = False
                session.add(account)
                session.commit()
                logger.info(f"[Webhook] Abbonamento cancellato per {email}")

    return {"status": "success"}


# ---- VERIFY SESSION ----

@router.get("/verify-session")
async def verify_session(
    session_id: str,
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user),
):
    try:
        cs = stripe.checkout.Session.retrieve(session_id)
        if cs.payment_status == "paid":
            meta = cs.metadata or {}
            product_type, account_id = meta.get("product_type"), meta.get("account_id")
            if str(current_account.id) != account_id:
                raise HTTPException(status_code=403, detail="Sessione non autorizzata")
            if not PRODUCTS.get(product_type):
                return {"status": "paid", "credits": current_account.credits}
            # Prefix "verify_" distingue dal webhook ma rimane idempotente su chiamate multiple
            await process_successful_checkout(current_account, product_type, f"verify_{session_id}", session)
            return {
                "status": "paid", "id": current_account.id, "email": current_account.email,
                "name": current_account.name, "surname": current_account.surname,
                "credits": current_account.credits, "is_subscribed": current_account.is_subscribed,
                "subscription_plan": current_account.subscription_plan,
                "subscription_expiry": current_account.subscription_expiry, "product_type": product_type,
            }
        return {"status": cs.payment_status}
    except stripe.error.StripeError as e:
        logger.error(f"[VerifySession] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---- PORTAL ----

@router.post("/portal")
async def create_portal_session(
    session: Session = Depends(get_session),
    current_account: Account = Depends(get_current_user),
):
    try:
        customers = stripe.Customer.list(email=current_account.email, limit=1)
        if not customers.data:
            raise HTTPException(status_code=404, detail="Nessun abbonamento attivo trovato")
        portal = stripe.billing_portal.Session.create(customer=customers.data[0].id, return_url=f"{FRONTEND_URL}/market")
        return {"url": portal.url}
    except stripe.error.StripeError as e:
        logger.error(f"[Portal] {e}")
        raise HTTPException(status_code=500, detail=str(e))
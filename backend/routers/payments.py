import logging
import os
from datetime import datetime, timezone, timedelta

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi_mail import FastMail, MessageSchema, MessageType
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
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
    "credit_1": {
        "name": "SplitPlan - 1 Credito",
        "amount": 399,
        "credits": 1,
        "mode": "payment",
    },
    "credit_3": {
        "name": "SplitPlan - 3 Crediti",
        "amount": 899,
        "credits": 3,
        "mode": "payment",
    },
    "sub_monthly": {
        "name": "SplitPlan Pro - Mensile",
        "amount": 799,
        "plan": "MONTHLY",
        "mode": "subscription",
        "interval": "month",
    },
    "sub_annual": {
        "name": "SplitPlan Pro - Annuale",
        "amount": 7699,
        "plan": "ANNUAL",
        "mode": "subscription",
        "interval": "year",
    },
}


class CheckoutRequest(BaseModel):
    product_type: str


# ---- IDEMPOTENCY ----


def _claim_payment(idempotency_key: str, session: Session) -> bool:
    """Prova a "prenotare" un pagamento. Ritorna True se e' la prima volta.

    L'INSERT del marker avviene PRIMA dell'accredito e nella stessa transazione:
    e' il vincolo UNIQUE su stripe_event_id a decidere chi vince, quindi due
    consegne concorrenti dello stesso evento non possono accreditare due volte.
    Il vecchio schema (SELECT, accredita, poi INSERT con commit separati) lasciava
    aperta una finestra in cui entrambe le richieste passavano il controllo.
    """
    try:
        session.add(ProcessedStripeEvent(stripe_event_id=idempotency_key))
        session.flush()
        return True
    except IntegrityError:
        session.rollback()
        logger.info(f"[Idempotency] {idempotency_key} gia' processato. Skip.")
        return False


def _account_from_stripe_customer(customer_id, session: Session):
    """Risale all'Account partendo dall'id cliente Stripe (cus_...).

    Il checkout usa `customer_email`, quindi Stripe crea il Customer con
    l'email dell'account: la recuperiamo dall'oggetto Customer.
    """
    if not customer_id:
        return None
    try:
        customer = stripe.Customer.retrieve(customer_id)
        email = getattr(customer, "email", None)
    except stripe.error.StripeError as e:
        logger.error(f"[Webhook] Customer {customer_id} non recuperabile: {e}")
        return None

    if not email:
        logger.warning(f"[Webhook] Customer {customer_id} senza email.")
        return None
    return session.exec(select(Account).where(Account.email == email)).first()


def _revoke_subscription(account: Account, session: Session, reason: str) -> None:
    """Revoca l'accesso Pro (disdetta, rimborso, insoluto)."""
    if not account.is_subscribed:
        return
    account.is_subscribed = False
    account.subscription_plan = None
    account.subscription_expiry = None
    account.auto_renew = False
    session.add(account)
    session.commit()
    logger.info(f"[Webhook] Abbonamento revocato per account {account.id} ({reason})")


def _checkout_idempotency_key(checkout_session_id: str) -> str:
    """Chiave unica per pagamento, condivisa da webhook e verify-session.

    Prima i due percorsi usavano chiavi diverse (l'event id `evt_...` e
    `verify_<session_id>`): il guard non scattava mai fra l'uno e l'altro e
    ogni acquisto veniva accreditato due volte, visto che il frontend chiama
    verify-session subito dopo il redirect mentre Stripe invia il webhook.
    """
    return f"checkout:{checkout_session_id}"


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
            "metadata": {
                "product_type": req.product_type,
                "account_id": str(current_account.id),
            },
        }
        if product["mode"] == "payment":
            params["mode"] = "payment"
            params["line_items"] = [
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
            params["mode"] = "subscription"
            params["line_items"] = [
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

        checkout_session = stripe.checkout.Session.create(**params)
        logger.info(
            f"Checkout creato per account {current_account.id}, prodotto {req.product_type}"
        )
        return {"url": checkout_session.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error checkout account {current_account.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore Stripe: {str(e)}")
    except Exception as e:
        logger.exception(f"Errore imprevisto checkout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---- ACTIVATION ----


async def process_successful_checkout(
    account: Account, product_type: str, idempotency_key: str, session: Session
):
    """
    Attiva crediti/abbonamento. Idempotente: la chiave e' derivata dall'id della
    sessione di checkout, quindi webhook e verify-session convergono sulla stessa
    e lo stesso pagamento non puo' essere accreditato due volte.
    """
    product = PRODUCTS.get(product_type)
    if not product:
        logger.warning(f"Prodotto sconosciuto: {product_type}")
        return

    if not _claim_payment(idempotency_key, session):
        return

    if product["mode"] == "payment":
        account.credits += product["credits"]
        logger.info(
            f"[Activation] +{product['credits']} crediti per account {account.id}"
        )
    else:
        account.is_subscribed = True
        account.subscription_plan = product["plan"]
        days = 365 if product["plan"] == "ANNUAL" else 30
        account.subscription_expiry = (
            datetime.now(timezone.utc) + timedelta(days=days)
        ).strftime("%Y-%m-%d")
        account.auto_renew = True
        logger.info(
            f"[Activation] Abbonamento {product['plan']} attivato per account {account.id}"
        )

    # Marker e accredito vengono resi persistenti insieme: o entrambi o nessuno.
    session.add(account)
    session.commit()
    session.refresh(account)
    logger.info(f"[Idempotency] {idempotency_key} completato.")

    # Email ricevuta
    try:
        smtp_user, smtp_password, smtp_conf = get_smtp_config()
        if smtp_user and smtp_password:
            amount_str = f"EUR{product['amount']/100:.2f}"
            credits_text = (
                f"+{product['credits']} Crediti"
                if "credits" in product
                else f"Piano {product['plan']}"
            )
            message = MessageSchema(
                subject="Ricevuta di acquisto SplitPlan",
                recipients=[account.email],
                body=purchase_receipt_email(
                    name=account.name,
                    product_name=product["name"],
                    amount=amount_str,
                    credits_added=credits_text,
                    market_url=f"{FRONTEND_URL}/market",
                ),
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
    # Fail-closed: senza segreto non si puo' distinguere un evento Stripe da uno
    # inventato da un attaccante. Il vecchio ramo `else: json.loads(payload)`
    # permetteva a chiunque di accreditarsi crediti e abbonamenti con una POST.
    if not WEBHOOK_SECRET:
        logger.error(
            "[Webhook] STRIPE_WEBHOOK_SECRET non configurato: webhook rifiutato."
        )
        raise HTTPException(
            status_code=500, detail="Webhook non configurato correttamente"
        )

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"[Webhook] Firma non valida: {e}")
        raise HTTPException(status_code=400, detail="Firma webhook non valida")

    event_id = event.get("id", "unknown")
    event_type = event.get("type")
    logger.info(f"[Webhook] {event_type} (id={event_id})")

    if event_type == "checkout.session.completed":
        cs = event["data"]["object"]
        # Con i metodi asincroni o i coupon al 100% l'evento puo' arrivare non
        # pagato: senza questo controllo si accreditava comunque.
        if cs.get("payment_status") != "paid":
            logger.info(
                f"[Webhook] checkout {cs.get('id')} non pagato "
                f"(payment_status={cs.get('payment_status')}). Ignorato."
            )
            return {"status": "ignored_unpaid"}

        meta = cs.get("metadata", {})
        account_id, product_type = meta.get("account_id"), meta.get("product_type")
        if not account_id or not product_type:
            return {"status": "ignored"}
        account = session.get(Account, int(account_id))
        if not account:
            return {"status": "account_not_found"}
        await process_successful_checkout(
            account, product_type, _checkout_idempotency_key(cs["id"]), session
        )

    elif event_type in (
        "customer.subscription.deleted",
        "customer.subscription.updated",
    ):
        sub = event["data"]["object"]
        # L'oggetto Subscription NON espone customer_email: contiene `customer`
        # (id cus_...). Leggendo customer_email l'email era sempre vuota e la
        # revoca non veniva MAI eseguita, quindi chi disdiceva restava Pro a vita.
        account = _account_from_stripe_customer(sub.get("customer"), session)
        if account:
            status = sub.get("status")
            # `updated` revoca solo se l'abbonamento non e' piu' attivo
            # (es. unpaid/canceled): un semplice cambio di piano non tocca nulla.
            if event_type == "customer.subscription.deleted" or status in (
                "canceled",
                "unpaid",
                "incomplete_expired",
            ):
                _revoke_subscription(account, session, reason=event_type)

    elif event_type in ("invoice.payment_failed", "charge.refunded"):
        obj = event["data"]["object"]
        account = _account_from_stripe_customer(obj.get("customer"), session)
        if account:
            _revoke_subscription(account, session, reason=event_type)

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
            # Stessa chiave usata dal webhook: chi arriva secondo non accredita.
            await process_successful_checkout(
                current_account,
                product_type,
                _checkout_idempotency_key(session_id),
                session,
            )
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
            raise HTTPException(
                status_code=404, detail="Nessun abbonamento attivo trovato"
            )
        portal = stripe.billing_portal.Session.create(
            customer=customers.data[0].id, return_url=f"{FRONTEND_URL}/market"
        )
        return {"url": portal.url}
    except stripe.error.StripeError as e:
        logger.error(f"[Portal] {e}")
        raise HTTPException(status_code=500, detail=str(e))

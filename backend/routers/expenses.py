from auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
import csv
import io
from fastapi.responses import StreamingResponse

from database import get_session
from models import Trip, Participant, Account, Expense, SQLModel
from utils.currency import get_exchange_rates
from admin_auth import verify_admin_token
from services.ocr_service import process_receipt_image, SUPPORTED_MIME_TYPES
from services.notification_service import create_notification, notify_managers
from utils.access import check_participant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _money(value) -> Decimal:
    """Porta un importo a 2 decimali esatti, con arrotondamento commerciale.

    Gli importi sono salvati come float in DB (Expense.amount): la conversione
    passa da str per non trascinarsi dentro l'errore binario del float.
    """
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class CreateExpenseRequest(SQLModel):
    trip_id: int
    payer_id: int
    title: str
    amount: float  # Importo inserito dall'utente
    currency: str = "EUR"  # Valuta scelta
    category: str = "General"
    involved_user_ids: List[int] = []


class BalanceResult(SQLModel):
    debtor_id: int
    creditor_id: int
    amount: float
    debtor_name: str
    creditor_name: str


@router.post("/", response_model=Expense)
async def create_expense(
    expense_req: CreateExpenseRequest,
    current_user: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # 1. Validate Trip
    trip = session.get(Trip, expense_req.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # 2. Validate Payer
    payer = session.get(Participant, expense_req.payer_id)
    if not payer:
        raise HTTPException(status_code=404, detail="Payer not found")

    # Il payer deve appartenere a QUESTO viaggio. Senza il controllo, in
    # get_balances il credito non veniva mai accreditato (payer_id assente da
    # `balances`) mentre le quote venivano comunque sottratte agli altri: la
    # somma dei saldi non faceva zero e l'importo spariva senza errori.
    if payer.trip_id != expense_req.trip_id:
        raise HTTPException(
            status_code=400, detail="Chi ha pagato non partecipa a questo viaggio."
        )

    check_participant(expense_req.trip_id, current_user, session)

    # 3. Handle Currency Conversion
    amount_eur = expense_req.amount
    exchange_rate = 1.0

    if expense_req.currency.upper() != "EUR":
        rates = await get_exchange_rates("EUR")
        if not rates or expense_req.currency.upper() not in rates:
            # Meglio rifiutare che salvare un importo estero come se fosse in
            # euro: con il fallback precedente 15.000 JPY finivano nei saldi e
            # nella nota spese come 15.000 EUR, in modo permanente.
            logger.error(
                f"[Currency] Tasso {expense_req.currency} non disponibile: spesa rifiutata."
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Impossibile convertire da {expense_req.currency.upper()}: "
                    "servizio cambi non disponibile. Riprova tra poco."
                ),
            )
        exchange_rate = rates[expense_req.currency.upper()]
        if not exchange_rate or exchange_rate <= 0:
            raise HTTPException(
                status_code=503, detail="Tasso di cambio non valido. Riprova tra poco."
            )
        amount_eur = round(expense_req.amount / exchange_rate, 2)

    # 4. Create Expense
    all_participant_ids = [
        p.id
        for p in session.exec(
            select(Participant).where(Participant.trip_id == expense_req.trip_id)
        ).all()
    ]

    # Se involved_user_ids è vuoto, coinvolge tutti.
    # Gli id estranei al viaggio vengono scartati: altrimenti get_balances li
    # filtrava a valle, si ritrovava la lista vuota e ripartiva le spese su
    # TUTTI i partecipanti, cambiando in silenzio la divisione scelta dall'utente.
    if expense_req.involved_user_ids:
        involved = [
            pid for pid in expense_req.involved_user_ids if pid in all_participant_ids
        ]
        if not involved:
            raise HTTPException(
                status_code=400,
                detail="Nessuno dei partecipanti indicati appartiene a questo viaggio.",
            )
    else:
        involved = all_participant_ids

    db_expense = Expense(
        trip_id=expense_req.trip_id,
        payer_id=expense_req.payer_id,
        description=expense_req.title,
        amount=amount_eur,  # Salviamo sempre in EUR per i bilanci
        original_amount=expense_req.amount,
        currency=expense_req.currency.upper(),
        exchange_rate=exchange_rate,
        category=expense_req.category,
        date=str(datetime.now(timezone.utc)),
        involved_ids=involved,
    )
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)

    # Controlla se il budget del viaggio è stato superato
    if trip.budget_max and trip.budget_max > 0:
        total_expenses = sum(
            e.amount
            for e in session.exec(select(Expense).where(Expense.trip_id == expense_req.trip_id)).all()
        )
        # Notifica solo al momento del superamento (prima della nuova spesa era sotto budget)
        previous_total = total_expenses - amount_eur
        if total_expenses > trip.budget_max and previous_total <= trip.budget_max:
            # Notifica l'organizzatore del viaggio
            organizer_participant = session.exec(
                select(Participant).where(
                    Participant.trip_id == expense_req.trip_id,
                    Participant.is_organizer == True,
                )
            ).first()
            if organizer_participant and organizer_participant.account_id:
                create_notification(
                    session=session,
                    account_id=organizer_participant.account_id,
                    type="budget_exceeded",
                    title="Budget viaggio superato",
                    message=(
                        f"Le spese del viaggio \"{trip.name}\" hanno superato il budget: "
                        f"€{total_expenses:.0f} su €{trip.budget_max:.0f} previsti."
                    ),
                    trip_id=expense_req.trip_id,
                )
            # Se trip BUSINESS, notifica anche i manager
            if trip.trip_intent == "BUSINESS" and trip.company_id:
                notify_managers(
                    session=session,
                    company_id=trip.company_id,
                    type="budget_exceeded",
                    title="Budget viaggio aziendale superato",
                    message=(
                        f"Il viaggio \"{trip.name}\" ha superato il budget: "
                        f"€{total_expenses:.0f} / €{trip.budget_max:.0f}."
                    ),
                    trip_id=expense_req.trip_id,
                )
            session.commit()

    return db_expense


@router.get("/{trip_id}", response_model=List[Expense])
async def get_expenses(
    trip_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    check_participant(trip_id, current_user, session)
    return session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()


@router.get("/{trip_id}/balances", response_model=List[BalanceResult])
async def get_balances(
    trip_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    check_participant(trip_id, current_user, session)
    # Fetch all expenses and participants
    expenses = session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()
    participants = session.exec(
        select(Participant).where(Participant.trip_id == trip_id)
    ).all()

    if not expenses or not participants:
        return []

    # I saldi si calcolano in Decimal a 2 cifre. Con i float, una spesa di 10,00
    # divisa fra 3 produceva quote da 3,3333...: i settlement sommavano 6,66
    # contro 6,67 dovuti e il "chi deve cosa a chi" non tornava mai al centesimo.
    balances = {p.id: Decimal("0.00") for p in participants}
    user_map = {p.id: p.name for p in participants}

    for exp in expenses:
        payer_id = exp.payer_id
        amount = _money(exp.amount)

        # Recupera chi è coinvolto in questa spesa
        if exp.involved_ids:
            involved = [pid for pid in exp.involved_ids if pid in balances]
        else:
            involved = list(balances.keys())  # fallback: tutti

        if not involved:
            involved = list(balances.keys())

        if payer_id in balances:
            balances[payer_id] += amount

        # La divisione non e' quasi mai esatta: si assegna la quota arrotondata a
        # tutti e il resto (max pochi centesimi) al primo coinvolto, cosi' la
        # somma delle quote coincide sempre con l'importo speso.
        quota = _money(amount / Decimal(len(involved)))
        resto = amount - quota * len(involved)
        for pos, pid in enumerate(involved):
            balances[pid] -= quota + (resto if pos == 0 else Decimal("0.00"))

    debtors = []
    creditors = []
    soglia = Decimal("0.01")
    for uid, bal in balances.items():
        bal = _money(bal)
        if bal <= -soglia:
            debtors.append({"id": uid, "amount": -bal})
        elif bal >= soglia:
            creditors.append({"id": uid, "amount": bal})

    debtors.sort(key=lambda x: x["amount"], reverse=True)
    creditors.sort(key=lambda x: x["amount"], reverse=True)

    settlements = []
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]
        amount = min(debtor["amount"], creditor["amount"])
        if amount > 0:
            settlements.append(
                BalanceResult(
                    debtor_id=debtor["id"],
                    creditor_id=creditor["id"],
                    debtor_name=user_map.get(debtor["id"], "Unknown"),
                    creditor_name=user_map.get(creditor["id"], "Unknown"),
                    amount=round(amount, 2),
                )
            )
        debtor["amount"] -= amount
        creditor["amount"] -= amount
        if debtor["amount"] < soglia:
            i += 1
        if creditor["amount"] < soglia:
            j += 1

    return settlements


MAX_RECEIPT_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/{trip_id}/upload-receipt", response_model=Expense)
async def upload_receipt(
    trip_id: int,
    file: UploadFile = File(...),
    current_user: Account = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Scansiona una ricevuta con Gemini Vision e crea automaticamente una spesa.

    - Accetta: JPEG, PNG, WEBP, HEIC, HEIF, PDF (max 5 MB)
    - Gemini estrae: importo, valuta, data, nome esercente, categoria
    - Se l'importo non è leggibile → 422 con messaggio chiaro per inserimento manuale
    - La conversione EUR avviene come nel flusso standard
    """
    # ── 1. Validazione MIME ───────────────────────────────────────────────────
    mime_type = file.content_type or ""
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Formato non supportato: '{mime_type}'. "
                "Carica un'immagine (JPEG, PNG, WEBP, HEIC, HEIF) o un PDF."
            ),
        )

    # ── 2. Validazione dimensione ─────────────────────────────────────────────
    content = await file.read()
    if len(content) > MAX_RECEIPT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File troppo grande. Il limite è di 5 MB.",
        )

    # ── 3. Verifica partecipazione al viaggio ─────────────────────────────────
    participant = check_participant(trip_id, current_user, session)

    # ── 4. OCR via Gemini ─────────────────────────────────────────────────────
    try:
        extracted = await process_receipt_image(content, mime_type)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(e))

    if not extracted or extracted.get("total_amount") is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Non riesco a leggere l'importo dalla ricevuta. "
                "La foto potrebbe essere mossa o il testo illeggibile. "
                "Prova a inserire la spesa manualmente."
            ),
        )

    # ── 5. Conversione valuta → EUR ───────────────────────────────────────────
    original_amount: float = extracted["total_amount"]
    currency: str = extracted["currency"]
    amount_eur = original_amount
    exchange_rate = 1.0

    if currency != "EUR":
        rates = await get_exchange_rates("EUR")
        if not rates or currency not in rates or not rates[currency]:
            # Vale lo stesso ragionamento di create_expense: registrare una
            # ricevuta estera come se fosse in euro falsa la nota spese.
            logger.error(f"[OCR] Tasso {currency} non disponibile: ricevuta rifiutata.")
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Impossibile convertire da {currency}: servizio cambi non "
                    "disponibile. Riprova tra poco."
                ),
            )
        exchange_rate = rates[currency]
        amount_eur = round(original_amount / exchange_rate, 2)

    # ── 6. Data spesa ─────────────────────────────────────────────────────────
    expense_date = extracted.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # ── 7. Descrizione dalla ricevuta ─────────────────────────────────────────
    merchant = extracted.get("merchant_name") or "Ricevuta scansionata"

    # ── 8. Partecipanti coinvolti (tutti per default) ─────────────────────────
    all_participant_ids = [
        p.id
        for p in session.exec(
            select(Participant).where(Participant.trip_id == trip_id)
        ).all()
    ]

    # ── 9. Salvataggio spesa ──────────────────────────────────────────────────
    db_expense = Expense(
        trip_id=trip_id,
        payer_id=participant.id,
        description=merchant,
        amount=amount_eur,
        original_amount=original_amount,
        currency=currency,
        exchange_rate=exchange_rate,
        category=extracted["category"],
        date=expense_date,
        involved_ids=all_participant_ids,
    )
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)

    logger.info(
        f"[OCR] Spesa creata | trip={trip_id} | payer={participant.id} | "
        f"amount={amount_eur} EUR | category={extracted['category']}"
    )
    return db_expense


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    check_participant(expense.trip_id, current_user, session)
    session.delete(expense)
    session.commit()
    return {"status": "ok"}

@router.get("/{trip_id}/export", response_class=StreamingResponse)
async def export_expenses_csv(
    trip_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user),
):
    # 1. Verifica autorizzazione (l'utente deve far parte del viaggio)
    check_participant(trip_id, current_user, session)

    # 2. Recupera le spese
    expenses = session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()
    
    if not expenses:
        raise HTTPException(404, "Nessuna spesa trovata per questo viaggio")

    # 3. Creazione del file CSV in memoria (StringIO)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';') # Usiamo il punto e virgola, più amato da Excel in Italia
    
    # Header del CSV
    writer.writerow(["Data", "Categoria", "Descrizione", "Pagato da", "Importo Originale", "Valuta", "Importo in EUR", "Tasso Cambio"])

    for exp in expenses:
        # Grazie alla relazione in models.py, possiamo accedere a exp.payer.name
        payer_name = exp.payer.name if exp.payer else "Sconosciuto"
        # Pulizia data (prendiamo solo YYYY-MM-DD se presente)
        clean_date = exp.date[:10] if exp.date else "N/A"
        
        writer.writerow([
            clean_date,
            exp.category,
            exp.description,
            payer_name,
            exp.original_amount,
            exp.currency,
            exp.amount,
            exp.exchange_rate
        ])

    # 4. Preparazione della risposta per il download
    output.seek(0)
    filename = f"SplitPlan_Export_Trip_{trip_id}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



@router.post("/migrate-schema", dependencies=[Depends(verify_admin_token)])
async def migrate_schema(session: Session = Depends(get_session)):
    """Endpoint temporaneo per aggiungere colonne mancanti"""
    try:
        from sqlalchemy import text

        session.execute(
            text(
                "ALTER TABLE expense ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'General'"
            )
        )
        session.execute(
            text("ALTER TABLE expense ADD COLUMN IF NOT EXISTS original_amount FLOAT")
        )
        session.execute(
            text(
                "ALTER TABLE expense ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'EUR'"
            )
        )
        session.execute(
            text(
                "ALTER TABLE expense ADD COLUMN IF NOT EXISTS exchange_rate FLOAT DEFAULT 1.0"
            )
        )
        session.commit()
        return {"status": "migration success"}
    except Exception as e:
        session.rollback()
        return {"status": "error", "detail": str(e)}

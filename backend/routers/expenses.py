from auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime, timezone
import json
import logging

from database import get_session
from models import Trip, Participant, Account, Expense, SQLModel
from utils.currency import get_exchange_rates
from admin_auth import verify_admin_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expenses", tags=["expenses"])

class CreateExpenseRequest(SQLModel):
    trip_id: int
    payer_id: int
    title: str
    amount: float # Importo inserito dall'utente
    currency: str = "EUR" # Valuta scelta
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
    current_user: Participant = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 1. Validate Trip
    trip = session.get(Trip, expense_req.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # 2. Validate Payer
    payer = session.get(Participant, expense_req.payer_id)
    if not payer:
        raise HTTPException(status_code=404, detail="Payer not found")

    participant = session.exec(
        select(Participant).where(
            Participant.trip_id == expense_req.trip_id,
            Participant.account_id == current_user.id
        )
    ).first()
    if not participant:
        raise HTTPException(403, "Non autorizzato")

    # 3. Handle Currency Conversion
    amount_eur = expense_req.amount
    exchange_rate = 1.0
    
    if expense_req.currency.upper() != "EUR":
        rates = await get_exchange_rates("EUR")
        if rates and expense_req.currency.upper() in rates:
            exchange_rate = rates[expense_req.currency.upper()]
            amount_eur = round(expense_req.amount / exchange_rate, 2)
        else:
            logger.warning(f"[Warning] Rates for {expense_req.currency} not found. Using original amount.")

    # 4. Create Expense
    all_participant_ids = [p.id for p in session.exec(
        select(Participant).where(Participant.trip_id == expense_req.trip_id)
    ).all()]

    # Se involved_user_ids è vuoto, coinvolge tutti
    involved = expense_req.involved_user_ids if expense_req.involved_user_ids else all_participant_ids

    db_expense = Expense(
        trip_id=expense_req.trip_id,
        payer_id=expense_req.payer_id,
        description=expense_req.title,
        amount=amount_eur, # Salviamo sempre in EUR per i bilanci
        original_amount=expense_req.amount,
        currency=expense_req.currency.upper(),
        exchange_rate=exchange_rate,
        category=expense_req.category,
        date=str(datetime.now(timezone.utc)),
        involved_ids=json.dumps(involved) # <- Salviamo chi è coinvolto
    )
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    
    return db_expense

@router.get("/{trip_id}", response_model=List[Expense])
async def get_expenses(
    trip_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user)    
):
    participant = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id,
            Participant.account_id == current_user.id
        )
    ).first()
    if not participant:
        raise HTTPException(403, "Non autorizzato")
    return session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()

@router.get("/{trip_id}/balances", response_model=List[BalanceResult])
async def get_balances(
    trip_id: int,
    session: Session = Depends(get_session),
    current_user: Account = Depends(get_current_user)    
):
    participant = session.exec(
        select(Participant).where(
            Participant.trip_id == trip_id,
            Participant.account_id == current_user.id
        )
    ).first()
    if not participant:
        raise HTTPException(403, "Non autorizzato")
    # Fetch all expenses and participants
    expenses = session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()
    participants = session.exec(select(Participant).where(Participant.trip_id == trip_id)).all()
    
    if not expenses or not participants:
        return []

    balances = {p.id: 0.0 for p in participants}
    user_map = {p.id: p.name for p in participants}
    
    for exp in expenses:
        payer_id = exp.payer_id
        amount = exp.amount

        # Recupera chi è coinvolto in questa spesa
        if exp.involved_ids:
            involved = json.loads(exp.involved_ids)
            # Filtra solo participant IDs validi (per sicurezza)
            involved = [pid for pid in involved if pid in balances]
        else:
            involved = list(balances.keys())  # fallback: tutti

        if not involved:
            involved = list(balances.keys())

        if payer_id in balances:
            balances[payer_id] += amount

        split_amount = amount / len(involved)
        for pid in involved:
            balances[pid] -= split_amount

    debtors = []
    creditors = []
    for uid, bal in balances.items():
        bal = round(bal, 2)
        if bal < -0.01:
            debtors.append({'id': uid, 'amount': -bal})
        elif bal > 0.01:
            creditors.append({'id': uid, 'amount': bal})
            
    debtors.sort(key=lambda x: x['amount'], reverse=True)
    creditors.sort(key=lambda x: x['amount'], reverse=True)
    
    settlements = []
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]
        amount = min(debtor['amount'], creditor['amount'])
        if amount > 0:
            settlements.append(BalanceResult(
                debtor_id=debtor['id'],
                creditor_id=creditor['id'],
                debtor_name=user_map.get(debtor['id'], "Unknown"),
                creditor_name=user_map.get(creditor['id'], "Unknown"),
                amount=round(amount, 2)
            ))
        debtor['amount'] -= amount
        creditor['amount'] -= amount
        if debtor['amount'] < 0.01: i += 1
        if creditor['amount'] < 0.01: j += 1
            
    return settlements

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    session: Session = Depends(get_session),
    current_user: Participant = Depends(get_current_user)
):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    participant = session.exec(
        select(Participant).where(
            Participant.trip_id == expense.trip_id,
            Participant.account_id == current_user.id
        )
    ).first()
    if not participant:
        raise HTTPException(403, "Non autorizzato")
    session.delete(expense)
    session.commit()
    return {"status": "ok"}

@router.post("/migrate-schema", dependencies=[Depends(verify_admin_token)])
async def migrate_schema(session: Session = Depends(get_session)):
    """Endpoint temporaneo per aggiungere colonne mancanti"""
    try:
        from sqlalchemy import text
        session.execute(text("ALTER TABLE expense ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'General'"))
        session.execute(text("ALTER TABLE expense ADD COLUMN IF NOT EXISTS original_amount FLOAT"))
        session.execute(text("ALTER TABLE expense ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'EUR'"))
        session.execute(text("ALTER TABLE expense ADD COLUMN IF NOT EXISTS exchange_rate FLOAT DEFAULT 1.0"))
        session.commit()
        return {"status": "migration success"}
    except Exception as e:
        session.rollback()
        return {"status": "error", "detail": str(e)}
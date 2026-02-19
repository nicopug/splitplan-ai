from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select, func
from typing import List, Dict, Any
from datetime import datetime
import math

from database import get_session
from models import Trip, Participant, Expense, SQLModel
from utils.currency import convert_to_euro, get_exchange_rates

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
async def create_expense(expense_req: CreateExpenseRequest, session: Session = Depends(get_session)):
    # 1. Validate Trip
    trip = session.get(Trip, expense_req.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # 2. Validate Payer
    payer = session.get(Participant, expense_req.payer_id)
    if not payer:
        raise HTTPException(status_code=404, detail="Payer not found")

    # 3. Handle Currency Conversion
    amount_eur = expense_req.amount
    exchange_rate = 1.0
    
    if expense_req.currency.upper() != "EUR":
        rates = await get_exchange_rates("EUR")
        if rates and expense_req.currency.upper() in rates:
            exchange_rate = rates[expense_req.currency.upper()]
            amount_eur = round(expense_req.amount / exchange_rate, 2)
        else:
            print(f"[Warning] Rates for {expense_req.currency} not found. Using original amount.")

    # 4. Create Expense
    db_expense = Expense(
        trip_id=expense_req.trip_id,
        payer_id=expense_req.payer_id,
        description=expense_req.title,
        amount=amount_eur, # Salviamo sempre in EUR per i bilanci
        original_amount=expense_req.amount,
        currency=expense_req.currency.upper(),
        exchange_rate=exchange_rate,
        category=expense_req.category,
        date=str(datetime.now())
    )
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    
    return db_expense

@router.get("/{trip_id}", response_model=List[Expense])
async def get_expenses(trip_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()

@router.get("/{trip_id}/balances", response_model=List[BalanceResult])
async def get_balances(trip_id: int, session: Session = Depends(get_session)):
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
        if payer_id in balances:
            balances[payer_id] += amount
            
        num_split = len(participants) 
        split_amount = amount / num_split
        for p in participants:
            balances[p.id] -= split_amount

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
async def delete_expense(expense_id: int, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    session.delete(expense)
    session.commit()
    return {"status": "ok"}

@router.post("/migrate-schema")
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
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from typing import List, Dict, Any
import math

from ..database import get_session
from ..models import Trip, User, Expense, ExpenseBase, SQLModel

router = APIRouter(prefix="/expenses", tags=["expenses"])

class CreateExpenseRequest(ExpenseBase):
    trip_id: int
    payer_id: int
    # For MVP, assume equal split among all trip participants if split_details is empty
    involved_user_ids: List[int] = [] 

class BalanceResult(SQLModel):
    debtor_id: int
    creditor_id: int
    amount: float
    debtor_name: str
    creditor_name: str

@router.post("/", response_model=Expense)
def create_expense(expense_req: CreateExpenseRequest, session: Session = Depends(get_session)):
    # 1. Validate Trip
    trip = session.get(Trip, expense_req.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # 2. Validate Payer
    payer = session.get(User, expense_req.payer_id)
    if not payer:
        raise HTTPException(status_code=404, detail="Payer not found")

    # 3. Create Expense
    db_expense = Expense.model_validate(expense_req)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    
    return db_expense

@router.get("/{trip_id}", response_model=List[Expense])
def get_expenses(trip_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Expense).where(Expense.trip_id == trip_id).order_by(Expense.date.desc())).all()

@router.get("/{trip_id}/balances", response_model=List[BalanceResult])
def get_balances(trip_id: int, session: Session = Depends(get_session)):
    # 1. Fetch all expenses and users
    expenses = session.exec(select(Expense).where(Expense.trip_id == trip_id)).all()
    users = session.exec(select(User).where(User.trip_id == trip_id)).all()
    
    if not expenses or not users:
        return []

    # 2. Calculate Net Balances
    # balances[user_id] = amount_paid - amount_owed
    # Positive = Creditor (owed money), Negative = Debtor (owes money)
    balances = {u.id: 0.0 for u in users}
    user_map = {u.id: u.name for u in users}
    
    for exp in expenses:
        payer_id = exp.payer_id
        amount = exp.amount
        
        # Add to payer
        if payer_id in balances:
            balances[payer_id] += amount
            
        # Subtract from consumers
        # MVP: Equal split among ALL participants
        # Future: Use exp.split_details or involved_user_ids
        num_split = len(users) 
        split_amount = amount / num_split
        
        for u in users:
            balances[u.id] -= split_amount

    # 3. Simplify Debts (Greedy Algorithm)
    debtors = []
    creditors = []
    
    for uid, bal in balances.items():
        # Round to avoid float precision issues
        bal = round(bal, 2)
        if bal < -0.01:
            debtors.append({'id': uid, 'amount': -bal}) # Stored as positive debt
        elif bal > 0.01:
            creditors.append({'id': uid, 'amount': bal})
            
    # Sort by amount desc (optional but helps greedy approach)
    debtors.sort(key=lambda x: x['amount'], reverse=True)
    creditors.sort(key=lambda x: x['amount'], reverse=True)
    
    settlements = []
    
    i = 0 # debtor index
    j = 0 # creditor index
    
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
            
        # Update remaining
        debtor['amount'] -= amount
        creditor['amount'] -= amount
        
        # Move pointers if settled
        if debtor['amount'] < 0.01:
            i += 1
        if creditor['amount'] < 0.01:
            j += 1
            
    return settlements

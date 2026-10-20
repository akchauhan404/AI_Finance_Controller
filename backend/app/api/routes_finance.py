from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db, SessionLocal
from app.db import models, schemas
from app.engine.analytics import AnalyticsEngine
from app.db.init_db import init_db

router = APIRouter(prefix="/api/finance", tags=["Finance & Core Ledger"])

@router.get("/accounts", response_model=List[schemas.AccountResponse])
def get_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).all()
@router.patch("/accounts/{account_id}/balance")
def update_account_balance(
    account_id: int,
    balance: float,
    db: Session = Depends(get_db)
):
    account = (
        db.query(models.Account)
        .filter(models.Account.id == account_id)
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail=f"Account with ID {account_id} does not exist."
        )

    account.balance = balance
    db.commit()
    db.refresh(account)

    return {
        "message": "Account balance updated successfully.",
        "account_id": account.id,
        "account_name": account.name,
        "balance": round(float(account.balance), 2),
        "currency": account.currency
    }

@router.get("/transactions", response_model=List[schemas.TransactionResponse])
def get_transactions(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)
    if status:
        query = query.filter(models.Transaction.status == status)
    if category:
        query = query.filter(models.Transaction.category == category)
    return query.order_by(models.Transaction.date.desc()).limit(limit).all()

@router.post("/transactions", response_model=schemas.TransactionResponse)
def create_transaction(tx_in: schemas.TransactionCreate, db: Session = Depends(get_db)):
    tx = models.Transaction(
        account_id=tx_in.account_id,
        amount=tx_in.amount,
        description=tx_in.description,
        category=tx_in.category or "Uncategorized",
        source=tx_in.source,
        status="normal"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.get("/vendors", response_model=List[schemas.VendorResponse])
def get_vendors(db: Session = Depends(get_db)):
    return db.query(models.Vendor).all()

@router.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@router.get("/invoices", response_model=List[schemas.InvoiceResponse])
def get_invoices(db: Session = Depends(get_db)):
    return db.query(models.Invoice).order_by(models.Invoice.due_date.asc()).all()

@router.get("/summary")
def get_financial_summary(db: Session = Depends(get_db)):
    runway_data = AnalyticsEngine.calculate_runway_and_burn(db)
    pending_approvals = db.query(models.Approval).filter(models.Approval.status == "pending").count()
    unacknowledged_alerts = db.query(models.Alert).filter(models.Alert.acknowledged == False).count()
    
    return {
        **runway_data,
        "pending_approvals_count": pending_approvals,
        "active_alerts_count": unacknowledged_alerts
    }

@router.post("/clear-all")
def clear_all_ledger_data(db: Session = Depends(get_db)):
    """
    Wipes all transactions, invoices, approvals, alerts, and audit logs.
    Resets account balance to 0.00 for clean baseline state.
    """
    db.query(models.Approval).delete()
    db.query(models.Alert).delete()
    db.query(models.Invoice).delete()
    db.query(models.AiAction).delete()
    db.query(models.Transaction).delete()
    db.query(models.Vendor).delete()
    
    # Preserve existing account balances.
    # Clearing ledger data must not change the actual account balance.
    accounts = db.query(models.Account).all()

    if not accounts:
        db.add(
            models.Account(
                name="Main Operating Checking",
                type="bank",
                balance=0.00,
                currency="USD"
            )
        )

    db.commit()
    return {"message": "All transaction data, invoices, approvals, and alerts cleared. Account balances were preserved."}

@router.post("/reset-seed")
def reset_database_seed():
    db = SessionLocal()
    try:
        models.Base.metadata.drop_all(bind=db.get_bind())
        models.Base.metadata.create_all(bind=db.get_bind())
        init_db(db)
        return {"message": "Database reset and freshly seeded with Acme Tech Inc. dataset!"}
    finally:
        db.close()

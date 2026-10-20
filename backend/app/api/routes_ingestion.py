from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import schemas, models
from app.ingestion.parsers import IngestionParser, PlaidMockConnector
from app.api.routes_finance import clear_all_ledger_data

router = APIRouter(prefix="/api/ingestion", tags=["Ingestion Layer"])

@router.post("/csv")
def upload_csv_bank_statement(
    payload: schemas.IngestionCSVRequest,
    db: Session = Depends(get_db)
):
    if not payload.csv_content.strip():
        raise HTTPException(
            status_code=400,
            detail="CSV file is empty."
        )

    account = (
        db.query(models.Account)
        .filter(models.Account.id == payload.account_id)
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=400,
            detail=f"Account with ID {payload.account_id} does not exist."
        )

    try:
        if payload.clear_existing:
            clear_all_ledger_data(db)

        txs = IngestionParser.parse_csv_transactions(
            db,
            payload.csv_content,
            payload.account_id
        )

        return {
            "message": (
                f"Successfully ingested {len(txs)} transactions from CSV."
                + (
                    " Prior ledger data was cleared."
                    if payload.clear_existing
                    else ""
                )
            ),
            "imported_count": len(txs),
            "cleared_prior_data": payload.clear_existing,
            "account_id": payload.account_id,
            "account_name": account.name
        }

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="CSV ingestion failed due to an unexpected server error."
        )

@router.post("/invoice")
def parse_invoice_document(payload: schemas.IngestionInvoiceRequest, db: Session = Depends(get_db)):
    invoice = IngestionParser.parse_invoice_text(db, payload.file_name, payload.raw_text)
    return {
        "message": "Invoice successfully parsed and queued.",
        "invoice_id": invoice.id,
        "amount": invoice.amount,
        "due_date": invoice.due_date.strftime("%Y-%m-%d")
    }

@router.post("/plaid-sync")
def sync_plaid_bank_feed(account_id: int = 1, db: Session = Depends(get_db)):
    new_txs = PlaidMockConnector.sync_bank_feed(db, account_id)
    return {
        "message": f"Plaid Sandbox sync completed. Synced {len(new_txs)} real-time transaction events.",
        "synced_count": len(new_txs)
    }

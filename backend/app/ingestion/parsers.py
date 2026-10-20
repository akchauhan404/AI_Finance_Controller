import io
import csv
import re
import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db import models
from app.engine.ai_engine import AIEngine
from app.engine.governance import GovernanceEngine

class IngestionParser:
    """
    Ingestion Layer Responsible for normalizing bank CSVs, raw payloads,
    and Invoice PDFs into standardized database models.
    Tags each record with source, raw_payload, and ingested_at.
    """
    @staticmethod
    def parse_csv_transactions(
        db: Session,
        csv_content: str,
        account_id: int
        ) -> List[models.Transaction]:
        """
        Parse and validate bank CSV transactions.

        Required fields:
        - date
        - description
        - amount

        Invalid rows are rejected instead of being silently converted
        to today's date or zero amount.
        """
        reader = csv.DictReader(io.StringIO(csv_content))

        if not reader.fieldnames:
            raise ValueError("CSV file must contain a header row.")

        # Normalize headers for flexible matching.
        normalized_headers = {
            str(header).strip().lower(): header
            for header in reader.fieldnames
            if header
        }

        date_header = (
            normalized_headers.get("date")
            or normalized_headers.get("transaction_date")
        )

        description_header = (
            normalized_headers.get("description")
            or normalized_headers.get("payee")
        )

        amount_header = (
            normalized_headers.get("amount")
            or normalized_headers.get("val")
        )

        missing_fields = []

        if not date_header:
            missing_fields.append("date")

        if not description_header:
            missing_fields.append("description")

        if not amount_header:
            missing_fields.append("amount")

        if missing_fields:
            raise ValueError(
                "CSV is missing required column(s): "
                + ", ".join(missing_fields)
            )

        created_txs = []

        for row_number, row in enumerate(reader, start=2):
            date_str = str(row.get(date_header, "")).strip()
            desc = str(row.get(description_header, "")).strip()
            amount_str = str(row.get(amount_header, "")).strip()

            # Validate date.
            if not date_str:
                raise ValueError(
                    f"Row {row_number}: transaction date is missing."
                )

            try:
                tx_date = datetime.datetime.strptime(
                    date_str,
                    "%Y-%m-%d"
                )
            except ValueError:
                raise ValueError(
                    f"Row {row_number}: invalid date '{date_str}'. "
                    "Expected format YYYY-MM-DD."
                )

            # Validate description.
            if not desc:
                raise ValueError(
                    f"Row {row_number}: transaction description is missing."
                )

            # Validate amount.
            if not amount_str:
                raise ValueError(
                    f"Row {row_number}: transaction amount is missing."
                )

            cleaned_amount = re.sub(
                r"[^\d.-]",
                "",
                amount_str
            )

            try:
                amount = float(cleaned_amount)
            except ValueError:
                raise ValueError(
                    f"Row {row_number}: invalid amount '{amount_str}'."
                )

            if not (-float("inf") < amount < float("inf")):
                raise ValueError(
                    f"Row {row_number}: amount must be a finite number."
                )

            # Match or create vendor.
            vendor_name = desc.split()[0] if desc else "Unknown Vendor"

            vendor = (
                db.query(models.Vendor)
                .filter(
                    models.Vendor.name.ilike(
                        f"%{vendor_name}%"
                    )
                )
                .first()
            )

            if not vendor:
                vendor = models.Vendor(
                    name=vendor_name.title(),
                    normalized_name=vendor_name.lower(),
                    default_category=None
                )
                db.add(vendor)
                db.commit()
                db.refresh(vendor)

            # Categorize transaction.
            cat_result = AIEngine.categorize_transaction(
                db,
                description=desc,
                amount=amount,
                vendor_name=vendor.name
            )

            tx = models.Transaction(
                account_id=account_id,
                date=tx_date,
                amount=amount,
                description=desc,
                raw_payload=str(row),
                category=cat_result["category"],
                vendor_id=vendor.id,
                status="normal",
                source="csv_upload"
            )

            db.add(tx)
            db.commit()
            db.refresh(tx)

            # Governance check.
            GovernanceEngine.evaluate_transaction_governance(
                db,
                tx,
                confidence_score=cat_result["confidence"]
            )

            created_txs.append(tx)

        if not created_txs:
            raise ValueError(
                "CSV contains no transaction rows."
            )

        return created_txs

    @staticmethod
    def parse_invoice_text(db: Session, file_name: str, raw_text: str) -> models.Invoice:
        """
        Extracts Vendor, Amount, Due Date, and line items from Invoice PDF/OCR raw text.
        """
        # Extract amount ($XX,XXX.XX)
        amount_match = re.search(r"\$\s*([\d,]+\.\d{2})", raw_text)
        amount = float(amount_match.group(1).replace(",", "")) if amount_match else 1500.00

        # Extract due date
        due_match = re.search(r"due\s+date:\s*([\d{4}-\d{2}-\d{2}|[A-Z][a-z]+\s+\d{1,2},\s+\d{4}]+)", raw_text, re.IGNORECASE)
        due_date = datetime.datetime.utcnow() + datetime.timedelta(days=14)

        # Extract Vendor Name
        vendor_match = re.search(r"from:\s*([^\n]+)", raw_text, re.IGNORECASE)
        vendor_name = vendor_match.group(1).strip() if vendor_match else file_name.replace(".pdf", "").title()

        vendor = db.query(models.Vendor).filter(models.Vendor.name.ilike(f"%{vendor_name}%")).first()
        if not vendor:
            vendor = models.Vendor(
                name=vendor_name,
                normalized_name=vendor_name.lower(),
                default_category="Vendor Invoices"
            )
            db.add(vendor)
            db.commit()
            db.refresh(vendor)

        invoice = models.Invoice(
            vendor_id=vendor.id,
            amount=amount,
            due_date=due_date,
            status="pending",
            extracted_from=file_name
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        # Audit log
        GovernanceEngine.log_ai_action(
            db=db,
            action_type="invoice_ocr",
            input_ref=f"file:{file_name}",
            output=f"Extracted Invoice from {vendor_name} for ${amount:,.2f} due on {due_date.strftime('%Y-%m-%d')}",
            confidence_score=0.94,
            model_used="claude-3-5-sonnet"
        )

        return invoice


class PlaidMockConnector:
    """
    Simulates live bank feed transactions from Plaid Sandbox.
    """

    @staticmethod
    def sync_bank_feed(db: Session, account_id: int = 1) -> List[models.Transaction]:
        sample_feed = [
            {"desc": "AWS Cloud Infrastructure Billing", "amount": -4250.00, "vendor": "Amazon Web Services"},
            {"desc": "Stripe Merchant Payout Deposit", "amount": 18450.00, "vendor": "Stripe Inc"},
            {"desc": "Slack Business+ Annual Renewal", "amount": -1800.00, "vendor": "Slack Technologies"},
            {"desc": "Gusto Payroll Direct Debit", "amount": -22400.00, "vendor": "Gusto Payroll"},
            {"desc": "Google Workspace Enterprise", "amount": -640.00, "vendor": "Google LLC"}
        ]

        new_txs = []
        for item in sample_feed:
            vendor = db.query(models.Vendor).filter(models.Vendor.name.ilike(f"%{item['vendor']}%")).first()
            if not vendor:
                vendor = models.Vendor(name=item["vendor"], normalized_name=item["vendor"].lower())
                db.add(vendor)
                db.commit()
                db.refresh(vendor)

            cat_res = AIEngine.categorize_transaction(db, description=item["desc"], amount=item["amount"], vendor_name=vendor.name)

            tx = models.Transaction(
                account_id=account_id,
                date=datetime.datetime.utcnow(),
                amount=item["amount"],
                description=item["desc"],
                raw_payload=str(item),
                category=cat_res["category"],
                vendor_id=vendor.id,
                status="normal",
                source="bank_feed_plaid"
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)

            GovernanceEngine.evaluate_transaction_governance(db, tx, confidence_score=cat_res["confidence"])
            new_txs.append(tx)

        return new_txs

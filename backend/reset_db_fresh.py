import sys
from app.db.database import SessionLocal, engine, Base
from app.db import models

def reset_db_fresh():
    print("=" * 60)
    print("[RESET] Wiping all transactions, balance, invoices, alerts, & audit logs...")
    print("=" * 60)

    db = SessionLocal()
    try:
        # Delete dependent data
        db.query(models.Approval).delete()
        db.query(models.Alert).delete()
        db.query(models.AiAction).delete()
        db.query(models.Invoice).delete()
        db.query(models.Transaction).delete()
        db.query(models.Vendor).delete()

        # Reset Accounts to $0.00
        accounts = db.query(models.Account).all()
        for acc in accounts:
            acc.balance = 0.00
        
        # If no default account exists, create one
        if not accounts:
            main_acc = models.Account(id=1, name="Primary Corporate Checking", type="bank", balance=0.00, currency="USD")
            db.add(main_acc)

        # Ensure default categories exist
        default_categories = [
            ("Cloud Infrastructure & Hosting", 12000.00),
            ("Software & Subscriptions", 8500.00),
            ("Payroll & Compensation", 52000.00),
            ("Legal & Professional Services", 6000.00),
            ("Marketing & Advertising", 10000.00),
            ("Travel & Entertainment", 4500.00),
            ("Office Supplies & Facilities", 3500.00),
            ("Merchant & Banking Fees", 1500.00),
            ("Revenue / Client Payment", 0.00),
            ("Uncategorized", 0.00)
        ]

        for cat_name, budget in default_categories:
            existing = db.query(models.Category).filter(models.Category.name == cat_name).first()
            if not existing:
                db.add(models.Category(name=cat_name, budget_monthly=budget))

        db.commit()
        print("[SUCCESS] All sample data wiped completely! Database is 100% clean and ready for fresh CSV uploads.")
        print("=" * 60)
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to reset database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    reset_db_fresh()

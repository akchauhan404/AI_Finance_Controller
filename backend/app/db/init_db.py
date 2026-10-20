import datetime
import random
from sqlalchemy.orm import Session
from app.db.database import engine, Base, SessionLocal
from app.db import models
from app.engine.governance import GovernanceEngine
from app.engine.ai_engine import AIEngine

def init_db(db: Session):
    Base.metadata.create_all(bind=engine)

    # Check if DB already initialized and populated with comprehensive sample data
    if db.query(models.Account).count() > 0:
        print("Database already initialized. Keeping existing data.")
        return

    print("Initializing AI Finance Controller database...")
    # 1. Accounts
    main_account = models.Account(
        name="Main Operating Account",
        type="bank",
        balance=0.00,
        currency="USD"
    )

    db.add(main_account)
    db.commit()
    db.refresh(main_account)
    # 2. Categories with Monthly Budgets
    categories = [
        models.Category(name="Cloud Infrastructure & Hosting", budget_monthly=12000.00),
        models.Category(name="Software & Subscriptions", budget_monthly=8500.00),
        models.Category(name="Payroll & Compensation", budget_monthly=52000.00),
        models.Category(name="Legal & Professional Services", budget_monthly=6000.00),
        models.Category(name="Marketing & Advertising", budget_monthly=10000.00),
        models.Category(name="Travel & Entertainment", budget_monthly=4500.00),
        models.Category(name="Office Supplies & Facilities", budget_monthly=3500.00),
        models.Category(name="Merchant & Banking Fees", budget_monthly=1500.00),
        models.Category(name="Revenue / Client Payment", budget_monthly=0.00),
        models.Category(name="Uncategorized", budget_monthly=0.00)
    ]
    db.add_all(categories)
    db.commit()

    # 3. Vendors
    vendors_data = [
        ("Amazon Web Services", "amazon web services", "Cloud Infrastructure & Hosting"),
        ("Google Cloud Platform", "google cloud platform", "Cloud Infrastructure & Hosting"),
        ("Slack Technologies", "slack technologies", "Software & Subscriptions"),
        ("Salesforce Inc", "salesforce inc", "Software & Subscriptions"),
        ("Github Inc", "github inc", "Software & Subscriptions"),
        ("Datadog Monitoring", "datadog monitoring", "Software & Subscriptions"),
        ("Gusto Payroll", "gusto payroll", "Payroll & Compensation"),
        ("Cooley LLP Legal", "cooley llp legal", "Legal & Professional Services"),
        ("Deloitte Advisory", "deloitte advisory", "Legal & Professional Services"),
        ("Google Ads", "google ads", "Marketing & Advertising"),
        ("Meta Ads", "meta ads", "Marketing & Advertising"),
        ("WeWork Operating", "wework operating", "Office Supplies & Facilities"),
        ("Stripe Inc", "stripe inc", "Revenue / Client Payment"),
        ("Acme Global Enterprise", "acme global enterprise", "Revenue / Client Payment")
    ]
    vendor_objs = {}
    for name, norm, cat in vendors_data:
        v = models.Vendor(name=name, normalized_name=norm, default_category=cat)
        db.add(v)
        db.commit()
        db.refresh(v)
        vendor_objs[name] = v

    # 4. Generate 60 days of realistic daily transactions
    
    # 5. SPECIFIC GOVERNANCE & ANOMALY TEST TRANSACTIONS

    # 6. Active Invoices
 
    # 7. System Alerts
    
    # 8. Seed Initial AI Audit Actions (`ai_actions` table)
    print("Database Initialization complete.")

if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
    db.close()

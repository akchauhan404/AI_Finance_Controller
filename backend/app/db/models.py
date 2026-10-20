import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # bank, credit, clearing, investment
    balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")

    transactions = relationship("Transaction", back_populates="account")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    normalized_name = Column(String, nullable=False)
    default_category = Column(String, nullable=True)

    transactions = relationship("Transaction", back_populates="vendor_rel")
    invoices = relationship("Invoice", back_populates="vendor")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    parent_category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    budget_monthly = Column(Float, default=0.0)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    amount = Column(Float, nullable=False)  # positive for income/credit, negative for expense/debit
    description = Column(String, nullable=False)
    raw_payload = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    status = Column(String, default="normal")  # normal, flagged, under_review, approved, rejected
    source = Column(String, default="csv")     # bank_feed, csv, manual, invoice_ocr

    account = relationship("Account", back_populates="transactions")
    vendor_rel = relationship("Vendor", back_populates="transactions")
    approvals = relationship("Approval", back_populates="transaction")
    alerts = relationship("Alert", back_populates="transaction")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(String, default="pending")  # pending, paid, overdue, rejected
    extracted_from = Column(String, nullable=True)  # file reference or email ID
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)

    vendor = relationship("Vendor", back_populates="invoices")


class AiAction(Base):
    """The Audit Log — Most Important Governance Table"""
    __tablename__ = "ai_actions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # categorize, anomaly, insight, forecast, chat, report
    input_ref = Column(String, nullable=True)  # transaction_id, invoice_id, etc.
    output = Column(Text, nullable=False)
    confidence_score = Column(Float, default=1.0)
    model_used = Column(String, default="claude-3-5-sonnet")
    human_reviewed = Column(Boolean, default=False)
    human_override = Column(Boolean, default=False)
    reviewer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    amount = Column(Float, nullable=False)
    requested_by = Column(String, default="System AI")
    status = Column(String, default="pending")  # pending, approved, rejected
    approver_id = Column(String, nullable=True)
    threshold_rule_applied = Column(String, nullable=True)  # e.g. ">$5,000 Manager Approval", ">$25,000 Dual Control"
    decided_at = Column(DateTime, nullable=True)

    transaction = relationship("Transaction", back_populates="approvals")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # low_balance, high_spend, anomaly, upcoming_obligation
    severity = Column(String, default="medium")  # low, medium, high, critical
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transaction = relationship("Transaction", back_populates="alerts")


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    predicted_balance = Column(Float, nullable=False)
    method_used = Column(String, default="moving_average_linear_trend")
    confidence_interval = Column(String, nullable=True)  # JSON or text string e.g. "±$12,400"
    actual_balance = Column(Float, nullable=True)  # backfilled later for accuracy tracking

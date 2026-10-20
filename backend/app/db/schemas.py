from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Account Schemas
class AccountBase(BaseModel):
    name: str
    type: str
    balance: float
    currency: str = "USD"

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    class Config:
        from_attributes = True


# Vendor Schemas
class VendorBase(BaseModel):
    name: str
    normalized_name: str
    default_category: Optional[str] = None

class VendorResponse(VendorBase):
    id: int
    class Config:
        from_attributes = True


# Category Schemas
class CategoryBase(BaseModel):
    name: str
    parent_category_id: Optional[int] = None
    budget_monthly: float = 0.0

class CategoryResponse(CategoryBase):
    id: int
    class Config:
        from_attributes = True


# Transaction Schemas
class TransactionBase(BaseModel):
    account_id: int
    date: datetime
    amount: float
    description: str
    raw_payload: Optional[str] = None
    category: Optional[str] = None
    vendor_id: Optional[int] = None
    status: str = "normal"
    source: str = "csv"

class TransactionCreate(BaseModel):
    account_id: int
    date: Optional[datetime] = None
    amount: float
    description: str
    category: Optional[str] = None
    source: str = "manual"

class TransactionResponse(TransactionBase):
    id: int
    account: Optional[AccountResponse] = None
    vendor_rel: Optional[VendorResponse] = None
    class Config:
        from_attributes = True


# Invoice Schemas
class InvoiceBase(BaseModel):
    vendor_id: int
    amount: float
    due_date: datetime
    status: str = "pending"
    extracted_from: Optional[str] = None
    transaction_id: Optional[int] = None

class InvoiceResponse(InvoiceBase):
    id: int
    vendor: Optional[VendorResponse] = None
    class Config:
        from_attributes = True


# AI Action (Audit Log) Schemas
class AiActionBase(BaseModel):
    type: str
    input_ref: Optional[str] = None
    output: str
    confidence_score: float = 1.0
    model_used: str = "claude-3-5-sonnet"
    human_reviewed: bool = False
    human_override: bool = False
    reviewer_id: Optional[str] = None

class AiActionResponse(AiActionBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# Approval Schemas
class ApprovalBase(BaseModel):
    transaction_id: int
    amount: float
    requested_by: str = "System AI"
    status: str = "pending"
    approver_id: Optional[str] = None
    threshold_rule_applied: Optional[str] = None
    decided_at: Optional[datetime] = None

class ApprovalResponse(ApprovalBase):
    id: int
    transaction: Optional[TransactionResponse] = None
    class Config:
        from_attributes = True


# Alert Schemas
class AlertBase(BaseModel):
    type: str
    severity: str = "medium"
    transaction_id: Optional[int] = None
    message: str
    acknowledged: bool = False

class AlertResponse(AlertBase):
    id: int
    created_at: datetime
    transaction: Optional[TransactionResponse] = None
    class Config:
        from_attributes = True


# Forecast Schemas
class ForecastBase(BaseModel):
    period_start: datetime
    period_end: datetime
    predicted_balance: float
    method_used: str = "moving_average_linear_trend"
    confidence_interval: Optional[str] = None
    actual_balance: Optional[float] = None

class ForecastResponse(ForecastBase):
    id: int
    class Config:
        from_attributes = True


# Custom Requests & Responses
class HumanReviewRequest(BaseModel):
    action_id: int
    approved: bool
    override_category: Optional[str] = None
    reviewer_id: str = "Controller (Human)"

class ApprovalDecisionRequest(BaseModel):
    approval_id: int
    action: str  # approve or reject
    approver_id: str = "Finance Lead"

class ChatRequest(BaseModel):
    question: str

class IngestionCSVRequest(BaseModel):
    csv_content: str
    account_id: int
    clear_existing: bool = False

class IngestionInvoiceRequest(BaseModel):
    file_name: str
    raw_text: str

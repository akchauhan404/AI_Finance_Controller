from typing import Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import schemas
from app.engine.ai_engine import AIEngine

router = APIRouter(prefix="/api/ai", tags=["AI Engine Layer (LLM-based)"])

@router.post("/categorize")
def categorize_transaction_ai(
    description: str,
    amount: float,
    vendor_name: str = "",
    api_key: Optional[str] = "",
    db: Session = Depends(get_db)
):
    return AIEngine.categorize_transaction(db, description=description, amount=amount, vendor_name=vendor_name, api_key=api_key)

@router.get("/insights")
def get_ai_narrative_insights(
    api_key: Optional[str] = "",
    db: Session = Depends(get_db)
):
    """
    Generates natural-language executive summary from pre-computed financial statistics.
    """
    return AIEngine.generate_narrative_insights(db, api_key=api_key)

@router.post("/chat")
def chat_with_finance_ai(
    req: schemas.ChatRequest,
    api_key: Optional[str] = "",
    db: Session = Depends(get_db)
):
    """
    Retrieval-Augmented Chat (RAG) querying postgres ledger database.
    """
    return AIEngine.answer_financial_query(db, req.question, api_key=api_key)

@router.get("/report")
def generate_ai_report(
    report_type: str = "monthly_summary",
    api_key: Optional[str] = "",
    db: Session = Depends(get_db)
):
    """
    Generates structured executive financial narrative report.
    """
    return AIEngine.generate_ai_report(db, report_type=report_type, api_key=api_key)

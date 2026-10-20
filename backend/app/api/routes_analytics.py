from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.engine.analytics import AnalyticsEngine

router = APIRouter(prefix="/api/analytics", tags=["Rules & Analytics Engine"])

@router.get("/anomalies")
def get_detected_anomalies(db: Session = Depends(get_db)):
    return AnalyticsEngine.detect_anomalies(db)

@router.get("/runway")
def get_runway_and_burn(db: Session = Depends(get_db)):
    return AnalyticsEngine.calculate_runway_and_burn(db)

@router.get("/variances")
def get_budget_variances(db: Session = Depends(get_db)):
    return AnalyticsEngine.calculate_category_variances(db)

@router.get("/forecast")
def get_cashflow_forecast(days: int = 30, db: Session = Depends(get_db)):
    return AnalyticsEngine.generate_cashflow_forecast(db, days_ahead=days)

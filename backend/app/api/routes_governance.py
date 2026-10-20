from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models, schemas
from app.engine.governance import GovernanceEngine

router = APIRouter(prefix="/api/governance", tags=["Approval & Audit Governance Layer"])

@router.get("/approvals", response_model=List[schemas.ApprovalResponse])
def get_approvals(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Approval)
    if status:
        query = query.filter(models.Approval.status == status)
    return query.order_by(models.Approval.id.desc()).all()

@router.post("/approvals/decision")
def decide_approval(req: schemas.ApprovalDecisionRequest, db: Session = Depends(get_db)):
    try:
        updated_app = GovernanceEngine.process_approval_decision(
            db=db,
            approval_id=req.approval_id,
            action=req.action,
            approver_id=req.approver_id
        )
        return {
            "message": f"Approval #{req.approval_id} has been {req.action.upper()}.",
            "approval": schemas.ApprovalResponse.model_validate(updated_app)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(acknowledged: Optional[bool] = None, db: Session = Depends(get_db)):
    query = db.query(models.Alert)
    if acknowledged is not None:
        query = query.filter(models.Alert.acknowledged == acknowledged)
    return query.order_by(models.Alert.created_at.desc()).all()

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    db.commit()
    return {"message": f"Alert #{alert_id} acknowledged."}

@router.get("/audit-log", response_model=List[schemas.AiActionResponse])
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    """
    Exposes the immutable `ai_actions` table for controllers and auditors.
    """
    return db.query(models.AiAction).order_by(models.AiAction.created_at.desc()).limit(limit).all()

@router.post("/audit-log/review")
def review_ai_action(req: schemas.HumanReviewRequest, db: Session = Depends(get_db)):
    action = db.query(models.AiAction).filter(models.AiAction.id == req.action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="AI Action log entry not found")

    action.human_reviewed = True
    action.reviewer_id = req.reviewer_id

    if not req.approved and req.override_category:
        action.human_override = True
        action.output += f" | Human Override Category: {req.override_category}"

    db.commit()
    return {"message": "AI Action audit log reviewed successfully."}

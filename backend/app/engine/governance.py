from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.db import models

class GovernanceEngine:
    """
    Approval & Audit Governance Backbone.
    Controls state machine transitions, threshold approvals, and immutable audit logs.
    """

    THRESHOLD_MANAGER = 5000.0
    THRESHOLD_DUAL_CONTROL = 25000.0
    CONFIDENCE_THRESHOLD = 0.85

    @staticmethod
    def evaluate_transaction_governance(db: Session, transaction: models.Transaction, confidence_score: float = 1.0) -> Dict[str, Any]:
        """
        Evaluates a transaction against threshold rules and confidence scores.
        Creates an Approval record if human review is needed.
        """
        amt = abs(transaction.amount)
        needs_approval = False
        rule_applied = None

        if amt >= GovernanceEngine.THRESHOLD_DUAL_CONTROL:
            needs_approval = True
            rule_applied = f"Dual Control Required (Amount ${amt:,.2f} >= ${GovernanceEngine.THRESHOLD_DUAL_CONTROL:,.2f})"
        elif amt >= GovernanceEngine.THRESHOLD_MANAGER:
            needs_approval = True
            rule_applied = f"Manager Approval Required (Amount ${amt:,.2f} >= ${GovernanceEngine.THRESHOLD_MANAGER:,.2f})"
        elif confidence_score < GovernanceEngine.CONFIDENCE_THRESHOLD:
            needs_approval = True
            rule_applied = f"Low Confidence Categorization ({confidence_score:.0%} < {GovernanceEngine.CONFIDENCE_THRESHOLD:.0%})"

        if needs_approval:
            transaction.status = "under_review" if amt >= GovernanceEngine.THRESHOLD_MANAGER else "flagged"
            
            # Create Approval entry if not exists
            existing_app = db.query(models.Approval).filter(
                models.Approval.transaction_id == transaction.id,
                models.Approval.status == "pending"
            ).first()

            if not existing_app:
                approval = models.Approval(
                    transaction_id=transaction.id,
                    amount=amt,
                    requested_by="AI Controller Governance",
                    status="pending",
                    threshold_rule_applied=rule_applied
                )
                db.add(approval)
            db.commit()

        return {
            "needs_approval": needs_approval,
            "rule_applied": rule_applied,
            "status": transaction.status
        }

    @staticmethod
    def log_ai_action(
        db: Session,
        action_type: str,
        output: str,
        input_ref: Optional[str] = None,
        confidence_score: float = 1.0,
        model_used: str = "claude-3-5-sonnet",
        human_reviewed: bool = False,
        human_override: bool = False,
        reviewer_id: Optional[str] = None
    ) -> models.AiAction:
        """
        Creates an immutable entry in the `ai_actions` table.
        Every AI classification, anomaly flag, chat response, and report generation is logged here.
        """
        log_entry = models.AiAction(
            type=action_type,
            input_ref=input_ref,
            output=output,
            confidence_score=confidence_score,
            model_used=model_used,
            human_reviewed=human_reviewed,
            human_override=human_override,
            reviewer_id=reviewer_id,
            created_at=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    @staticmethod
    def process_approval_decision(
        db: Session,
        approval_id: int,
        action: str,  # "approve" or "reject"
        approver_id: str = "Finance Lead"
    ) -> models.Approval:
        """
        Updates approval status and transaction status.
        """
        approval = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
        if not approval:
            raise ValueError("Approval record not found")

        approval.status = "approved" if action == "approve" else "rejected"
        approval.approver_id = approver_id
        approval.decided_at = datetime.utcnow()

        if approval.transaction:
            approval.transaction.status = "approved" if action == "approve" else "rejected"

        # Log AI action record for this governance decision
        GovernanceEngine.log_ai_action(
            db=db,
            action_type="governance_decision",
            input_ref=f"approval_id:{approval.id},tx_id:{approval.transaction_id}",
            output=f"Transaction #{approval.transaction_id} (${approval.amount:,.2f}) {action.upper()} by {approver_id}. Rule: {approval.threshold_rule_applied}",
            confidence_score=1.0,
            model_used="Human-in-the-Loop Governance",
            human_reviewed=True,
            human_override=(action == "reject"),
            reviewer_id=approver_id
        )

        db.commit()
        db.refresh(approval)
        return approval

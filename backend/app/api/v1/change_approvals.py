from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.change import Change, ChangeStatus, ChangeActivity
from app.services.notification_service import NotificationService
from pydantic import BaseModel

router = APIRouter()


def is_cab_member(user: User) -> bool:
    """Check if user is a CAB member (can approve changes)"""
    # Superusers/Admins can always approve
    if user.is_superuser:
        return True
    if not user.role:
        return False
    role_name = user.role.name.lower().replace(' ', '_').replace('-', '_')
    # CAB members: Admin, Manager, Team Lead
    return role_name in ['admin', 'administrator', 'system_administrator', 'manager', 'team_lead', 'teamlead', 'cab_member']


def can_approve_change(user: User, change: Change) -> bool:
    """Check if user can approve a specific change"""
    # Must be CAB member
    if not is_cab_member(user):
        return False
    # Cannot approve own changes
    if change.owner_id == user.id:
        return False
    return True


class ApprovalRequest(BaseModel):
    approved: bool
    comments: Optional[str] = None


@router.post("/{change_id}/approve")
async def approve_change(
    change_id: int,
    approval: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject a change (CAB members only)"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # RBAC Check - Only CAB members can approve
    if not can_approve_change(current_user, change):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to approve changes. CAB member role required."
        )

    # Cannot approve own change
    if change.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot approve your own change request"
        )

    # Check if change is in pending approval status
    if change.status != ChangeStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=400, 
            detail=f"Change is not pending approval. Current status: {change.status.value}"
        )
    
    # Update change approval
    change.cab_approved = approval.approved
    change.cab_approved_by_id = current_user.id
    change.cab_approved_at = datetime.utcnow()
    change.cab_comments = approval.comments
    
    # Update status based on approval
    old_status = change.status.value
    if approval.approved:
        change.status = ChangeStatus.APPROVED
        new_status = "APPROVED"
    else:
        change.status = ChangeStatus.REJECTED
        new_status = "REJECTED"
    
    # Log activity
    activity = ChangeActivity(
        change_id=change.id,
        user_id=current_user.id,
        activity_type="approval",
        description=f"Change {'approved' if approval.approved else 'rejected'} by {current_user.full_name}",
        old_value=old_status,
        new_value=new_status
    )
    db.add(activity)
    
    db.commit()
    db.refresh(change)
    
    # Send notifications
    if change.owner:
        if approval.approved:
            NotificationService.notify_change_approved(db, change, change.owner)
        else:
            NotificationService.notify_change_rejected(db, change, change.owner, approval.comments)
    
    return {
        "message": f"Change {'approved' if approval.approved else 'rejected'} successfully",
        "change": {
            "id": change.id,
            "change_number": change.change_number,
            "status": change.status.value,
            "cab_approved": change.cab_approved,
            "cab_approved_at": change.cab_approved_at.isoformat() if change.cab_approved_at else None,
        }
    }

@router.post("/{change_id}/submit-for-approval")
async def submit_for_approval(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit change for CAB approval"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    
    # Check if user is owner
    if change.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only change owner can submit for approval")
    
    # Check if change is in draft or submitted status
    if change.status not in [ChangeStatus.DRAFT, ChangeStatus.SUBMITTED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit for approval. Current status: {change.status.value}"
        )
    
    old_status = change.status.value
    change.status = ChangeStatus.PENDING_APPROVAL
    
    # Log activity
    activity = ChangeActivity(
        change_id=change.id,
        user_id=current_user.id,
        activity_type="status_change",
        description=f"Change submitted for CAB approval by {current_user.full_name}",
        old_value=old_status,
        new_value="PENDING_APPROVAL"
    )
    db.add(activity)
    
    db.commit()
    db.refresh(change)
    
    # Send notifications to CAB members (superusers)
    approvers = db.query(User).filter(User.is_superuser == True).all()
    NotificationService.notify_change_approval_needed(db, change, approvers)
    
    return {
        "message": "Change submitted for approval successfully",
        "change": {
            "id": change.id,
            "change_number": change.change_number,
            "status": change.status.value,
        }
    }

@router.get("/pending-approvals")
async def get_pending_approvals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all changes pending CAB approval (CAB members only)"""
    # RBAC Check - Only CAB members can see pending approvals
    if not is_cab_member(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view pending approvals. CAB member role required."
        )

    # Get changes pending approval (exclude user's own changes)
    changes = db.query(Change).filter(
        Change.status == ChangeStatus.PENDING_APPROVAL,
        Change.owner_id != current_user.id  # Cannot approve own changes
    ).order_by(Change.created_at.desc()).all()
    
    return [
        {
            "id": change.id,
            "change_number": change.change_number,
            "title": change.title,
            "change_type": change.change_type.value if change.change_type else None,
            "risk": change.risk.value if change.risk else None,
            "impact": change.impact.value if change.impact else None,
            "priority": change.priority,
            "planned_start": change.planned_start.isoformat() if change.planned_start else None,
            "planned_end": change.planned_end.isoformat() if change.planned_end else None,
            "requester": {
                "id": change.requester.id,
                "full_name": change.requester.full_name,
                "email": change.requester.email,
            } if change.requester else None,
            "owner": {
                "id": change.owner.id,
                "full_name": change.owner.full_name,
                "email": change.owner.email,
            } if change.owner else None,
            "created_at": change.created_at.isoformat() if change.created_at else None,
        }
        for change in changes
    ]
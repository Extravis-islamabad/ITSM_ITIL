from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.change import Change, ChangeActivity, ChangeTask, ChangeStatus
from app.schemas.change import (
    ChangeCreate, ChangeUpdate, ChangeResponse, CABApprovalRequest,
    ChangeTaskResponse
)
from app.schemas.common import PaginatedResponse
from app.services.change_service import ChangeService
from pydantic import BaseModel
from datetime import datetime


def is_cab_member(user: User) -> bool:
    """Check if user is a CAB member (can approve changes)"""
    if user.is_superuser:
        return True
    if not user.role:
        return False
    role_name = user.role.name.lower().replace(' ', '_').replace('-', '_')
    return role_name in ['admin', 'administrator', 'system_administrator', 'manager', 'team_lead', 'teamlead', 'cab_member']


def can_manage_change(user: User, change: Change) -> bool:
    """Check if user can manage (start/complete) a change"""
    # Admins and CAB members can manage any change
    if is_cab_member(user):
        return True
    # Owner can manage their change
    if change.owner_id == user.id:
        return True
    # Implementer can manage the change they're assigned to
    if change.implementer_id == user.id:
        return True
    return False


def can_approve_change(user: User, change: Change) -> bool:
    """Check if user can approve a change"""
    if not is_cab_member(user):
        return False
    # Cannot approve your own change (either as requester or owner)
    if change.requester_id == user.id:
        return False
    if change.owner_id == user.id:
        return False
    # Can only approve changes that are pending approval
    if change.status != ChangeStatus.PENDING_APPROVAL:
        return False
    return True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    sequence: int = 0
    assigned_to_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None
    sequence: Optional[int] = None

router = APIRouter(tags=["Changes"])

@router.post("", response_model=ChangeResponse, status_code=status.HTTP_201_CREATED)
async def create_change(
    change_data: ChangeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new change request"""
    change = ChangeService.create_change(db, change_data, current_user.id)
    
    return ChangeResponse(
        id=change.id,
        change_number=change.change_number,
        change_type=change.change_type.value,
        title=change.title,
        description=change.description,
        status=change.status.value,
        risk=change.risk.value,
        impact=change.impact.value,
        priority=change.priority,
        requester_id=change.requester_id,
        requester_name=change.requester.full_name if change.requester else None,
        owner_id=change.owner_id,
        owner_name=change.owner.full_name if change.owner else None,
        implementer_id=change.implementer_id,
        implementer_name=change.implementer.full_name if change.implementer else None,
        category_id=change.category_id,
        category_name=change.category.name if change.category else None,
        reason_for_change=change.reason_for_change,
        implementation_plan=change.implementation_plan,
        rollback_plan=change.rollback_plan,
        testing_plan=change.testing_plan,
        business_justification=change.business_justification,
        affected_services=change.affected_services,
        affected_users_count=change.affected_users_count,
        planned_start=change.planned_start,
        planned_end=change.planned_end,
        actual_start=change.actual_start,
        actual_end=change.actual_end,
        requires_cab_approval=change.requires_cab_approval,
        cab_approved=change.cab_approved,
        cab_approved_by_id=change.cab_approved_by_id,
        cab_approved_at=change.cab_approved_at,
        cab_comments=change.cab_comments,
        created_at=change.created_at,
        updated_at=change.updated_at,
    )

@router.get("", response_model=PaginatedResponse)
async def get_changes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    change_type: Optional[str] = None,
    risk: Optional[str] = None,
    owner_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of changes with filters"""
    skip = (page - 1) * page_size
    
    changes, total = ChangeService.get_changes(
        db,
        skip=skip,
        limit=page_size,
        search=search,
        status=status,
        change_type=change_type,
        risk=risk,
        owner_id=owner_id
    )
    
    change_list = [
        {
            "id": c.id,
            "change_number": c.change_number,
            "change_type": c.change_type.value,
            "title": c.title,
            "description": c.description[:100] + "..." if len(c.description) > 100 else c.description,
            "status": c.status.value,
            "risk": c.risk.value,
            "impact": c.impact.value,
            "priority": c.priority,
            "requester_name": c.requester.full_name if c.requester else None,
            "owner_name": c.owner.full_name if c.owner else None,
            "implementer_name": c.implementer.full_name if c.implementer else None,
            "category_name": c.category.name if c.category else None,
            "planned_start": c.planned_start,
            "planned_end": c.planned_end,
            "cab_approved": c.cab_approved,
            "created_at": c.created_at,
        }
        for c in changes
    ]
    
    from math import ceil
    
    return PaginatedResponse(
        items=change_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )

@router.put("/{change_id}", response_model=ChangeResponse)
async def update_change(
    change_id: int,
    change_data: ChangeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update change request"""
    change = ChangeService.update_change(db, change_id, change_data, current_user.id)
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    
    return ChangeResponse(
        id=change.id,
        change_number=change.change_number,
        change_type=change.change_type.value,
        title=change.title,
        description=change.description,
        status=change.status.value,
        risk=change.risk.value,
        impact=change.impact.value,
        priority=change.priority,
        requester_id=change.requester_id,
        requester_name=change.requester.full_name if change.requester else None,
        owner_id=change.owner_id,
        owner_name=change.owner.full_name if change.owner else None,
        implementer_id=change.implementer_id,
        implementer_name=change.implementer.full_name if change.implementer else None,
        category_id=change.category_id,
        category_name=change.category.name if change.category else None,
        reason_for_change=change.reason_for_change,
        implementation_plan=change.implementation_plan,
        rollback_plan=change.rollback_plan,
        testing_plan=change.testing_plan,
        business_justification=change.business_justification,
        affected_services=change.affected_services,
        affected_users_count=change.affected_users_count,
        planned_start=change.planned_start,
        planned_end=change.planned_end,
        actual_start=change.actual_start,
        actual_end=change.actual_end,
        requires_cab_approval=change.requires_cab_approval,
        cab_approved=change.cab_approved,
        cab_approved_by_id=change.cab_approved_by_id,
        cab_approved_at=change.cab_approved_at,
        cab_comments=change.cab_comments,
        created_at=change.created_at,
        updated_at=change.updated_at,
    )

@router.post("/{change_id}/submit")
async def submit_for_approval(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit change for CAB approval"""
    change = ChangeService.submit_for_approval(db, change_id, current_user.id)
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    return {"message": "Change submitted for approval", "change_number": change.change_number}

@router.post("/{change_id}/submit-for-approval")
async def submit_for_approval_alt(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit change for CAB approval (alternate endpoint)"""
    from app.services.notification_service import NotificationService

    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # Check if user is owner or requester
    if change.owner_id != current_user.id and change.requester_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only change owner or requester can submit for approval")

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

    # Send notifications to CAB members
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

@router.post("/{change_id}/approve")
async def approve_change(
    change_id: int,
    approval_data: CABApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """CAB approval or rejection (CAB members only)"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # RBAC Check
    if not can_approve_change(current_user, change):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to approve changes. CAB member role required."
        )

    if approval_data.approved:
        change = ChangeService.approve_change(db, change_id, current_user.id, approval_data.comments)
        message = "Change approved by CAB"
    else:
        change = ChangeService.reject_change(db, change_id, current_user.id, approval_data.comments)
        message = "Change rejected by CAB"

    return {"message": message, "change_number": change.change_number}

@router.post("/{change_id}/schedule")
async def schedule_change(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule an approved change (Owner/Implementer/CAB only)"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # RBAC Check
    if not can_manage_change(current_user, change):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to schedule this change"
        )

    # Status check
    if change.status != ChangeStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved changes can be scheduled"
        )

    # Update status to SCHEDULED
    change.status = ChangeStatus.SCHEDULED

    # Log activity
    activity = ChangeActivity(
        change_id=change.id,
        user_id=current_user.id,
        activity_type="scheduled",
        description=f"Change scheduled for implementation by {current_user.full_name}"
    )
    db.add(activity)
    db.commit()
    db.refresh(change)

    return {"message": "Change scheduled for implementation", "change_number": change.change_number}

@router.post("/{change_id}/start")
@router.post("/{change_id}/start-implementation")
async def start_implementation(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start change implementation (Owner/Implementer/CAB only)"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # RBAC Check
    if not can_manage_change(current_user, change):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to start this change implementation"
        )

    # Status check - must be SCHEDULED
    if change.status != ChangeStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled changes can be started. Current status: " + change.status.value
        )

    change = ChangeService.start_implementation(db, change_id, current_user.id)
    return {"message": "Change implementation started", "change_number": change.change_number}

@router.post("/{change_id}/complete")
@router.post("/{change_id}/complete-implementation")
async def complete_implementation(
    change_id: int,
    closure_notes: str = Query("", description="Optional closure notes"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete change implementation (Owner/Implementer/CAB only)"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # RBAC Check
    if not can_manage_change(current_user, change):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to complete this change implementation"
        )

    change = ChangeService.complete_implementation(db, change_id, current_user.id, closure_notes)
    return {"message": "Change implementation completed", "change_number": change.change_number}

@router.get("/{change_id}/tasks", response_model=List[ChangeTaskResponse])
async def get_change_tasks(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks for a change"""
    tasks = db.query(ChangeTask).filter(ChangeTask.change_id == change_id).order_by(ChangeTask.sequence).all()
    
    return [
        ChangeTaskResponse(
            id=task.id,
            title=task.title,
            description=task.description,
            sequence=task.sequence,
            assigned_to_id=task.assigned_to_id,
            assigned_to_name=task.assigned_to.full_name if task.assigned_to else None,
            status=task.status,
            completed_at=task.completed_at,
            created_at=task.created_at,
        )
        for task in tasks
    ]

@router.get("/{change_id}/activities")
async def get_change_activities(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get activity log for a change"""
    activities = db.query(ChangeActivity).filter(
        ChangeActivity.change_id == change_id
    ).order_by(ChangeActivity.created_at.desc()).all()
    
    return [
        {
            "id": activity.id,
            "user_id": activity.user_id,
            "user_name": activity.user.full_name if activity.user else None,
            "activity_type": activity.activity_type,
            "description": activity.description,
            "old_value": activity.old_value,
            "new_value": activity.new_value,
            "created_at": activity.created_at,
        }
        for activity in activities
    ]

@router.get("/calendar/upcoming")
async def get_change_calendar(
    days: int = Query(30, ge=1, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming changes for calendar view"""
    from datetime import datetime, timedelta
    
    start_date = datetime.now()
    end_date = start_date + timedelta(days=days)
    
    changes = db.query(Change).filter(
        Change.planned_start >= start_date,
        Change.planned_start <= end_date,
        Change.status.in_(["APPROVED", "SCHEDULED", "IN_PROGRESS"])
    ).order_by(Change.planned_start).all()
    
    return [
        {
            "id": c.id,
            "change_number": c.change_number,
            "title": c.title,
            "change_type": c.change_type.value,
            "status": c.status.value,
            "risk": c.risk.value,
            "planned_start": c.planned_start,
            "planned_end": c.planned_end,
            "owner_name": c.owner.full_name if c.owner else None,
        }
        for c in changes
    ]
    
@router.post("/{change_id}/tasks")
async def create_task(
    change_id: int,
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a task to a change"""
    try:
        task = ChangeService.add_task(
            db=db,
            change_id=change_id,
            task_data=task_data.dict(),
            user_id=current_user.id
        )
        
        return {
            "id": task.id,
            "change_id": task.change_id,
            "title": task.title,
            "description": task.description,
            "sequence": task.sequence,
            "status": task.status,
            "assigned_to": {
                "id": task.assigned_to.id,
                "full_name": task.assigned_to.full_name,
            } if task.assigned_to else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "created_at": task.created_at.isoformat() if task.created_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/tasks/{task_id}")
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    try:
        task = ChangeService.update_task(
            db=db,
            task_id=task_id,
            task_data=task_data.dict(exclude_unset=True),
            user_id=current_user.id
        )
        
        return {
            "id": task.id,
            "change_id": task.change_id,
            "title": task.title,
            "description": task.description,
            "sequence": task.sequence,
            "status": task.status,
            "assigned_to": {
                "id": task.assigned_to.id,
                "full_name": task.assigned_to.full_name,
            } if task.assigned_to else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task"""
    try:
        ChangeService.delete_task(db=db, task_id=task_id, user_id=current_user.id)
        return {"message": "Task deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{change_id}/progress")
async def get_change_progress(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get change implementation progress"""
    progress = ChangeService.get_change_progress(db=db, change_id=change_id)
    return progress

@router.post("/{change_id}/start-implementation")
async def start_implementation_alt(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start change implementation (Owner/Implementer/CAB only)"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # RBAC Check
    if not can_manage_change(current_user, change):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to start this change implementation"
        )

    if change.status != ChangeStatus.SCHEDULED:
        raise HTTPException(
            status_code=400,
            detail=f"Change must be in SCHEDULED status. Current: {change.status.value}"
        )
    
    old_status = change.status.value
    change.status = ChangeStatus.IN_PROGRESS
    change.actual_start = datetime.utcnow()
    
    # Log activity
    activity = ChangeActivity(
        change_id=change.id,
        user_id=current_user.id,
        activity_type="implementation_started",
        description=f"Change implementation started by {current_user.full_name}",
        old_value=old_status,
        new_value="IN_PROGRESS"
    )
    db.add(activity)
    
    db.commit()
    db.refresh(change)
    
    return {"message": "Change implementation started successfully"}

@router.post("/{change_id}/complete-implementation")
async def complete_implementation_alt(
    change_id: int,
    closure_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete change implementation (Owner/Implementer/CAB only)"""
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # RBAC Check
    if not can_manage_change(current_user, change):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to complete this change implementation"
        )

    if change.status != ChangeStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail=f"Change must be IN_PROGRESS. Current: {change.status.value}"
        )
    
    old_status = change.status.value
    change.status = ChangeStatus.IMPLEMENTED
    change.actual_end = datetime.utcnow()
    if closure_notes:
        change.closure_notes = closure_notes
    
    # Log activity
    activity = ChangeActivity(
        change_id=change.id,
        user_id=current_user.id,
        activity_type="implementation_completed",
        description=f"Change implementation completed by {current_user.full_name}",
        old_value=old_status,
        new_value="IMPLEMENTED"
    )
    db.add(activity)
    
    db.commit()
    db.refresh(change)
    
    return {"message": "Change implementation completed successfully"}

@router.get("/{change_id}")
async def get_change_detail(
    change_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get change details with all related data"""
    from sqlalchemy.orm import joinedload

    change = db.query(Change).options(
        joinedload(Change.requester),
        joinedload(Change.owner),
        joinedload(Change.implementer),
        joinedload(Change.category),
    ).filter(Change.id == change_id).first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # Permission checks for frontend
    user_can_approve = (
        can_approve_change(current_user, change) and
        change.status == ChangeStatus.PENDING_APPROVAL
    )
    user_can_manage = can_manage_change(current_user, change)

    # Get tasks
    tasks = db.query(ChangeTask).filter(
        ChangeTask.change_id == change_id
    ).order_by(ChangeTask.sequence).all()

    # Get activities
    activities = db.query(ChangeActivity).filter(
        ChangeActivity.change_id == change_id
    ).order_by(ChangeActivity.created_at.desc()).limit(50).all()

    return {
        "id": change.id,
        "change_number": change.change_number,
        "can_approve": user_can_approve,  # Frontend uses this to show/hide approval buttons
        "can_manage": user_can_manage,    # Frontend uses this to show/hide start/complete buttons
        "change_type": change.change_type.value if change.change_type else None,
        "title": change.title,
        "description": change.description,
        "status": change.status.value if change.status else None,
        "risk": change.risk.value if change.risk else None,
        "impact": change.impact.value if change.impact else None,
        "priority": change.priority,
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
        "implementer": {
            "id": change.implementer.id,
            "full_name": change.implementer.full_name,
            "email": change.implementer.email,
        } if change.implementer else None,
        "category": {
            "id": change.category.id,
            "name": change.category.name,
            "icon": change.category.icon,
            "color": change.category.color,
        } if change.category else None,
        "reason_for_change": change.reason_for_change,
        "implementation_plan": change.implementation_plan,
        "rollback_plan": change.rollback_plan,
        "testing_plan": change.testing_plan,
        "business_justification": change.business_justification,
        "planned_start": change.planned_start.isoformat() if change.planned_start else None,
        "planned_end": change.planned_end.isoformat() if change.planned_end else None,
        "actual_start": change.actual_start.isoformat() if change.actual_start else None,
        "actual_end": change.actual_end.isoformat() if change.actual_end else None,
        "requires_cab_approval": change.requires_cab_approval,
        "cab_approved": change.cab_approved,
        "cab_approved_by": {
            "id": change.cab_approver.id,
            "full_name": change.cab_approver.full_name,
        } if change.cab_approver else None,
        "cab_approved_at": change.cab_approved_at.isoformat() if change.cab_approved_at else None,
        "cab_comments": change.cab_comments,
        "affected_services": change.affected_services,
        "affected_users_count": change.affected_users_count,
        "closure_notes": change.closure_notes,
        "closed_at": change.closed_at.isoformat() if change.closed_at else None,
        "closed_by": {
            "id": change.closer.id,
            "full_name": change.closer.full_name,
        } if change.closer else None,
        "created_at": change.created_at.isoformat() if change.created_at else None,
        "updated_at": change.updated_at.isoformat() if change.updated_at else None,
        
        # Related data
        "tasks": [
            {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "sequence": task.sequence,
                "status": task.status,
                "assigned_to": {
                    "id": task.assigned_to.id,
                    "full_name": task.assigned_to.full_name,
                } if task.assigned_to else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "created_at": task.created_at.isoformat() if task.created_at else None,
            }
            for task in tasks
        ],
        "activities": [
            {
                "id": activity.id,
                "activity_type": activity.activity_type,
                "description": activity.description,
                "user": {
                    "id": activity.user.id,
                    "full_name": activity.user.full_name,
                } if activity.user else None,
                "old_value": activity.old_value,
                "new_value": activity.new_value,
                "created_at": activity.created_at.isoformat() if activity.created_at else None,
            }
            for activity in activities
        ],
    }
    
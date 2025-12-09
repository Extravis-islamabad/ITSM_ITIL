from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
from pathlib import Path
from fastapi.responses import FileResponse
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_agent_or_above
from app.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketResponse, TicketDetailResponse,
    TicketAssign, TicketResolve, TicketClose, CommentCreate, CommentResponse,
    SLAPauseRequest, LinkedAssetResponse, TicketDateOverride
)
from app.core.dependencies import require_manager_or_above
from app.models.ticket_activity import TicketActivity
from app.schemas.common import PaginatedResponse
from app.services.ticket_service import TicketService
from app.services.sla_service import SLAService
from app.services.notification_service import NotificationService
from app.models.user import User
from app.models.ticket import Ticket, TicketAsset
from app.models.ticket_attachment import TicketAttachment
from app.models.asset import Asset

router = APIRouter(prefix="/tickets", tags=["Tickets"])

UPLOAD_DIR = Path("uploads/tickets")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("", response_model=PaginatedResponse)
async def get_tickets_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    ticket_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    is_unassigned: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of tickets with filters"""
    skip = (page - 1) * page_size

    tickets, total = TicketService.get_tickets(
        db,
        skip=skip,
        limit=page_size,
        search=search,
        ticket_type=ticket_type,
        status=status,
        priority=priority,
        category_id=category_id,
        assignee_id=assignee_id,
        is_unassigned=is_unassigned,
        current_user=current_user
    )
    
    ticket_list = [
        {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "ticket_type": t.ticket_type,
            "title": t.title,
            "description": t.description[:100] + "..." if len(t.description) > 100 else t.description,
            "status": t.status,
            "priority": t.priority,
            "impact": t.impact,
            "urgency": t.urgency,
            "requester_id": t.requester_id,
            "requester_name": t.requester.full_name if t.requester else None,
            "assignee_id": t.assignee_id,
            "assignee_name": t.assignee.full_name if t.assignee else None,
            "category_id": t.category_id,
            "category_name": t.category.name if t.category else None,
            "subcategory_name": t.subcategory.name if t.subcategory else None,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        }
        for t in tickets
    ]
    
    return PaginatedResponse(
        items=ticket_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 0
    )

@router.post("", response_model=TicketResponse)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new ticket"""
    ticket = TicketService.create_ticket(db, ticket_data, current_user)
    
    # Send notification if ticket is assigned
    if ticket.assignee_id:
        assignee = db.query(User).filter(User.id == ticket.assignee_id).first()
        if assignee:
            NotificationService.notify_ticket_assigned(db, ticket, assignee)
    
    db.refresh(ticket)
    
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        ticket_type=ticket.ticket_type,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        impact=ticket.impact,
        urgency=ticket.urgency,
        category_id=ticket.category_id,
        subcategory_id=ticket.subcategory_id,
        requester_id=ticket.requester_id,
        assignee_id=ticket.assignee_id,
        assigned_group_id=ticket.assigned_group_id,
        asset_id=ticket.asset_id,
        sla_policy_id=ticket.sla_policy_id,
        approval_status=ticket.approval_status,
        approved_by_id=ticket.approved_by_id,
        approved_at=ticket.approved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        response_due=ticket.response_due,
        resolution_due=ticket.resolution_due,
        response_breached=ticket.response_breached,
        resolution_breached=ticket.resolution_breached,
        requester_name=ticket.requester.full_name if ticket.requester else None,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        category_name=ticket.category.name if ticket.category else None,
        subcategory_name=ticket.subcategory.name if ticket.subcategory else None,
        group_name=ticket.assigned_group.name if ticket.assigned_group else None
    )

@router.get("/stats", response_model=dict)
async def get_ticket_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket statistics"""
    return TicketService.get_ticket_stats(db, current_user)

def get_linked_assets_for_ticket(db: Session, ticket: Ticket) -> List[LinkedAssetResponse]:
    """Helper function to get linked assets with their details"""
    linked_assets = []
    for ticket_asset in ticket.linked_assets:
        asset = ticket_asset.asset
        if asset:
            linked_assets.append(LinkedAssetResponse(
                id=ticket_asset.id,
                asset_id=asset.id,
                asset_tag=asset.asset_tag,
                asset_name=asset.name,
                asset_type_name=asset.asset_type.name if asset.asset_type else None,
                status=asset.status.value if asset.status else None,
                notes=ticket_asset.notes
            ))
    return linked_assets


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
async def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket by ID"""
    ticket = TicketService.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    # Get linked assets
    linked_assets = get_linked_assets_for_ticket(db, ticket)

    return TicketDetailResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        ticket_type=ticket.ticket_type,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        impact=ticket.impact,
        urgency=ticket.urgency,
        category_id=ticket.category_id,
        subcategory_id=ticket.subcategory_id,
        requester_id=ticket.requester_id,
        assignee_id=ticket.assignee_id,
        assigned_group_id=ticket.assigned_group_id,
        asset_id=ticket.asset_id,
        sla_policy_id=ticket.sla_policy_id,
        linked_assets=linked_assets,
        requester_name=ticket.requester.full_name if ticket.requester else None,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        category_name=ticket.category.name if ticket.category else None,
        subcategory_name=ticket.subcategory.name if ticket.subcategory else None,
        group_name=ticket.assigned_group.name if ticket.assigned_group else None,
        approval_status=ticket.approval_status,
        approved_by_id=ticket.approved_by_id,
        approved_at=ticket.approved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        response_due=ticket.response_due,
        resolution_due=ticket.resolution_due,
        response_breached=ticket.response_breached,
        resolution_breached=ticket.resolution_breached,
    )

@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_data: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a ticket"""
    # Get current ticket state
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    old_status = ticket.status
    old_assignee_id = ticket.assignee_id
    
    # Update ticket
    ticket = TicketService.update_ticket(db, ticket_id, ticket_data, current_user)
    
    # Send notifications
    update_dict = ticket_data.dict(exclude_unset=True)
    
    # Notify on status change
    if 'status' in update_dict and ticket.status != old_status:
        NotificationService.notify_ticket_status_changed(
            db, ticket, old_status, ticket.status, current_user
        )
    
    # Notify new assignee
    if 'assignee_id' in update_dict and ticket.assignee_id != old_assignee_id:
        if ticket.assignee_id:
            assignee = db.query(User).filter(User.id == ticket.assignee_id).first()
            if assignee:
                NotificationService.notify_ticket_assigned(db, ticket, assignee)
    
    db.refresh(ticket)
    
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        ticket_type=ticket.ticket_type,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        impact=ticket.impact,
        urgency=ticket.urgency,
        category_id=ticket.category_id,
        subcategory_id=ticket.subcategory_id,
        requester_id=ticket.requester_id,
        assignee_id=ticket.assignee_id,
        assigned_group_id=ticket.assigned_group_id,
        asset_id=ticket.asset_id,
        sla_policy_id=ticket.sla_policy_id,
        approval_status=ticket.approval_status,
        approved_by_id=ticket.approved_by_id,
        approved_at=ticket.approved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        response_due=ticket.response_due,
        resolution_due=ticket.resolution_due,
        response_breached=ticket.response_breached,
        resolution_breached=ticket.resolution_breached,
        requester_name=ticket.requester.full_name if ticket.requester else None,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        category_name=ticket.category.name if ticket.category else None,
        subcategory_name=ticket.subcategory.name if ticket.subcategory else None,
        group_name=ticket.assigned_group.name if ticket.assigned_group else None
    )

def is_agent_or_above(user: User) -> bool:
    """Check if user is agent or above role"""
    if user.is_superuser:
        return True
    if not user.role:
        return False
    role_name = user.role.name.lower().replace(' ', '_').replace('-', '_')
    allowed_roles = ['admin', 'system_administrator', 'manager', 'it_manager',
                    'team_lead', 'agent', 'support_agent']
    return role_name in allowed_roles


@router.post("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    ticket_id: int,
    assign_data: TicketAssign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a ticket - requires agent role or above"""
    if not is_agent_or_above(current_user):
        raise HTTPException(status_code=403, detail="Agent access or above required to assign tickets")
    ticket = TicketService.assign_ticket(db, ticket_id, assign_data, current_user)
    
    # Send notification to assignee
    if ticket.assignee_id:
        assignee = db.query(User).filter(User.id == ticket.assignee_id).first()
        if assignee:
            NotificationService.notify_ticket_assigned(db, ticket, assignee)
    
    # Refresh to get related objects
    db.refresh(ticket)
    
    # Build response properly
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        ticket_type=ticket.ticket_type,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        impact=ticket.impact,
        urgency=ticket.urgency,
        category_id=ticket.category_id,
        subcategory_id=ticket.subcategory_id,
        requester_id=ticket.requester_id,
        assignee_id=ticket.assignee_id,
        assigned_group_id=ticket.assigned_group_id,
        asset_id=ticket.asset_id,
        sla_policy_id=ticket.sla_policy_id,
        approval_status=ticket.approval_status,
        approved_by_id=ticket.approved_by_id,
        approved_at=ticket.approved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        response_due=ticket.response_due,
        resolution_due=ticket.resolution_due,
        response_breached=ticket.response_breached,
        resolution_breached=ticket.resolution_breached,
        requester_name=ticket.requester.full_name if ticket.requester else None,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        category_name=ticket.category.name if ticket.category else None,
        subcategory_name=ticket.subcategory.name if ticket.subcategory else None,
        group_name=ticket.assigned_group.name if ticket.assigned_group else None
    )

@router.post("/{ticket_id}/resolve", response_model=TicketResponse)
async def resolve_ticket(
    ticket_id: int,
    resolve_data: TicketResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a ticket - requires agent role or above"""
    if not is_agent_or_above(current_user):
        raise HTTPException(status_code=403, detail="Agent access or above required to resolve tickets")
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    old_status = ticket.status if ticket else None
    
    ticket = TicketService.resolve_ticket(db, ticket_id, resolve_data, current_user)
    
    # Notify status change
    if old_status:
        NotificationService.notify_ticket_status_changed(
            db, ticket, old_status, ticket.status, current_user
        )
    
    db.refresh(ticket)
    
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        ticket_type=ticket.ticket_type,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        impact=ticket.impact,
        urgency=ticket.urgency,
        category_id=ticket.category_id,
        subcategory_id=ticket.subcategory_id,
        requester_id=ticket.requester_id,
        assignee_id=ticket.assignee_id,
        assigned_group_id=ticket.assigned_group_id,
        asset_id=ticket.asset_id,
        sla_policy_id=ticket.sla_policy_id,
        approval_status=ticket.approval_status,
        approved_by_id=ticket.approved_by_id,
        approved_at=ticket.approved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        response_due=ticket.response_due,
        resolution_due=ticket.resolution_due,
        response_breached=ticket.response_breached,
        resolution_breached=ticket.resolution_breached,
        requester_name=ticket.requester.full_name if ticket.requester else None,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        category_name=ticket.category.name if ticket.category else None,
        subcategory_name=ticket.subcategory.name if ticket.subcategory else None,
        group_name=ticket.assigned_group.name if ticket.assigned_group else None
    )

@router.post("/{ticket_id}/close", response_model=TicketResponse)
async def close_ticket(
    ticket_id: int,
    close_data: TicketClose,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close a ticket - requires agent role or above"""
    if not is_agent_or_above(current_user):
        raise HTTPException(status_code=403, detail="Agent access or above required to close tickets")
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    old_status = ticket.status if ticket else None
    
    ticket = TicketService.close_ticket(db, ticket_id, close_data, current_user)
    
    # Notify status change
    if old_status:
        NotificationService.notify_ticket_status_changed(
            db, ticket, old_status, ticket.status, current_user
        )
    
    db.refresh(ticket)
    
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        ticket_type=ticket.ticket_type,
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        impact=ticket.impact,
        urgency=ticket.urgency,
        category_id=ticket.category_id,
        subcategory_id=ticket.subcategory_id,
        requester_id=ticket.requester_id,
        assignee_id=ticket.assignee_id,
        assigned_group_id=ticket.assigned_group_id,
        asset_id=ticket.asset_id,
        sla_policy_id=ticket.sla_policy_id,
        approval_status=ticket.approval_status,
        approved_by_id=ticket.approved_by_id,
        approved_at=ticket.approved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        response_due=ticket.response_due,
        resolution_due=ticket.resolution_due,
        response_breached=ticket.response_breached,
        resolution_breached=ticket.resolution_breached,
        requester_name=ticket.requester.full_name if ticket.requester else None,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        category_name=ticket.category.name if ticket.category else None,
        subcategory_name=ticket.subcategory.name if ticket.subcategory else None,
        group_name=ticket.assigned_group.name if ticket.assigned_group else None
    )

@router.post("/{ticket_id}/comments", response_model=CommentResponse)
async def add_comment(
    ticket_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a ticket"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    comment = TicketService.add_comment(db, ticket_id, comment_data, current_user)

    # Send notification (non-blocking - don't fail if notification fails)
    if ticket:
        try:
            NotificationService.notify_ticket_comment(db, ticket, comment, current_user)
        except Exception as e:
            # Log the error but don't fail the request
            import logging
            logging.error(f"Failed to send comment notification: {e}")

    return CommentResponse(
        id=comment.id,
        ticket_id=comment.ticket_id,
        user_id=comment.user_id,
        comment=comment.comment,
        is_internal=comment.is_internal,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user_name=comment.user.full_name if comment.user else None
    )

@router.get("/{ticket_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    ticket_id: int,
    include_internal: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comments for a ticket"""
    comments = TicketService.get_comments(db, ticket_id, include_internal)
    return [
        CommentResponse(
            id=c.id,
            ticket_id=c.ticket_id,
            user_id=c.user_id,
            comment=c.comment,
            is_internal=c.is_internal,
            created_at=c.created_at,
            updated_at=c.updated_at,
            user_name=c.user.full_name if c.user else None
        ) for c in comments
    ]

@router.get("/{ticket_id}/activities")
async def get_activities(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get activities for a ticket"""
    activities = TicketService.get_activities(db, ticket_id)
    return [{
        "id": a.id, "activity_type": a.activity_type, "description": a.description,
        "user_name": a.user.full_name if a.user else "System",
        "old_value": a.old_value, "new_value": a.new_value, "created_at": a.created_at
    } for a in activities]

@router.post("/{ticket_id}/sla/pause")
async def pause_sla(
    ticket_id: int,
    pause_data: SLAPauseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause SLA for a ticket - requires agent role or above"""
    if not is_agent_or_above(current_user):
        raise HTTPException(status_code=403, detail="Agent access or above required to pause SLA")
    try:
        pause = SLAService.pause_sla(ticket_id, pause_data.reason, current_user, db)
        return {"message": "SLA paused successfully", "pause_id": pause.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{ticket_id}/sla/resume")
async def resume_sla(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume SLA for a ticket - requires agent role or above"""
    if not is_agent_or_above(current_user):
        raise HTTPException(status_code=403, detail="Agent access or above required to resume SLA")
    try:
        SLAService.resume_sla(ticket_id, current_user, db)
        return {"message": "SLA resumed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{ticket_id}/sla/status")
async def get_sla_status(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SLA status for a ticket"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return SLAService.get_time_remaining(ticket, db)

@router.get("/{ticket_id}/sla/pauses")
async def get_sla_pauses(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SLA pause history for a ticket"""
    from app.models.sla_pause import SLAPause

    pauses = db.query(SLAPause).filter(
        SLAPause.ticket_id == ticket_id
    ).order_by(SLAPause.paused_at.desc()).all()

    return [{
        "id": p.id,
        "paused_by": p.paused_by.full_name if p.paused_by else "Unknown",
        "resumed_by": p.resumed_by.full_name if p.resumed_by else None,
        "reason": p.reason,
        "paused_at": p.paused_at,
        "resumed_at": p.resumed_at,
        "pause_duration": p.pause_duration,
        "is_active": p.is_active,
    } for p in pauses]


@router.post("/{ticket_id}/sla/recalculate")
async def recalculate_sla(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recalculate SLA times for a ticket based on current policy - requires agent role or above"""
    if not is_agent_or_above(current_user):
        raise HTTPException(status_code=403, detail="Agent access or above required")

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Store old values
    old_response_due = ticket.response_due
    old_resolution_due = ticket.resolution_due

    # Recalculate SLA times
    SLAService.calculate_sla_times(ticket, db)
    db.commit()
    db.refresh(ticket)

    return {
        "message": "SLA recalculated successfully",
        "old_response_due": old_response_due,
        "old_resolution_due": old_resolution_due,
        "new_response_due": ticket.response_due,
        "new_resolution_due": ticket.resolution_due,
        "sla_policy_id": ticket.sla_policy_id
    }


@router.post("/{ticket_id}/attachments")
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload an attachment to a ticket"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / str(ticket_id) / unique_filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    attachment = TicketAttachment(
        ticket_id=ticket_id, uploaded_by_id=current_user.id,
        filename=unique_filename, original_filename=file.filename,
        file_path=str(file_path), file_size=len(content),
        mime_type=file.content_type or "application/octet-stream"
    )
    
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    return {
        "id": attachment.id, "filename": attachment.original_filename,
        "size": attachment.file_size, "uploaded_at": attachment.created_at
    }

@router.get("/{ticket_id}/attachments")
async def get_attachments(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attachments for a ticket"""
    attachments = db.query(TicketAttachment).filter(TicketAttachment.ticket_id == ticket_id).all()
    return [{
        "id": a.id, "filename": a.original_filename, "size": a.file_size,
        "mime_type": a.mime_type, "uploaded_by": a.uploaded_by.full_name,
        "uploaded_at": a.created_at
    } for a in attachments]

@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download an attachment"""
    attachment = db.query(TicketAttachment).filter(TicketAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=attachment.file_path, filename=attachment.original_filename,
        media_type=attachment.mime_type
    )


@router.post("/{ticket_id}/override-dates")
async def override_ticket_dates(
    ticket_id: int,
    override_data: TicketDateOverride,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """
    Override ticket creation/resolution/closing dates (Manager+ only).
    This is for administrative corrections when tickets were created/resolved
    outside the system or for data migration purposes.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    changes = []

    # Track changes for audit
    if override_data.created_at_override:
        old_value = str(ticket.created_at_override or ticket.created_at)
        ticket.created_at_override = override_data.created_at_override
        changes.append(f"Created date overridden from {old_value} to {override_data.created_at_override}")

    if override_data.resolved_at_override:
        old_value = str(ticket.resolved_at_override or ticket.resolved_at or "Not resolved")
        ticket.resolved_at_override = override_data.resolved_at_override
        changes.append(f"Resolved date overridden from {old_value} to {override_data.resolved_at_override}")

    if override_data.closed_at_override:
        old_value = str(ticket.closed_at_override or ticket.closed_at or "Not closed")
        ticket.closed_at_override = override_data.closed_at_override
        changes.append(f"Closed date overridden from {old_value} to {override_data.closed_at_override}")

    if not changes:
        raise HTTPException(status_code=400, detail="No date overrides provided")

    # Store override metadata
    ticket.override_reason = override_data.override_reason
    ticket.override_by_id = current_user.id

    # Create audit trail
    activity = TicketActivity(
        ticket_id=ticket_id,
        user_id=current_user.id,
        activity_type="date_override",
        description=f"Date override: {override_data.override_reason}",
        old_value=None,
        new_value="; ".join(changes)
    )
    db.add(activity)

    db.commit()
    db.refresh(ticket)

    return {
        "message": "Dates overridden successfully",
        "ticket_id": ticket_id,
        "changes": changes,
        "override_reason": override_data.override_reason,
        "overridden_by": current_user.full_name,
        "effective_created_at": ticket.created_at_override or ticket.created_at,
        "effective_resolved_at": ticket.resolved_at_override or ticket.resolved_at,
        "effective_closed_at": ticket.closed_at_override or ticket.closed_at
    }


@router.delete("/{ticket_id}/override-dates")
async def clear_date_overrides(
    ticket_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Clear all date overrides for a ticket (Manager+ only)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not any([ticket.created_at_override, ticket.resolved_at_override, ticket.closed_at_override]):
        raise HTTPException(status_code=400, detail="No date overrides to clear")

    # Create audit trail
    activity = TicketActivity(
        ticket_id=ticket_id,
        user_id=current_user.id,
        activity_type="date_override_cleared",
        description="All date overrides cleared",
        old_value=f"Created: {ticket.created_at_override}, Resolved: {ticket.resolved_at_override}, Closed: {ticket.closed_at_override}",
        new_value=None
    )
    db.add(activity)

    # Clear overrides
    ticket.created_at_override = None
    ticket.resolved_at_override = None
    ticket.closed_at_override = None
    ticket.override_reason = None
    ticket.override_by_id = None

    db.commit()

    return {"message": "Date overrides cleared successfully", "ticket_id": ticket_id}
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.ticket import (
    TicketCreate, TicketResponse, ApprovalRequest, ApprovalResponse
)
from app.schemas.common import PaginatedResponse
from app.services.ticket_service import TicketService
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_activity import TicketActivity
from app.models.service_request_template import ServiceRequestTemplate
from datetime import datetime
from math import ceil

router = APIRouter(prefix="/service-requests", tags=["Service Requests"])


def is_manager_or_above(user: User) -> bool:
    """Check if user has manager role or above (can approve service requests)"""
    if user.is_superuser:
        return True
    if not user.role:
        return False
    role_name = user.role.name.lower().replace(' ', '_').replace('-', '_')
    return role_name in ['admin', 'administrator', 'system_administrator', 'manager', 'team_lead', 'teamlead']


def can_approve_request(user: User, ticket: Ticket) -> bool:
    """Check if user can approve a specific service request"""
    # Managers and above can approve
    if is_manager_or_above(user):
        return True
    # Users cannot approve their own requests
    if ticket.requester_id == user.id:
        return False
    return False

@router.get("/templates")
async def get_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all service request templates"""
    templates = db.query(ServiceRequestTemplate).filter(
        ServiceRequestTemplate.is_active == True
    ).all()
    
    return [{
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "category_id": t.category_id,
        "category_name": t.category.name if t.category else None,
        "icon": t.icon,
        "estimated_days": t.estimated_days,
        "requires_approval": t.requires_approval,
    } for t in templates]

@router.get("")
async def get_service_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    approval_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of service requests"""
    skip = (page - 1) * page_size
    
    tickets, total = TicketService.get_tickets(
        db,
        skip=skip,
        limit=page_size,
        search=search,
        ticket_type="REQUEST",
        status=status,
        current_user=current_user
    )
    
    # Filter by approval status if provided
    if approval_status:
        tickets = [t for t in tickets if t.approval_status == approval_status]
        total = len(tickets)
    
    ticket_list = [{
        "id": t.id,
        "ticket_number": t.ticket_number,
        "title": t.title,
        "description": t.description[:100] + "..." if len(t.description) > 100 else t.description,
        "status": t.status,
        "priority": t.priority,
        "approval_status": t.approval_status,
        "requester_id": t.requester_id,
        "requester_name": t.requester.full_name if t.requester else None,
        "assignee_id": t.assignee_id,
        "assignee_name": t.assignee.full_name if t.assignee else None,
        "category_name": t.category.name if t.category else None,
        "created_at": t.created_at,
        "approved_at": t.approved_at,
    } for t in tickets]
    
    return PaginatedResponse(
        items=ticket_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )

@router.post("/{ticket_id}/approve")
async def approve_request(
    ticket_id: int,
    approval: ApprovalResponse,  # This expects the request body
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject a service request (Manager or above only)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Service request not found")

    # RBAC check - only managers or above can approve
    if not can_approve_request(current_user, ticket):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to approve service requests. Manager role or above required."
        )

    # Cannot approve your own request
    if ticket.requester_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot approve your own service request"
        )

    # Check if already processed
    if ticket.approval_status not in [None, 'pending']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This request has already been {ticket.approval_status}"
        )

    # Update approval status
    if approval.approved:
        ticket.approval_status = "approved"
        ticket.approved_by_id = current_user.id
        ticket.approved_at = datetime.utcnow()
        ticket.status = TicketStatus.OPEN.value
        
        activity_desc = f"Service request approved by {current_user.full_name}"
        if approval.comments:
            activity_desc += f": {approval.comments}"
    else:
        ticket.approval_status = "rejected"
        ticket.status = TicketStatus.CANCELLED.value  # ✅ Make sure CANCELLED status exists
        
        activity_desc = f"Service request rejected by {current_user.full_name}: {approval.comments}"
    
    # Create activity log
    activity = TicketActivity(
        ticket_id=ticket_id,
        user_id=current_user.id,
        activity_type="approval_decision",
        description=activity_desc
    )
    db.add(activity)
    
    db.commit()
    db.refresh(ticket)
    
    return {
        "message": f"Service request {'approved' if approval.approved else 'rejected'}",
        "ticket_id": ticket.id,
        "approval_status": ticket.approval_status
    }

@router.get("/pending-approvals")
async def get_pending_approvals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get service requests pending approval (Manager or above only)"""

    # RBAC check - only managers or above can see pending approvals
    if not is_manager_or_above(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view pending approvals. Manager role or above required."
        )

    # Get requests that need approval (exclude user's own requests)
    pending = db.query(Ticket).filter(
        Ticket.ticket_type == "REQUEST",
        Ticket.approval_status == "pending",
        Ticket.requester_id != current_user.id  # Cannot approve own requests
    ).all()

    return [{
        "id": t.id,
        "ticket_number": t.ticket_number,
        "title": t.title,
        "requester_name": t.requester.full_name if t.requester else None,
        "category_name": t.category.name if t.category else None,
        "created_at": t.created_at,
    } for t in pending]

@router.get("/{request_id}")
async def get_service_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get service request details"""
    ticket = db.query(Ticket).filter(Ticket.id == request_id).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Check if current user can approve this request
    user_can_approve = (
        can_approve_request(current_user, ticket) and
        ticket.approval_status == 'pending' and
        ticket.requester_id != current_user.id
    )

    # Get linked assets
    linked_assets = []
    for ticket_asset in ticket.linked_assets:
        asset = ticket_asset.asset
        if asset:
            linked_assets.append({
                "id": ticket_asset.id,
                "asset_id": asset.id,
                "asset_tag": asset.asset_tag,
                "asset_name": asset.name,
                "asset_type_name": asset.asset_type.name if asset.asset_type else None,
                "status": asset.status.value if asset.status else None,
                "notes": ticket_asset.notes
            })

    return {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "ticket_type": ticket.ticket_type.value if hasattr(ticket.ticket_type, 'value') else ticket.ticket_type,
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value if hasattr(ticket.status, 'value') else ticket.status,
        "priority": ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority,
        "impact": ticket.impact.value if hasattr(ticket.impact, 'value') else ticket.impact,
        "urgency": ticket.urgency.value if hasattr(ticket.urgency, 'value') else ticket.urgency,
        "approval_status": ticket.approval_status or None,
        "can_approve": user_can_approve,  # Frontend uses this to show/hide approval buttons
        "requester_id": ticket.requester_id,
        "requester_name": ticket.requester.full_name if ticket.requester else None,
        "assignee_id": ticket.assignee_id,
        "assignee_name": ticket.assignee.full_name if ticket.assignee else None,
        "category_id": ticket.category_id,
        "category_name": ticket.category.name if ticket.category else None,
        "subcategory_id": ticket.subcategory_id,
        "subcategory_name": ticket.subcategory.name if ticket.subcategory else None,
        "approved_by_id": ticket.approved_by_id,
        "approved_at": ticket.approved_at,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "linked_assets": linked_assets,
    }
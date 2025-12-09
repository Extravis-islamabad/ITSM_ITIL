from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime
from app.models.ticket import Ticket, TicketStatus, TicketAsset
from app.models.ticket_comment import TicketComment
from app.models.ticket_activity import TicketActivity
from app.models.user import User
from app.models.asset import Asset
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketAssign, TicketResolve, TicketClose, CommentCreate
from app.utils.helpers import generate_ticket_number
from app.services.sla_service import SLAService
from app.services.email_service import EmailService

class TicketService:
    @staticmethod
    def create_ticket(db: Session, ticket_data: TicketCreate, current_user: User) -> Ticket:
        year = datetime.now().year
        sequence = db.query(func.count(Ticket.id)).filter(
            func.extract('year', Ticket.created_at) == year
        ).scalar() + 1
        
        ticket_number = generate_ticket_number(
            "INC" if ticket_data.ticket_type.value == "INCIDENT" else "REQ", sequence
        )
        
        db_ticket = Ticket(
            ticket_number=ticket_number, title=ticket_data.title,
            description=ticket_data.description, ticket_type=ticket_data.ticket_type.value,
            category_id=ticket_data.category_id, subcategory_id=ticket_data.subcategory_id,
            priority=ticket_data.priority.value, impact=ticket_data.impact.value,
            urgency=ticket_data.urgency.value,
            requester_id=ticket_data.requester_id or current_user.id,
            asset_id=ticket_data.asset_id, sla_policy_id=ticket_data.sla_policy_id,
            status=TicketStatus.NEW.value, source="web"
        )
        
        db_ticket.priority = TicketService._calculate_priority(
            ticket_data.impact.value, ticket_data.urgency.value
        )
        
        db.add(db_ticket)
        db.flush()
        
        if ticket_data.ticket_type.value == "REQUEST":
            db_ticket.approval_status = "pending"
        
        SLAService.calculate_sla_times(db_ticket, db)
        
        activity = TicketActivity(
            ticket_id=db_ticket.id, user_id=current_user.id, activity_type="created",
            description=f"Ticket created by {current_user.full_name}"
        )
        db.add(activity)

        # Handle multiple asset linking
        if ticket_data.asset_ids:
            for asset_id in ticket_data.asset_ids:
                # Verify asset exists
                asset = db.query(Asset).filter(Asset.id == asset_id).first()
                if asset:
                    ticket_asset = TicketAsset(
                        ticket_id=db_ticket.id,
                        asset_id=asset_id
                    )
                    db.add(ticket_asset)

        db.commit()
        db.refresh(db_ticket)
        return db_ticket
    
    @staticmethod
    def get_ticket(db: Session, ticket_id: int) -> Optional[Ticket]:
        return db.query(Ticket).filter(Ticket.id == ticket_id).first()
    
    @staticmethod
    def get_ticket_by_number(db: Session, ticket_number: str) -> Optional[Ticket]:
        return db.query(Ticket).filter(Ticket.ticket_number == ticket_number).first()
    
    @staticmethod
    def get_tickets(db: Session, skip: int = 0, limit: int = 20, search: Optional[str] = None,
                   ticket_type: Optional[str] = None, status: Optional[str] = None,
                   priority: Optional[str] = None, category_id: Optional[int] = None,
                   assignee_id: Optional[int] = None, requester_id: Optional[int] = None,
                   assigned_group_id: Optional[int] = None, current_user: Optional[User] = None,
                   is_unassigned: Optional[bool] = None) -> tuple:
        query = db.query(Ticket)

        # RBAC: End users can only see their own tickets
        if current_user and not current_user.is_superuser:
            user_role = current_user.role.name.lower() if current_user.role else 'end_user'
            # Normalize role name
            user_role = user_role.replace(' ', '_').replace('-', '_')

            # Define allowed roles that can see all tickets
            allowed_roles = ['admin', 'system_administrator', 'manager', 'it_manager',
                           'team_lead', 'agent', 'support_agent']

            if user_role not in allowed_roles:
                # End users can only see their own tickets
                query = query.filter(Ticket.requester_id == current_user.id)

        if search:
            search_filter = f"%{search}%"
            query = query.filter(or_(
                Ticket.ticket_number.ilike(search_filter),
                Ticket.title.ilike(search_filter),
                Ticket.description.ilike(search_filter)
            ))

        if ticket_type: query = query.filter(Ticket.ticket_type == ticket_type)
        # Handle status filter - compare with enum value properly
        if status:
            try:
                status_enum = TicketStatus(status)
                query = query.filter(Ticket.status == status_enum)
            except ValueError:
                # If status string doesn't match enum, try direct comparison
                query = query.filter(Ticket.status == status)
        if priority: query = query.filter(Ticket.priority == priority)
        if category_id: query = query.filter(Ticket.category_id == category_id)
        if assignee_id: query = query.filter(Ticket.assignee_id == assignee_id)
        if is_unassigned is True: query = query.filter(Ticket.assignee_id == None)
        if requester_id: query = query.filter(Ticket.requester_id == requester_id)
        if assigned_group_id: query = query.filter(Ticket.assigned_group_id == assigned_group_id)
        
        query = query.order_by(desc(Ticket.created_at))
        total = query.count()
        tickets = query.offset(skip).limit(limit).all()
        return tickets, total
    
    @staticmethod
    def update_ticket(db: Session, ticket_id: int, ticket_data: TicketUpdate, current_user: User) -> Ticket:
        db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not db_ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        changes = {}
        update_data = ticket_data.dict(exclude_unset=True)

        # Handle asset_ids separately
        asset_ids = update_data.pop('asset_ids', None)

        # Track if priority changed - to recalculate SLA
        old_priority = db_ticket.priority
        priority_changed = False

        for field, value in update_data.items():
            if hasattr(db_ticket, field):
                old_value = getattr(db_ticket, field)
                if old_value != value:
                    changes[field] = {"old": str(old_value), "new": str(value)}
                    setattr(db_ticket, field, value)
                    if field == 'priority':
                        priority_changed = True

        # Handle multiple asset linking if asset_ids is provided
        if asset_ids is not None:
            # Get current linked asset IDs
            current_asset_ids = [ta.asset_id for ta in db_ticket.linked_assets]

            # Remove assets that are no longer in the list
            for ticket_asset in db_ticket.linked_assets:
                if ticket_asset.asset_id not in asset_ids:
                    db.delete(ticket_asset)

            # Add new assets
            for asset_id in asset_ids:
                if asset_id not in current_asset_ids:
                    asset = db.query(Asset).filter(Asset.id == asset_id).first()
                    if asset:
                        ticket_asset = TicketAsset(
                            ticket_id=db_ticket.id,
                            asset_id=asset_id
                        )
                        db.add(ticket_asset)

            changes['linked_assets'] = {"old": str(current_asset_ids), "new": str(asset_ids)}

        # Recalculate SLA times if priority changed and ticket is not resolved/closed
        if priority_changed and db_ticket.status not in [TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value, TicketStatus.CANCELLED.value]:
            SLAService.calculate_sla_times(db_ticket, db)
            activity = TicketActivity(
                ticket_id=db_ticket.id, user_id=current_user.id, activity_type="sla_recalculated",
                description=f"SLA times recalculated due to priority change from {old_priority} to {db_ticket.priority}"
            )
            db.add(activity)

        if changes:
            activity = TicketActivity(
                ticket_id=db_ticket.id, user_id=current_user.id, activity_type="updated",
                description=f"Ticket updated by {current_user.full_name}",
                old_value=changes, new_value=changes
            )
            db.add(activity)

        db.commit()
        db.refresh(db_ticket)
        return db_ticket
    
    @staticmethod
    def assign_ticket(db: Session, ticket_id: int, assign_data: TicketAssign, current_user: User) -> Ticket:
        db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not db_ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
        old_assignee = db_ticket.assignee_id
        old_group = db_ticket.assigned_group_id
        
        db_ticket.assignee_id = assign_data.assignee_id
        db_ticket.assigned_group_id = assign_data.assigned_group_id

        # Change status from NEW to OPEN when assigned
        current_status = db_ticket.status.value if hasattr(db_ticket.status, 'value') else db_ticket.status
        status_changed = False
        if current_status == "NEW":
            db_ticket.status = TicketStatus.OPEN.value
            status_changed = True

        assignee_name = "Unassigned"
        if assign_data.assignee_id:
            assignee = db.query(User).filter(User.id == assign_data.assignee_id).first()
            assignee_name = assignee.full_name if assignee else "Unknown"
        
        activity = TicketActivity(
            ticket_id=db_ticket.id, user_id=current_user.id, activity_type="assigned",
            description=f"Ticket assigned to {assignee_name} by {current_user.full_name}",
            old_value={"assignee_id": old_assignee, "group_id": old_group},
            new_value={"assignee_id": assign_data.assignee_id, "group_id": assign_data.assigned_group_id}
        )
        db.add(activity)

        # Log status change if it happened
        if status_changed:
            status_activity = TicketActivity(
                ticket_id=db_ticket.id, user_id=current_user.id, activity_type="status_changed",
                description=f"Status changed from NEW to OPEN (auto-assigned)",
                old_value={"status": "NEW"},
                new_value={"status": "OPEN"}
            )
            db.add(status_activity)

        db.commit()
        
        if assign_data.assignee_id:
            assignee = db.query(User).filter(User.id == assign_data.assignee_id).first()
            if assignee:
                EmailService.send_ticket_assigned_notification(db_ticket, assignee)
        
        db.refresh(db_ticket)
        return db_ticket
    
    @staticmethod
    def resolve_ticket(db: Session, ticket_id: int, resolve_data: TicketResolve, current_user: User) -> Ticket:
        db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not db_ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
        if db_ticket.status in [TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                              detail="Ticket is already resolved or closed")
        
        db_ticket.status = TicketStatus.RESOLVED.value
        db_ticket.resolution_notes = resolve_data.resolution_notes
        db_ticket.resolved_at = datetime.utcnow()
        db_ticket.resolved_by_id = current_user.id
        
        activity = TicketActivity(
            ticket_id=db_ticket.id, user_id=current_user.id, activity_type="resolved",
            description=f"Ticket resolved by {current_user.full_name}"
        )
        db.add(activity)
        db.commit()
        db.refresh(db_ticket)
        return db_ticket
    
    @staticmethod
    def close_ticket(db: Session, ticket_id: int, close_data: TicketClose, current_user: User) -> Ticket:
        db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not db_ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
        if db_ticket.status != TicketStatus.RESOLVED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                              detail="Ticket must be resolved before closing")
        
        db_ticket.status = TicketStatus.CLOSED.value
        db_ticket.closed_at = datetime.utcnow()
        db_ticket.closed_by_id = current_user.id
        db_ticket.closure_code = close_data.closure_code
        
        activity = TicketActivity(
            ticket_id=db_ticket.id, user_id=current_user.id, activity_type="closed",
            description=f"Ticket closed by {current_user.full_name}"
        )
        db.add(activity)
        db.commit()
        db.refresh(db_ticket)
        return db_ticket
    
    @staticmethod
    def add_comment(db: Session, ticket_id: int, comment_data: CommentCreate, current_user: User) -> TicketComment:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

        comment = TicketComment(
            ticket_id=ticket_id, user_id=current_user.id,
            comment=comment_data.comment, is_internal=comment_data.is_internal
        )
        db.add(comment)

        # Track first response time - only for non-internal comments from non-requesters
        if not comment_data.is_internal and current_user.id != ticket.requester_id:
            if ticket.first_response_at is None:
                ticket.first_response_at = datetime.utcnow()

        activity = TicketActivity(
            ticket_id=ticket_id, user_id=current_user.id, activity_type="commented",
            description=f"{'Internal note' if comment_data.is_internal else 'Comment'} added by {current_user.full_name}"
        )
        db.add(activity)
        db.commit()
        db.refresh(comment)
        return comment
    
    @staticmethod
    def get_comments(db: Session, ticket_id: int, include_internal: bool = True) -> List[TicketComment]:
        query = db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id)
        if not include_internal:
            query = query.filter(TicketComment.is_internal == False)
        return query.order_by(TicketComment.created_at).all()
    
    @staticmethod
    def get_activities(db: Session, ticket_id: int) -> List[TicketActivity]:
        return db.query(TicketActivity).filter(
            TicketActivity.ticket_id == ticket_id
        ).order_by(TicketActivity.created_at).all()
    
    @staticmethod
    def _calculate_priority(impact: str, urgency: str) -> str:
        matrix = {
            ("HIGH", "HIGH"): "CRITICAL", ("HIGH", "MEDIUM"): "HIGH", ("HIGH", "LOW"): "MEDIUM",
            ("MEDIUM", "HIGH"): "HIGH", ("MEDIUM", "MEDIUM"): "MEDIUM", ("MEDIUM", "LOW"): "LOW",
            ("LOW", "HIGH"): "MEDIUM", ("LOW", "MEDIUM"): "LOW", ("LOW", "LOW"): "LOW"
        }
        return matrix.get((impact, urgency), "MEDIUM")
    
    @staticmethod
    def get_ticket_stats(db: Session, current_user: User) -> dict:
        return {
            "total": db.query(Ticket).count(),
            "open": db.query(Ticket).filter(Ticket.status.in_([
                TicketStatus.NEW.value, TicketStatus.OPEN.value, TicketStatus.IN_PROGRESS.value
            ])).count(),
            "my_tickets": db.query(Ticket).filter(Ticket.assignee_id == current_user.id).count(),
            "unassigned": db.query(Ticket).filter(Ticket.assignee_id == None).count(),
            "critical": db.query(Ticket).filter(Ticket.priority == "CRITICAL").count()
        }
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.models.notification import Notification, NotificationType, NotificationPreference
from app.models.user import User
from app.core.email import send_email as send_email_func
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotificationService:

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        action_url: Optional[str] = None,
        should_send_email: bool = True
    ) -> Notification:
        """Create a notification and optionally send email"""
        
        # Get user preferences
        preferences = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).first()
        
        # Create default preferences if they don't exist
        if not preferences:
            preferences = NotificationPreference(user_id=user_id)
            db.add(preferences)
            db.commit()
        
        # Check if in-app notification is enabled for this type
        inapp_enabled = NotificationService._check_inapp_preference(preferences, notification_type)
        
        if not inapp_enabled:
            return None
        
        # Create notification
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
            is_read=False
        )
        db.add(notification)
        db.flush()
        
        # Send email if enabled
        if should_send_email:
            email_enabled = NotificationService._check_email_preference(preferences, notification_type)
            if email_enabled:
                NotificationService._send_email_notification(db, notification)
        
        db.commit()
        db.refresh(notification)
        
        return notification
    
    @staticmethod
    def _check_inapp_preference(preferences: NotificationPreference, notif_type: NotificationType) -> bool:
        """Check if in-app notification is enabled for this type"""
        mapping = {
            NotificationType.TICKET_ASSIGNED: preferences.inapp_ticket_assigned,
            NotificationType.TICKET_STATUS_CHANGED: preferences.inapp_ticket_status_changed,
            NotificationType.TICKET_COMMENT: preferences.inapp_ticket_comment,
            NotificationType.CHANGE_APPROVAL_NEEDED: preferences.inapp_change_approval_needed,
            NotificationType.CHANGE_STATUS_CHANGED: preferences.inapp_change_status_changed,
            NotificationType.SERVICE_REQUEST_APPROVED: preferences.inapp_service_request_updates,
            NotificationType.SERVICE_REQUEST_REJECTED: preferences.inapp_service_request_updates,
            NotificationType.SLA_BREACH_WARNING: preferences.inapp_sla_warnings,
            NotificationType.SLA_BREACHED: preferences.inapp_sla_warnings,
        }
        return mapping.get(notif_type, True)
    
    @staticmethod
    def _check_email_preference(preferences: NotificationPreference, notif_type: NotificationType) -> bool:
        """Check if email notification is enabled for this type"""
        mapping = {
            NotificationType.TICKET_ASSIGNED: preferences.email_ticket_assigned,
            NotificationType.TICKET_STATUS_CHANGED: preferences.email_ticket_status_changed,
            NotificationType.TICKET_COMMENT: preferences.email_ticket_comment,
            NotificationType.CHANGE_APPROVAL_NEEDED: preferences.email_change_approval_needed,
            NotificationType.CHANGE_STATUS_CHANGED: preferences.email_change_status_changed,
            NotificationType.SERVICE_REQUEST_APPROVED: preferences.email_service_request_updates,
            NotificationType.SERVICE_REQUEST_REJECTED: preferences.email_service_request_updates,
            NotificationType.SLA_BREACH_WARNING: preferences.email_sla_warnings,
            NotificationType.SLA_BREACHED: preferences.email_sla_warnings,
        }
        return mapping.get(notif_type, True)
    
    @staticmethod
    def _send_email_notification(db: Session, notification: Notification):
        """Send email notification with branded template"""
        try:
            from app.core.email_templates import EmailTemplates
            
            user = db.query(User).filter(User.id == notification.user_id).first()
            if not user or not user.email:
                return
            
            # Generate HTML based on notification type
            html_content = ""
            subject = f"[SupportX] {notification.title}"
            
            if notification.type == NotificationType.TICKET_ASSIGNED:
                # Extract ticket info from notification
                from app.models.ticket import Ticket
                ticket = db.query(Ticket).filter(Ticket.id == notification.entity_id).first()
                if ticket:
                    html_content = EmailTemplates.ticket_assigned(
                        ticket_number=ticket.ticket_number,
                        title=ticket.title,
                        priority=ticket.priority or "MEDIUM",
                        assignee_name=user.full_name,
                        action_url=f"{settings.APP_URL}/tickets/{ticket.id}"
                    )
            
            elif notification.type == NotificationType.TICKET_STATUS_CHANGED:
                from app.models.ticket import Ticket
                ticket = db.query(Ticket).filter(Ticket.id == notification.entity_id).first()
                if ticket:
                    # Extract status from message if available
                    html_content = EmailTemplates.ticket_status_changed(
                        ticket_number=ticket.ticket_number,
                        title=ticket.title,
                        old_status="Previous",
                        new_status=ticket.status or "Updated",
                        user_name=user.full_name,
                        action_url=f"{settings.APP_URL}/tickets/{ticket.id}"
                    )
            
            elif notification.type == NotificationType.TICKET_COMMENT:
                from app.models.ticket import Ticket
                ticket = db.query(Ticket).filter(Ticket.id == notification.entity_id).first()
                if ticket:
                    html_content = EmailTemplates.ticket_comment(
                        ticket_number=ticket.ticket_number,
                        title=ticket.title,
                        commenter_name="Team Member",
                        comment_preview=notification.message[:100],
                        action_url=f"{settings.APP_URL}/tickets/{ticket.id}"
                    )
            
            elif notification.type == NotificationType.CHANGE_APPROVAL_NEEDED:
                from app.models.change import Change
                change = db.query(Change).filter(Change.id == notification.entity_id).first()
                if change:
                    html_content = EmailTemplates.change_approval_needed(
                        change_number=change.change_number,
                        title=change.title,
                        risk=change.risk.value if change.risk else "MEDIUM",
                        planned_start=change.planned_start.strftime("%Y-%m-%d %H:%M") if change.planned_start else "TBD",
                        action_url=f"{settings.APP_URL}/changes/{change.id}"
                    )
            
            elif notification.type == NotificationType.CHANGE_APPROVED:
                from app.models.change import Change
                change = db.query(Change).filter(Change.id == notification.entity_id).first()
                if change:
                    html_content = EmailTemplates.change_approved(
                        change_number=change.change_number,
                        title=change.title,
                        approved_by=change.cab_approved_by.full_name if change.cab_approved_by else "CAB",
                        action_url=f"{settings.APP_URL}/changes/{change.id}"
                    )
            
            elif notification.type == NotificationType.CHANGE_REJECTED:
                from app.models.change import Change
                change = db.query(Change).filter(Change.id == notification.entity_id).first()
                if change:
                    html_content = EmailTemplates.change_rejected(
                        change_number=change.change_number,
                        title=change.title,
                        rejected_by=change.cab_approved_by.full_name if change.cab_approved_by else "CAB",
                        reason=change.cab_comments or "No reason provided",
                        action_url=f"{settings.APP_URL}/changes/{change.id}"
                    )
            
            # If no template matched, use generic template
            if not html_content:
                html_content = EmailTemplates.get_base_template(
                    f"<h2>{notification.title}</h2><p>{notification.message}</p>",
                    notification.title
                )
            
            # Send email
            send_email_func(
                to_email=user.email,
                subject=subject,
                html_content=html_content
            )
            
            notification.email_sent = True
            notification.email_sent_at = datetime.utcnow()
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            return True
        return False
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        })
        db.commit()
        return count
    
    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
        return notifications
    
    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get count of unread notifications"""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
        return count
    
    @staticmethod
    def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            db.delete(notification)
            db.commit()
            return True
        return False
    
    # Specific notification creators
    
    @staticmethod
    def notify_ticket_assigned(db: Session, ticket, assignee: User):
        """Notify when a ticket is assigned"""
        NotificationService.create_notification(
            db=db,
            user_id=assignee.id,
            notification_type=NotificationType.TICKET_ASSIGNED,
            title=f"Ticket Assigned: {ticket.ticket_number}",
            message=f"You have been assigned to ticket: {ticket.title}",
            entity_type="ticket",
            entity_id=ticket.id,
            action_url=f"/tickets/{ticket.id}"
        )
    
    @staticmethod
    def notify_ticket_status_changed(db: Session, ticket, old_status: str, new_status: str, user: User):
        """Notify when ticket status changes"""
        # Notify requester
        if ticket.requester_id and ticket.requester_id != user.id:
            NotificationService.create_notification(
                db=db,
                user_id=ticket.requester_id,
                notification_type=NotificationType.TICKET_STATUS_CHANGED,
                title=f"Ticket Status Updated: {ticket.ticket_number}",
                message=f"Ticket '{ticket.title}' status changed from {old_status} to {new_status}",
                entity_type="ticket",
                entity_id=ticket.id,
                action_url=f"/tickets/{ticket.id}"
            )
        
        # Notify assignee if different from requester
        if ticket.assignee_id and ticket.assignee_id != user.id and ticket.assignee_id != ticket.requester_id:
            NotificationService.create_notification(
                db=db,
                user_id=ticket.assignee_id,
                notification_type=NotificationType.TICKET_STATUS_CHANGED,
                title=f"Ticket Status Updated: {ticket.ticket_number}",
                message=f"Ticket '{ticket.title}' status changed from {old_status} to {new_status}",
                entity_type="ticket",
                entity_id=ticket.id,
                action_url=f"/tickets/{ticket.id}"
            )
    
    @staticmethod
    def notify_ticket_comment(db: Session, ticket, comment, commenter: User):
        """Notify when someone comments on a ticket"""
        # Notify requester if they didn't make the comment
        if ticket.requester_id and ticket.requester_id != commenter.id:
            NotificationService.create_notification(
                db=db,
                user_id=ticket.requester_id,
                notification_type=NotificationType.TICKET_COMMENT,
                title=f"New Comment on {ticket.ticket_number}",
                message=f"{commenter.full_name} commented: {comment.comment[:100]}..." if len(comment.comment) > 100 else f"{commenter.full_name} commented: {comment.comment}",
                entity_type="ticket",
                entity_id=ticket.id,
                action_url=f"/tickets/{ticket.id}"
            )

        # Notify assignee if they didn't make the comment
        if ticket.assignee_id and ticket.assignee_id != commenter.id and ticket.assignee_id != ticket.requester_id:
            NotificationService.create_notification(
                db=db,
                user_id=ticket.assignee_id,
                notification_type=NotificationType.TICKET_COMMENT,
                title=f"New Comment on {ticket.ticket_number}",
                message=f"{commenter.full_name} commented: {comment.comment[:100]}..." if len(comment.comment) > 100 else f"{commenter.full_name} commented: {comment.comment}",
                entity_type="ticket",
                entity_id=ticket.id,
                action_url=f"/tickets/{ticket.id}"
            )
    
    @staticmethod
    def notify_change_approval_needed(db: Session, change, approvers: List[User]):
        """Notify when a change needs approval"""
        for approver in approvers:
            NotificationService.create_notification(
                db=db,
                user_id=approver.id,
                notification_type=NotificationType.CHANGE_APPROVAL_NEEDED,
                title=f"Change Approval Needed: {change.change_number}",
                message=f"Change '{change.title}' requires your approval",
                entity_type="change",
                entity_id=change.id,
                action_url=f"/changes/{change.id}"
            )
    
    @staticmethod
    def notify_change_approved(db: Session, change, owner: User):
        """Notify when a change is approved"""
        if owner:
            NotificationService.create_notification(
                db=db,
                user_id=owner.id,
                notification_type=NotificationType.CHANGE_APPROVED,
                title=f"Change Approved: {change.change_number}",
                message=f"Your change '{change.title}' has been approved",
                entity_type="change",
                entity_id=change.id,
                action_url=f"/changes/{change.id}"
            )
    
    @staticmethod
    def notify_change_rejected(db: Session, change, owner: User, reason: str = None):
        """Notify when a change is rejected"""
        if owner:
            message = f"Your change '{change.title}' has been rejected"
            if reason:
                message += f". Reason: {reason}"
            
            NotificationService.create_notification(
                db=db,
                user_id=owner.id,
                notification_type=NotificationType.CHANGE_REJECTED,
                title=f"Change Rejected: {change.change_number}",
                message=message,
                entity_type="change",
                entity_id=change.id,
                action_url=f"/changes/{change.id}"
            )
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class NotificationType(str, enum.Enum):
    TICKET_ASSIGNED = "TICKET_ASSIGNED"
    TICKET_STATUS_CHANGED = "TICKET_STATUS_CHANGED"
    TICKET_COMMENT = "TICKET_COMMENT"
    TICKET_PRIORITY_CHANGED = "TICKET_PRIORITY_CHANGED"
    CHANGE_ASSIGNED = "CHANGE_ASSIGNED"
    CHANGE_APPROVAL_NEEDED = "CHANGE_APPROVAL_NEEDED"
    CHANGE_APPROVED = "CHANGE_APPROVED"
    CHANGE_REJECTED = "CHANGE_REJECTED"
    CHANGE_STATUS_CHANGED = "CHANGE_STATUS_CHANGED"
    SERVICE_REQUEST_APPROVED = "SERVICE_REQUEST_APPROVED"
    SERVICE_REQUEST_REJECTED = "SERVICE_REQUEST_REJECTED"
    SERVICE_REQUEST_COMPLETED = "SERVICE_REQUEST_COMPLETED"
    MENTION = "MENTION"
    SLA_BREACH_WARNING = "SLA_BREACH_WARNING"
    SLA_BREACHED = "SLA_BREACHED"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Reference to the entity that triggered the notification
    entity_type = Column(String(50))  # ticket, change, service_request, etc.
    entity_id = Column(Integer)
    
    # Action URL
    action_url = Column(String(500))
    
    # Notification state
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Email notification
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification {self.type} for User {self.user_id}>"

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Email preferences
    email_ticket_assigned = Column(Boolean, default=True)
    email_ticket_status_changed = Column(Boolean, default=True)
    email_ticket_comment = Column(Boolean, default=True)
    email_change_approval_needed = Column(Boolean, default=True)
    email_change_status_changed = Column(Boolean, default=True)
    email_service_request_updates = Column(Boolean, default=True)
    email_sla_warnings = Column(Boolean, default=True)
    
    # In-app preferences
    inapp_ticket_assigned = Column(Boolean, default=True)
    inapp_ticket_status_changed = Column(Boolean, default=True)
    inapp_ticket_comment = Column(Boolean, default=True)
    inapp_change_approval_needed = Column(Boolean, default=True)
    inapp_change_status_changed = Column(Boolean, default=True)
    inapp_service_request_updates = Column(Boolean, default=True)
    inapp_sla_warnings = Column(Boolean, default=True)
    
    # Digest preferences
    enable_daily_digest = Column(Boolean, default=False)
    daily_digest_time = Column(String(5), default="09:00")  # HH:MM format
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")
    
    def __repr__(self):
        return f"<NotificationPreference for User {self.user_id}>"
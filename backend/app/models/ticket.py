from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class TicketType(enum.Enum):
    INCIDENT = "INCIDENT"
    REQUEST = "REQUEST"
    PROBLEM = "PROBLEM"
    CHANGE = "CHANGE"

class TicketStatus(enum.Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

class TicketPriority(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TicketImpact(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class TicketUrgency(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class TicketAsset(Base):
    """Junction table for many-to-many relationship between tickets and assets"""
    __tablename__ = "ticket_assets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=True)  # Optional notes about why this asset is linked
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ticket = relationship("Ticket", back_populates="linked_assets")
    asset = relationship("Asset")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    ticket_type = Column(SQLEnum(TicketType), nullable=False, default=TicketType.INCIDENT, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM, index=True)
    impact = Column(SQLEnum(TicketImpact), default=TicketImpact.MEDIUM)
    urgency = Column(SQLEnum(TicketUrgency), default=TicketUrgency.MEDIUM)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.NEW, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    sla_policy_id = Column(Integer, ForeignKey("sla_policies.id"), nullable=True)
    response_due = Column(DateTime(timezone=True), nullable=True)
    resolution_due = Column(DateTime(timezone=True), nullable=True)
    first_response_at = Column(DateTime(timezone=True), nullable=True)
    response_breached = Column(Boolean, default=False)
    resolution_breached = Column(Boolean, default=False)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    closure_code = Column(String(100), nullable=True)
    approval_status = Column(String(50), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    source = Column(String(50), default="web")
    tags = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Manual date overrides (for administrative corrections)
    created_at_override = Column(DateTime(timezone=True), nullable=True)
    resolved_at_override = Column(DateTime(timezone=True), nullable=True)
    closed_at_override = Column(DateTime(timezone=True), nullable=True)
    override_reason = Column(Text, nullable=True)
    override_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships - Use string references for models not yet defined
    requester = relationship("User", foreign_keys=[requester_id], back_populates="created_tickets")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tickets")
    category = relationship("Category", back_populates="tickets")
    subcategory = relationship("Subcategory", back_populates="tickets")
    assigned_group = relationship("Group", back_populates="tickets")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    activities = relationship("TicketActivity", back_populates="ticket", cascade="all, delete-orphan")
    sla_policy = relationship("SLAPolicy", back_populates="tickets")
    sla_pauses = relationship("SLAPause", back_populates="ticket", cascade="all, delete-orphan")
    linked_assets = relationship("TicketAsset", back_populates="ticket", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Ticket {self.ticket_number}>"
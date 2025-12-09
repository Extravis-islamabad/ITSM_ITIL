from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class ChangeType(str, enum.Enum):
    STANDARD = "STANDARD"
    NORMAL = "NORMAL"
    EMERGENCY = "EMERGENCY"

class ChangeStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    IMPLEMENTED = "IMPLEMENTED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

class ChangeRisk(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ChangeImpact(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class Change(Base):
    __tablename__ = "changes"
    
    id = Column(Integer, primary_key=True, index=True)
    change_number = Column(String(50), unique=True, index=True)
    change_type = Column(SQLEnum(ChangeType), default=ChangeType.NORMAL)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Classification
    status = Column(SQLEnum(ChangeStatus), default=ChangeStatus.DRAFT)
    risk = Column(SQLEnum(ChangeRisk), default=ChangeRisk.MEDIUM)
    impact = Column(SQLEnum(ChangeImpact), default=ChangeImpact.MEDIUM)
    priority = Column(String(20), default="MEDIUM")
    
    # People
    requester_id = Column(Integer, ForeignKey("users.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    implementer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Related entities
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    # TODO: Uncomment after running migration to add asset_id column
    # asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    
    # Plans
    reason_for_change = Column(Text)
    implementation_plan = Column(Text)
    rollback_plan = Column(Text)
    testing_plan = Column(Text)
    
    # Scheduling
    planned_start = Column(DateTime, nullable=True)
    planned_end = Column(DateTime, nullable=True)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    
    # Approval
    requires_cab_approval = Column(Boolean, default=True)
    cab_approved = Column(Boolean, default=False)
    cab_approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cab_approved_at = Column(DateTime, nullable=True)
    cab_comments = Column(Text, nullable=True)
    
    # Business justification
    business_justification = Column(Text)
    affected_services = Column(Text)
    affected_users_count = Column(Integer, default=0)
    
    # Closure
    closure_notes = Column(Text, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requester = relationship("User", foreign_keys=[requester_id], backref="requested_changes")
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_changes")
    implementer = relationship("User", foreign_keys=[implementer_id], backref="implemented_changes")
    cab_approver = relationship("User", foreign_keys=[cab_approved_by_id])
    closer = relationship("User", foreign_keys=[closed_by_id])
    category = relationship("Category")
    # TODO: Uncomment after running migration to add asset_id column
    # asset = relationship("Asset")
    tasks = relationship("ChangeTask", back_populates="change", cascade="all, delete-orphan")
    activities = relationship("ChangeActivity", back_populates="change", cascade="all, delete-orphan")

class ChangeTask(Base):
    __tablename__ = "change_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    change_id = Column(Integer, ForeignKey("changes.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    sequence = Column(Integer, default=0)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="PENDING")
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    change = relationship("Change", back_populates="tasks")
    assigned_to = relationship("User")

class ChangeActivity(Base):
    __tablename__ = "change_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    change_id = Column(Integer, ForeignKey("changes.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String(50))
    description = Column(Text)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    change = relationship("Change", back_populates="activities")
    user = relationship("User")
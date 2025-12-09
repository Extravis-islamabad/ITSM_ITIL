from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class ProblemStatus(str, enum.Enum):
    """Problem status states"""
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    ROOT_CAUSE_FOUND = "ROOT_CAUSE_FOUND"
    WORKAROUND_AVAILABLE = "WORKAROUND_AVAILABLE"
    PERMANENT_SOLUTION_FOUND = "PERMANENT_SOLUTION_FOUND"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class ProblemPriority(str, enum.Enum):
    """Problem priority levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ProblemImpact(str, enum.Enum):
    """Problem impact levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RCAMethod(str, enum.Enum):
    """Root Cause Analysis methods"""
    FIVE_WHYS = "FIVE_WHYS"
    FISHBONE = "FISHBONE"
    FAULT_TREE = "FAULT_TREE"
    KEPNER_TREGOE = "KEPNER_TREGOE"
    OTHER = "OTHER"


class Problem(Base):
    """Problem model for Problem Management"""
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    problem_number = Column(String(50), unique=True, nullable=False, index=True)

    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    status = Column(SQLEnum(ProblemStatus), default=ProblemStatus.NEW, nullable=False, index=True)
    priority = Column(SQLEnum(ProblemPriority), default=ProblemPriority.MEDIUM, nullable=False, index=True)
    impact = Column(SQLEnum(ProblemImpact), default=ProblemImpact.MEDIUM, nullable=False)

    # Classification
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)

    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, index=True)

    # Root Cause Analysis
    rca_method = Column(SQLEnum(RCAMethod), nullable=True)
    root_cause = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    investigation_notes = Column(Text, nullable=True)

    # Workaround
    has_workaround = Column(Boolean, default=False, nullable=False)
    workaround_description = Column(Text, nullable=True)
    workaround_steps = Column(Text, nullable=True)

    # Permanent Solution
    has_permanent_solution = Column(Boolean, default=False, nullable=False)
    permanent_solution_description = Column(Text, nullable=True)
    solution_implementation_plan = Column(Text, nullable=True)

    # Related Items
    related_change_id = Column(Integer, ForeignKey("changes.id"), nullable=True)  # Change to implement solution
    # Temporarily commented out due to circular foreign key issue with KnownError
    # known_error_id = Column(Integer, ForeignKey("known_errors.id"), nullable=True)

    # Additional Information
    tags = Column(JSON, nullable=True)  # Array of tags
    custom_fields = Column(JSON, nullable=True)

    # Tracking
    incident_count = Column(Integer, default=0, nullable=False)  # Number of related incidents
    affected_users_count = Column(Integer, default=0, nullable=False)
    business_impact_description = Column(Text, nullable=True)

    # Timestamps
    identified_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    investigation_started_at = Column(DateTime, nullable=True)
    root_cause_found_at = Column(DateTime, nullable=True)
    workaround_available_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    category = relationship("Category", foreign_keys=[category_id])
    subcategory = relationship("Subcategory", foreign_keys=[subcategory_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], backref="assigned_problems")
    assigned_group = relationship("Group", foreign_keys=[assigned_group_id], backref="group_problems")
    related_change = relationship("Change", foreign_keys=[related_change_id], backref="related_problems")
    # Temporarily commented out due to circular foreign key issue
    # known_error = relationship(
    #     "KnownError",
    #     foreign_keys=[known_error_id],
    #     uselist=False
    # )

    # One-to-many relationships
    related_incidents = relationship("ProblemIncidentLink", back_populates="problem", cascade="all, delete-orphan")
    activities = relationship("ProblemActivity", back_populates="problem", cascade="all, delete-orphan", order_by="ProblemActivity.created_at.desc()")
    attachments = relationship("ProblemAttachment", back_populates="problem", cascade="all, delete-orphan")
    comments = relationship("ProblemComment", back_populates="problem", cascade="all, delete-orphan", order_by="ProblemComment.created_at.desc()")


class ProblemIncidentLink(Base):
    """Link between problems and related incidents"""
    __tablename__ = "problem_incident_links"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    linked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    linked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    link_reason = Column(Text, nullable=True)

    # Relationships
    problem = relationship("Problem", back_populates="related_incidents")
    ticket = relationship("Ticket", backref="problem_links")
    linked_by = relationship("User")


class KnownError(Base):
    """Known Error Database (KEDB) entries"""
    __tablename__ = "known_errors"

    id = Column(Integer, primary_key=True, index=True)
    known_error_number = Column(String(50), unique=True, nullable=False, index=True)

    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Problem Reference
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False, unique=True)

    # Error Details
    error_symptoms = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    affected_cis = Column(JSON, nullable=True)  # List of affected Configuration Items

    # Workaround
    workaround_description = Column(Text, nullable=False)
    workaround_steps = Column(Text, nullable=True)
    workaround_limitations = Column(Text, nullable=True)

    # Permanent Solution
    permanent_solution_description = Column(Text, nullable=True)
    solution_status = Column(String(50), nullable=True)  # PLANNED, IN_PROGRESS, IMPLEMENTED
    solution_eta = Column(DateTime, nullable=True)

    # Knowledge Base
    kb_article_id = Column(Integer, ForeignKey("knowledge_articles.id"), nullable=True)

    # Metadata
    tags = Column(JSON, nullable=True)
    views_count = Column(Integer, default=0, nullable=False)
    helpful_count = Column(Integer, default=0, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    archived_at = Column(DateTime, nullable=True)

    # Relationships
    # Temporarily commented out due to circular foreign key issue with Problem
    # problem = relationship(
    #     "Problem",
    #     foreign_keys=[problem_id],
    #     uselist=False
    # )
    kb_article = relationship("KnowledgeArticle", backref="known_errors")


class ProblemActivity(Base):
    """Activity log for problems"""
    __tablename__ = "problem_activities"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    activity_type = Column(String(100), nullable=False)  # STATUS_CHANGED, ASSIGNED, RCA_UPDATED, etc.
    description = Column(Text, nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    activity_metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    problem = relationship("Problem", back_populates="activities")
    user = relationship("User")


class ProblemComment(Base):
    """Comments on problems"""
    __tablename__ = "problem_comments"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)  # Internal notes vs public comments

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    problem = relationship("Problem", back_populates="comments")
    user = relationship("User")


class ProblemAttachment(Base):
    """File attachments for problems"""
    __tablename__ = "problem_attachments"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    problem = relationship("Problem", back_populates="attachments")
    user = relationship("User")

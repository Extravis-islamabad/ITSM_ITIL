"""Integration models for external service connections"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class IntegrationType(str, enum.Enum):
    JIRA = "JIRA"
    TRELLO = "TRELLO"
    ASANA = "ASANA"


class IntegrationStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ERROR = "ERROR"
    PENDING = "PENDING"


class ImportStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"


class Integration(Base):
    """Stores integration configurations for external services"""
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    integration_type = Column(Enum(IntegrationType), nullable=False)
    status = Column(Enum(IntegrationStatus), default=IntegrationStatus.PENDING)

    # Connection details (encrypted in production)
    api_url = Column(String(500), nullable=True)  # Base URL for the API
    api_key = Column(Text, nullable=True)  # API key or token
    api_secret = Column(Text, nullable=True)  # Secret or additional auth
    username = Column(String(200), nullable=True)  # Username for basic auth

    # JIRA specific
    jira_cloud_id = Column(String(200), nullable=True)
    jira_project_key = Column(String(50), nullable=True)

    # Trello specific
    trello_board_id = Column(String(100), nullable=True)

    # Asana specific
    asana_workspace_id = Column(String(100), nullable=True)
    asana_project_id = Column(String(100), nullable=True)

    # Mapping configuration
    field_mappings = Column(JSON, nullable=True)  # Maps external fields to ITSM fields
    status_mappings = Column(JSON, nullable=True)  # Maps external statuses to ITSM statuses
    priority_mappings = Column(JSON, nullable=True)  # Maps external priorities

    # Settings
    auto_sync = Column(Boolean, default=False)
    sync_interval_minutes = Column(Integer, default=60)
    import_attachments = Column(Boolean, default=True)
    import_comments = Column(Boolean, default=True)

    # Metadata
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    import_jobs = relationship("ImportJob", back_populates="integration", cascade="all, delete-orphan")


class ImportJob(Base):
    """Tracks import jobs from external services"""
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(ImportStatus), default=ImportStatus.PENDING)

    # Import scope
    import_type = Column(String(50), default="full")  # full, incremental, selective

    # Progress tracking
    total_items = Column(Integer, default=0)
    processed_items = Column(Integer, default=0)
    successful_items = Column(Integer, default=0)
    failed_items = Column(Integer, default=0)
    skipped_items = Column(Integer, default=0)

    # Results
    imported_ticket_ids = Column(JSON, nullable=True)  # List of created ticket IDs
    error_log = Column(JSON, nullable=True)  # List of errors with item details

    # Metadata
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    started_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    integration = relationship("Integration", back_populates="import_jobs")
    started_by = relationship("User", foreign_keys=[started_by_id])


class ImportedItem(Base):
    """Tracks individual items imported from external services"""
    __tablename__ = "imported_items"

    id = Column(Integer, primary_key=True, index=True)
    import_job_id = Column(Integer, ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False)

    # External reference
    external_id = Column(String(200), nullable=False)  # ID in external system
    external_key = Column(String(200), nullable=True)  # Key/number in external system (e.g., JIRA-123)
    external_url = Column(String(500), nullable=True)

    # Internal reference
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)

    # Status
    status = Column(String(50), default="success")  # success, failed, skipped
    error_message = Column(Text, nullable=True)

    # Metadata
    external_data = Column(JSON, nullable=True)  # Original data from external system
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    import_job = relationship("ImportJob")
    ticket = relationship("Ticket")

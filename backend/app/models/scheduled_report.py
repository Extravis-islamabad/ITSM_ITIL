from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class ReportType(str, enum.Enum):
    """Report types"""
    SLA_COMPLIANCE = "sla_compliance"
    TICKET_AGING = "ticket_aging"
    TECHNICIAN_PERFORMANCE = "technician_performance"
    FIRST_RESPONSE_TIME = "first_response_time"
    RESOLUTION_TIME = "resolution_time"
    TICKET_VOLUME = "ticket_volume"
    CATEGORY_BREAKDOWN = "category_breakdown"
    CUSTOM = "custom"


class ReportFrequency(str, enum.Enum):
    """Report schedule frequency"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class ExportFormat(str, enum.Enum):
    """Export format options"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"


class ScheduledReport(Base):
    """Scheduled report configuration"""
    __tablename__ = "scheduled_reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # Report configuration
    report_type = Column(SQLEnum(ReportType), nullable=False)
    frequency = Column(SQLEnum(ReportFrequency), nullable=False)
    export_format = Column(SQLEnum(ExportFormat), default=ExportFormat.PDF)

    # Schedule settings
    schedule_time = Column(String(5))  # HH:MM format
    schedule_day = Column(Integer)  # For weekly (1-7) or monthly (1-31)
    last_run_at = Column(DateTime)
    next_run_at = Column(DateTime)

    # Recipients
    recipients = Column(JSON)  # List of email addresses

    # Filter configuration (JSON)
    filters = Column(JSON)  # Store report-specific filters

    # Status
    is_active = Column(Boolean, default=True)

    # Ownership
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    executions = relationship("ReportExecution", back_populates="scheduled_report", cascade="all, delete-orphan")


class ReportExecution(Base):
    """Report execution history"""
    __tablename__ = "report_executions"

    id = Column(Integer, primary_key=True, index=True)
    scheduled_report_id = Column(Integer, ForeignKey("scheduled_reports.id"))

    # Execution details
    executed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50))  # success, failed, partial
    error_message = Column(Text)

    # Report data
    file_path = Column(String(500))  # Path to generated report file
    file_size = Column(Integer)  # File size in bytes
    record_count = Column(Integer)  # Number of records in report

    # Email delivery
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime)
    email_error = Column(Text)

    # Relationships
    scheduled_report = relationship("ScheduledReport", back_populates="executions")


class ReportTemplate(Base):
    """Custom report templates"""
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # Template configuration
    report_type = Column(SQLEnum(ReportType), default=ReportType.CUSTOM)
    columns = Column(JSON)  # List of column configurations
    filters = Column(JSON)  # Default filters
    grouping = Column(JSON)  # Grouping configuration
    sorting = Column(JSON)  # Sort configuration

    # Visualization settings
    chart_type = Column(String(50))  # bar, line, pie, table
    chart_config = Column(JSON)  # Chart-specific configuration

    # Sharing
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)  # System templates cannot be deleted

    # Ownership
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])

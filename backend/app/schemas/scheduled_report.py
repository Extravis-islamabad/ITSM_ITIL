from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReportTypeEnum(str, Enum):
    SLA_COMPLIANCE = "sla_compliance"
    TICKET_AGING = "ticket_aging"
    TECHNICIAN_PERFORMANCE = "technician_performance"
    FIRST_RESPONSE_TIME = "first_response_time"
    RESOLUTION_TIME = "resolution_time"
    TICKET_VOLUME = "ticket_volume"
    CATEGORY_BREAKDOWN = "category_breakdown"
    CUSTOM = "custom"


class ReportFrequencyEnum(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class ExportFormatEnum(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"


class ScheduledReportCreate(BaseModel):
    """Schema for creating a scheduled report"""
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    report_type: ReportTypeEnum
    frequency: ReportFrequencyEnum
    export_format: ExportFormatEnum = ExportFormatEnum.PDF
    schedule_time: str = Field(..., pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', description="Time in HH:MM format")
    schedule_day: Optional[int] = Field(None, ge=1, le=31, description="Day of week (1-7) for weekly, day of month (1-31) for monthly")
    recipients: List[str] = Field(..., min_items=1, description="List of email addresses")
    filters: Optional[Dict[str, Any]] = None
    is_active: bool = True


class ScheduledReportUpdate(BaseModel):
    """Schema for updating a scheduled report"""
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    report_type: Optional[ReportTypeEnum] = None
    frequency: Optional[ReportFrequencyEnum] = None
    export_format: Optional[ExportFormatEnum] = None
    schedule_time: Optional[str] = Field(None, pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    schedule_day: Optional[int] = Field(None, ge=1, le=31)
    recipients: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ScheduledReportResponse(BaseModel):
    """Schema for scheduled report response"""
    id: int
    name: str
    description: Optional[str]
    report_type: str
    frequency: str
    export_format: str
    schedule_time: Optional[str]
    schedule_day: Optional[int]
    recipients: List[str]
    filters: Optional[Dict[str, Any]]
    is_active: bool
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReportExecutionResponse(BaseModel):
    """Schema for report execution history"""
    id: int
    scheduled_report_id: int
    executed_at: datetime
    status: str
    error_message: Optional[str]
    file_path: Optional[str]
    file_size: Optional[int]
    record_count: Optional[int]
    email_sent: bool
    email_sent_at: Optional[datetime]
    email_error: Optional[str]

    class Config:
        from_attributes = True


class ManualReportExecuteRequest(BaseModel):
    """Schema for manually triggering a report"""
    send_email: bool = True
    additional_recipients: Optional[List[str]] = None

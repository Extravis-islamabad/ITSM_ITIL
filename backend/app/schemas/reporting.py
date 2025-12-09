from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

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


class GranularityEnum(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class GroupByEnum(str, Enum):
    PRIORITY = "priority"
    CATEGORY = "category"
    ASSIGNEE = "assignee"


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class SLAComplianceRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Optional[str] = None
    category_id: Optional[int] = None


class TicketAgingRequest(BaseModel):
    status_filter: Optional[List[str]] = None
    priority_filter: Optional[str] = None
    assignee_id: Optional[int] = None


class TechnicianPerformanceRequest(BaseModel):
    start_date: str
    end_date: str
    user_id: Optional[int] = None


class ResponseTimeTrendsRequest(BaseModel):
    start_date: str
    end_date: str
    granularity: GranularityEnum = GranularityEnum.DAILY


class ResolutionTimeAnalysisRequest(BaseModel):
    start_date: str
    end_date: str
    group_by: GroupByEnum = GroupByEnum.PRIORITY


class TicketVolumeTrendsRequest(BaseModel):
    start_date: str
    end_date: str
    granularity: GranularityEnum = GranularityEnum.DAILY


class CategoryBreakdownRequest(BaseModel):
    start_date: str
    end_date: str


class ExportReportRequest(BaseModel):
    report_type: str  # Accept string to be more flexible
    format: str  # Accept string to be more flexible
    start_date: Optional[str] = None  # Accept string dates
    end_date: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

    @field_validator('report_type')
    @classmethod
    def validate_report_type(cls, v):
        valid_types = ['sla_compliance', 'ticket_aging', 'technician_performance',
                       'ticket_volume', 'category_breakdown', 'first_response_time',
                       'resolution_time', 'custom']
        if v not in valid_types:
            raise ValueError(f'Invalid report type: {v}. Must be one of: {valid_types}')
        return v

    @field_validator('format')
    @classmethod
    def validate_format(cls, v):
        valid_formats = ['pdf', 'excel', 'csv']
        if v not in valid_formats:
            raise ValueError(f'Invalid format: {v}. Must be one of: {valid_formats}')
        return v


class ScheduledReportCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    report_type: ReportTypeEnum
    frequency: ReportFrequencyEnum
    export_format: ExportFormatEnum = ExportFormatEnum.PDF
    schedule_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    schedule_day: Optional[int] = Field(None, ge=1, le=31)
    recipients: List[str] = Field(..., min_length=1)
    filters: Optional[Dict[str, Any]] = None
    is_active: bool = True

    @field_validator('recipients')
    @classmethod
    def validate_recipients(cls, v):
        if not v:
            raise ValueError('At least one recipient is required')
        for email in v:
            if '@' not in email:
                raise ValueError(f'Invalid email address: {email}')
        return v


class ScheduledReportUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    frequency: Optional[ReportFrequencyEnum] = None
    export_format: Optional[ExportFormatEnum] = None
    schedule_time: Optional[str] = Field(None, pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    schedule_day: Optional[int] = Field(None, ge=1, le=31)
    recipients: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class CustomReportRequest(BaseModel):
    name: str
    date_range_start: datetime
    date_range_end: datetime
    metrics: List[str]  # ['total_tickets', 'resolution_time', 'sla_compliance', etc.]
    group_by: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "desc"


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class SLAPriorityBreakdown(BaseModel):
    priority: str
    total: int
    met: int
    breached: int
    compliance: float


class SLACategoryBreakdown(BaseModel):
    category_id: int
    category_name: str
    total: int
    met: int
    breached: int
    compliance: float


class SLATrendData(BaseModel):
    date: str
    compliance: float
    met: int
    breached: int
    total: int


class SLAComplianceResponse(BaseModel):
    overall_compliance: float
    response_compliance: float
    resolution_compliance: float
    total_tickets: int
    response_met: int
    response_breached: int
    resolution_met: int
    resolution_breached: int
    at_risk_count: int
    breached_count: int
    by_priority: List[SLAPriorityBreakdown]
    by_category: List[SLACategoryBreakdown]
    trend_data: List[SLATrendData]


class TicketSummary(BaseModel):
    id: int
    ticket_number: str
    title: str
    priority: Optional[str]
    status: Optional[str]
    assignee_name: str
    created_at: str
    age_days: int
    age_hours: int


class AgingBucket(BaseModel):
    count: int
    tickets: List[TicketSummary]


class TicketAgingResponse(BaseModel):
    total_open_tickets: int
    buckets: Dict[str, AgingBucket]
    summary: Dict[str, int]


class TechnicianPerformance(BaseModel):
    user_id: int
    user_name: str
    email: str
    total_tickets: int
    resolved_tickets: int
    resolution_rate: float
    avg_resolution_time_hours: float
    avg_response_time_hours: float
    sla_compliance: float
    open_tickets: int


class ResponseTimeTrend(BaseModel):
    period: str
    avg_response_time_hours: float
    min_response_time_hours: float
    max_response_time_hours: float
    ticket_count: int


class ResolutionTimeAnalysis(BaseModel):
    group: str
    avg_resolution_time_hours: float
    min_resolution_time_hours: float
    max_resolution_time_hours: float
    median_resolution_time_hours: float
    ticket_count: int


class TicketVolumeTrendData(BaseModel):
    period: str
    created: int
    resolved: int
    by_priority: Dict[str, int]
    by_status: Dict[str, int]
    by_type: Dict[str, int]


class TicketVolumeResponse(BaseModel):
    trend_data: List[TicketVolumeTrendData]
    total_created: int
    total_resolved: int
    summary: Dict[str, float]


class CategoryBreakdown(BaseModel):
    category_id: int
    category_name: str
    total_tickets: int
    resolved_tickets: int
    open_tickets: int
    resolution_rate: float
    avg_resolution_time_hours: float
    sla_compliance: float


class ScheduledReportResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    report_type: str
    frequency: str
    export_format: str
    schedule_time: str
    schedule_day: Optional[int]
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    recipients: List[str]
    filters: Optional[Dict[str, Any]]
    is_active: bool
    created_by_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportExecutionResponse(BaseModel):
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


class ExportResponse(BaseModel):
    success: bool
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    download_url: Optional[str] = None
    message: Optional[str] = None

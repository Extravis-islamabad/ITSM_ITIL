from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TicketTypeEnum(str, Enum):
    INCIDENT = "INCIDENT"
    REQUEST = "REQUEST"
    PROBLEM = "PROBLEM"
    CHANGE = "CHANGE"

class TicketStatusEnum(str, Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

class TicketPriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TicketImpactEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class TicketUrgencyEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class TicketBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=500)
    description: str = Field(..., min_length=10)
    ticket_type: TicketTypeEnum = TicketTypeEnum.INCIDENT
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    priority: TicketPriorityEnum = TicketPriorityEnum.MEDIUM
    impact: TicketImpactEnum = TicketImpactEnum.MEDIUM
    urgency: TicketUrgencyEnum = TicketUrgencyEnum.MEDIUM
    asset_id: Optional[int] = None  # Legacy single asset field
    asset_ids: Optional[List[int]] = None  # New multiple assets field
    sla_policy_id: Optional[int] = None

class TicketCreate(TicketBase):
    requester_id: Optional[int] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    priority: Optional[TicketPriorityEnum] = None
    impact: Optional[TicketImpactEnum] = None
    urgency: Optional[TicketUrgencyEnum] = None
    status: Optional[TicketStatusEnum] = None
    assignee_id: Optional[int] = None
    assigned_group_id: Optional[int] = None
    asset_id: Optional[int] = None  # Legacy single asset field
    asset_ids: Optional[List[int]] = None  # New multiple assets field
    sla_policy_id: Optional[int] = None


class TicketDateOverride(BaseModel):
    """Schema for manual date/time override (Manager+ only)"""
    created_at_override: Optional[datetime] = None
    resolved_at_override: Optional[datetime] = None
    closed_at_override: Optional[datetime] = None
    override_reason: str = Field(..., min_length=10, max_length=500, description="Reason for date override")

class TicketAssign(BaseModel):
    assignee_id: Optional[int] = None
    assigned_group_id: Optional[int] = None

class TicketResolve(BaseModel):
    resolution_notes: str = Field(..., min_length=10)

class TicketClose(BaseModel):
    closure_code: Optional[str] = None

class SLAPauseRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)

class TicketResponse(TicketBase):
    id: int
    ticket_number: str
    status: TicketStatusEnum
    requester_id: int
    assignee_id: Optional[int]
    assigned_group_id: Optional[int]
    sla_policy_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    requester_name: Optional[str] = None
    assignee_name: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    group_name: Optional[str] = None
    approval_status: Optional[str] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    response_due: Optional[datetime] = None
    resolution_due: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    response_breached: bool = False
    resolution_breached: bool = False

    class Config:
        from_attributes = True

class LinkedAssetResponse(BaseModel):
    """Schema for linked asset in ticket response"""
    id: int
    asset_id: int
    asset_tag: str
    asset_name: str
    asset_type_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class TicketDetailResponse(BaseModel):
    id: int
    ticket_number: str
    ticket_type: str
    title: str
    description: str
    status: str
    priority: str
    impact: str
    urgency: str
    category_id: Optional[int]
    subcategory_id: Optional[int]
    requester_id: int
    assignee_id: Optional[int]
    assigned_group_id: Optional[int]
    asset_id: Optional[int]  # Legacy single asset field
    sla_policy_id: Optional[int]

    # Linked assets (multiple)
    linked_assets: Optional[List[LinkedAssetResponse]] = None

    # Additional fields
    requester_name: Optional[str]
    assignee_name: Optional[str]
    category_name: Optional[str]
    subcategory_name: Optional[str]
    group_name: Optional[str]

    # Service Request fields
    approval_status: Optional[str] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Date overrides
    created_at_override: Optional[datetime] = None
    resolved_at_override: Optional[datetime] = None
    closed_at_override: Optional[datetime] = None
    override_reason: Optional[str] = None

    # SLA
    response_due: Optional[datetime]
    resolution_due: Optional[datetime]
    first_response_at: Optional[datetime] = None
    response_breached: bool = False
    resolution_breached: bool = False

    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    comment: str = Field(..., min_length=1)
    is_internal: bool = False

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    ticket_id: int
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        
    class ServiceRequestTemplate(BaseModel):
        id: int
        name: str
        description: str
        category_id: Optional[int]
        icon: Optional[str]
        estimated_days: Optional[int]
        requires_approval: bool = False
        
        class Config:
            from_attributes = True

class ApprovalRequest(BaseModel):
    ticket_id: int
    approver_id: int
    comments: Optional[str] = None

class ApprovalResponse(BaseModel):
    approved: bool
    comments: str = Field(..., min_length=5)
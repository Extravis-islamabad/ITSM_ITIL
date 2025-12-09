from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ChangeType(str, Enum):
    STANDARD = "STANDARD"
    NORMAL = "NORMAL"
    EMERGENCY = "EMERGENCY"

class ChangeStatus(str, Enum):
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

class ChangeRisk(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ChangeImpact(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class ChangeTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    sequence: int = 0
    assigned_to_id: Optional[int] = None

class ChangeTaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    sequence: int
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str]
    status: str
    completed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChangeCreate(BaseModel):
    title: str = Field(..., min_length=5)
    description: str = Field(..., min_length=10)
    change_type: ChangeType = ChangeType.NORMAL
    risk: ChangeRisk = ChangeRisk.MEDIUM
    impact: ChangeImpact = ChangeImpact.MEDIUM
    category_id: Optional[int] = None
    owner_id: int
    implementer_id: Optional[int] = None
    reason_for_change: str
    implementation_plan: str
    rollback_plan: str
    testing_plan: Optional[str] = None
    business_justification: str
    affected_services: Optional[str] = None
    affected_users_count: int = 0
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    requires_cab_approval: bool = True
    tasks: Optional[List[ChangeTaskCreate]] = []

class ChangeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    change_type: Optional[ChangeType] = None
    risk: Optional[ChangeRisk] = None
    impact: Optional[ChangeImpact] = None
    owner_id: Optional[int] = None
    implementer_id: Optional[int] = None
    implementation_plan: Optional[str] = None
    rollback_plan: Optional[str] = None
    testing_plan: Optional[str] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None

class ChangeResponse(BaseModel):
    id: int
    change_number: str
    change_type: str
    title: str
    description: str
    status: str
    risk: str
    impact: str
    priority: str
    requester_id: int
    requester_name: Optional[str]
    owner_id: int
    owner_name: Optional[str]
    implementer_id: Optional[int]
    implementer_name: Optional[str]
    category_id: Optional[int]
    category_name: Optional[str]
    reason_for_change: Optional[str]
    implementation_plan: Optional[str]
    rollback_plan: Optional[str]
    testing_plan: Optional[str]
    business_justification: Optional[str]
    affected_services: Optional[str]
    affected_users_count: int
    planned_start: Optional[datetime]
    planned_end: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    requires_cab_approval: bool
    cab_approved: bool
    cab_approved_by_id: Optional[int]
    cab_approved_at: Optional[datetime]
    cab_comments: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class CABApprovalRequest(BaseModel):
    approved: bool
    comments: Optional[str] = None
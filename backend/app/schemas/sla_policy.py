from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class SLAPolicyBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    response_time: int = Field(..., gt=0, description="Response time in minutes")
    resolution_time: int = Field(..., gt=0, description="Resolution time in minutes")
    priority_times: Optional[Dict[str, Any]] = None
    business_hours_only: bool = True
    conditions: Optional[Dict[str, Any]] = None
    is_active: bool = True
    is_default: bool = False


class SLAPolicyCreate(SLAPolicyBase):
    pass


class SLAPolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    response_time: Optional[int] = Field(None, gt=0)
    resolution_time: Optional[int] = Field(None, gt=0)
    priority_times: Optional[Dict[str, Any]] = None
    business_hours_only: Optional[bool] = None
    conditions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class SLAPolicyResponse(SLAPolicyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PermissionBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    module: str
    action: str
    scope: str = "own"

class PermissionResponse(PermissionBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoleBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    role_type: str
    level: int = 0

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    level: Optional[int] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class RoleDetailResponse(RoleResponse):
    permissions: List[PermissionResponse] = []
    user_count: int = 0
    
    class Config:
        from_attributes = True
from pydantic import BaseModel, EmailStr, Field, validator, field_validator
from pydantic_core.core_schema import ValidationInfo
from typing import Optional
from datetime import datetime
import re


def validate_password_strength(password: str) -> str:
    """Validate password meets security requirements"""
    if len(password) < 8:
        raise ValueError('Password must be at least 8 characters long')
    if not re.search(r'[A-Z]', password):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', password):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'\d', password):
        raise ValueError('Password must contain at least one digit')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError('Password must contain at least one special character')
    return password


class UserBase(BaseModel):
    email: str  # Changed from EmailStr to allow .local domains
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[int] = None
    role_id: int
    manager_id: Optional[int] = None
    timezone: str = "UTC"
    language: str = "en"
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Basic email validation that allows .local domains"""
        if '@' not in v or len(v.split('@')) != 2:
            raise ValueError('Invalid email format')
        return v.lower()

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

class UserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return validate_password_strength(v)

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_superuser: bool
    avatar_url: Optional[str] = None  # Make it optional with default None
    timezone: Optional[str] = None
    language: Optional[str] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserDetailResponse(UserResponse):
    department_name: Optional[str] = None
    role_name: Optional[str] = None
    manager_name: Optional[str] = None
    
    class Config:
        from_attributes = True
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re

class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3 or len(v) > 100:
            raise ValueError('Username must be between 3 and 100 characters')
        return v.strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 1 or len(v) > 128:
            raise ValueError('Invalid password length')
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserInfo(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: Optional[str] = None
    role_id: Optional[int] = None
    is_superuser: bool

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInfo

class RefreshTokenRequest(BaseModel):
    refresh_token: str
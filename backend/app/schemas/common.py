from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ResponseBase(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20
    
    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        from_attributes = True
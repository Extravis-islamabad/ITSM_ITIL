from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    message_type: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatConversationResponse(BaseModel):
    id: int
    session_id: str
    status: str
    issue_summary: Optional[str] = None
    resolution_provided: bool
    ticket_id: Optional[int] = None
    sentiment: Optional[str] = None
    messages: List[ChatMessageResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatConversationCreate(BaseModel):
    session_id: str
    initial_message: Optional[str] = None


class CreateTicketFromChatRequest(BaseModel):
    conversation_id: int
    title: Optional[str] = None
    additional_notes: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    category_id: Optional[int] = None


class ChatSuggestion(BaseModel):
    type: str  # "solution", "question", "escalate"
    text: str
    action: Optional[str] = None


class KBArticleRef(BaseModel):
    id: int
    title: str
    slug: Optional[str] = None
    relevance_score: float = 0.0


class ChatbotResponse(BaseModel):
    message: ChatMessageResponse
    suggestions: List[ChatSuggestion] = []
    can_create_ticket: bool = False
    sentiment: Optional[str] = None
    session_id: str
    conversation_id: int
    kb_articles: List[Dict[str, Any]] = []  # Related KB articles
    source: str = "fallback"  # "knowledge_base", "openai", or "fallback"


class KBSuggestion(BaseModel):
    """Knowledge base suggestion for autocomplete"""
    id: Optional[int] = None
    title: str
    slug: Optional[str] = None
    summary: Optional[str] = None
    type: str = "article"  # "article" or "common"


class TicketCategoryResponse(BaseModel):
    """Ticket category for selection in ticket creation"""
    id: int
    name: str
    description: Optional[str] = None

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ConversationType(str, Enum):
    DIRECT = "direct"
    GROUP = "group"


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"


# ==================== Conversation Schemas ====================

class ConversationCreate(BaseModel):
    """Create a new conversation"""
    conversation_type: ConversationType = ConversationType.DIRECT
    name: Optional[str] = None  # Required for group chats
    description: Optional[str] = None
    participant_ids: List[int] = Field(..., min_length=1)  # User IDs to add


class ConversationUpdate(BaseModel):
    """Update conversation details (for groups)"""
    name: Optional[str] = None
    description: Optional[str] = None


class ParticipantInfo(BaseModel):
    """Participant information in a conversation"""
    id: int
    full_name: str
    avatar_url: Optional[str] = None
    is_online: bool = False
    is_admin: bool = False

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Conversation response"""
    id: int
    conversation_type: str
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    participants: List[ParticipantInfo] = []
    unread_count: int = 0
    last_message: Optional['MessageResponse'] = None

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """List of conversations with pagination"""
    items: List[ConversationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== Message Schemas ====================

class MessageCreate(BaseModel):
    """Create a new message"""
    content: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[int] = None


class MessageUpdate(BaseModel):
    """Update/edit a message"""
    content: str = Field(..., min_length=1)


class AttachmentResponse(BaseModel):
    """Attachment information"""
    id: int
    file_name: str
    file_type: str
    file_size: int
    file_path: str
    thumbnail_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReactionResponse(BaseModel):
    """Reaction information"""
    id: int
    emoji: str
    user_id: int
    user_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReactionSummary(BaseModel):
    """Summary of reactions on a message"""
    emoji: str
    count: int
    users: List[str]  # List of user names
    reacted_by_me: bool = False


class MessageResponse(BaseModel):
    """Message response"""
    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    sender_avatar: Optional[str] = None
    content: Optional[str] = None
    message_type: str
    reply_to_id: Optional[int] = None
    reply_to: Optional['MessageResponse'] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    created_at: datetime
    attachments: List[AttachmentResponse] = []
    reactions: List[ReactionSummary] = []
    is_read: bool = False
    read_by: List[int] = []  # User IDs who have read this message

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """List of messages with pagination"""
    items: List[MessageResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_more: bool


# ==================== Reaction Schemas ====================

class ReactionCreate(BaseModel):
    """Add a reaction to a message"""
    emoji: str = Field(..., min_length=1, max_length=50)


# ==================== Typing Indicator Schema ====================

class TypingIndicator(BaseModel):
    """Typing indicator"""
    conversation_id: int
    is_typing: bool


# ==================== Online Status Schema ====================

class OnlineStatusResponse(BaseModel):
    """User online status"""
    user_id: int
    is_online: bool
    last_seen: Optional[datetime] = None


# ==================== WebSocket Message Schemas ====================

class WSMessage(BaseModel):
    """WebSocket message format"""
    type: str  # new_message, typing, online_status, message_read, reaction, etc.
    data: dict


class WSNewMessage(BaseModel):
    """WebSocket new message event"""
    conversation_id: int
    content: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[int] = None


class WSTyping(BaseModel):
    """WebSocket typing event"""
    conversation_id: int
    is_typing: bool


class WSMarkRead(BaseModel):
    """WebSocket mark as read event"""
    conversation_id: int
    message_id: int


class WSReaction(BaseModel):
    """WebSocket reaction event"""
    message_id: int
    emoji: str
    action: str = "add"  # "add" or "remove"


# Forward references for nested models
ConversationResponse.model_rebuild()
MessageResponse.model_rebuild()

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Table, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ConversationType(str, enum.Enum):
    DIRECT = "direct"
    GROUP = "group"

    def __str__(self):
        return self.value


class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"

    def __str__(self):
        return self.value


class MessageStatus(str, enum.Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

    def __str__(self):
        return self.value


# Association table for conversation participants
conversation_participants = Table(
    'live_conversation_participants',
    Base.metadata,
    Column('conversation_id', Integer, ForeignKey('live_conversations.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('joined_at', DateTime(timezone=True), server_default=func.now()),
    Column('is_admin', Boolean, default=False),
    Column('is_muted', Boolean, default=False),
    Column('last_read_at', DateTime(timezone=True), nullable=True),
    Column('last_read_message_id', Integer, nullable=True),
)


class LiveConversation(Base):
    """Live chat conversation - supports both direct messages and group chats"""
    __tablename__ = "live_conversations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)  # For group chats
    description = Column(Text, nullable=True)  # For group chats
    avatar_url = Column(String(500), nullable=True)  # Group avatar
    conversation_type = Column(
        SQLEnum(
            ConversationType,
            name='conversation_type_enum',
            values_callable=lambda x: [e.value for e in x],
            create_type=False
        ),
        default=ConversationType.DIRECT
    )

    # Creator of the conversation
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # For direct messages, store both user IDs for quick lookup
    user1_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user2_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship("LiveMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="LiveMessage.created_at")
    participants = relationship("User", secondary=conversation_participants, backref="live_conversations")

    def __repr__(self):
        return f"<LiveConversation {self.id} ({self.conversation_type})>"


class LiveMessage(Base):
    """Individual chat message"""
    __tablename__ = "live_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("live_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Message content
    content = Column(Text, nullable=True)  # Can be null for file-only messages
    message_type = Column(
        SQLEnum(
            MessageType,
            name='message_type_enum',
            values_callable=lambda x: [e.value for e in x],
            create_type=False
        ),
        default=MessageType.TEXT
    )

    # Reply to another message
    reply_to_id = Column(Integer, ForeignKey("live_messages.id"), nullable=True)

    # Edit tracking
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)

    # Deletion (soft delete)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    conversation = relationship("LiveConversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    reply_to = relationship("LiveMessage", remote_side=[id], backref="replies")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    read_receipts = relationship("MessageReadReceipt", back_populates="message", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LiveMessage {self.id} from user {self.sender_id}>"


class MessageAttachment(Base):
    """File attachments for messages"""
    __tablename__ = "message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("live_messages.id", ondelete="CASCADE"), nullable=False)

    # File info
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=False)  # MIME type
    file_size = Column(Integer, nullable=False)  # Size in bytes

    # For images - thumbnail
    thumbnail_path = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    message = relationship("LiveMessage", back_populates="attachments")

    def __repr__(self):
        return f"<MessageAttachment {self.file_name}>"


class MessageReaction(Base):
    """Emoji reactions to messages"""
    __tablename__ = "message_reactions"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("live_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji = Column(String(50), nullable=False)  # Unicode emoji or emoji code

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    message = relationship("LiveMessage", back_populates="reactions")
    user = relationship("User")

    class Meta:
        unique_together = ('message_id', 'user_id', 'emoji')

    def __repr__(self):
        return f"<MessageReaction {self.emoji} by user {self.user_id}>"


class MessageReadReceipt(Base):
    """Track which users have read which messages"""
    __tablename__ = "message_read_receipts"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("live_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    message = relationship("LiveMessage", back_populates="read_receipts")
    user = relationship("User")

    def __repr__(self):
        return f"<MessageReadReceipt message {self.message_id} by user {self.user_id}>"


class UserOnlineStatus(Base):
    """Track user online/offline status"""
    __tablename__ = "user_online_status"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    socket_id = Column(String(100), nullable=True)  # Current WebSocket connection ID

    # Relationships
    user = relationship("User")

    def __repr__(self):
        return f"<UserOnlineStatus user {self.user_id} online={self.is_online}>"

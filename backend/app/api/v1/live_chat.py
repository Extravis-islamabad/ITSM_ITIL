from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from typing import List, Optional
from datetime import datetime
import os
import uuid
import logging
from pathlib import Path
import math
import json

from app.core.database import get_db

logger = logging.getLogger(__name__)
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.live_chat import (
    LiveConversation, LiveMessage, MessageAttachment, MessageReaction,
    MessageReadReceipt, UserOnlineStatus, ConversationType, MessageType,
    conversation_participants
)
from app.schemas.live_chat import (
    ConversationCreate, ConversationUpdate, ConversationResponse, ConversationListResponse,
    MessageCreate, MessageUpdate, MessageResponse, MessageListResponse,
    ReactionCreate, ReactionSummary, AttachmentResponse, ParticipantInfo,
    OnlineStatusResponse
)
from app.services.websocket_manager import manager

router = APIRouter(prefix="/chat", tags=["Live Chat"])

# File upload configuration
CHAT_UPLOADS_DIR = Path("static/chat_uploads")
ALLOWED_FILE_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed'
}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB


# ==================== Helper Functions ====================

def get_conversation_response(conversation: LiveConversation, current_user_id: int, db: Session) -> dict:
    """Build conversation response with participants and unread count"""
    participants = []
    for participant in conversation.participants:
        # Check online status
        online_status = db.query(UserOnlineStatus).filter(
            UserOnlineStatus.user_id == participant.id
        ).first()

        # Get participant role in conversation
        participant_link = db.execute(
            conversation_participants.select().where(
                and_(
                    conversation_participants.c.conversation_id == conversation.id,
                    conversation_participants.c.user_id == participant.id
                )
            )
        ).first()

        participants.append(ParticipantInfo(
            id=participant.id,
            full_name=participant.full_name,
            avatar_url=participant.avatar_url,
            is_online=online_status.is_online if online_status else False,
            is_admin=participant_link.is_admin if participant_link else False
        ))

    # Get unread count
    last_read = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation.id,
                conversation_participants.c.user_id == current_user_id
            )
        )
    ).first()

    unread_count = 0
    if last_read and last_read.last_read_message_id:
        unread_count = db.query(LiveMessage).filter(
            LiveMessage.conversation_id == conversation.id,
            LiveMessage.id > last_read.last_read_message_id,
            LiveMessage.sender_id != current_user_id,
            LiveMessage.is_deleted == False
        ).count()
    elif last_read:
        unread_count = db.query(LiveMessage).filter(
            LiveMessage.conversation_id == conversation.id,
            LiveMessage.sender_id != current_user_id,
            LiveMessage.is_deleted == False
        ).count()

    # Get last message
    last_message = db.query(LiveMessage).filter(
        LiveMessage.conversation_id == conversation.id,
        LiveMessage.is_deleted == False
    ).order_by(desc(LiveMessage.created_at)).first()

    last_message_data = None
    if last_message:
        last_message_data = get_message_response(last_message, current_user_id, db)

    # For direct conversations, use other user's name as conversation name
    name = conversation.name
    if conversation.conversation_type == ConversationType.DIRECT:
        other_participant = next(
            (p for p in participants if p.id != current_user_id), None
        )
        if other_participant:
            name = other_participant.full_name

    return {
        "id": conversation.id,
        "conversation_type": conversation.conversation_type.value if hasattr(conversation.conversation_type, 'value') else conversation.conversation_type,
        "name": name,
        "description": conversation.description,
        "avatar_url": conversation.avatar_url,
        "created_by_id": conversation.created_by_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "last_message_at": conversation.last_message_at,
        "participants": participants,
        "unread_count": unread_count,
        "last_message": last_message_data
    }


def get_message_response(message: LiveMessage, current_user_id: int, db: Session) -> dict:
    """Build message response with attachments, reactions, and read status"""
    # Get attachments
    attachments = [
        AttachmentResponse(
            id=att.id,
            file_name=att.file_name,
            file_type=att.file_type,
            file_size=att.file_size,
            file_path=f"/static/chat_uploads/{att.file_path.split('/')[-1]}",
            thumbnail_path=att.thumbnail_path,
            created_at=att.created_at
        ) for att in message.attachments
    ]

    # Get reactions summary
    reactions_dict = {}
    for reaction in message.reactions:
        if reaction.emoji not in reactions_dict:
            reactions_dict[reaction.emoji] = {
                "emoji": reaction.emoji,
                "count": 0,
                "users": [],
                "reacted_by_me": False
            }
        reactions_dict[reaction.emoji]["count"] += 1
        reactions_dict[reaction.emoji]["users"].append(reaction.user.full_name)
        if reaction.user_id == current_user_id:
            reactions_dict[reaction.emoji]["reacted_by_me"] = True

    reactions = [ReactionSummary(**r) for r in reactions_dict.values()]

    # Get read receipts
    read_by = [r.user_id for r in message.read_receipts]
    is_read = current_user_id in read_by or message.sender_id == current_user_id

    # Get reply_to message if exists
    reply_to_data = None
    if message.reply_to_id and message.reply_to:
        reply_to_data = {
            "id": message.reply_to.id,
            "conversation_id": message.reply_to.conversation_id,
            "sender_id": message.reply_to.sender_id,
            "sender_name": message.reply_to.sender.full_name,
            "sender_avatar": message.reply_to.sender.avatar_url,
            "content": message.reply_to.content[:100] + "..." if message.reply_to.content and len(message.reply_to.content) > 100 else message.reply_to.content,
            "message_type": message.reply_to.message_type.value if hasattr(message.reply_to.message_type, 'value') else message.reply_to.message_type,
            "is_deleted": message.reply_to.is_deleted,
            "created_at": message.reply_to.created_at,
            "attachments": [],
            "reactions": [],
            "is_read": True,
            "read_by": []
        }

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_name": message.sender.full_name,
        "sender_avatar": message.sender.avatar_url,
        "content": message.content if not message.is_deleted else "[Message deleted]",
        "message_type": message.message_type.value if hasattr(message.message_type, 'value') else message.message_type,
        "reply_to_id": message.reply_to_id,
        "reply_to": reply_to_data,
        "is_edited": message.is_edited,
        "edited_at": message.edited_at,
        "is_deleted": message.is_deleted,
        "created_at": message.created_at,
        "attachments": attachments,
        "reactions": reactions,
        "is_read": is_read,
        "read_by": read_by
    }


# ==================== Conversation Endpoints ====================

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new conversation (direct message or group)"""

    # For direct messages, check if conversation already exists
    if data.conversation_type == ConversationType.DIRECT:
        if len(data.participant_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct messages must have exactly one other participant"
            )

        other_user_id = data.participant_ids[0]

        # Check if DM already exists between these users
        existing = db.query(LiveConversation).filter(
            LiveConversation.conversation_type == ConversationType.DIRECT,
            or_(
                and_(
                    LiveConversation.user1_id == current_user.id,
                    LiveConversation.user2_id == other_user_id
                ),
                and_(
                    LiveConversation.user1_id == other_user_id,
                    LiveConversation.user2_id == current_user.id
                )
            )
        ).first()

        if existing:
            return get_conversation_response(existing, current_user.id, db)

    # Validate participants exist
    participant_ids = list(set(data.participant_ids + [current_user.id]))
    participants = db.query(User).filter(User.id.in_(participant_ids)).all()

    if len(participants) != len(participant_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more participants not found"
        )

    # Create conversation
    conversation = LiveConversation(
        conversation_type=data.conversation_type,
        name=data.name if data.conversation_type == ConversationType.GROUP else None,
        description=data.description,
        created_by_id=current_user.id,
        user1_id=current_user.id if data.conversation_type == ConversationType.DIRECT else None,
        user2_id=data.participant_ids[0] if data.conversation_type == ConversationType.DIRECT else None
    )
    db.add(conversation)
    db.flush()

    # Add participants
    for user in participants:
        db.execute(
            conversation_participants.insert().values(
                conversation_id=conversation.id,
                user_id=user.id,
                is_admin=user.id == current_user.id,
                joined_at=datetime.utcnow()
            )
        )

    # Create system message for group creation
    if data.conversation_type == ConversationType.GROUP:
        system_message = LiveMessage(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            content=f"{current_user.full_name} created the group \"{data.name}\"",
            message_type=MessageType.SYSTEM
        )
        db.add(system_message)
        conversation.last_message_at = datetime.utcnow()

    db.commit()
    db.refresh(conversation)

    return get_conversation_response(conversation, current_user.id, db)


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for the current user"""

    # Get conversations where user is a participant
    query = db.query(LiveConversation).join(
        conversation_participants,
        LiveConversation.id == conversation_participants.c.conversation_id
    ).filter(
        conversation_participants.c.user_id == current_user.id,
        LiveConversation.is_active == True
    )

    # Search by name or participant name
    if search:
        query = query.filter(
            or_(
                LiveConversation.name.ilike(f"%{search}%"),
                LiveConversation.participants.any(User.full_name.ilike(f"%{search}%"))
            )
        )

    # Order by last message
    query = query.order_by(desc(func.coalesce(LiveConversation.last_message_at, LiveConversation.created_at)))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    conversations = query.offset(skip).limit(page_size).all()

    items = [get_conversation_response(conv, current_user.id, db) for conv in conversations]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific conversation"""

    conversation = db.query(LiveConversation).filter(
        LiveConversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if user is participant
    is_participant = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    ).first()

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")

    return get_conversation_response(conversation, current_user.id, db)


@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conversation details (group only)"""

    conversation = db.query(LiveConversation).filter(
        LiveConversation.id == conversation_id,
        LiveConversation.conversation_type == ConversationType.GROUP
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Group conversation not found")

    # Check if user is admin
    is_admin = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id,
                conversation_participants.c.is_admin == True
            )
        )
    ).first()

    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can update group details")

    if data.name is not None:
        conversation.name = data.name
    if data.description is not None:
        conversation.description = data.description

    conversation.updated_at = datetime.utcnow()
    db.commit()

    return get_conversation_response(conversation, current_user.id, db)


@router.post("/conversations/{conversation_id}/participants")
async def add_participants(
    conversation_id: int,
    user_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add participants to a group conversation"""

    conversation = db.query(LiveConversation).filter(
        LiveConversation.id == conversation_id,
        LiveConversation.conversation_type == ConversationType.GROUP
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Group conversation not found")

    # Check if user is admin
    is_admin = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id,
                conversation_participants.c.is_admin == True
            )
        )
    ).first()

    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can add participants")

    # Add new participants
    added = []
    for user_id in user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            continue

        # Check if already a participant
        existing = db.execute(
            conversation_participants.select().where(
                and_(
                    conversation_participants.c.conversation_id == conversation_id,
                    conversation_participants.c.user_id == user_id
                )
            )
        ).first()

        if not existing:
            db.execute(
                conversation_participants.insert().values(
                    conversation_id=conversation_id,
                    user_id=user_id,
                    joined_at=datetime.utcnow()
                )
            )
            added.append(user.full_name)

    if added:
        # Create system message
        system_message = LiveMessage(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=f"{current_user.full_name} added {', '.join(added)} to the group",
            message_type=MessageType.SYSTEM
        )
        db.add(system_message)
        conversation.last_message_at = datetime.utcnow()

    db.commit()

    return {"message": f"Added {len(added)} participant(s)", "added": added}


@router.delete("/conversations/{conversation_id}/participants/{user_id}")
async def remove_participant(
    conversation_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a participant from a group conversation"""

    conversation = db.query(LiveConversation).filter(
        LiveConversation.id == conversation_id,
        LiveConversation.conversation_type == ConversationType.GROUP
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Group conversation not found")

    # Check if user is admin or removing themselves
    is_admin = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id,
                conversation_participants.c.is_admin == True
            )
        )
    ).first()

    if not is_admin and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only admins can remove other participants")

    # Get user being removed
    removed_user = db.query(User).filter(User.id == user_id).first()

    # Remove participant
    db.execute(
        conversation_participants.delete().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == user_id
            )
        )
    )

    # Create system message
    if removed_user:
        if user_id == current_user.id:
            content = f"{current_user.full_name} left the group"
        else:
            content = f"{current_user.full_name} removed {removed_user.full_name} from the group"

        system_message = LiveMessage(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=content,
            message_type=MessageType.SYSTEM
        )
        db.add(system_message)
        conversation.last_message_at = datetime.utcnow()

    db.commit()

    return {"message": "Participant removed"}


# ==================== Message Endpoints ====================

@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages in a conversation"""

    # Check if user is participant
    is_participant = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    ).first()

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")

    query = db.query(LiveMessage).filter(
        LiveMessage.conversation_id == conversation_id
    )

    # For pagination using before_id (infinite scroll)
    if before_id:
        query = query.filter(LiveMessage.id < before_id)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    # Order by newest first, then reverse for display
    messages = query.order_by(desc(LiveMessage.created_at)).limit(page_size).all()
    messages.reverse()  # Oldest first in result

    items = [get_message_response(msg, current_user.id, db) for msg in messages]

    # Check if there are more messages
    has_more = total > page_size if not before_id else len(messages) == page_size

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_more": has_more
    }


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a conversation"""

    # Check if user is participant
    is_participant = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    ).first()

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")

    # Validate reply_to if provided
    if data.reply_to_id:
        reply_msg = db.query(LiveMessage).filter(
            LiveMessage.id == data.reply_to_id,
            LiveMessage.conversation_id == conversation_id
        ).first()
        if not reply_msg:
            raise HTTPException(status_code=400, detail="Reply message not found")

    # Create message - convert schema enum to model enum by value
    message = LiveMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content,
        message_type=MessageType(data.message_type.value),
        reply_to_id=data.reply_to_id
    )
    db.add(message)

    # Update conversation last_message_at
    conversation = db.query(LiveConversation).filter(
        LiveConversation.id == conversation_id
    ).first()
    conversation.last_message_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    message_data = get_message_response(message, current_user.id, db)

    # Get participant IDs for WebSocket broadcast
    participant_ids = [p.id for p in conversation.participants]

    # Broadcast to WebSocket
    await manager.send_new_message(conversation_id, message_data, current_user.id, participant_ids)

    return message_data


@router.post("/conversations/{conversation_id}/messages/with-attachments", response_model=MessageResponse)
async def send_message_with_attachments(
    conversation_id: int,
    content: Optional[str] = None,
    message_type: str = "text",
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message with attachments in one request"""

    # Check if user is participant
    is_participant = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    ).first()

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")

    # Determine message type
    msg_type = MessageType.TEXT
    if files:
        # Check if all files are images
        all_images = all(f.content_type and f.content_type.startswith("image/") for f in files)
        msg_type = MessageType.IMAGE if all_images else MessageType.FILE
    elif message_type == "file":
        msg_type = MessageType.FILE

    # Create message
    message = LiveMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=content,
        message_type=msg_type
    )
    db.add(message)
    db.flush()

    # Process attachments
    CHAT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    for file in files:
        # Validate file type
        if file.content_type not in ALLOWED_FILE_TYPES:
            continue

        # Read file
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            continue

        # Generate unique filename
        ext = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = CHAT_UPLOADS_DIR / unique_filename

        # Save file
        with open(file_path, "wb") as f:
            f.write(file_content)

        # Create attachment record
        attachment = MessageAttachment(
            message_id=message.id,
            file_name=file.filename or "unnamed",
            file_path=str(file_path),
            file_type=file.content_type or "application/octet-stream",
            file_size=len(file_content)
        )
        db.add(attachment)

    # Update conversation last_message_at
    conversation = db.query(LiveConversation).filter(
        LiveConversation.id == conversation_id
    ).first()
    conversation.last_message_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    message_data = get_message_response(message, current_user.id, db)

    # Get participant IDs for WebSocket broadcast
    participant_ids = [p.id for p in conversation.participants]

    # Broadcast to WebSocket
    await manager.send_new_message(conversation_id, message_data, current_user.id, participant_ids)

    return message_data


@router.post("/conversations/{conversation_id}/messages/{message_id}/attachments")
async def upload_attachment(
    conversation_id: int,
    message_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload an attachment to a message"""

    # Verify message exists and user is sender
    message = db.query(LiveMessage).filter(
        LiveMessage.id == message_id,
        LiveMessage.conversation_id == conversation_id,
        LiveMessage.sender_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found or you're not the sender")

    # Validate file type
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: images, PDF, documents, spreadsheets"
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # Create uploads directory
    CHAT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    ext = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = CHAT_UPLOADS_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create attachment record
    attachment = MessageAttachment(
        message_id=message_id,
        file_name=file.filename or "unnamed",
        file_path=str(file_path),
        file_type=file.content_type or "application/octet-stream",
        file_size=len(content)
    )
    db.add(attachment)

    # Update message type if it's an image
    if file.content_type and file.content_type.startswith("image/"):
        message.message_type = MessageType.IMAGE
    else:
        message.message_type = MessageType.FILE

    db.commit()
    db.refresh(attachment)

    return AttachmentResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        file_type=attachment.file_type,
        file_size=attachment.file_size,
        file_path=f"/static/chat_uploads/{unique_filename}",
        thumbnail_path=attachment.thumbnail_path,
        created_at=attachment.created_at
    )


@router.put("/messages/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: int,
    data: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit a message"""

    message = db.query(LiveMessage).filter(
        LiveMessage.id == message_id,
        LiveMessage.sender_id == current_user.id,
        LiveMessage.is_deleted == False
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.content = data.content
    message.is_edited = True
    message.edited_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    message_data = get_message_response(message, current_user.id, db)

    # Broadcast edit
    await manager.send_message_edited(message.conversation_id, message_data)

    return message_data


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a message (soft delete)"""

    message = db.query(LiveMessage).filter(
        LiveMessage.id == message_id,
        LiveMessage.sender_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.is_deleted = True
    message.deleted_at = datetime.utcnow()

    db.commit()

    # Broadcast deletion
    await manager.send_message_deleted(message.conversation_id, message_id)

    return {"message": "Message deleted"}


# ==================== Reaction Endpoints ====================

@router.post("/messages/{message_id}/reactions")
async def add_reaction(
    message_id: int,
    data: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a reaction to a message"""

    message = db.query(LiveMessage).filter(LiveMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Check if user is participant
    is_participant = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == message.conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    ).first()

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    # Check if reaction already exists
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == data.emoji
    ).first()

    if existing:
        return {"message": "Reaction already exists"}

    reaction = MessageReaction(
        message_id=message_id,
        user_id=current_user.id,
        emoji=data.emoji
    )
    db.add(reaction)
    db.commit()

    # Broadcast reaction
    await manager.send_reaction(message.conversation_id, message_id, current_user.id, data.emoji, "add")

    return {"message": "Reaction added"}


@router.delete("/messages/{message_id}/reactions/{emoji}")
async def remove_reaction(
    message_id: int,
    emoji: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a reaction from a message"""

    message = db.query(LiveMessage).filter(LiveMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    reaction = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == emoji
    ).first()

    if not reaction:
        raise HTTPException(status_code=404, detail="Reaction not found")

    db.delete(reaction)
    db.commit()

    # Broadcast reaction removal
    await manager.send_reaction(message.conversation_id, message_id, current_user.id, emoji, "remove")

    return {"message": "Reaction removed"}


# ==================== Read Receipt Endpoints ====================

@router.post("/conversations/{conversation_id}/messages/{message_id}/read")
async def mark_message_read(
    conversation_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific message as read"""

    # Check if user is participant
    participant_row = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    ).first()

    if not participant_row:
        raise HTTPException(status_code=403, detail="Not a participant")

    # Only update if the new message_id is greater than current last_read_message_id
    # This ensures we always track the latest read message
    current_last_read = participant_row.last_read_message_id or 0

    if message_id > current_last_read:
        db.execute(
            conversation_participants.update().where(
                and_(
                    conversation_participants.c.conversation_id == conversation_id,
                    conversation_participants.c.user_id == current_user.id
                )
            ).values(
                last_read_at=datetime.utcnow(),
                last_read_message_id=message_id
            )
        )
        db.commit()

        # Broadcast read receipt
        await manager.send_message_read(conversation_id, message_id, current_user.id)

    return {"message": "Marked as read"}


@router.post("/conversations/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all messages in a conversation as read"""

    # Get latest message
    latest_message = db.query(LiveMessage).filter(
        LiveMessage.conversation_id == conversation_id
    ).order_by(desc(LiveMessage.created_at)).first()

    if not latest_message:
        return {"message": "No messages to mark as read"}

    # Update last_read in participants table
    db.execute(
        conversation_participants.update().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        ).values(
            last_read_at=datetime.utcnow(),
            last_read_message_id=latest_message.id
        )
    )

    db.commit()

    # Broadcast read receipt
    await manager.send_message_read(conversation_id, latest_message.id, current_user.id)

    return {"message": "Marked as read", "last_read_message_id": latest_message.id}


# ==================== User Search Endpoints ====================

@router.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users for starting new conversations"""

    users = db.query(User).filter(
        User.id != current_user.id,
        User.is_active == True,
        or_(
            User.full_name.ilike(f"%{q}%"),
            User.email.ilike(f"%{q}%")
        )
    ).limit(20).all()

    result = []
    for user in users:
        online_status = db.query(UserOnlineStatus).filter(
            UserOnlineStatus.user_id == user.id
        ).first()

        result.append({
            "id": user.id,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "is_online": online_status.is_online if online_status else False,
            "is_admin": False
        })

    return result


@router.post("/conversations/{conversation_id}/leave")
async def leave_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a group conversation"""

    conversation = db.query(LiveConversation).filter(
        LiveConversation.id == conversation_id,
        LiveConversation.conversation_type == ConversationType.GROUP
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Group conversation not found")

    # Check if user is participant
    is_participant = db.execute(
        conversation_participants.select().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    ).first()

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    # Remove user from conversation
    db.execute(
        conversation_participants.delete().where(
            and_(
                conversation_participants.c.conversation_id == conversation_id,
                conversation_participants.c.user_id == current_user.id
            )
        )
    )

    # Create system message
    system_message = LiveMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{current_user.full_name} left the group",
        message_type=MessageType.SYSTEM
    )
    db.add(system_message)
    conversation.last_message_at = datetime.utcnow()

    db.commit()

    return {"message": "Left the conversation"}


# ==================== Online Status Endpoints ====================

@router.get("/users/online", response_model=List[OnlineStatusResponse])
async def get_online_users(
    user_ids: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get online status of users"""

    query = db.query(UserOnlineStatus)

    if user_ids:
        ids = [int(id.strip()) for id in user_ids.split(",")]
        query = query.filter(UserOnlineStatus.user_id.in_(ids))

    statuses = query.all()

    return [
        OnlineStatusResponse(
            user_id=s.user_id,
            is_online=s.is_online,
            last_seen=s.last_seen
        ) for s in statuses
    ]


# ==================== WebSocket Endpoint ====================

@router.websocket("/ws/{token}")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str
):
    """WebSocket endpoint for real-time chat"""
    from app.core.security import decode_token
    from app.core.database import SessionLocal

    # Authenticate user from token
    try:
        payload = decode_token(token)
        if not payload:
            await websocket.accept()
            await websocket.close(code=4001, reason="Invalid token")
            return
        user_id = payload.get("sub")
        if not user_id:
            await websocket.accept()
            await websocket.close(code=4001, reason="No user ID in token")
            return
    except Exception as e:
        await websocket.accept()
        await websocket.close(code=4001, reason="Token verification failed")
        return

    # Create a database session for initial setup
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            await websocket.accept()
            await websocket.close(code=4001, reason="User not found")
            return

        user_id_int = user.id

        # Connect
        await manager.connect(websocket, user_id_int)

        # Update online status in DB
        online_status = db.query(UserOnlineStatus).filter(
            UserOnlineStatus.user_id == user_id_int
        ).first()

        if online_status:
            online_status.is_online = True
            online_status.last_seen = datetime.utcnow()
        else:
            online_status = UserOnlineStatus(
                user_id=user_id_int,
                is_online=True
            )
            db.add(online_status)

        db.commit()

        # Get user's conversations and subscribe
        user_conversations = db.query(LiveConversation).join(
            conversation_participants,
            LiveConversation.id == conversation_participants.c.conversation_id
        ).filter(
            conversation_participants.c.user_id == user_id_int
        ).all()

        conv_ids = [conv.id for conv in user_conversations]
    finally:
        db.close()

    # Subscribe to conversations
    for conv_id in conv_ids:
        await manager.subscribe_to_conversation(user_id_int, conv_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "typing":
                conv_id = data.get("conversation_id")
                is_typing = data.get("is_typing", False)
                await manager.set_typing(user_id_int, conv_id, is_typing)

            elif msg_type == "subscribe":
                conv_id = data.get("conversation_id")
                await manager.subscribe_to_conversation(user_id_int, conv_id)

            elif msg_type == "unsubscribe":
                conv_id = data.get("conversation_id")
                await manager.unsubscribe_from_conversation(user_id_int, conv_id)

            elif msg_type == "mark_read":
                conv_id = data.get("conversation_id")
                msg_id = data.get("message_id")
                if conv_id and msg_id:
                    # Create new session for DB update
                    db = SessionLocal()
                    try:
                        db.execute(
                            conversation_participants.update().where(
                                and_(
                                    conversation_participants.c.conversation_id == conv_id,
                                    conversation_participants.c.user_id == user_id_int
                                )
                            ).values(
                                last_read_at=datetime.utcnow(),
                                last_read_message_id=msg_id
                            )
                        )
                        db.commit()
                    finally:
                        db.close()
                    await manager.send_message_read(conv_id, msg_id, user_id_int)

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Disconnect and update status
        await manager.disconnect(websocket, user_id_int)

        # Update online status
        if not manager.is_user_online(user_id_int):
            db = SessionLocal()
            try:
                db.query(UserOnlineStatus).filter(
                    UserOnlineStatus.user_id == user_id_int
                ).update({
                    "is_online": False,
                    "last_seen": datetime.utcnow()
                })
                db.commit()
            finally:
                db.close()

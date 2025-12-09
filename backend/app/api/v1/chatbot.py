from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.chatbot import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatConversationResponse,
    CreateTicketFromChatRequest,
    ChatbotResponse,
    ChatSuggestion,
    KBSuggestion,
    TicketCategoryResponse
)
from app.schemas.ticket import TicketCreate, TicketTypeEnum, TicketPriorityEnum, TicketImpactEnum, TicketUrgencyEnum
from app.models.user import User
from app.models.chat_conversation import ChatConversation, ChatMessage
from app.models.ticket import Ticket
from app.services.ai_chatbot_service import AIChatbotService
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])

chatbot_service = AIChatbotService()


@router.post("/message", response_model=ChatbotResponse)
async def send_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message to the AI chatbot and get a response.

    The chatbot will:
    1. Search the knowledge base for relevant articles
    2. If high-relevance KB article found, return that
    3. Otherwise, use OpenAI (if available) or rule-based fallback
    4. Suggest ticket creation when appropriate
    """
    # Get or create conversation
    if message_data.session_id:
        conversation = db.query(ChatConversation).filter(
            ChatConversation.session_id == message_data.session_id
        ).first()
    else:
        conversation = None

    if not conversation:
        # Create new conversation
        session_id = str(uuid.uuid4())
        conversation = ChatConversation(
            session_id=session_id,
            user_id=current_user.id,
            status="active",
            issue_summary=message_data.content[:500]
        )
        db.add(conversation)
        db.flush()

    # Save user message
    user_message = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=message_data.content,
        message_type="text"
    )
    db.add(user_message)
    db.flush()

    # Analyze sentiment
    sentiment = chatbot_service.analyze_sentiment(message_data.content)
    conversation.sentiment = sentiment

    # Get conversation history
    conversation_history = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation.id
    ).order_by(ChatMessage.created_at).all()

    # Format for AI
    messages_for_ai = [
        {"role": msg.role, "content": msg.content}
        for msg in conversation_history
    ]

    # Search knowledge base for context and articles
    knowledge_context, knowledge_articles = chatbot_service.search_knowledge_base(
        message_data.content, db
    )

    # Get AI response
    ai_response_text, metadata = await chatbot_service.get_ai_response(
        messages_for_ai,
        knowledge_context,
        knowledge_articles
    )

    # Save AI message
    ai_message = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_response_text,
        message_type="text",
        metadata=metadata
    )
    db.add(ai_message)

    # Generate suggestions
    suggestions = []

    # If AI suggests escalation or many turns, offer ticket creation
    turn_count = len([m for m in messages_for_ai if m["role"] == "user"])
    can_create_ticket = turn_count >= 2 or metadata.get("escalation_suggested", False)

    if metadata.get("has_solution"):
        suggestions.append(ChatSuggestion(
            type="question",
            text="Did this solve your issue?",
            action="confirm_resolution"
        ))

    if can_create_ticket:
        suggestions.append(ChatSuggestion(
            type="escalate",
            text="Create a support ticket",
            action="create_ticket"
        ))

    # Add knowledge base article suggestions if available
    kb_articles = []
    if knowledge_articles:
        for article in knowledge_articles[:3]:
            kb_articles.append({
                "id": article.get("id"),
                "title": article.get("title"),
                "slug": article.get("slug"),
                "relevance_score": article.get("relevance_score", 0)
            })

    # Update conversation metadata
    conversation.conversation_metadata = {
        "turn_count": turn_count,
        "last_metadata": metadata,
        "kb_articles_shown": [a.get("id") for a in knowledge_articles[:3]] if knowledge_articles else []
    }
    conversation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(ai_message)
    db.refresh(conversation)

    return ChatbotResponse(
        message=ChatMessageResponse.model_validate(ai_message),
        suggestions=suggestions,
        can_create_ticket=can_create_ticket,
        sentiment=sentiment,
        session_id=conversation.session_id,
        conversation_id=conversation.id,
        kb_articles=kb_articles,
        source=metadata.get("source", "fallback")
    )


@router.get("/suggestions", response_model=List[KBSuggestion])
async def get_typing_suggestions(
    query: str = Query(..., min_length=2, max_length=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get typing suggestions from knowledge base.
    Used for autocomplete while user is typing.
    """
    suggestions = chatbot_service.get_suggestions(query, db, limit=5)
    return [KBSuggestion(**s) for s in suggestions]


@router.get("/categories", response_model=List[TicketCategoryResponse])
async def get_ticket_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get available ticket categories for ticket creation.
    """
    categories = chatbot_service.get_ticket_categories(db)
    return [TicketCategoryResponse(**c) for c in categories]


@router.get("/conversation/{session_id}", response_model=ChatConversationResponse)
async def get_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a conversation by session ID
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.session_id == session_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


@router.get("/conversations", response_model=List[ChatConversationResponse])
async def get_user_conversations(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's chat conversations
    """
    conversations = db.query(ChatConversation).filter(
        ChatConversation.user_id == current_user.id
    ).order_by(ChatConversation.created_at.desc()).limit(limit).all()

    return conversations


@router.post("/create-ticket", response_model=dict)
async def create_ticket_from_chat(
    request: CreateTicketFromChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a support ticket from a chat conversation
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == request.conversation_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if conversation.ticket_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket already created for this conversation"
        )

    # Generate ticket summary from conversation
    ticket_data = chatbot_service.generate_ticket_summary(conversation)

    # Add additional notes if provided
    if request.additional_notes:
        ticket_data["description"] += f"\n\n**Additional Notes**:\n{request.additional_notes}"

    # Use provided category or suggest one
    category_id = request.category_id
    if not category_id:
        category_id = chatbot_service.suggest_category(conversation.messages, db)

    # Use provided title or generated one
    title = request.title if request.title else ticket_data["title"]

    # Create ticket
    ticket_create = TicketCreate(
        title=title,
        description=ticket_data["description"],
        ticket_type=TicketTypeEnum.INCIDENT,
        priority=TicketPriorityEnum(request.priority),
        impact=TicketImpactEnum.MEDIUM,
        urgency=TicketUrgencyEnum.MEDIUM,
        category_id=category_id,
        requester_id=current_user.id
    )

    ticket = TicketService.create_ticket(db, ticket_create, current_user)

    # Update conversation
    conversation.ticket_id = ticket.id
    conversation.status = "escalated"
    conversation.closed_at = datetime.utcnow()

    # Add system message
    system_message = ChatMessage(
        conversation_id=conversation.id,
        role="system",
        content=f"Ticket {ticket.ticket_number} has been created. Our support team will assist you shortly.",
        message_type="ticket_created",
        message_metadata={"ticket_id": ticket.id, "ticket_number": ticket.ticket_number}
    )
    db.add(system_message)

    db.commit()

    return {
        "success": True,
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "message": f"Ticket {ticket.ticket_number} created successfully"
    }


@router.post("/conversation/{session_id}/resolve")
async def mark_conversation_resolved(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a conversation as resolved
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.session_id == session_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    conversation.status = "resolved"
    conversation.resolution_provided = True
    conversation.closed_at = datetime.utcnow()

    # Add system message
    system_message = ChatMessage(
        conversation_id=conversation.id,
        role="system",
        content="Great! I'm glad I could help resolve your issue. Feel free to reach out if you need assistance again!",
        message_type="resolution"
    )
    db.add(system_message)

    db.commit()

    return {"success": True, "message": "Conversation marked as resolved"}


@router.delete("/conversation/{session_id}")
async def delete_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a conversation
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.session_id == session_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    db.delete(conversation)
    db.commit()

    return {"success": True, "message": "Conversation deleted"}

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationPreference
from app.services.notification_service import NotificationService
from pydantic import BaseModel

router = APIRouter()

class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    action_url: Optional[str]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime

class NotificationPreferenceUpdate(BaseModel):
    email_ticket_assigned: Optional[bool] = None
    email_ticket_status_changed: Optional[bool] = None
    email_ticket_comment: Optional[bool] = None
    email_change_approval_needed: Optional[bool] = None
    email_change_status_changed: Optional[bool] = None
    email_service_request_updates: Optional[bool] = None
    email_sla_warnings: Optional[bool] = None
    inapp_ticket_assigned: Optional[bool] = None
    inapp_ticket_status_changed: Optional[bool] = None
    inapp_ticket_comment: Optional[bool] = None
    inapp_change_approval_needed: Optional[bool] = None
    inapp_change_status_changed: Optional[bool] = None
    inapp_service_request_updates: Optional[bool] = None
    inapp_sla_warnings: Optional[bool] = None
    enable_daily_digest: Optional[bool] = None
    daily_digest_time: Optional[str] = None

@router.get("/")
async def get_notifications(
    unread_only: bool = False,
    limit: int = Query(50, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notifications"""
    notifications = NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    
    return [
        {
            "id": n.id,
            "type": n.type.value,
            "title": n.title,
            "message": n.message,
            "entity_type": n.entity_type,
            "entity_id": n.entity_id,
            "action_url": n.action_url,
            "is_read": n.is_read,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    count = NotificationService.get_unread_count(db=db, user_id=current_user.id)
    return {"count": count}

@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    success = NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    count = NotificationService.mark_all_as_read(db=db, user_id=current_user.id)
    return {"message": f"Marked {count} notifications as read", "count": count}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    success = NotificationService.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}

@router.get("/preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences"""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    # Create default preferences if they don't exist
    if not preferences:
        preferences = NotificationPreference(user_id=current_user.id)
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return {
        "id": preferences.id,
        "user_id": preferences.user_id,
        "email_ticket_assigned": preferences.email_ticket_assigned,
        "email_ticket_status_changed": preferences.email_ticket_status_changed,
        "email_ticket_comment": preferences.email_ticket_comment,
        "email_change_approval_needed": preferences.email_change_approval_needed,
        "email_change_status_changed": preferences.email_change_status_changed,
        "email_service_request_updates": preferences.email_service_request_updates,
        "email_sla_warnings": preferences.email_sla_warnings,
        "inapp_ticket_assigned": preferences.inapp_ticket_assigned,
        "inapp_ticket_status_changed": preferences.inapp_ticket_status_changed,
        "inapp_ticket_comment": preferences.inapp_ticket_comment,
        "inapp_change_approval_needed": preferences.inapp_change_approval_needed,
        "inapp_change_status_changed": preferences.inapp_change_status_changed,
        "inapp_service_request_updates": preferences.inapp_service_request_updates,
        "inapp_sla_warnings": preferences.inapp_sla_warnings,
        "enable_daily_digest": preferences.enable_daily_digest,
        "daily_digest_time": preferences.daily_digest_time,
    }

@router.put("/preferences")
async def update_notification_preferences(
    preferences_update: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    # Create if doesn't exist
    if not preferences:
        preferences = NotificationPreference(user_id=current_user.id)
        db.add(preferences)
    
    # Update fields
    update_data = preferences_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)
    
    preferences.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(preferences)
    
    return {
        "message": "Notification preferences updated successfully",
        "preferences": {
            "id": preferences.id,
            "user_id": preferences.user_id,
            "email_ticket_assigned": preferences.email_ticket_assigned,
            "email_ticket_status_changed": preferences.email_ticket_status_changed,
            "email_ticket_comment": preferences.email_ticket_comment,
            "email_change_approval_needed": preferences.email_change_approval_needed,
            "email_change_status_changed": preferences.email_change_status_changed,
            "email_service_request_updates": preferences.email_service_request_updates,
            "email_sla_warnings": preferences.email_sla_warnings,
            "inapp_ticket_assigned": preferences.inapp_ticket_assigned,
            "inapp_ticket_status_changed": preferences.inapp_ticket_status_changed,
            "inapp_ticket_comment": preferences.inapp_ticket_comment,
            "inapp_change_approval_needed": preferences.inapp_change_approval_needed,
            "inapp_change_status_changed": preferences.inapp_change_status_changed,
            "inapp_service_request_updates": preferences.inapp_service_request_updates,
            "inapp_sla_warnings": preferences.inapp_sla_warnings,
            "enable_daily_digest": preferences.enable_daily_digest,
            "daily_digest_time": preferences.daily_digest_time,
        }
    }
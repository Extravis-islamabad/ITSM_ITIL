from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.system_settings import SystemSettings
from datetime import datetime

router = APIRouter(prefix="/settings", tags=["Settings"])


# Schemas
class SettingResponse(BaseModel):
    id: int
    key: str
    value: Optional[str]
    value_type: str
    category: str
    description: Optional[str]
    is_sensitive: bool

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str


class BulkSettingUpdate(BaseModel):
    settings: Dict[str, Any]


class SettingsByCategoryResponse(BaseModel):
    category: str
    settings: List[SettingResponse]


@router.get("", response_model=List[SettingsByCategoryResponse])
async def get_all_settings(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all settings grouped by category. Non-admin users only see non-sensitive settings."""
    query = db.query(SystemSettings)

    if category:
        query = query.filter(SystemSettings.category == category)

    settings = query.order_by(SystemSettings.category, SystemSettings.key).all()

    # Check if user is admin
    is_admin = current_user.is_superuser or (
        current_user.role and current_user.role.name in ['admin', 'System Administrator']
    )

    # Group by category
    categories: Dict[str, List[dict]] = {}
    for setting in settings:
        # Skip sensitive settings for non-admin users
        if setting.is_sensitive and not is_admin:
            continue

        cat = setting.category
        if cat not in categories:
            categories[cat] = []

        setting_data = {
            "id": setting.id,
            "key": setting.key,
            "value": "********" if setting.is_sensitive and not is_admin else setting.value,
            "value_type": setting.value_type,
            "category": setting.category,
            "description": setting.description,
            "is_sensitive": setting.is_sensitive
        }
        categories[cat].append(setting_data)

    return [
        {"category": cat, "settings": settings_list}
        for cat, settings_list in categories.items()
    ]


@router.get("/flat")
async def get_settings_flat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all settings as a flat key-value object for easy frontend consumption"""
    settings = db.query(SystemSettings).all()

    # Check if user is admin
    is_admin = current_user.is_superuser or (
        current_user.role and current_user.role.name in ['admin', 'System Administrator']
    )

    result = {}
    for setting in settings:
        # Skip sensitive settings for non-admin users
        if setting.is_sensitive and not is_admin:
            continue

        # Get typed value
        typed_value = setting.get_typed_value()

        # Mask sensitive values for non-admins
        if setting.is_sensitive and not is_admin:
            result[setting.key] = "********"
        else:
            result[setting.key] = typed_value

    return result


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(
    key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single setting by key"""
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    # Check if user is admin
    is_admin = current_user.is_superuser or (
        current_user.role and current_user.role.name in ['admin', 'System Administrator']
    )

    # Non-admin users cannot view sensitive settings
    if setting.is_sensitive and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this setting"
        )

    return setting


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    update_data: SettingUpdate,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Update a single setting (Admin only)"""
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    setting.value = update_data.value
    setting.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(setting)

    return setting


@router.put("")
async def update_settings_bulk(
    update_data: BulkSettingUpdate,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Update multiple settings at once (Admin only)"""
    updated_keys = []

    for key, value in update_data.settings.items():
        setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()

        if setting:
            # Convert value to string for storage
            if isinstance(value, bool):
                setting.value = str(value).lower()
            elif value is None:
                setting.value = None
            else:
                setting.value = str(value)

            setting.updated_at = datetime.utcnow()
            updated_keys.append(key)
        else:
            # Create new setting if it doesn't exist
            new_setting = SystemSettings(
                key=key,
                value=str(value).lower() if isinstance(value, bool) else (None if value is None else str(value)),
                value_type="boolean" if isinstance(value, bool) else ("integer" if isinstance(value, int) else "string"),
                category="general",
                description=f"Auto-created setting: {key}",
                is_sensitive=False
            )
            db.add(new_setting)
            updated_keys.append(key)

    db.commit()

    return {"message": f"Updated {len(updated_keys)} settings", "updated_keys": updated_keys}


@router.post("/reset/{key}", response_model=SettingResponse)
async def reset_setting(
    key: str,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Reset a setting to its default value (Admin only)"""
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    # Default values based on key
    defaults = {
        # Company
        'company_name': 'SupportX Inc.',
        'company_email': 'support@supportx.com',
        'company_phone': '+1 (555) 123-4567',
        'company_address': '123 Tech Street, Silicon Valley, CA 94000',
        'company_logo_url': '',
        # Tickets
        'ticket_prefix': 'TKT',
        'default_ticket_priority': 'MEDIUM',
        'auto_assign_tickets': 'true',
        'require_category': 'true',
        'allow_self_assign': 'true',
        'auto_close_resolved_days': '7',
        # SLA
        'business_hours_start': '09:00',
        'business_hours_end': '18:00',
        'working_days': 'Mon,Tue,Wed,Thu,Fri',
        'timezone': 'America/New_York',
        'exclude_holidays': 'true',
        # Email
        'smtp_enabled': 'false',
        'smtp_host': '',
        'smtp_port': '587',
        'smtp_username': '',
        'smtp_password': '',
        'smtp_from_email': 'noreply@supportx.com',
        'smtp_from_name': 'SupportX Support',
        'email_notifications': 'true',
        'digest_frequency': 'daily',
        # Security
        'session_timeout': '30',
        'password_min_length': '8',
        'password_require_uppercase': 'true',
        'password_require_number': 'true',
        'password_require_special': 'true',
        'max_login_attempts': '5',
        'lockout_duration': '15',
        'require_2fa': 'false',
        'allow_remember_me': 'true',
    }

    if key in defaults:
        setting.value = defaults[key]
        setting.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(setting)

    return setting


@router.get("/category/{category}", response_model=List[SettingResponse])
async def get_settings_by_category(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all settings in a specific category"""
    settings = db.query(SystemSettings).filter(
        SystemSettings.category == category
    ).order_by(SystemSettings.key).all()

    # Check if user is admin
    is_admin = current_user.is_superuser or (
        current_user.role and current_user.role.name in ['admin', 'System Administrator']
    )

    # Filter out sensitive settings for non-admin users
    if not is_admin:
        settings = [s for s in settings if not s.is_sensitive]

    return settings

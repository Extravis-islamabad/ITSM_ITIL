"""
Centralized Emoji Constants

This module contains all emoji definitions used throughout the ITSM platform backend.
Use these constants instead of hardcoding emojis to ensure consistency with the frontend.
"""

from typing import Dict, Literal

# ============================================================================
# NOTIFICATION EMOJIS
# ============================================================================

NOTIFICATION_EMOJIS: Dict[str, str] = {
    "TICKET_ASSIGNED": "🎯",
    "TICKET_STATUS_CHANGED": "🔄",
    "TICKET_COMMENT": "💬",
    "TICKET_PRIORITY_CHANGED": "⚡",
    "CHANGE_APPROVAL_NEEDED": "⚠️",
    "CHANGE_APPROVED": "✅",
    "CHANGE_REJECTED": "❌",
    "SERVICE_REQUEST_COMPLETED": "🎉",
    "SLA_BREACH_WARNING": "⏰",
    "SLA_BREACHED": "🚨",
    "DEFAULT": "🔔",
}


def get_notification_emoji(notification_type: str) -> str:
    """Get emoji for a notification type."""
    return NOTIFICATION_EMOJIS.get(notification_type, NOTIFICATION_EMOJIS["DEFAULT"])


# ============================================================================
# CATEGORY EMOJIS
# ============================================================================

CATEGORY_EMOJIS: Dict[str, str] = {
    "HARDWARE": "💻",
    "SOFTWARE": "⚙️",
    "NETWORK": "🌐",
    "ACCESS": "🔐",
    "ACCOUNT_ACCESS": "🔐",
    "SERVICE_REQUEST": "📋",
}

DEFAULT_CATEGORY_EMOJI = "📁"


def get_category_emoji(category_name: str) -> str:
    """Get emoji for a category by name."""
    normalized_name = category_name.upper().replace(" ", "_")
    return CATEGORY_EMOJIS.get(normalized_name, DEFAULT_CATEGORY_EMOJI)


# ============================================================================
# ASSET TYPE EMOJIS
# ============================================================================

ASSET_TYPE_EMOJIS: Dict[str, str] = {
    "HARDWARE": "🔧",
    "SOFTWARE": "💿",
    "DEFAULT": "📦",
}

DEFAULT_ASSET_EMOJI = "📦"


def get_asset_type_emoji(asset_type: Literal["hardware", "software"]) -> str:
    """Get emoji for asset type (hardware/software)."""
    return ASSET_TYPE_EMOJIS.get(asset_type.upper(), ASSET_TYPE_EMOJIS["DEFAULT"])


# ============================================================================
# SERVICE REQUEST TEMPLATE EMOJIS
# ============================================================================

SERVICE_REQUEST_EMOJIS: Dict[str, str] = {
    "NEW_LAPTOP": "💻",
    "SOFTWARE_INSTALLATION": "📦",
    "EMAIL_SETUP": "📧",
    "VPN_ACCESS": "🔐",
    "MOBILE_PHONE": "📱",
    "PASSWORD_RESET": "🔑",
    "MONITOR_REQUEST": "🖥️",
    "LICENSE_REQUEST": "🎫",
}

# ============================================================================
# STATUS EMOJIS (for console/logging)
# ============================================================================

STATUS_EMOJIS: Dict[str, str] = {
    "SUCCESS": "✅",
    "ERROR": "❌",
    "WARNING": "⚠️",
    "INFO": "ℹ️",
    "PROGRESS": "🔄",
    "COMPLETED": "✓",
    "SETTINGS": "🔧",
    "PIN": "📌",
    "LIST": "📋",
    "EMAIL": "📧",
    "TEST": "🧪",
    "CELEBRATION": "✨",
    "STEP_1": "1️⃣",
    "STEP_2": "2️⃣",
    "STEP_3": "3️⃣",
}

from typing import Optional
import re
import html
from datetime import datetime, timedelta
import pytz


def sanitize_html(text: str) -> str:
    """Escape HTML entities to prevent XSS attacks"""
    if not text:
        return text
    return html.escape(text)


def sanitize_input(text: str, allow_html: bool = False, max_length: Optional[int] = None) -> str:
    """
    Sanitize user input to prevent XSS and other injection attacks.

    Args:
        text: The input text to sanitize
        allow_html: If False, escape all HTML entities (default: False)
        max_length: Maximum allowed length (optional)

    Returns:
        Sanitized string
    """
    if not text:
        return text

    # Strip leading/trailing whitespace
    text = text.strip()

    # Remove null bytes
    text = text.replace('\x00', '')

    # Escape HTML if not allowed
    if not allow_html:
        text = html.escape(text)

    # Truncate if max_length specified
    if max_length and len(text) > max_length:
        text = text[:max_length]

    return text


def remove_script_tags(html_content: str) -> str:
    """Remove script tags and event handlers from HTML content"""
    if not html_content:
        return html_content

    # Remove script tags
    html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)

    # Remove on* event handlers
    html_content = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', '', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'\s+on\w+\s*=\s*[^\s>]+', '', html_content, flags=re.IGNORECASE)

    # Remove javascript: URLs
    html_content = re.sub(r'javascript\s*:', '', html_content, flags=re.IGNORECASE)

    return html_content

def slugify(text: str) -> str:
    """Convert text to slug format"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')

def generate_ticket_number(prefix: str, sequence: int) -> str:
    """Generate ticket number with prefix"""
    return f"{prefix}-{sequence:06d}"

def calculate_sla_deadline(
    start_time: datetime,
    sla_hours: int,
    business_hours_only: bool = True,
    timezone: str = "UTC"
) -> datetime:
    """Calculate SLA deadline based on business hours or 24/7"""
    tz = pytz.timezone(timezone)
    current = start_time.astimezone(tz)
    
    if not business_hours_only:
        return current + timedelta(hours=sla_hours)
    
    # Business hours: 9 AM to 6 PM, Monday to Friday
    remaining_hours = sla_hours
    
    while remaining_hours > 0:
        # Skip weekends
        if current.weekday() >= 5:  # Saturday = 5, Sunday = 6
            current = current + timedelta(days=1)
            current = current.replace(hour=9, minute=0, second=0)
            continue
        
        # If before business hours, move to 9 AM
        if current.hour < 9:
            current = current.replace(hour=9, minute=0, second=0)
        
        # If after business hours, move to next day 9 AM
        if current.hour >= 18:
            current = current + timedelta(days=1)
            current = current.replace(hour=9, minute=0, second=0)
            continue
        
        # Calculate hours until end of business day
        end_of_day = current.replace(hour=18, minute=0, second=0)
        hours_until_eod = (end_of_day - current).total_seconds() / 3600
        
        if remaining_hours <= hours_until_eod:
            current = current + timedelta(hours=remaining_hours)
            remaining_hours = 0
        else:
            remaining_hours -= hours_until_eod
            current = current + timedelta(days=1)
            current = current.replace(hour=9, minute=0, second=0)
    
    return current

def format_phone_number(phone: str) -> Optional[str]:
    """Format phone number"""
    if not phone:
        return None
    
    # Remove all non-numeric characters
    digits = re.sub(r'\D', '', phone)
    
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11:
        return f"+{digits[0]} ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    
    return phone

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional, Tuple
from zoneinfo import ZoneInfo
from app.models.ticket import Ticket
from app.models.sla_policy import SLAPolicy
from app.models.sla_pause import SLAPause
from app.models.user import User


def get_local_timezone():
    """Get the local system timezone"""
    try:
        # Try to get local timezone
        import time
        if time.daylight:
            offset = -time.altzone
        else:
            offset = -time.timezone
        hours = offset // 3600
        # Return a timezone that matches the local offset
        # Common timezones by offset (adjust as needed)
        if hours == 5 or hours == 6:  # IST/PKT
            return ZoneInfo("Asia/Karachi")
        elif hours == -5:
            return ZoneInfo("America/New_York")
        elif hours == -8:
            return ZoneInfo("America/Los_Angeles")
        elif hours == 0:
            return ZoneInfo("UTC")
        else:
            return ZoneInfo("UTC")
    except Exception:
        return ZoneInfo("UTC")


# Get the local timezone once at module load
LOCAL_TZ = get_local_timezone()


def now_local():
    """Get current time in local timezone"""
    return datetime.now(LOCAL_TZ)


def now_utc():
    """Get current time in UTC"""
    return datetime.now(ZoneInfo("UTC"))


def to_local(dt: datetime) -> datetime:
    """Convert datetime to local timezone"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume UTC if naive
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(LOCAL_TZ)


def to_utc(dt: datetime) -> datetime:
    """Convert datetime to UTC"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume local if naive
        dt = dt.replace(tzinfo=LOCAL_TZ)
    return dt.astimezone(ZoneInfo("UTC"))


def get_business_hours_from_settings(db: Session) -> Tuple[int, int, list]:
    """
    Get business hours configuration from system settings.
    Returns: (start_hour, end_hour, working_days_indices)
    """
    from app.models.system_settings import SystemSettings

    # Defaults (matching database migration defaults: 09:00 - 18:00, Mon-Fri)
    start_hour = 9
    end_hour = 18
    working_days = [0, 1, 2, 3, 4]  # Mon-Fri

    try:
        # Get business hours start
        start_setting = db.query(SystemSettings).filter(
            SystemSettings.key == 'business_hours_start'
        ).first()
        if start_setting and start_setting.value:
            try:
                parts = start_setting.value.split(':')
                start_hour = int(parts[0])
            except (ValueError, IndexError):
                pass

        # Get business hours end
        end_setting = db.query(SystemSettings).filter(
            SystemSettings.key == 'business_hours_end'
        ).first()
        if end_setting and end_setting.value:
            try:
                parts = end_setting.value.split(':')
                end_hour = int(parts[0])
            except (ValueError, IndexError):
                pass

        # Get working days
        days_setting = db.query(SystemSettings).filter(
            SystemSettings.key == 'working_days'
        ).first()
        if days_setting and days_setting.value:
            day_map = {'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6}
            days_str = days_setting.value.lower().split(',')
            working_days = [day_map.get(d.strip()[:3], -1) for d in days_str]
            working_days = [d for d in working_days if d >= 0]
            if not working_days:
                working_days = [0, 1, 2, 3, 4]  # Default to Mon-Fri
    except Exception:
        # If anything fails, use defaults
        pass

    return (start_hour, end_hour, working_days)


class SLAService:
    @staticmethod
    def calculate_sla_times(ticket: Ticket, db: Session):
        """Calculate SLA response and resolution due times based on the applicable policy"""
        sla_policy = SLAService.get_applicable_sla(ticket, db)
        if not sla_policy:
            return

        # Get priority as string (handle both enum and string values)
        priority_str = ticket.priority.value if hasattr(ticket.priority, 'value') else str(ticket.priority)

        # Check if there are priority-specific times
        if sla_policy.priority_times and priority_str in sla_policy.priority_times:
            priority_config = sla_policy.priority_times[priority_str]
            response_time = priority_config.get('response', sla_policy.response_time)
            resolution_time = priority_config.get('resolution', sla_policy.resolution_time)
        else:
            response_time = sla_policy.response_time
            resolution_time = sla_policy.resolution_time

        # Use local time for calculations
        now = now_local()

        if sla_policy.business_hours_only:
            ticket.response_due = SLAService.add_business_minutes(now, response_time, db)
            ticket.resolution_due = SLAService.add_business_minutes(now, resolution_time, db)
        else:
            # For 24/7 SLA, just add minutes directly
            ticket.response_due = now + timedelta(minutes=response_time)
            ticket.resolution_due = now + timedelta(minutes=resolution_time)

        ticket.sla_policy_id = sla_policy.id

        # Reset breach flags when recalculating
        ticket.response_breached = False
        ticket.resolution_breached = False

    @staticmethod
    def get_applicable_sla(ticket: Ticket, db: Session) -> Optional[SLAPolicy]:
        """Find the most appropriate SLA policy for a ticket"""
        # If ticket already has an assigned SLA policy, use that
        if ticket.sla_policy_id:
            policy = db.query(SLAPolicy).filter(
                SLAPolicy.id == ticket.sla_policy_id,
                SLAPolicy.is_active == True
            ).first()
            if policy:
                return policy

        # Otherwise, find matching policy based on conditions
        policies = db.query(SLAPolicy).filter(SLAPolicy.is_active == True).all()

        for policy in policies:
            if SLAService.matches_conditions(ticket, policy):
                return policy

        # Fall back to default policy
        return db.query(SLAPolicy).filter(
            SLAPolicy.is_active == True,
            SLAPolicy.is_default == True
        ).first()

    @staticmethod
    def matches_conditions(ticket: Ticket, policy: SLAPolicy) -> bool:
        """Check if a ticket matches the conditions of a policy"""
        if not policy.conditions:
            return True

        conditions = policy.conditions

        # Get priority as string for comparison
        priority_str = ticket.priority.value if hasattr(ticket.priority, 'value') else str(ticket.priority)

        if 'priority' in conditions and priority_str not in conditions['priority']:
            return False

        if 'category_id' in conditions and ticket.category_id not in conditions['category_id']:
            return False

        return True

    @staticmethod
    def add_business_minutes(start_time: datetime, minutes: int, db: Session = None,
                             start_hour: int = None, end_hour: int = None,
                             working_days: list = None) -> datetime:
        """
        Add business minutes to a start time based on configured business hours.

        Args:
            start_time: The starting datetime
            minutes: Number of business minutes to add
            db: Database session (optional, used to fetch settings if hours not provided)
            start_hour: Business hours start (optional, default 9)
            end_hour: Business hours end (optional, default 17)
            working_days: List of working day indices (0=Mon, 6=Sun) (optional, default Mon-Fri)
        """
        current_time = start_time
        remaining_minutes = minutes

        # Ensure we're working with timezone-aware datetime
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=LOCAL_TZ)

        # Get business hours from settings if not provided
        if start_hour is None or end_hour is None or working_days is None:
            if db is not None:
                settings_start, settings_end, settings_days = get_business_hours_from_settings(db)
                start_hour = start_hour if start_hour is not None else settings_start
                end_hour = end_hour if end_hour is not None else settings_end
                working_days = working_days if working_days is not None else settings_days
            else:
                # Defaults if no db session (matching database migration defaults: 09:00 - 18:00, Mon-Fri)
                start_hour = start_hour if start_hour is not None else 9
                end_hour = end_hour if end_hour is not None else 18
                working_days = working_days if working_days is not None else [0, 1, 2, 3, 4]

        while remaining_minutes > 0:
            # Skip non-working days
            while current_time.weekday() not in working_days:
                current_time = current_time.replace(hour=start_hour, minute=0, second=0, microsecond=0) + timedelta(days=1)

            # If before business hours, move to start of business day
            if current_time.hour < start_hour:
                current_time = current_time.replace(hour=start_hour, minute=0, second=0, microsecond=0)

            # If after business hours, move to start of next business day
            if current_time.hour >= end_hour:
                current_time = current_time.replace(hour=start_hour, minute=0, second=0, microsecond=0) + timedelta(days=1)
                continue

            # Calculate minutes until end of business day
            end_of_day = current_time.replace(hour=end_hour, minute=0, second=0, microsecond=0)
            minutes_until_eod = int((end_of_day - current_time).total_seconds() / 60)

            if remaining_minutes <= minutes_until_eod:
                current_time += timedelta(minutes=remaining_minutes)
                remaining_minutes = 0
            else:
                remaining_minutes -= minutes_until_eod
                current_time = current_time.replace(hour=start_hour, minute=0, second=0, microsecond=0) + timedelta(days=1)

        return current_time

    @staticmethod
    def pause_sla(ticket_id: int, reason: str, user: User, db: Session) -> SLAPause:
        """Pause SLA timer for a ticket"""
        from app.models.ticket_activity import TicketActivity

        # Check for active pause
        active_pause = db.query(SLAPause).filter(
            SLAPause.ticket_id == ticket_id,
            SLAPause.is_active == True
        ).first()

        if active_pause:
            raise ValueError("SLA is already paused for this ticket")

        pause = SLAPause(
            ticket_id=ticket_id,
            paused_by_id=user.id,
            reason=reason,
            paused_at=now_local(),
            is_active=True
        )

        db.add(pause)
        db.flush()

        # Create activity log
        activity = TicketActivity(
            ticket_id=ticket_id,
            user_id=user.id,
            activity_type="sla_paused",
            description=f"SLA paused by {user.full_name}: {reason}"
        )
        db.add(activity)

        db.commit()
        db.refresh(pause)
        return pause

    @staticmethod
    def resume_sla(ticket_id: int, user: User, db: Session) -> SLAPause:
        """Resume SLA timer for a ticket"""
        from app.models.ticket_activity import TicketActivity

        active_pause = db.query(SLAPause).filter(
            SLAPause.ticket_id == ticket_id,
            SLAPause.is_active == True
        ).first()

        if not active_pause:
            raise ValueError("No active SLA pause found for this ticket")

        now = now_local()

        # Ensure paused_at is timezone-aware for comparison
        paused_at = active_pause.paused_at
        if paused_at.tzinfo is None:
            paused_at = paused_at.replace(tzinfo=LOCAL_TZ)

        pause_duration = int((now - paused_at).total_seconds() / 60)

        active_pause.resumed_at = now
        active_pause.resumed_by_id = user.id
        active_pause.pause_duration = pause_duration
        active_pause.is_active = False

        # Extend SLA due times by pause duration
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if ticket.response_due and not ticket.response_breached:
            ticket.response_due += timedelta(minutes=pause_duration)
        if ticket.resolution_due and not ticket.resolution_breached:
            ticket.resolution_due += timedelta(minutes=pause_duration)

        # Create activity log
        activity = TicketActivity(
            ticket_id=ticket_id,
            user_id=user.id,
            activity_type="sla_resumed",
            description=f"SLA resumed by {user.full_name} (paused for {pause_duration} minutes)"
        )
        db.add(activity)

        db.commit()
        db.refresh(active_pause)
        return active_pause

    @staticmethod
    def get_time_remaining(ticket: Ticket, db: Session) -> dict:
        """Calculate time remaining for response and resolution SLAs"""
        # Get total pause time (in minutes)
        total_pause_time = db.query(func.sum(SLAPause.pause_duration)).filter(
            SLAPause.ticket_id == ticket.id,
            SLAPause.is_active == False
        ).scalar() or 0

        # Check if SLA is currently paused
        is_paused = db.query(SLAPause).filter(
            SLAPause.ticket_id == ticket.id,
            SLAPause.is_active == True
        ).first() is not None

        now = now_local()

        result = {
            'is_paused': is_paused,
            'total_pause_time': total_pause_time,
            'response': None,
            'resolution': None,
            'first_response_at': ticket.first_response_at.isoformat() if ticket.first_response_at else None,
        }

        # Check response SLA - if first_response_at is set, response SLA is met
        if ticket.response_due:
            response_due = ticket.response_due
            if response_due.tzinfo is None:
                response_due = response_due.replace(tzinfo=LOCAL_TZ)
            else:
                response_due = to_local(response_due)

            # If first response was made, check if it was within SLA
            if ticket.first_response_at:
                first_response = ticket.first_response_at
                if first_response.tzinfo is None:
                    first_response = first_response.replace(tzinfo=LOCAL_TZ)
                else:
                    first_response = to_local(first_response)

                is_breached = first_response > response_due
                if is_breached and not ticket.response_breached:
                    ticket.response_breached = True
                    db.commit()

                result['response'] = {
                    'due': response_due.isoformat(),
                    'remaining_minutes': 0,
                    'is_breached': is_breached,
                    'responded_at': first_response.isoformat(),
                    'is_met': not is_breached,
                }
            elif not ticket.response_breached:
                # No response yet, calculate remaining time
                time_diff = (response_due - now).total_seconds() / 60
                is_breached = time_diff < 0

                if is_breached and not ticket.response_breached:
                    ticket.response_breached = True
                    db.commit()

                result['response'] = {
                    'due': response_due.isoformat(),
                    'remaining_minutes': max(0, int(time_diff)),
                    'is_breached': is_breached,
                    'responded_at': None,
                    'is_met': False,
                }
            else:
                result['response'] = {
                    'due': response_due.isoformat(),
                    'remaining_minutes': 0,
                    'is_breached': True,
                    'responded_at': None,
                    'is_met': False,
                }

        if ticket.resolution_due and not ticket.resolution_breached:
            # Make resolution_due timezone-aware if it isn't
            resolution_due = ticket.resolution_due
            if resolution_due.tzinfo is None:
                resolution_due = resolution_due.replace(tzinfo=LOCAL_TZ)
            else:
                resolution_due = to_local(resolution_due)

            time_diff = (resolution_due - now).total_seconds() / 60
            is_breached = time_diff < 0

            # Update breach flag if breached
            if is_breached and not ticket.resolution_breached:
                ticket.resolution_breached = True
                db.commit()

            result['resolution'] = {
                'due': resolution_due.isoformat(),
                'remaining_minutes': max(0, int(time_diff)),
                'is_breached': is_breached,
            }

        return result

    @staticmethod
    def check_and_update_breaches(db: Session):
        """Background task to check and update SLA breaches for all open tickets"""
        from app.models.ticket import TicketStatus

        now = now_local()

        # Get all open tickets with SLA times set
        open_statuses = [
            TicketStatus.NEW.value,
            TicketStatus.OPEN.value,
            TicketStatus.IN_PROGRESS.value,
            TicketStatus.PENDING.value
        ]

        tickets = db.query(Ticket).filter(
            Ticket.status.in_(open_statuses)
        ).all()

        breaches_updated = 0
        for ticket in tickets:
            # Check response breach
            if ticket.response_due and not ticket.response_breached:
                response_due = ticket.response_due
                if response_due.tzinfo is None:
                    response_due = response_due.replace(tzinfo=LOCAL_TZ)

                # If first response was made, check if it was within SLA
                if ticket.first_response_at:
                    first_response = ticket.first_response_at
                    if first_response.tzinfo is None:
                        first_response = first_response.replace(tzinfo=LOCAL_TZ)
                    if first_response > response_due:
                        ticket.response_breached = True
                        breaches_updated += 1
                elif now > response_due:
                    # No response yet and due time passed
                    ticket.response_breached = True
                    breaches_updated += 1

            # Check resolution breach
            if ticket.resolution_due and not ticket.resolution_breached:
                resolution_due = ticket.resolution_due
                if resolution_due.tzinfo is None:
                    resolution_due = resolution_due.replace(tzinfo=LOCAL_TZ)
                if now > resolution_due:
                    ticket.resolution_breached = True
                    breaches_updated += 1

        if breaches_updated > 0:
            db.commit()

        return breaches_updated

    @staticmethod
    def get_sla_metrics(db: Session, start_date: datetime = None, end_date: datetime = None) -> dict:
        """Get SLA metrics for reporting"""
        from app.models.ticket import TicketStatus

        query = db.query(Ticket)

        if start_date:
            query = query.filter(Ticket.created_at >= start_date)
        if end_date:
            query = query.filter(Ticket.created_at <= end_date)

        tickets = query.all()

        total = len(tickets)
        response_met = sum(1 for t in tickets if t.response_due and not t.response_breached)
        response_breached = sum(1 for t in tickets if t.response_breached)
        resolution_met = sum(1 for t in tickets if t.resolution_due and not t.resolution_breached)
        resolution_breached = sum(1 for t in tickets if t.resolution_breached)

        # Calculate at-risk tickets (80% of SLA time used, consistent with reporting service)
        now = now_local()
        at_risk = 0
        for ticket in tickets:
            # Check resolution SLA at-risk status (most important for at-risk calculation)
            if ticket.resolution_due and not ticket.resolution_breached:
                resolution_due = ticket.resolution_due
                created_at = ticket.created_at
                if resolution_due.tzinfo is None:
                    resolution_due = resolution_due.replace(tzinfo=LOCAL_TZ)
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=LOCAL_TZ)

                time_remaining = resolution_due - now
                total_sla_time = resolution_due - created_at
                if total_sla_time.total_seconds() > 0:
                    time_used_ratio = 1 - (time_remaining.total_seconds() / total_sla_time.total_seconds())
                    # At risk if 80% or more of SLA time used but not yet breached
                    if time_used_ratio >= 0.8 and time_remaining.total_seconds() > 0:
                        at_risk += 1

        return {
            'total_tickets': total,
            'response_met': response_met,
            'response_breached': response_breached,
            'resolution_met': resolution_met,
            'resolution_breached': resolution_breached,
            'at_risk_count': at_risk,
            'response_compliance': (response_met / max(1, response_met + response_breached)) * 100,
            'resolution_compliance': (resolution_met / max(1, resolution_met + resolution_breached)) * 100,
        }

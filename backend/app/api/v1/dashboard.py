from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from datetime import datetime, timedelta
import logging
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.ticket_activity import TicketActivity
from app.models.change import ChangeActivity
from app.models.problem import ProblemActivity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def is_end_user(user: User) -> bool:
    """Check if user is an end user (not staff)"""
    if user.is_superuser:
        return False
    if not user.role:
        return True
    role_name = user.role.name.lower().replace(' ', '_').replace('-', '_')
    staff_roles = ['admin', 'system_administrator', 'manager', 'it_manager',
                   'team_lead', 'agent', 'support_agent']
    return role_name not in staff_roles


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""

    # Check if user is end user - filter to only their tickets
    end_user = is_end_user(current_user)

    # Base query for end users
    def base_query():
        q = db.query(Ticket)
        if end_user:
            q = q.filter(Ticket.requester_id == current_user.id)
        return q

    # Total tickets
    total_tickets = base_query().count()

    # Open tickets (NEW, OPEN, IN_PROGRESS)
    open_tickets = base_query().filter(
        Ticket.status.in_([
            TicketStatus.NEW.value,
            TicketStatus.OPEN.value,
            TicketStatus.IN_PROGRESS.value
        ])
    ).count()

    # My assigned tickets (for agents) / My submitted tickets (for end users)
    if end_user:
        my_tickets = base_query().filter(
            Ticket.status != TicketStatus.CLOSED.value
        ).count()
    else:
        my_tickets = db.query(Ticket).filter(
            Ticket.assignee_id == current_user.id,
            Ticket.status != TicketStatus.CLOSED.value
        ).count()

    # Unassigned tickets (only for staff)
    unassigned = 0
    if not end_user:
        unassigned = db.query(Ticket).filter(
            Ticket.assignee_id == None,
            Ticket.status != TicketStatus.CLOSED.value
        ).count()

    # SLA breached tickets
    sla_breached = base_query().filter(
        and_(
            Ticket.resolution_breached == True,
            Ticket.status != TicketStatus.CLOSED.value
        )
    ).count()

    # Critical tickets
    critical_tickets = base_query().filter(
        Ticket.priority == TicketPriority.CRITICAL.value,
        Ticket.status != TicketStatus.CLOSED.value
    ).count()

    # Resolved today
    today = datetime.now().date()
    resolved_today = base_query().filter(
        func.date(Ticket.resolved_at) == today
    ).count()

    # Pending tickets
    pending_tickets = base_query().filter(
        Ticket.status == TicketStatus.PENDING.value
    ).count()

    # Closed tickets (for end users to see their resolved issues)
    closed_tickets = base_query().filter(
        Ticket.status.in_([TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value])
    ).count()

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "my_tickets": my_tickets,
        "unassigned": unassigned,
        "sla_breached": sla_breached,
        "critical_tickets": critical_tickets,
        "resolved_today": resolved_today,
        "pending_tickets": pending_tickets,
        "closed_tickets": closed_tickets,
        "is_end_user": end_user
    }

@router.get("/tickets-by-status")
async def get_tickets_by_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket counts by status"""
    status_counts = db.query(
        Ticket.status,
        func.count(Ticket.id).label('count')
    ).group_by(Ticket.status).all()

    return [
        {
            "status": status.value.replace('_', ' ').title() if hasattr(status, 'value') else str(status).replace('_', ' ').title(),
            "value": count,  # Frontend expects 'value' for pie charts
            "count": count
        }
        for status, count in status_counts
    ]

@router.get("/tickets-by-priority")
async def get_tickets_by_priority(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket count by priority"""
    
    priority_counts = db.query(
        Ticket.priority,
        func.count(Ticket.id).label('count')
    ).filter(
        Ticket.status != TicketStatus.CLOSED.value
    ).group_by(Ticket.priority).all()
    
    return [
        {
            "priority": priority,
            "count": count,
            "value": count
        }
        for priority, count in priority_counts
    ]

@router.get("/ticket-trends")
async def get_ticket_trends(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket trends for the last N days"""
    
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days-1)
    
    # Generate all dates in range
    date_range = []
    current_date = start_date
    while current_date <= end_date:
        date_range.append(current_date)
        current_date += timedelta(days=1)
    
    # Get created tickets per day
    created_counts = db.query(
        func.date(Ticket.created_at).label('date'),
        func.count(Ticket.id).label('count')
    ).filter(
        func.date(Ticket.created_at) >= start_date
    ).group_by(func.date(Ticket.created_at)).all()
    
    # Get resolved tickets per day
    resolved_counts = db.query(
        func.date(Ticket.resolved_at).label('date'),
        func.count(Ticket.id).label('count')
    ).filter(
        func.date(Ticket.resolved_at) >= start_date
    ).group_by(func.date(Ticket.resolved_at)).all()
    
    # Convert to dict for easy lookup
    created_dict = {date: count for date, count in created_counts}
    resolved_dict = {date: count for date, count in resolved_counts}
    
    # Build result
    result = []
    for date in date_range:
        result.append({
            "date": date.strftime("%b %d"),
            "created": created_dict.get(date, 0),
            "resolved": resolved_dict.get(date, 0)
        })
    
    return result

@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activities from tickets, changes, and problems"""

    all_activities = []

    # Get ticket activities
    try:
        ticket_activities = db.query(TicketActivity).order_by(
            TicketActivity.created_at.desc()
        ).limit(limit).all()

        for activity in ticket_activities:
            ticket_number = "Unknown"
            user_name = "System"
            try:
                if activity.ticket:
                    ticket_number = activity.ticket.ticket_number
                if activity.user:
                    user_name = activity.user.full_name
            except:
                pass

            all_activities.append({
                "id": f"ticket_{activity.id}",
                "entity_type": "incident",
                "entity_number": ticket_number,
                "entity_id": activity.ticket_id,
                "activity_type": activity.activity_type,
                "description": activity.description or "",
                "user_name": user_name,
                "created_at": activity.created_at,
                "ticket_number": ticket_number,
                "ticket_id": activity.ticket_id,
            })
    except Exception as e:
        logger.error(f"Error fetching ticket activities: {e}")

    # Get change activities
    try:
        change_activities = db.query(ChangeActivity).order_by(
            ChangeActivity.created_at.desc()
        ).limit(limit).all()

        for activity in change_activities:
            change_number = "Unknown"
            user_name = "System"
            try:
                if activity.change:
                    change_number = activity.change.change_number
                if activity.user:
                    user_name = activity.user.full_name
            except:
                pass

            all_activities.append({
                "id": f"change_{activity.id}",
                "entity_type": "change",
                "entity_number": change_number,
                "entity_id": activity.change_id,
                "activity_type": activity.activity_type,
                "description": activity.description or "",
                "user_name": user_name,
                "created_at": activity.created_at,
            })
    except Exception as e:
        logger.error(f"Error fetching change activities: {e}")

    # Get problem activities
    try:
        problem_activities = db.query(ProblemActivity).order_by(
            ProblemActivity.created_at.desc()
        ).limit(limit).all()

        for activity in problem_activities:
            problem_number = "Unknown"
            user_name = "System"
            try:
                if activity.problem:
                    problem_number = activity.problem.problem_number
                if activity.user:
                    user_name = activity.user.full_name
            except:
                pass

            all_activities.append({
                "id": f"problem_{activity.id}",
                "entity_type": "problem",
                "entity_number": problem_number,
                "entity_id": activity.problem_id,
                "activity_type": activity.activity_type,
                "description": activity.description or "",
                "user_name": user_name,
                "created_at": activity.created_at,
            })
    except Exception as e:
        logger.error(f"Error fetching problem activities: {e}")

    # Sort all activities by created_at descending and limit
    # Convert all datetimes to UTC for proper comparison
    def get_sort_key(activity):
        dt = activity["created_at"]
        if dt is None:
            return datetime.min
        # If timezone-aware, convert to UTC then remove tzinfo
        if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
            from datetime import timezone
            # Convert to UTC
            utc_dt = dt.astimezone(timezone.utc)
            return utc_dt.replace(tzinfo=None)
        # Naive datetimes are assumed to be UTC already
        return dt

    all_activities.sort(key=get_sort_key, reverse=True)

    return all_activities[:limit]

@router.get("/top-categories")
async def get_top_categories(
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top categories by ticket count"""

    from app.models.category import Category

    category_counts = db.query(
        Category.name,
        func.count(Ticket.id).label('count')
    ).join(Ticket).filter(
        Ticket.status != TicketStatus.CLOSED.value
    ).group_by(Category.id, Category.name).order_by(
        func.count(Ticket.id).desc()
    ).limit(limit).all()

    return [
        {
            "category": name,
            "count": count,
            "value": count
        }
        for name, count in category_counts
    ]


@router.get("/sla-performance")
async def get_sla_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SLA performance metrics"""

    # Total tickets with SLA
    total_with_sla = db.query(Ticket).filter(
        Ticket.sla_policy_id != None
    ).count()

    # Response SLA met
    response_met = db.query(Ticket).filter(
        Ticket.sla_policy_id != None,
        Ticket.response_breached == False
    ).count()

    # Resolution SLA met
    resolution_met = db.query(Ticket).filter(
        Ticket.sla_policy_id != None,
        Ticket.resolution_breached == False
    ).count()

    # Calculate percentages
    response_rate = round((response_met / total_with_sla * 100), 1) if total_with_sla > 0 else 100
    resolution_rate = round((resolution_met / total_with_sla * 100), 1) if total_with_sla > 0 else 100

    return {
        "total_tickets": total_with_sla,
        "response_sla_met": response_met,
        "resolution_sla_met": resolution_met,
        "response_rate": response_rate,
        "resolution_rate": resolution_rate,
        "overall_rate": round((response_rate + resolution_rate) / 2, 1)
    }


@router.get("/agent-performance")
async def get_agent_performance(
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top performing agents"""

    # Get agents with most resolved tickets this month
    from datetime import date
    first_day_of_month = date.today().replace(day=1)

    agent_stats = db.query(
        User.full_name,
        func.count(Ticket.id).label('resolved_count')
    ).join(Ticket, User.id == Ticket.assignee_id).filter(
        Ticket.status == TicketStatus.RESOLVED.value,
        func.date(Ticket.resolved_at) >= first_day_of_month
    ).group_by(User.id, User.full_name).order_by(
        func.count(Ticket.id).desc()
    ).limit(limit).all()

    return [
        {
            "name": name,
            "resolved": count,
            "value": count
        }
        for name, count in agent_stats
    ]


@router.get("/hourly-distribution")
async def get_hourly_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket creation distribution by hour"""

    from sqlalchemy import extract

    hourly_counts = db.query(
        extract('hour', Ticket.created_at).label('hour'),
        func.count(Ticket.id).label('count')
    ).group_by(extract('hour', Ticket.created_at)).order_by('hour').all()

    # Fill in missing hours with 0
    hour_dict = {int(hour): count for hour, count in hourly_counts}

    return [
        {
            "hour": f"{h:02d}:00",
            "tickets": hour_dict.get(h, 0)
        }
        for h in range(24)
    ]


@router.get("/weekly-comparison")
async def get_weekly_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compare this week vs last week"""

    today = datetime.now().date()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(days=1)

    # This week tickets
    this_week_created = db.query(Ticket).filter(
        func.date(Ticket.created_at) >= this_week_start
    ).count()

    this_week_resolved = db.query(Ticket).filter(
        func.date(Ticket.resolved_at) >= this_week_start
    ).count()

    # Last week tickets
    last_week_created = db.query(Ticket).filter(
        func.date(Ticket.created_at) >= last_week_start,
        func.date(Ticket.created_at) <= last_week_end
    ).count()

    last_week_resolved = db.query(Ticket).filter(
        func.date(Ticket.resolved_at) >= last_week_start,
        func.date(Ticket.resolved_at) <= last_week_end
    ).count()

    # Calculate trends
    created_trend = round(((this_week_created - last_week_created) / max(last_week_created, 1)) * 100, 1)
    resolved_trend = round(((this_week_resolved - last_week_resolved) / max(last_week_resolved, 1)) * 100, 1)

    return {
        "this_week": {
            "created": this_week_created,
            "resolved": this_week_resolved
        },
        "last_week": {
            "created": last_week_created,
            "resolved": last_week_resolved
        },
        "trends": {
            "created": created_trend,
            "resolved": resolved_trend
        }
    }


@router.get("/avg-resolution-time")
async def get_avg_resolution_time(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get average resolution time by priority"""

    from sqlalchemy import extract

    # Get resolved tickets with resolution time
    resolved_tickets = db.query(
        Ticket.priority,
        func.avg(
            extract('epoch', Ticket.resolved_at) - extract('epoch', Ticket.created_at)
        ).label('avg_seconds')
    ).filter(
        Ticket.resolved_at != None
    ).group_by(Ticket.priority).all()

    priority_order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    result = []

    for priority, avg_seconds in resolved_tickets:
        if avg_seconds:
            hours = round(avg_seconds / 3600, 1)
            result.append({
                "priority": priority,
                "hours": hours,
                "value": hours
            })

    # Sort by priority order
    result.sort(key=lambda x: priority_order.index(x['priority']) if x['priority'] in priority_order else 99)

    return result
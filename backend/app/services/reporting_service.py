from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict

from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.user import User
from app.models.category import Category
from app.models.sla_policy import SLAPolicy
from app.services.sla_service import now_local, LOCAL_TZ


class ReportingService:
    """Service for generating reports and analytics"""

    def __init__(self, db: Session):
        self.db = db

    # ============================================================================
    # SLA COMPLIANCE DASHBOARD
    # ============================================================================

    def get_sla_compliance_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        priority: Optional[str] = None,
        category_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive SLA compliance metrics

        Returns:
            overall_compliance: Percentage of tickets meeting SLA
            response_compliance: First response time compliance
            resolution_compliance: Resolution time compliance
            by_priority: Breakdown by priority
            by_category: Breakdown by category
            trend_data: 7-day trend
            at_risk_count: Tickets approaching breach
            breached_count: Currently breached tickets
        """
        # Build base query - SLA compliance is tracked for INCIDENT tickets only
        # Service Requests, Problems, and Changes have different SLA handling
        query = self.db.query(Ticket).filter(Ticket.ticket_type == "INCIDENT")

        # Apply filters
        if start_date:
            query = query.filter(Ticket.created_at >= start_date)
        if end_date:
            query = query.filter(Ticket.created_at <= end_date)
        if priority:
            query = query.filter(Ticket.priority == priority)
        if category_id:
            query = query.filter(Ticket.category_id == category_id)

        tickets = query.all()

        # Calculate metrics
        total_tickets = len(tickets)
        if total_tickets == 0:
            return self._empty_sla_metrics()

        # Response time compliance
        response_met = 0
        response_breached = 0
        resolution_met = 0
        resolution_breached = 0
        at_risk_count = 0

        for ticket in tickets:
            # Check response SLA based on first_response_at
            if ticket.response_due:
                if ticket.first_response_at:
                    # Response was made - check if within SLA
                    first_response = ticket.first_response_at
                    response_due = ticket.response_due
                    if first_response.tzinfo is None:
                        first_response = first_response.replace(tzinfo=LOCAL_TZ)
                    if response_due.tzinfo is None:
                        response_due = response_due.replace(tzinfo=LOCAL_TZ)

                    if first_response <= response_due:
                        response_met += 1
                    else:
                        response_breached += 1
                elif ticket.response_breached:
                    response_breached += 1
                elif ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
                    # Ticket resolved/closed without first response tracking - count as met if not breached
                    response_met += 1
                else:
                    # Ticket still open, check if due date passed
                    response_due = ticket.response_due
                    if response_due.tzinfo is None:
                        response_due = response_due.replace(tzinfo=LOCAL_TZ)
                    if now_local() > response_due:
                        response_breached += 1
                    else:
                        response_met += 1  # Still within time

            # Check resolution SLA
            if ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
                if ticket.resolved_at and ticket.resolution_due:
                    resolved_at = ticket.resolved_at
                    resolution_due = ticket.resolution_due
                    if resolved_at.tzinfo is None:
                        resolved_at = resolved_at.replace(tzinfo=LOCAL_TZ)
                    if resolution_due.tzinfo is None:
                        resolution_due = resolution_due.replace(tzinfo=LOCAL_TZ)

                    if resolved_at <= resolution_due:
                        resolution_met += 1
                    else:
                        resolution_breached += 1
            elif ticket.resolution_breached:
                resolution_breached += 1

            # Check at-risk tickets (80% of SLA time used but not yet breached)
            if ticket.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
                if ticket.resolution_due and not ticket.resolution_breached:
                    resolution_due = ticket.resolution_due
                    created_at = ticket.created_at
                    if resolution_due.tzinfo is None:
                        resolution_due = resolution_due.replace(tzinfo=LOCAL_TZ)
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=LOCAL_TZ)

                    time_remaining = resolution_due - now_local()
                    total_sla_time = resolution_due - created_at
                    if total_sla_time.total_seconds() > 0 and time_remaining.total_seconds() > 0:
                        time_used_ratio = 1 - (time_remaining.total_seconds() / total_sla_time.total_seconds())
                        # At risk if 80% or more used but still has time remaining (not breached)
                        if time_used_ratio >= 0.8:
                            at_risk_count += 1

        # Calculate percentages
        response_compliance = (
            (response_met / (response_met + response_breached) * 100)
            if (response_met + response_breached) > 0 else 0
        )
        resolution_compliance = (
            (resolution_met / (resolution_met + resolution_breached) * 100)
            if (resolution_met + resolution_breached) > 0 else 0
        )
        overall_compliance = (response_compliance + resolution_compliance) / 2

        # Breakdown by priority
        by_priority = self._calculate_sla_by_priority(tickets)

        # Breakdown by category
        by_category = self._calculate_sla_by_category(tickets)

        # 7-day trend
        trend_data = self._calculate_sla_trend(start_date or now_local() - timedelta(days=7))

        return {
            "overall_compliance": round(overall_compliance, 2),
            "response_compliance": round(response_compliance, 2),
            "resolution_compliance": round(resolution_compliance, 2),
            "total_tickets": total_tickets,
            "response_met": response_met,
            "response_breached": response_breached,
            "resolution_met": resolution_met,
            "resolution_breached": resolution_breached,
            "at_risk_count": at_risk_count,
            "breached_count": response_breached + resolution_breached,
            "by_priority": by_priority,
            "by_category": by_category,
            "trend_data": trend_data
        }

    def _calculate_sla_by_priority(self, tickets: List[Ticket]) -> List[Dict]:
        """Calculate SLA compliance by priority"""
        priorities = defaultdict(lambda: {"met": 0, "breached": 0, "total": 0})

        for ticket in tickets:
            priority = ticket.priority.value if ticket.priority else "MEDIUM"
            priorities[priority]["total"] += 1

            if ticket.resolved_at and ticket.resolution_due:
                if ticket.resolved_at <= ticket.resolution_due:
                    priorities[priority]["met"] += 1
                else:
                    priorities[priority]["breached"] += 1

        result = []
        for priority, stats in priorities.items():
            compliance = (
                (stats["met"] / (stats["met"] + stats["breached"]) * 100)
                if (stats["met"] + stats["breached"]) > 0 else 0
            )
            result.append({
                "priority": priority,
                "total": stats["total"],
                "met": stats["met"],
                "breached": stats["breached"],
                "compliance": round(compliance, 2)
            })

        return sorted(result, key=lambda x: x["priority"])

    def _calculate_sla_by_category(self, tickets: List[Ticket]) -> List[Dict]:
        """Calculate SLA compliance by category"""
        categories = defaultdict(lambda: {"met": 0, "breached": 0, "total": 0, "name": ""})

        for ticket in tickets:
            cat_id = ticket.category_id or 0
            cat_name = ticket.category.name if ticket.category else "Uncategorized"
            categories[cat_id]["name"] = cat_name
            categories[cat_id]["total"] += 1

            if ticket.resolved_at and ticket.resolution_due:
                if ticket.resolved_at <= ticket.resolution_due:
                    categories[cat_id]["met"] += 1
                else:
                    categories[cat_id]["breached"] += 1

        result = []
        for cat_id, stats in categories.items():
            compliance = (
                (stats["met"] / (stats["met"] + stats["breached"]) * 100)
                if (stats["met"] + stats["breached"]) > 0 else 0
            )
            result.append({
                "category_id": cat_id,
                "category_name": stats["name"],
                "total": stats["total"],
                "met": stats["met"],
                "breached": stats["breached"],
                "compliance": round(compliance, 2)
            })

        return sorted(result, key=lambda x: x["total"], reverse=True)[:10]  # Top 10

    def _calculate_sla_trend(self, start_date: datetime) -> List[Dict]:
        """Calculate 7-day SLA compliance trend"""
        trend = []
        for i in range(7):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)

            tickets = self.db.query(Ticket).filter(
                and_(
                    Ticket.created_at >= day_start,
                    Ticket.created_at < day_end,
                    Ticket.ticket_type == "INCIDENT"
                )
            ).all()

            met = sum(1 for t in tickets if t.resolved_at and t.resolution_due
                     and t.resolved_at <= t.resolution_due)
            breached = sum(1 for t in tickets if t.resolved_at and t.resolution_due
                          and t.resolved_at > t.resolution_due)

            compliance = (met / (met + breached) * 100) if (met + breached) > 0 else 0

            trend.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "compliance": round(compliance, 2),
                "met": met,
                "breached": breached,
                "total": len(tickets)
            })

        return trend

    def _empty_sla_metrics(self) -> Dict[str, Any]:
        """Return empty metrics structure"""
        return {
            "overall_compliance": 0,
            "response_compliance": 0,
            "resolution_compliance": 0,
            "total_tickets": 0,
            "response_met": 0,
            "response_breached": 0,
            "resolution_met": 0,
            "resolution_breached": 0,
            "at_risk_count": 0,
            "breached_count": 0,
            "by_priority": [],
            "by_category": [],
            "trend_data": []
        }

    # ============================================================================
    # TICKET AGING REPORT
    # ============================================================================

    def get_ticket_aging_report(
        self,
        status_filter: Optional[List[str]] = None,
        priority_filter: Optional[str] = None,
        assignee_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate ticket aging report

        Returns aging buckets:
        - 0-24 hours
        - 1-3 days
        - 3-7 days
        - 7-14 days
        - 14-30 days
        - 30+ days
        """
        query = self.db.query(Ticket).filter(
            Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED])
        )

        if status_filter:
            query = query.filter(Ticket.status.in_(status_filter))
        if priority_filter:
            query = query.filter(Ticket.priority == priority_filter)
        if assignee_id:
            query = query.filter(Ticket.assignee_id == assignee_id)

        tickets = query.all()

        # Define aging buckets
        buckets = {
            "0-24h": [],
            "1-3d": [],
            "3-7d": [],
            "7-14d": [],
            "14-30d": [],
            "30d+": []
        }

        now = now_local()

        for ticket in tickets:
            # Handle timezone-aware comparison
            created_at = ticket.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=LOCAL_TZ)
            age = now - created_at
            age_hours = age.total_seconds() / 3600

            if age_hours <= 24:
                buckets["0-24h"].append(self._ticket_summary(ticket, age))
            elif age_hours <= 72:
                buckets["1-3d"].append(self._ticket_summary(ticket, age))
            elif age_hours <= 168:
                buckets["3-7d"].append(self._ticket_summary(ticket, age))
            elif age_hours <= 336:
                buckets["7-14d"].append(self._ticket_summary(ticket, age))
            elif age_hours <= 720:
                buckets["14-30d"].append(self._ticket_summary(ticket, age))
            else:
                buckets["30d+"].append(self._ticket_summary(ticket, age))

        return {
            "total_open_tickets": len(tickets),
            "buckets": {
                "0-24h": {"count": len(buckets["0-24h"]), "tickets": buckets["0-24h"][:10]},
                "1-3d": {"count": len(buckets["1-3d"]), "tickets": buckets["1-3d"][:10]},
                "3-7d": {"count": len(buckets["3-7d"]), "tickets": buckets["3-7d"][:10]},
                "7-14d": {"count": len(buckets["7-14d"]), "tickets": buckets["7-14d"][:10]},
                "14-30d": {"count": len(buckets["14-30d"]), "tickets": buckets["14-30d"][:10]},
                "30d+": {"count": len(buckets["30d+"]), "tickets": buckets["30d+"][:10]},
            },
            "summary": {
                "0-24h": len(buckets["0-24h"]),
                "1-3d": len(buckets["1-3d"]),
                "3-7d": len(buckets["3-7d"]),
                "7-14d": len(buckets["7-14d"]),
                "14-30d": len(buckets["14-30d"]),
                "30d+": len(buckets["30d+"])
            }
        }

    def _ticket_summary(self, ticket: Ticket, age: timedelta) -> Dict:
        """Create ticket summary for reports"""
        return {
            "id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "priority": ticket.priority.value if ticket.priority else None,
            "status": ticket.status.value if ticket.status else None,
            "assignee_name": ticket.assignee.full_name if ticket.assignee else "Unassigned",
            "created_at": ticket.created_at.isoformat(),
            "age_days": age.days,
            "age_hours": int(age.total_seconds() / 3600)
        }

    # ============================================================================
    # TECHNICIAN PERFORMANCE METRICS
    # ============================================================================

    def get_technician_performance(
        self,
        start_date: datetime,
        end_date: datetime,
        user_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate technician performance report

        Metrics per technician:
        - Total tickets handled
        - Resolved tickets
        - Average resolution time
        - Average first response time
        - SLA compliance rate
        - Customer satisfaction (if available)
        """
        query = self.db.query(User).filter(User.is_active == True)

        if user_id:
            query = query.filter(User.id == user_id)

        users = query.all()
        performance_data = []

        for user in users:
            # Get tickets assigned to this user
            tickets = self.db.query(Ticket).filter(
                and_(
                    Ticket.assignee_id == user.id,
                    Ticket.created_at >= start_date,
                    Ticket.created_at <= end_date
                )
            ).all()

            if not tickets:
                continue

            total_tickets = len(tickets)
            resolved_tickets = [t for t in tickets if t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]]

            # Calculate average resolution time
            resolution_times = [
                (t.resolved_at - t.created_at).total_seconds() / 3600
                for t in resolved_tickets if t.resolved_at
            ]
            avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0

            # Calculate average first response time using first_response_at
            response_times = [
                (t.first_response_at - t.created_at).total_seconds() / 3600
                for t in tickets if t.first_response_at
            ]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0

            # Calculate SLA compliance
            sla_met = sum(
                1 for t in resolved_tickets
                if t.resolved_at and t.resolution_due and t.resolved_at <= t.resolution_due
            )
            sla_compliance = (sla_met / len(resolved_tickets) * 100) if resolved_tickets else 0

            performance_data.append({
                "user_id": user.id,
                "user_name": user.full_name,
                "email": user.email,
                "total_tickets": total_tickets,
                "resolved_tickets": len(resolved_tickets),
                "resolution_rate": round((len(resolved_tickets) / total_tickets * 100), 2) if total_tickets > 0 else 0,
                "avg_resolution_time_hours": round(avg_resolution_time, 2),
                "avg_response_time_hours": round(avg_response_time, 2),
                "sla_compliance": round(sla_compliance, 2),
                "open_tickets": total_tickets - len(resolved_tickets)
            })

        return sorted(performance_data, key=lambda x: x["total_tickets"], reverse=True)

    # ============================================================================
    # RESPONSE TIME TRENDS
    # ============================================================================

    def get_response_time_trends(
        self,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "daily"  # daily, weekly, monthly
    ) -> List[Dict[str, Any]]:
        """
        Get first response time trends over time using first_response_at field
        """
        tickets = self.db.query(Ticket).filter(
            and_(
                Ticket.created_at >= start_date,
                Ticket.created_at <= end_date,
                Ticket.first_response_at.isnot(None)
            )
        ).all()

        # Group by time period
        response_data = defaultdict(list)

        for ticket in tickets:
            if granularity == "daily":
                period = ticket.created_at.strftime("%Y-%m-%d")
            elif granularity == "weekly":
                period = ticket.created_at.strftime("%Y-W%U")
            else:  # monthly
                period = ticket.created_at.strftime("%Y-%m")

            # Calculate response time in hours
            created_at = ticket.created_at
            first_response = ticket.first_response_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=LOCAL_TZ)
            if first_response.tzinfo is None:
                first_response = first_response.replace(tzinfo=LOCAL_TZ)

            response_time = (first_response - created_at).total_seconds() / 3600
            response_data[period].append(response_time)

        # Calculate statistics
        trend_data = []
        for period in sorted(response_data.keys()):
            times = response_data[period]
            trend_data.append({
                "period": period,
                "avg_response_time_hours": round(sum(times) / len(times), 2),
                "min_response_time_hours": round(min(times), 2),
                "max_response_time_hours": round(max(times), 2),
                "ticket_count": len(times)
            })

        return trend_data

    # ============================================================================
    # RESOLUTION TIME ANALYSIS
    # ============================================================================

    def get_resolution_time_analysis(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "priority"  # priority, category, assignee
    ) -> List[Dict[str, Any]]:
        """
        Analyze resolution times grouped by different criteria
        """
        tickets = self.db.query(Ticket).filter(
            and_(
                Ticket.created_at >= start_date,
                Ticket.created_at <= end_date,
                Ticket.resolved_at.isnot(None),
                Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
            )
        ).all()

        grouped_data = defaultdict(list)

        for ticket in tickets:
            resolution_time = (ticket.resolved_at - ticket.created_at).total_seconds() / 3600

            if group_by == "priority":
                group_key = ticket.priority.value if ticket.priority else "NONE"
            elif group_by == "category":
                group_key = ticket.category.name if ticket.category else "Uncategorized"
            elif group_by == "assignee":
                group_key = ticket.assignee.full_name if ticket.assignee else "Unassigned"
            else:
                group_key = "All"

            grouped_data[group_key].append(resolution_time)

        # Calculate statistics
        analysis_data = []
        for group_key, times in grouped_data.items():
            analysis_data.append({
                "group": group_key,
                "avg_resolution_time_hours": round(sum(times) / len(times), 2),
                "min_resolution_time_hours": round(min(times), 2),
                "max_resolution_time_hours": round(max(times), 2),
                "median_resolution_time_hours": round(sorted(times)[len(times) // 2], 2),
                "ticket_count": len(times)
            })

        return sorted(analysis_data, key=lambda x: x["avg_resolution_time_hours"])

    # ============================================================================
    # TICKET VOLUME TRENDS
    # ============================================================================

    def get_ticket_volume_trends(
        self,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Get ticket volume trends with breakdown by status, priority, category
        """
        tickets = self.db.query(Ticket).filter(
            and_(
                Ticket.created_at >= start_date,
                Ticket.created_at <= end_date
            )
        ).all()

        # Group by time period
        volume_data = defaultdict(lambda: {
            "created": 0,
            "resolved": 0,
            "by_priority": defaultdict(int),
            "by_status": defaultdict(int),
            "by_type": defaultdict(int)
        })

        for ticket in tickets:
            if granularity == "daily":
                period = ticket.created_at.strftime("%Y-%m-%d")
            elif granularity == "weekly":
                period = ticket.created_at.strftime("%Y-W%U")
            else:  # monthly
                period = ticket.created_at.strftime("%Y-%m")

            volume_data[period]["created"] += 1
            volume_data[period]["by_priority"][ticket.priority.value if ticket.priority else "NONE"] += 1
            volume_data[period]["by_status"][ticket.status.value if ticket.status else "NONE"] += 1
            volume_data[period]["by_type"][ticket.ticket_type or "NONE"] += 1

            if ticket.resolved_at:
                if granularity == "daily":
                    resolved_period = ticket.resolved_at.strftime("%Y-%m-%d")
                elif granularity == "weekly":
                    resolved_period = ticket.resolved_at.strftime("%Y-W%U")
                else:
                    resolved_period = ticket.resolved_at.strftime("%Y-%m")
                volume_data[resolved_period]["resolved"] += 1

        # Convert to list
        trend_data = []
        for period in sorted(volume_data.keys()):
            data = volume_data[period]
            trend_data.append({
                "period": period,
                "created": data["created"],
                "resolved": data["resolved"],
                "by_priority": dict(data["by_priority"]),
                "by_status": dict(data["by_status"]),
                "by_type": dict(data["by_type"])
            })

        return {
            "trend_data": trend_data,
            "total_created": sum(t["created"] for t in trend_data),
            "total_resolved": sum(t["resolved"] for t in trend_data),
            "summary": {
                "avg_daily_volume": round(sum(t["created"] for t in trend_data) / len(trend_data), 2) if trend_data else 0
            }
        }

    # ============================================================================
    # CATEGORY-WISE BREAKDOWN
    # ============================================================================

    def get_category_breakdown(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Get ticket breakdown by category with performance metrics
        """
        categories = self.db.query(Category).filter(Category.is_active == True).all()
        breakdown_data = []

        for category in categories:
            tickets = self.db.query(Ticket).filter(
                and_(
                    Ticket.category_id == category.id,
                    Ticket.created_at >= start_date,
                    Ticket.created_at <= end_date
                )
            ).all()

            if not tickets:
                continue

            resolved = [t for t in tickets if t.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]]

            # Calculate average resolution time
            resolution_times = [
                (t.resolved_at - t.created_at).total_seconds() / 3600
                for t in resolved if t.resolved_at
            ]
            avg_resolution = sum(resolution_times) / len(resolution_times) if resolution_times else 0

            # SLA compliance
            sla_met = sum(
                1 for t in resolved
                if t.resolved_at and t.resolution_due and t.resolved_at <= t.resolution_due
            )
            sla_compliance = (sla_met / len(resolved) * 100) if resolved else 0

            breakdown_data.append({
                "category_id": category.id,
                "category_name": category.name,
                "total_tickets": len(tickets),
                "resolved_tickets": len(resolved),
                "open_tickets": len(tickets) - len(resolved),
                "resolution_rate": round((len(resolved) / len(tickets) * 100), 2),
                "avg_resolution_time_hours": round(avg_resolution, 2),
                "sla_compliance": round(sla_compliance, 2)
            })

        return sorted(breakdown_data, key=lambda x: x["total_tickets"], reverse=True)

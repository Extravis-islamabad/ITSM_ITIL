from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import os
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_teamlead_or_above, require_manager_or_above
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus, TicketPriority
from app.models.category import Category
from app.services.reporting_service import ReportingService
from app.services.export_service import ExportService
from app.schemas.reporting import (
    SLAComplianceRequest, SLAComplianceResponse,
    TicketAgingRequest, TicketAgingResponse,
    TechnicianPerformanceRequest, TechnicianPerformance,
    ResponseTimeTrendsRequest, ResponseTimeTrend,
    ResolutionTimeAnalysisRequest, ResolutionTimeAnalysis,
    TicketVolumeTrendsRequest, TicketVolumeResponse,
    CategoryBreakdownRequest, CategoryBreakdown,
    ExportReportRequest, ExportResponse
)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(require_teamlead_or_above())]  # All report endpoints require Team Lead+
)

@router.get("/ticket-volume")
async def get_ticket_volume_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = Query("day", regex="^(day|week|month)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket volume report"""
    
    # Default to last 30 days if no dates provided
    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    
    # Query tickets in date range
    query = db.query(
        func.date(Ticket.created_at).label('date'),
        func.count(Ticket.id).label('created'),
        func.count(case((Ticket.status == TicketStatus.RESOLVED.value, 1))).label('resolved'),
        func.count(case((Ticket.status == TicketStatus.CLOSED.value, 1))).label('closed')
    ).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).group_by(func.date(Ticket.created_at)).order_by(func.date(Ticket.created_at))
    
    results = query.all()
    
    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "data": [
            {
                "date": r.date.strftime("%Y-%m-%d"),
                "created": r.created,
                "resolved": r.resolved,
                "closed": r.closed
            }
            for r in results
        ]
    }

@router.get("/agent-performance")
async def get_agent_performance_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Get agent performance report (Manager+ only)"""

    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    
    # Get tickets per agent
    agent_stats = db.query(
        User.id,
        User.full_name,
        func.count(Ticket.id).label('total_assigned'),
        func.count(case((Ticket.status == TicketStatus.RESOLVED.value, 1))).label('resolved'),
        func.count(case((Ticket.status == TicketStatus.CLOSED.value, 1))).label('closed'),
        func.count(case((Ticket.resolution_breached == True, 1))).label('sla_breached'),
        func.avg(
            case(
                (Ticket.resolved_at.isnot(None),
                 func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600)
            )
        ).label('avg_resolution_hours')
    ).join(Ticket, User.id == Ticket.assignee_id).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).group_by(User.id, User.full_name).all()
    
    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "agents": [
            {
                "agent_id": stat.id,
                "agent_name": stat.full_name,
                "total_assigned": stat.total_assigned,
                "resolved": stat.resolved,
                "closed": stat.closed,
                "sla_breached": stat.sla_breached,
                "avg_resolution_hours": round(stat.avg_resolution_hours, 2) if stat.avg_resolution_hours else 0,
                "resolution_rate": round((stat.resolved / stat.total_assigned * 100), 2) if stat.total_assigned > 0 else 0,
                "sla_compliance": round(((stat.total_assigned - stat.sla_breached) / stat.total_assigned * 100), 2) if stat.total_assigned > 0 else 100
            }
            for stat in agent_stats
        ]
    }

@router.get("/sla-compliance")
async def get_sla_compliance_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SLA compliance report"""

    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    
    # Overall SLA stats
    total_tickets = db.query(Ticket).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).count()
    
    response_breached = db.query(Ticket).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end,
            Ticket.response_breached == True
        )
    ).count()
    
    resolution_breached = db.query(Ticket).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end,
            Ticket.resolution_breached == True
        )
    ).count()
    
    # By priority
    priority_stats = db.query(
        Ticket.priority,
        func.count(Ticket.id).label('total'),
        func.count(case((Ticket.resolution_breached == True, 1))).label('breached')
    ).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).group_by(Ticket.priority).all()
    
    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "overall": {
            "total_tickets": total_tickets,
            "response_breached": response_breached,
            "resolution_breached": resolution_breached,
            "response_compliance": round((total_tickets - response_breached) / total_tickets * 100, 2) if total_tickets > 0 else 100,
            "resolution_compliance": round((total_tickets - resolution_breached) / total_tickets * 100, 2) if total_tickets > 0 else 100
        },
        "by_priority": [
            {
                "priority": stat.priority,
                "total": stat.total,
                "breached": stat.breached,
                "compliance": round((stat.total - stat.breached) / stat.total * 100, 2) if stat.total > 0 else 100
            }
            for stat in priority_stats
        ]
    }

@router.get("/category-analysis")
async def get_category_analysis_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get category analysis report"""

    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    
    category_stats = db.query(
        Category.name,
        func.count(Ticket.id).label('total'),
        func.avg(
            case(
                (Ticket.resolved_at.isnot(None),
                 func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600)
            )
        ).label('avg_resolution_hours')
    ).join(Ticket).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).group_by(Category.id, Category.name).order_by(func.count(Ticket.id).desc()).all()
    
    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "categories": [
            {
                "category": stat.name,
                "total": stat.total,
                "avg_resolution_hours": round(stat.avg_resolution_hours, 2) if stat.avg_resolution_hours else 0
            }
            for stat in category_stats
        ]
    }

@router.get("/summary")
async def get_reports_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall reports summary"""

    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    
    total_tickets = db.query(Ticket).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).count()
    
    resolved_tickets = db.query(Ticket).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end,
            Ticket.status == TicketStatus.RESOLVED.value
        )
    ).count()
    
    avg_resolution = db.query(
        func.avg(
            case(
                (Ticket.resolved_at.isnot(None),
                 func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600)
            )
        )
    ).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end,
            Ticket.resolved_at.isnot(None)
        )
    ).scalar()
    
    sla_breached = db.query(Ticket).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end,
            Ticket.resolution_breached == True
        )
    ).count()
    
    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "total_tickets": total_tickets,
        "resolved_tickets": resolved_tickets,
        "avg_resolution_hours": round(avg_resolution, 2) if avg_resolution else 0,
        "sla_breached": sla_breached,
        "resolution_rate": round(resolved_tickets / total_tickets * 100, 2) if total_tickets > 0 else 0,
        "sla_compliance": round((total_tickets - sla_breached) / total_tickets * 100, 2) if total_tickets > 0 else 100
    }


# ============================================================================
# ADVANCED REPORTING ENDPOINTS
# ============================================================================

@router.post("/sla-compliance", response_model=SLAComplianceResponse)
async def get_comprehensive_sla_compliance(
    request: SLAComplianceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive SLA compliance metrics

    Returns:
    - Overall compliance percentages
    - Response and resolution compliance
    - Breakdown by priority
    - Breakdown by category
    - 7-day trend data
    - At-risk and breached ticket counts
    """
    reporting_service = ReportingService(db)

    # Parse date strings to timezone-aware datetime objects
    start_date = None
    end_date = None
    if request.start_date:
        start_date = datetime.strptime(request.start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    if request.end_date:
        end_date = datetime.strptime(request.end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    metrics = reporting_service.get_sla_compliance_metrics(
        start_date=start_date,
        end_date=end_date,
        priority=request.priority,
        category_id=request.category_id
    )
    return metrics


@router.post("/ticket-aging", response_model=TicketAgingResponse)
async def get_ticket_aging(
    request: TicketAgingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get ticket aging report with buckets:
    - 0-24 hours
    - 1-3 days
    - 3-7 days
    - 7-14 days
    - 14-30 days
    - 30+ days
    """
    reporting_service = ReportingService(db)
    aging_data = reporting_service.get_ticket_aging_report(
        status_filter=request.status_filter,
        priority_filter=request.priority_filter,
        assignee_id=request.assignee_id
    )
    return aging_data


@router.post("/technician-performance", response_model=List[TechnicianPerformance])
async def get_technician_performance(
    request: TechnicianPerformanceRequest,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """
    Get technician performance metrics (Manager+ only):
    - Total tickets handled
    - Resolved tickets
    - Average resolution time
    - Average first response time
    - SLA compliance rate
    - Open tickets count
    """
    reporting_service = ReportingService(db)

    # Parse date strings to timezone-aware datetime objects
    start_date = datetime.strptime(request.start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_date = datetime.strptime(request.end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    performance_data = reporting_service.get_technician_performance(
        start_date=start_date,
        end_date=end_date,
        user_id=request.user_id
    )
    return performance_data


@router.post("/response-time-trends", response_model=List[ResponseTimeTrend])
async def get_response_time_trends(
    request: ResponseTimeTrendsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get first response time trends over time

    Supports daily, weekly, or monthly granularity
    """
    reporting_service = ReportingService(db)

    # Parse date strings to timezone-aware datetime objects
    start_date = datetime.strptime(request.start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_date = datetime.strptime(request.end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    trend_data = reporting_service.get_response_time_trends(
        start_date=start_date,
        end_date=end_date,
        granularity=request.granularity.value
    )
    return trend_data


@router.post("/resolution-time-analysis", response_model=List[ResolutionTimeAnalysis])
async def get_resolution_time_analysis(
    request: ResolutionTimeAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze resolution times grouped by:
    - Priority
    - Category
    - Assignee

    Returns average, min, max, and median resolution times
    """
    reporting_service = ReportingService(db)

    # Parse date strings to timezone-aware datetime objects
    start_date = datetime.strptime(request.start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_date = datetime.strptime(request.end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    analysis_data = reporting_service.get_resolution_time_analysis(
        start_date=start_date,
        end_date=end_date,
        group_by=request.group_by.value
    )
    return analysis_data


@router.post("/ticket-volume-trends", response_model=TicketVolumeResponse)
async def get_ticket_volume_trends(
    request: TicketVolumeTrendsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get ticket volume trends with breakdown by:
    - Status
    - Priority
    - Type

    Supports daily, weekly, or monthly granularity
    """
    reporting_service = ReportingService(db)

    # Parse date strings to timezone-aware datetime objects
    start_date = datetime.strptime(request.start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_date = datetime.strptime(request.end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    volume_data = reporting_service.get_ticket_volume_trends(
        start_date=start_date,
        end_date=end_date,
        granularity=request.granularity.value
    )
    return volume_data


@router.post("/category-breakdown", response_model=List[CategoryBreakdown])
async def get_category_breakdown(
    request: CategoryBreakdownRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get category-wise ticket breakdown with:
    - Total tickets per category
    - Resolution rates
    - Average resolution times
    - SLA compliance per category
    """
    reporting_service = ReportingService(db)

    # Parse date strings to timezone-aware datetime objects
    start_date = datetime.strptime(request.start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end_date = datetime.strptime(request.end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    breakdown_data = reporting_service.get_category_breakdown(
        start_date=start_date,
        end_date=end_date
    )
    return breakdown_data


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse date string to datetime"""
    if not date_str:
        return None
    try:
        # Try ISO format first
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        try:
            # Try simple date format
            return datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            return None


@router.post("/export")
async def export_report(
    request: ExportReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export any report to PDF, Excel, or CSV format

    Supports all report types with custom filters
    """
    try:
        reporting_service = ReportingService(db)
        export_service = ExportService(db)

        # Parse dates with defaults (last 30 days)
        start_dt = parse_date(request.start_date)
        end_dt = parse_date(request.end_date)

        # Default to last 30 days if no dates provided
        if not start_dt:
            start_dt = datetime.now(timezone.utc) - timedelta(days=30)
        if not end_dt:
            end_dt = datetime.now(timezone.utc)

        # Generate report data based on type
        if request.report_type == "sla_compliance":
            data = reporting_service.get_sla_compliance_metrics(
                start_date=start_dt,
                end_date=end_dt,
                priority=request.filters.get("priority") if request.filters else None,
                category_id=request.filters.get("category_id") if request.filters else None
            )
        elif request.report_type == "ticket_aging":
            data = reporting_service.get_ticket_aging_report(
                status_filter=request.filters.get("status_filter") if request.filters else None,
                priority_filter=request.filters.get("priority_filter") if request.filters else None,
                assignee_id=request.filters.get("assignee_id") if request.filters else None
            )
        elif request.report_type == "technician_performance":
            data = reporting_service.get_technician_performance(
                start_date=start_dt,
                end_date=end_dt,
                user_id=request.filters.get("user_id") if request.filters else None
            )
        elif request.report_type == "ticket_volume":
            data = reporting_service.get_ticket_volume_trends(
                start_date=start_dt,
                end_date=end_dt,
                granularity=request.filters.get("granularity", "daily") if request.filters else "daily"
            )
        elif request.report_type == "category_breakdown":
            data = reporting_service.get_category_breakdown(
                start_date=start_dt,
                end_date=end_dt
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported report type: {request.report_type}")

        # Export based on format
        if request.format == "excel":
            file_path = export_service.export_to_excel(
                data=data,
                report_name=request.report_type,
                sheet_name="Report"
            )
        elif request.format == "pdf":
            file_path = export_service.export_to_pdf(
                data=data,
                report_name=request.report_type,
                title=f"{request.report_type.replace('_', ' ').title()} Report"
            )
        elif request.format == "csv":
            file_path = export_service.export_to_csv(
                data=data,
                report_name=request.report_type
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported export format: {request.format}")

        # Extract filename from path (works on both Windows and Unix)
        file_name = os.path.basename(file_path) if file_path else None

        return ExportResponse(
            success=True,
            file_path=file_path,
            file_name=file_name,
            download_url=f"/reports/download/{file_name}" if file_name else None,
            message="Report exported successfully"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting report: {str(e)}")


@router.get("/download/{filename}")
async def download_report(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """
    Download an exported report file
    """
    export_dir = "exports/reports"
    filepath = os.path.join(export_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    # Determine media type based on file extension
    if filename.endswith('.pdf'):
        media_type = 'application/pdf'
    elif filename.endswith('.xlsx'):
        media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif filename.endswith('.csv'):
        media_type = 'text/csv'
    else:
        media_type = 'application/octet-stream'

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type=media_type
    )


@router.get("/sla/by-customer")
async def get_sla_by_customer(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get SLA compliance metrics grouped by customer (requester).
    Shows compliance percentage, breached count, and total tickets per customer.
    """
    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    # Query SLA metrics by customer (requester)
    customer_stats = db.query(
        User.id.label('customer_id'),
        User.full_name.label('customer_name'),
        User.email.label('customer_email'),
        func.count(Ticket.id).label('total_tickets'),
        func.sum(case((Ticket.resolution_breached == True, 1), else_=0)).label('resolution_breached'),
        func.sum(case((Ticket.response_breached == True, 1), else_=0)).label('response_breached'),
        func.avg(
            case(
                (Ticket.resolved_at.isnot(None),
                 func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600)
            )
        ).label('avg_resolution_hours')
    ).join(Ticket, User.id == Ticket.requester_id).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).group_by(User.id, User.full_name, User.email).order_by(
        func.count(Ticket.id).desc()
    ).limit(limit).all()

    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "customers": [
            {
                "customer_id": stat.customer_id,
                "customer_name": stat.customer_name,
                "customer_email": stat.customer_email,
                "total_tickets": stat.total_tickets,
                "resolution_breached": stat.resolution_breached or 0,
                "response_breached": stat.response_breached or 0,
                "resolution_compliance": round(
                    ((stat.total_tickets - (stat.resolution_breached or 0)) / stat.total_tickets * 100), 2
                ) if stat.total_tickets > 0 else 100,
                "response_compliance": round(
                    ((stat.total_tickets - (stat.response_breached or 0)) / stat.total_tickets * 100), 2
                ) if stat.total_tickets > 0 else 100,
                "avg_resolution_hours": round(stat.avg_resolution_hours, 2) if stat.avg_resolution_hours else 0
            }
            for stat in customer_stats
        ]
    }


@router.get("/sla/by-project")
async def get_sla_by_project(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get SLA compliance metrics grouped by project (category).
    Shows compliance percentage, breached count, and total tickets per project/category.
    """
    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    # Query SLA metrics by project (category)
    project_stats = db.query(
        Category.id.label('project_id'),
        Category.name.label('project_name'),
        Category.description.label('project_description'),
        func.count(Ticket.id).label('total_tickets'),
        func.sum(case((Ticket.resolution_breached == True, 1), else_=0)).label('resolution_breached'),
        func.sum(case((Ticket.response_breached == True, 1), else_=0)).label('response_breached'),
        func.avg(
            case(
                (Ticket.resolved_at.isnot(None),
                 func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600)
            )
        ).label('avg_resolution_hours'),
        func.avg(
            case(
                (Ticket.first_response_at.isnot(None),
                 func.extract('epoch', Ticket.first_response_at - Ticket.created_at) / 60)
            )
        ).label('avg_response_minutes')
    ).join(Ticket, Category.id == Ticket.category_id).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).group_by(Category.id, Category.name, Category.description).order_by(
        func.count(Ticket.id).desc()
    ).all()

    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "projects": [
            {
                "project_id": stat.project_id,
                "project_name": stat.project_name,
                "project_description": stat.project_description,
                "total_tickets": stat.total_tickets,
                "resolution_breached": stat.resolution_breached or 0,
                "response_breached": stat.response_breached or 0,
                "resolution_compliance": round(
                    ((stat.total_tickets - (stat.resolution_breached or 0)) / stat.total_tickets * 100), 2
                ) if stat.total_tickets > 0 else 100,
                "response_compliance": round(
                    ((stat.total_tickets - (stat.response_breached or 0)) / stat.total_tickets * 100), 2
                ) if stat.total_tickets > 0 else 100,
                "avg_resolution_hours": round(stat.avg_resolution_hours, 2) if stat.avg_resolution_hours else 0,
                "avg_response_minutes": round(stat.avg_response_minutes, 2) if stat.avg_response_minutes else 0
            }
            for stat in project_stats
        ]
    }


@router.get("/sla/by-percentage")
async def get_sla_by_percentage(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed SLA compliance percentages with breakdowns.
    Shows overall, by priority, by category, and trend data.
    """
    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    if not end_date:
        end = datetime.now(timezone.utc)
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    # Overall SLA metrics
    overall = db.query(
        func.count(Ticket.id).label('total'),
        func.sum(case((Ticket.resolution_breached == True, 1), else_=0)).label('resolution_breached'),
        func.sum(case((Ticket.response_breached == True, 1), else_=0)).label('response_breached')
    ).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).first()

    total_tickets = overall.total or 0
    resolution_breached = overall.resolution_breached or 0
    response_breached = overall.response_breached or 0

    # By priority
    priority_stats = db.query(
        Ticket.priority,
        func.count(Ticket.id).label('total'),
        func.sum(case((Ticket.resolution_breached == True, 1), else_=0)).label('resolution_breached'),
        func.sum(case((Ticket.response_breached == True, 1), else_=0)).label('response_breached')
    ).filter(
        and_(
            Ticket.created_at >= start,
            Ticket.created_at <= end
        )
    ).group_by(Ticket.priority).all()

    # Weekly trend (last 8 weeks)
    trends = []
    for i in range(8, 0, -1):
        week_end = datetime.now(timezone.utc) - timedelta(weeks=i-1)
        week_start = week_end - timedelta(weeks=1)

        week_stats = db.query(
            func.count(Ticket.id).label('total'),
            func.sum(case((Ticket.resolution_breached == True, 1), else_=0)).label('breached')
        ).filter(
            and_(
                Ticket.created_at >= week_start,
                Ticket.created_at < week_end
            )
        ).first()

        week_total = week_stats.total or 0
        week_breached = week_stats.breached or 0
        compliance = round(((week_total - week_breached) / week_total * 100), 2) if week_total > 0 else 100

        trends.append({
            "week_start": week_start.strftime("%Y-%m-%d"),
            "week_end": week_end.strftime("%Y-%m-%d"),
            "total_tickets": week_total,
            "breached": week_breached,
            "compliance_percentage": compliance
        })

    return {
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "overall": {
            "total_tickets": total_tickets,
            "resolution_breached": resolution_breached,
            "response_breached": response_breached,
            "resolution_compliance_percentage": round(
                ((total_tickets - resolution_breached) / total_tickets * 100), 2
            ) if total_tickets > 0 else 100,
            "response_compliance_percentage": round(
                ((total_tickets - response_breached) / total_tickets * 100), 2
            ) if total_tickets > 0 else 100,
            "overall_compliance_percentage": round(
                ((total_tickets - max(resolution_breached, response_breached)) / total_tickets * 100), 2
            ) if total_tickets > 0 else 100
        },
        "by_priority": [
            {
                "priority": str(stat.priority).replace('TicketPriority.', ''),
                "total_tickets": stat.total,
                "resolution_breached": stat.resolution_breached or 0,
                "response_breached": stat.response_breached or 0,
                "resolution_compliance_percentage": round(
                    ((stat.total - (stat.resolution_breached or 0)) / stat.total * 100), 2
                ) if stat.total > 0 else 100,
                "response_compliance_percentage": round(
                    ((stat.total - (stat.response_breached or 0)) / stat.total * 100), 2
                ) if stat.total > 0 else 100
            }
            for stat in priority_stats
        ],
        "weekly_trend": trends
    }


@router.get("/kpis/current")
async def get_current_kpis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time KPI metrics for dashboard widgets:
    - SLA compliance (last 30 days)
    - Average response time (last 7 days)
    - Average resolution time (last 7 days)
    - Ticket volume (today vs yesterday)
    - At-risk tickets count
    - Technician workload
    """
    reporting_service = ReportingService(db)

    # SLA compliance (last 30 days)
    sla_metrics = reporting_service.get_sla_compliance_metrics(
        start_date=datetime.now(timezone.utc) - timedelta(days=30),
        end_date=datetime.now(timezone.utc)
    )

    # Response time trends (last 7 days)
    response_trends = reporting_service.get_response_time_trends(
        start_date=datetime.now(timezone.utc) - timedelta(days=7),
        end_date=datetime.now(timezone.utc),
        granularity="daily"
    )
    avg_response_time = (
        sum(t["avg_response_time_hours"] for t in response_trends) / len(response_trends)
        if response_trends else 0
    )

    # Resolution time (last 7 days)
    resolution_analysis = reporting_service.get_resolution_time_analysis(
        start_date=datetime.now(timezone.utc) - timedelta(days=7),
        end_date=datetime.now(timezone.utc),
        group_by="priority"
    )
    avg_resolution_time = (
        sum(a["avg_resolution_time_hours"] for a in resolution_analysis) / len(resolution_analysis)
        if resolution_analysis else 0
    )

    # Ticket volume (today)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = db.query(Ticket).filter(Ticket.created_at >= today_start).count()

    # Yesterday's count
    yesterday_start = today_start - timedelta(days=1)
    yesterday_count = db.query(Ticket).filter(
        and_(
            Ticket.created_at >= yesterday_start,
            Ticket.created_at < today_start
        )
    ).count()

    # Open tickets by assignee (top 10 busiest)
    technician_workload = db.query(
        User.id,
        User.full_name,
        func.count(Ticket.id).label('open_tickets')
    ).join(Ticket, User.id == Ticket.assignee_id).filter(
        Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).group_by(User.id, User.full_name).order_by(
        func.count(Ticket.id).desc()
    ).limit(10).all()

    return {
        "sla_compliance": {
            "overall": sla_metrics["overall_compliance"],
            "response": sla_metrics["response_compliance"],
            "resolution": sla_metrics["resolution_compliance"],
            "at_risk_count": sla_metrics["at_risk_count"],
            "breached_count": sla_metrics["breached_count"]
        },
        "response_time": {
            "avg_hours": round(avg_response_time, 2),
            "trend": "up" if len(response_trends) > 1 and response_trends[-1]["avg_response_time_hours"] > response_trends[-2]["avg_response_time_hours"] else "down"
        },
        "resolution_time": {
            "avg_hours": round(avg_resolution_time, 2)
        },
        "ticket_volume": {
            "today": today_count,
            "yesterday": yesterday_count,
            "change": today_count - yesterday_count,
            "change_percent": round((today_count - yesterday_count) / yesterday_count * 100, 2) if yesterday_count > 0 else 0
        },
        "technician_workload": [
            {
                "user_id": tech.id,
                "name": tech.full_name,
                "open_tickets": tech.open_tickets
            }
            for tech in technician_workload
        ]
    }
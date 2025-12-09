from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager_or_above
from app.models.user import User
from app.services.scheduled_report_service import ScheduledReportService
from app.schemas.scheduled_report import (
    ScheduledReportCreate,
    ScheduledReportUpdate,
    ScheduledReportResponse,
    ReportExecutionResponse,
    ManualReportExecuteRequest
)

router = APIRouter(
    prefix="/scheduled-reports",
    tags=["Scheduled Reports"]
)


@router.get("", response_model=List[ScheduledReportResponse])
async def get_scheduled_reports(
    is_active: Optional[bool] = None,
    my_reports_only: bool = False,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Get all scheduled reports (Manager+ only)"""
    created_by_id = current_user.id if my_reports_only else None

    reports = ScheduledReportService.get_scheduled_reports(
        db,
        created_by_id=created_by_id,
        is_active=is_active
    )

    return [
        ScheduledReportResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            report_type=r.report_type.value,
            frequency=r.frequency.value,
            export_format=r.export_format.value,
            schedule_time=r.schedule_time,
            schedule_day=r.schedule_day,
            recipients=r.recipients or [],
            filters=r.filters,
            is_active=r.is_active,
            last_run_at=r.last_run_at,
            next_run_at=r.next_run_at,
            created_by_id=r.created_by_id,
            created_by_name=r.created_by.full_name if r.created_by else None,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in reports
    ]


@router.post("", response_model=ScheduledReportResponse)
async def create_scheduled_report(
    report_data: ScheduledReportCreate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Create a new scheduled report (Manager+ only)"""
    report = ScheduledReportService.create_scheduled_report(
        db,
        name=report_data.name,
        description=report_data.description,
        report_type=report_data.report_type.value,
        frequency=report_data.frequency.value,
        export_format=report_data.export_format.value,
        schedule_time=report_data.schedule_time,
        schedule_day=report_data.schedule_day,
        recipients=report_data.recipients,
        filters=report_data.filters,
        is_active=report_data.is_active,
        created_by_id=current_user.id
    )

    return ScheduledReportResponse(
        id=report.id,
        name=report.name,
        description=report.description,
        report_type=report.report_type.value,
        frequency=report.frequency.value,
        export_format=report.export_format.value,
        schedule_time=report.schedule_time,
        schedule_day=report.schedule_day,
        recipients=report.recipients or [],
        filters=report.filters,
        is_active=report.is_active,
        last_run_at=report.last_run_at,
        next_run_at=report.next_run_at,
        created_by_id=report.created_by_id,
        created_by_name=current_user.full_name,
        created_at=report.created_at,
        updated_at=report.updated_at
    )


@router.get("/{report_id}", response_model=ScheduledReportResponse)
async def get_scheduled_report(
    report_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Get a specific scheduled report (Manager+ only)"""
    report = ScheduledReportService.get_scheduled_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    return ScheduledReportResponse(
        id=report.id,
        name=report.name,
        description=report.description,
        report_type=report.report_type.value,
        frequency=report.frequency.value,
        export_format=report.export_format.value,
        schedule_time=report.schedule_time,
        schedule_day=report.schedule_day,
        recipients=report.recipients or [],
        filters=report.filters,
        is_active=report.is_active,
        last_run_at=report.last_run_at,
        next_run_at=report.next_run_at,
        created_by_id=report.created_by_id,
        created_by_name=report.created_by.full_name if report.created_by else None,
        created_at=report.created_at,
        updated_at=report.updated_at
    )


@router.put("/{report_id}", response_model=ScheduledReportResponse)
async def update_scheduled_report(
    report_id: int,
    report_data: ScheduledReportUpdate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Update a scheduled report (Manager+ only)"""
    update_dict = report_data.model_dump(exclude_unset=True)

    # Convert enums to values
    if 'report_type' in update_dict and update_dict['report_type']:
        update_dict['report_type'] = update_dict['report_type'].value
    if 'frequency' in update_dict and update_dict['frequency']:
        update_dict['frequency'] = update_dict['frequency'].value
    if 'export_format' in update_dict and update_dict['export_format']:
        update_dict['export_format'] = update_dict['export_format'].value

    report = ScheduledReportService.update_scheduled_report(
        db, report_id, **update_dict
    )

    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    return ScheduledReportResponse(
        id=report.id,
        name=report.name,
        description=report.description,
        report_type=report.report_type.value,
        frequency=report.frequency.value,
        export_format=report.export_format.value,
        schedule_time=report.schedule_time,
        schedule_day=report.schedule_day,
        recipients=report.recipients or [],
        filters=report.filters,
        is_active=report.is_active,
        last_run_at=report.last_run_at,
        next_run_at=report.next_run_at,
        created_by_id=report.created_by_id,
        created_by_name=report.created_by.full_name if report.created_by else None,
        created_at=report.created_at,
        updated_at=report.updated_at
    )


@router.delete("/{report_id}")
async def delete_scheduled_report(
    report_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Delete a scheduled report (Manager+ only)"""
    success = ScheduledReportService.delete_scheduled_report(db, report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scheduled report not found")
    return {"message": "Scheduled report deleted successfully"}


@router.post("/{report_id}/execute", response_model=ReportExecutionResponse)
async def execute_report_now(
    report_id: int,
    execute_data: ManualReportExecuteRequest,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Manually execute a scheduled report (Manager+ only)"""
    report = ScheduledReportService.get_scheduled_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    execution = ScheduledReportService.execute_report(
        db,
        report,
        send_email=execute_data.send_email,
        additional_recipients=execute_data.additional_recipients
    )

    return ReportExecutionResponse(
        id=execution.id,
        scheduled_report_id=execution.scheduled_report_id,
        executed_at=execution.executed_at,
        status=execution.status,
        error_message=execution.error_message,
        file_path=execution.file_path,
        file_size=execution.file_size,
        record_count=execution.record_count,
        email_sent=execution.email_sent,
        email_sent_at=execution.email_sent_at,
        email_error=execution.email_error
    )


@router.get("/{report_id}/history", response_model=List[ReportExecutionResponse])
async def get_report_execution_history(
    report_id: int,
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Get execution history for a scheduled report (Manager+ only)"""
    report = ScheduledReportService.get_scheduled_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    executions = ScheduledReportService.get_execution_history(db, report_id, limit)

    return [
        ReportExecutionResponse(
            id=e.id,
            scheduled_report_id=e.scheduled_report_id,
            executed_at=e.executed_at,
            status=e.status,
            error_message=e.error_message,
            file_path=e.file_path,
            file_size=e.file_size,
            record_count=e.record_count,
            email_sent=e.email_sent,
            email_sent_at=e.email_sent_at,
            email_error=e.email_error
        )
        for e in executions
    ]


@router.post("/{report_id}/toggle-active")
async def toggle_report_active(
    report_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Toggle the active status of a scheduled report (Manager+ only)"""
    report = ScheduledReportService.get_scheduled_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    new_status = not report.is_active
    ScheduledReportService.update_scheduled_report(db, report_id, is_active=new_status)

    return {
        "message": f"Report {'activated' if new_status else 'deactivated'} successfully",
        "is_active": new_status
    }

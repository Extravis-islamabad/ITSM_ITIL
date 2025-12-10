from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

from app.models.scheduled_report import ScheduledReport, ReportExecution, ReportType, ReportFrequency, ExportFormat

logger = logging.getLogger(__name__)
from app.services.reporting_service import ReportingService
from app.services.export_service import ExportService
from app.core.config import settings


class ScheduledReportService:
    """Service for managing scheduled reports and their execution"""

    @staticmethod
    def create_scheduled_report(
        db: Session,
        name: str,
        report_type: str,
        frequency: str,
        export_format: str,
        schedule_time: str,
        recipients: List[str],
        created_by_id: int,
        description: Optional[str] = None,
        schedule_day: Optional[int] = None,
        filters: Optional[Dict[str, Any]] = None,
        is_active: bool = True
    ) -> ScheduledReport:
        """Create a new scheduled report"""

        # Calculate next run time
        next_run = ScheduledReportService._calculate_next_run(
            frequency, schedule_time, schedule_day
        )

        report = ScheduledReport(
            name=name,
            description=description,
            report_type=ReportType(report_type),
            frequency=ReportFrequency(frequency),
            export_format=ExportFormat(export_format),
            schedule_time=schedule_time,
            schedule_day=schedule_day,
            recipients=recipients,
            filters=filters or {},
            is_active=is_active,
            next_run_at=next_run,
            created_by_id=created_by_id
        )

        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def update_scheduled_report(
        db: Session,
        report_id: int,
        **kwargs
    ) -> Optional[ScheduledReport]:
        """Update a scheduled report"""
        report = db.query(ScheduledReport).filter(ScheduledReport.id == report_id).first()
        if not report:
            return None

        for key, value in kwargs.items():
            if value is not None and hasattr(report, key):
                if key == 'report_type':
                    value = ReportType(value)
                elif key == 'frequency':
                    value = ReportFrequency(value)
                elif key == 'export_format':
                    value = ExportFormat(value)
                setattr(report, key, value)

        # Recalculate next run if schedule changed
        if any(k in kwargs for k in ['frequency', 'schedule_time', 'schedule_day']):
            report.next_run_at = ScheduledReportService._calculate_next_run(
                report.frequency.value,
                report.schedule_time,
                report.schedule_day
            )

        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def delete_scheduled_report(db: Session, report_id: int) -> bool:
        """Delete a scheduled report"""
        report = db.query(ScheduledReport).filter(ScheduledReport.id == report_id).first()
        if not report:
            return False
        db.delete(report)
        db.commit()
        return True

    @staticmethod
    def get_scheduled_reports(
        db: Session,
        created_by_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> List[ScheduledReport]:
        """Get all scheduled reports with optional filters"""
        query = db.query(ScheduledReport)

        if created_by_id is not None:
            query = query.filter(ScheduledReport.created_by_id == created_by_id)
        if is_active is not None:
            query = query.filter(ScheduledReport.is_active == is_active)

        return query.order_by(ScheduledReport.created_at.desc()).all()

    @staticmethod
    def get_scheduled_report(db: Session, report_id: int) -> Optional[ScheduledReport]:
        """Get a single scheduled report by ID"""
        return db.query(ScheduledReport).filter(ScheduledReport.id == report_id).first()

    @staticmethod
    def get_due_reports(db: Session) -> List[ScheduledReport]:
        """Get all reports that are due to run"""
        now = datetime.now(timezone.utc)
        return db.query(ScheduledReport).filter(
            and_(
                ScheduledReport.is_active == True,
                ScheduledReport.next_run_at <= now
            )
        ).all()

    @staticmethod
    def execute_report(
        db: Session,
        report: ScheduledReport,
        send_email: bool = True,
        additional_recipients: Optional[List[str]] = None
    ) -> ReportExecution:
        """Execute a scheduled report and optionally send via email"""

        execution = ReportExecution(
            scheduled_report_id=report.id,
            executed_at=datetime.now(timezone.utc),
            status="running"
        )
        db.add(execution)
        db.commit()

        try:
            # Generate report data using ReportingService
            report_data = ScheduledReportService._generate_report_data(
                db, report.report_type.value, report.filters or {}
            )

            # Export to specified format
            export_service = ExportService(db)

            if report.export_format == ExportFormat.PDF:
                file_path = export_service.export_to_pdf(
                    report_data,
                    report.report_type.value,
                    f"{report.name} Report"
                )
            elif report.export_format == ExportFormat.EXCEL:
                file_path = export_service.export_to_excel(
                    report_data,
                    report.report_type.value
                )
            else:  # CSV
                file_path = export_service.export_to_csv(
                    report_data,
                    report.report_type.value
                )

            # Update execution record
            execution.file_path = file_path
            execution.file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            execution.record_count = ScheduledReportService._count_records(report_data)
            execution.status = "generated"

            # Send email if requested
            if send_email:
                recipients = list(report.recipients or [])
                if additional_recipients:
                    recipients.extend(additional_recipients)

                if recipients:
                    email_success = ScheduledReportService._send_report_email(
                        report, file_path, recipients
                    )
                    execution.email_sent = email_success
                    execution.email_sent_at = datetime.now(timezone.utc) if email_success else None
                    if not email_success:
                        execution.email_error = "Failed to send email"

            execution.status = "success"

            # Update report's last run time and calculate next run
            report.last_run_at = datetime.now(timezone.utc)
            report.next_run_at = ScheduledReportService._calculate_next_run(
                report.frequency.value,
                report.schedule_time,
                report.schedule_day
            )

        except Exception as e:
            execution.status = "failed"
            execution.error_message = str(e)

        db.commit()
        db.refresh(execution)
        return execution

    @staticmethod
    def get_execution_history(
        db: Session,
        report_id: int,
        limit: int = 10
    ) -> List[ReportExecution]:
        """Get execution history for a scheduled report"""
        return db.query(ReportExecution).filter(
            ReportExecution.scheduled_report_id == report_id
        ).order_by(ReportExecution.executed_at.desc()).limit(limit).all()

    @staticmethod
    def _calculate_next_run(
        frequency: str,
        schedule_time: str,
        schedule_day: Optional[int] = None
    ) -> datetime:
        """Calculate the next run time based on frequency and schedule"""
        now = datetime.now(timezone.utc)
        hour, minute = map(int, schedule_time.split(':'))

        if frequency == "daily":
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)

        elif frequency == "weekly":
            # schedule_day is 1-7 (Monday-Sunday)
            target_weekday = (schedule_day or 1) - 1  # Convert to 0-6
            days_ahead = target_weekday - now.weekday()
            if days_ahead < 0 or (days_ahead == 0 and now.hour >= hour):
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)

        elif frequency == "monthly":
            # schedule_day is 1-31
            target_day = schedule_day or 1
            next_run = now.replace(day=min(target_day, 28), hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                # Move to next month
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)

        elif frequency == "quarterly":
            # Run on the first day of each quarter
            quarter_months = [1, 4, 7, 10]
            current_month = now.month
            next_quarter_month = None
            for m in quarter_months:
                if m > current_month or (m == current_month and now.day == 1 and now.hour < hour):
                    next_quarter_month = m
                    break
            if next_quarter_month is None:
                next_quarter_month = 1
                next_run = now.replace(year=now.year + 1, month=next_quarter_month, day=1, hour=hour, minute=minute, second=0, microsecond=0)
            else:
                next_run = now.replace(month=next_quarter_month, day=1, hour=hour, minute=minute, second=0, microsecond=0)

        else:
            # Default to next day
            next_run = now + timedelta(days=1)
            next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)

        return next_run

    @staticmethod
    def _generate_report_data(
        db: Session,
        report_type: str,
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate report data based on type"""
        reporting_service = ReportingService(db)

        # Extract common filter parameters
        start_date = filters.get('start_date')
        end_date = filters.get('end_date')

        # If no dates specified, default to last 30 days
        if not start_date:
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
        if not end_date:
            end_date = datetime.now(timezone.utc)

        if report_type == "sla_compliance":
            return reporting_service.get_sla_compliance_report(
                start_date=start_date,
                end_date=end_date,
                priority=filters.get('priority'),
                category_id=filters.get('category_id')
            )

        elif report_type == "ticket_aging":
            return reporting_service.get_ticket_aging_report(
                status=filters.get('status'),
                priority=filters.get('priority'),
                assignee_id=filters.get('assignee_id')
            )

        elif report_type == "technician_performance":
            return reporting_service.get_technician_performance_report(
                start_date=start_date,
                end_date=end_date,
                technician_ids=filters.get('technician_ids')
            )

        elif report_type == "ticket_volume":
            return reporting_service.get_ticket_volume_trends(
                start_date=start_date,
                end_date=end_date,
                granularity=filters.get('granularity', 'daily')
            )

        elif report_type == "category_breakdown":
            return reporting_service.get_category_breakdown(
                start_date=start_date,
                end_date=end_date
            )

        elif report_type == "first_response_time":
            return reporting_service.get_response_time_trends(
                start_date=start_date,
                end_date=end_date,
                granularity=filters.get('granularity', 'daily')
            )

        elif report_type == "resolution_time":
            return reporting_service.get_resolution_time_analysis(
                start_date=start_date,
                end_date=end_date,
                group_by=filters.get('group_by', 'priority')
            )

        else:
            return {"error": f"Unknown report type: {report_type}"}

    @staticmethod
    def _count_records(report_data: Dict[str, Any]) -> int:
        """Count records in report data"""
        if isinstance(report_data, dict):
            if 'data' in report_data and isinstance(report_data['data'], list):
                return len(report_data['data'])
            elif 'technicians' in report_data and isinstance(report_data['technicians'], list):
                return len(report_data['technicians'])
            elif 'categories' in report_data and isinstance(report_data['categories'], list):
                return len(report_data['categories'])
            elif 'trends' in report_data and isinstance(report_data['trends'], list):
                return len(report_data['trends'])
        return 0

    @staticmethod
    def _send_report_email(
        report: ScheduledReport,
        file_path: str,
        recipients: List[str]
    ) -> bool:
        """Send report via email with attachment"""
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = f"Scheduled Report: {report.name}"

            # Email body
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6b21a8 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0;">SupportX ITSM</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #1f2937;">Scheduled Report: {report.name}</h2>
                        <p style="color: #6b7280;">Your scheduled report has been generated and is attached to this email.</p>

                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;"><strong>Report Type:</strong></td>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;">{report.report_type.value.replace('_', ' ').title()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;"><strong>Frequency:</strong></td>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;">{report.frequency.value.title()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;"><strong>Format:</strong></td>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;">{report.export_format.value.upper()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;"><strong>Generated At:</strong></td>
                                <td style="padding: 10px; background: white; border: 1px solid #e5e7eb;">{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td>
                            </tr>
                        </table>

                        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                            This is an automated message from SupportX ITSM. Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(body, 'html'))

            # Attach report file
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    attachment = MIMEApplication(f.read())
                    attachment.add_header(
                        'Content-Disposition',
                        'attachment',
                        filename=os.path.basename(file_path)
                    )
                    msg.attach(attachment)

            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            return True

        except Exception as e:
            logger.error(f"Failed to send report email: {e}")
            return False

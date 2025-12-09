"""
Report Scheduler Service using APScheduler
Handles automatic execution of scheduled reports
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone
import logging

from app.core.database import SessionLocal
from app.services.scheduled_report_service import ScheduledReportService

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


def get_scheduler():
    """Get or create the scheduler instance"""
    global scheduler
    if scheduler is None:
        scheduler = BackgroundScheduler(
            timezone='UTC',
            job_defaults={
                'coalesce': True,
                'max_instances': 1,
                'misfire_grace_time': 3600  # 1 hour grace period
            }
        )
    return scheduler


def process_due_reports():
    """Process all reports that are due to run"""
    logger.info("Checking for due scheduled reports...")

    db = SessionLocal()
    try:
        due_reports = ScheduledReportService.get_due_reports(db)
        logger.info(f"Found {len(due_reports)} reports due for execution")

        for report in due_reports:
            try:
                logger.info(f"Executing report: {report.name} (ID: {report.id})")
                execution = ScheduledReportService.execute_report(
                    db, report, send_email=True
                )
                logger.info(
                    f"Report executed: {report.name}, Status: {execution.status}, "
                    f"Email sent: {execution.email_sent}"
                )
            except Exception as e:
                logger.error(f"Error executing report {report.name}: {e}")

    except Exception as e:
        logger.error(f"Error processing due reports: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the report scheduler"""
    global scheduler
    scheduler = get_scheduler()

    if scheduler.running:
        logger.info("Scheduler is already running")
        return

    # Add job to check for due reports every 5 minutes
    scheduler.add_job(
        process_due_reports,
        trigger=IntervalTrigger(minutes=5),
        id='check_due_reports',
        name='Check and execute due reports',
        replace_existing=True
    )

    # Add daily cleanup job at 3 AM UTC
    scheduler.add_job(
        cleanup_old_report_files,
        trigger=CronTrigger(hour=3, minute=0),
        id='cleanup_report_files',
        name='Cleanup old report files',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Report scheduler started successfully")


def stop_scheduler():
    """Stop the report scheduler"""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Report scheduler stopped")


def cleanup_old_report_files():
    """Clean up report files older than 30 days"""
    import os
    from datetime import timedelta
    from pathlib import Path

    logger.info("Starting cleanup of old report files...")

    export_dir = Path("exports/reports")
    if not export_dir.exists():
        return

    cutoff_time = datetime.now() - timedelta(days=30)

    deleted_count = 0
    for file_path in export_dir.glob("*"):
        if file_path.is_file():
            file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            if file_mtime < cutoff_time:
                try:
                    file_path.unlink()
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"Error deleting file {file_path}: {e}")

    logger.info(f"Cleanup completed. Deleted {deleted_count} old report files.")


def get_scheduler_status():
    """Get the current status of the scheduler"""
    global scheduler
    if scheduler is None:
        return {"status": "not_initialized", "jobs": []}

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": str(job.next_run_time) if job.next_run_time else None,
            "trigger": str(job.trigger)
        })

    return {
        "status": "running" if scheduler.running else "stopped",
        "jobs": jobs
    }

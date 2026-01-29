import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from models import Setting
from config import Config

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def scan_emails_job(app):
    """Job function to scan emails."""
    from email_service import email_service

    with app.app_context():
        logger.info("Running scheduled email scan...")
        result = email_service.scan_inbox()

        if result['tasks_created'] > 0:
            logger.info(f"Created {result['tasks_created']} new tasks from emails")

            # Send Telegram notification for new tasks
            from telegram_service import telegram_service
            if telegram_service.is_configured():
                from models import Task
                # Get recently created tasks (last 5 minutes)
                from datetime import datetime, timedelta
                recent = datetime.utcnow() - timedelta(minutes=5)
                new_tasks = Task.query.filter(Task.created_at >= recent).all()
                for task in new_tasks:
                    telegram_service.notify_new_task(task)


def init_scheduler(app):
    """Initialize the scheduler with email scanning job."""
    # Get interval from settings or config
    with app.app_context():
        interval = int(Setting.get('scan_interval_minutes') or Config.SCAN_INTERVAL_MINUTES)

    # Add the email scanning job
    scheduler.add_job(
        func=lambda: scan_emails_job(app),
        trigger=IntervalTrigger(minutes=interval),
        id='email_scan',
        name='Scan emails for new tasks',
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"Scheduler started. Email scan interval: {interval} minutes")


def update_scan_interval(minutes):
    """Update the email scan interval."""
    scheduler.reschedule_job(
        'email_scan',
        trigger=IntervalTrigger(minutes=minutes)
    )
    logger.info(f"Updated scan interval to {minutes} minutes")


def trigger_immediate_scan(app):
    """Trigger an immediate email scan."""
    scan_emails_job(app)

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()


class Task(db.Model):
    """Main task model - can be created from emails or manually."""
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    customer_name = db.Column(db.String(200))
    customer_email = db.Column(db.String(200))
    company = db.Column(db.String(200))
    so_number = db.Column(db.String(50))  # QuickBooks Sales Order
    po_number = db.Column(db.String(50))  # Customer Purchase Order
    quote_number = db.Column(db.String(50))  # Quote reference
    priority = db.Column(db.String(20), default='medium')  # high/medium/low
    due_date = db.Column(db.Date)
    due_time = db.Column(db.Time)
    status = db.Column(db.String(50), default='scheduled')
    source_email_id = db.Column(db.String(200))  # IMAP message ID
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to subtasks
    subtasks = db.relationship('Subtask', backref='task', lazy=True, cascade='all, delete-orphan',
                               order_by='Subtask.sort_order')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'company': self.company,
            'so_number': self.so_number,
            'po_number': self.po_number,
            'quote_number': self.quote_number,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'due_time': self.due_time.isoformat() if self.due_time else None,
            'status': self.status,
            'source_email_id': self.source_email_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'subtasks': [s.to_dict() for s in self.subtasks]
        }


class Subtask(db.Model):
    """Subtasks linked to parent tasks."""
    __tablename__ = 'subtasks'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending/completed
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'title': self.title,
            'status': self.status,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ProcessedEmail(db.Model):
    """Track processed emails to prevent duplicates."""
    __tablename__ = 'processed_emails'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.String(500), unique=True, nullable=False)
    folder = db.Column(db.String(100))
    processed_at = db.Column(db.DateTime, default=datetime.utcnow)


class SubtaskTemplate(db.Model):
    """Subtask templates for quick task setup."""
    __tablename__ = 'subtask_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    template_data = db.Column(db.Text)  # JSON array of subtask titles

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'steps': json.loads(self.template_data) if self.template_data else []
        }

    def get_steps(self):
        return json.loads(self.template_data) if self.template_data else []


class Setting(db.Model):
    """Key-value store for application settings."""
    __tablename__ = 'settings'

    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text)

    @staticmethod
    def get(key, default=None):
        setting = Setting.query.get(key)
        return setting.value if setting else default

    @staticmethod
    def set(key, value):
        setting = Setting.query.get(key)
        if setting:
            setting.value = value
        else:
            setting = Setting(key=key, value=value)
            db.session.add(setting)
        db.session.commit()


class EmailScanLog(db.Model):
    """Log of email scan results for debugging and history."""
    __tablename__ = 'email_scan_logs'

    id = db.Column(db.Integer, primary_key=True)
    scan_time = db.Column(db.DateTime, default=datetime.utcnow)
    message_id = db.Column(db.String(500))
    subject = db.Column(db.String(500))
    from_address = db.Column(db.String(200))
    result = db.Column(db.String(50))  # created, skipped_marketing, skipped_no_trigger, skipped_duplicate
    reason = db.Column(db.String(200))
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'scan_time': self.scan_time.isoformat() if self.scan_time else None,
            'message_id': self.message_id,
            'subject': self.subject,
            'from_address': self.from_address,
            'result': self.result,
            'reason': self.reason,
            'task_id': self.task_id
        }

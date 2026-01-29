import os
import json
import logging
from datetime import datetime, date
from flask import Flask, request, jsonify, send_from_directory

from models import db, Task, Subtask, SubtaskTemplate, Setting, ProcessedEmail, EmailScanLog
from config import Config, DEFAULT_TEMPLATE
from email_service import email_service
from telegram_service import telegram_service
from scheduler import init_scheduler, trigger_immediate_scan, update_scan_interval

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Path to React production build
FRONTEND_BUILD = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'build')

# Create Flask app - serve static files from React build if it exists
if os.path.exists(FRONTEND_BUILD):
    app = Flask(__name__, static_folder=FRONTEND_BUILD, static_url_path='')
else:
    app = Flask(__name__)

app.config.from_object(Config)

# Initialize database
db.init_app(app)


def init_db():
    """Initialize database and create default template."""
    with app.app_context():
        db.create_all()

        # Create default template if none exists
        if SubtaskTemplate.query.count() == 0:
            template = SubtaskTemplate(
                name=DEFAULT_TEMPLATE['name'],
                template_data=json.dumps(DEFAULT_TEMPLATE['steps'])
            )
            db.session.add(template)
            db.session.commit()
            logger.info("Created default subtask template")


# ============== TASK ENDPOINTS ==============

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks with optional filtering."""
    status = request.args.get('status')
    priority = request.args.get('priority')
    search = request.args.get('search')

    query = Task.query

    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                Task.title.ilike(search_term),
                Task.customer_name.ilike(search_term),
                Task.company.ilike(search_term),
                Task.po_number.ilike(search_term),
                Task.so_number.ilike(search_term)
            )
        )

    tasks = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks])


@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """Get a single task with subtasks."""
    task = Task.query.get_or_404(task_id)
    return jsonify(task.to_dict())


@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task."""
    data = request.json

    # Parse due_date if provided
    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            pass

    # Parse due_time if provided
    due_time = None
    if data.get('due_time'):
        try:
            due_time = datetime.strptime(data['due_time'], '%H:%M').time()
        except ValueError:
            pass

    task = Task(
        title=data.get('title', 'Untitled Task'),
        description=data.get('description'),
        customer_name=data.get('customer_name'),
        customer_email=data.get('customer_email'),
        company=data.get('company'),
        so_number=data.get('so_number'),
        po_number=data.get('po_number'),
        quote_number=data.get('quote_number'),
        priority=data.get('priority', 'medium'),
        due_date=due_date,
        due_time=due_time,
        status=data.get('status', 'scheduled')
    )

    db.session.add(task)
    db.session.commit()

    # Send Telegram notification
    if telegram_service.is_configured():
        telegram_service.notify_new_task(task)

    return jsonify(task.to_dict()), 201


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update a task."""
    task = Task.query.get_or_404(task_id)
    data = request.json

    old_status = task.status

    # Update fields
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'customer_name' in data:
        task.customer_name = data['customer_name']
    if 'customer_email' in data:
        task.customer_email = data['customer_email']
    if 'company' in data:
        task.company = data['company']
    if 'so_number' in data:
        task.so_number = data['so_number']
    if 'po_number' in data:
        task.po_number = data['po_number']
    if 'quote_number' in data:
        task.quote_number = data['quote_number']
    if 'priority' in data:
        task.priority = data['priority']
    if 'status' in data:
        task.status = data['status']

    if 'due_date' in data:
        if data['due_date']:
            try:
                task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except ValueError:
                pass
        else:
            task.due_date = None

    if 'due_time' in data:
        if data['due_time']:
            try:
                task.due_time = datetime.strptime(data['due_time'], '%H:%M').time()
            except ValueError:
                pass
        else:
            task.due_time = None

    task.updated_at = datetime.utcnow()
    db.session.commit()

    # Notify status change
    if telegram_service.is_configured() and old_status != task.status:
        telegram_service.notify_task_status_change(task, old_status)

    return jsonify(task.to_dict())


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task."""
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'})


@app.route('/api/tasks/bulk-delete', methods=['POST'])
def bulk_delete_tasks():
    """Delete multiple tasks by IDs."""
    data = request.json
    task_ids = data.get('task_ids', [])

    if not task_ids:
        return jsonify({'message': 'No tasks specified', 'deleted': 0})

    deleted = Task.query.filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
    db.session.commit()

    return jsonify({'message': f'Deleted {deleted} tasks', 'deleted': deleted})


@app.route('/api/tasks/delete-all', methods=['POST'])
def delete_all_tasks():
    """Delete all tasks. Use with caution!"""
    # Also clear processed emails so rescanning can recreate tasks
    deleted_tasks = Task.query.delete()
    deleted_emails = ProcessedEmail.query.delete()
    EmailScanLog.query.delete()
    db.session.commit()

    return jsonify({
        'message': f'Deleted {deleted_tasks} tasks',
        'deleted_tasks': deleted_tasks,
        'cleared_processed_emails': deleted_emails
    })


@app.route('/api/tasks/<int:task_id>/apply-template', methods=['POST'])
def apply_template(task_id):
    """Apply a subtask template to a task."""
    task = Task.query.get_or_404(task_id)
    data = request.json
    template_id = data.get('template_id')

    if template_id:
        template = SubtaskTemplate.query.get_or_404(template_id)
        steps = template.get_steps()
    else:
        # Use default template
        steps = DEFAULT_TEMPLATE['steps']

    # Get current max sort order
    max_order = db.session.query(db.func.max(Subtask.sort_order)).filter(
        Subtask.task_id == task_id
    ).scalar() or 0

    # Add subtasks from template
    for i, step in enumerate(steps):
        subtask = Subtask(
            task_id=task_id,
            title=step,
            status='pending',
            sort_order=max_order + i + 1
        )
        db.session.add(subtask)

    db.session.commit()
    return jsonify(task.to_dict())


# ============== SUBTASK ENDPOINTS ==============

@app.route('/api/tasks/<int:task_id>/subtasks', methods=['POST'])
def create_subtask(task_id):
    """Add a subtask to a task."""
    task = Task.query.get_or_404(task_id)
    data = request.json

    # Get max sort order
    max_order = db.session.query(db.func.max(Subtask.sort_order)).filter(
        Subtask.task_id == task_id
    ).scalar() or 0

    subtask = Subtask(
        task_id=task_id,
        title=data.get('title', 'New Subtask'),
        status=data.get('status', 'pending'),
        sort_order=max_order + 1
    )

    db.session.add(subtask)
    db.session.commit()

    return jsonify(subtask.to_dict()), 201


@app.route('/api/subtasks/<int:subtask_id>', methods=['PUT'])
def update_subtask(subtask_id):
    """Update a subtask."""
    subtask = Subtask.query.get_or_404(subtask_id)
    data = request.json

    if 'title' in data:
        subtask.title = data['title']
    if 'status' in data:
        subtask.status = data['status']
    if 'sort_order' in data:
        subtask.sort_order = data['sort_order']

    db.session.commit()
    return jsonify(subtask.to_dict())


@app.route('/api/subtasks/<int:subtask_id>', methods=['DELETE'])
def delete_subtask(subtask_id):
    """Delete a subtask."""
    subtask = Subtask.query.get_or_404(subtask_id)
    db.session.delete(subtask)
    db.session.commit()
    return jsonify({'message': 'Subtask deleted'})


@app.route('/api/tasks/<int:task_id>/subtasks/reorder', methods=['PUT'])
def reorder_subtasks(task_id):
    """Reorder subtasks for a task."""
    Task.query.get_or_404(task_id)
    data = request.json
    order = data.get('order', [])  # List of subtask IDs in new order

    for i, subtask_id in enumerate(order):
        subtask = Subtask.query.get(subtask_id)
        if subtask and subtask.task_id == task_id:
            subtask.sort_order = i

    db.session.commit()
    return jsonify({'message': 'Subtasks reordered'})


# ============== TEMPLATE ENDPOINTS ==============

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Get all subtask templates."""
    templates = SubtaskTemplate.query.all()
    return jsonify([t.to_dict() for t in templates])


@app.route('/api/templates', methods=['POST'])
def create_template():
    """Create a new subtask template."""
    data = request.json

    template = SubtaskTemplate(
        name=data.get('name', 'New Template'),
        template_data=json.dumps(data.get('steps', []))
    )

    db.session.add(template)
    db.session.commit()

    return jsonify(template.to_dict()), 201


@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Delete a template."""
    template = SubtaskTemplate.query.get_or_404(template_id)
    db.session.delete(template)
    db.session.commit()
    return jsonify({'message': 'Template deleted'})


# ============== EMAIL ENDPOINTS ==============

@app.route('/api/email/scan-now', methods=['POST'])
def scan_now():
    """Trigger immediate email scan."""
    data = request.json or {}
    scan_all = data.get('scan_all', False)
    days = data.get('days', None)
    result = email_service.scan_inbox(scan_all=scan_all, days=days)
    return jsonify(result)


@app.route('/api/email/status', methods=['GET'])
def email_status():
    """Get email connection status."""
    config = email_service.get_config()
    is_configured = bool(config['server'] and config['email'] and config['password'])

    return jsonify({
        'configured': is_configured,
        'server': config['server'] if is_configured else None,
        'email': config['email'] if is_configured else None
    })


@app.route('/api/email/logs', methods=['GET'])
def get_email_logs():
    """Get email scan logs."""
    limit = request.args.get('limit', 100, type=int)
    logs = EmailScanLog.query.order_by(EmailScanLog.scan_time.desc()).limit(limit).all()
    return jsonify([log.to_dict() for log in logs])


@app.route('/api/email/logs', methods=['DELETE'])
def clear_email_logs():
    """Clear all email scan logs."""
    EmailScanLog.query.delete()
    db.session.commit()
    return jsonify({'message': 'Logs cleared'})


@app.route('/api/email/trigger-words', methods=['GET'])
def get_trigger_words():
    """Get trigger words configuration."""
    from config import TRIGGER_WORDS, MARKETING_FILTERS
    custom_triggers = Setting.get('trigger_words')
    custom_marketing = Setting.get('marketing_filters')

    return jsonify({
        'trigger_words': json.loads(custom_triggers) if custom_triggers else TRIGGER_WORDS,
        'marketing_filters': json.loads(custom_marketing) if custom_marketing else MARKETING_FILTERS
    })


@app.route('/api/email/trigger-words', methods=['PUT'])
def update_trigger_words():
    """Update trigger words configuration."""
    data = request.json

    if 'trigger_words' in data:
        Setting.set('trigger_words', json.dumps(data['trigger_words']))

    if 'marketing_filters' in data:
        Setting.set('marketing_filters', json.dumps(data['marketing_filters']))

    return jsonify({'message': 'Trigger words updated'})


# ============== SETTINGS ENDPOINTS ==============

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get all settings."""
    settings = Setting.query.all()
    result = {s.key: s.value for s in settings}

    # Add defaults for missing settings
    defaults = {
        'scan_interval_minutes': str(Config.SCAN_INTERVAL_MINUTES),
        'default_due_days': str(Config.DEFAULT_DUE_DAYS),
        'theme': 'dark'
    }

    for key, default in defaults.items():
        if key not in result:
            result[key] = default

    # Don't expose password
    if 'imap_password' in result:
        result['imap_password'] = '********' if result['imap_password'] else ''

    return jsonify(result)


@app.route('/api/settings', methods=['PUT'])
def update_settings():
    """Update settings."""
    data = request.json

    for key, value in data.items():
        # Skip password if it's masked
        if key == 'imap_password' and value == '********':
            continue

        Setting.set(key, value)

    # Update scan interval if changed
    if 'scan_interval_minutes' in data:
        try:
            update_scan_interval(int(data['scan_interval_minutes']))
        except Exception as e:
            logger.error(f"Failed to update scan interval: {e}")

    return jsonify({'message': 'Settings updated'})


@app.route('/api/settings/test-imap', methods=['POST'])
def test_imap():
    """Test IMAP connection."""
    result = email_service.test_connection()
    return jsonify(result)


@app.route('/api/settings/test-telegram', methods=['POST'])
def test_telegram():
    """Test Telegram bot connection."""
    result = telegram_service.test_connection()
    return jsonify(result)


# ============== STATS ENDPOINT ==============

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics."""
    today = date.today()

    total = Task.query.count()
    completed = Task.query.filter(Task.status == 'completed').count()
    in_progress = Task.query.filter(Task.status == 'in_progress').count()
    overdue = Task.query.filter(
        Task.due_date < today,
        Task.status != 'completed'
    ).count()
    due_today = Task.query.filter(
        Task.due_date == today,
        Task.status != 'completed'
    ).count()
    high_priority = Task.query.filter(
        Task.priority == 'high',
        Task.status != 'completed'
    ).count()

    return jsonify({
        'total': total,
        'completed': completed,
        'in_progress': in_progress,
        'overdue': overdue,
        'due_today': due_today,
        'high_priority': high_priority,
        'pending': total - completed
    })


# ============== HEALTH CHECK ==============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})


# ============== FRONTEND ROUTES ==============

@app.route('/')
def serve_frontend():
    """Serve React app."""
    if os.path.exists(FRONTEND_BUILD):
        return send_from_directory(FRONTEND_BUILD, 'index.html')
    return jsonify({'message': 'Frontend not built. Run: cd frontend && npm run build'})


@app.errorhandler(404)
def not_found(e):
    """Serve React app for client-side routing."""
    if os.path.exists(FRONTEND_BUILD) and not request.path.startswith('/api/'):
        return send_from_directory(FRONTEND_BUILD, 'index.html')
    return jsonify({'error': 'Not found'}), 404


# ============== MAIN ==============

if __name__ == '__main__':
    init_db()
    init_scheduler(app)

    # Use production mode for less RAM usage (set DEBUG=true env var to enable debug)
    debug_mode = os.environ.get('DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

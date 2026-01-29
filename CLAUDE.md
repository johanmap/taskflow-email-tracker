# CLAUDE.md - Project Guide for AI Assistants

## Project Overview

**TaskFlow** is an email-integrated task management system for a manufacturing business. It automatically creates tasks from incoming emails and provides a Kanban board interface for managing workflow.

## Tech Stack

### Backend (Python/Flask)
- **Framework**: Flask 3.0 with Flask-CORS
- **Database**: SQLite with SQLAlchemy ORM
- **Background Jobs**: APScheduler for email scanning
- **Email**: imaplib for IMAP integration
- **Notifications**: python-telegram-bot for Telegram alerts
- **Location**: `/backend/`

### Frontend (React)
- **Framework**: React 18 with React Router
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Styling**: CSS variables for theming, no CSS framework
- **API**: Fetch API (no axios)
- **Location**: `/frontend/`

## File Structure

```
taskflow/
├── backend/
│   ├── app.py              # Main Flask app, all API routes
│   ├── models.py           # SQLAlchemy models
│   ├── email_service.py    # IMAP scanning logic
│   ├── telegram_service.py # Telegram notifications
│   ├── scheduler.py        # APScheduler setup
│   ├── config.py           # Config and trigger words
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app component
│   │   ├── components/
│   │   │   ├── Header.jsx       # Top bar with search, view toggle, buttons
│   │   │   ├── Sidebar.jsx      # Left navigation
│   │   │   ├── StatsPanel.jsx   # Dashboard stats cards
│   │   │   ├── TaskBoard.jsx    # Kanban board with drag-drop
│   │   │   ├── TaskCard.jsx     # Individual task cards with inline subtasks
│   │   │   ├── TaskList.jsx     # List view of tasks
│   │   │   ├── TaskModal.jsx    # Create/edit task modal
│   │   │   ├── SubtaskList.jsx  # Subtask management in modal
│   │   │   └── SettingsModal.jsx # IMAP/Telegram settings
│   │   ├── contexts/
│   │   │   └── ThemeContext.jsx # Dark/Medium/Light theme switching
│   │   ├── hooks/
│   │   │   └── useTasks.js      # Task, stats, templates hooks
│   │   ├── services/
│   │   │   └── api.js           # API client functions
│   │   └── styles/
│   │       ├── variables.css    # CSS custom properties
│   │       └── App.css          # All component styles
│   └── package.json
│
└── CLAUDE.md                # This file
```

## Database Models

### Task
- `id`, `title`, `description`
- `customer_name`, `customer_email`, `company`
- `so_number`, `po_number`, `quote_number` (reference numbers)
- `priority` (high/medium/low)
- `status` (scheduled/in_progress/completed)
- `due_date`, `due_time`
- `source_email_id` (if created from email)
- `subtasks` relationship

### Subtask
- `id`, `task_id`, `title`
- `status` (pending/completed)
- `sort_order`

### Other Tables
- `processed_emails` - Tracks scanned emails to prevent duplicates
- `subtask_templates` - Workflow templates
- `settings` - Key-value store for IMAP/Telegram config
- `email_scan_logs` - Logs each email scan result with reason (created, skipped_marketing, skipped_no_trigger, skipped_duplicate)

## Key Concepts

### Status vs Display Column
Tasks have a database `status` field (scheduled/in_progress/completed), but the Kanban board shows 6 columns:
- **Overdue** - scheduled tasks past due date
- **Urgent** - scheduled tasks due today with high priority
- **Upcoming** - scheduled tasks due within 2 days
- **In Progress** - tasks with status "in_progress"
- **Scheduled** - tasks with status "scheduled" (not date-triggered)
- **Completed** - tasks with status "completed" (collapsible column)

The `getEffectiveStatus()` function in TaskBoard.jsx determines which column a task appears in.

### Drag and Drop
- Dragging to In Progress/Scheduled/Completed changes the actual status
- Dragging to Overdue/Urgent/Upcoming sets status to "scheduled" (column based on due date)
- Uses native HTML5 drag-drop API

### Subtasks
- Displayed inline on task cards with checkboxes
- Can be toggled complete/incomplete directly on the card
- Full management (add/delete/bulk add) in the task modal
- Shows progress bar when subtasks exist

### Theming
Three themes controlled by CSS variables:
- **Dark** (default) - Dark blue background
- **Dim** - Medium gray background
- **Light** - White background

Theme preference saved to localStorage.

## API Endpoints

### Tasks
- `GET /api/tasks` - List all (with ?status, ?priority, ?search filters)
- `GET /api/tasks/:id` - Get single task with subtasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/apply-template` - Apply subtask template

### Subtasks
- `POST /api/tasks/:id/subtasks` - Add subtask
- `PUT /api/subtasks/:id` - Update subtask (including status toggle)
- `DELETE /api/subtasks/:id` - Delete subtask

### Email
- `POST /api/email/scan-now` - Trigger email scan (accepts `scan_all: true` in body)
- `GET /api/email/status` - Get IMAP connection status
- `GET /api/email/logs` - Get email scan logs
- `DELETE /api/email/logs` - Clear email scan logs
- `GET /api/email/trigger-words` - Get trigger words configuration
- `PUT /api/email/trigger-words` - Update trigger words configuration

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/test-imap` - Test IMAP connection
- `POST /api/settings/test-telegram` - Test Telegram bot

### Stats
- `GET /api/stats` - Dashboard statistics

## Running the Project

### Backend
```bash
cd backend
./venv/Scripts/python.exe app.py
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm start
# Runs on http://localhost:3000, proxies API to :5000
```

## Email Trigger Words
Configured in `config.py`. Emails containing these words create tasks:
- **Quotes**: quote, rfq, pricing, lead time
- **Orders**: po, purchase order, sales order
- **Urgency**: urgent, asap, deadline, action required
- **Design**: cad, drawing, bom, specification
- **Shipping**: ship, tracking, delivery
- **Communication**: meeting, call, follow up, please review

Marketing emails (containing "unsubscribe", "newsletter", etc.) are filtered out.

## Current State

### Working Features
- ✅ Kanban board with 6 columns
- ✅ Drag-drop between columns
- ✅ Collapsible Completed column
- ✅ Task creation/editing/deletion
- ✅ Inline subtasks on cards with checkbox toggle
- ✅ Subtask management in modal (single + bulk add)
- ✅ Three themes (dark/dim/light)
- ✅ Search filtering
- ✅ List view
- ✅ Stats dashboard
- ✅ IMAP email scanning (unread or all emails)
- ✅ Telegram notifications
- ✅ Subtask templates
- ✅ Visual feedback on email scan (toast notification)
- ✅ Configurable trigger words (Settings → Triggers)
- ✅ Configurable marketing filters
- ✅ Email scan logs (Settings → Email Log)

### UI Notes
- Cards show up to 5 subtasks, "+X more" for additional
- Priority indicated by colored left border on cards
- Due dates show "Today"/"Tomorrow" or "Mon 15" format
- Overdue dates shown in red

## Common Tasks

### Adding a new task field
1. Add column in `models.py` Task class
2. Add to `to_dict()` method
3. Update `create_task()` and `update_task()` in `app.py`
4. Add form field in `TaskModal.jsx`
5. Display in `TaskCard.jsx` if needed

### Changing Kanban columns
1. Edit `STATUSES` array in `TaskBoard.jsx`
2. Update `getEffectiveStatus()` logic if needed
3. Update CSS for new status colors in `variables.css`

### Adding new API endpoint
1. Add route in `app.py`
2. Add function in `frontend/src/services/api.js`
3. Use in components via the api object

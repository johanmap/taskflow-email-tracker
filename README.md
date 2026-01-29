# TaskFlow - Email-Integrated Task Management

A task management system for manufacturing businesses that automatically creates tasks from emails and provides a Kanban board interface.

## Features

- **Email Integration**: Automatically scans IMAP inbox for emails with trigger words
- **Kanban Board**: Visual task management with drag-and-drop
- **6 Status Levels**: Overdue, Urgent, Upcoming Soon, In Progress, Scheduled, Completed
- **Subtask Templates**: Pre-configured workflow templates for manufacturing projects
- **Telegram Notifications**: Real-time alerts for new tasks and status changes
- **3 Themes**: Dark, Medium, and Light modes
- **Priority System**: High, Medium, Low with visual indicators
- **Reference Tracking**: PO, SO, and Quote number extraction

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# Then run the server
python app.py
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at http://localhost:3000

## Configuration

### Environment Variables

Edit `backend/.env`:

```env
# IMAP Settings
IMAP_SERVER=mail.yourdomain.com
IMAP_PORT=993
IMAP_EMAIL=you@yourdomain.com
IMAP_PASSWORD=your_password

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# App Settings
SCAN_INTERVAL_MINUTES=5
DEFAULT_DUE_DAYS=3
SECRET_KEY=change-this-in-production
```

### Setting Up Telegram Notifications

1. **Create a Bot**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot`
   - Follow the prompts to name your bot
   - Copy the API token (looks like `123456789:ABCdefGHI...`)

2. **Get Your Chat ID**
   - Search for `@userinfobot` on Telegram
   - Start a chat and it will show your Chat ID
   - Or: Start a chat with your bot, send a message, then visit:
     `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
     Look for `"chat":{"id":YOUR_CHAT_ID}`

3. **Configure TaskFlow**
   - Go to Settings in TaskFlow
   - Enter your Bot Token and Chat ID
   - Click "Test Telegram Connection"

## Email Trigger Words

TaskFlow monitors emails for these keywords:

| Category | Keywords |
|----------|----------|
| Quotes | quote, rfq, request for quote, pricing, lead time |
| Orders | po, purchase order, order confirmation, sales order |
| Urgency | urgent, asap, deadline, action required, action needed |
| Design | cad, drawing, bom, bill of materials, spec, specification |
| Shipping | ship, shipping, tracking, delivery |
| Communication | meeting, call, schedule, follow up, please review |

### Marketing Filter

These emails are automatically ignored:
- Contains "unsubscribe", "newsletter", "promotional"
- From no-reply addresses
- LinkedIn/Facebook notifications
- Special offers, webinars, free trials

## Default Subtask Template

When you click "Apply Template" on a task, it adds these steps:

1. Respond with clarifying questions
2. Start design phase
3. Contact suppliers for pricing
4. Send CAD files and BOM
5. Finalize revisions with customer
6. Create pricing in MAP BOM Calculator
7. Send QuickBooks quote
8. Receive PO (update SO# and PO#)
9. Create QuickBooks Sales Order
10. Input into MAP MRP
11. Order materials / Contact vendors
12. Print BOM & create job traveller
13. Manufacturing (tracked in MAP MRP)
14. Ship and send tracking number

## Deployment

### Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set IMAP_SERVER=mail.example.com
heroku config:set IMAP_EMAIL=you@example.com
heroku config:set IMAP_PASSWORD=your_password
heroku config:set SECRET_KEY=your-secret-key

# Deploy
git push heroku main
```

### VPS (Ubuntu)

```bash
# Install dependencies
sudo apt update
sudo apt install python3.11 python3-pip nodejs npm nginx

# Clone your repo
git clone https://github.com/you/taskflow.git
cd taskflow

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install
npm run build

# Configure nginx to serve frontend and proxy API
# Copy nginx.conf to /etc/nginx/sites-available/taskflow

# Start with systemd or pm2
```

## API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get single task |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

### Subtasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/:id/subtasks` | Add subtask |
| PUT | `/api/subtasks/:id` | Update subtask |
| DELETE | `/api/subtasks/:id` | Delete subtask |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/settings/test-imap` | Test IMAP |
| POST | `/api/settings/test-telegram` | Test Telegram |

## Troubleshooting

### IMAP Connection Fails

- Verify server address and port (usually 993 for SSL)
- Check if your email provider requires app-specific passwords
- For Gmail: Enable "Less secure app access" or use App Password

### Telegram Not Working

- Verify bot token is correct
- Make sure you've started a chat with your bot
- Chat ID should be just numbers (may be negative for groups)

### Emails Not Creating Tasks

- Check if emails contain trigger words
- Verify email isn't being filtered as marketing
- Check the scan interval in settings

## License

MIT

# TaskFlow - Claude Code Handoff Document

## 📋 Project Overview

Build a comprehensive email-integrated task management web application for a manufacturing business. The system should automatically create tasks from incoming emails, support complex project workflows with subtasks, and provide notifications via Telegram.

---

## 🎯 Core Requirements (Confirmed)

### Email Integration (IMAP)
- [x] User has custom domain email via hosting provider (NOT Microsoft 365)
- [x] User has full IMAP credentials available
- [ ] **QUESTION**: What is your IMAP server address? (e.g., `mail.yourdomain.com`)
- [ ] **QUESTION**: Do you use SSL (port 993) or non-SSL (port 143)?

### Automatic Task Creation
- Scan inbox every X minutes for new emails
- Detect trigger words to determine if email should become a task
- Extract customer name, company (from email domain), and email content
- Auto-set due date (default: 3 days from email receipt)
- [ ] **QUESTION**: What scan interval do you prefer? (1, 2, 5, 10 minutes?)
- [ ] **QUESTION**: Are there specific email addresses or domains that should ALWAYS create tasks regardless of trigger words?
- [ ] **QUESTION**: Are there specific email addresses or domains that should NEVER create tasks?

### Trigger Words (Initial List - Needs Review)
```
Quotes: quote, rfq, request for quote, pricing, lead time
Orders: po, purchase order, order confirmation, sales order
Urgency: urgent, asap, deadline, action required, action needed
Design: cad, drawing, bom, bill of materials, spec, specification, revision, design, engineering
Shipping: ship, shipping, tracking, delivery
Communication: meeting, call, schedule, follow up, please review, awaiting, pending, response needed
```
- [ ] **QUESTION**: Review this list - any words to add or remove?
- [ ] **QUESTION**: Are there industry-specific terms you use that should trigger task creation?

### Marketing Email Filtering
Emails matching these patterns go to "Other" folder (not tasks):
```
unsubscribe, opt-out, newsletter, promotional, marketing
no-reply, noreply, donotreply
linkedin, facebook notification, twitter
special offer, limited time, discount, webinar, free trial
```
- [ ] **QUESTION**: Any specific senders or domains to always filter out?

### Task Management
- **Main Tasks**: Created from emails or manually
- **Subtasks**: Linked to parent tasks for project phases
- **Fields**:
  - Title (from email subject or manual entry)
  - Description (from email body preview or manual)
  - Customer Name
  - Customer Email
  - Company
  - SO # (QuickBooks Sales Order number)
  - PO # (Customer Purchase Order number)
  - Due Date
  - Due Time (optional)
  - Status
  - [ ] **QUESTION**: Any other fields needed? (e.g., Job Number, Quote Number, Priority Level?)

### Status Levels (6 total)
| Status | Color | When to Use |
|--------|-------|-------------|
| Overdue | Dark Red | Auto-set when past due date |
| Urgent | Red | Immediate attention needed |
| Upcoming Soon | Yellow/Amber | Due within 1-3 days |
| In Progress | Blue | Currently being worked on |
| Scheduled | Purple | Planned for future |
| Completed | Green | Done |

- [ ] **QUESTION**: Is this status system sufficient? Need any changes?

### Sent Email Auto-Complete
- When you reply to a customer, find matching open task and mark complete
- [ ] **QUESTION**: Should replying ALWAYS complete the task, or just move it to a different status (e.g., "Awaiting Response")?
- [ ] **QUESTION**: What if there are multiple open tasks for the same customer?

### Email Organization (IMAP Folders)
- Create folders for each customer/company
- Move marketing emails to "Other" folder
- [ ] **QUESTION**: Should emails be moved to customer folders automatically, or only after you reply?
- [ ] **QUESTION**: Do you want a specific folder structure? (e.g., `Customers/CompanyName` or just `CompanyName`?)

### Telegram Notifications
- Notify on new task creation
- Notify on overdue tasks (hourly check)
- [ ] **QUESTION**: Do you already have a Telegram bot set up, or need instructions?
- [ ] **QUESTION**: Any other notification triggers needed? (e.g., daily summary, task assigned?)

### Web Interface
- Dashboard with stats (overdue count, due today, in progress, etc.)
- Board view (Kanban-style columns by status)
- List view option
- Three themes: Dark, Medium, Light
- Search/filter tasks
- Manual task creation
- Quick actions (Start Task, Complete Task)
- [ ] **QUESTION**: Which view do you prefer as default - Board or List?
- [ ] **QUESTION**: Any specific UI preferences or must-haves?

---

## 🏭 Manufacturing Workflow (Your Process)

Based on our conversation, here's the typical project flow:

```
1. Email arrives with quote request
2. → Auto-creates main task
3. → You add subtasks for each phase:
   ├── Respond with clarifying questions
   ├── Start design phase
   ├── Contact suppliers for pricing
   ├── Send CAD files and BOM
   ├── Finalize revisions with customer
   ├── Create pricing in MAP BOM Calculator
   ├── Send QuickBooks quote
   ├── Receive PO (add SO# and PO#)
   ├── Create QuickBooks Sales Order
   ├── Input into MAP MRP
   ├── Order materials / Contact vendors
   ├── Print BOM & create job traveller
   ├── Manufacturing (tracked in MAP MRP)
   └── Ship and send tracking number
```

### Questions About Your Workflow:
- [ ] **QUESTION**: Is this subtask list accurate? Any steps to add/remove/reorder?
- [ ] **QUESTION**: Should there be a "template" feature to auto-create these subtasks for new projects?
- [ ] **QUESTION**: Do you use MAP BOM Calculator and MAP MRP as separate systems? Any integration needed?
- [ ] **QUESTION**: How do you currently track SO# and PO#? Manual entry is fine?

---

## 🔧 Technical Architecture (Proposed)

### Backend (Python/Flask)
- Flask REST API
- SQLite database (simple, file-based, easy backup)
- IMAP integration via `imaplib` (standard library)
- APScheduler for background email scanning
- Telegram Bot API for notifications

### Frontend (React)
- React 18 with hooks
- Context API for state/theme management
- CSS with variables for theming
- Responsive design (mobile-friendly)

### Deployment Options
- **Local**: Run on your computer
- **Server**: VPS, Heroku, Railway, etc.
- [ ] **QUESTION**: Where do you plan to run this? Local machine, server, or cloud?
- [ ] **QUESTION**: Do you need it accessible from multiple devices/locations?

---

## ⚠️ Critical Clarifications Needed

### High Priority (Affects Core Architecture)
1. **IMAP Details**: Server address, port, SSL preference
2. **Sent Email Behavior**: Complete task vs. change status on reply
3. **Multi-task Customers**: How to handle multiple open tasks for same customer
4. **Deployment**: Local vs. server (affects setup instructions)

### Medium Priority (Affects Features)
5. **Subtask Templates**: Auto-create standard subtasks for new projects?
6. **Additional Fields**: Job Number, Quote Number, etc.?
7. **Notification Preferences**: What triggers notifications?

### Lower Priority (Can Adjust Later)
8. **Theme Preferences**: Default theme
9. **View Preferences**: Default to Board or List
10. **Trigger Word Refinement**: Industry-specific terms

---

## 📁 File Structure (Proposed)

```
taskflow/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment template
│   └── tasks.db            # SQLite database (created on first run)
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatsPanel.jsx
│   │   │   ├── TaskBoard.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   └── TaskModal.jsx
│   │   ├── contexts/
│   │   │   └── ThemeContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── App.css
│   │   ├── App.jsx
│   │   └── index.js
│   └── package.json
└── README.md
```

---

## 🚀 Build Phases (Suggested)

### Phase 1: Core Backend
- Database schema
- IMAP connection and email fetching
- Task CRUD API
- Basic email-to-task conversion

### Phase 2: Email Processing
- Trigger word detection
- Marketing email filtering
- Sent email monitoring
- Auto-completion logic

### Phase 3: Frontend
- Basic UI components
- Task display (board/list)
- Task creation/editing
- Theme system

### Phase 4: Polish
- Telegram notifications
- Folder organization
- Search/filter
- Mobile responsiveness

### Phase 5: Testing & Deployment
- Test with real email account
- Documentation
- Deployment setup

---

## 📝 Notes for Claude Code

1. **Do NOT start building until all high-priority questions are answered**
2. User prefers IMAP over Microsoft Graph (custom domain hosting)
3. This is for a manufacturing business - workflow includes quotes, POs, CAD, BOM
4. User mentioned MAP BOM Calculator and MAP MRP as existing tools
5. Previous prototype exists but needs refinement based on clarifications

---

## ✅ Ready to Build Checklist

Before building, confirm:
- [ ] IMAP server details provided
- [ ] Sent email behavior decided
- [ ] Multi-task customer handling decided
- [ ] Deployment target confirmed
- [ ] Trigger words reviewed and approved
- [ ] Additional fields confirmed
- [ ] Subtask template feature decided

---

*This document was prepared for handoff to Claude Code. Please review all questions marked with [ ] **QUESTION** and provide answers before proceeding with development.*

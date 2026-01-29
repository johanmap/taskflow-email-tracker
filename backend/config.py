import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration from environment variables."""

    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///taskflow.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # IMAP
    IMAP_SERVER = os.getenv('IMAP_SERVER', '')
    IMAP_PORT = int(os.getenv('IMAP_PORT', 993))
    IMAP_EMAIL = os.getenv('IMAP_EMAIL', '')
    IMAP_PASSWORD = os.getenv('IMAP_PASSWORD', '')
    IMAP_USE_SSL = os.getenv('IMAP_USE_SSL', 'true').lower() == 'true'

    # Telegram
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')

    # Scanning
    SCAN_INTERVAL_MINUTES = int(os.getenv('SCAN_INTERVAL_MINUTES', 5))
    DEFAULT_DUE_DAYS = int(os.getenv('DEFAULT_DUE_DAYS', 3))


# Trigger words for email classification
TRIGGER_WORDS = {
    'quotes': ['quote', 'rfq', 'request for quote', 'pricing', 'lead time'],
    'orders': ['po', 'purchase order', 'order confirmation', 'sales order'],
    'urgency': ['urgent', 'asap', 'deadline', 'action required', 'action needed'],
    'design': ['cad', 'drawing', 'bom', 'bill of materials', 'spec', 'specification', 'revision', 'design', 'engineering'],
    'shipping': ['ship', 'shipping', 'tracking', 'delivery'],
    'communication': ['meeting', 'call', 'schedule', 'follow up', 'please review', 'awaiting', 'pending', 'response needed']
}

# Marketing email filters (emails to ignore)
MARKETING_FILTERS = [
    'unsubscribe', 'opt-out', 'newsletter', 'promotional', 'marketing',
    'no-reply', 'noreply', 'donotreply',
    'linkedin', 'facebook notification', 'twitter',
    'special offer', 'limited time', 'discount', 'webinar', 'free trial'
]

# Default subtask template
DEFAULT_TEMPLATE = {
    "name": "Standard Manufacturing Project",
    "steps": [
        "Respond with clarifying questions",
        "Start design phase",
        "Contact suppliers for pricing",
        "Send CAD files and BOM",
        "Finalize revisions with customer",
        "Create pricing in MAP BOM Calculator",
        "Send QuickBooks quote",
        "Receive PO (update SO# and PO#)",
        "Create QuickBooks Sales Order",
        "Input into MAP MRP",
        "Order materials / Contact vendors",
        "Print BOM & create job traveller",
        "Manufacturing (tracked in MAP MRP)",
        "Ship and send tracking number"
    ]
}

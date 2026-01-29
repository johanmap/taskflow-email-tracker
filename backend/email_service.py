import imaplib
import email
from email.header import decode_header
from email.utils import parseaddr, parsedate_to_datetime
from datetime import datetime, timedelta
import re
import json
import logging

from models import db, Task, ProcessedEmail, Setting, EmailScanLog
from config import Config, TRIGGER_WORDS, MARKETING_FILTERS

logger = logging.getLogger(__name__)


def get_trigger_words():
    """Get trigger words from settings or use defaults."""
    custom = Setting.get('trigger_words')
    if custom:
        try:
            return json.loads(custom)
        except:
            pass
    return TRIGGER_WORDS


def get_marketing_filters():
    """Get marketing filters from settings or use defaults."""
    custom = Setting.get('marketing_filters')
    if custom:
        try:
            return json.loads(custom)
        except:
            pass
    return MARKETING_FILTERS


def normalize_subject(subject):
    """Strip Re:, Fwd:, etc. prefixes to get the base subject for thread grouping."""
    if not subject:
        return ''

    # Pattern to match common reply/forward prefixes (case-insensitive)
    # Handles: Re:, RE:, Fwd:, FW:, Fw:, and multiple prefixes like "Re: Re: Re:"
    pattern = r'^(?:\s*(?:re|fwd?|fw)\s*:\s*)+'
    normalized = re.sub(pattern, '', subject, flags=re.IGNORECASE).strip()
    return normalized


class EmailService:
    """Service for scanning emails and creating tasks."""

    def __init__(self, app=None):
        self.app = app
        self.connection = None

    def get_config(self):
        """Get IMAP config from settings or environment."""
        return {
            'server': Setting.get('imap_server') or Config.IMAP_SERVER,
            'port': int(Setting.get('imap_port') or Config.IMAP_PORT),
            'email': Setting.get('imap_email') or Config.IMAP_EMAIL,
            'password': Setting.get('imap_password') or Config.IMAP_PASSWORD,
            'use_ssl': (Setting.get('imap_use_ssl') or str(Config.IMAP_USE_SSL)).lower() == 'true'
        }

    def connect(self):
        """Establish IMAP connection."""
        config = self.get_config()

        if not all([config['server'], config['email'], config['password']]):
            logger.warning("IMAP credentials not configured")
            return False

        try:
            if config['use_ssl']:
                self.connection = imaplib.IMAP4_SSL(config['server'], config['port'])
            else:
                self.connection = imaplib.IMAP4(config['server'], config['port'])

            self.connection.login(config['email'], config['password'])
            logger.info(f"Connected to IMAP server: {config['server']}")
            return True
        except Exception as e:
            logger.error(f"IMAP connection failed: {e}")
            self.connection = None
            return False

    def disconnect(self):
        """Close IMAP connection."""
        if self.connection:
            try:
                self.connection.logout()
            except:
                pass
            self.connection = None

    def test_connection(self):
        """Test IMAP connection and return status."""
        try:
            if self.connect():
                self.disconnect()
                return {'success': True, 'message': 'Connection successful'}
            return {'success': False, 'message': 'Failed to connect'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def decode_email_header(self, header):
        """Decode email header to string."""
        if not header:
            return ''

        decoded_parts = decode_header(header)
        result = []
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(encoding or 'utf-8', errors='replace'))
            else:
                result.append(part)
        return ' '.join(result)

    def get_email_body(self, msg):
        """Extract plain text body from email."""
        body = ''

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == 'text/plain':
                    try:
                        payload = part.get_payload(decode=True)
                        charset = part.get_content_charset() or 'utf-8'
                        body = payload.decode(charset, errors='replace')
                        break
                    except:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                charset = msg.get_content_charset() or 'utf-8'
                body = payload.decode(charset, errors='replace')
            except:
                pass

        return body

    def is_marketing_email(self, subject, body, from_addr):
        """Check if email is marketing/spam to ignore."""
        text = f"{subject} {body} {from_addr}".lower()
        filters = get_marketing_filters()

        for filter_word in filters:
            if filter_word.lower() in text:
                return filter_word

        return None

    def extract_customer_info(self, from_header, body):
        """Extract customer name, email, and company from email."""
        name, email_addr = parseaddr(from_header)

        # Try to extract company from email domain
        company = ''
        if email_addr and '@' in email_addr:
            domain = email_addr.split('@')[1]
            # Skip common email providers
            common_providers = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com']
            if domain.lower() not in common_providers:
                company = domain.split('.')[0].title()

        return {
            'name': name or email_addr.split('@')[0] if email_addr else 'Unknown',
            'email': email_addr,
            'company': company
        }

    def detect_trigger_category(self, subject, body):
        """Detect which trigger category matches the email."""
        text = f"{subject} {body}".lower()
        trigger_words = get_trigger_words()

        for category, words in trigger_words.items():
            for word in words:
                if word.lower() in text:
                    return category, word

        return None, None

    def extract_reference_numbers(self, subject, body):
        """Extract PO, SO, and quote numbers from email."""
        text = f"{subject} {body}"

        # Patterns for reference numbers
        patterns = {
            'po_number': [
                r'PO[#:\s-]*(\d+[-\w]*)',
                r'Purchase Order[#:\s-]*(\d+[-\w]*)',
            ],
            'so_number': [
                r'SO[#:\s-]*(\d+[-\w]*)',
                r'Sales Order[#:\s-]*(\d+[-\w]*)',
            ],
            'quote_number': [
                r'Quote[#:\s-]*(\d+[-\w]*)',
                r'Q[#:\s-]*(\d+[-\w]*)',
                r'RFQ[#:\s-]*(\d+[-\w]*)',
            ]
        }

        result = {}
        for field, pats in patterns.items():
            for pat in pats:
                match = re.search(pat, text, re.IGNORECASE)
                if match:
                    result[field] = match.group(1)
                    break

        return result

    def determine_priority(self, subject, body):
        """Determine task priority based on email content."""
        text = f"{subject} {body}".lower()

        high_priority_words = ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'rush']
        for word in high_priority_words:
            if word in text:
                return 'high'

        return 'medium'

    def scan_inbox(self, scan_all=False, days=None):
        """Scan inbox for new emails and create tasks.

        Args:
            scan_all: If True, scan all emails. If False, only scan unseen emails.
            days: If specified, scan emails from the past N days.
        """
        if not self.connect():
            return {'success': False, 'message': 'Could not connect to IMAP', 'tasks_created': 0, 'emails_scanned': 0}

        tasks_created = 0
        emails_scanned = 0
        emails_skipped_marketing = 0
        emails_skipped_no_trigger = 0
        emails_skipped_duplicate = 0
        errors = []

        try:
            self.connection.select('INBOX')

            # Search for emails based on parameters
            if days:
                # Search for emails from the past N days
                since_date = (datetime.now() - timedelta(days=days)).strftime('%d-%b-%Y')
                status, messages = self.connection.search(None, f'SINCE {since_date}')
            elif scan_all:
                status, messages = self.connection.search(None, 'ALL')
            else:
                status, messages = self.connection.search(None, 'UNSEEN')

            if status != 'OK':
                return {'success': False, 'message': 'Failed to search inbox', 'tasks_created': 0, 'emails_scanned': 0}

            email_ids = messages[0].split()
            logger.info(f"Found {len(email_ids)} {'total' if scan_all else 'unread'} emails")

            for email_id in email_ids:
                try:
                    # Fetch email
                    status, msg_data = self.connection.fetch(email_id, '(RFC822)')
                    if status != 'OK':
                        continue

                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)

                    # Get message ID
                    message_id = msg.get('Message-ID', '')
                    emails_scanned += 1

                    # Decode headers
                    subject = self.decode_email_header(msg.get('Subject', ''))
                    from_header = self.decode_email_header(msg.get('From', ''))
                    _, from_email = parseaddr(from_header)
                    body = self.get_email_body(msg)

                    # Check if already processed
                    if ProcessedEmail.query.filter_by(message_id=message_id).first():
                        emails_skipped_duplicate += 1
                        # Log it
                        log = EmailScanLog(
                            message_id=message_id,
                            subject=subject[:500] if subject else '',
                            from_address=from_email,
                            result='skipped_duplicate',
                            reason='Already processed'
                        )
                        db.session.add(log)
                        db.session.commit()
                        continue

                    # Skip marketing emails
                    marketing_word = self.is_marketing_email(subject, body, from_header)
                    if marketing_word:
                        emails_skipped_marketing += 1
                        # Mark as processed but don't create task
                        processed = ProcessedEmail(message_id=message_id, folder='INBOX')
                        db.session.add(processed)
                        # Log it
                        log = EmailScanLog(
                            message_id=message_id,
                            subject=subject[:500] if subject else '',
                            from_address=from_email,
                            result='skipped_marketing',
                            reason=f'Marketing filter: "{marketing_word}"'
                        )
                        db.session.add(log)
                        db.session.commit()
                        continue

                    # Check for trigger words
                    category, trigger_word = self.detect_trigger_category(subject, body)
                    if not category:
                        emails_skipped_no_trigger += 1
                        # Log it but don't mark as processed (might match future trigger words)
                        log = EmailScanLog(
                            message_id=message_id,
                            subject=subject[:500] if subject else '',
                            from_address=from_email,
                            result='skipped_no_trigger',
                            reason='No trigger words found'
                        )
                        db.session.add(log)
                        db.session.commit()
                        continue

                    # Extract information
                    customer_info = self.extract_customer_info(from_header, body)
                    ref_numbers = self.extract_reference_numbers(subject, body)
                    priority = self.determine_priority(subject, body)

                    # Check for existing task with same thread (normalized subject)
                    normalized_subj = normalize_subject(subject)
                    existing_task = Task.query.filter(
                        db.func.lower(Task.title).like(f'%{normalized_subj.lower()}%') if normalized_subj else False
                    ).filter(
                        Task.customer_email == customer_info['email']
                    ).first()

                    if existing_task:
                        emails_skipped_duplicate += 1
                        # Mark as processed but don't create new task
                        processed = ProcessedEmail(message_id=message_id, folder='INBOX')
                        db.session.add(processed)
                        log = EmailScanLog(
                            message_id=message_id,
                            subject=subject[:500] if subject else '',
                            from_address=from_email,
                            result='skipped_thread',
                            reason=f'Thread exists: Task #{existing_task.id}'
                        )
                        db.session.add(log)
                        db.session.commit()
                        continue

                    # Get email date and calculate due date based on it
                    due_days = int(Setting.get('default_due_days') or Config.DEFAULT_DUE_DAYS)
                    email_date = None
                    try:
                        date_header = msg.get('Date')
                        if date_header:
                            email_date = parsedate_to_datetime(date_header)
                    except Exception:
                        pass

                    # Use email date + due_days, or fallback to today + due_days
                    if email_date:
                        due_date = (email_date + timedelta(days=due_days)).date()
                    else:
                        due_date = datetime.now().date() + timedelta(days=due_days)

                    # Create task
                    task = Task(
                        title=subject[:500] if subject else f"Email from {customer_info['name']}",
                        description=body[:5000] if body else '',
                        customer_name=customer_info['name'],
                        customer_email=customer_info['email'],
                        company=customer_info['company'],
                        po_number=ref_numbers.get('po_number'),
                        so_number=ref_numbers.get('so_number'),
                        quote_number=ref_numbers.get('quote_number'),
                        priority=priority,
                        due_date=due_date,
                        status='scheduled',
                        source_email_id=message_id
                    )

                    db.session.add(task)
                    db.session.flush()  # Get the task ID

                    # Mark email as processed
                    processed = ProcessedEmail(message_id=message_id, folder='INBOX')
                    db.session.add(processed)

                    # Log it
                    log = EmailScanLog(
                        message_id=message_id,
                        subject=subject[:500] if subject else '',
                        from_address=from_email,
                        result='created',
                        reason=f'Trigger: "{trigger_word}" ({category})',
                        task_id=task.id
                    )
                    db.session.add(log)

                    db.session.commit()
                    tasks_created += 1

                    logger.info(f"Created task: {task.title[:50]}...")

                except Exception as e:
                    logger.error(f"Error processing email {email_id}: {e}")
                    errors.append(str(e))
                    db.session.rollback()

        except Exception as e:
            logger.error(f"Error scanning inbox: {e}")
            return {'success': False, 'message': str(e), 'tasks_created': tasks_created, 'emails_scanned': emails_scanned}
        finally:
            self.disconnect()

        return {
            'success': True,
            'message': f'Scan complete. Scanned {emails_scanned} emails, created {tasks_created} tasks.',
            'tasks_created': tasks_created,
            'emails_scanned': emails_scanned,
            'skipped_marketing': emails_skipped_marketing,
            'skipped_no_trigger': emails_skipped_no_trigger,
            'skipped_duplicate': emails_skipped_duplicate,
            'errors': errors if errors else None
        }


# Singleton instance
email_service = EmailService()

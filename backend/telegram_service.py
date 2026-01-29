import asyncio
import logging
from telegram import Bot
from telegram.error import TelegramError

from models import Setting
from config import Config

logger = logging.getLogger(__name__)


class TelegramService:
    """Service for sending Telegram notifications."""

    def __init__(self):
        self.bot = None

    def get_config(self):
        """Get Telegram config from settings or environment."""
        return {
            'token': Setting.get('telegram_bot_token') or Config.TELEGRAM_BOT_TOKEN,
            'chat_id': Setting.get('telegram_chat_id') or Config.TELEGRAM_CHAT_ID
        }

    def is_configured(self):
        """Check if Telegram is properly configured."""
        config = self.get_config()
        return bool(config['token'] and config['chat_id'])

    async def _send_message_async(self, message):
        """Send message asynchronously."""
        config = self.get_config()

        if not self.is_configured():
            logger.warning("Telegram not configured")
            return False

        try:
            bot = Bot(token=config['token'])
            await bot.send_message(
                chat_id=config['chat_id'],
                text=message,
                parse_mode='HTML'
            )
            return True
        except TelegramError as e:
            logger.error(f"Telegram error: {e}")
            return False

    def send_message(self, message):
        """Send a message to the configured Telegram chat."""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._send_message_async(message))
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return False

    def notify_new_task(self, task):
        """Send notification for a new task."""
        priority_emoji = {
            'high': '🔴',
            'medium': '🟡',
            'low': '🟢'
        }

        emoji = priority_emoji.get(task.priority, '🟡')

        message = f"""
{emoji} <b>New Task Created</b>

<b>Title:</b> {task.title[:100]}
<b>Customer:</b> {task.customer_name or 'Unknown'}
<b>Company:</b> {task.company or 'N/A'}
<b>Priority:</b> {task.priority.title()}
<b>Due:</b> {task.due_date.strftime('%Y-%m-%d') if task.due_date else 'Not set'}

📧 Source: Email
        """.strip()

        return self.send_message(message)

    def notify_task_status_change(self, task, old_status):
        """Send notification when task status changes."""
        status_emoji = {
            'overdue': '⚠️',
            'urgent': '🔴',
            'upcoming_soon': '🟠',
            'in_progress': '🔵',
            'scheduled': '🟣',
            'completed': '✅'
        }

        emoji = status_emoji.get(task.status, '📋')

        message = f"""
{emoji} <b>Task Status Updated</b>

<b>Title:</b> {task.title[:100]}
<b>Status:</b> {old_status} → {task.status}
<b>Customer:</b> {task.customer_name or 'Unknown'}
        """.strip()

        return self.send_message(message)

    def notify_upcoming_due(self, task):
        """Send notification for upcoming due date."""
        message = f"""
⏰ <b>Task Due Soon</b>

<b>Title:</b> {task.title[:100]}
<b>Due:</b> {task.due_date.strftime('%Y-%m-%d') if task.due_date else 'Not set'}
<b>Customer:</b> {task.customer_name or 'Unknown'}

Please review and take action.
        """.strip()

        return self.send_message(message)

    async def _test_connection_async(self):
        """Test Telegram connection asynchronously."""
        config = self.get_config()

        if not config['token']:
            return {'success': False, 'message': 'Bot token not configured'}

        try:
            bot = Bot(token=config['token'])
            me = await bot.get_me()

            if config['chat_id']:
                await bot.send_message(
                    chat_id=config['chat_id'],
                    text='✅ TaskFlow connection test successful!'
                )
                return {
                    'success': True,
                    'message': f"Connected as @{me.username}. Test message sent!"
                }
            else:
                return {
                    'success': True,
                    'message': f"Bot connected as @{me.username}. Set chat_id to receive messages."
                }

        except TelegramError as e:
            return {'success': False, 'message': str(e)}

    def test_connection(self):
        """Test the Telegram bot connection."""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._test_connection_async())
            loop.close()
            return result
        except Exception as e:
            return {'success': False, 'message': str(e)}


# Singleton instance
telegram_service = TelegramService()

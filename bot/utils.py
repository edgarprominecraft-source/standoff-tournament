from aiogram import Bot, types
from aiogram.exceptions import TelegramBadRequest
from config import ROLE_BADGES, ROLE_ADMIN, ROLE_MODERATOR, ROLE_SUPPORT, ADMIN_ID
from db import get_user_role, is_admin


# ===== ПРОВЕРКА ПРАВ =====

async def check_admin(user_id: int) -> bool:
    """Проверка: админ ли это (из таблицы admins или равен ADMIN_ID)"""
    if user_id == ADMIN_ID:
        return True
    return await is_admin(user_id)


async def require_admin(user_id: int) -> bool:
    """Хард-проверка для команд"""
    return await check_admin(user_id)


# ===== КРАСИВОЕ ИМЯ С РОЛЬЮ =====

def format_name_with_role(name: str, role: str | None) -> str:
    """Возвращает красивое имя с префиксом роли в HTML"""
    if not role or role not in ROLE_BADGES:
        return f"<b>{escape_html(name)}</b>"
    badge = ROLE_BADGES[role]
    return f"<b>{badge}</b> <b>{escape_html(name)}</b>"


def role_emoji(role: str | None) -> str:
    if role == ROLE_ADMIN:
        return "👑"
    if role == ROLE_MODERATOR:
        return "🛡"
    if role == ROLE_SUPPORT:
        return "🎧"
    return ""


# ===== ESCAPE HTML =====

def escape_html(text: str) -> str:
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


# ===== РЕДАКТИРОВАНИЕ БЕЗ ОШИБОК =====

async def safe_edit(message: types.Message, text: str, kb=None):
    """Безопасно редактирует сообщение — не падает при 'message is not modified'"""
    try:
        await message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            raise


# ===== ПРОВЕРКА ПОДПИСКИ =====

async def check_subscription(bot: Bot, user_id: int, channel_username: str) -> bool:
    """Проверяет, подписан ли юзер на канал"""
    try:
        if not channel_username.startswith("@"):
            channel_username = "@" + channel_username
        member = await bot.get_chat_member(chat_id=channel_username, user_id=user_id)
        return member.status in ("member", "administrator", "creator")
    except TelegramBadRequest as e:
        # Бот не админ канала или канал не существует
        print(f"⚠️ check_subscription error for {channel_username}: {e}")
        return False
    except Exception as e:
        print(f"⚠️ check_subscription exception: {e}")
        return False


# ===== ФОРМАТИРОВАНИЕ =====

def fmt_coins(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " 💰"


def fmt_date(iso: str) -> str:
    """2025-09-20T21:34:00 → 20.09.2025 21:34"""
    if not iso:
        return "—"
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return iso[:16]


def fmt_time(iso: str) -> str:
    if not iso:
        return "—"
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%H:%M")
    except Exception:
        return iso[11:16]


# ===== ЛОГИРОВАНИЕ (для консоли) =====

def log(msg: str, emoji: str = "ℹ️"):
    print(f"{emoji} {msg}")


# ===== ВАЛИДАЦИЯ =====

def validate_nickname(nick: str) -> tuple[bool, str]:
    """Проверка ника. Возвращает (ok, сообщение)"""
    from config import NICKNAME_MIN, NICKNAME_MAX
    if not nick:
        return False, "Ник пуст"
    if len(nick) < NICKNAME_MIN:
        return False, f"Минимум {NICKNAME_MIN} символа"
    if len(nick) > NICKNAME_MAX:
        return False, f"Максимум {NICKNAME_MAX} символов"
    return True, ""


def validate_standoff_id(sid: str) -> tuple[bool, str]:
    if not sid:
        return False, "ID пуст"
    if not sid.isdigit():
        return False, "ID должен быть числом"
    if len(sid) < 5 or len(sid) > 12:
        return False, "ID от 5 до 12 цифр"
    return True, ""
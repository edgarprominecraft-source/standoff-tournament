from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
from config import WEBAPP_URL


# ===== ГЛАВНОЕ МЕНЮ (обычные игроки) =====

def main_menu_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🏆 Открыть турнир", web_app=WebAppInfo(url=WEBAPP_URL))
    kb.button(text="👤 Профиль", callback_data="menu:profile")
    kb.button(text="📊 Рейтинг", callback_data="menu:rating")
    kb.button(text="ℹ️ Инфо", callback_data="menu:info")
    kb.adjust(1, 2, 1)
    return kb.as_markup()


def webapp_only_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🏆 Открыть турнир", web_app=WebAppInfo(url=WEBAPP_URL))
    return kb.as_markup()


# ===== АДМИН-ПАНЕЛЬ =====

def admin_menu_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="📊 Статистика", callback_data="admin:stats")
    kb.button(text="🏆 Турниры", callback_data="admin:tournaments")
    kb.button(text="🔗 Спонсоры", callback_data="admin:sponsors")
    kb.button(text="⚔️ Матчи", callback_data="admin:matches")
    kb.button(text="👥 Игроки", callback_data="admin:users")
    kb.button(text="💰 Монеты", callback_data="admin:coins")
    kb.button(text="📢 Рассылка", callback_data="admin:broadcast")
    kb.button(text="🎫 Промокоды", callback_data="admin:promo")
    kb.button(text="🚫 Банворды", callback_data="admin:words")
    kb.button(text="📜 Логи", callback_data="admin:logs")
    kb.button(text="⚙️ Настройки", callback_data="admin:settings")
    kb.adjust(2, 2, 2, 2, 2, 1)
    return kb.as_markup()


def admin_back_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    return kb.as_markup()


# ===== ТУРНИРЫ =====

def tournaments_kb(tournaments: list) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for t in tournaments[:20]:
        emoji = "🟢" if t.get("status") == "waiting" else "🔵" if t.get("status") == "active" else "⚫"
        kb.button(text=f"{emoji} {t['name'][:30]}", callback_data=f"admin:t:{t['id']}")
    kb.button(text="➕ Создать турнир", callback_data="admin:t:new")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
    return kb.as_markup()


def tournament_detail_kb(t_id: int, status: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if status == "waiting":
        kb.button(text="▶️ Форс-старт", callback_data=f"admin:t:force_start:{t_id}")
    if status in ("waiting", "active"):
        kb.button(text="🏁 Закончить турнир", callback_data=f"admin:t:finish:{t_id}")
    kb.button(text="🔗 Спонсоры", callback_data=f"admin:t:sponsors:{t_id}")
    kb.button(text="✏️ Переименовать", callback_data=f"admin:t:rename:{t_id}")
    kb.button(text="❌ Удалить", callback_data=f"admin:t:delete:{t_id}")
    kb.button(text="⬅️ К списку", callback_data="admin:tournaments")
    kb.adjust(1, 1, 1, 1, 1, 1)
    return kb.as_markup()


def create_tournament_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:tournaments")
    return kb.as_markup()


def confirm_delete_kb(action: str, item_id: int) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Да, удалить", callback_data=f"confirm:delete:{action}:{item_id}")
    kb.button(text="❌ Отмена", callback_data="admin:menu")
    kb.adjust(1, 1)
    return kb.as_markup()


# ===== СПОНСОРЫ =====

def sponsors_kb(sponsors: list) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for s in sponsors[:15]:
        kb.button(text=f"🔗 {s['name'][:25]}", callback_data=f"admin:s:{s['id']}")
    kb.button(text="➕ Добавить спонсора", callback_data="admin:s:new")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
    return kb.as_markup()


def sponsor_detail_kb(s_id: int) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✏️ Изменить", callback_data=f"admin:s:edit:{s_id}")
    kb.button(text="❌ Удалить", callback_data=f"admin:s:delete:{s_id}")
    kb.button(text="⬅️ К списку", callback_data="admin:sponsors")
    kb.adjust(1, 1, 1)
    return kb.as_markup()


def tournament_sponsors_kb(t_id: int, all_sponsors: list, attached_ids: list) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for s in all_sponsors:
        attached = s["id"] in attached_ids
        prefix = "✅ " if attached else "➕ "
        kb.button(text=f"{prefix}{s['name'][:25]}", callback_data=f"admin:ts:toggle:{t_id}:{s['id']}")
    kb.button(text="⬅️ Назад", callback_data=f"admin:t:{t_id}")
    kb.adjust(1)
    return kb.as_markup()


# ===== ИГРОКИ =====

def user_detail_kb(user_id: int, role: str | None, banned: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()

    # Роли
    kb.button(text="👑 Сделать админом", callback_data=f"admin:u:role:{user_id}:admin")
    kb.button(text="🛡 Модератор", callback_data=f"admin:u:role:{user_id}:moderator")
    kb.button(text="🎧 Поддержка", callback_data=f"admin:u:role:{user_id}:support")
    kb.button(text="🚫 Снять роль", callback_data=f"admin:u:role:{user_id}:none")

    # Монеты и бан
    kb.button(text="💰 Выдать монеты", callback_data=f"admin:u:coins:{user_id}")
    kb.button(text="📜 Логи игрока", callback_data=f"admin:u:logs:{user_id}")
    kb.button(text="✏️ Изменить ник", callback_data=f"admin:u:nick:{user_id}")
    kb.button(text="🗑 Очистить Standoff ID", callback_data=f"admin:u:clearid:{user_id}")

    if banned:
        kb.button(text="✅ Разбанить", callback_data=f"admin:u:unban:{user_id}")
    else:
        kb.button(text="🚫 Забанить", callback_data=f"admin:u:ban:{user_id}")

    kb.button(text="⬅️ Назад", callback_data="admin:users")
    kb.adjust(2, 2, 1, 1, 1, 1, 1, 1)
    return kb.as_markup()


def users_menu_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🔍 Поиск игрока", callback_data="admin:u:search")
    kb.button(text="🚫 Забаненные", callback_data="admin:u:banned")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1, 1)
    return kb.as_markup()


# ===== ПОДТВЕРЖДЕНИЯ =====

def confirm_kb(action: str, target: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Подтвердить", callback_data=f"confirm:{action}:{target}")
    kb.button(text="❌ Отмена", callback_data="admin:menu")
    kb.adjust(2)
    return kb.as_markup()


# ===== ИГРОКИ — СОГЛАСИЕ С ПРАВИЛАМИ =====

def rules_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Согласен с правилами", callback_data="rules:accept")
    return kb.as_markup()
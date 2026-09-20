from aiogram import Router, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import WebAppInfo

from config import WEBAPP_URL, ROLE_BADGES
from db import get_user, get_top_users, upsert_user
from keyboards import main_menu_kb, admin_menu_kb, webapp_only_kb
from utils import format_name_with_role, escape_html, check_admin

router = Router()


@router.message(Command("start"))
async def cmd_start(message: types.Message):
    user = message.from_user
    if not user:
        return

    await upsert_user(user.id, user.username, user.first_name)

    profile = await get_user(user.id)
    if not profile:
        await message.answer("Ошибка создания профиля. Попробуй позже.")
        return

    nick = profile.get("nickname") or profile.get("first_name") or "игрок"
    role = profile.get("role")
    balance = profile.get("balance") or 0

    role_line = f"\n{ROLE_BADGES[role]}" if role in ROLE_BADGES else ""

    text = (
        f"Привет, <b>{escape_html(nick)}</b>!{role_line}\n\n"
        f"Это бот турниров <b>Standoff 2 (2х2)</b>.\n\n"
        f"🎮 Участвуй в турнирах\n"
        f"💰 Получай монеты даже за проигрыш\n"
        f"🏆 Собирай команду с другом\n\n"
        f"💰 Баланс: <b>{balance}</b> монет\n\n"
        f"Жми кнопку, чтобы начать:"
    )

    await message.answer(text, reply_markup=main_menu_kb())


@router.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(
        "📖 <b>Команды</b>\n\n"
        "/start — главное меню\n"
        "/profile — твой профиль\n"
        "/rating — топ игроков\n"
        "/help — эта справка\n"
        "/admin — админ-панель (только для админов)"
    )


@router.message(Command("profile"))
async def cmd_profile(message: types.Message):
    user = message.from_user
    if not user:
        return

    profile = await get_user(user.id)
    if not profile:
        await message.answer("Профиль не найден. Напиши /start.")
        return

    nick = profile.get("nickname") or profile.get("first_name") or "Игрок"
    standoff_id = profile.get("standoff_id") or "не указан"
    balance = profile.get("balance") or 0
    wins = profile.get("wins") or 0
    losses = profile.get("losses") or 0
    role = profile.get("role")

    name_line = format_name_with_role(nick, role)

    text = (
        f"👤 {name_line}\n"
        f"🆔 Standoff ID: <code>{standoff_id}</code>\n"
        f"💰 Баланс: <b>{balance}</b> монет\n\n"
        f"🏆 Побед: <b>{wins}</b>\n"
        f"💀 Поражений: <b>{losses}</b>"
    )

    kb = InlineKeyboardBuilder()
    kb.button(text="✏️ Изменить профиль", web_app=WebAppInfo(url=WEBAPP_URL))
    await message.answer(text, reply_markup=kb.as_markup())


@router.message(Command("rating"))
async def cmd_rating(message: types.Message):
    top = await get_top_users(10)

    if not top:
        await message.answer("Пока никого нет в рейтинге.")
        return

    lines = ["🏆 <b>Топ-10 игроков</b>\n"]
    medals = ["🥇", "🥈", "🥉"]
    for i, r in enumerate(top):
        prefix = medals[i] if i < 3 else f"{i+1}."
        name = r.get("nickname") or r.get("first_name") or "Игрок"
        role = r.get("role")
        role_emoji = ""
        if role == "admin":
            role_emoji = "👑 "
        elif role == "moderator":
            role_emoji = "🛡 "
        elif role == "support":
            role_emoji = "🎧 "
        balance = r.get("balance") or 0
        lines.append(f"{prefix} {role_emoji}{escape_html(name)} — <b>{balance}</b> 💰")

    await message.answer("\n".join(lines))


@router.message(Command("admin"))
async def cmd_admin(message: types.Message):
    user = message.from_user
    if not user:
        return

    if not await check_admin(user.id):
        await message.answer("🚫 Нет доступа")
        return

    await message.answer(
        "🎛 <b>АДМИН-ПАНЕЛЬ</b>\n\n"
        "Выбери раздел:",
        reply_markup=admin_menu_kb()
    )


@router.callback_query(F.data == "menu:profile")
async def cb_menu_profile(call: types.CallbackQuery):
    await call.message.answer("Напиши /profile")
    await call.answer()


@router.callback_query(F.data == "menu:rating")
async def cb_menu_rating(call: types.CallbackQuery):
    await call.message.answer("Напиши /rating")
    await call.answer()


@router.callback_query(F.data == "menu:info")
async def cb_menu_info(call: types.CallbackQuery):
    await call.message.answer(
        "ℹ️ <b>О проекте</b>\n\n"
        "Standoff Cup — платформа турниров 2х2.\n"
        "Регистрируйся, играй, зарабатывай монеты.\n\n"
        "📞 Контакты: @HePastic"
    )
    await call.answer()


@router.message(F.text)
async def any_text(message: types.Message):
    await message.answer(
        "Открой приложение, чтобы участвовать в турнирах:",
        reply_markup=webapp_only_kb()
    )
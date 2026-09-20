from datetime import datetime
from aiogram import Router, types, F, Bot
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from config import WEBAPP_URL, ROLE_BADGES, ADMIN_ID
from db import (
    sb, get_user, get_all_tournaments, get_tournament,
    get_sponsors, get_tournament_sponsors, get_stats,
    update_user, log_action, get_banned_words, clean_banned_words,
    get_user_by_username, get_user_by_standoff_id, get_recent_actions,
)
from keyboards import (
    admin_menu_kb, admin_back_kb, tournaments_kb,
    tournament_detail_kb, create_tournament_kb,
    sponsors_kb, sponsor_detail_kb, tournament_sponsors_kb,
    users_menu_kb, user_detail_kb, confirm_delete_kb, confirm_kb
)
from utils import check_admin, escape_html, fmt_coins, fmt_date, safe_edit, log

router = Router()


# ===== FSM состояния =====

class TournamentForm(StatesGroup):
    name = State()
    sponsor_channel = State()
    max_teams = State()


class SponsorForm(StatesGroup):
    name = State()
    channel_username = State()
    channel_link = State()


class PlayerSearch(StatesGroup):
    query = State()


class CoinsAmount(StatesGroup):
    user_id = State()
    amount = State()


class BroadcastForm(StatesGroup):
    text = State()


class NickForm(StatesGroup):
    user_id = State()
    new_nick = State()


class WordForm(StatesGroup):
    word = State()


class PromoForm(StatesGroup):
    code = State()
    coins = State()
    uses = State()


class BanForm(StatesGroup):
    user_id = State()
    reason = State()


# ===== Guard =====

async def guard(obj):
    user_id = obj.from_user.id if hasattr(obj, "from_user") and obj.from_user else 0
    if not await check_admin(user_id):
        if isinstance(obj, types.CallbackQuery):
            await obj.answer("Нет доступа", show_alert=True)
        else:
            await obj.answer("🚫 Нет доступа")
        return False
    return True


# ========================================
# ========== ГЛАВНОЕ МЕНЮ ===============
# ========================================

@router.callback_query(F.data == "admin:menu")
async def cb_admin_menu(call: types.CallbackQuery):
    if not await guard(call):
        return
    await safe_edit(call.message, "🎛 <b>АДМИН-ПАНЕЛЬ</b>\n\nВыбери раздел:", admin_menu_kb())
    await call.answer()


# ========================================
# ========== СТАТИСТИКА =================
# ========================================

@router.callback_query(F.data == "admin:stats")
async def cb_admin_stats(call: types.CallbackQuery):
    if not await guard(call):
        return
    stats = await get_stats()
    from db import get_top_users
    top = await get_top_users(3)

    text = (
        f"📊 <b>ОБЩАЯ СТАТИСТИКА</b>\n\n"
        f"👥 Игроков: <b>{stats['users']}</b>\n"
        f"🏆 Турниров: <b>{stats['tournaments']}</b>\n"
        f"⚔️ Матчей: <b>{stats['matches']}</b>\n\n"
    )
    if top:
        text += "🥇 <b>Топ игроков:</b>\n"
        for i, u in enumerate(top, 1):
            name = u.get("nickname") or u.get("first_name") or "Игрок"
            balance = u.get("balance") or 0
            text += f"{i}. {escape_html(name)} — {balance} 💰\n"

    await safe_edit(call.message, text, admin_back_kb())
    await call.answer()


# ========================================
# ========== ТУРНИРЫ ====================
# ========================================

@router.callback_query(F.data == "admin:tournaments")
async def cb_tournaments(call: types.CallbackQuery):
    if not await guard(call):
        return
    tournaments = await get_all_tournaments()
    if not tournaments:
        kb = InlineKeyboardBuilder()
        kb.button(text="➕ Создать турнир", callback_data="admin:t:new")
        kb.button(text="⬅️ Назад", callback_data="admin:menu")
        kb.adjust(1, 1)
        await safe_edit(call.message, "🏆 <b>Турниры</b>\n\nПока нет ни одного турнира.", kb.as_markup())
        await call.answer()
        return
    await safe_edit(call.message, f"🏆 <b>Турниры</b> ({len(tournaments)})\n\nВыбери турнир:", tournaments_kb(tournaments))
    await call.answer()


@router.callback_query(F.data == "admin:t:new")
async def cb_tournament_new(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(TournamentForm.name)
    await safe_edit(
        call.message,
        "➕ <b>Создание турнира</b>\n\nШаг 1/3. Напиши <b>название</b> турнира:",
        create_tournament_kb()
    )
    await call.answer()


@router.message(TournamentForm.name)
async def tourn_name(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    name = message.text.strip()
    if len(name) < 3 or len(name) > 60:
        await message.answer("❌ Название от 3 до 60 символов:")
        return

    data = await state.get_data()
    if data.get("rename_t_id"):
        t_id = data["rename_t_id"]
        await state.clear()
        sb.table("tournaments").update({"name": name}).eq("id", t_id).execute()
        await message.answer(f"✅ Переименовано в <b>{escape_html(name)}</b>", reply_markup=admin_menu_kb())
        return

    await state.update_data(name=name)
    await state.set_state(TournamentForm.sponsor_channel)
    await message.answer(
        "Шаг 2/3. Напиши <b>username спонсора</b> (канал):\n\n"
        "Например: <code>@standoff_news</code>\n"
        "Или отправь <code>-</code> если спонсора нет:"
    )


@router.message(TournamentForm.sponsor_channel)
async def tourn_sponsor(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    value = message.text.strip()
    if value != "-" and not value.startswith("@"):
        await message.answer("❌ Username с @. Или <code>-</code>:")
        return
    await state.update_data(sponsor_channel=None if value == "-" else value)
    await state.set_state(TournamentForm.max_teams)
    await message.answer(
        "Шаг 3/3. Сколько <b>максимум команд</b>?\n\n"
        "Например: <code>25</code>, <code>16</code>, <code>8</code>, <code>4</code>"
    )


@router.message(TournamentForm.max_teams)
async def tourn_max(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    try:
        max_teams = int(message.text.strip())
        if max_teams < 2 or max_teams > 64:
            raise ValueError
    except ValueError:
        await message.answer("❌ Число от 2 до 64:")
        return

    data = await state.get_data()
    await state.clear()

    try:
        sb.table("tournaments").insert({
            "name": data["name"],
            "sponsor_channel": data.get("sponsor_channel"),
            "max_teams": max_teams,
            "status": "waiting",
        }).execute()

        await message.answer(
            f"✅ Турнир <b>{escape_html(data['name'])}</b> создан!\n\n"
            f"👥 Макс. команд: {max_teams}\n"
            f"🔗 Спонсор: {data.get('sponsor_channel') or 'нет'}",
            reply_markup=admin_menu_kb()
        )
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


@router.callback_query(F.data.startswith("admin:t:force_start:"))
async def cb_tournament_force_start(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    t = await get_tournament(t_id)
    if not t:
        await call.answer("Турнир не найден", show_alert=True)
        return

    sb.table("tournaments").update({"status": "active"}).eq("id", t_id).execute()
    teams_res = sb.table("teams").select("id").eq("tournament_id", t_id).execute()
    teams_count = len(teams_res.data or [])

    await call.answer("Турнир запущен!", show_alert=True)
    await safe_edit(
        call.message,
        f"🚀 Турнир <b>{escape_html(t['name'])}</b> запущен!\n\n"
        f"👥 Участвует команд: <b>{teams_count}</b>",
        admin_back_kb()
    )


@router.callback_query(F.data.startswith("admin:t:finish:"))
async def cb_tournament_finish(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    t = await get_tournament(t_id)
    if not t:
        await call.answer("Турнир не найден", show_alert=True)
        return

    kb = InlineKeyboardBuilder()
    kb.button(text="🏁 Да, закончить", callback_data=f"confirm:finish_tournament:{t_id}")
    kb.button(text="❌ Отмена", callback_data=f"admin:t:{t_id}")
    kb.adjust(1, 1)

    await safe_edit(
        call.message,
        f"🏁 <b>Закончить турнир?</b>\n\n<b>{escape_html(t['name'])}</b>\n\n"
        f"Победителям начислятся монеты.",
        kb.as_markup()
    )
    await call.answer()


@router.callback_query(F.data.startswith("confirm:finish_tournament:"))
async def cb_confirm_finish_tournament(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    from config import COINS_WIN, COINS_FINAL

    matches_res = sb.table("matches").select("*").eq("tournament_id", t_id).order("id", desc=True).limit(1).execute()
    if matches_res.data:
        final_match = matches_res.data[0]
        if final_match.get("winner_id"):
            team_res = sb.table("teams").select("*").eq("id", final_match["winner_id"]).maybe_single().execute()
            if team_res.data:
                team = team_res.data
                for pid in [team.get("player1_id"), team.get("player2_id")]:
                    if pid:
                        u = await get_user(pid)
                        if u:
                            await update_user(pid, balance=(u.get("balance") or 0) + COINS_WIN, wins=(u.get("wins") or 0) + 1)

        other_id = final_match.get("team2_id") if final_match.get("winner_id") == final_match.get("team1_id") else final_match.get("team1_id")
        if other_id:
            team_res = sb.table("teams").select("*").eq("id", other_id).maybe_single().execute()
            if team_res.data:
                team = team_res.data
                for pid in [team.get("player1_id"), team.get("player2_id")]:
                    if pid:
                        u = await get_user(pid)
                        if u:
                            await update_user(pid, balance=(u.get("balance") or 0) + COINS_FINAL, losses=(u.get("losses") or 0) + 1)

    sb.table("tournaments").update({"status": "finished"}).eq("id", t_id).execute()
    await call.answer("Готово", show_alert=True)
    await safe_edit(call.message, "🏁 Турнир завершён, монеты начислены.", admin_back_kb())


@router.callback_query(F.data.startswith("admin:t:delete:"))
async def cb_tournament_delete(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    t = await get_tournament(t_id)
    if not t:
        await call.answer("Не найден", show_alert=True)
        return
    await safe_edit(
        call.message,
        f"❌ <b>Удалить турнир?</b>\n\n<b>{escape_html(t['name'])}</b>\n\n⚠️ Всё удалится безвозвратно.",
        confirm_delete_kb("tournament", t_id)
    )
    await call.answer()


@router.callback_query(F.data.startswith("confirm:delete:tournament:"))
async def cb_confirm_delete_tournament(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    sb.table("tournaments").delete().eq("id", t_id).execute()
    await call.answer("Удалено", show_alert=True)
    await safe_edit(call.message, "❌ Турнир удалён.", admin_back_kb())


@router.callback_query(F.data.startswith("admin:t:rename:"))
async def cb_tournament_rename(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    await state.update_data(rename_t_id=t_id)
    await state.set_state(TournamentForm.name)
    await safe_edit(call.message, "✏️ Напиши <b>новое название</b>:", create_tournament_kb())
    await call.answer()


@router.callback_query(F.data.startswith("admin:t:sponsors:"))
async def cb_tournament_sponsors(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    all_sponsors = await get_sponsors()
    attached = await get_tournament_sponsors(t_id)
    attached_ids = [s["id"] for s in attached]

    if not all_sponsors:
        await safe_edit(call.message, "🔗 Сначала добавь спонсора в разделе <b>Спонсоры</b>.", admin_back_kb())
        await call.answer()
        return

    await safe_edit(
        call.message,
        f"🔗 <b>Спонсоры турнира</b>\n\nНажми чтобы привязать / отвязать.\nПривязано: <b>{len(attached_ids)}</b>",
        tournament_sponsors_kb(t_id, all_sponsors, attached_ids)
    )
    await call.answer()


@router.callback_query(F.data.startswith("admin:ts:toggle:"))
async def cb_toggle_sponsor(call: types.CallbackQuery):
    if not await guard(call):
        return
    parts = call.data.split(":")
    t_id = int(parts[3])
    s_id = int(parts[4])

    existing = sb.table("tournament_sponsors").select("id").eq("tournament_id", t_id).eq("sponsor_id", s_id).maybe_single().execute()
    if existing.data:
        sb.table("tournament_sponsors").delete().eq("id", existing.data["id"]).execute()
        await call.answer("❌ Отвязано")
    else:
        sb.table("tournament_sponsors").insert({"tournament_id": t_id, "sponsor_id": s_id}).execute()
        await call.answer("✅ Привязано")

    all_sponsors = await get_sponsors()
    attached = await get_tournament_sponsors(t_id)
    attached_ids = [s["id"] for s in attached]

    await safe_edit(
        call.message,
        f"🔗 <b>Спонсоры турнира</b>\n\nНажми чтобы привязать / отвязать.\nПривязано: <b>{len(attached_ids)}</b>",
        tournament_sponsors_kb(t_id, all_sponsors, attached_ids)
    )


# ========================================
# ========== СПОНСОРЫ ===================
# ========================================

@router.callback_query(F.data == "admin:sponsors")
async def cb_sponsors(call: types.CallbackQuery):
    if not await guard(call):
        return
    sponsors = await get_sponsors()
    if not sponsors:
        kb = InlineKeyboardBuilder()
        kb.button(text="➕ Добавить спонсора", callback_data="admin:s:new")
        kb.button(text="⬅️ Назад", callback_data="admin:menu")
        kb.adjust(1, 1)
        await safe_edit(call.message, "🔗 <b>Спонсоры</b>\n\nПока нет ни одного спонсора.", kb.as_markup())
        await call.answer()
        return
    await safe_edit(call.message, f"🔗 <b>Спонсоры</b> ({len(sponsors)})", sponsors_kb(sponsors))
    await call.answer()


@router.callback_query(F.data == "admin:s:new")
async def cb_sponsor_new(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(SponsorForm.name)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:sponsors")
    await safe_edit(call.message, "➕ <b>Новый спонсор</b>\n\nШаг 1/3. Название спонсора:", kb.as_markup())
    await call.answer()


@router.message(SponsorForm.name)
async def sponsor_name(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    name = message.text.strip()
    if len(name) < 2 or len(name) > 40:
        await message.answer("❌ От 2 до 40 символов:")
        return
    await state.update_data(name=name)
    await state.set_state(SponsorForm.channel_username)
    await message.answer("Шаг 2/3. <b>Username канала</b> спонсора:\n\nНапример: <code>@standoff_news</code>")


@router.message(SponsorForm.channel_username)
async def sponsor_channel(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    value = message.text.strip()
    if not value.startswith("@"):
        await message.answer("❌ Username должен начинаться с @:")
        return
    await state.update_data(channel_username=value)
    await state.set_state(SponsorForm.channel_link)
    await message.answer("Шаг 3/3. <b>Ссылка на канал</b>:\n\nНапример: <code>https://t.me/standoff_news</code>")


@router.message(SponsorForm.channel_link)
async def sponsor_link(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    link = message.text.strip()
    if not link.startswith("http"):
        await message.answer("❌ Ссылка должна начинаться с http:")
        return

    data = await state.get_data()
    await state.clear()

    try:
        sb.table("sponsors").insert({
            "name": data["name"],
            "channel_username": data["channel_username"],
            "channel_link": link,
        }).execute()
        await message.answer(
            f"✅ Спонсор <b>{escape_html(data['name'])}</b> добавлен!\n\n"
            f"Канал: {data['channel_username']}",
            reply_markup=admin_menu_kb()
        )
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


@router.callback_query(F.data.startswith("admin:s:") & ~F.data.startswith("admin:s:new"))
async def cb_sponsor_detail(call: types.CallbackQuery):
    if not await guard(call):
        return
    try:
        s_id = int(call.data.split(":")[2])
    except (IndexError, ValueError):
        await call.answer("Ошибка", show_alert=True)
        return

    res = sb.table("sponsors").select("*").eq("id", s_id).maybe_single().execute()
    if not res.data:
        await call.answer("Не найден", show_alert=True)
        return
    s = res.data

    text = (
        f"🔗 <b>{escape_html(s['name'])}</b>\n\n"
        f"📢 Канал: {s['channel_username']}\n"
        f"🔗 Ссылка: {s['channel_link']}\n"
        f"📅 Добавлен: {fmt_date(s.get('created_at'))}"
    )
    await safe_edit(call.message, text, sponsor_detail_kb(s_id))
    await call.answer()


@router.callback_query(F.data.startswith("admin:s:delete:"))
async def cb_sponsor_delete(call: types.CallbackQuery):
    if not await guard(call):
        return
    s_id = int(call.data.split(":")[-1])
    res = sb.table("sponsors").select("name").eq("id", s_id).maybe_single().execute()
    name = res.data["name"] if res.data else "?"
    await safe_edit(
        call.message,
        f"❌ <b>Удалить спонсора?</b>\n\n<b>{escape_html(name)}</b>",
        confirm_delete_kb("sponsor", s_id)
    )
    await call.answer()


@router.callback_query(F.data.startswith("confirm:delete:sponsor:"))
async def cb_confirm_delete_sponsor(call: types.CallbackQuery):
    if not await guard(call):
        return
    s_id = int(call.data.split(":")[-1])
    sb.table("sponsors").delete().eq("id", s_id).execute()
    await call.answer("Удалено", show_alert=True)
    await safe_edit(call.message, "❌ Спонсор удалён.", admin_back_kb())


# ========================================
# ========== ИГРОКИ =====================
# ========================================

@router.callback_query(F.data == "admin:users")
async def cb_users(call: types.CallbackQuery):
    if not await guard(call):
        return
    await safe_edit(call.message, "👥 <b>Игроки</b>\n\nВыбери действие:", users_menu_kb())
    await call.answer()


@router.callback_query(F.data == "admin:u:search")
async def cb_user_search(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(PlayerSearch.query)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:users")
    await safe_edit(call.message, "🔍 Отправь <b>user_id</b>, <b>@username</b> или <b>Standoff ID</b>:", kb.as_markup())
    await call.answer()


@router.message(PlayerSearch.query)
async def user_search_result(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    q = message.text.strip()
    await state.clear()

    user = None
    if q.startswith("@") or not q.isdigit():
        user = await get_user_by_username(q.lstrip("@"))
    elif q.isdigit() and len(q) < 15:
        user = await get_user_by_standoff_id(q)
    else:
        user = await get_user(int(q))

    if not user:
        await message.answer("❌ Не найден", reply_markup=admin_menu_kb())
        return

    nick = user.get("nickname") or user.get("first_name") or "Игрок"
    role = user.get("role")
    role_badge = ROLE_BADGES.get(role, "") if role else ""
    banned = user.get("banned") or False

    text = (
        f"👤 <b>{escape_html(nick)}</b> {role_badge}\n\n"
        f"🆔 user_id: <code>{user['user_id']}</code>\n"
        f"📛 Username: @{user.get('username') or '—'}\n"
        f"🎮 Standoff ID: {user.get('standoff_id') or '—'}\n"
        f"💰 Баланс: <b>{user.get('balance') or 0}</b>\n"
        f"🏆 W/L: {user.get('wins') or 0} / {user.get('losses') or 0}\n"
        + (f"🚫 <b>ЗАБАНЕН</b>: {user.get('ban_reason') or 'без причины'}\n" if banned else "")
    )
    await message.answer(text, reply_markup=user_detail_kb(user["user_id"], role, banned))


@router.callback_query(F.data.startswith("admin:u:role:"))
async def cb_user_role(call: types.CallbackQuery):
    if not await guard(call):
        return
    parts = call.data.split(":")
    user_id = int(parts[3])
    new_role = parts[4]
    if new_role == "none":
        new_role = None

    await update_user(user_id, role=new_role)
    await call.answer(f"✅ Роль: {new_role or 'снята'}", show_alert=True)


@router.callback_query(F.data.startswith("admin:u:ban:"))
async def cb_user_ban(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])
    await state.update_data(ban_user_id=user_id)
    await state.set_state(BanForm.reason)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:users")
    await safe_edit(call.message, "🚫 Напиши <b>причину бана</b>:", kb.as_markup())
    await call.answer()


@router.message(BanForm.reason)
async def ban_reason(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    data = await state.get_data()
    user_id = data.get("ban_user_id")
    await state.clear()

    await update_user(user_id, banned=True, ban_reason=message.text.strip())
    await message.answer(f"🚫 Игрок <code>{user_id}</code> забанен.", reply_markup=admin_menu_kb())


@router.callback_query(F.data.startswith("admin:u:unban:"))
async def cb_user_unban(call: types.CallbackQuery):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])
    await update_user(user_id, banned=False, ban_reason=None)
    await call.answer("✅ Разбанен", show_alert=True)


@router.callback_query(F.data.startswith("admin:u:coins:"))
async def cb_user_coins(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])
    await state.update_data(coins_user_id=user_id)
    await state.set_state(CoinsAmount.amount)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:users")
    await safe_edit(call.message, "💰 Сколько монет выдать?\n\nМожно с минусом чтобы забрать. Например: <code>-100</code>", kb.as_markup())
    await call.answer()


@router.message(CoinsAmount.amount)
async def coins_amount(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    try:
        amount = int(message.text.strip())
    except ValueError:
        await message.answer("❌ Введи число:")
        return

    data = await state.get_data()
    user_id = data.get("coins_user_id")
    await state.clear()

    u = await get_user(user_id)
    if not u:
        await message.answer("❌ Игрок не найден")
        return

    new_bal = (u.get("balance") or 0) + amount
    if new_bal < 0:
        new_bal = 0
    await update_user(user_id, balance=new_bal)
    await message.answer(f"✅ Баланс игрока: <b>{new_bal}</b>", reply_markup=admin_menu_kb())


@router.callback_query(F.data.startswith("admin:u:clearid:"))
async def cb_user_clearid(call: types.CallbackQuery):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])
    await update_user(user_id, standoff_id=None)
    await call.answer("🗑 Standoff ID очищен", show_alert=True)


@router.callback_query(F.data.startswith("admin:u:nick:"))
async def cb_user_nick(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])
    await state.update_data(nick_user_id=user_id)
    await state.set_state(NickForm.new_nick)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:users")
    await safe_edit(call.message, "✏️ Напиши <b>новый ник</b>:", kb.as_markup())
    await call.answer()


@router.message(NickForm.new_nick)
async def nick_change(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    data = await state.get_data()
    user_id = data.get("nick_user_id")
    await state.clear()

    new_nick = message.text.strip()
    if len(new_nick) < 3 or len(new_nick) > 16:
        await message.answer("❌ Ник 3-16 символов")
        return

    banned = await get_banned_words()
    cleaned = clean_banned_words(new_nick, banned)
    await update_user(user_id, nickname=cleaned, last_nick_change=datetime.now().isoformat())
    await message.answer(f"✅ Ник изменён на <b>{escape_html(cleaned)}</b>", reply_markup=admin_menu_kb())


@router.callback_query(F.data.startswith("admin:u:logs:"))
async def cb_user_logs(call: types.CallbackQuery):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])
    actions = await get_recent_actions(20, user_id)

    if not actions:
        await safe_edit(call.message, "📜 Нет действий", admin_back_kb())
        await call.answer()
        return

    text = f"📜 <b>Логи игрока</b> <code>{user_id}</code>\n\n"
    for a in actions:
        action = a.get("action", "?")
        created = fmt_date(a.get("created_at"))
        text += f"• <b>{action}</b> · {created}\n"

    await safe_edit(call.message, text[:4000], admin_back_kb())
    await call.answer()


@router.callback_query(F.data == "admin:u:banned")
async def cb_banned_users(call: types.CallbackQuery):
    if not await guard(call):
        return
    res = sb.table("users").select("*").eq("banned", True).limit(20).execute()
    users = res.data or []

    if not users:
        await safe_edit(call.message, "🚫 Забаненных нет", admin_back_kb())
        await call.answer()
        return

    text = "🚫 <b>Забаненные</b>\n\n"
    for u in users:
        nick = u.get("nickname") or u.get("first_name") or "?"
        text += f"• {escape_html(nick)} (<code>{u['user_id']}</code>)\n"

    await safe_edit(call.message, text, admin_back_kb())
    await call.answer()


# ========================================
# ========== МОНЕТЫ =====================
# ========================================

@router.callback_query(F.data == "admin:coins")
async def cb_coins_menu(call: types.CallbackQuery):
    if not await guard(call):
        return
    kb = InlineKeyboardBuilder()
    kb.button(text="🎁 Массовый бонус", callback_data="admin:coins:mass")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1)
    await safe_edit(call.message, "💰 <b>Монеты</b>", kb.as_markup())
    await call.answer()


@router.callback_query(F.data == "admin:coins:mass")
async def cb_coins_mass(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(CoinsAmount.amount)
    await state.update_data(mass=True)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:coins")
    await safe_edit(call.message, "🎁 Сколько монет выдать <b>всем активным</b>?", kb.as_markup())
    await call.answer()


# ========================================
# ========== БАНВОРДЫ ===================
# ========================================

@router.callback_query(F.data == "admin:words")
async def cb_words(call: types.CallbackQuery):
    if not await guard(call):
        return
    words = await get_banned_words()
    text = f"🚫 <b>Запрещённые слова</b> ({len(words)})\n\n"
    text += ", ".join(words) if words else "Нет слов"
    text += "\n\nОтправь новое слово чтобы добавить."

    kb = InlineKeyboardBuilder()
    kb.button(text="➕ Добавить слово", callback_data="admin:words:add")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1)

    await safe_edit(call.message, text[:4000], kb.as_markup())
    await call.answer()


@router.callback_query(F.data == "admin:words:add")
async def cb_words_add(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(WordForm.word)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:words")
    await safe_edit(call.message, "📝 Отправь слово:", kb.as_markup())
    await call.answer()


@router.message(WordForm.word)
async def word_add(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    word = message.text.strip().lower()
    await state.clear()
    try:
        sb.table("banned_words").insert({"word": word}).execute()
        await message.answer(f"✅ Слово <code>{word}</code> добавлено", reply_markup=admin_menu_kb())
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


# ========================================
# ========== ПРОМОКОДЫ ==================
# ========================================

@router.callback_query(F.data == "admin:promo")
async def cb_promo(call: types.CallbackQuery):
    if not await guard(call):
        return
    res = sb.table("promo_codes").select("*").order("created_at", desc=True).limit(20).execute()
    codes = res.data or []

    text = "🎫 <b>Промокоды</b>\n\n"
    if codes:
        for c in codes:
            text += f"<code>{c['code']}</code> — {c['coins']} 💰 ({c['uses_left']} исп.)\n"
    else:
        text += "Пока нет промокодов."

    kb = InlineKeyboardBuilder()
    kb.button(text="➕ Создать промокод", callback_data="admin:promo:new")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1)

    await safe_edit(call.message, text[:4000], kb.as_markup())
    await call.answer()


@router.callback_query(F.data == "admin:promo:new")
async def cb_promo_new(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(PromoForm.code)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:promo")
    await safe_edit(call.message, "🎫 Напиши <b>код</b> промокода:\n\nНапример: <code>STANDOFF2026</code>", kb.as_markup())
    await call.answer()


@router.message(PromoForm.code)
async def promo_code(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    code = message.text.strip().upper()
    if len(code) < 3 or len(code) > 30:
        await message.answer("❌ Код 3-30 символов:")
        return
    await state.update_data(code=code)
    await state.set_state(PromoForm.coins)
    await message.answer("💰 Сколько монет даёт промокод?")


@router.message(PromoForm.coins)
async def promo_coins(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    try:
        coins = int(message.text.strip())
    except ValueError:
        await message.answer("❌ Введи число:")
        return
    await state.update_data(coins=coins)
    await state.set_state(PromoForm.uses)
    await message.answer("🔢 Сколько раз можно использовать?")


@router.message(PromoForm.uses)
async def promo_uses(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    try:
        uses = int(message.text.strip())
    except ValueError:
        await message.answer("❌ Введи число:")
        return

    data = await state.get_data()
    await state.clear()

    try:
        sb.table("promo_codes").insert({
            "code": data["code"],
            "coins": data["coins"],
            "uses_left": uses,
        }).execute()
        await message.answer(
            f"✅ Промокод <code>{data['code']}</code> создан!\n"
            f"💰 {data['coins']} монет · {uses} использований",
            reply_markup=admin_menu_kb()
        )
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


# ========================================
# ========== РАССЫЛКА ===================
# ========================================

@router.callback_query(F.data == "admin:broadcast")
async def cb_broadcast(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(BroadcastForm.text)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:menu")
    await safe_edit(call.message, "📢 Отправь текст рассылки.\n\nВсе игроки получат это сообщение.", kb.as_markup())
    await call.answer()


@router.message(BroadcastForm.text)
async def broadcast_send(message: types.Message, state: FSMContext, bot: Bot):
    if not await check_admin(message.from_user.id):
        return
    text = message.text
    await state.clear()

    # Получаем всех игроков
    res = sb.table("users").select("user_id").execute()
    users = res.data or []

    ok = 0
    fail = 0
    for u in users:
        try:
            await bot.send_message(u["user_id"], text, parse_mode="HTML")
            ok += 1
        except Exception:
            fail += 1

    await message.answer(
        f"📢 Рассылка завершена!\n\n"
        f"✅ Доставлено: {ok}\n"
        f"❌ Ошибок: {fail}",
        reply_markup=admin_menu_kb()
    )


# ========================================
# ========== ЛОГИ =======================
# ========================================

@router.callback_query(F.data == "admin:logs")
async def cb_logs(call: types.CallbackQuery):
    if not await guard(call):
        return
    actions = await get_recent_actions(30)

    if not actions:
        await safe_edit(call.message, "📜 Логов пока нет", admin_back_kb())
        await call.answer()
        return

    text = "📜 <b>Последние действия</b>\n\n"
    for a in actions:
        user_id = a.get("user_id", "?")
        action = a.get("action", "?")
        created = fmt_date(a.get("created_at"))
        text += f"• <code>{user_id}</code> → <b>{action}</b> · {created}\n"

    await safe_edit(call.message, text[:4000], admin_back_kb())
    await call.answer()


# ========================================
# ========== НАСТРОЙКИ ==================
# ========================================

@router.callback_query(F.data == "admin:settings")
async def cb_settings(call: types.CallbackQuery):
    if not await guard(call):
        return
    kb = InlineKeyboardBuilder()
    kb.button(text="📥 Экспорт БД (JSON)", callback_data="admin:settings:export")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1)
    await safe_edit(call.message, "⚙️ <b>Настройки</b>", kb.as_markup())
    await call.answer()


@router.callback_query(F.data == "admin:settings:export")
async def cb_export(call: types.CallbackQuery):
    if not await guard(call):
        return
    import json
    from io import BytesIO

    users = sb.table("users").select("*").execute().data or []
    tournaments = sb.table("tournaments").select("*").execute().data or []
    sponsors = sb.table("sponsors").select("*").execute().data or []

    data = {"users": users, "tournaments": tournaments, "sponsors": sponsors}
    buf = BytesIO(json.dumps(data, ensure_ascii=False, indent=2, default=str).encode("utf-8"))
    buf.name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M')}.json"

    await call.message.answer_document(types.BufferedInputFile(buf.read(), filename=buf.name))
    await call.answer("Готово")
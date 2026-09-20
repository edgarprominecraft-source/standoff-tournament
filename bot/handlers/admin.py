from datetime import datetime
from aiogram import Router, types, F, Bot
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from config import WEBAPP_URL, ROLE_BADGES, ADMIN_ID, RANKS
from db import (
    sb, get_user, get_all_tournaments, get_tournament,
    get_sponsors, get_tournament_sponsors, get_stats,
    update_user, log_action, get_banned_words, clean_banned_words,
    get_user_by_username, get_user_by_standoff_id, get_recent_actions,
)
from keyboards import (
    admin_menu_kb, admin_back_kb, tournaments_kb,
    tournament_detail_kb, create_tournament_kb,
    sponsors_kb, sponsor_detail_kb, organizers_kb,
    organizer_detail_kb, users_menu_kb, user_detail_kb,
    ranks_list_kb, test_menu_kb, confirm_delete_kb,
)
from utils import check_admin, escape_html, fmt_date, safe_edit, log

router = Router()


# ===== FSM состояния =====

class TournamentForm(StatesGroup):
    name = State()
    sponsor_channel = State()
    max_teams = State()
    prize = State()
    organizer = State()


class SponsorForm(StatesGroup):
    name = State()
    channel_username = State()
    channel_link = State()


class OrganizerForm(StatesGroup):
    name = State()
    tag = State()
    description = State()


class PlayerSearch(StatesGroup):
    query = State()


class CoinsAmount(StatesGroup):
    user_id = State()
    amount = State()


class TokensAmount(StatesGroup):
    user_id = State()
    amount = State()


class BroadcastForm(StatesGroup):
    text = State()


class NickForm(StatesGroup):
    user_id = State()
    new_nick = State()


class WordForm(StatesGroup):
    word = State()


class BanForm(StatesGroup):
    user_id = State()
    reason = State()


class RankForm(StatesGroup):
    user_id = State()
    rank = State()


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
        "➕ <b>Создание турнира</b>\n\nШаг 1/5. Напиши <b>название</b>:",
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
        "Шаг 2/5. <b>Username спонсора</b> (канал):\n\n"
        "Например: <code>@standoff_news</code>\n"
        "Или отправь <code>-</code>:"
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
    await message.answer("Шаг 3/5. Сколько <b>команд</b>? (например 16)")


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
    await state.update_data(max_teams=max_teams)
    await state.set_state(TournamentForm.prize)
    await message.answer("Шаг 4/5. <b>Призовой фонд</b> в голде? (например 500, или 0)")


@router.message(TournamentForm.prize)
async def tourn_prize(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    try:
        prize = int(message.text.strip())
    except ValueError:
        await message.answer("❌ Введи число:")
        return

    await state.update_data(prize=prize)
    await state.set_state(TournamentForm.organizer)

    res = sb.table("organizers").select("*").order("created_at", desc=True).execute()
    organizers = res.data or []

    kb = InlineKeyboardBuilder()
    if organizers:
        for o in organizers[:15]:
            kb.button(
                text=f"🏢 {o['name']}",
                callback_data=f"admin:t:set_org:{o['id']}"
            )
    kb.button(text="Без организатора", callback_data="admin:t:set_org:0")
    kb.button(text="Отмена", callback_data="admin:tournaments")
    kb.adjust(1)

    await message.answer(
        "Шаг 5/5. Выбери <b>организатора</b> для турнира:\n\n"
        "<i>(Сначала создай в разделе 🏢 Организаторы)</i>",
        reply_markup=kb.as_markup()
    )


@router.callback_query(F.data.startswith("admin:t:set_org:"))
async def cb_set_organizer(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    org_id = int(call.data.split(":")[-1])

    data = await state.get_data()
    if not data.get("name"):
        await call.answer("Начни заново через меню", show_alert=True)
        return

    await state.clear()

    org_id_value = org_id if org_id > 0 else None

    try:
        sb.table("tournaments").insert({
            "name": data["name"],
            "sponsor_channel": data.get("sponsor_channel"),
            "max_teams": data.get("max_teams", 16),
            "prize_gold": data.get("prize", 0),
            "organizer_id": org_id_value,
            "status": "waiting",
        }).execute()

        org_name = "без организатора"
        if org_id_value:
            res = sb.table("organizers").select("name").eq("id", org_id_value).maybe_single().execute()
            if res.data:
                org_name = res.data["name"]

        await call.message.edit_text(
            f"Турнир <b>{escape_html(data['name'])}</b> создан!\n\n"
            f"Команд: {data.get('max_teams', 16)}\n"
            f"Приз: {data.get('prize', 0)} G\n"
            f"Организатор: <b>{escape_html(org_name)}</b>",
            reply_markup=admin_menu_kb()
        )
        await call.answer("Готово")
    except Exception as e:
        await call.answer(f"Ошибка: {e}", show_alert=True)


@router.callback_query(F.data.startswith("admin:t:") & ~F.data.startswith("admin:t:new") & ~F.data.startswith("admin:t:set_org") & ~F.data.startswith("admin:t:finish") & ~F.data.startswith("admin:t:delete") & ~F.data.startswith("admin:t:rename") & ~F.data.startswith("admin:t:sponsors") & ~F.data.startswith("admin:t:organizer"))
async def cb_tournament_detail(call: types.CallbackQuery):
    if not await guard(call):
        return
    try:
        t_id = int(call.data.split(":")[2])
    except (IndexError, ValueError):
        await call.answer("Ошибка ID", show_alert=True)
        return

    t = await get_tournament(t_id)
    if not t:
        await call.answer("Турнир не найден", show_alert=True)
        return

    try:
        teams_res = sb.table("teams").select("id", count="exact").eq("tournament_id", t_id).execute()
        teams_count = teams_res.count or 0
    except Exception:
        teams_count = 0

    sponsors = await get_tournament_sponsors(t_id)
    sponsors_line = ", ".join([s["name"] for s in sponsors]) if sponsors else "нет"

    status_ru = {
        "waiting": "🟢 Набор",
        "active": "🔵 Идёт",
        "finished": "⚫ Завершён",
    }.get(t.get("status"), "❓")

    org_name = "нет"
    if t.get("organizer_id"):
        res = sb.table("organizers").select("name").eq("id", t["organizer_id"]).maybe_single().execute()
        if res.data:
            org_name = res.data["name"]

    text = (
        f"🏆 <b>{escape_html(t['name'])}</b>\n\n"
        f"📌 Статус: {status_ru}\n"
        f"👥 Команд: <b>{teams_count}</b> / {t.get('max_teams', 16)}\n"
        f"💰 Приз: {t.get('prize_gold', 0)} G\n"
        f"🔗 Спонсоры: {escape_html(sponsors_line)}\n"
        f"🏢 Организатор: {escape_html(org_name)}\n"
        f"📅 Создан: {fmt_date(t.get('created_at'))}"
    )

    await safe_edit(call.message, text, tournament_detail_kb(t_id, t.get("status", "waiting")))
    await call.answer()


@router.callback_query(F.data.startswith("admin:t:finish:"))
async def cb_tournament_finish(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    t = await get_tournament(t_id)
    if not t:
        await call.answer("Не найден", show_alert=True)
        return

    kb = InlineKeyboardBuilder()
    kb.button(text="🏁 Да, закончить", callback_data=f"confirm:finish_tournament:{t_id}")
    kb.button(text="❌ Отмена", callback_data=f"admin:t:{t_id}")
    kb.adjust(1, 1)

    await safe_edit(
        call.message,
        f"🏁 <b>Закончить турнир?</b>\n\n<b>{escape_html(t['name'])}</b>\n\nПобедителям начислятся монеты.",
        kb.as_markup()
    )
    await call.answer()


@router.callback_query(F.data.startswith("confirm:finish_tournament:"))
async def cb_confirm_finish(call: types.CallbackQuery):
    if not await guard(call):
        return
    t_id = int(call.data.split(":")[-1])
    from config import COINS_WIN, COINS_FINAL

    matches_res = sb.table("matches").select("*").eq("tournament_id", t_id).order("id", desc=True).limit(1).execute()
    if matches_res.data:
        final = matches_res.data[0]
        if final.get("winner_id"):
            team_res = sb.table("teams").select("*").eq("id", final["winner_id"]).maybe_single().execute()
            if team_res.data:
                for pid in [team_res.data.get(f"player{i}_id") for i in range(1, 6)]:
                    if pid:
                        u = await get_user(pid)
                        if u:
                            await update_user(pid, balance=(u.get("balance") or 0) + COINS_WIN, wins=(u.get("wins") or 0) + 1)

    sb.table("tournaments").update({"status": "finished"}).eq("id", t_id).execute()
    await call.answer("Готово", show_alert=True)
    await safe_edit(call.message, "🏁 Турнир завершён.", admin_back_kb())


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
        f"❌ <b>Удалить турнир?</b>\n\n<b>{escape_html(t['name'])}</b>",
        confirm_delete_kb("tournament", t_id)
    )
    await call.answer()


@router.callback_query(F.data.startswith("confirm:delete:tournament:"))
async def cb_confirm_delete(call: types.CallbackQuery):
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

    from keyboards import tournament_sponsors_kb
    await safe_edit(
        call.message,
        f"🔗 <b>Спонсоры турнира</b>\n\nПривязано: <b>{len(attached_ids)}</b>",
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

    from keyboards import tournament_sponsors_kb
    await safe_edit(
        call.message,
        f"🔗 <b>Спонсоры турнира</b>\n\nПривязано: <b>{len(attached_ids)}</b>",
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
        await safe_edit(call.message, "🔗 <b>Спонсоры</b>\n\nПока пусто.", kb.as_markup())
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
    await safe_edit(call.message, "➕ <b>Новый спонсор</b>\n\nШаг 1/3. Название:", kb.as_markup())
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
    await message.answer("Шаг 2/3. <b>Username канала</b> (например <code>@standoff_news</code>):")


@router.message(SponsorForm.channel_username)
async def sponsor_channel(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    value = message.text.strip()
    if not value.startswith("@"):
        await message.answer("❌ Username с @:")
        return
    await state.update_data(channel_username=value)
    await state.set_state(SponsorForm.channel_link)
    await message.answer("Шаг 3/3. <b>Ссылка на канал</b> (https://t.me/...):")


@router.message(SponsorForm.channel_link)
async def sponsor_link(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    link = message.text.strip()
    if not link.startswith("http"):
        await message.answer("❌ Ссылка с http:")
        return

    data = await state.get_data()
    await state.clear()

    try:
        sb.table("sponsors").insert({
            "name": data["name"],
            "channel_username": data["channel_username"],
            "channel_link": link,
        }).execute()
        await message.answer(f"✅ Спонсор <b>{escape_html(data['name'])}</b> добавлен!", reply_markup=admin_menu_kb())
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
        f"📢 {s['channel_username']}\n"
        f"🔗 {s['channel_link']}"
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
    await safe_edit(call.message, f"❌ Удалить <b>{escape_html(name)}</b>?", confirm_delete_kb("sponsor", s_id))
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
# ========== ОРГАНИЗАТОРЫ ===============
# ========================================

@router.callback_query(F.data == "admin:organizers")
async def cb_organizers(call: types.CallbackQuery):
    if not await guard(call):
        return
    res = sb.table("organizers").select("*").order("created_at", desc=True).execute()
    organizers = res.data or []
    if not organizers:
        kb = InlineKeyboardBuilder()
        kb.button(text="➕ Добавить организатора", callback_data="admin:o:new")
        kb.button(text="⬅️ Назад", callback_data="admin:menu")
        kb.adjust(1, 1)
        await safe_edit(call.message, "🏢 <b>Организаторы</b>\n\nПока пусто.", kb.as_markup())
        await call.answer()
        return
    await safe_edit(call.message, f"🏢 <b>Организаторы</b> ({len(organizers)})", organizers_kb(organizers))
    await call.answer()


@router.callback_query(F.data == "admin:o:new")
async def cb_organizer_new(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    await state.set_state(OrganizerForm.name)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:organizers")
    await safe_edit(call.message, "🏢 <b>Новый организатор</b>\n\nШаг 1/3. Название (например Seven Tournament):", kb.as_markup())
    await call.answer()


@router.message(OrganizerForm.name)
async def org_name(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    name = message.text.strip()
    if len(name) < 2:
        await message.answer("❌ Минимум 2 символа:")
        return
    await state.update_data(name=name)
    await state.set_state(OrganizerForm.tag)
    await message.answer("Шаг 2/3. <b>Тег</b> (2-6 символов, например SEVEN):")


@router.message(OrganizerForm.tag)
async def org_tag(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    tag = message.text.strip().upper()
    if len(tag) < 2 or len(tag) > 6:
        await message.answer("❌ Тег 2-6 символов:")
        return
    await state.update_data(tag=tag)
    await state.set_state(OrganizerForm.description)
    await message.answer("Шаг 3/3. <b>Описание</b> (или отправь - чтобы пропустить):")


@router.message(OrganizerForm.description)
async def org_desc(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    desc = message.text.strip()
    if desc == "-":
        desc = None

    data = await state.get_data()
    await state.clear()

    try:
        sb.table("organizers").insert({
            "name": data["name"],
            "tag": data.get("tag"),
            "description": desc,
            "owner_id": message.from_user.id,
        }).execute()
        await message.answer(f"✅ Организатор <b>{escape_html(data['name'])}</b> добавлен!", reply_markup=admin_menu_kb())
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


@router.callback_query(F.data.startswith("admin:o:") & ~F.data.startswith("admin:o:new"))
async def cb_organizer_detail(call: types.CallbackQuery):
    if not await guard(call):
        return
    try:
        o_id = int(call.data.split(":")[2])
    except (IndexError, ValueError):
        await call.answer("Ошибка", show_alert=True)
        return

    res = sb.table("organizers").select("*").eq("id", o_id).maybe_single().execute()
    if not res.data:
        await call.answer("Не найден", show_alert=True)
        return
    o = res.data

    text = (
        f"🏢 <b>{escape_html(o['name'])}</b>\n\n"
        f"🏷 Тег: <b>{o.get('tag') or '—'}</b>\n"
        f"📝 {escape_html(o.get('description') or '—')}"
    )
    await safe_edit(call.message, text, organizer_detail_kb(o_id))
    await call.answer()


@router.callback_query(F.data.startswith("admin:o:delete:"))
async def cb_organizer_delete(call: types.CallbackQuery):
    if not await guard(call):
        return
    o_id = int(call.data.split(":")[-1])
    sb.table("organizers").delete().eq("id", o_id).execute()
    await call.answer("Удалён", show_alert=True)
    await safe_edit(call.message, "❌ Организатор удалён.", admin_back_kb())


# ========================================
# ========== ИГРОКИ =====================
# ========================================

@router.callback_query(F.data == "admin:users")
async def cb_users(call: types.CallbackQuery):
    if not await guard(call):
        return
    await safe_edit(call.message, "👥 <b>Игроки</b>", users_menu_kb())
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

    await show_user_card(message, user)


async def show_user_card(message: types.Message, user: dict):
    nick = user.get("nickname") or user.get("first_name") or "Игрок"
    role = user.get("role")
    role_badge = ROLE_BADGES.get(role, "") if role else ""
    banned = user.get("banned") or False
    rank = user.get("rank")
    rank_text = RANKS.get(rank, "—") if rank else "—"

    text = (
        f"👤 <b>{escape_html(nick)}</b> {role_badge}\n\n"
        f"🆔 user_id: <code>{user['user_id']}</code>\n"
        f"📛 @{user.get('username') or '—'}\n"
        f"🎮 Standoff ID: {user.get('standoff_id') or '—'}\n"
        f"💰 Баланс: <b>{user.get('balance') or 0}</b>\n"
        f"🪙 Жетоны: <b>{user.get('tokens') or 0}</b>\n"
        f"🏆 W/L: {user.get('wins') or 0} / {user.get('losses') or 0}\n"
        f"🎖 Звание: <b>{rank_text}</b>\n"
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
    await safe_edit(call.message, "💰 Напиши <b>число</b> (любое):\n\nНапример: <code>500</code> или <code>-100</code>", kb.as_markup())
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
    await message.answer(f"✅ Новый баланс: <b>{new_bal}</b>", reply_markup=admin_menu_kb())


@router.callback_query(F.data.startswith("admin:u:tokens:"))
async def cb_user_tokens(call: types.CallbackQuery, state: FSMContext):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])
    await state.update_data(tokens_user_id=user_id)
    await state.set_state(TokensAmount.amount)
    kb = InlineKeyboardBuilder()
    kb.button(text="❌ Отмена", callback_data="admin:users")
    await safe_edit(call.message, "🪙 Сколько <b>жетонов</b> выдать?", kb.as_markup())
    await call.answer()


@router.message(TokensAmount.amount)
async def tokens_amount(message: types.Message, state: FSMContext):
    if not await check_admin(message.from_user.id):
        return
    try:
        amount = int(message.text.strip())
    except ValueError:
        await message.answer("❌ Введи число:")
        return

    data = await state.get_data()
    user_id = data.get("tokens_user_id")
    await state.clear()

    u = await get_user(user_id)
    if not u:
        await message.answer("❌ Не найден")
        return

    new = max(0, (u.get("tokens") or 0) + amount)
    await update_user(user_id, tokens=new)
    await message.answer(f"✅ Жетонов: <b>{new}</b>", reply_markup=admin_menu_kb())


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
    await message.answer(f"✅ Ник: <b>{escape_html(cleaned)}</b>", reply_markup=admin_menu_kb())


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
        text += f"• <b>{a.get('action', '?')}</b> · {fmt_date(a.get('created_at'))}\n"

    await safe_edit(call.message, text[:4000], admin_back_kb())
    await call.answer()


@router.callback_query(F.data == "admin:u:banned")
async def cb_banned(call: types.CallbackQuery):
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
        text += f"• {escape_html(u.get('nickname') or u.get('first_name') or '?')} (<code>{u['user_id']}</code>)\n"
    await safe_edit(call.message, text, admin_back_kb())
    await call.answer()


# ===== ЗВАНИЯ =====

@router.callback_query(F.data == "admin:ranks")
async def cb_ranks_menu(call: types.CallbackQuery):
    if not await guard(call):
        return
    text = (
        "🎖 <b>Звания</b>\n\n"
        "Чтобы выдать звание игроку:\n"
        "1. Открой 👥 Игроки → Поиск\n"
        "2. Найди игрока\n"
        "3. Нажми «🎖 Выдать звание»"
    )
    await safe_edit(call.message, text, admin_back_kb())
    await call.answer()


@router.callback_query(F.data.startswith("admin:u:rank:"))
async def cb_user_rank(call: types.CallbackQuery):
    if not await guard(call):
        return
    user_id = int(call.data.split(":")[-1])

    kb = InlineKeyboardBuilder()
    for rid, rname in RANKS.items():
        kb.button(text=rname, callback_data=f"admin:rank:set:{user_id}:{rid}")
    kb.button(text="🚫 Снять звание", callback_data=f"admin:rank:set:{user_id}:none")
    kb.button(text="⬅️ Отмена", callback_data="admin:users")
    kb.adjust(3, 3, 3, 3, 3, 1, 1)

    await safe_edit(
        call.message,
        f"🎖 Выбери <b>звание</b> для игрока <code>{user_id}</code>:",
        kb.as_markup()
    )
    await call.answer()


@router.callback_query(F.data.startswith("admin:rank:set:"))
async def cb_rank_set(call: types.CallbackQuery):
    if not await guard(call):
        return
    parts = call.data.split(":")
    user_id = int(parts[3])
    rank_id = parts[4]
    if rank_id == "none":
        rank_id = None

    await update_user(user_id, rank=rank_id)

    if rank_id:
        rank_text = RANKS.get(rank_id, rank_id)
        await call.answer(f"Звание: {rank_text}", show_alert=True)
    else:
        rank_text = "—"
        await call.answer("Звание снято", show_alert=True)

    await safe_edit(
        call.message,
        f"✅ Игроку <code>{user_id}</code> установлено: <b>{rank_text}</b>",
        admin_back_kb()
    )


# ========================================
# ========== МОНЕТЫ =====================
# ========================================

@router.callback_query(F.data == "admin:coins")
async def cb_coins(call: types.CallbackQuery):
    if not await guard(call):
        return
    kb = InlineKeyboardBuilder()
    kb.button(text="🎁 +1000 монет всем", callback_data="admin:coins:mass")
    kb.button(text="⬅️ Назад", callback_data="admin:menu")
    kb.adjust(1, 1)
    await safe_edit(call.message, "💰 <b>Монеты</b>", kb.as_markup())
    await call.answer()


@router.callback_query(F.data == "admin:coins:mass")
async def cb_coins_mass(call: types.CallbackQuery):
    if not await guard(call):
        return
    res = sb.table("users").select("user_id, balance").execute()
    users = res.data or []
    for u in users:
        await update_user(u["user_id"], balance=(u.get("balance") or 0) + 1000)
    await call.answer(f"✅ +1000 выдано {len(users)} игрокам", show_alert=True)


# ========================================
# ========== БАНВОРДЫ ===================
# ========================================

@router.callback_query(F.data == "admin:words")
async def cb_words(call: types.CallbackQuery):
    if not await guard(call):
        return
    words = await get_banned_words()
    text = f"🚫 <b>Банворды</b> ({len(words)})\n\n"
    text += ", ".join(words) if words else "Пусто"
    kb = InlineKeyboardBuilder()
    kb.button(text="➕ Добавить", callback_data="admin:words:add")
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
        await message.answer(f"✅ Слово добавлено", reply_markup=admin_menu_kb())
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
    await safe_edit(call.message, "📢 Отправь текст рассылки всем игрокам:", kb.as_markup())
    await call.answer()


@router.message(BroadcastForm.text)
async def broadcast_send(message: types.Message, state: FSMContext, bot: Bot):
    if not await check_admin(message.from_user.id):
        return
    text = message.text
    await state.clear()

    res = sb.table("users").select("user_id").execute()
    users = res.data or []

    ok, fail = 0, 0
    for u in users:
        try:
            await bot.send_message(u["user_id"], text, parse_mode="HTML")
            ok += 1
        except Exception:
            fail += 1

    await message.answer(f"📢 Рассылка завершена!\n✅ {ok}\n❌ {fail}", reply_markup=admin_menu_kb())


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
        text += f"• <code>{a.get('user_id', '?')}</code> → <b>{a.get('action', '?')}</b> · {fmt_date(a.get('created_at'))}\n"
    await safe_edit(call.message, text[:4000], admin_back_kb())
    await call.answer()


# ========================================
# ========== ТЕСТ =======================
# ========================================

@router.callback_query(F.data == "admin:test")
async def cb_test(call: types.CallbackQuery):
    if not await guard(call):
        return
    await safe_edit(call.message, "🧪 <b>Тестовые функции</b>", test_menu_kb())
    await call.answer()


@router.callback_query(F.data == "admin:test:tournament")
async def cb_test_tournament(call: types.CallbackQuery):
    if not await guard(call):
        return
    try:
        sb.table("tournaments").insert({
            "name": f"🧪 Тест #{datetime.now().strftime('%H:%M')}",
            "max_teams": 4,
            "prize_gold": 100,
            "status": "waiting",
        }).execute()
        await call.answer("✅ Тестовый турнир создан", show_alert=True)
    except Exception as e:
        await call.answer(f"❌ {e}", show_alert=True)


@router.callback_query(F.data == "admin:test:coins_all")
async def cb_test_coins_all(call: types.CallbackQuery):
    if not await guard(call):
        return
    res = sb.table("users").select("user_id, balance").execute()
    users = res.data or []
    for u in users:
        await update_user(u["user_id"], balance=(u.get("balance") or 0) + 1000)
    await call.answer(f"✅ +1000 выдано {len(users)} игрокам", show_alert=True)


@router.callback_query(F.data == "admin:test:tokens_all")
async def cb_test_tokens_all(call: types.CallbackQuery):
    if not await guard(call):
        return
    res = sb.table("users").select("user_id, tokens").execute()
    users = res.data or []
    for u in users:
        await update_user(u["user_id"], tokens=(u.get("tokens") or 0) + 10)
    await call.answer(f"✅ +10 жетонов {len(users)} игрокам", show_alert=True)


@router.callback_query(F.data == "admin:test:clear")
async def cb_test_clear(call: types.CallbackQuery):
    if not await guard(call):
        return
    res = sb.table("tournaments").select("id").like("name", "🧪 Тест%").execute()
    for t in (res.data or []):
        sb.table("tournaments").delete().eq("id", t["id"]).execute()
    await call.answer(f"🧹 Удалено {len(res.data or [])} тестовых турниров", show_alert=True)


# ========================================
# ========== НАСТРОЙКИ ==================
# ========================================

@router.callback_query(F.data == "admin:settings")
async def cb_settings(call: types.CallbackQuery):
    if not await guard(call):
        return
    kb = InlineKeyboardBuilder()
    kb.button(text="📥 Экспорт БД", callback_data="admin:settings:export")
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
    organizers = sb.table("organizers").select("*").execute().data or []

    data = {"users": users, "tournaments": tournaments, "sponsors": sponsors, "organizers": organizers}
    buf = BytesIO(json.dumps(data, ensure_ascii=False, indent=2, default=str).encode("utf-8"))
    fname = f"backup_{datetime.now().strftime('%Y%m%d_%H%M')}.json"

    await call.message.answer_document(types.BufferedInputFile(buf.read(), filename=fname))
    await call.answer("Готово")
import asyncio
import os
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.default import DefaultBotProperties
from aiogram.client.telegram import TelegramAPIServer
from aiogram.utils.keyboard import InlineKeyboardBuilder
from supabase import create_client, Client

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://standoff-tournament.vercel.app")
WORKER_URL = "https://snowy-night-d92f.edgarprominecraft.workers.dev"

if not BOT_TOKEN or not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit("❌ Заполни .env (BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY)")

# ===== Supabase =====
sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ===== Session через Cloudflare Worker =====
session = AiohttpSession(
    api=TelegramAPIServer.from_base(WORKER_URL)
)
bot = Bot(
    token=BOT_TOKEN,
    session=session,
    default=DefaultBotProperties(parse_mode="HTML"),
)
print(f"✅ Используем Cloudflare Worker: {WORKER_URL}")

dp = Dispatcher()


# ===== Кнопка для открытия Mini App =====
def webapp_kb() -> types.InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🏆 Открыть турнир", web_app=types.WebAppInfo(url=WEBAPP_URL))
    return kb.as_markup()


# ===== /start =====
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user = message.from_user
    if not user:
        return

    try:
        sb.table("users").upsert({
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "photo_url": None,
            "balance": 0,
        }, on_conflict="user_id").execute()
    except Exception as e:
        print(f"⚠️  Supabase upsert error: {e}")

    await message.answer(
        f"Привет, <b>{user.first_name or 'игрок'}</b>! 👋\n\n"
        f"Это бот турниров <b>Standoff 2 (2х2)</b>.\n\n"
        f"🎮 Участвуй в турнирах\n"
        f"💰 Получай монеты даже за проигрыш\n"
        f"🏆 Собирай команду с другом\n\n"
        f"Жми кнопку, чтобы начать:",
        reply_markup=webapp_kb(),
    )


# ===== /help =====
@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(
        "📖 <b>Команды</b>\n"
        "/start — главное меню\n"
        "/profile — твой профиль\n"
        "/rating — топ игроков\n"
        "/help — эта справка"
    )


# ===== /profile =====
@dp.message(Command("profile"))
async def cmd_profile(message: types.Message):
    user = message.from_user
    if not user:
        return

    try:
        res = sb.table("users").select("*").eq("user_id", user.id).maybe_single().execute()
        data = res.data
    except Exception as e:
        print(f"⚠️  supabase select error: {e}")
        data = None

    if not data:
        await message.answer("Профиля нет. Напиши /start.")
        return

    nick = data.get("nickname") or data.get("first_name") or "Игрок"
    standoff_id = data.get("standoff_id") or "не указан"
    balance = data.get("balance", 0)

    text = (
        f"👤 <b>{nick}</b>\n"
        f"🆔 Standoff ID: <code>{standoff_id}</code>\n"
        f"💰 Баланс: <b>{balance}</b> монет"
    )

    kb = InlineKeyboardBuilder()
    kb.button(text="✏️ Изменить профиль", web_app=types.WebAppInfo(url=WEBAPP_URL))
    await message.answer(text, reply_markup=kb.as_markup())


# ===== /rating =====
@dp.message(Command("rating"))
async def cmd_rating(message: types.Message):
    try:
        res = sb.table("users").select("nickname, first_name, balance").order("balance", desc=True).limit(10).execute()
        rows = res.data or []
    except Exception as e:
        print(f"⚠️  supabase error: {e}")
        rows = []

    if not rows:
        await message.answer("Пока никого нет в рейтинге.")
        return

    lines = ["🏆 <b>Топ-10 игроков</b>\n"]
    medals = ["🥇", "🥈", "🥉"]
    for i, r in enumerate(rows):
        prefix = medals[i] if i < 3 else f"{i+1}."
        name = r.get("nickname") or r.get("first_name") or "Игрок"
        lines.append(f"{prefix} {name} — <b>{r.get('balance', 0)}</b> 💰")

    await message.answer("\n".join(lines))


# ===== Обработка любого текста =====
@dp.message(F.text)
async def any_text(message: types.Message):
    await message.answer(
        "Открой приложение, чтобы участвовать в турнирах:",
        reply_markup=webapp_kb(),
    )


# ===== Запуск =====
async def main():
    print("🤖 Бот запущен. Ctrl+C для остановки.")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("\n👋 Бот остановлен.")
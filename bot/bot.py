import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.default import DefaultBotProperties
from aiogram.client.telegram import TelegramAPIServer

from config import BOT_TOKEN, WORKER_URL
from handlers import start as start_handlers
from handlers import admin as admin_handlers

# ===== Логирование =====
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ===== Session через Cloudflare Worker =====
session = AiohttpSession(api=TelegramAPIServer.from_base(WORKER_URL))
bot = Bot(
    token=BOT_TOKEN,
    session=session,
    default=DefaultBotProperties(parse_mode="HTML"),
)
dp = Dispatcher()

# ===== Роутеры =====
dp.include_router(admin_handlers.router)
dp.include_router(start_handlers.router)


async def main():
    print(f"✅ Cloudflare Worker: {WORKER_URL}")
    print("🤖 Бот запущен. Ctrl+C для остановки.")

    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("\n👋 Бот остановлен.")
import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.default import DefaultBotProperties
from aiogram.client.telegram import TelegramAPIServer

from config import BOT_TOKEN, WORKER_URL
from db import sb
from handlers import start as start_handlers
from handlers import admin as admin_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

session = AiohttpSession(api=TelegramAPIServer.from_base(WORKER_URL))
bot = Bot(
    token=BOT_TOKEN,
    session=session,
    default=DefaultBotProperties(parse_mode="HTML"),
)
dp = Dispatcher()

dp.include_router(admin_handlers.router)
dp.include_router(start_handlers.router)


# ===== Обработка команд из очереди bot_commands =====
async def process_command(cmd: dict):
    try:
        command = cmd.get("command")
        payload = cmd.get("payload") or {}

        if command == "send_match_result":
            channel = payload.get("channel") or "@HePastic"
            text = payload.get("text") or ""
            photo_url = payload.get("photo_url")

            try:
                if photo_url:
                    await bot.send_photo(
                        chat_id=channel,
                        photo=photo_url,
                        caption=text,
                        parse_mode="HTML",
                    )
                else:
                    await bot.send_message(chat_id=channel, text=text, parse_mode="HTML")
                print(f"✅ Пост отправлен в {channel}")
            except Exception as e:
                print(f"⚠️ Ошибка отправки в {channel}: {e}")

        # отметить как обработанную
        sb.table("bot_commands").update({"processed": True}).eq("id", cmd["id"]).execute()
    except Exception as e:
        print(f"⚠️ process_command error: {e}")


async def poll_commands():
    print("📬 Polling bot_commands запущен")
    while True:
        try:
            res = sb.table("bot_commands").select("*").eq("processed", False).order("id").limit(5).execute()
            for cmd in (res.data or []):
                await process_command(cmd)
        except Exception as e:
            print(f"⚠️ poll_commands error: {e}")
        await asyncio.sleep(5)


async def main():
    print(f"✅ Cloudflare Worker: {WORKER_URL}")
    print("🤖 Бот запущен. Ctrl+C для остановки.")

    await bot.delete_webhook(drop_pending_updates=True)

    # Запускаем 2 задачи параллельно: polling и очередь команд
    await asyncio.gather(
        dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types()),
        poll_commands(),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("\n👋 Бот остановлен.")
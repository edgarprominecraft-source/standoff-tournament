import os
from dotenv import load_dotenv

load_dotenv()

# ===== Основное =====
BOT_TOKEN = os.getenv("BOT_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://standoff-tournament.vercel.app")
WORKER_URL = "https://snowy-night-d92f.edgarprominecraft.workers.dev"

# ===== Главный админ =====
ADMIN_ID = 5572444401

# ===== Роли =====
ROLE_ADMIN = "admin"
ROLE_MODERATOR = "moderator"
ROLE_SUPPORT = "support"

ROLE_BADGES = {
    ROLE_ADMIN: "👑 ADMIN",
    ROLE_MODERATOR: "🛡 MODERATOR",
    ROLE_SUPPORT: "🎧 SUPPORT",
}

ROLE_COLORS = {
    ROLE_ADMIN: "#FFD700",
    ROLE_MODERATOR: "#4A9EFF",
    ROLE_SUPPORT: "#44DD88",
}

# ===== Звания Standoff 2 =====
RANKS = {
    "bronze_1": "🥉 Бронза I",
    "bronze_2": "🥉 Бронза II",
    "bronze_3": "🥉 Бронза III",
    "bronze_4": "🥉 Бронза IV",
    "silver_1": "🥈 Серебро I",
    "silver_2": "🥈 Серебро II",
    "silver_3": "🥈 Серебро III",
    "silver_4": "🥈 Серебро IV",
    "gold_1": "🥇 Золото I",
    "gold_2": "🥇 Золото II",
    "gold_3": "🥇 Золото III",
    "gold_4": "🥇 Золото IV",
    "phoenix": "🔥 Феникс",
    "ranger": "🔫 Рейнджер",
    "champion": "🏆 Чемпион",
    "master": "🎖 Мастер",
    "elite": "⭐ Элита",
    "legend": "👑 Легенда",
}

# ===== Ограничения =====
NICKNAME_MIN = 3
NICKNAME_MAX = 16
NICKNAME_COOLDOWN_HOURS = 24
MATCH_CONFIRM_SECONDS = 180
MAX_TEAMS_DEFAULT = 16

# ===== Награды =====
COINS_WIN = 1000
COINS_FINAL = 500
COINS_PARTICIPATE = 50

# ===== Логи =====
LOG_ACTIONS = [
    "join_lobby", "leave_lobby", "confirm_match", "miss_confirm",
    "pick_map", "ban_map", "send_message", "register", "login",
]
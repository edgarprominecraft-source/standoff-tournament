import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://standoff-tournament.vercel.app")
WORKER_URL = "https://snowy-night-d92f.edgarprominecraft.workers.dev"

ADMIN_ID = 5572444401

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

NICKNAME_MIN = 3
NICKNAME_MAX = 16
NICKNAME_COOLDOWN_HOURS = 24
MATCH_CONFIRM_SECONDS = 180
MAX_TEAMS_DEFAULT = 25

COINS_WIN = 1000
COINS_FINAL = 500
COINS_PARTICIPATE = 50

LOG_ACTIONS = [
    "join_lobby", "leave_lobby", "confirm_match", "miss_confirm",
    "pick_map", "ban_map", "send_message", "register", "login",
]
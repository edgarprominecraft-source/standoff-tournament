from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ===== USERS =====

async def get_user(user_id: int):
    try:
        res = sb.table("users").select("*").eq("user_id", user_id).maybe_single().execute()
        return res.data
    except Exception as e:
        print(f"⚠️ get_user error: {e}")
        return None


async def get_user_by_username(username: str):
    try:
        res = sb.table("users").select("*").eq("username", username).maybe_single().execute()
        return res.data
    except Exception:
        return None


async def get_user_by_standoff_id(standoff_id: str):
    try:
        res = sb.table("users").select("*").eq("standoff_id", standoff_id).maybe_single().execute()
        return res.data
    except Exception:
        return None


async def upsert_user(user_id: int, username: str = None, first_name: str = None):
    try:
        sb.table("users").upsert({
            "user_id": user_id,
            "username": username,
            "first_name": first_name,
        }, on_conflict="user_id").execute()
    except Exception as e:
        print(f"⚠️ upsert_user error: {e}")


async def update_user(user_id: int, **fields):
    try:
        sb.table("users").update(fields).eq("user_id", user_id).execute()
    except Exception as e:
        print(f"⚠️ update_user error: {e}")


async def get_top_users(limit: int = 10):
    try:
        res = sb.table("users").select("*").order("balance", desc=True).limit(limit).execute()
        return res.data or []
    except Exception:
        return []


# ===== TOURNAMENTS =====

async def get_active_tournament():
    try:
        res = sb.table("tournaments").select("*").eq("status", "waiting").order("created_at", desc=True).limit(1).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


async def get_all_tournaments():
    try:
        res = sb.table("tournaments").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception:
        return []


async def get_tournament(tournament_id: int):
    try:
        res = sb.table("tournaments").select("*").eq("id", tournament_id).maybe_single().execute()
        return res.data
    except Exception:
        return None


# ===== SPONSORS =====

async def get_sponsors():
    try:
        res = sb.table("sponsors").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception:
        return []


async def get_tournament_sponsors(tournament_id: int):
    try:
        res = sb.table("tournament_sponsors").select(
            "sponsor_id, sponsors(*)"
        ).eq("tournament_id", tournament_id).execute()
        return [r["sponsors"] for r in (res.data or []) if r.get("sponsors")]
    except Exception as e:
        print(f"⚠️ get_tournament_sponsors: {e}")
        return []


# ===== STATS =====

async def get_stats():
    """Общая статистика для админки"""
    try:
        users = sb.table("users").select("user_id", count="exact").execute()
        tournaments = sb.table("tournaments").select("id", count="exact").execute()
        matches = sb.table("matches").select("id", count="exact").execute()

        return {
            "users": users.count or 0,
            "tournaments": tournaments.count or 0,
            "matches": matches.count or 0,
        }
    except Exception as e:
        print(f"⚠️ get_stats error: {e}")
        return {"users": 0, "tournaments": 0, "matches": 0}


# ===== LOGS =====

async def log_action(user_id: int, action: str, payload: dict = None):
    try:
        sb.table("user_actions").insert({
            "user_id": user_id,
            "action": action,
            "payload": payload or {},
        }).execute()
    except Exception as e:
        print(f"⚠️ log_action error: {e}")


async def get_recent_actions(limit: int = 50, user_id: int = None):
    try:
        q = sb.table("user_actions").select("*").order("created_at", desc=True).limit(limit)
        if user_id:
            q = q.eq("user_id", user_id)
        res = q.execute()
        return res.data or []
    except Exception:
        return []


# ===== BANNED WORDS =====

async def get_banned_words():
    try:
        res = sb.table("banned_words").select("word").execute()
        return [r["word"] for r in (res.data or [])]
    except Exception:
        return []


def contains_banned_word(text: str, banned: list) -> str | None:
    """Возвращает найденное запрещённое слово или None"""
    if not text:
        return None
    lower = text.lower()
    for word in banned:
        if word.lower() in lower:
            return word
    return None


def clean_banned_words(text: str, banned: list) -> str:
    """Заменяет запрещённые слова на ***"""
    if not text:
        return text
    result = text
    for word in banned:
        # Простая замена (регистронезависимая)
        import re
        result = re.sub(re.escape(word), "*" * len(word), result, flags=re.IGNORECASE)
    return result


# ===== ADMINS =====

async def is_admin(user_id: int) -> bool:
    try:
        res = sb.table("admins").select("user_id").eq("user_id", user_id).maybe_single().execute()
        return res.data is not None
    except Exception:
        return False


async def get_user_role(user_id: int) -> str | None:
    user = await get_user(user_id)
    if not user:
        return None
    return user.get("role")


# ===== PROMO CODES =====

async def use_promo(user_id: int, code: str):
    """Использовать промокод. Возвращает (успех, монеты_или_ошибка)"""
    try:
        res = sb.table("promo_codes").select("*").eq("code", code).maybe_single().execute()
        if not res.data:
            return False, "Промокод не найден"
        promo = res.data
        if promo["uses_left"] <= 0:
            return False, "Промокод исчерпан"

        # Обновляем остаток
        sb.table("promo_codes").update({
            "uses_left": promo["uses_left"] - 1
        }).eq("id", promo["id"]).execute()

        # Начисляем монеты
        user = await get_user(user_id)
        if not user:
            return False, "Профиль не найден"
        new_balance = (user.get("balance") or 0) + promo["coins"]
        await update_user(user_id, balance=new_balance)

        return True, promo["coins"]
    except Exception as e:
        print(f"⚠️ use_promo error: {e}")
        return False, "Ошибка сервера"
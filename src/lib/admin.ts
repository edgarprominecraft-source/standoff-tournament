import { supabase } from '../supabase';

// ===== ГЛАВНЫЙ АДМИН =====
// Управляется через таблицу admins в Supabase.
// Добавить админа можно только через SQL Editor:
// INSERT INTO admins (user_id) VALUES (123456789);

// Кеш админов (чтобы не дёргать БД постоянно)
let adminsCache: Set<number> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export async function isAdmin(userId: number): Promise<boolean> {
  if (!userId) return false;

  const now = Date.now();
  if (!adminsCache || now - cacheTime > CACHE_TTL) {
    const { data } = await supabase.from('admins').select('user_id');
    adminsCache = new Set((data || []).map((a: any) => Number(a.user_id)));
    cacheTime = now;
  }

  return adminsCache.has(Number(userId));
}

export function invalidateAdminCache() {
  adminsCache = null;
  cacheTime = 0;
}

// ===== Статистика =====
export async function getAdminStats() {
  const [users, tournaments, matches, clans, teams] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('tournaments').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('id', { count: 'exact', head: true }),
    supabase.from('clans').select('id', { count: 'exact', head: true }),
    supabase.from('teams').select('id', { count: 'exact', head: true }),
  ]);

  return {
    users: users.count || 0,
    tournaments: tournaments.count || 0,
    matches: matches.count || 0,
    clans: clans.count || 0,
    teams: teams.count || 0,
  };
}

// ===== Игроки =====
export async function searchUsers(query: string) {
  if (!query.trim()) return [];

  const q = query.trim();
  const { data } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, username, standoff_id, balance, role, banned, rank, clan_id, avatar_url, photo_url, created_at')
    .or(`nickname.ilike.%${q}%,first_name.ilike.%${q}%,username.ilike.%${q}%,standoff_id.eq.${q}`)
    .limit(30);

  return data || [];
}

export async function getRecentUsers(limit = 20) {
  const { data } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, username, standoff_id, balance, role, banned, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function banUser(userId: number, reason: string) {
  return await supabase
    .from('users')
    .update({ banned: true, ban_reason: reason })
    .eq('user_id', userId);
}

export async function unbanUser(userId: number) {
  return await supabase
    .from('users')
    .update({ banned: false, ban_reason: null })
    .eq('user_id', userId);
}

export async function giveCoins(userId: number, amount: number) {
  const { data: u } = await supabase
    .from('users')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (!u) return { error: 'Игрок не найден' };

  const newBal = Math.max(0, (u.balance || 0) + amount);
  return await supabase
    .from('users')
    .update({ balance: newBal })
    .eq('user_id', userId);
}

export async function setUserRole(userId: number, role: string | null) {
  return await supabase
    .from('users')
    .update({ role })
    .eq('user_id', userId);
}

// ===== Турниры =====
export async function getAllTournamentsAdmin() {
  const { data } = await supabase
    .from('tournaments')
    .select('*, organizers(name, tag)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function finishTournament(tournamentId: number) {
  return await supabase
    .from('tournaments')
    .update({ status: 'finished' })
    .eq('id', tournamentId);
}

export async function deleteTournament(tournamentId: number) {
  return await supabase.from('tournaments').delete().eq('id', tournamentId);
}

// ===== Уведомления =====
export async function sendNotificationToAll(title: string, body: string, link: string | null = null) {
  const { data: users } = await supabase.from('users').select('user_id');
  if (!users) return { error: 'Нет игроков' };

  const rows = users.map((u: any) => ({
    user_id: u.user_id,
    type: 'announcement',
    title,
    body,
    link,
  }));

  return await supabase.from('notifications').insert(rows);
}

export async function sendNotificationToUser(userId: number, title: string, body: string, link: string | null = null) {
  return await supabase.from('notifications').insert({
    user_id: userId,
    type: 'direct',
    title,
    body,
    link,
  });
}

// ===== Уведомления игрока =====
export async function getMyNotifications(userId: number, limit = 30) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getUnreadCount(userId: number) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}

export async function markAsRead(notificationId: number) {
  return await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
}

export async function markAllAsRead(userId: number) {
  return await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}
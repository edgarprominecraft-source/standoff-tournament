import { supabase } from '../supabase';

// ===== АДМИНЫ =====
let adminsCache: Set<number> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

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

// ===== СТАТИСТИКА =====
export async function getAdminStats() {
  const [users, tournaments, matches, clans, teams, organizers] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('tournaments').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('id', { count: 'exact', head: true }),
    supabase.from('clans').select('id', { count: 'exact', head: true }),
    supabase.from('teams').select('id', { count: 'exact', head: true }),
    supabase.from('organizers').select('id', { count: 'exact', head: true }),
  ]);

  return {
    users: users.count || 0,
    tournaments: tournaments.count || 0,
    matches: matches.count || 0,
    clans: clans.count || 0,
    teams: teams.count || 0,
    organizers: organizers.count || 0,
  };
}

// ===== ИГРОКИ =====
export async function searchUsers(query: string) {
  if (!query.trim()) return [];
  const q = query.trim();
  const { data } = await supabase
    .from('users')
    .select('*')
    .or(`nickname.ilike.%${q}%,first_name.ilike.%${q}%,username.ilike.%${q}%,standoff_id.eq.${q}`)
    .limit(30);
  return data || [];
}

export async function getRecentUsers(limit = 20) {
  const { data } = await supabase
    .from('users')
    .select('*')
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
    .from('users').select('balance').eq('user_id', userId).maybeSingle();
  if (!u) return { error: 'Игрок не найден' };
  const newBal = Math.max(0, (u.balance || 0) + amount);
  return await supabase.from('users').update({ balance: newBal }).eq('user_id', userId);
}

export async function setUserRole(userId: number, role: string | null) {
  return await supabase.from('users').update({ role }).eq('user_id', userId);
}

export async function setPremium(userId: number, val: boolean) {
  return await supabase.from('users').update({ has_premium: val }).eq('user_id', userId);
}

export async function setRank(userId: number, rank: string | null) {
  return await supabase.from('users').update({ rank }).eq('user_id', userId);
}

// ===== ТУРНИРЫ =====
export async function getAllTournamentsAdmin() {
  const { data } = await supabase
    .from('tournaments')
    .select('*, organizers(name, tag)')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createTournament(params: {
  name: string;
  maxTeams: number;
  prizeGold: number;
  sponsorChannel: string | null;
  organizerId: number | null;
}) {
  return await supabase.from('tournaments').insert({
    name: params.name,
    max_teams: params.maxTeams,
    prize_gold: params.prizeGold,
    sponsor_channel: params.sponsorChannel,
    organizer_id: params.organizerId,
    status: 'waiting',
  }).select().single();
}

export async function finishTournament(tournamentId: number) {
  return await supabase
    .from('tournaments')
    .update({ status: 'finished' })
    .eq('id', tournamentId);
}

export async function activateTournament(tournamentId: number) {
  return await supabase
    .from('tournaments')
    .update({ status: 'active' })
    .eq('id', tournamentId);
}

export async function deleteTournament(tournamentId: number) {
  return await supabase.from('tournaments').delete().eq('id', tournamentId);
}

// ===== ОРГАНИЗАТОРЫ =====
export async function getAllOrganizersAdmin() {
  const { data } = await supabase
    .from('organizers')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createOrganizer(params: {
  name: string;
  tag: string;
  description: string;
  logoUrl: string | null;
  ownerId: number | null;
}) {
  return await supabase.from('organizers').insert({
    name: params.name,
    tag: params.tag,
    description: params.description,
    logo_url: params.logoUrl,
    owner_id: params.ownerId,
  }).select().single();
}

export async function updateOrganizer(id: number, fields: any) {
  return await supabase.from('organizers').update(fields).eq('id', id);
}

export async function deleteOrganizer(id: number) {
  return await supabase.from('organizers').delete().eq('id', id);
}

export async function uploadOrganizerLogo(organizerId: number, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `organizers/${organizerId}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('standoff')
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (error) {
    console.error('upload org logo error:', error);
    return null;
  }

  const { data } = supabase.storage.from('standoff').getPublicUrl(path);
  return data.publicUrl + '?t=' + Date.now();
}

// ===== УВЕДОМЛЕНИЯ =====
export async function sendNotificationToAll(title: string, body: string, link: string | null = null) {
  const { data: users } = await supabase.from('users').select('user_id');
  if (!users) return { error: 'Нет игроков' };

  const rows = users.map((u: any) => ({
    user_id: u.user_id,
    type: 'announcement',
    title, body, link,
  }));
  return await supabase.from('notifications').insert(rows);
}

export async function sendNotificationToUser(userId: number, title: string, body: string, link: string | null = null) {
  return await supabase.from('notifications').insert({
    user_id: userId,
    type: 'direct',
    title, body, link,
  });
}

export async function getMyNotifications(userId: number, limit = 30) {
  const { data } = await supabase
    .from('notifications').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function getUnreadCount(userId: number) {
  const { count } = await supabase
    .from('notifications').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('read', false);
  return count || 0;
}

export async function markAsRead(id: number) {
  return await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllAsRead(userId: number) {
  return await supabase.from('notifications').update({ read: true })
    .eq('user_id', userId).eq('read', false);
}
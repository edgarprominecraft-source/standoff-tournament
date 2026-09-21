import { supabase } from '../supabase';

export type Clan = {
  id: number;
  name: string;
  tag: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  leader_id: number | null;
  balance: number;
  wins: number;
  losses: number;
  points: number;
  is_open: boolean;
  created_at: string;
};

export type ClanMember = {
  id: number;
  clan_id: number;
  user_id: number;
  role: 'leader' | 'officer' | 'member';
  joined_at: string;
  user?: {
    user_id: number;
    nickname: string | null;
    first_name: string | null;
    photo_url: string | null;
    avatar_url: string | null;
    standoff_id: string | null;
    nickname_color: string | null;
    avatar_frame: string | null;
  };
};

export type ClanMessage = {
  id: number;
  clan_id: number;
  user_id: number;
  text: string;
  created_at: string;
  author_name?: string;
  author_photo?: string | null;
};

// ===== Получить все кланы =====
export async function getAllClans(): Promise<Clan[]> {
  const { data, error } = await supabase
    .from('clans')
    .select('*')
    .order('points', { ascending: false })
    .limit(50);
  if (error) { console.error(error); return []; }
  return (data as Clan[]) || [];
}

// ===== Клан по id =====
export async function getClan(clanId: number): Promise<Clan | null> {
  const { data } = await supabase
    .from('clans')
    .select('*')
    .eq('id', clanId)
    .maybeSingle();
  return (data as Clan) || null;
}

// ===== Клан по user_id =====
export async function getUserClan(userId: number): Promise<{ clan: Clan; role: string } | null> {
  const { data } = await supabase
    .from('clan_members')
    .select('clan_id, role, clans(*)')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data || !data.clans) return null;
  return { clan: data.clans as any, role: data.role };
}

// ===== Создать клан =====
export async function createClan(
  userId: number,
  name: string,
  tag: string,
  description: string
): Promise<{ clan: Clan | null; error: string | null }> {
  // Проверка: не в клане ли уже
  const existing = await getUserClan(userId);
  if (existing) return { clan: null, error: 'Ты уже в клане' };

  const { data: clan, error: clanErr } = await supabase
    .from('clans')
    .insert({
      name: name.trim(),
      tag: tag.trim().toUpperCase(),
      description: description.trim() || null,
      leader_id: userId,
      is_open: true,
    })
    .select()
    .single();

  if (clanErr) {
    if (clanErr.message.includes('unique')) return { clan: null, error: 'Такое имя уже занято' };
    return { clan: null, error: clanErr.message };
  }

  // Добавляем создателя как лидера
  await supabase.from('clan_members').insert({
    clan_id: clan.id,
    user_id: userId,
    role: 'leader',
  });

  // Обновляем users.clan_id
  await supabase.from('users').update({ clan_id: clan.id }).eq('user_id', userId);

  return { clan: clan as Clan, error: null };
}

// ===== Вступить в клан =====
export async function joinClan(
  userId: number,
  clanId: number,
  message?: string
): Promise<{ ok: boolean; error?: string; pending?: boolean }> {
  const existing = await getUserClan(userId);
  if (existing) return { ok: false, error: 'Ты уже в клане' };

  // Получаем режим вступления клана
  const { data: clan } = await supabase
    .from('clans')
    .select('join_mode, name')
    .eq('id', clanId)
    .maybeSingle();

  if (!clan) return { ok: false, error: 'Клан не найден' };

  const mode: string = (clan as any).join_mode || 'open';

  // 🔒 Закрытый — только по приглашению
  if (mode === 'invite') {
    return { ok: false, error: 'Клан принимает только по приглашению' };
  }

  // 🟡 По заявкам — создаём заявку и не добавляем сразу
  if (mode === 'request') {
    const { data: existingApp } = await supabase
      .from('clan_applications')
      .select('id')
      .eq('user_id', userId)
      .eq('clan_id', clanId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingApp) return { ok: false, error: 'Заявка уже отправлена' };

    const { error: appErr } = await supabase.from('clan_applications').insert({
      clan_id: clanId,
      user_id: userId,
      message: (message || '').slice(0, 300) || null,
      status: 'pending',
    });

    if (appErr) return { ok: false, error: appErr.message };
    return { ok: true, pending: true };
  }

  // 🟢 Открытый — сразу добавляем
  const { error } = await supabase.from('clan_members').insert({
    clan_id: clanId,
    user_id: userId,
    role: 'member',
  });

  if (error) return { ok: false, error: error.message };

  await supabase.from('users').update({ clan_id: clanId }).eq('user_id', userId);
  return { ok: true };
}

// ===== Покинуть клан =====
export async function leaveClan(userId: number, clanId: number): Promise<boolean> {
  const { error } = await supabase
    .from('clan_members')
    .delete()
    .eq('clan_id', clanId)
    .eq('user_id', userId);
  if (error) return false;
  await supabase.from('users').update({ clan_id: null }).eq('user_id', userId);
  return true;
}

// ===== Удалить клан (только лидер) =====
export async function deleteClan(clanId: number): Promise<boolean> {
  const { error } = await supabase.from('clans').delete().eq('id', clanId);
  return !error;
}

// ===== Обновить клан =====
export async function updateClan(clanId: number, fields: Partial<Clan>) {
  const { data, error } = await supabase
    .from('clans')
    .update(fields)
    .eq('id', clanId)
    .select()
    .single();
  return { data, error };
}

// ===== Участники клана =====
export async function getClanMembers(clanId: number): Promise<ClanMember[]> {
  const { data } = await supabase
    .from('clan_members')
    .select('id, clan_id, user_id, role, joined_at')
    .eq('clan_id', clanId)
    .order('joined_at', { ascending: true });

  if (!data || data.length === 0) return [];

  const userIds = data.map((m: any) => m.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, photo_url, avatar_url, standoff_id, nickname_color, avatar_frame')
    .in('user_id', userIds);

  const userMap = new Map<number, any>();
  (users ?? []).forEach((u) => userMap.set(u.user_id, u));

  return data.map((m: any) => ({
    ...m,
    user: userMap.get(m.user_id),
  }));
}

// ===== Сменить роль участнику =====
export async function setMemberRole(memberId: number, role: 'officer' | 'member') {
  return await supabase.from('clan_members').update({ role }).eq('id', memberId);
}

// ===== Кик участника =====
export async function kickMember(memberId: number, userId: number, clanId: number) {
  await supabase.from('clan_members').delete().eq('id', memberId);
  await supabase.from('users').update({ clan_id: null }).eq('user_id', userId).eq('clan_id', clanId);
}

// ===== Сообщения клана =====
export async function getClanMessages(clanId: number, limit = 100): Promise<ClanMessage[]> {
  const { data } = await supabase
    .from('clan_messages')
    .select('*')
    .eq('clan_id', clanId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (!data || data.length === 0) return [];

  const userIds = Array.from(new Set(data.map((m: any) => m.user_id)));
  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, photo_url, avatar_url')
    .in('user_id', userIds);

  const userMap = new Map<number, any>();
  (users ?? []).forEach((u) => userMap.set(u.user_id, u));

  return data.map((m: any) => {
    const u = userMap.get(m.user_id);
    return {
      ...m,
      author_name: u?.nickname || u?.first_name || 'Игрок',
      author_photo: u?.avatar_url || u?.photo_url || null,
    };
  });
}

export async function sendClanMessage(clanId: number, userId: number, text: string) {
  return await supabase.from('clan_messages').insert({
    clan_id: clanId,
    user_id: userId,
    text: text.slice(0, 500),
  });
}

// ===== РЕЖИМЫ КЛАНА =====
export type JoinMode = 'open' | 'request' | 'invite';

export async function setClanJoinMode(clanId: number, mode: JoinMode) {
  const { error } = await supabase
    .from('clans')
    .update({
      join_mode: mode,
      is_open: mode === 'open',
    })
    .eq('id', clanId);
  return { error: error?.message || null };
}

// ===== ЗАЯВКИ В КЛАН =====
export type ClanApplication = {
  id: number;
  clan_id: number;
  user_id: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: {
    user_id: number;
    nickname: string | null;
    first_name: string | null;
    avatar_url: string | null;
    photo_url: string | null;
    standoff_id: string | null;
  };
};

export async function requestJoinClan(
  userId: number,
  clanId: number,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const existing = await getUserClan(userId);
  if (existing) return { ok: false, error: 'Ты уже в клане' };

  // Проверка: уже есть заявка?
  const { data: existingApp } = await supabase
    .from('clan_applications')
    .select('id, status')
    .eq('user_id', userId)
    .eq('clan_id', clanId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingApp) return { ok: false, error: 'Заявка уже отправлена' };

  const { error } = await supabase.from('clan_applications').insert({
    clan_id: clanId,
    user_id: userId,
    message: message.slice(0, 300) || null,
    status: 'pending',
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getClanApplications(clanId: number): Promise<ClanApplication[]> {
  const { data } = await supabase
    .from('clan_applications')
    .select('*')
    .eq('clan_id', clanId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) return [];

  const userIds = data.map((a: any) => a.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id, last_seen')
    .in('user_id', userIds);

  const map = new Map<number, any>();
  (users ?? []).forEach((u) => map.set(u.user_id, u));

  return data.map((a: any) => ({
    ...a,
    user: map.get(a.user_id),
  }));
}

export async function approveApplication(appId: number, userId: number, clanId: number) {
  // 1. Обновляем статус заявки
  await supabase
    .from('clan_applications')
    .update({ status: 'approved' })
    .eq('id', appId);

  // 2. Добавляем в клан
  await supabase.from('clan_members').insert({
    clan_id: clanId,
    user_id: userId,
    role: 'member',
  });

  // 3. Обновляем users.clan_id
  await supabase.from('users').update({ clan_id: clanId }).eq('user_id', userId);
}

export async function rejectApplication(appId: number) {
  await supabase
    .from('clan_applications')
    .update({ status: 'rejected' })
    .eq('id', appId);
}
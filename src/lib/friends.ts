import { supabase } from '../supabase';

export type FriendUser = {
  user_id: number;
  nickname: string | null;
  first_name: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  standoff_id: string | null;
  nickname_color: string | null;
  role: string | null;
  rank: string | null;
  is_online?: boolean;
};

export async function getFriends(userId: number): Promise<FriendUser[]> {
  const { data: rows } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', userId);

  if (!rows || rows.length === 0) return [];

  const ids = rows.map((r: any) => r.friend_id);
  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id, nickname_color, role, rank')
    .in('user_id', ids);

  return (users as FriendUser[]) || [];
}

export async function addFriend(userId: number, friendId: number) {
  const { error } = await supabase
    .from('friends')
    .insert({ user_id: userId, friend_id: friendId });
  if (error) return { error: error.message };

  // Взаимно
  await supabase
    .from('friends')
    .insert({ user_id: friendId, friend_id: userId });
  return { error: null };
}

export async function removeFriend(userId: number, friendId: number) {
  await supabase.from('friends').delete().eq('user_id', userId).eq('friend_id', friendId);
  await supabase.from('friends').delete().eq('user_id', friendId).eq('friend_id', userId);
}

export async function searchUserById(userId: number): Promise<FriendUser | null> {
  const { data } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id, nickname_color, role, rank')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as FriendUser) || null;
}

// ===== ЛС =====
export type DM = {
  id: number;
  from_user_id: number;
  to_user_id: number;
  text: string;
  read: boolean;
  created_at: string;
  author_name?: string;
  author_photo?: string | null;
};

export async function getDirectMessages(userA: number, userB: number): Promise<DM[]> {
  const { data } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`and(from_user_id.eq.${userA},to_user_id.eq.${userB}),and(from_user_id.eq.${userB},to_user_id.eq.${userA})`)
    .order('created_at', { ascending: true })
    .limit(200);

  if (!data || data.length === 0) return [];

  const ids = Array.from(new Set(data.map((m: any) => m.from_user_id)));
  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, avatar_url, photo_url')
    .in('user_id', ids);

  const map = new Map<number, any>();
  (users ?? []).forEach((u) => map.set(u.user_id, u));

  return data.map((m: any) => {
    const u = map.get(m.from_user_id);
    return {
      ...m,
      author_name: u?.nickname || u?.first_name || 'Игрок',
      author_photo: u?.avatar_url || u?.photo_url || null,
    };
  });
}

export async function sendDM(fromUserId: number, toUserId: number, text: string) {
  return await supabase.from('direct_messages').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    text: text.slice(0, 1000),
  });
}

// ===== Кто мне писал (список диалогов) =====
export async function getDMChats(userId: number): Promise<{ user: FriendUser; last: string; count: number }[]> {
  const { data } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!data) return [];

  const map = new Map<number, { last: string; count: number }>();
  data.forEach((m: any) => {
    const other = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
    if (!map.has(other)) {
      map.set(other, { last: m.text, count: 1 });
    } else {
      const v = map.get(other)!;
      v.count += 1;
    }
  });

  const otherIds = Array.from(map.keys());
  if (otherIds.length === 0) return [];

  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id, nickname_color, role, rank')
    .in('user_id', otherIds);

  return (users || []).map((u: any) => ({
    user: u as FriendUser,
    last: map.get(u.user_id)?.last || '',
    count: map.get(u.user_id)?.count || 0,
  }));
}
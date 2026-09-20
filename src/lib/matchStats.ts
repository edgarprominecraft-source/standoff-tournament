import { supabase } from '../supabase';

export type MatchStat = {
  id: number;
  match_id: number;
  user_id: number;
  kills: number;
  deaths: number;
  assists: number;
  mvp: boolean;
  player_name?: string;
  player_photo?: string | null;
};

// Парсинг текста модера:
// "TeamA: p1 15-3-2, p2 12-5-4, p3 10-8-1; TeamB: ..."
export function parseStatsText(text: string): { teamLabel: string; stats: { name: string; k: number; d: number; a: number }[] }[] {
  const teams: any[] = [];
  const teamBlocks = text.split(';').map((s) => s.trim()).filter(Boolean);

  for (const block of teamBlocks) {
    const [labelPart, playersPart] = block.split(':').map((s) => s.trim());
    if (!playersPart) continue;

    const players = playersPart.split(',').map((s) => {
      const m = s.trim().match(/^(\S+)\s+(\d+)-(\d+)-(\d+)$/);
      if (!m) return null;
      return { name: m[1], k: parseInt(m[2]), d: parseInt(m[3]), a: parseInt(m[4]) };
    }).filter(Boolean) as any[];

    teams.push({ teamLabel: labelPart, stats: players });
  }

  return teams;
}

export async function saveMatchStats(matchId: number, stats: { user_id: number; kills: number; deaths: number; assists: number; mvp?: boolean }[]) {
  // Удаляем старые
  await supabase.from('match_stats').delete().eq('match_id', matchId);

  // Находим MVP
  let mvpId: number | null = null;
  let maxScore = -1;
  for (const s of stats) {
    const score = s.kills * 2 + s.assists - s.deaths;
    if (score > maxScore) { maxScore = score; mvpId = s.user_id; }
  }

  const rows = stats.map((s) => ({
    match_id: matchId,
    user_id: s.user_id,
    kills: s.kills,
    deaths: s.deaths,
    assists: s.assists,
    mvp: s.user_id === mvpId,
  }));

  const { error } = await supabase.from('match_stats').insert(rows);

  // Обновляем общие статы игроков
  if (!error) {
    for (const s of stats) {
      const { data: u } = await supabase
        .from('users')
        .select('kills, deaths')
        .eq('user_id', s.user_id)
        .maybeSingle();

      if (u) {
        await supabase.from('users').update({
          kills: (u.kills || 0) + s.kills,
          deaths: (u.deaths || 0) + s.deaths,
          matches_played: ((u as any).matches_played || 0) + 1,
        }).eq('user_id', s.user_id);
      }
    }
  }

  return { error };
}

export async function getMatchStats(matchId: number): Promise<MatchStat[]> {
  const { data } = await supabase
    .from('match_stats')
    .select('*')
    .eq('match_id', matchId)
    .order('kills', { ascending: false });

  if (!data) return [];

  const ids = data.map((s: any) => s.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, avatar_url, photo_url')
    .in('user_id', ids);

  const map = new Map<number, any>();
  (users ?? []).forEach((u) => map.set(u.user_id, u));

  return data.map((s: any) => {
    const u = map.get(s.user_id);
    return {
      ...s,
      player_name: u?.nickname || u?.first_name || 'Игрок',
      player_photo: u?.avatar_url || u?.photo_url || null,
    };
  });
}
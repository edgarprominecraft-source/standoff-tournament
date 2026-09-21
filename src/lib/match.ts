import { supabase } from '../supabase';

export async function getActiveTournaments() {
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, sponsor_channel, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getPendingMatches(tournamentId: number) {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .neq('status', 'done')
    .order('id', { ascending: true });

  if (!matches || matches.length === 0) return [];

  const teamIds = new Set<number>();
  matches.forEach((m: any) => {
    if (m.team1_id) teamIds.add(m.team1_id);
    if (m.team2_id) teamIds.add(m.team2_id);
  });

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .in('id', Array.from(teamIds));

  const clanIds = (teams || []).map((t: any) => t.clan_id).filter(Boolean);
  let clanMap = new Map<number, any>();
  if (clanIds.length > 0) {
    const { data: clans } = await supabase
      .from('clans')
      .select('id, name, tag, logo_url')
      .in('id', clanIds);
    (clans || []).forEach((c: any) => clanMap.set(c.id, c));
  }

  const teamMap = new Map<number, any>();
  (teams || []).forEach((t: any) => {
    const c = t.clan_id ? clanMap.get(t.clan_id) : null;
    teamMap.set(t.id, {
      ...t,
      clan_name: c?.name || t.team_name || 'Клан',
      clan_tag: c?.tag || t.clan_tag || '',
      clan_logo_url: c?.logo_url || t.logo_url || null,
    });
  });

  return matches.map((m: any) => ({
    ...m,
    team1: teamMap.get(m.team1_id),
    team2: teamMap.get(m.team2_id),
  }));
}

export async function getTeamPlayers(teamId: number) {
  const { data: team } = await supabase
    .from('teams')
    .select('clan_id')
    .eq('id', teamId)
    .maybeSingle();

  if (!team || !(team as any).clan_id) return [];

  const { data: members } = await supabase
    .from('clan_members')
    .select('user_id, role')
    .eq('clan_id', (team as any).clan_id);

  if (!members || members.length === 0) return [];

  const ids = members.map((m: any) => m.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id')
    .in('user_id', ids);

  const roleMap = new Map<number, string>();
  members.forEach((m: any) => roleMap.set(m.user_id, m.role));

  return (users || []).map((u: any) => ({
    ...u,
    role: roleMap.get(u.user_id) || 'member',
  }));
}

type PlayerStat = {
  user_id: number;
  nickname: string;
  kills: number;
  deaths: number;
  assists: number;
  notPresent: boolean;
};

export async function saveMatchResult(params: {
  matchId: number;
  tournamentId: number;
  scoreCt: number;
  scoreT: number;
  winnerTeamId: number;
  team1Name: string;
  team2Name: string;
  team1Players: PlayerStat[];
  team2Players: PlayerStat[];
  photoUrl: string | null;
  sponsorChannel: string | null;
  map: string | null;
}) {
  const {
    matchId, tournamentId, scoreCt, scoreT, winnerTeamId,
    team1Name, team2Name, team1Players, team2Players,
    photoUrl, sponsorChannel, map,
  } = params;

  // 1. Обновить матч
  await supabase
    .from('matches')
    .update({
      score_ct: scoreCt,
      score_t: scoreT,
      winner_id: winnerTeamId,
      photo_url: photoUrl,
      status: 'done',
      finished_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  // 2. Удалить старые stats
  await supabase.from('match_stats').delete().eq('match_id', matchId);

  // 3. Найти MVP
  const allPlayers = [...team1Players, ...team2Players];
  let mvpId: number | null = null;
  let maxScore = -Infinity;
  allPlayers.forEach((p) => {
    if (p.notPresent) return;
    const score = p.kills * 2 + p.assists - p.deaths;
    if (score > maxScore) {
      maxScore = score;
      mvpId = p.user_id;
    }
  });

  // 4. Сохранить stats
  const rows = allPlayers.map((p) => ({
    match_id: matchId,
    user_id: p.user_id,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    not_present: p.notPresent,
    mvp: p.user_id === mvpId,
  }));
  await supabase.from('match_stats').insert(rows);

  // 5. Обновить статистику игроков
  for (const p of allPlayers) {
    if (p.notPresent) continue;
    const { data: u } = await supabase
      .from('users')
      .select('kills, deaths, matches_played, wins, losses')
      .eq('user_id', p.user_id)
      .maybeSingle();
    if (!u) continue;

    const isWinner = [team1Players, team2Players]
      .findIndex((arr) => arr.some((x) => x.user_id === p.user_id)) === 0
      ? winnerTeamId === params.winnerTeamId // placeholder
      : false;

    await supabase
      .from('users')
      .update({
        kills: (u.kills || 0) + p.kills,
        deaths: (u.deaths || 0) + p.deaths,
        matches_played: (u.matches_played || 0) + 1,
      })
      .eq('user_id', p.user_id);
  }

  // 6. Обновить wins/losses у команды-победителя
  const winnerTeam = winnerTeamId === params.winnerTeamId ? winnerTeamId : winnerTeamId;
  const { data: wt } = await supabase
    .from('teams')
    .select('clan_id')
    .eq('id', winnerTeamId)
    .maybeSingle();
  if (wt && (wt as any).clan_id) {
    const { data: clan } = await supabase
      .from('clans')
      .select('wins, points')
      .eq('id', (wt as any).clan_id)
      .maybeSingle();
    if (clan) {
      await supabase
        .from('clans')
        .update({
          wins: (clan.wins || 0) + 1,
          points: (clan.points || 0) + 3,
        })
        .eq('id', (wt as any).clan_id);
    }
  }

  // 7. Пост в Telegram канал через бота
  const mvpPlayer = allPlayers.find((p) => p.user_id === mvpId);
  const lines = [
    `🏆 <b>${team1Name}</b> ${scoreCt} : ${scoreT} <b>${team2Name}</b>`,
    map ? `🗺 Карта: <b>${map}</b>` : '',
    '',
    `<b>Победитель:</b> ${winnerTeamId === params.winnerTeamId ? team1Name : team2Name}`,
    mvpPlayer ? `⭐ <b>MVP:</b> ${mvpPlayer.nickname}` : '',
  ].filter(Boolean);

  const channel = sponsorChannel || '@HePastic';

  await supabase.from('bot_commands').insert({
    command: 'send_match_result',
    payload: {
      channel,
      text: lines.join('\n'),
      photo_url: photoUrl,
    },
  });

  return { mvpId };
}
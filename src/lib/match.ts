import { supabase } from '../supabase';

export async function getActiveTournaments() {
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, sponsor_channel, status')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getAllMatches(tournamentId: number) {
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
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

// ===== Установить время матча =====
export async function setMatchTime(matchId: number, isoTime: string | null) {
  return await supabase
    .from('matches')
    .update({ scheduled_time: isoTime })
    .eq('id', matchId);
}

// ===== Вызов админа =====
export async function callAdmin(matchId: number, userId: number, reason: string) {
  return await supabase.from('admin_calls').insert({
    match_id: matchId,
    user_id: userId,
    reason,
  });
}

export async function getOpenCalls() {
  const { data } = await supabase
    .from('admin_calls')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function resolveCall(callId: number) {
  return await supabase
    .from('admin_calls')
    .update({ resolved: true })
    .eq('id', callId);
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

  await supabase.from('match_stats').delete().eq('match_id', matchId);

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

  for (const p of allPlayers) {
    if (p.notPresent) continue;
    const { data: u } = await supabase
      .from('users')
      .select('kills, deaths, matches_played')
      .eq('user_id', p.user_id)
      .maybeSingle();
    if (!u) continue;
    await supabase
      .from('users')
      .update({
        kills: (u.kills || 0) + p.kills,
        deaths: (u.deaths || 0) + p.deaths,
        matches_played: (u.matches_played || 0) + 1,
      })
      .eq('user_id', p.user_id);
  }

  // Клан-победитель
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

  await advanceWinner(matchId, winnerTeamId);
  return { mvpId };
}

// ===== Автораспределение времени 17:00-22:00 =====
export function generateRandomTime(): string {
  const now = new Date();
  const hour = 17 + Math.floor(Math.random() * 6); // 17..22
  const minute = Math.floor(Math.random() * 60);
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (d < now) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

// ===== Генерация матчей турнира (bracket) =====
export async function createBracketMatches(tournamentId: number): Promise<{ ok: boolean; error?: string; created?: number }> {
  // 1. Загружаем команды
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  if (tErr) return { ok: false, error: tErr.message };
  if (!teams || teams.length < 2) return { ok: false, error: 'Нужно минимум 2 команды' };

  // Случайное перемешивание команд (Fisher-Yates)
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 2. Проверяем, что матчей ещё нет
  const { data: existing } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: true, created: 0 };
  }

  // 3. Сетка до степени двойки
  const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(teams.length))));
  const padded: (number | null)[] = shuffled.map((t: any) => t.id);
  while (padded.length < size) padded.push(null);

  // 4. Первый раунд — пары команд
  const firstRoundRows: any[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    const t1 = padded[i];
    const t2 = padded[i + 1];
    if (!t1 && !t2) continue;

    firstRoundRows.push({
      tournament_id: tournamentId,
      team1_id: t1,
      team2_id: t2,
      status: 'pending',
      round: 1,
      position: i / 2,
      scheduled_time: generateRandomTime(),
    });
  }

  if (firstRoundRows.length === 0) return { ok: false, error: 'Не удалось создать матчи' };

  // 5. Вставляем первый раунд
  const { data: createdFirst, error: e1 } = await supabase
    .from('matches')
    .insert(firstRoundRows)
    .select('id, position');

  if (e1) return { ok: false, error: e1.message };

  let totalCreated = (createdFirst || []).length;

  // 6. Остальные раунды — пустые
  let prevCount = firstRoundRows.length;
  let roundNum = 2;

  while (prevCount > 1) {
    const nextCount = Math.floor(prevCount / 2);
    const rows: any[] = [];
    for (let i = 0; i < nextCount; i++) {
      rows.push({
        tournament_id: tournamentId,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        round: roundNum,
        position: i,
        scheduled_time: generateRandomTime(),
      });
    }
    const { data: cr, error: e2 } = await supabase
      .from('matches')
      .insert(rows)
      .select('id');

    if (e2) return { ok: false, error: e2.message };
    totalCreated += (cr || []).length;
    prevCount = nextCount;
    roundNum++;
  }

  return { ok: true, created: totalCreated };
}

// ===== Продвижение победителя в следующий матч =====
export async function advanceWinner(matchId: number, winnerTeamId: number) {
  const { data: current } = await supabase
    .from('matches')
    .select('id, tournament_id, round, position')
    .eq('id', matchId)
    .maybeSingle();

  if (!current) return;

  const t = current as any;
  if (!t.round || !t.tournament_id) return;

  const nextRound = t.round + 1;
  const nextPosition = Math.floor(t.position / 2);
  const slot = t.position % 2;

  const { data: nextMatch } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id')
    .eq('tournament_id', t.tournament_id)
    .eq('round', nextRound)
    .eq('position', nextPosition)
    .maybeSingle();

  if (!nextMatch) return;

  const update: any = {};
  if (slot === 0) update.team1_id = winnerTeamId;
  else update.team2_id = winnerTeamId;

  await supabase.from('matches').update(update).eq('id', (nextMatch as any).id);
}
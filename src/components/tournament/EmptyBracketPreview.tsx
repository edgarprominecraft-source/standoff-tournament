import { useEffect, useState } from 'react';
import { Users, Trophy } from 'lucide-react';
import { supabase } from '../../supabase';
import type { BracketTeam, BracketMatch } from '../../lib/bracket';
import BigBracket from './BigBracket';

type Props = {
  tournamentId: number;
  maxTeams: number;
  myClanId?: number | null;
};

export default function EmptyBracketPreview({ tournamentId, maxTeams, myClanId }: Props) {
  const [teams, setTeams] = useState<BracketTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('teams')
      .select('id, clan_id, clan_name, team_name, clan_logo_url, logo_url, side, created_at')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (data) {
      setTeams(
        data.map((t: any) => ({
          id: t.id,
          name: t.clan_name || t.team_name || 'Клан',
          captain_photo: null,
          logo_url: t.clan_logo_url || t.logo_url || null,
          clan_id: t.clan_id,
          players: [],
          side: t.side,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`preview-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tournamentId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
      </div>
    );
  }

  // Строим скелет сетки для maxTeams — все раунды, слотами
  const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(maxTeams || 2))));
  const padded: (BracketTeam | null)[] = [...teams];
  while (padded.length < size) padded.push(null);

  const rounds: BracketMatch[][] = [];
  const firstRound: BracketMatch[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    firstRound.push({
      round: 1,
      position: i / 2,
      team1: padded[i],
      team2: padded[i + 1],
      winner: null,
    });
  }
  rounds.push(firstRound);

  let prevCount = firstRound.length;
  let roundNum = 2;
  while (prevCount > 1) {
    const nextCount = Math.floor(prevCount / 2);
    const round: BracketMatch[] = [];
    for (let i = 0; i < nextCount; i++) {
      round.push({
        round: roundNum,
        position: i,
        team1: null,
        team2: null,
        winner: null,
      });
    }
    rounds.push(round);
    prevCount = nextCount;
    roundNum++;
  }

  // Моя команда — по clan_id
  const myTeam = myClanId ? teams.find((t) => t.clan_id === myClanId) : null;
  const myTeamId = myTeam?.id ?? null;

  const percent = maxTeams > 0 ? Math.round((teams.length / maxTeams) * 100) : 0;
  const remaining = Math.max(0, maxTeams - teams.length);

  return (
    <div className="space-y-3">
      {/* Инфо-полоса над сеткой */}
      <div className="bg-orange/5 border border-orange/30 rounded-2xl p-3 flex items-center gap-3">
        <Users className="w-4 h-4 text-orange shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-black text-xs font-bold flex items-center gap-2">
            Сетка турнира
            <span className="text-orange font-black">
              {teams.length} / {maxTeams}
            </span>
          </div>
          <div className="text-muted text-[11px] mt-0.5">
            {remaining > 0
              ? `Осталось ${remaining} ${remaining === 1 ? 'команда' : 'команд'} — матчи создадутся автоматически`
              : 'Все команды на месте — матчи скоро создадутся'}
          </div>
          <div className="mt-2 h-1.5 bg-bg2 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <Trophy className="w-5 h-5 text-orange shrink-0" />
      </div>

      {/* Полная структура сетки с раундами и линиями */}
      <BigBracket
        rounds={rounds}
        onTeamClick={() => {}}
        myTeamId={myTeamId}
        matchTimeMap={{}}
      />

      <div className="text-center text-muted text-[10px] font-semibold">
        Как только наберётся {maxTeams} команд — матчи начнутся автоматически
      </div>
    </div>
  );
}
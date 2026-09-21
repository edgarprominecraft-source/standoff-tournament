import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Users, Trophy, Swords } from 'lucide-react';
import { supabase } from '../../supabase';
import type { BracketTeam } from '../../lib/bracket';

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
    return () => { supabase.removeChannel(ch); };
  }, [tournamentId]);

  const half = Math.ceil(maxTeams / 2);
  const leftTeams = teams.slice(0, half);
  const rightTeams = teams.slice(half);

  const leftSlots: (BracketTeam | null)[] = [
    ...leftTeams,
    ...Array(Math.max(0, half - leftTeams.length)).fill(null),
  ];
  const rightSlots: (BracketTeam | null)[] = [
    ...rightTeams,
    ...Array(Math.max(0, half - rightTeams.length)).fill(null),
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-border p-4 shadow-card overflow-x-auto">
      <div className="text-center mb-4">
        <div className="text-orange text-[11px] font-black uppercase tracking-widest">
          Сетка заполняется
        </div>
        <div className="text-muted text-[10px] font-bold mt-0.5">
          {teams.length} / {maxTeams} команд · матчи создадутся автоматически
        </div>
      </div>

      <div className="flex items-stretch justify-center gap-3 min-w-max">
        {/* ЛЕВАЯ СТОРОНА */}
        <div className="flex flex-col gap-1.5" style={{ width: 200 }}>
          {leftSlots.map((t, i) => (
            <Slot key={`L-${i}`} team={t} index={i} myClanId={myClanId} />
          ))}
        </div>

        {/* ЦЕНТР */}
        <div className="flex flex-col justify-center items-center gap-3 px-4">
          <div className="text-center">
            <div className="text-orange text-[11px] font-black uppercase tracking-widest">
              Финал
            </div>
            <div className="text-muted text-[10px] font-bold mt-0.5">Ожидание</div>
          </div>

          <div className="w-[160px]">
            <div className="bg-bg2 border border-dashed border-border2 rounded-xl p-3 text-center">
              <Swords className="w-4 h-4 text-muted2 mx-auto mb-1" />
              <div className="text-muted2 text-[10px] font-bold">Ожидание</div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-orange to-orange2 rounded-2xl p-4 text-center shadow-orange"
            style={{ width: 140 }}
          >
            <Trophy className="w-7 h-7 text-white mx-auto mb-1.5" strokeWidth={2} />
            <div className="text-white font-black text-[10px] uppercase tracking-wider">
              Чемпион
            </div>
            <div className="text-white/60 text-[10px] mt-1 font-semibold">Пока нет</div>
          </motion.div>
        </div>

        {/* ПРАВАЯ СТОРОНА */}
        <div className="flex flex-col gap-1.5" style={{ width: 200 }}>
          {rightSlots.map((t, i) => (
            <Slot key={`R-${i}`} team={t} index={i + half} myClanId={myClanId} />
          ))}
        </div>
      </div>

      <div className="text-center mt-4 text-muted text-[10px]">
        Как только наберётся {maxTeams} команд — матчи создадутся автоматически
      </div>
    </div>
  );
}

function Slot({ team, index, myClanId }: { team: BracketTeam | null; index: number; myClanId?: number | null }) {
  const isMine = myClanId && team?.clan_id === myClanId;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`rounded-xl p-2 flex items-center gap-2 h-[48px] border transition-colors ${
        team
          ? isMine
            ? 'bg-orange/10 border-orange/50'
            : 'bg-card border-border'
          : 'bg-bg2/50 border-dashed border-border2'
      }`}
    >
      {team ? (
        <>
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
            {team.logo_url ? (
              <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-black text-[11px] font-bold truncate">{team.name}</div>
            <div className="text-muted text-[9px] font-bold flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" /> в турнире
            </div>
          </div>
          {isMine && (
            <span className="text-[8px] font-black bg-orange text-white rounded px-1 py-0.5 flex-shrink-0">
              МОЯ
            </span>
          )}
        </>
      ) : (
        <>
          <div className="w-7 h-7 rounded-md bg-bg3 border border-border2 flex items-center justify-center flex-shrink-0">
            <Lock className="w-3 h-3 text-muted2" />
          </div>
          <div className="text-muted2 text-[10px] font-bold">Свободно</div>
        </>
      )}
    </motion.div>
  );
}
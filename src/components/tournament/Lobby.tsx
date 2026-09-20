import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, Check, Hourglass } from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import TeamCard from './TeamCard';
import type { BracketTeam } from '../../lib/bracket';

type Props = {
  tournamentId: number;
  maxTeams: number;
  user: User;
  onReady: () => void;
};

type RawTeam = {
  id: number;
  player1_id: number;
  player2_id: number | null;
  side: 'left' | 'right' | null;
};

export default function Lobby({ tournamentId, maxTeams, user, onReady }: Props) {
  const [teams, setTeams] = useState<BracketTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadTeams = async () => {
    const { data: rawTeams } = await supabase
      .from('teams')
      .select('id, player1_id, player2_id, side')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (!rawTeams || rawTeams.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const userIds = new Set<number>();
    (rawTeams as RawTeam[]).forEach((t) => {
      userIds.add(t.player1_id);
      if (t.player2_id) userIds.add(t.player2_id);
    });

    const { data: users } = await supabase
      .from('users')
      .select('user_id, nickname, first_name, photo_url, standoff_id')
      .in('user_id', Array.from(userIds));

    const userMap = new Map<number, any>();
    (users ?? []).forEach((u) => userMap.set(u.user_id, u));

    const enriched: BracketTeam[] = (rawTeams as RawTeam[]).map((t) => {
      const p1 = userMap.get(t.player1_id);
      const p2 = t.player2_id ? userMap.get(t.player2_id) : null;
      return {
        id: t.id,
        player1_id: t.player1_id,
        player2_id: t.player2_id,
        side: t.side,
        player1_name: p1?.nickname || p1?.first_name || 'Игрок 1',
        player2_name: p2?.nickname || p2?.first_name || null,
        player1_photo: p1?.photo_url ?? null,
        player2_photo: p2?.photo_url ?? null,
      };
    });

    setTeams(enriched);
    if (enriched.length >= maxTeams) onReady();
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
    const channel = supabase
      .channel(`lobby-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => loadTeams()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  const myTeam = teams.find(
    (t) => t.player1_id === user.user_id || t.player2_id === user.user_id
  );
  const isLeader = myTeam?.player1_id === user.user_id;
  const hasPartner = myTeam?.player2_id !== null && myTeam?.player2_id !== undefined;

  const joinAsAlone = async () => {
    if (!user.standoff_id) {
      hapticError();
      setMsg('Сначала добавь Standoff ID в профиле');
      return;
    }
    if (myTeam) {
      hapticError();
      setMsg('Ты уже в лобби');
      return;
    }
    if (teams.length >= maxTeams) {
      hapticError();
      setMsg('Все места заняты');
      return;
    }

    setJoining(true);
    haptic('medium');

    const lonely = teams.find((t) => !t.player2_id);
    if (lonely) {
      const { error } = await supabase
        .from('teams')
        .update({ player2_id: user.user_id })
        .eq('id', lonely.id);
      if (error) { hapticError(); setMsg(error.message); }
      else { hapticSuccess(); setMsg('Ты присоединился к команде'); }
    } else {
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const { error } = await supabase.from('teams').insert({
        tournament_id: tournamentId,
        player1_id: user.user_id,
        player2_id: null,
        side,
      });
      if (error) { hapticError(); setMsg(error.message); }
      else { hapticSuccess(); setMsg('Ты в лобби. Ждём напарника.'); }
    }
    setJoining(false);
  };

  const leave = async () => {
    if (!myTeam) return;
    haptic('medium');
    if (isLeader && hasPartner) {
      await supabase
        .from('teams')
        .update({ player1_id: myTeam.player2_id, player2_id: null })
        .eq('id', myTeam.id);
    } else if (!isLeader) {
      await supabase
        .from('teams')
        .update({ player2_id: null })
        .eq('id', myTeam.id);
    } else {
      await supabase.from('teams').delete().eq('id', myTeam.id);
    }
    hapticSuccess();
    setMsg('Ты вышел из лобби');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка лобби</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white" />
            <div className="text-white font-bold">Лобби</div>
          </div>
          <div className="text-white text-sm font-bold">
            {teams.length} <span className="text-muted">/ {maxTeams}</span>
          </div>
        </div>
        <div className="text-muted text-xs">
          Собери команду 2х2. Если ты один — найдём напарника.
        </div>

        <div className="mt-3 h-2 bg-bg rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(teams.length / maxTeams) * 100}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-white"
          />
        </div>
      </motion.div>

      {msg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card2 border border-border rounded-xl p-3 text-sm text-white"
        >
          {msg}
        </motion.div>
      )}

      {!myTeam ? (
        <button
          onClick={joinAsAlone}
          disabled={joining || teams.length >= maxTeams}
          className="w-full bg-white text-black font-bold rounded-xl py-3.5 text-sm disabled:opacity-40 hover:bg-white/90 transition-colors"
        >
          {teams.length >= maxTeams ? 'Мест нет' : joining ? 'Вход...' : 'Войти в лобби'}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card2 border border-border rounded-xl p-4"
        >
          <div className="text-white text-sm mb-1 font-semibold flex items-center gap-2">
            {isLeader && (
              <span className="text-[10px] uppercase tracking-wider bg-white/10 border border-white/30 rounded px-1.5 py-0.5">
                Капитан
              </span>
            )}
            <span>Ты в команде</span>
          </div>
          <div className="text-muted text-xs mb-3 flex items-center gap-1.5">
            {hasPartner ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                Напарник найден
              </>
            ) : (
              <>
                <Hourglass className="w-3.5 h-3.5 text-yellow-400" />
                Ждём напарника
              </>
            )}
          </div>
          <button
            onClick={leave}
            className="w-full bg-bg border border-border text-muted text-xs rounded-xl py-2.5 hover:border-white/30 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Покинуть лобби
          </button>
        </motion.div>
      )}

      <div className="space-y-2">
        <div className="text-muted text-[10px] uppercase tracking-widest px-1">
          Команды
        </div>
        <AnimatePresence>
          {teams.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <TeamCard team={t} winner={myTeam?.id === t.id} />
            </motion.div>
          ))}
        </AnimatePresence>
        {teams.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-4 text-center text-muted text-xs">
            Пока никто не зашёл
          </div>
        )}
      </div>
    </div>
  );
}
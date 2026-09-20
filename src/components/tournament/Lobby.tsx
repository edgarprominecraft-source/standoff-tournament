import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import TeamCard from './TeamCard';
import type { BracketTeam } from '../../lib/bracket';

type Props = {
  tournamentId: number;
  maxTeams: number;
  user: User;
  onReady: () => void; // вызовется, когда все места заняты
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

    // Если мест больше нет — говорим родителю готовиться
    if (enriched.length >= maxTeams) {
      onReady();
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();

    // Realtime подписка на новые команды
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  // Проверка: я уже в лобби?
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

    // Ищем команду с 1 игроком, чтобы встать к нему в пару
    const lonely = teams.find((t) => !t.player2_id);

    if (lonely) {
      const { error } = await supabase
        .from('teams')
        .update({ player2_id: user.user_id })
        .eq('id', lonely.id);

      if (error) {
        hapticError();
        setMsg(error.message);
      } else {
        hapticSuccess();
        setMsg('Ты присоединился к команде!');
      }
    } else {
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const { error } = await supabase.from('teams').insert({
        tournament_id: tournamentId,
        player1_id: user.user_id,
        player2_id: null,
        side,
      });

      if (error) {
        hapticError();
        setMsg(error.message);
      } else {
        hapticSuccess();
        setMsg('Ты в лобби! Ждём напарника.');
      }
    }
    setJoining(false);
  };

  const leave = async () => {
    if (!myTeam) return;
    haptic('medium');

    if (isLeader && hasPartner) {
      // Если я капитан и есть напарник — просто отцепляюсь, команда остаётся
      await supabase
        .from('teams')
        .update({ player1_id: myTeam.player2_id, player2_id: null })
        .eq('id', myTeam.id);
    } else if (!isLeader) {
      // Если я второй — отцепляюсь от команды
      await supabase
        .from('teams')
        .update({ player2_id: null })
        .eq('id', myTeam.id);
    } else {
      // Если я один — удаляю команду
      await supabase.from('teams').delete().eq('id', myTeam.id);
    }
    hapticSuccess();
    setMsg('Ты вышел из лобби');
  };

  if (loading) {
    return (
      <div className="text-muted text-center py-10 text-sm">
        Загрузка лобби...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex justify-between items-center mb-1">
          <div className="text-white font-bold">🏟 Лобби</div>
          <div className="text-white text-sm">
            {teams.length} / {maxTeams}
          </div>
        </div>
        <div className="text-muted text-xs">
          Собери команду 2х2. Если ты один — бот найдёт тебе напарника.
        </div>

        {/* Прогресс-бар */}
        <div className="mt-3 h-2 bg-bg rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(teams.length / maxTeams) * 100}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-white"
          />
        </div>
      </div>

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
          className="w-full bg-white text-black font-bold rounded-xl py-3 text-sm disabled:opacity-40"
        >
          {teams.length >= maxTeams
            ? 'Мест нет'
            : joining
            ? 'Вход...'
            : 'Войти в лобби'}
        </button>
      ) : (
        <div className="bg-card2 border border-border rounded-xl p-4">
          <div className="text-white text-sm mb-2">
            Ты в команде {isLeader ? '(капитан)' : ''}
          </div>
          <div className="text-muted text-xs mb-3">
            {hasPartner
              ? 'Напарник найден ✓'
              : 'Ждём напарника... Можешь позвать друга.'}
          </div>
          <button
            onClick={leave}
            className="w-full bg-bg border border-border text-muted text-xs rounded-xl py-2"
          >
            Покинуть лобби
          </button>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-muted text-xs uppercase tracking-wide px-1">
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
              <TeamCard
                team={t}
                winner={
                  myTeam?.id === t.id
                }
              />
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
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, Check, Hourglass, Crown, X, Shield } from 'lucide-react';
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
  player3_id: number | null;
  player4_id: number | null;
  player5_id: number | null;
  side: 'left' | 'right' | null;
  team_name: string | null;
  logo_url: string | null;
};

const MAX_PLAYERS = 5;

export default function Lobby({ tournamentId, maxTeams, user, onReady }: Props) {
  const [teams, setTeams] = useState<BracketTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamName, setTeamName] = useState('');

  const loadTeams = async () => {
    const { data: rawTeams } = await supabase
      .from('teams')
      .select('id, player1_id, player2_id, player3_id, player4_id, player5_id, side, team_name, logo_url')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (!rawTeams || rawTeams.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const userIds = new Set<number>();
    (rawTeams as RawTeam[]).forEach((t) => {
      [t.player1_id, t.player2_id, t.player3_id, t.player4_id, t.player5_id].forEach((id) => {
        if (id) userIds.add(id);
      });
    });

    const { data: users } = await supabase
      .from('users')
      .select('user_id, nickname, first_name, photo_url, avatar_url, standoff_id')
      .in('user_id', Array.from(userIds));

    const userMap = new Map<number, any>();
    (users ?? []).forEach((u) => userMap.set(u.user_id, u));

    const enriched: BracketTeam[] = (rawTeams as RawTeam[]).map((t) => {
      const ids = [t.player1_id, t.player2_id, t.player3_id, t.player4_id, t.player5_id].filter(Boolean) as number[];
      const players = ids.map((id) => {
        const u = userMap.get(id);
        return {
          id,
          name: u?.nickname || u?.first_name || 'Игрок',
          photo: u?.avatar_url || u?.photo_url || null,
          standoff_id: u?.standoff_id || null,
        };
      });
      const captain = userMap.get(t.player1_id);
      return {
        id: t.id,
        name: t.team_name || captain?.nickname || captain?.first_name || 'Команда',
        captain_photo: captain?.avatar_url || captain?.photo_url || null,
        logo_url: t.logo_url || null,
        players,
        side: t.side,
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
        { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tournamentId}` },
        () => loadTeams()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  const myTeam = teams.find((t) => t.players.some((p) => p.id === user.user_id));
  const isCaptain = myTeam?.players[0]?.id === user.user_id;
  const myPlayersCount = myTeam?.players.length ?? 0;

  // Открыть модалку создания команды
  const openCreateModal = () => {
    if (!user.standoff_id) {
      hapticError();
      setMsg('Сначала добавь Standoff ID в профиле');
      return;
    }
    if (myTeam) { hapticError(); setMsg('Ты уже в команде'); return; }
    if (teams.length >= maxTeams) { hapticError(); setMsg('Все места заняты'); return; }

    setTeamName(user.nickname || user.first_name || '');
    setShowCreateModal(true);
  };

  // Создать новую команду
  const createTeam = async () => {
    if (!teamName.trim() || teamName.trim().length < 2) {
      hapticError();
      setMsg('Название минимум 2 символа');
      return;
    }
    if (teamName.trim().length > 30) {
      hapticError();
      setMsg('Название максимум 30 символов');
      return;
    }

    setJoining(true);
    haptic('medium');

    const { error } = await supabase.from('teams').insert({
      tournament_id: tournamentId,
      player1_id: user.user_id,
      captain_id: user.user_id,
      team_name: teamName.trim(),
      side: Math.random() < 0.5 ? 'left' : 'right',
    });

    if (error) {
      hapticError();
      setMsg(error.message);
    } else {
      hapticSuccess();
      setMsg(`Команда "${teamName.trim()}" создана! Ждём ещё игроков.`);
      setShowCreateModal(false);
    }
    setJoining(false);
  };

  // Присоединиться к неполной команде
  const joinExistingTeam = async () => {
    if (!user.standoff_id) {
      hapticError(); setMsg('Сначала добавь Standoff ID в профиле'); return;
    }
    if (myTeam) { hapticError(); setMsg('Ты уже в команде'); return; }
    if (teams.length >= maxTeams) { hapticError(); setMsg('Все места заняты'); return; }

    setJoining(true);
    haptic('medium');

    const { data: rawTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId);

    const incomplete = (rawTeams || []).find((t: any) => {
      const count = [t.player1_id, t.player2_id, t.player3_id, t.player4_id, t.player5_id].filter(Boolean).length;
      return count < MAX_PLAYERS;
    });

    if (incomplete) {
      const t: any = incomplete;
      const slot = !t.player2_id ? 'player2_id'
        : !t.player3_id ? 'player3_id'
        : !t.player4_id ? 'player4_id'
        : 'player5_id';
      const { error } = await supabase.from('teams').update({ [slot]: user.user_id }).eq('id', t.id);
      if (error) { hapticError(); setMsg(error.message); }
      else { hapticSuccess(); setMsg('Ты присоединился к команде'); }
    } else {
      // Нет неполных — открываем модалку создания
      setShowCreateModal(true);
    }
    setJoining(false);
  };

  const leave = async () => {
    if (!myTeam) return;
    haptic('medium');

    const { data: rawTeams } = await supabase
      .from('teams').select('*').eq('id', myTeam.id).maybeSingle();

    if (!rawTeams) return;
    const t: any = rawTeams;

    const isInSlot = (slot: string) => t[slot] === user.user_id;
    const updates: any = {};

    if (isCaptain && myPlayersCount === 1) {
      await supabase.from('teams').delete().eq('id', myTeam.id);
    } else if (isCaptain && myPlayersCount > 1) {
      const next = t.player2_id || t.player3_id || t.player4_id || t.player5_id;
      updates.player1_id = next;
      updates.captain_id = next;
      updates.player2_id = t.player2_id === next ? null : t.player2_id;
      updates.player3_id = t.player3_id === next ? null : t.player3_id;
      updates.player4_id = t.player4_id === next ? null : t.player4_id;
      updates.player5_id = t.player5_id === next ? null : t.player5_id;
      await supabase.from('teams').update(updates).eq('id', myTeam.id);
    } else {
      if (isInSlot('player2_id')) updates.player2_id = null;
      if (isInSlot('player3_id')) updates.player3_id = null;
      if (isInSlot('player4_id')) updates.player4_id = null;
      if (isInSlot('player5_id')) updates.player5_id = null;
      await supabase.from('teams').update(updates).eq('id', myTeam.id);
    }
    hapticSuccess();
    setMsg('Ты вышел из команды');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка лобби</div>
      </div>
    );
  }

  const hasIncompleteTeam = teams.some((t) => t.players.length < MAX_PLAYERS);

  return (
    <div className="space-y-4">
      {/* Шапка лобби */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-5 shadow-orange relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <div className="text-white font-black text-lg">Лобби</div>
          </div>
          <div className="text-white text-lg font-black">
            {teams.length} <span className="text-white/60">/ {maxTeams}</span>
          </div>
        </div>
        <div className="relative text-white/90 text-xs font-medium">
          Создай команду или присоединись к существующей
        </div>

        <div className="relative mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
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
          className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-sm text-orange font-semibold"
        >
          {msg}
        </motion.div>
      )}

      {/* Моя команда */}
      {!myTeam ? (
        <div className="space-y-2">
          <button
            onClick={openCreateModal}
            disabled={joining || teams.length >= maxTeams}
            className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            {teams.length >= maxTeams ? 'Мест нет' : 'Создать команду'}
          </button>

          {hasIncompleteTeam && (
            <button
              onClick={joinExistingTeam}
              disabled={joining}
              className="w-full bg-white border-2 border-border text-black font-black rounded-2xl py-4 text-sm disabled:opacity-40 hover:border-orange transition-colors flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              Присоединиться к команде
            </button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            {isCaptain && (
              <span className="role-admin">
                <Crown className="w-3 h-3" />
                Капитан
              </span>
            )}
            <span className="text-black text-sm font-bold">
              {myTeam.name}
            </span>
          </div>
          <div className="text-muted text-xs mb-3 flex items-center gap-1.5">
            {myPlayersCount === MAX_PLAYERS ? (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                Состав полный ({myPlayersCount}/{MAX_PLAYERS})
              </>
            ) : (
              <>
                <Hourglass className="w-3.5 h-3.5 text-orange" />
                Ждём ещё {MAX_PLAYERS - myPlayersCount} игроков
              </>
            )}
          </div>
          <button
            onClick={leave}
            className="w-full bg-bg2 border border-border text-muted text-xs rounded-xl py-2.5 hover:border-orange/40 hover:text-orange transition-colors flex items-center justify-center gap-1.5 font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Покинуть команду
          </button>
        </motion.div>
      )}

      {/* Список команд */}
      <div className="space-y-2">
        <div className="text-muted text-[10px] uppercase tracking-widest px-1 font-bold">
          Команды ({teams.length})
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
          <div className="bg-card border border-border rounded-xl p-4 text-center text-muted text-xs font-medium">
            Пока никто не зашёл — будь первым
          </div>
        )}
      </div>

      {/* Модалка создания команды */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-black font-black text-base">Создать команду</div>
                    <div className="text-muted text-[10px] uppercase tracking-widest font-bold">
                      Шаг 1 из 1
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-black" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1.5">
                    Название команды
                  </label>
                  <input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value.slice(0, 30))}
                    placeholder="Например: Virtus Pro"
                    maxLength={30}
                    autoFocus
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm focus:border-orange transition-colors"
                  />
                  <div className="text-muted text-[10px] mt-1 text-right">
                    {teamName.length} / 30
                  </div>
                </div>

                <button
                  onClick={createTeam}
                  disabled={joining || !teamName.trim() || teamName.trim().length < 2}
                  className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors"
                >
                  {joining ? 'Создаём...' : 'Создать команду'}
                </button>

                <p className="text-muted text-[10px] text-center leading-relaxed">
                  Ты станешь капитаном. Друзья смогут присоединиться к команде.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
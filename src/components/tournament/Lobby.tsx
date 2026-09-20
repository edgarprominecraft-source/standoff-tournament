import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, Check, Hourglass, Crown, X, Shield, AlertTriangle } from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import type { BracketTeam } from '../../lib/bracket';

type Props = {
  tournamentId: number;
  maxTeams: number;
  user: User;
  onReady: () => void;
};

type MyClan = {
  id: number;
  name: string;
  tag: string;
  logo_url: string | null;
  members_count: number;
};

const MIN_CLAN_MEMBERS = 5;

export default function Lobby({ tournamentId, maxTeams, user, onReady }: Props) {
  const [teams, setTeams] = useState<BracketTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [myClan, setMyClan] = useState<MyClan | null>(null);
  const [clanError, setClanError] = useState<string | null>(null);

  // ====== Загрузка команд ======
  const loadTeams = async () => {
    const { data: rawTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (!rawTeams || rawTeams.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const enriched: BracketTeam[] = (rawTeams as any[]).map((t) => ({
      id: t.id,
      name: t.clan_name || t.team_name || 'Клан',
      captain_photo: null,
      logo_url: t.clan_logo_url || t.logo_url || null,
      players: [],
      side: t.side,
    }));

    setTeams(enriched);
    if (enriched.length >= maxTeams) onReady();
    setLoading(false);
  };

  // ====== Загрузка моего клана ======
  const loadMyClan = async () => {
    if (!user.clan_id) {
      setMyClan(null);
      setClanError('Ты не в клане. Вступи в клан или создай свой, чтобы участвовать.');
      return;
    }

    const { data: clan } = await supabase
      .from('clans')
      .select('id, name, tag, logo_url')
      .eq('id', user.clan_id)
      .maybeSingle();

    if (!clan) {
      setMyClan(null);
      setClanError('Клан не найден');
      return;
    }

    const { count } = await supabase
      .from('clan_members')
      .select('id', { count: 'exact', head: true })
      .eq('clan_id', clan.id);

    setMyClan({
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      logo_url: clan.logo_url,
      members_count: count || 0,
    });

    if ((count || 0) < MIN_CLAN_MEMBERS) {
      setClanError(`Нужно минимум ${MIN_CLAN_MEMBERS} игроков в клане (сейчас ${count || 0})`);
    } else {
      setClanError(null);
    }
  };

  useEffect(() => {
    loadTeams();
    loadMyClan();

    const channel = supabase
      .channel(`lobby-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tournamentId}` },
        () => loadTeams()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, user.clan_id]);

  // ====== Моя команда (по клану) ======
  const myTeam = teams.find((t) => t.name === myClan?.name);
  const alreadyJoined = !!myTeam;
  const full = teams.length >= maxTeams;

  // ====== Вступить от клана ======
  const joinWithClan = async () => {
    if (!myClan) {
      hapticError();
      setMsg('Сначала вступи в клан');
      return;
    }
    if (clanError) {
      hapticError();
      setMsg(clanError);
      return;
    }
    if (alreadyJoined) {
      hapticError();
      setMsg('Твой клан уже участвует');
      return;
    }
    if (full) {
      hapticError();
      setMsg('Все места заняты');
      return;
    }

    setJoining(true);
    haptic('medium');

    try {
      const { error } = await supabase.from('teams').insert({
        tournament_id: tournamentId,
        player1_id: user.user_id,
        captain_id: user.user_id,
        clan_id: myClan.id,
        clan_name: myClan.name,
        clan_tag: myClan.tag,
        clan_logo_url: myClan.logo_url,
        team_name: myClan.name,
        logo_url: myClan.logo_url,
        side: Math.random() < 0.5 ? 'left' : 'right',
      });

      if (error) {
        hapticError();
        setMsg(error.message);
      } else {
        hapticSuccess();
        setMsg(`Клан "${myClan.name}" вступил в турнир!`);
      }
    } catch (e: any) {
      hapticError();
      setMsg(e.message || 'Ошибка');
    }
    setJoining(false);
  };

  // ====== Покинуть турнир (лидер) ======
  const leaveTournament = async () => {
    if (!myTeam) return;
    haptic('medium');

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', myTeam.id)
      .maybeSingle();

    if (!teamData) return;

    // Только лидер клана может выйти
    const { data: member } = await supabase
      .from('clan_members')
      .select('role')
      .eq('clan_id', (teamData as any).clan_id)
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (!member || member.role !== 'leader') {
      hapticError();
      setMsg('Только лидер клана может вывести его из турнира');
      return;
    }

    await supabase.from('teams').delete().eq('id', myTeam.id);
    hapticSuccess();
    setMsg('Клан вышел из турнира');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка лобби</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Шапка */}
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
          Кланы участвуют в турнире
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

      {/* Мой клан */}
      {!myClan ? (
        <div className="bg-card border-2 border-orange/40 rounded-2xl p-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange/10 border border-orange/30 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-8 h-8 text-orange" />
          </div>
          <div className="text-black font-black text-base mb-1">Ты не в клане</div>
          <p className="text-muted text-xs leading-relaxed mb-3">
            Чтобы участвовать в турнире — вступи в клан или создай свой.
            Минимум {MIN_CLAN_MEMBERS} игроков.
          </p>
          <div className="text-muted text-[10px]">
            Перейди во вкладку «КЛАН» внизу
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
              {myClan.logo_url ? (
                <img src={myClan.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-lg">
                  {myClan.tag.slice(0, 2)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-black font-black text-base truncate">
                {myClan.name}
              </div>
              <div className="text-orange font-bold text-xs">[{myClan.tag}]</div>
              <div className="text-muted text-[10px] mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {myClan.members_count} / {MIN_CLAN_MEMBERS}+ игроков
              </div>
            </div>
          </div>

          {clanError && (
            <div className="mt-3 bg-danger/10 border border-danger/30 rounded-xl p-2.5 text-xs text-danger font-semibold">
              {clanError}
            </div>
          )}
        </motion.div>
      )}

      {/* Кнопки действия */}
      {myClan && (
        <>
          {!alreadyJoined ? (
            <button
              onClick={joinWithClan}
              disabled={joining || full || !!clanError}
              className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {full ? 'Мест нет' : joining ? 'Вступаем...' : 'Вступить от клана'}
            </button>
          ) : (
            <div className="bg-card border border-success/40 rounded-2xl p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-success" />
                <span className="text-black font-bold text-sm">
                  Клан в турнире
                </span>
              </div>
              <button
                onClick={leaveTournament}
                className="w-full bg-bg2 border border-border text-danger text-xs rounded-xl py-2.5 hover:border-danger/40 transition-colors flex items-center justify-center gap-1.5 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Вывести клан из турнира
              </button>
            </div>
          )}
        </>
      )}

      {/* Список кланов в турнире */}
      <div className="space-y-2">
        <div className="text-muted text-[10px] uppercase tracking-widest px-1 font-bold">
          Кланы в турнире ({teams.length})
        </div>
        <AnimatePresence>
          {teams.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-card"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
                {t.logo_url ? (
                  <img src={t.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-xs">
                    {t.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-black font-bold text-sm truncate">{t.name}</div>
                <div className="text-muted text-[10px]">В турнире</div>
              </div>
              <Check className="w-4 h-4 text-success" />
            </motion.div>
          ))}
        </AnimatePresence>
        {teams.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-4 text-center text-muted text-xs font-medium">
            Пока никто не зашёл — будь первым
          </div>
        )}
      </div>
    </div>
  );
}
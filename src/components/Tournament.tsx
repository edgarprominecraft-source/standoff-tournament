import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, ArrowLeft, Lock, Swords, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase, type User, type Tournament as TTournament } from '../supabase';
import { haptic, hapticError } from '../lib/telegram';
import { buildBracket, type BracketMatch, type BracketTeam } from '../lib/bracket';
import { getTelegramUser } from '../lib/telegram';
import Lobby from './tournament/Lobby';
import Bracket from './tournament/Bracket';
import MatchRoom from './tournament/MatchRoom';
import SponsorModal, { type Sponsor } from './tournament/SponsorModal';

type Props = { user: User };

type RawTeam = {
  id: number;
  player1_id: number;
  player2_id: number | null;
  side: 'left' | 'right' | null;
  confirmed1: boolean;
  confirmed2: boolean;
};

type RawMatch = {
  id: number;
  tournament_id: number;
  team1_id: number | null;
  team2_id: number | null;
  map: string | null;
  score: string | null;
  status: 'pending' | 'live' | 'done';
  winner_id: number | null;
};

type ViewState =
  | { type: 'list' }
  | { type: 'lobby'; tournament: TTournament }
  | { type: 'bracket'; tournament: TTournament }
  | {
      type: 'match';
      matchId: number;
      team1Id: number;
      team2Id: number;
      team1Name: string;
      team2Name: string;
      myTeamId: number | null;
    };

export default function Tournament({ user }: Props) {
  const [tournaments, setTournaments] = useState<TTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ type: 'list' });
  const [sponsorModal, setSponsorModal] = useState<{
    tournament: TTournament;
    sponsors: Sponsor[];
  } | null>(null);

  const loadTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTournaments(data as TTournament[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleOpenTournament = async (t: TTournament) => {
    if (!user.standoff_id) {
      hapticError();
      setMsg('Сначала добавь Standoff ID в профиле');
      return;
    }

    haptic('medium');

    const { data: ts } = await supabase
      .from('tournament_sponsors')
      .select('sponsor_id, sponsors(*)')
      .eq('tournament_id', t.id);

    const sponsors: Sponsor[] = (ts ?? [])
      .map((r: any) => r.sponsors)
      .filter(Boolean);

    if (sponsors.length > 0) {
      setSponsorModal({ tournament: t, sponsors });
    } else {
      setView({ type: 'lobby', tournament: t });
    }
  };

  const handleSponsorsDone = async () => {
    if (!sponsorModal) return;
    const t = sponsorModal.tournament;
    setSponsorModal(null);
    setView({ type: 'lobby', tournament: t });
  };

  if (view.type === 'lobby') {
    return (
      <Lobby
        tournamentId={view.tournament.id}
        maxTeams={view.tournament.max_teams}
        user={user}
        onReady={() => setView({ type: 'bracket', tournament: view.tournament })}
      />
    );
  }

  if (view.type === 'bracket') {
    return (
      <BracketView
        tournament={view.tournament}
        user={user}
        onBack={() => setView({ type: 'list' })}
        onOpenMatch={(match) =>
          setView({
            type: 'match',
            matchId: match.matchId!,
            team1Id: match.team1!.id,
            team2Id: match.team2!.id,
            team1Name: match.team1!.player1_name || 'Команда 1',
            team2Name: match.team2!.player1_name || 'Команда 2',
            myTeamId: null,
          })
        }
      />
    );
  }

  if (view.type === 'match') {
    return (
      <MatchRoom
        matchId={view.matchId}
        team1Id={view.team1Id}
        team2Id={view.team2Id}
        team1Name={view.team1Name}
        team2Name={view.team2Name}
        myTeamId={view.myTeamId}
        user={user}
        onClose={() => setView({ type: 'bracket', tournament: tournaments[0] })}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка турниров</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {msg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-danger/10 border border-danger/40 rounded-xl p-3 text-sm text-danger font-semibold"
          >
            {msg}
          </motion.div>
        )}

        {tournaments.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-card">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-3xl bg-orange/10 border border-orange/30 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-orange" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-black font-black text-xl mb-2">Турниров пока нет</div>
            <p className="text-muted text-xs leading-relaxed">
              Как только появятся турниры — они отобразятся здесь
            </p>
          </div>
        ) : (
          tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              onJoin={() => handleOpenTournament(t)}
            />
          ))
        )}
      </div>

      {sponsorModal && (
        <SponsorModal
          user={user}
          telegramId={getTelegramUser()?.id ?? null}
          sponsors={sponsorModal.sponsors}
          onAllSubscribed={handleSponsorsDone}
          onClose={() => setSponsorModal(null)}
        />
      )}
    </>
  );
}

// ===== КАРТОЧКА ТУРНИРА =====
function TournamentCard({
  tournament,
  onJoin,
}: {
  tournament: TTournament;
  onJoin: () => void;
}) {
  const [teamCount, setTeamCount] = useState(0);
  const [preview, setPreview] = useState<BracketTeam[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: rawTeams } = await supabase
        .from('teams')
        .select('id, player1_id, player2_id, side')
        .eq('tournament_id', tournament.id)
        .order('created_at', { ascending: true })
        .limit(4);

      const { data: allTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('tournament_id', tournament.id);

      setTeamCount(allTeams?.length ?? 0);

      if (!rawTeams || rawTeams.length === 0) {
        setPreview([]);
        return;
      }

      const userIds = new Set<number>();
      (rawTeams as any[]).forEach((t) => {
        userIds.add(t.player1_id);
        if (t.player2_id) userIds.add(t.player2_id);
      });

      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, nickname, first_name, photo_url, avatar_url')
        .in('user_id', Array.from(userIds));

      const userMap = new Map<number, any>();
      (usersData ?? []).forEach((u) => userMap.set(u.user_id, u));

      const enriched: BracketTeam[] = (rawTeams as any[]).map((t) => {
        const p1 = userMap.get(t.player1_id);
        const p2 = t.player2_id ? userMap.get(t.player2_id) : null;
        return {
          id: t.id,
          player1_id: t.player1_id,
          player2_id: t.player2_id,
          side: t.side,
          player1_name: p1?.nickname || p1?.first_name || 'Игрок',
          player2_name: p2?.nickname || p2?.first_name || null,
          player1_photo: p1?.avatar_url || p1?.photo_url || null,
          player2_photo: p2?.avatar_url || p2?.photo_url || null,
        };
      });

      setPreview(enriched);
    };

    load();

    const channel = supabase
      .channel(`tourn-${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament.id]);

  const full = teamCount >= tournament.max_teams;
  const percent = Math.min(100, (teamCount / tournament.max_teams) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-3xl overflow-hidden shadow-card hover:shadow-cardHover transition-shadow"
    >
      {/* Шапка с логотипом и статусом */}
      <div className="relative h-36 bg-gradient-to-br from-orange to-orange2 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative p-5 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <div className="text-[10px] px-2.5 py-1 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white font-bold uppercase tracking-wider">
                {full ? 'Заполнен' : 'Набор'}
              </div>
            </div>
            <div className="text-white font-black text-sm flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {teamCount}/{tournament.max_teams}
            </div>
          </div>

          <div>
            <div className="text-white font-black text-xl leading-tight tracking-tight drop-shadow-sm">
              {tournament.name}
            </div>
            <div className="text-white/90 text-[11px] mt-0.5 font-medium">
              Формат 2×2 · Bo1 · {tournament.max_teams} команд
            </div>
          </div>
        </div>
      </div>

      {/* Мини-сетка с замками */}
      <div className="p-4 border-t border-border bg-bg2/40">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <Swords className="w-3 h-3 text-orange" />
          <div className="text-muted text-[10px] uppercase tracking-widest font-bold">
            Сетка
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const team = preview[i];
            return (
              <div
                key={i}
                className={`rounded-xl border p-2 flex items-center gap-2 h-[46px] transition-colors ${
                  team
                    ? 'bg-white border-border shadow-sm'
                    : 'bg-white/50 border-dashed border-border2'
                }`}
              >
                {team ? (
                  <>
                    <div className="w-7 h-7 rounded-full bg-bg2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {team.player1_photo ? (
                        <img src={team.player1_photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted font-bold">
                          {team.player1_name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-black text-[11px] font-bold truncate">
                        {team.player1_name}
                      </div>
                      {team.player2_name && (
                        <div className="text-muted text-[9px] truncate">
                          {team.player2_name}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded-full bg-bg2 border border-border flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3 h-3 text-muted2" />
                    </div>
                    <div className="text-muted text-[10px] font-medium">Свободно</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {teamCount > 4 && (
          <div className="text-orange text-[10px] text-center mt-2 font-bold">
            +{teamCount - 4} {teamCount - 4 === 1 ? 'команда' : 'команд'} ещё
          </div>
        )}
      </div>

      {/* Прогресс-бар */}
      <div className="px-4 pb-3">
        <div className="h-1.5 bg-bg2 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${full ? 'bg-danger' : 'bg-orange'}`}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-muted text-[10px]">
            {teamCount} / {tournament.max_teams} команд
          </span>
          <span className={`text-[10px] font-bold ${full ? 'text-danger' : 'text-orange'}`}>
            {Math.round(percent)}%
          </span>
        </div>
      </div>

      {/* Большая кнопка */}
      <div className="p-4 pt-0">
        <motion.button
          onClick={onJoin}
          disabled={full}
          whileHover={!full ? { scale: 1.015 } : {}}
          whileTap={!full ? { scale: 0.985 } : {}}
          className={`w-full font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden ${
            full
              ? 'bg-bg2 border border-border text-muted cursor-not-allowed'
              : 'bg-orange text-white shadow-orange hover:bg-orangeDark hover:shadow-glow'
          }`}
        >
          {!full && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {full ? (
              <>
                <Lock className="w-4 h-4" />
                Мест нет
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Участвовать
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </span>
        </motion.button>

        {/* Подсказка про спонсоров */}
        {!full && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-muted text-[10px]">
            <ShieldCheck className="w-3 h-3" />
            Подписка на спонсоров обязательна
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===== ЭКРАН СЕТКИ =====
function BracketView({
  tournament,
  user,
  onBack,
  onOpenMatch,
}: {
  tournament: TTournament;
  user: User;
  onBack: () => void;
  onOpenMatch: (match: BracketMatch) => void;
}) {
  const [rounds, setRounds] = useState<BracketMatch[][]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: rawTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournament.id);

    const { data: rawMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('id', { ascending: true });

    if (!rawTeams || rawTeams.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = new Set<number>();
    (rawTeams as RawTeam[]).forEach((t) => {
      userIds.add(t.player1_id);
      if (t.player2_id) userIds.add(t.player2_id);
    });

    const { data: usersData } = await supabase
      .from('users')
      .select('user_id, nickname, first_name, photo_url, avatar_url')
      .in('user_id', Array.from(userIds));

    const userMap = new Map<number, any>();
    (usersData ?? []).forEach((u) => userMap.set(u.user_id, u));

    const teams: BracketTeam[] = (rawTeams as RawTeam[]).map((t) => {
      const p1 = userMap.get(t.player1_id);
      const p2 = t.player2_id ? userMap.get(t.player2_id) : null;
      return {
        id: t.id,
        player1_id: t.player1_id,
        player2_id: t.player2_id,
        side: t.side,
        player1_name: p1?.nickname || p1?.first_name || 'Игрок 1',
        player2_name: p2?.nickname || p2?.first_name || null,
        player1_photo: p1?.avatar_url || p1?.photo_url || null,
        player2_photo: p2?.avatar_url || p2?.photo_url || null,
      };
    });

    const built = buildBracket(teams);
    const matches = (rawMatches ?? []) as RawMatch[];

    matches.forEach((m) => {
      for (const round of built) {
        for (const match of round) {
          if (
            match.team1?.id === m.team1_id &&
            match.team2?.id === m.team2_id &&
            !match.matchId
          ) {
            match.matchId = m.id;
          }
        }
      }
    });

    matches.forEach((m) => {
      if (m.winner_id) {
        for (const round of built) {
          for (const match of round) {
            if (match.matchId === m.id) {
              if (match.team1?.id === m.winner_id) match.winner = match.team1;
              if (match.team2?.id === m.winner_id) match.winner = match.team2;
            }
          }
        }
      }
    });

    setRounds(built);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`bracket-${tournament.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-card border border-border hover:border-orange/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-black" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-black font-black text-sm truncate">{tournament.name}</div>
          <div className="text-muted text-[10px] uppercase tracking-widest flex items-center gap-1">
            <Swords className="w-3 h-3 text-orange" />
            Сетка турнира
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
          <div className="text-muted text-xs uppercase tracking-widest">Загрузка сетки</div>
        </div>
      ) : (
        <Bracket rounds={rounds} onMatchClick={onOpenMatch} />
      )}
    </div>
  );
}
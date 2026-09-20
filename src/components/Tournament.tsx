import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, ArrowLeft, Lock, Swords, Sparkles, ChevronRight } from 'lucide-react';
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

  // Открытие лобби/турнира
  const handleOpenTournament = async (t: TTournament) => {
    if (!user.standoff_id) {
      hapticError();
      setMsg('Сначала добавь Standoff ID в профиле');
      return;
    }

    haptic('medium');

    // Проверяем есть ли спонсоры
    const { data: ts } = await supabase
      .from('tournament_sponsors')
      .select('sponsor_id, sponsors(*)')
      .eq('tournament_id', t.id);

    const sponsors: Sponsor[] = (ts ?? [])
      .map((r: any) => r.sponsors)
      .filter(Boolean);

    if (sponsors.length > 0) {
      // Открываем модалку подписки
      setSponsorModal({ tournament: t, sponsors });
    } else {
      // Нет спонсоров — сразу в лобби
      setView({ type: 'lobby', tournament: t });
    }
  };

  // После подписки на всех спонсоров
  const handleSponsorsDone = async () => {
    if (!sponsorModal) return;
    const t = sponsorModal.tournament;
    setSponsorModal(null);
    setView({ type: 'lobby', tournament: t });
  };

  // ===== Рендер =====

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
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
            className="bg-card2 border border-border rounded-xl p-3 text-sm text-white"
          >
            {msg}
          </motion.div>
        )}

        {tournaments.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-card2 border border-border flex items-center justify-center">
                <Trophy className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-white font-bold mb-2">Турниров пока нет</div>
            <p className="text-muted text-xs leading-relaxed">
              Как только спонсоры подтвердят приз, турнир появится здесь.
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

      {/* Модалка подписки */}
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

// ===== Карточка турнира =====
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
        .select('user_id, nickname, first_name, photo_url')
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
          player1_photo: p1?.photo_url ?? null,
          player2_photo: p2?.photo_url ?? null,
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
      className="bg-card border border-border rounded-3xl overflow-hidden hover:border-white/30 transition-colors"
    >
      {/* Шапка с градиентом */}
      <div className="relative h-32 bg-gradient-to-br from-white/10 via-white/5 to-transparent overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative p-5 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur">
                <Trophy className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <div
                className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${
                  full
                    ? 'border-red-500/50 text-red-400 bg-red-500/10'
                    : 'border-green-500/50 text-green-400 bg-green-500/10'
                }`}
              >
                {full ? 'Заполнен' : 'Набор'}
              </div>
            </div>
            <div className="text-white font-black text-sm flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {teamCount}/{tournament.max_teams}
            </div>
          </div>

          <div>
            <div className="text-white font-black text-lg leading-tight tracking-tight">
              {tournament.name}
            </div>
            <div className="text-white/60 text-[11px] mt-0.5">
              Формат 2×2 · Bo1 · {tournament.max_teams} команд
            </div>
          </div>
        </div>
      </div>

      {/* Сетка-превью */}
      <div className="p-4 border-t border-border">
        <div className="text-muted text-[10px] uppercase tracking-widest mb-2 px-1">
          Сетка
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const team = preview[i];
            return (
              <div
                key={i}
                className={`rounded-xl border p-2 flex items-center gap-2 h-[42px] transition-colors ${
                  team
                    ? 'bg-bg border-border'
                    : 'bg-bg/40 border-dashed border-border/60'
                }`}
              >
                {team ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-card2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {team.player1_photo ? (
                        <img src={team.player1_photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted">?</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[10px] font-semibold truncate">
                        {team.player1_name}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full bg-card2/50 border border-border/60 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3 h-3 text-muted/60" />
                    </div>
                    <div className="text-muted/60 text-[10px]">Свободно</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {teamCount > 4 && (
          <div className="text-muted text-[10px] text-center mt-2">
            +{teamCount - 4} {teamCount - 4 === 1 ? 'команда' : 'команд'} ещё
          </div>
        )}
      </div>

      {/* Прогресс */}
      <div className="px-4 pb-3">
        <div className="h-1 bg-bg rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${full ? 'bg-red-500/60' : 'bg-white'}`}
          />
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
              ? 'bg-white/5 border border-border text-muted cursor-not-allowed'
              : 'bg-white text-black shadow-glow hover:shadow-glowStrong'
          }`}
        >
          {!full && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
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
      </div>
    </motion.div>
  );
}

// ===== Экран сетки =====
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
      .select('user_id, nickname, first_name, photo_url')
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
        player1_photo: p1?.photo_url ?? null,
        player2_photo: p2?.photo_url ?? null,
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
          className="p-2 rounded-xl bg-card border border-border hover:border-white/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{tournament.name}</div>
          <div className="text-muted text-[10px] uppercase tracking-widest flex items-center gap-1">
            <Swords className="w-3 h-3" />
            Сетка турнира
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <div className="text-muted text-xs uppercase tracking-widest">Загрузка сетки</div>
        </div>
      ) : (
        <Bracket rounds={rounds} onMatchClick={onOpenMatch} />
      )}
    </div>
  );
}
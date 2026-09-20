import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type User, type Tournament as TTournament } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import { buildBracket, type BracketMatch, type BracketTeam } from '../lib/bracket';
import Lobby from './tournament/Lobby';
import Bracket from './tournament/Bracket';
import MatchRoom from './tournament/MatchRoom';

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

  // ===== Регистрация в турнире =====
  const register = async (t: TTournament) => {
    if (!user.standoff_id) {
      hapticError();
      setMsg('Сначала добавь Standoff ID в профиле');
      return;
    }

    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', t.id)
      .or(`player1_id.eq.${user.user_id},player2_id.eq.${user.user_id}`)
      .maybeSingle();

    if (existingTeam) {
      // Уже зарегистрирован — сразу в лобби
      haptic('medium');
      setView({ type: 'lobby', tournament: t });
      return;
    }

    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', t.id);

    if ((teams?.length ?? 0) >= t.max_teams) {
      hapticError();
      setMsg('Турнир заполнен');
      return;
    }

    haptic('medium');
    setView({ type: 'lobby', tournament: t });
  };

  // ===== Рендер экранов =====
  if (view.type === 'lobby') {
    return (
      <Lobby
        tournamentId={view.tournament.id}
        maxTeams={view.tournament.max_teams}
        user={user}
        onReady={() => {
          // Все места заняты — переключаем на сетку
          setView({ type: 'bracket', tournament: view.tournament });
        }}
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

  // ===== Экран списка турниров =====
  if (loading) {
    return (
      <div className="text-muted text-center py-10 text-sm">
        Загрузка турниров...
      </div>
    );
  }

  return (
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
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-white font-bold mb-2">Турниров пока нет</div>
          <p className="text-muted text-xs">
            Как только спонсоры подтвердят приз, турнир появится здесь.
          </p>
        </div>
      ) : (
        tournaments.map((t) => (
          <TournamentCard
            key={t.id}
            tournament={t}
            onRegister={() => register(t)}
            onOpenLobby={() => {
              haptic('light');
              setView({ type: 'lobby', tournament: t });
            }}
          />
        ))
      )}
    </div>
  );
}

// ===== Карточка турнира =====
function TournamentCard({
  tournament,
  onRegister,
  onOpenLobby,
}: {
  tournament: TTournament;
  onRegister: () => void;
  onOpenLobby: () => void;
}) {
  const [teamCount, setTeamCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('teams')
        .select('id')
        .eq('tournament_id', tournament.id);
      setTeamCount(data?.length ?? 0);
    })();

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
        async () => {
          const { data } = await supabase
            .from('teams')
            .select('id')
            .eq('tournament_id', tournament.id);
          setTeamCount(data?.length ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament.id]);

  const full = teamCount >= tournament.max_teams;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold truncate">
            {tournament.name}
          </div>
          <div className="text-muted text-xs truncate">
            {tournament.sponsor_channel
              ? `Спонсор: ${tournament.sponsor_channel}`
              : 'Спонсор: скоро'}
          </div>
        </div>
        <div
          className={`text-[10px] px-2 py-1 rounded-full border ${
            full
              ? 'border-white text-white'
              : 'border-border text-muted'
          }`}
        >
          {full ? 'Полный' : 'Набор'}
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted mb-3">
        <span>
          {teamCount} / {tournament.max_teams} команд
        </span>
        <span>Формат: 2х2</span>
      </div>

      <div className="h-1.5 bg-bg rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${(teamCount / tournament.max_teams) * 100}%`,
          }}
          transition={{ duration: 0.4 }}
          className="h-full bg-white"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onOpenLobby}
          className="flex-1 bg-white/10 border border-border text-white text-xs rounded-xl py-3 font-semibold"
        >
          Смотреть лобби
        </button>
        <button
          onClick={onRegister}
          disabled={full}
          className="flex-1 bg-white text-black text-xs rounded-xl py-3 font-bold disabled:opacity-40"
        >
          {full ? 'Мест нет' : 'Участвовать'}
        </button>
      </div>
    </motion.div>
  );
}

// ===== Экран сетки (отдельный компонент, чтобы не мешать логике) =====
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

    // Подгружаем ники игроков
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

    // Строим сетку из команд
    const built = buildBracket(teams);

    // Прикрепляем matchId, если матч уже есть в БД
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

    // Учитываем победителей
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => load()
      )
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
          className="text-muted hover:text-white text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">
            {tournament.name}
          </div>
          <div className="text-muted text-[10px] uppercase tracking-widest">
            Сетка турнира
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted text-center py-10 text-sm">
          Загрузка сетки...
        </div>
      ) : (
        <Bracket rounds={rounds} onMatchClick={onOpenMatch} />
      )}
    </div>
  );
}
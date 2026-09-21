import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Trophy, ArrowLeft, Users, Coins, Sparkles, ShieldCheck } from 'lucide-react';
import {
  type Organizer,
  getAllOrganizers,
  getOrganizerTournaments,
} from '../lib/organizers';
import { type User, supabase } from '../supabase';
import { buildBracket, type BracketMatch, type BracketTeam } from '../lib/bracket';
import { haptic, getTelegramUser } from '../lib/telegram';
import { isAdmin } from '../lib/admin';
import BigBracket from './tournament/BigBracket';
import EmptyBracketPreview from './tournament/EmptyBracketPreview';
import TeamInfoModal from './tournament/TeamInfoModal';
import MatchChat from './tournament/MatchChat';
import SponsorModal, { type Sponsor } from './tournament/SponsorModal';
import Lobby from './tournament/Lobby';

type Props = { user: User };

type Tournament = {
  id: number;
  name: string;
  max_teams: number;
  prize_gold: number | null;
  status: string;
  created_at: string;
  sponsor_channel: string | null;
};

export default function OrganizerPage({ user }: Props) {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [selected, setSelected] = useState<Organizer | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [inLobby, setInLobby] = useState<Tournament | null>(null);
  const [sponsorModal, setSponsorModal] = useState<{ tournament: Tournament; sponsors: Sponsor[] } | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await getAllOrganizers();
      setOrganizers(list);
      setAdmin(await isAdmin(user.user_id));
      setLoading(false);
    })();
  }, [user.user_id]);

  const openOrganizer = async (org: Organizer) => {
    setSelected(org);
    const t = await getOrganizerTournaments(org.id);
    setTournaments(t as Tournament[]);
  };

  const handleJoin = async (t: Tournament) => {
    haptic('medium');

    const { data: ts } = await supabase
      .from('tournament_sponsors')
      .select('sponsor_id, sponsors(*)')
      .eq('tournament_id', t.id);

    const sponsors: Sponsor[] = (ts ?? []).map((r: any) => r.sponsors).filter(Boolean);

    if (sponsors.length > 0) {
      setSponsorModal({ tournament: t, sponsors });
    } else {
      setInLobby(t);
    }
  };

  const handleSponsorsDone = () => {
    if (!sponsorModal) return;
    const t = sponsorModal.tournament;
    setSponsorModal(null);
    setInLobby(t);
  };

  if (inLobby) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setInLobby(null)}
            className="p-2 rounded-xl bg-card border border-border hover:border-orange/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-black font-black text-sm truncate">{inLobby.name}</div>
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold">
              Регистрация
            </div>
          </div>
        </div>

        <Lobby
          tournamentId={inLobby.id}
          maxTeams={inLobby.max_teams}
          user={user}
          onReady={() => {
            setSelectedTournament(inLobby);
            setInLobby(null);
          }}
        />
      </div>
    );
  }

  if (selectedTournament) {
    return (
      <TournamentBracketView
        tournament={selectedTournament}
        user={user}
        isAdmin={admin}
        onBack={() => setSelectedTournament(null)}
        onJoin={() => handleJoin(selectedTournament)}
      />
    );
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="p-2 rounded-xl bg-card border border-border hover:border-orange/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
          </button>
          <div className="flex-1">
            <div className="text-black font-black text-sm">{selected.name}</div>
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold">
              Организатор
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange to-orange2 rounded-3xl overflow-hidden shadow-orange relative"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_65%)]" />
          <div className="relative p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur border border-white/40 flex items-center justify-center overflow-hidden">
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-white" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-black text-xl truncate">
                  {selected.name}
                </div>
                {selected.tag && (
                  <div className="text-white/80 font-bold text-sm">
                    [{selected.tag}]
                  </div>
                )}
              </div>
            </div>
            {selected.description && (
              <p className="text-white/90 text-xs mt-3 leading-relaxed">
                {selected.description}
              </p>
            )}
          </div>
        </motion.div>

        <div className="space-y-2">
          <div className="text-muted text-[10px] uppercase tracking-widest px-1 font-bold">
            Турниры ({tournaments.length})
          </div>

          {tournaments.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <Trophy className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
              <div className="text-muted text-xs">Пока нет турниров</div>
            </div>
          ) : (
            tournaments.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-black font-bold text-sm truncate">{t.name}</div>
                    <div className="text-muted text-[10px] flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t.max_teams}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {t.prize_gold || 0} голды
                      </span>
                    </div>
                  </div>
                  <div className={`text-[10px] px-2 py-1 rounded-full border font-bold uppercase ${
                    t.status === 'waiting'
                      ? 'border-orange/40 text-orange bg-orange/10'
                      : t.status === 'active'
                      ? 'border-green-500/40 text-green-600 bg-green-500/10'
                      : 'border-border text-muted'
                  }`}>
                    {t.status === 'waiting' ? 'Набор' : t.status === 'active' ? 'Идёт' : 'Завершён'}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setSelectedTournament(t)}
                    className="flex-1 bg-bg2 border border-border text-black font-bold rounded-xl py-2.5 text-xs hover:border-orange/40 transition-colors"
                  >
                    Сетка
                  </button>
                  <button
                    onClick={() => handleJoin(t)}
                    disabled={t.status === 'finished'}
                    className="flex-1 bg-orange text-white font-bold rounded-xl py-2.5 text-xs disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Участвовать
                  </button>
                </div>

                {t.status === 'waiting' && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-muted text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    Подписка на спонсора обязательна
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-5 shadow-orange relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-white font-black text-lg">Организаторы</div>
            <div className="text-white/80 text-[11px] font-medium">
              {organizers.length} организаций
            </div>
          </div>
        </div>
      </div>

      {organizers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-card">
          <Building2 className="w-12 h-12 text-muted mx-auto mb-3" strokeWidth={1.5} />
          <div className="text-black font-bold mb-1">Организаторов пока нет</div>
          <p className="text-muted text-xs">Создай в админ-панели на сайте</p>
        </div>
      ) : (
        <div className="space-y-2">
          {organizers.map((org, i) => (
            <motion.button
              key={org.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openOrganizer(org)}
              className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-orange/40 hover:shadow-card transition-all text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-black font-bold text-sm truncate">{org.name}</div>
                {org.tag && (
                  <div className="text-orange font-bold text-[10px]">[{org.tag}]</div>
                )}
                <div className="text-muted text-[10px] truncate mt-0.5">
                  {org.description || 'Турнирная организация'}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {sponsorModal && (
          <SponsorModal
            user={user}
            telegramId={getTelegramUser()?.id ?? null}
            sponsors={sponsorModal.sponsors}
            onAllSubscribed={handleSponsorsDone}
            onClose={() => setSponsorModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TournamentBracketView({
  tournament,
  user,
  isAdmin,
  onBack,
  onJoin,
}: {
  tournament: Tournament;
  user: User;
  isAdmin: boolean;
  onBack: () => void;
  onJoin: () => void;
}) {
  const [rounds, setRounds] = useState<BracketMatch[][]>([]);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<BracketTeam | null>(null);
  const [myTeamId, setMyTeamId] = useState<number | null>(null);
  const [myClanId, setMyClanId] = useState<number | null>(null);
  const [matchTimeMap, setMatchTimeMap] = useState<Record<number, string | null>>({});
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('clan_id')
        .eq('user_id', user.user_id)
        .maybeSingle();
      const cid = (userData as any)?.clan_id ?? null;
      setMyClanId(cid);

      const { data: rawTeams } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournament.id);

      const { data: rawMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('id', { ascending: true });

      setMatchCount(rawMatches?.length || 0);

      const tMap: Record<number, string | null> = {};
      (rawMatches || []).forEach((m: any) => {
        tMap[m.id] = m.scheduled_time || null;
      });
      setMatchTimeMap(tMap);

      if (!rawTeams || rawTeams.length === 0) {
        setLoading(false);
        return;
      }

      if (cid) {
        const mine = (rawTeams as any[]).find((t) => t.clan_id === cid);
        setMyTeamId(mine?.id || null);
      }

      const sortedTeams = [...(rawTeams as any[])].sort((a, b) => a.id - b.id);

      const teams: BracketTeam[] = sortedTeams.map((t) => ({
        id: t.id,
        name: t.clan_name || t.team_name || 'Клан',
        captain_photo: null,
        logo_url: t.clan_logo_url || t.logo_url || null,
        clan_id: t.clan_id,
        players: [],
        side: t.side,
      }));

      const matches = rawMatches || [];
      const built = buildBracket(teams, matches.length === 0);

      matches.forEach((m: any) => {
        for (const round of built) {
          for (const match of round) {
            if (match.team1?.id === m.team1_id && match.team2?.id === m.team2_id && !match.matchId) {
              match.matchId = m.id;
            }
          }
        }
      });

      matches.forEach((m: any) => {
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
    })();
  }, [tournament.id, user.user_id]);

  const handleMatchClick = (match: BracketMatch) => {
    if (!match.matchId) return;
    const fullMatch = {
      id: match.matchId,
      team1: match.team1,
      team2: match.team2,
      map: null,
      scheduled_time: matchTimeMap[match.matchId] || null,
    };
    setSelectedMatch(fullMatch);
  };

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
          <div className="text-muted text-[10px] uppercase tracking-widest font-bold">
            {matchCount} матчей · {tournament.status === 'waiting' ? 'Набор' : tournament.status === 'active' ? 'Идёт' : 'Завершён'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        </div>
      ) : matchCount === 0 ? (
        <div className="space-y-3">
          <EmptyBracketPreview
            tournamentId={tournament.id}
            maxTeams={tournament.max_teams}
            myClanId={myClanId}
          />
          {tournament.status !== 'finished' && (
            <button
              onClick={onJoin}
              className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm shadow-orange hover:bg-orangeDark transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Участвовать
            </button>
          )}
        </div>
      ) : (
        <BigBracket
          rounds={rounds}
          onTeamClick={(team) => setSelectedTeam(team)}
          onMatchClick={handleMatchClick}
          myTeamId={myTeamId}
          matchTimeMap={matchTimeMap}
        />
      )}

      {selectedTeam && (
        <TeamInfoModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}

      <AnimatePresence>
        {selectedMatch && (
          <MatchChat
            match={selectedMatch}
            user={user}
            isAdmin={isAdmin}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
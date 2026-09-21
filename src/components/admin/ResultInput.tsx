import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Trophy, Save, UserX, Check, AlertCircle,
} from 'lucide-react';
import {
  getActiveTournaments, getPendingMatches, getTeamPlayers, saveMatchResult,
} from '../../lib/match';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';

type PlayerStat = {
  user_id: number;
  nickname: string;
  kills: number;
  deaths: number;
  assists: number;
  notPresent: boolean;
};

export default function ResultInput() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const t = await getActiveTournaments();
      setTournaments(t);
      setLoading(false);
    })();
  }, []);

  const openTournament = async (t: any) => {
    setSelectedTournament(t);
    setLoading(true);
    const m = await getPendingMatches(t.id);
    setMatches(m);
    setLoading(false);
  };

  const openMatch = async (m: any) => {
    setSelectedMatch(m);
    setView('form');
  };

  if (view === 'form' && selectedMatch) {
    return (
      <MatchForm
        match={selectedMatch}
        tournament={selectedTournament}
        onBack={() => { setView('list'); setSelectedMatch(null); }}
        onSaved={() => {
          setView('list');
          setSelectedMatch(null);
          openTournament(selectedTournament);
        }}
      />
    );
  }

  if (selectedTournament) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSelectedTournament(null)}
          className="flex items-center gap-2 text-orange text-xs font-bold"
        >
          <ArrowLeft className="w-3 h-3" /> К турнирам
        </button>

        <div className="text-black font-black text-sm">{selectedTournament.name}</div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-bg2 border border-dashed border-border2 rounded-xl p-6 text-center text-muted text-xs">
            Нет незавершённых матчей
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((m: any) => (
              <button
                key={m.id}
                onClick={() => openMatch(m)}
                className="w-full bg-card border border-border rounded-xl p-3 text-left hover:border-orange/40 transition-colors"
              >
                <div className="text-black font-bold text-sm">
                  {m.team1?.clan_name || 'Клан'} vs {m.team2?.clan_name || 'Клан'}
                </div>
                <div className="text-muted text-[10px] mt-0.5">
                  Матч #{m.id} · {m.map || 'без карты'} · {m.status}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tournaments.length === 0 ? (
        <div className="bg-bg2 border border-dashed border-border2 rounded-xl p-6 text-center text-muted text-xs">
          Нет активных турниров
        </div>
      ) : (
        tournaments.map((t) => (
          <button
            key={t.id}
            onClick={() => openTournament(t)}
            className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-orange/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-black font-bold text-sm truncate">{t.name}</div>
              <div className="text-muted text-[10px]">
                {t.sponsor_channel || 'спонсор не указан'}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

// ===== ФОРМА ВВОДА РЕЗУЛЬТАТА =====
function MatchForm({
  match, tournament, onBack, onSaved,
}: {
  match: any;
  tournament: any;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [scoreCt, setScoreCt] = useState('');
  const [scoreT, setScoreT] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [mapName, setMapName] = useState(match.map || '');

  const [team1Players, setTeam1Players] = useState<PlayerStat[]>([]);
  const [team2Players, setTeam2Players] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p1, p2] = await Promise.all([
        getTeamPlayers(match.team1_id),
        getTeamPlayers(match.team2_id),
      ]);

      const map = (arr: any[]) =>
        arr.slice(0, 5).map((p: any) => ({
          user_id: p.user_id,
          nickname: p.nickname || p.first_name || 'Игрок',
          kills: 0,
          deaths: 0,
          assists: 0,
          notPresent: false,
        }));

      setTeam1Players(map(p1));
      setTeam2Players(map(p2));
      setLoading(false);
    })();
  }, [match.id]);

  const updateStat = (
    team: 't1' | 't2',
    idx: number,
    field: keyof PlayerStat,
    value: any
  ) => {
    const updater = team === 't1' ? setTeam1Players : setTeam2Players;
    updater((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const parseStat = (text: string): { k: number; d: number; a: number } | null => {
    const parts = text.trim().split(/\s+/);
    if (parts.length !== 3) return null;
    const nums = parts.map((p) => parseInt(p, 10));
    if (nums.some((n) => isNaN(n) || n < 0)) return null;
    return { k: nums[0], d: nums[1], a: nums[2] };
  };

  const handleSave = async () => {
    setError(null);

    const ct = parseInt(scoreCt, 10);
    const t = parseInt(scoreT, 10);

    if (isNaN(ct) || isNaN(t) || ct < 0 || t < 0) {
      hapticError(); setError('Введи счёт CT и T'); return;
    }
    if (ct === t) {
      hapticError(); setError('Ничья не допускается'); return;
    }

    // Победитель: у кого больше счёт (Team1 = CT, Team2 = T)
    const winnerTeamId = ct > t ? match.team1_id : match.team2_id;

    setSaving(true);
    haptic('medium');

    try {
      await saveMatchResult({
        matchId: match.id,
        tournamentId: tournament.id,
        scoreCt: ct,
        scoreT: t,
        winnerTeamId,
        team1Name: match.team1?.clan_name || 'Команда 1',
        team2Name: match.team2?.clan_name || 'Команда 2',
        team1Players,
        team2Players,
        photoUrl: photoUrl.trim() || null,
        sponsorChannel: tournament.sponsor_channel,
        map: mapName || null,
      });

      hapticSuccess();
      onSaved();
    } catch (e: any) {
      hapticError();
      setError(e.message || 'Ошибка сохранения');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-orange text-xs font-bold"
      >
        <ArrowLeft className="w-3 h-3" /> Назад
      </button>

      {/* Команды */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">
          Матч #{match.id}
        </div>
        <div className="text-black font-black text-sm text-center">
          {match.team1?.clan_name} <span className="text-orange">vs</span> {match.team2?.clan_name}
        </div>
      </div>

      {/* Счёт */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
          Счёт
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-black font-bold text-xs mb-1.5 text-center">
              {match.team1?.clan_name} (CT)
            </div>
            <input
              type="number"
              value={scoreCt}
              onChange={(e) => setScoreCt(e.target.value)}
              placeholder="13"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-3 text-black text-center font-black text-lg"
            />
          </div>
          <div>
            <div className="text-black font-bold text-xs mb-1.5 text-center">
              {match.team2?.clan_name} (T)
            </div>
            <input
              type="number"
              value={scoreT}
              onChange={(e) => setScoreT(e.target.value)}
              placeholder="11"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-3 text-black text-center font-black text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-muted text-[10px] font-bold block mb-1">Карта</label>
            <input
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="Sandstone"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-xs"
            />
          </div>
          <div>
            <label className="text-muted text-[10px] font-bold block mb-1">Фото (URL)</label>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-xs"
            />
          </div>
        </div>
      </div>

      {/* Статистика Team 1 */}
      <PlayerStatsBlock
        teamName={`${match.team1?.clan_name} (CT)`}
        players={team1Players}
        onUpdate={(idx, field, value) => updateStat('t1', idx, field, value)}
        onParse={parseStat}
      />

      {/* Статистика Team 2 */}
      <PlayerStatsBlock
        teamName={`${match.team2?.clan_name} (T)`}
        players={team2Players}
        onUpdate={(idx, field, value) => updateStat('t2', idx, field, value)}
        onParse={parseStat}
      />

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-xs text-danger font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-orange"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Сохраняем...' : 'Сохранить и отправить в ТГК'}
      </button>
    </div>
  );
}

function PlayerStatsBlock({
  teamName, players, onUpdate, onParse,
}: {
  teamName: string;
  players: PlayerStat[];
  onUpdate: (idx: number, field: keyof PlayerStat, value: any) => void;
  onParse: (text: string) => { k: number; d: number; a: number } | null;
}) {
  const [inputs, setInputs] = useState<string[]>(players.map(() => ''));

  useEffect(() => {
    setInputs(players.map(() => ''));
  }, [players.length]);

  const handleInput = (idx: number, text: string) => {
    const copy = [...inputs];
    copy[idx] = text;
    setInputs(copy);

    const parsed = onParse(text);
    if (parsed) {
      onUpdate(idx, 'kills', parsed.k);
      onUpdate(idx, 'deaths', parsed.d);
      onUpdate(idx, 'assists', parsed.a);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
        {teamName}
      </div>

      <div className="space-y-2">
        {players.map((p, idx) => (
          <motion.div
            key={p.user_id}
            layout
            className={`rounded-xl p-2.5 border transition-colors ${
              p.notPresent
                ? 'bg-bg2/50 border-dashed border-border2'
                : 'bg-bg2 border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="text-black text-xs font-bold flex-1 truncate">
                {p.nickname}
              </div>

              <button
                onClick={() => {
                  onUpdate(idx, 'notPresent', !p.notPresent);
                  if (!p.notPresent) {
                    onUpdate(idx, 'kills', 0);
                    onUpdate(idx, 'deaths', 0);
                    onUpdate(idx, 'assists', 0);
                  }
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                  p.notPresent
                    ? 'bg-danger/20 text-danger'
                    : 'bg-bg3 text-muted hover:text-black'
                }`}
              >
                <UserX className="w-3 h-3" />
                {p.notPresent ? 'Не было' : 'Был'}
              </button>
            </div>

            {!p.notPresent && (
              <div className="flex items-center gap-2">
                <input
                  value={inputs[idx]}
                  onChange={(e) => handleInput(idx, e.target.value)}
                  placeholder="13 3 10"
                  className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-black text-xs font-bold"
                />
                {onParse(inputs[idx]) ? (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-success">
                    <Check className="w-3 h-3" /> OK
                  </div>
                ) : inputs[idx] ? (
                  <div className="text-[10px] font-bold text-danger">K D A</div>
                ) : null}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
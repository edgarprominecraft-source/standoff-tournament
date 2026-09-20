import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, Check, ShieldCheck } from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';

type Props = {
  matchId: number;
  team1Id: number;
  team2Id: number;
  myTeamId: number | null;
  user: User;
  confirmWindow?: number;
  onBothConfirmed: () => void;
};

type ConfirmRow = {
  id: number;
  match_id: number;
  team_id: number;
  confirmed: boolean;
  confirmed_at: string | null;
};

export default function ConfirmBar({
  matchId,
  team1Id,
  team2Id,
  myTeamId,
  user,
  confirmWindow = 180,
  onBothConfirmed,
}: Props) {
  const [rows, setRows] = useState<ConfirmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(confirmWindow);
  const [started, setStarted] = useState(false);

  const loadRows = async () => {
    const { data } = await supabase
      .from('match_confirms')
      .select('*')
      .eq('match_id', matchId);
    if (data) {
      setRows(data as ConfirmRow[]);
      if (data.length > 0 && !started) setStarted(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
    const channel = supabase
      .channel(`confirms-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_confirms',
          filter: `match_id=eq.${matchId}`,
        },
        () => loadRows()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  useEffect(() => {
    if (!started || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started]);

  const handleTimeout = async () => {
    const confirmedTeamIds = new Set(
      rows.filter((r) => r.confirmed).map((r) => r.team_id)
    );
    const team1Ok = confirmedTeamIds.has(team1Id);
    const team2Ok = confirmedTeamIds.has(team2Id);

    if (team1Ok && !team2Ok) {
      await supabase
        .from('matches')
        .update({ winner_id: team1Id, status: 'done' })
        .eq('id', matchId);
    } else if (team2Ok && !team1Ok) {
      await supabase
        .from('matches')
        .update({ winner_id: team2Id, status: 'done' })
        .eq('id', matchId);
    }
  };

  const confirmMyTeam = async () => {
    if (!myTeamId) return;
    haptic('medium');
    const existing = rows.find((r) => r.team_id === myTeamId);
    if (existing?.confirmed) {
      hapticError();
      return;
    }
    if (existing) {
      const { error } = await supabase
        .from('match_confirms')
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) hapticError(); else hapticSuccess();
    } else {
      const { error } = await supabase.from('match_confirms').insert({
        match_id: matchId,
        team_id: myTeamId,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      });
      if (error) hapticError(); else hapticSuccess();
    }
  };

  const team1Confirmed = rows.find((r) => r.team_id === team1Id)?.confirmed;
  const team2Confirmed = rows.find((r) => r.team_id === team2Id)?.confirmed;

  useEffect(() => {
    if (team1Confirmed && team2Confirmed) onBothConfirmed();
  }, [team1Confirmed, team2Confirmed]);

  const myRow = myTeamId ? rows.find((r) => r.team_id === myTeamId) : null;
  const iConfirmed = !!myRow?.confirmed;

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;
  const criticalTime = secondsLeft <= 30;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-muted text-[10px] uppercase tracking-widest">Загрузка</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <motion.div
        animate={criticalTime ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={criticalTime ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : {}}
        className={`rounded-2xl p-5 border text-center transition-colors ${
          criticalTime
            ? 'bg-red-500/10 border-red-500/60'
            : 'bg-card border-border'
        }`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          {criticalTime && <AlertTriangle className="w-3 h-3 text-red-400" />}
          <div className={`text-[10px] uppercase tracking-widest ${criticalTime ? 'text-red-400' : 'text-muted'}`}>
            {criticalTime ? 'Осталось мало' : 'До начала матча'}
          </div>
        </div>
        <div
          className={`font-black text-4xl tabular-nums tracking-tight ${
            criticalTime ? 'text-red-400' : 'text-white'
          }`}
        >
          {started ? timeStr : '—:—'}
        </div>
        {!started && (
          <div className="text-muted text-[10px] mt-1.5">
            Таймер запустится после первого подтверждения
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <TeamStatus
          label="Команда 1"
          confirmed={!!team1Confirmed}
          isMe={myTeamId === team1Id}
        />
        <TeamStatus
          label="Команда 2"
          confirmed={!!team2Confirmed}
          isMe={myTeamId === team2Id}
        />
      </div>

      {myTeamId && (
        <button
          onClick={confirmMyTeam}
          disabled={iConfirmed}
          className={`w-full font-bold rounded-xl py-4 text-sm transition-all flex items-center justify-center gap-2 ${
            iConfirmed
              ? 'bg-white/20 text-white cursor-default'
              : 'bg-white text-black hover:bg-white/90'
          }`}
        >
          {iConfirmed ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Ты подтвердил
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Я в сети — подтвердить участие
            </>
          )}
        </button>
      )}

      <AnimatePresence>
        {criticalTime && !iConfirmed && myTeamId && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-xs text-red-400 text-center flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Если не подтвердишь — твоя команда вылетит из турнира
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamStatus({
  label,
  confirmed,
  isMe,
}: {
  label: string;
  confirmed: boolean;
  isMe: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 border transition-all duration-300 ${
        confirmed ? 'border-white/60 bg-white/5' : 'border-border bg-card'
      }`}
    >
      <div className="text-white text-xs font-semibold mb-1.5 flex items-center gap-1.5">
        {label}
        {isMe && (
          <span className="text-[9px] uppercase tracking-wider bg-white/10 border border-white/30 rounded px-1 py-0.5">
            ты
          </span>
        )}
      </div>
      <div
        className={`text-[11px] flex items-center gap-1.5 ${
          confirmed ? 'text-white' : 'text-muted'
        }`}
      >
        {confirmed ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={3} />
            Подтверждено
          </>
        ) : (
          <>
            <Clock className="w-3.5 h-3.5" />
            Ожидание
          </>
        )}
      </div>
    </div>
  );
}
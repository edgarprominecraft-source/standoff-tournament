import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type User } from '../../supabase';
import { MAPS, BO1_SEQUENCE, type GameMap } from '../../lib/cards';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';

type Props = {
  matchId: number;
  team1Id: number;
  team2Id: number;
  myTeamId: number | null;
  user: User;
  onMapSelected: (mapId: string) => void;
};

type MapPick = {
  id: number;
  match_id: number;
  team_id: number;
  map_name: string;
  action: 'ban' | 'pick';
  order_num: number;
};

export default function MapPicker({
  matchId,
  team1Id,
  team2Id,
  myTeamId,
  user,
  onMapSelected,
}: Props) {
  const [picks, setPicks] = useState<MapPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPicks = async () => {
    const { data } = await supabase
      .from('map_picks')
      .select('*')
      .eq('match_id', matchId)
      .order('order_num', { ascending: true });
    if (data) setPicks(data as MapPick[]);
    setLoading(false);
  };

  useEffect(() => {
    loadPicks();

    const channel = supabase
      .channel(`picks-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_picks',
          filter: `match_id=eq.${matchId}`,
        },
        () => loadPicks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Какая карта сейчас забанена
  const bannedIds = new Set(picks.map((p) => p.map_name));

  // Текущий шаг пик/бана
  const step = picks.length; // сколько уже сделано
  const totalSteps = BO1_SEQUENCE.length;

  const currentStep = step < totalSteps ? BO1_SEQUENCE[step] : null;

  // Чья сейчас очередь — 1 или 2
  const currentTeamNumeric = currentStep?.team ?? null;
  const currentTeamId =
    currentTeamNumeric === 1 ? team1Id : currentTeamNumeric === 2 ? team2Id : null;

  const isMyTurn = myTeamId !== null && currentTeamId === myTeamId;

  // Оставшаяся карта — та, на которой играют
  const remainingMaps = MAPS.filter((m) => !bannedIds.has(m.id));
  const finalMap = remainingMaps.length === 1 ? remainingMaps[0] : null;

  useEffect(() => {
    if (finalMap) {
      onMapSelected(finalMap.id);
    }
  }, [finalMap?.id]);

  const banMap = async (map: GameMap) => {
    if (!isMyTurn || !currentStep || !myTeamId) return;
    if (bannedIds.has(map.id)) {
      hapticError();
      return;
    }

    setSubmitting(true);
    haptic('medium');

    const { error } = await supabase.from('map_picks').insert({
      match_id: matchId,
      team_id: myTeamId,
      map_name: map.id,
      action: currentStep.action,
      order_num: step + 1,
    });

    setSubmitting(false);

    if (error) {
      hapticError();
    } else {
      hapticSuccess();
    }
  };

  if (loading) {
    return (
      <div className="text-muted text-center py-6 text-sm">
        Загрузка карт...
      </div>
    );
  }

  // Матч уже готов — показать финальную карту
  if (finalMap) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-white/40 rounded-2xl p-5 text-center shadow-glow"
      >
        <div className="text-muted text-xs uppercase tracking-widest mb-2">
          Карта выбрана
        </div>
        <div className="text-white font-bold text-2xl mb-1">{finalMap.name}</div>
        <div className="text-muted text-xs">
          Режим: {finalMap.mode === 'defuse' ? 'Defuse' : finalMap.mode}
        </div>
        <div className="mt-3 text-white text-sm">
          Готовьтесь к матчу!
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Статус */}
      <div
        className={`rounded-2xl p-4 border transition-colors ${
          isMyTurn
            ? 'bg-white text-black border-white'
            : 'bg-card border-border text-white'
        }`}
      >
        <div className="font-bold text-sm mb-1">
          {isMyTurn
            ? `🎯 Твоя очередь ${currentStep?.action === 'ban' ? 'банить' : 'выбирать'}`
            : '⏳ Ожидание соперника'}
        </div>
        <div
          className={`text-xs ${isMyTurn ? 'text-black/60' : 'text-muted'}`}
        >
          Шаг {step + 1} из {totalSteps}. Осталось карт:{' '}
          {MAPS.length - bannedIds.size}
        </div>
      </div>

      {/* Сетка карт */}
      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence>
          {MAPS.map((map) => {
            const isBanned = bannedIds.has(map.id);
            return (
              <motion.button
                key={map.id}
                onClick={() => banMap(map)}
                disabled={!isMyTurn || isBanned || submitting}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: isBanned ? 0.25 : 1,
                  scale: 1,
                }}
                whileTap={isMyTurn && !isBanned ? { scale: 0.95 } : {}}
                className={`relative rounded-2xl border p-3 text-left transition-colors ${
                  isBanned
                    ? 'border-border bg-bg/40'
                    : isMyTurn
                    ? 'border-white/60 bg-card hover:bg-card2 cursor-pointer'
                    : 'border-border bg-card'
                }`}
              >
                <div
                  className={`text-sm font-bold ${
                    isBanned ? 'text-muted line-through' : 'text-white'
                  }`}
                >
                  {map.name}
                </div>
                <div className="text-muted text-[10px] mt-0.5 uppercase">
                  {map.mode}
                </div>

                {isBanned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/40 text-3xl font-bold">✕</div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* История пиков */}
      {picks.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-muted text-xs uppercase tracking-wide mb-2">
            История
          </div>
          <div className="space-y-1">
            {picks.map((p) => {
              const mapObj = MAPS.find((m) => m.id === p.map_name);
              const teamLabel =
                p.team_id === team1Id ? 'Команда 1' : 'Команда 2';
              return (
                <div
                  key={p.id}
                  className="text-xs text-muted flex justify-between"
                >
                  <span>
                    {p.action === 'ban' ? '🚫' : '✓'} {mapObj?.name ?? p.map_name}
                  </span>
                  <span>{teamLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
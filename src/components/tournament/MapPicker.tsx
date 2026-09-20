import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Swords } from 'lucide-react';
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
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'map_picks',
        filter: `match_id=eq.${matchId}`,
      }, () => loadPicks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const bannedIds = new Set(picks.map((p) => p.map_name));
  const step = picks.length;
  const totalSteps = BO1_SEQUENCE.length;
  const currentStep = step < totalSteps ? BO1_SEQUENCE[step] : null;
  const currentTeamNumeric = currentStep?.team ?? null;
  const currentTeamId =
    currentTeamNumeric === 1 ? team1Id : currentTeamNumeric === 2 ? team2Id : null;
  const isMyTurn = myTeamId !== null && currentTeamId === myTeamId;
  const remainingMaps = MAPS.filter((m) => !bannedIds.has(m.id));
  const finalMap = remainingMaps.length === 1 ? remainingMaps[0] : null;

  useEffect(() => {
    if (finalMap) onMapSelected(finalMap.id);
  }, [finalMap?.id]);

  const banMap = async (map: GameMap) => {
    if (!isMyTurn || !currentStep || !myTeamId) return;
    if (bannedIds.has(map.id)) { hapticError(); return; }
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
    if (error) hapticError(); else hapticSuccess();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка карт</div>
      </div>
    );
  }

  if (finalMap) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative rounded-3xl overflow-hidden border border-white/40"
      >
        <div className={`absolute inset-0 ${finalMap.gradient} opacity-60`} />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
        <div className="relative p-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/30 mb-4 backdrop-blur"
          >
            <Swords className="w-8 h-8 text-white" />
          </motion.div>
          <div className="text-muted text-[10px] uppercase tracking-[0.3em] mb-2">
            Карта выбрана
          </div>
          <div className="text-white font-black text-3xl mb-1 tracking-tight">
            {finalMap.name}
          </div>
          <div className="text-white/60 text-xs uppercase tracking-widest">
            {finalMap.mode === 'defuse' ? 'Defuse' : finalMap.mode}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 text-white/80 text-sm font-semibold"
          >
            Готовьтесь к матчу
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Статус */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-5 border transition-all duration-300 ${
          isMyTurn
            ? 'bg-white text-black border-white shadow-glowStrong'
            : 'bg-card border-border text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isMyTurn ? 'bg-black/10' : 'bg-white/10'}`}>
            <Clock className={`w-5 h-5 ${isMyTurn ? 'text-black' : 'text-white'}`} />
          </div>
          <div className="flex-1">
            <div className="font-black text-sm uppercase tracking-wide">
              {isMyTurn
                ? `Твоя очередь ${currentStep?.action === 'ban' ? 'банить' : 'выбирать'}`
                : 'Ход соперника'}
            </div>
            <div className={`text-xs mt-0.5 ${isMyTurn ? 'text-black/60' : 'text-muted'}`}>
              Шаг {step + 1} / {totalSteps} · осталось карт: {MAPS.length - bannedIds.size}
            </div>
          </div>
          {isMyTurn && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-black"
            />
          )}
        </div>
      </motion.div>

      {/* Сетка карт */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {MAPS.map((map, idx) => {
            const isBanned = bannedIds.has(map.id);
            const disabled = !isMyTurn || isBanned || submitting;
            return (
              <motion.button
                key={map.id}
                onClick={() => banMap(map)}
                disabled={disabled}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={!disabled ? { scale: 1.03, y: -2 } : {}}
                whileTap={!disabled ? { scale: 0.97 } : {}}
                className={`relative rounded-2xl overflow-hidden border aspect-[4/3] text-left transition-all duration-300 ${
                  isBanned
                    ? 'border-border/50 opacity-30 grayscale'
                    : isMyTurn
                    ? 'border-white/60 cursor-pointer hover:border-white'
                    : 'border-border cursor-not-allowed'
                }`}
              >
                {/* Градиент-фон карты */}
                <div className={`absolute inset-0 ${map.gradient}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Содержимое */}
                <div className="relative h-full flex flex-col justify-end p-3">
                  <div className="text-white font-black text-base leading-none tracking-tight">
                    {map.name}
                  </div>
                  <div className="text-white/60 text-[9px] uppercase tracking-widest mt-1">
                    {map.mode}
                  </div>
                </div>

                {/* Забанено */}
                {isBanned && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center">
                      <X className="w-6 h-6 text-white/80" strokeWidth={3} />
                    </div>
                  </motion.div>
                )}

                {/* Доступно для клика — пульсация */}
                {isMyTurn && !isBanned && (
                  <motion.div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* История */}
      {picks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="text-muted text-[10px] uppercase tracking-[0.2em] mb-3">
            История
          </div>
          <div className="space-y-2">
            {picks.map((p, i) => {
              const mapObj = MAPS.find((m) => m.id === p.map_name);
              const teamLabel = p.team_id === team1Id ? 'К1' : 'К2';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-4 rounded-full ${mapObj?.gradient}`} />
                    <span className="text-white font-semibold">{mapObj?.name ?? p.map_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-[10px]">{teamLabel}</span>
                    {p.action === 'ban' ? (
                      <X className="w-3 h-3 text-red-400" />
                    ) : (
                      <Check className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
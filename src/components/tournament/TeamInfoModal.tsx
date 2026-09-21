import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, User as UserIcon, Shield } from 'lucide-react';
import { supabase } from '../../supabase';
import type { BracketTeam } from '../../lib/bracket';

type Props = {
  team: BracketTeam;
  onClose: () => void;
};

type Player = {
  user_id: number;
  nickname: string | null;
  first_name: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  standoff_id: string | null;
  role?: string;
};

export default function TeamInfoModal({ team, onClose }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Загружаем team, чтобы получить clan_id
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, clan_id')
        .eq('id', team.id)
        .maybeSingle();

      if (!teamData || !(teamData as any).clan_id) {
        setLoading(false);
        return;
      }

      const clanId = (teamData as any).clan_id;

      // Загружаем участников клана
      const { data: members } = await supabase
        .from('clan_members')
        .select('user_id, role')
        .eq('clan_id', clanId);

      if (!members || members.length === 0) {
        setLoading(false);
        return;
      }

      const ids = members.map((m: any) => m.user_id);

      const { data: users } = await supabase
        .from('users')
        .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id')
        .in('user_id', ids);

      const roleMap = new Map<number, string>();
      members.forEach((m: any) => roleMap.set(m.user_id, m.role));

      // Сортируем: лидер, офицеры, остальные
      const order = { leader: 0, officer: 1, member: 2 };
      const sorted = (users || []).sort((a: any, b: any) => {
        const ra = order[roleMap.get(a.user_id) as keyof typeof order] ?? 3;
        const rb = order[roleMap.get(b.user_id) as keyof typeof order] ?? 3;
        return ra - rb;
      });

      setPlayers(sorted as Player[]);
      setLoading(false);
    })();
  }, [team.id]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-gradient-to-br from-orange to-orange2 p-5 z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur border border-white/40 flex items-center justify-center overflow-hidden">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Shield className="w-7 h-7 text-white" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-white font-black text-lg truncate">{team.name}</div>
                  <div className="text-white/80 text-[11px] font-bold flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    {players.length} / 5 игроков
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/40 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
              Состав команды
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" />
              </div>
            ) : players.length === 0 ? (
              <div className="bg-bg2 border border-dashed border-border2 rounded-xl p-6 text-center">
                <UserIcon className="w-8 h-8 text-muted2 mx-auto mb-2" strokeWidth={1.5} />
                <div className="text-muted2 text-xs font-medium">Состав пока не заполнен</div>
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((p, i) => {
                  const isCaptain = i === 0;
                  return (
                    <motion.div
                      key={p.user_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-bg2 border border-border rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.avatar_url || p.photo_url ? (
                          <img src={p.avatar_url || p.photo_url || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-black font-bold text-sm truncate">
                          {p.nickname || p.first_name || 'Игрок'}
                        </div>
                        <div className="text-muted text-[10px] font-medium">
                          {p.standoff_id ? `ID: ${p.standoff_id}` : 'ID не указан'}
                        </div>
                      </div>
                      {isCaptain && (
                        <div className="text-[10px] px-2 py-0.5 rounded-md bg-orange/10 border border-orange/30 text-orange font-bold uppercase tracking-wider flex-shrink-0">
                          Капитан
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
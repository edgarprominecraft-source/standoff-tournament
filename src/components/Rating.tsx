import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, BarChart3, Coins, User as UserIcon, Hash } from 'lucide-react';
import { supabase, type User } from '../supabase';
import RankBadge from './RankBadge';

export default function Rating() {
  const [top, setTop] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('balance', { ascending: false })
        .limit(50);
      if (data) setTop(data as User[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка рейтинга</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-5 shadow-orange relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-white font-black text-lg">Рейтинг сезона</div>
            <div className="text-white/80 text-[11px] font-medium">Топ-50 игроков по балансу</div>
          </div>
        </div>
      </div>

      {top.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-card">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-orange/10 border border-orange/30 flex items-center justify-center">
              <Crown className="w-7 h-7 text-orange" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-muted text-sm font-medium">Пока никого нет в рейтинге</div>
        </div>
      ) : (
        top.map((u, i) => {
          const roleBadge = (() => {
            if (u.role === 'admin') return <span className="role-admin">👑 ADMIN</span>;
            if (u.role === 'moderator') return <span className="role-moderator">🛡 MOD</span>;
            if (u.role === 'support') return <span className="role-support">🎧 SUPPORT</span>;
            return null;
          })();

          return (
            <motion.div
              key={u.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`bg-card border rounded-2xl p-3 flex items-center gap-3 shadow-card ${
                i < 3 ? 'border-orange/40' : 'border-border'
              }`}
            >
              <div className="w-8 flex items-center justify-center flex-shrink-0">
                {i === 0 ? <Crown className="w-5 h-5 text-yellow-500" strokeWidth={2} />
                  : i === 1 ? <Medal className="w-5 h-5 text-gray-400" strokeWidth={2} />
                  : i === 2 ? <Award className="w-5 h-5 text-amber-700" strokeWidth={2} />
                  : <span className="text-muted text-xs font-bold flex items-center gap-0.5">
                      <Hash className="w-3 h-3" />{i + 1}
                    </span>}
              </div>

              <div className="w-11 h-11 rounded-full bg-bg2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {u.avatar_url || u.photo_url ? (
                  <img src={u.avatar_url || u.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold truncate" style={{ color: u.nickname_color || '#0A0A0A' }}>
                    {u.nickname || u.first_name || 'Игрок'}
                  </span>
                  {roleBadge}
                  {u.rank && <RankBadge rankId={u.rank} size="sm" showName={false} />}
                </div>
                <div className="text-muted text-[10px] font-medium">
                  {u.standoff_id ? `ID: ${u.standoff_id}` : 'ID не указан'}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 bg-orange/10 rounded-xl px-2.5 py-1.5">
                <span className="text-orange font-black text-sm">{u.balance || 0}</span>
                <Coins className="w-3.5 h-3.5 text-orange" />
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
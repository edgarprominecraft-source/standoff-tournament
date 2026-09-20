import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, BarChart3, Coins, User as UserIcon, Hash } from 'lucide-react';
import { supabase, type User } from '../supabase';

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
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка рейтинга</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-card2 border border-border flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div>
          <div className="text-white font-bold">Рейтинг сезона</div>
          <div className="text-muted text-xs">Топ-50 игроков по балансу</div>
        </div>
      </div>

      {top.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-card2 border border-border flex items-center justify-center">
              <Crown className="w-7 h-7 text-muted" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-muted text-sm">Пока никого нет в рейтинге</div>
        </div>
      ) : (
        top.map((u, i) => (
          <motion.div
            key={u.user_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`bg-card border rounded-xl p-3 flex items-center gap-3 transition-colors ${
              i < 3 ? 'border-white/30' : 'border-border'
            }`}
          >
            <div className="w-8 flex items-center justify-center flex-shrink-0">
              {i === 0 ? (
                <Crown className="w-5 h-5 text-yellow-400" strokeWidth={2} />
              ) : i === 1 ? (
                <Medal className="w-5 h-5 text-gray-300" strokeWidth={2} />
              ) : i === 2 ? (
                <Award className="w-5 h-5 text-amber-600" strokeWidth={2} />
              ) : (
                <span className="text-muted text-xs font-semibold flex items-center gap-0.5">
                  <Hash className="w-3 h-3" />
                  {i + 1}
                </span>
              )}
            </div>

            <div className="w-10 h-10 rounded-full bg-card2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {u.photo_url ? (
                <img src={u.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-muted" strokeWidth={1.5} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-white text-sm truncate font-semibold">
                {u.nickname || u.first_name || 'Игрок'}
              </div>
              <div className="text-muted text-[10px] truncate">
                {u.standoff_id ? `ID: ${u.standoff_id}` : 'ID не указан'}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-white font-bold text-sm">{u.balance}</span>
              <Coins className="w-3.5 h-3.5 text-white/60" />
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
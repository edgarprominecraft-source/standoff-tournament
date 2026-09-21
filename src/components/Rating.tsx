import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, BarChart3, User as UserIcon, Hash, Users, Target, Crosshair } from 'lucide-react';
import { supabase, type User } from '../supabase';
import RankBadge from './RankBadge';
import { haptic } from '../lib/telegram';

type Filter = 'kills' | 'kd' | 'clans';

type Clan = {
  id: number;
  name: string;
  tag: string;
  logo_url: string | null;
  points: number;
  wins: number;
  losses: number;
  leader_id: number | null;
};

export default function Rating() {
  const [filter, setFilter] = useState<Filter>('kills');
  const [players, setPlayers] = useState<User[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Игроки — сортировка по kills
      const { data: topPlayers } = await supabase
        .from('users')
        .select('*')
        .gt('kills', 0)
        .order('kills', { ascending: false })
        .limit(100);
      if (topPlayers) setPlayers(topPlayers as User[]);

      // Кланы
      const { data: topClans } = await supabase
        .from('clans')
        .select('id, name, tag, logo_url, points, wins, losses, leader_id')
        .order('points', { ascending: false })
        .limit(50);
      if (topClans) setClans(topClans as Clan[]);

      setLoading(false);
    })();
  }, []);

  // Сортировка по K/D
  const playersByKd = [...players].sort((a, b) => {
    const kdA = (a.deaths || 0) > 0 ? (a.kills || 0) / (a.deaths || 1) : (a.kills || 0);
    const kdB = (b.deaths || 0) > 0 ? (b.kills || 0) / (b.deaths || 1) : (b.kills || 0);
    return kdB - kdA;
  });

  const displayed = filter === 'kd' ? playersByKd : players;

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
      {/* Шапка */}
      <div className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-5 shadow-orange relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-white font-black text-lg">Рейтинг сезона</div>
            <div className="text-white/80 text-[11px] font-medium">
              {filter === 'clans' ? `${clans.length} кланов` : `${displayed.length} игроков`}
            </div>
          </div>
        </div>
      </div>

      {/* Фильтр: Убийства / К/Д / Кланы */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => { haptic('light'); setFilter('kills'); }}
          className={`py-3 rounded-2xl font-black text-[11px] flex items-center justify-center gap-1.5 transition-all ${
            filter === 'kills'
              ? 'bg-orange text-white shadow-orange'
              : 'bg-card border border-border text-muted'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          Убийства
        </button>
        <button
          onClick={() => { haptic('light'); setFilter('kd'); }}
          className={`py-3 rounded-2xl font-black text-[11px] flex items-center justify-center gap-1.5 transition-all ${
            filter === 'kd'
              ? 'bg-orange text-white shadow-orange'
              : 'bg-card border border-border text-muted'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          К/Д
        </button>
        <button
          onClick={() => { haptic('light'); setFilter('clans'); }}
          className={`py-3 rounded-2xl font-black text-[11px] flex items-center justify-center gap-1.5 transition-all ${
            filter === 'clans'
              ? 'bg-orange text-white shadow-orange'
              : 'bg-card border border-border text-muted'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Кланы
        </button>
      </div>

      {/* Список */}
      {filter === 'clans' ? (
        clans.length === 0 ? (
          <Empty label="Пока нет кланов" />
        ) : (
          clans.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`bg-card border rounded-2xl p-3 flex items-center gap-3 shadow-card ${
                i < 3 ? 'border-orange/40' : 'border-border'
              }`}
            >
              <div className="w-8 flex items-center justify-center flex-shrink-0">
                {i === 0 ? <Crown className="w-5 h-5 text-yellow-500" /> :
                 i === 1 ? <Medal className="w-5 h-5 text-gray-400" /> :
                 i === 2 ? <Award className="w-5 h-5 text-amber-700" /> :
                 <span className="text-muted text-xs font-bold flex items-center gap-0.5">
                   <Hash className="w-3 h-3" />{i + 1}
                 </span>}
              </div>

              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-sm">{c.tag.slice(0, 2)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate text-black">{c.name}</div>
                <div className="text-muted text-[10px] font-medium">
                  [{c.tag}] · {c.wins}W / {c.losses}L
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 bg-orange/10 rounded-xl px-2.5 py-1.5">
                <span className="text-orange font-black text-sm">{c.points}</span>
                <span className="text-orange text-[10px] font-bold">PTS</span>
              </div>
            </motion.div>
          ))
        )
      ) : displayed.length === 0 ? (
        <Empty label="Пока нет данных. Матчи ещё не сыграны." />
      ) : (
        displayed.map((u, i) => {
          const kd = (u.deaths || 0) > 0 ? (u.kills || 0) / (u.deaths || 1) : (u.kills || 0);
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
                {i === 0 ? <Crown className="w-5 h-5 text-yellow-500" /> :
                 i === 1 ? <Medal className="w-5 h-5 text-gray-400" /> :
                 i === 2 ? <Award className="w-5 h-5 text-amber-700" /> :
                 <span className="text-muted text-xs font-bold flex items-center gap-0.5">
                   <Hash className="w-3 h-3" />{i + 1}
                 </span>}
              </div>

              <div className="w-11 h-11 rounded-full bg-bg2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {u.avatar_url || u.photo_url ? (
                  <img src={u.avatar_url || u.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-muted" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold truncate" style={{ color: u.nickname_color || '#0A0A0A' }}>
                    {u.nickname || u.first_name || 'Игрок'}
                  </span>
                  {u.role === 'admin' && <span className="role-admin">👑</span>}
                  {u.role === 'moderator' && <span className="role-moderator">🛡</span>}
                  {u.role === 'support' && <span className="role-support">🎧</span>}
                  {u.rank && <RankBadge rankId={u.rank} size="sm" showName={false} />}
                </div>
                <div className="text-muted text-[10px] font-medium">
                  K/D: <span className="text-black font-bold">{kd.toFixed(2)}</span>
                  {' · '}
                  {u.kills || 0} kills · {u.deaths || 0} deaths
                </div>
              </div>

              {/* Отображаем главное число в зависимости от фильтра */}
              <div className="flex items-center gap-1 flex-shrink-0 bg-orange/10 rounded-xl px-2.5 py-1.5">
                {filter === 'kills' ? (
                  <>
                    <span className="text-orange font-black text-sm">{u.kills || 0}</span>
                    <Crosshair className="w-3.5 h-3.5 text-orange" />
                  </>
                ) : (
                  <>
                    <span className="text-orange font-black text-sm">{kd.toFixed(2)}</span>
                    <Target className="w-3.5 h-3.5 text-orange" />
                  </>
                )}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-card">
      <Crown className="w-10 h-10 text-muted mx-auto mb-3" />
      <div className="text-muted text-sm">{label}</div>
    </div>
  );
}
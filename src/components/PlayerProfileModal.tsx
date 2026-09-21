import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserMinus, MessageCircle, Crown, Shield, Headphones } from 'lucide-react';
import { supabase } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import { addFriend, removeFriend, isFriend, type FriendUser } from '../lib/friends';
import RankBadge from './RankBadge';

type Props = {
  userId: number;
  currentUserId: number;
  onClose: () => void;
};

export default function PlayerProfileModal({ userId, currentUserId, onClose }: Props) {
  const [user, setUser] = useState<FriendUser | null>(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, kills: 0, deaths: 0, matches: 0 });
  const [clanName, setClanName] = useState<string | null>(null);
  const [friend, setFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase
        .from('users')
        .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id, nickname_color, role, rank, last_seen, wins, losses, kills, deaths, matches_played, clan_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (u) {
        setUser({ ...u, is_online: u.last_seen ? Date.now() - new Date(u.last_seen).getTime() < 5 * 60 * 1000 : false } as FriendUser);
        setStats({
          wins: u.wins || 0,
          losses: u.losses || 0,
          kills: u.kills || 0,
          deaths: u.deaths || 0,
          matches: u.matches_played || 0,
        });
        if (u.clan_id) {
          const { data: c } = await supabase.from('clans').select('name, tag').eq('id', u.clan_id).maybeSingle();
          if (c) setClanName(`${c.name} [${c.tag}]`);
        }
      }

      if (currentUserId !== userId) {
        setFriend(await isFriend(currentUserId, userId));
      }
      setLoading(false);
    })();
  }, [userId, currentUserId]);

  const toggleFriend = async () => {
    if (busy) return;
    setBusy(true);
    haptic('medium');
    if (friend) {
      await removeFriend(currentUserId, userId);
      setFriend(false);
      hapticSuccess();
    } else {
      const res = await addFriend(currentUserId, userId);
      if (res.error) { hapticError(); } else { setFriend(true); hapticSuccess(); }
    }
    setBusy(false);
  };

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths) : stats.kills;
  const winrate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

  const roleBadge = () => {
    if (user?.role === 'admin') return <span className="role-admin"><Crown className="w-3 h-3" /> ADMIN</span>;
    if (user?.role === 'moderator') return <span className="role-moderator"><Shield className="w-3 h-3" /> MOD</span>;
    if (user?.role === 'support') return <span className="role-support"><Headphones className="w-3 h-3" /> SUPPORT</span>;
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-orange/20 border-t-orange rounded-full animate-spin mx-auto" />
          </div>
        ) : !user ? (
          <div className="p-8 text-center">
            <div className="text-muted text-sm mb-4">Игрок не найден</div>
            <button onClick={onClose} className="text-orange font-bold text-sm">Закрыть</button>
          </div>
        ) : (
          <>
            {/* Шапка */}
            <div className="bg-gradient-to-br from-orange to-orange2 p-5 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur border-2 border-white/40 overflow-hidden flex-shrink-0">
                  {user.avatar_url || user.photo_url ? (
                    <img src={user.avatar_url || user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">
                      {(user.nickname || user.first_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-white font-black text-lg truncate">{user.nickname || user.first_name || 'Игрок'}</div>
                    {roleBadge()}
                  </div>
                  <div className="text-white/80 text-xs">@{user.standoff_id ? `ID ${user.standoff_id}` : 'без ID'}</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${user.is_online ? 'text-green-300' : 'text-white/60'}`}>
                    {user.is_online ? '● В сети' : '○ Не в сети'}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Статистика */}
            <div className="p-5 space-y-4">
              {clanName && (
                <div className="bg-bg2 border border-border rounded-2xl p-3 flex items-center gap-2">
                  <div className="text-orange font-bold text-xs">КЛАН</div>
                  <div className="text-black font-bold text-sm">{clanName}</div>
                </div>
              )}

              <div className="grid grid-cols-4 divide-x divide-border bg-bg2 rounded-2xl border border-border">
                <div className="py-3 text-center">
                  <div className="text-black font-black text-base">{kd.toFixed(2)}</div>
                  <div className="text-muted text-[9px] uppercase tracking-wider font-bold">К/Д</div>
                </div>
                <div className="py-3 text-center">
                  <div className="text-black font-black text-base">{winrate}%</div>
                  <div className="text-muted text-[9px] uppercase tracking-wider font-bold">Винрейт</div>
                </div>
                <div className="py-3 text-center">
                  <div className="text-black font-black text-base">{stats.wins}</div>
                  <div className="text-muted text-[9px] uppercase tracking-wider font-bold">Побед</div>
                </div>
                <div className="py-3 text-center">
                  <div className="text-black font-black text-base">{stats.losses}</div>
                  <div className="text-muted text-[9px] uppercase tracking-wider font-bold">Поражений</div>
                </div>
              </div>

              {user.rank && (
                <div className="flex items-center justify-center">
                  <RankBadge rankId={user.rank} size="lg" />
                </div>
              )}

              {currentUserId !== userId && (
                <div className="flex gap-2">
                  <button
                    onClick={toggleFriend}
                    disabled={busy}
                    className={`flex-1 rounded-2xl py-3 text-sm font-black flex items-center justify-center gap-2 transition-colors ${
                      friend
                        ? 'bg-bg2 border-2 border-border text-muted hover:border-danger/40 hover:text-danger'
                        : 'bg-orange text-white shadow-orange hover:bg-orangeDark'
                    }`}
                  >
                    {friend ? (
                      <><UserMinus className="w-4 h-4" /> Удалить из друзей</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Добавить в друзья</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

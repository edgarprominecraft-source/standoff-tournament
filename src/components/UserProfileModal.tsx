import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, User as UserIcon, UserPlus, UserMinus, Loader2,
  Crown, Shield, Headphones, Swords,
} from 'lucide-react';
import { supabase, type User } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import {
  type FriendUser, addFriend, removeFriend, isFriend, searchUserById,
} from '../lib/friends';
import RankBadge from './RankBadge';

type Props = {
  userId: number;
  currentUser: User;
  onClose: () => void;
  onFriendChange?: () => void;
};

export default function UserProfileModal({ userId, currentUser, onClose, onFriendChange }: Props) {
  const [user, setUser] = useState<FriendUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0 });
  const [clanName, setClanName] = useState<string | null>(null);

  const isMe = userId === currentUser.user_id;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const u = await searchUserById(userId);
      setUser(u);

      if (u) {
        const { data: s } = await supabase
          .from('users')
          .select('wins, losses, kills, deaths, matches_played, clan_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (s) {
          const row: any = s;
          setStats({
            matches: row.matches_played || 0,
            wins: row.wins || 0,
            losses: row.losses || 0,
            kills: row.kills || 0,
            deaths: row.deaths || 0,
          });
          if (row.clan_id) {
            const { data: c } = await supabase
              .from('clans')
              .select('name, tag')
              .eq('id', row.clan_id)
              .maybeSingle();
            if (c) setClanName(`${(c as any).name} [${(c as any).tag}]`);
          }
        }

        if (!isMe) {
          setFriend(await isFriend(currentUser.user_id, userId));
        }
      }
      setLoading(false);
    })();
  }, [userId, currentUser.user_id, isMe]);

  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    haptic('medium');
    const res = await addFriend(currentUser.user_id, userId);
    setBusy(false);
    if (res.error) { hapticError(); return; }
    hapticSuccess();
    setFriend(true);
    onFriendChange?.();
  };

  const handleRemove = async () => {
    if (busy) return;
    if (!confirm('Удалить из друзей?')) return;
    setBusy(true);
    haptic('medium');
    await removeFriend(currentUser.user_id, userId);
    setBusy(false);
    hapticSuccess();
    setFriend(false);
    onFriendChange?.();
  };

  const kd = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills;

  const roleBadge = (() => {
    if (!user) return null;
    if (user.role === 'admin') return <span className="role-admin"><Crown className="w-3 h-3" /> ADMIN</span>;
    if (user.role === 'moderator') return <span className="role-moderator"><Shield className="w-3 h-3" /> MOD</span>;
    if (user.role === 'support') return <span className="role-support"><Headphones className="w-3 h-3" /> SUPPORT</span>;
    return null;
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-gradient-to-br from-orange to-orange2 h-24 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-orange animate-spin" />
          </div>
        ) : !user ? (
          <div className="p-8 text-center">
            <UserIcon className="w-12 h-12 text-muted mx-auto mb-3" />
            <div className="text-black font-bold mb-1">Игрок не найден</div>
          </div>
        ) : (
          <div className="px-5 pb-5 -mt-12">
            <div className="flex items-end justify-between mb-3">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white overflow-hidden flex items-center justify-center">
                {user.avatar_url || user.photo_url ? (
                  <img src={user.avatar_url || user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-muted" strokeWidth={1.5} />
                )}
              </div>
              {user.is_online && (
                <div className="bg-green-500/15 border border-green-500/40 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-600 text-[10px] font-black uppercase tracking-wider">Online</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="font-black text-2xl"
                style={{ color: user.nickname_color || '#0A0A0A' }}
              >
                {user.nickname || user.first_name || 'Игрок'}
              </span>
              {roleBadge}
            </div>

            <div className="text-muted text-[11px] mb-3">
              ID: <span className="text-black font-bold">{user.standoff_id || '—'}</span>
            </div>

            {user.rank && (
              <div className="mb-4">
                <RankBadge rankId={user.rank} size="md" />
              </div>
            )}

            <div className="bg-bg2 border border-border rounded-2xl overflow-hidden mb-3">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Статистика</span>
                <span className="text-[10px] text-muted font-semibold">{stats.matches} матчей</span>
              </div>
              <div className="grid grid-cols-4 divide-x divide-border">
                <StatCell label="К/Д" value={kd.toFixed(2)} />
                <StatCell label="Побед" value={stats.wins} />
                <StatCell label="Пораж." value={stats.losses} />
                <StatCell label="Киллов" value={stats.kills} />
              </div>
            </div>

            {clanName && (
              <div className="bg-card border border-border rounded-2xl p-3 mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4 text-orange" />
                <span className="text-black font-bold text-xs">{clanName}</span>
              </div>
            )}

            {!isMe && (
              friend ? (
                <button
                  onClick={handleRemove}
                  disabled={busy}
                  className="w-full bg-danger/10 border border-danger/40 text-danger font-bold rounded-2xl py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-danger/20 transition-colors"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                  Удалить из друзей
                </button>
              ) : (
                <button
                  onClick={handleAdd}
                  disabled={busy}
                  className="w-full bg-orange text-white font-black rounded-2xl py-3 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Добавить в друзья
                </button>
              )
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="py-3 text-center">
      <div className="text-black font-black text-base">{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-bold mt-0.5">{label}</div>
    </div>
  );
}
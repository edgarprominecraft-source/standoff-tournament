import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, BarChart3, Coins, User as UserIcon, Hash, Users, Shield, UserPlus, Check, X } from 'lucide-react';
import { supabase, type User } from '../supabase';
import RankBadge from './RankBadge';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';

type Filter = 'players' | 'clans';

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
  const [filter, setFilter] = useState<Filter>('players');
  const [players, setPlayers] = useState<User[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFriends, setMyFriends] = useState<Set<number>>(new Set());
  const [myId, setMyId] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null);

  useEffect(() => {
    (async () => {
      // Получаем мой user_id
      const stored = localStorage.getItem('standoff_user_id');
      const uid = stored ? parseInt(stored, 10) : null;
      setMyId(uid);

      // Игроки
      const { data: topPlayers } = await supabase
        .from('users')
        .select('*')
        .order('balance', { ascending: false })
        .limit(50);
      if (topPlayers) setPlayers(topPlayers as User[]);

      // Кланы
      const { data: topClans } = await supabase
        .from('clans')
        .select('id, name, tag, logo_url, points, wins, losses, leader_id')
        .order('points', { ascending: false })
        .limit(50);
      if (topClans) setClans(topClans as Clan[]);

      // Мои друзья
      if (uid) {
        const { data: fr } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', uid);
        setMyFriends(new Set((fr || []).map((f: any) => f.friend_id)));
      }

      setLoading(false);
    })();
  }, []);

  const addFriend = async (friendId: number) => {
    if (!myId) { hapticError(); return; }
    if (myFriends.has(friendId)) { hapticError(); return; }

    haptic('medium');
    const { error } = await supabase.from('friends').insert({
      user_id: myId,
      friend_id: friendId,
    });
    await supabase.from('friends').insert({
      user_id: friendId,
      friend_id: myId,
    });

    if (error) { hapticError(); return; }
    hapticSuccess();
    setMyFriends(new Set([...myFriends, friendId]));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка рейтинга</div>
      </div>
    );
  }

  // ===== Детали игрока =====
  if (selectedPlayer) {
    return (
      <PlayerDetail
        player={selectedPlayer}
        isFriend={myFriends.has(selectedPlayer.user_id)}
        onAddFriend={() => addFriend(selectedPlayer.user_id)}
        onBack={() => setSelectedPlayer(null)}
      />
    );
  }

  // ===== Детали клана =====
  if (selectedClan) {
    return (
      <ClanDetail
        clan={selectedClan}
        onBack={() => setSelectedClan(null)}
      />
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
              {filter === 'players' ? `${players.length} игроков` : `${clans.length} кланов`}
            </div>
          </div>
        </div>
      </div>

      {/* Фильтр */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { haptic('light'); setFilter('players'); }}
          className={`py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            filter === 'players'
              ? 'bg-orange text-white shadow-orange'
              : 'bg-card border border-border text-muted'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Игроки
        </button>
        <button
          onClick={() => { haptic('light'); setFilter('clans'); }}
          className={`py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            filter === 'clans'
              ? 'bg-orange text-white shadow-orange'
              : 'bg-card border border-border text-muted'
          }`}
        >
          <Users className="w-4 h-4" />
          Кланы
        </button>
      </div>

      {/* Список */}
      {filter === 'players' ? (
        players.length === 0 ? (
          <Empty label="Пока никого нет" />
        ) : (
          players.map((u, i) => (
            <motion.button
              key={u.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => { haptic('light'); setSelectedPlayer(u); }}
              className={`w-full bg-card border rounded-2xl p-3 flex items-center gap-3 shadow-card text-left hover:border-orange/40 transition-colors ${
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
                  {u.standoff_id ? `ID: ${u.standoff_id}` : 'ID не указан'}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 bg-orange/10 rounded-xl px-2.5 py-1.5">
                <span className="text-orange font-black text-sm">{u.balance || 0}</span>
                <Coins className="w-3.5 h-3.5 text-orange" />
              </div>
            </motion.button>
          ))
        )
      ) : (
        clans.length === 0 ? (
          <Empty label="Пока нет кланов" />
        ) : (
          clans.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => { haptic('light'); setSelectedClan(c); }}
              className={`w-full bg-card border rounded-2xl p-3 flex items-center gap-3 shadow-card text-left hover:border-orange/40 transition-colors ${
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
                  <span className="text-white font-black text-sm">
                    {c.tag.slice(0, 2)}
                  </span>
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
            </motion.button>
          ))
        )
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

// ===== Детали игрока =====
function PlayerDetail({ player, isFriend, onAddFriend, onBack }: any) {
  const [stats, setStats] = useState({ wins: 0, losses: 0, matches: 0, kills: 0, deaths: 0 });
  const [clanName, setClanName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase
        .from('users')
        .select('wins, losses, matches_played, kills, deaths, clan_id')
        .eq('user_id', player.user_id)
        .maybeSingle();
      if (u) {
        setStats({
          wins: u.wins || 0,
          losses: u.losses || 0,
          matches: u.matches_played || 0,
          kills: u.kills || 0,
          deaths: u.deaths || 0,
        });

        if (u.clan_id) {
          const { data: c } = await supabase
            .from('clans')
            .select('name, tag')
            .eq('id', u.clan_id)
            .maybeSingle();
          if (c) setClanName(`${c.name} [${c.tag}]`);
        }
      }
    })();
  }, [player.user_id]);

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths) : stats.kills;
  const winrate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-orange text-sm font-bold">
        ← Назад к рейтингу
      </button>

      <div className="bg-card border border-border rounded-3xl p-5 shadow-card text-center">
        <div className="w-20 h-20 rounded-full bg-bg2 border border-border flex items-center justify-center overflow-hidden mx-auto mb-3">
          {player.avatar_url || player.photo_url ? (
            <img src={player.avatar_url || player.photo_url || ''} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-8 h-8 text-muted" />
          )}
        </div>
        <div className="text-black font-black text-xl">
          {player.nickname || player.first_name || 'Игрок'}
        </div>
        <div className="text-muted text-xs mt-1">
          @{player.username || '—'}
        </div>
        {player.rank && (
          <div className="mt-2 flex justify-center">
            <RankBadge rankId={player.rank} size="lg" />
          </div>
        )}

        {!isFriend && (
          <button
            onClick={onAddFriend}
            className="mt-4 bg-orange text-white font-bold rounded-2xl px-6 py-2.5 text-sm flex items-center justify-center gap-2 mx-auto shadow-orange"
          >
            <UserPlus className="w-4 h-4" />
            Добавить в друзья
          </button>
        )}
        {isFriend && (
          <div className="mt-4 inline-flex items-center gap-2 bg-success/10 border border-success/30 text-success rounded-2xl px-4 py-2 text-sm font-bold">
            <Check className="w-4 h-4" />
            Уже в друзьях
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-3">
        <DetailRow label="Standoff ID" value={player.standoff_id || '—'} />
        <DetailRow label="Клан" value={clanName || 'Не в клане'} />
        <DetailRow label="Матчей" value={stats.matches} />
        <DetailRow label="Побед" value={stats.wins} />
        <DetailRow label="Поражений" value={stats.losses} />
        <DetailRow label="К/Д" value={kd.toFixed(2)} />
        <DetailRow label="Винрейт" value={`${winrate}%`} />
        <DetailRow label="Баланс" value={`${player.balance || 0} 💰`} />
      </div>
    </motion.div>
  );
}

// ===== Детали клана =====
function ClanDetail({ clan, onBack }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase
        .from('clan_members')
        .select('user_id, role')
        .eq('clan_id', clan.id);

      if (m && m.length > 0) {
        const ids = m.map((x: any) => x.user_id);
        const { data: u } = await supabase
          .from('users')
          .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id')
          .in('user_id', ids);

        const userMap = new Map<number, any>();
        (u || []).forEach((x: any) => userMap.set(x.user_id, x));

        const enriched = m.map((x: any) => ({
          ...x,
          user: userMap.get(x.user_id),
        }));
        setMembers(enriched);
      }
      setLoading(false);
    })();
  }, [clan.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-orange text-sm font-bold">
        ← Назад к рейтингу
      </button>

      <div className="bg-card border border-border rounded-3xl p-5 shadow-card text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden mx-auto mb-3">
          {clan.logo_url ? (
            <img src={clan.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-black text-2xl">{clan.tag.slice(0, 2)}</span>
          )}
        </div>
        <div className="text-black font-black text-xl">{clan.name}</div>
        <div className="text-orange font-bold text-sm mt-1">[{clan.tag}]</div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <MiniStat label="Очки" value={clan.points} />
          <MiniStat label="Побед" value={clan.wins} />
          <MiniStat label="Поражений" value={clan.losses} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
          Состав клана ({members.length})
        </div>
        {loading ? (
          <div className="text-center text-muted text-xs py-4">Загрузка...</div>
        ) : members.length === 0 ? (
          <div className="text-center text-muted text-xs py-4">Нет участников</div>
        ) : (
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-2.5">
                <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {m.user?.avatar_url || m.user?.photo_url ? (
                    <img src={m.user.avatar_url || m.user.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-black text-xs font-bold truncate">
                    {m.user?.nickname || m.user?.first_name || 'Игрок'}
                  </div>
                  <div className="text-muted text-[10px]">
                    ID: {m.user?.standoff_id || '—'}
                  </div>
                </div>
                {m.role === 'leader' && <span className="role-admin">Лидер</span>}
                {m.role === 'officer' && <span className="role-moderator">Офицер</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-black font-bold">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="bg-bg2 rounded-xl p-2 text-center">
      <div className="text-orange font-black text-base">{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-bold">{label}</div>
    </div>
  );
}
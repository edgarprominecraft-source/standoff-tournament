import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, User as UserIcon, Camera, Check, X,
  Crown, Shield, Headphones, Users as UsersIcon, Settings as SettingsIcon,
  Swords, ChevronRight, Palette, Lock, Upload, Image as ImageIcon,
} from 'lucide-react';
import { supabase, type User } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import { PROFILE_BANNERS, updateProfile, uploadAvatar, uploadBanner } from '../lib/profile';
import RankBadge from './RankBadge';

type Props = {
  user: User;
  setUser: (u: User) => void;
};

const BANNER_PRICE = 2000;

export default function Profile({ user, setUser }: Props) {
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [standoffId, setStandoffId] = useState(user.standoff_id ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showBanners, setShowBanners] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditNick, setShowEditNick] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [stats, setStats] = useState({ matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0 });
  const [friendsCount, setFriendsCount] = useState(0);
  const [clanName, setClanName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const customBannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('wins, losses, kills, deaths, matches_played')
        .eq('user_id', user.user_id)
        .maybeSingle();
      if (data) {
        setStats({
          matches: data.matches_played || 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          kills: data.kills || 0,
          deaths: data.deaths || 0,
        });
      }

      const { count: fCount } = await supabase
        .from('friends')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.user_id);
      setFriendsCount(fCount || 0);

      if (user.clan_id) {
        const { data: c } = await supabase
          .from('clans')
          .select('name, tag')
          .eq('id', user.clan_id)
          .maybeSingle();
        if (c) setClanName(`${c.name} [${c.tag}]`);
      }
    })();
  }, [user.user_id, user.clan_id]);

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths) : stats.kills;
  const winrate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

  const canChangeNick = () => {
    if (!user.last_nick_change) return true;
    const diff = Date.now() - new Date(user.last_nick_change).getTime();
    return diff > 24 * 60 * 60 * 1000;
  };

  const saveNickname = async () => {
    if (!nickname.trim() || nickname.length < 3) { hapticError(); setMsg('Ник минимум 3 символа'); return; }
    if (!canChangeNick()) { hapticError(); setMsg('Ник раз в 24 часа'); return; }
    setSaving(true);
    const { data, error } = await updateProfile(user.user_id, {
      nickname: nickname.trim(),
      last_nick_change: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { hapticError(); setMsg(error.message); }
    else { hapticSuccess(); setUser(data as User); setMsg('Ник обновлён'); setShowEditNick(false); }
  };

  const saveStandoffId = async () => {
    if (!standoffId.trim() || standoffId.length < 5) { hapticError(); setMsg('Корректный Standoff ID'); return; }
    setSaving(true);
    const { data, error } = await updateProfile(user.user_id, { standoff_id: standoffId.trim() });
    setSaving(false);
    if (error) { hapticError(); setMsg(error.message); }
    else { hapticSuccess(); setUser(data as User); setMsg('Standoff ID сохранён'); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { hapticError(); setMsg('Файл больше 5MB'); return; }
    haptic('medium');
    setSaving(true);
    const url = await uploadAvatar(user.user_id, file);
    if (!url) { setSaving(false); hapticError(); setMsg('Ошибка загрузки'); return; }
    const { data, error } = await updateProfile(user.user_id, { avatar_url: url });
    setSaving(false);
    if (error) { hapticError(); setMsg(error.message); }
    else { hapticSuccess(); setUser(data as User); setMsg('Аватар обновлён'); }
  };

  const handleCustomBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user.has_premium) {
      hapticError(); setMsg('Только для Premium. Оформи у @HePastic'); return;
    }
    if ((user.balance || 0) < BANNER_PRICE) {
      hapticError(); setMsg(`Нужно ${BANNER_PRICE} монет`); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      hapticError(); setMsg('Файл макс 5MB'); return;
    }
    if (!confirm(`Списать ${BANNER_PRICE} монет?`)) return;

    haptic('medium');
    setSaving(true);

    const url = await uploadBanner(user.user_id, file);
    if (!url) { setSaving(false); hapticError(); setMsg('Ошибка загрузки'); return; }

    const { data, error } = await updateProfile(user.user_id, {
      custom_banner_url: url,
      banner_url: null,
      balance: (user.balance || 0) - BANNER_PRICE,
    });

    setSaving(false);
    if (error) { hapticError(); setMsg(error.message); }
    else { hapticSuccess(); setUser(data as User); setMsg(`Свой фон установлен (-${BANNER_PRICE} 💰)`); setShowBanners(false); }
  };

  const pickBanner = async (bannerId: string) => {
    if (!user.has_premium) { hapticError(); setMsg('Только для Premium'); return; }
    haptic('light');
    const { data } = await updateProfile(user.user_id, { banner_url: bannerId, custom_banner_url: null });
    if (data) { hapticSuccess(); setUser(data as User); setMsg('Фон обновлён'); setShowBanners(false); }
  };

  const currentBanner = PROFILE_BANNERS.find((b) => b.id === (user.banner_url || 'none'));
  const nickColor = user.nickname_color || '#0A0A0A';
  const bannerStyle = user.custom_banner_url
    ? { backgroundImage: `url(${user.custom_banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const roleBadge = (() => {
    if (user.role === 'admin') return <span className="role-admin"><Crown className="w-3 h-3" /> ADMIN</span>;
    if (user.role === 'moderator') return <span className="role-moderator"><Shield className="w-3 h-3" /> MOD</span>;
    if (user.role === 'support') return <span className="role-support"><Headphones className="w-3 h-3" /> SUPPORT</span>;
    return null;
  })();

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl overflow-hidden shadow-card"
      >
        <div
          className={`h-24 relative ${!user.custom_banner_url ? (currentBanner?.css || 'bg-gradient-to-br from-orange to-orange2') : ''}`}
          style={bannerStyle}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_65%)]" />
        </div>

        <div className="px-5 pb-5 -mt-12">
          <div className="flex items-end justify-between mb-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white overflow-hidden flex items-center justify-center">
                {user.avatar_url || user.photo_url ? (
                  <img src={user.avatar_url || user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-muted" strokeWidth={1.5} />
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center shadow-orange hover:bg-orangeDark transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </motion.button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex gap-1.5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptic('light'); setShowBanners(true); }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative ${
                  user.has_premium
                    ? 'bg-orange/10 border border-orange/30 text-orange hover:bg-orange/20'
                    : 'bg-bg2 border border-border text-muted hover:border-orange/30'
                }`}
              >
                <Palette className="w-4 h-4" />
                {!user.has_premium && (
                  <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-muted" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { haptic('light'); setShowSettings(true); }}
                className="w-9 h-9 rounded-xl bg-bg2 border border-border flex items-center justify-center text-muted hover:border-orange/40 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-2xl" style={{ color: nickColor }}>
              {user.nickname || user.first_name || 'Игрок'}
            </span>
            {roleBadge}
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="text-muted text-xs font-semibold">@{user.username ?? 'нет'}</div>
            {user.rank && <RankBadge rankId={user.rank} size="md" />}
          </div>

          {user.standoff_id ? (
            <div className="text-muted text-[11px] font-medium">
              🆔 Standoff ID: <span className="text-black font-bold">{user.standoff_id}</span>
            </div>
          ) : (
            <button
              onClick={() => { haptic('light'); setShowSettings(true); }}
              className="text-orange text-[11px] font-bold underline"
            >
              Указать Standoff ID →
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-3xl shadow-card overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="text-black font-black text-sm uppercase tracking-wide">Статистика</div>
          <div className="text-muted text-[11px] font-semibold">{stats.matches} матчей</div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-border">
          <StatCell label="К/Д" value={kd.toFixed(2)} />
          <StatCell label="Винрейт" value={`${winrate}%`} />
          <StatCell label="Победы" value={stats.wins} />
          <StatCell label="Поражения" value={stats.losses} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-2"
      >
        <QuickBlock icon={UsersIcon} label="Друзья" value={friendsCount} />
        <QuickBlock icon={Swords} label="Клан" value={clanName || '—'} small />
        <QuickBlock icon={Coins} label="Жетоны" value={user.tokens || 0} />
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => { haptic('medium'); setShowFullProfile(true); }}
        className="w-full bg-white border-2 border-border text-black font-black rounded-2xl py-4 flex items-center justify-center gap-2 hover:border-orange transition-colors"
      >
        <UserIcon className="w-4 h-4" />
        Подробный профиль
        <ChevronRight className="w-4 h-4" />
      </motion.button>

      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-sm text-orange font-semibold"
        >
          {msg}
        </motion.div>
      )}

      <AnimatePresence>
        {showFullProfile && (
          <FullProfileModal
            user={user}
            stats={stats}
            friendsCount={friendsCount}
            clanName={clanName}
            onClose={() => setShowFullProfile(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBanners && (
          <Modal
            onClose={() => setShowBanners(false)}
            title={user.has_premium ? 'Фон профиля' : 'Фон профиля — Premium'}
          >
            {!user.has_premium && (
              <div className="p-5 border-b border-border">
                <div className="bg-orange/10 border border-orange/30 rounded-xl p-4 text-center">
                  <Lock className="w-6 h-6 text-orange mx-auto mb-2" />
                  <div className="text-black font-bold text-sm mb-1">Только с Premium</div>
                  <p className="text-muted text-xs leading-relaxed">
                    Смена фона доступна только с подпиской. Оформи у @HePastic
                  </p>
                </div>
              </div>
            )}

            {user.has_premium && (
              <div className="p-5 border-b border-border">
                <div className="text-black font-bold text-sm mb-3">Своё фото</div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-orange/30"
                    style={user.custom_banner_url ? { backgroundImage: `url(${user.custom_banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {!user.custom_banner_url && (
                      <ImageIcon className="w-8 h-8 text-white/70" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => customBannerRef.current?.click()}
                      disabled={saving}
                      className="w-full bg-orange text-white font-bold rounded-xl py-2.5 text-xs disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Загрузить фото
                    </button>
                    <div className="text-muted text-[10px] mt-1.5 text-center">
                      {BANNER_PRICE} 💰 · 5 МБ
                    </div>
                  </div>
                </div>
                <input ref={customBannerRef} type="file" accept="image/*" className="hidden" onChange={handleCustomBannerUpload} />
              </div>
            )}

            <div className="p-5">
              <div className="text-black font-bold text-sm mb-3">Готовые фоны</div>
              <div className="grid grid-cols-3 gap-2">
                {PROFILE_BANNERS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => pickBanner(b.id)}
                    disabled={!user.has_premium}
                    className={`relative rounded-xl h-16 ${b.css} border-2 transition-all disabled:opacity-40 ${
                      !user.custom_banner_url && (user.banner_url || 'none') === b.id ? 'border-orange' : 'border-transparent'
                    }`}
                  >
                    {!user.custom_banner_url && (user.banner_url || 'none') === b.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <Modal onClose={() => setShowSettings(false)} title="Настройки">
            <div className="p-5 space-y-2">
              {!user.standoff_id && (
                <div className="bg-orange/10 border border-orange/30 rounded-xl p-4">
                  <div className="text-orange text-xs font-bold mb-2">Standoff ID обязателен</div>
                  <input
                    value={standoffId}
                    onChange={(e) => setStandoffId(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345678"
                    className="w-full bg-white border border-border rounded-xl px-3 py-2 text-black text-sm mb-2"
                  />
                  <button onClick={saveStandoffId} className="w-full bg-orange text-white font-bold rounded-xl py-2 text-xs">
                    Сохранить ID
                  </button>
                </div>
              )}

              <button
                onClick={() => { setShowSettings(false); setShowEditNick(true); }}
                className="w-full bg-bg2 border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="text-black font-bold text-sm">Изменить ник</div>
                <span className="text-muted text-xs">{canChangeNick() ? 'Доступно' : '24ч'}</span>
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditNick && (
          <Modal onClose={() => setShowEditNick(false)} title="Изменить ник">
            <div className="p-5">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Введи ник"
                maxLength={16}
                className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm mb-3"
              />
              <button
                onClick={saveNickname}
                disabled={saving || !canChangeNick()}
                className="w-full bg-orange text-white font-black rounded-xl py-3 text-sm disabled:opacity-40"
              >
                {saving ? 'Сохраняем...' : canChangeNick() ? 'Сохранить' : 'Доступно раз в 24 часа'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== ПОДРОБНЫЙ ПРОФИЛЬ =====
function FullProfileModal({ user, stats, friendsCount, clanName, onClose }: any) {
  const [matches, setMatches] = useState<any[]>([]);
  const [lastMatchStats, setLastMatchStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'done')
        .order('id', { ascending: false })
        .limit(20);
      setMatches(data || []);

      const lastMatch = (data || [])[0];
      if (lastMatch) {
        const { data: ms } = await supabase
          .from('match_stats')
          .select('*')
          .eq('match_id', lastMatch.id);
        setLastMatchStats(ms || []);
      }

      setLoading(false);
    })();
  }, [user.user_id]);

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths) : stats.kills;

  let winstreak = 0;
  for (const m of matches) {
    if (m.winner_id === user.user_id) winstreak++;
    else break;
  }

  const recent10 = matches.slice(0, 10).reverse();
  const lastMatch = matches[0];
  const myLastStat = lastMatchStats.find((s: any) => s.user_id === user.user_id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white overflow-y-auto"
    >
      <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center gap-3 z-10">
        <button onClick={onClose} className="p-2 rounded-xl bg-bg2">
          <X className="w-4 h-4 text-black" />
        </button>
        <div className="text-black font-black">Подробный профиль</div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* К/Д + Winstreak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="bg-card border border-border rounded-3xl p-5 text-center shadow-card">
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">К/Д</div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="text-black font-black text-4xl"
            >
              {kd.toFixed(2)}
            </motion.div>
          </div>
          <div className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-5 text-center shadow-orange">
            <div className="text-white/80 text-[10px] uppercase tracking-widest font-bold mb-2">Winstreak</div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="text-white font-black text-4xl"
            >
              {winstreak}
            </motion.div>
          </div>
        </motion.div>

        {/* Последний матч с фото */}
        {lastMatch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-3xl overflow-hidden shadow-card"
          >
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold p-5 pb-3">
              Последняя игра
            </div>

            {/* Фото карты */}
            <div className="relative h-40 bg-gradient-to-br from-orange to-orange2">
              {lastMatch.photo_url && (
                <img src={lastMatch.photo_url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div>
                  <div className="text-white font-black text-lg">
                    {lastMatch.map || 'Карта'}
                  </div>
                  <div className="text-white/80 text-[10px] font-bold">
                    CT {lastMatch.score_ct ?? '?'} : {lastMatch.score_t ?? '?'} T
                  </div>
                </div>
                {myLastStat?.mvp && (
                  <div className="bg-white text-orange text-[10px] font-black px-2 py-1 rounded-md">
                    ⭐ MVP
                  </div>
                )}
              </div>
            </div>

            {/* Мои статы в последнем матче */}
            {myLastStat && !myLastStat.not_present && (
              <div className="p-4 grid grid-cols-3 divide-x divide-border">
                <StatMiniBig label="Убийств" value={myLastStat.kills} />
                <StatMiniBig label="Смертей" value={myLastStat.deaths} />
                <StatMiniBig label="Ассистов" value={myLastStat.assists} />
              </div>
            )}

            {myLastStat?.not_present && (
              <div className="p-4 text-center text-muted text-xs">
                Тебя не было в этом матче
              </div>
            )}
          </motion.div>
        )}

        {/* Диаграмма */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-3xl p-5 shadow-card"
        >
          <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-4">
            Последние матчи
          </div>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" />
            </div>
          ) : recent10.length === 0 ? (
            <div className="text-center text-muted text-xs py-6">Пока нет матчей</div>
          ) : (
            <div className="flex items-end justify-center gap-2 h-28">
              {recent10.map((m, i) => {
                const win = m.winner_id === user.user_id;
                return (
                  <motion.div
                    key={m.id || i}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: win ? 80 : 40, opacity: 1 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                    className={`w-8 rounded-t-lg ${win ? 'bg-gradient-to-t from-orange to-orange2' : 'bg-bg3'}`}
                  />
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-orange to-orange2" />
              <span className="text-muted font-bold">Победа</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-bg3" />
              <span className="text-muted font-bold">Поражение</span>
            </div>
          </div>
        </motion.div>

        {/* Информация */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-3xl p-5 space-y-3 shadow-card"
        >
          <Row label="Ник" value={user.nickname || user.first_name || 'Игрок'} />
          <Row label="Standoff ID" value={user.standoff_id || '—'} />
          <Row label="Клан" value={clanName || 'Не в клане'} />
          <Row label="Друзья" value={friendsCount} />
          <Row label="Матчей" value={stats.matches} />
          <Row label="Побед" value={stats.wins} />
          <Row label="Поражений" value={stats.losses} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatMiniBig({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-black font-black text-xl">{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-bold mt-0.5">
        {label}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-black font-bold">{value}</span>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white p-5 border-b border-border flex items-center justify-between z-10">
          <div className="text-black font-black text-base">{title}</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center">
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="py-4 text-center">
      <div className="text-black font-black text-lg">{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-widest font-bold mt-0.5">{label}</div>
    </div>
  );
}

function QuickBlock({ icon: Icon, label, value, small }: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 shadow-card">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-orange" />
        <div className="text-muted text-[9px] uppercase tracking-wider font-bold">{label}</div>
      </div>
      <div className={`text-black font-black ${small ? 'text-xs' : 'text-base'} truncate`}>{value}</div>
    </div>
  );
}
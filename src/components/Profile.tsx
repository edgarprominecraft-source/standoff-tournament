import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Palette, User as UserIcon, AlertTriangle, Camera, Check, X,
  Crown, Shield, Headphones, Users as UsersIcon, Settings as SettingsIcon,
  Eye, EyeOff, Moon, Sun, Target, Zap, Heart, Swords, ChevronRight,
  Trophy, UserPlus, MessageCircle, Calendar,
} from 'lucide-react';
import { supabase, type User } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import {
  NICK_COLORS, AVATAR_FRAMES, PROFILE_BANNERS,
  updateProfile, uploadAvatar,
} from '../lib/profile';
import RankBadge from './RankBadge';

type Props = {
  user: User;
  setUser: (u: User) => void;
};

export default function Profile({ user, setUser }: Props) {
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [standoffId, setStandoffId] = useState(user.standoff_id ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditNick, setShowEditNick] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [stats, setStats] = useState({ matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0 });
  const [friendsCount, setFriendsCount] = useState(0);
  const [clanName, setClanName] = useState<string | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      // Стата
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
          assists: 0,
        });
      }

      // Друзья
      const { count: fCount } = await supabase
        .from('friends')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.user_id);
      setFriendsCount(fCount || 0);

      // Клан
      if (user.clan_id) {
        const { data: c } = await supabase
          .from('clans')
          .select('name, tag')
          .eq('id', user.clan_id)
          .maybeSingle();
        if (c) setClanName(`${c.name} [${c.tag}]`);
      }

      // Последние матчи
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .or(`team1_id.eq.${user.user_id},team2_id.eq.${user.user_id}`)
        .eq('status', 'done')
        .order('id', { ascending: false })
        .limit(5);
      setRecentMatches(matches || []);
    })();
  }, [user.user_id, user.clan_id]);

  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths) : stats.kills;
  const kpr = stats.matches > 0 ? (stats.kills / stats.matches) : 0;
  const dpr = stats.matches > 0 ? (stats.deaths / stats.matches) : 0;
  const winrate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

  const canChangeNick = () => {
    if (!user.last_nick_change) return true;
    const diff = Date.now() - new Date(user.last_nick_change).getTime();
    return diff > 24 * 60 * 60 * 1000;
  };

  const saveNickname = async () => {
    if (!nickname.trim() || nickname.length < 3) { hapticError(); setMsg('Ник минимум 3 символа'); return; }
    if (!canChangeNick()) { hapticError(); setMsg('Ник можно менять раз в 24 часа'); return; }
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
    if (!standoffId.trim() || standoffId.length < 5) { hapticError(); setMsg('Введи корректный Standoff ID'); return; }
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

  const pickColor = async (color: string) => {
    haptic('light');
    const { data } = await updateProfile(user.user_id, { nickname_color: color });
    if (data) { hapticSuccess(); setUser(data as User); }
  };

  const pickFrame = async (frameId: string) => {
    haptic('light');
    const { data } = await updateProfile(user.user_id, { avatar_frame: frameId });
    if (data) { hapticSuccess(); setUser(data as User); }
  };

  const pickBanner = async (bannerId: string) => {
    haptic('light');
    const { data } = await updateProfile(user.user_id, { banner_url: bannerId });
    if (data) { hapticSuccess(); setUser(data as User); }
  };

  const toggleHidden = async () => {
    haptic('light');
    const { data } = await updateProfile(user.user_id, { hide_profile: !user.hide_profile });
    if (data) { hapticSuccess(); setUser(data as User); }
  };

  const toggleTheme = async () => {
    haptic('light');
    const newTheme = user.theme === 'dark' ? 'light' : 'dark';
    const { data } = await updateProfile(user.user_id, { theme: newTheme });
    if (data) { hapticSuccess(); setUser(data as User); }
  };

  const currentFrame = AVATAR_FRAMES.find((f) => f.id === (user.avatar_frame || 'none'));
  const currentBanner = PROFILE_BANNERS.find((b) => b.id === (user.banner_url || 'none'));
  const nickColor = user.nickname_color || '#0A0A0A';

  const roleBadge = (() => {
    if (user.role === 'admin') return <span className="role-admin"><Crown className="w-3 h-3" /> ADMIN</span>;
    if (user.role === 'moderator') return <span className="role-moderator"><Shield className="w-3 h-3" /> MOD</span>;
    if (user.role === 'support') return <span className="role-support"><Headphones className="w-3 h-3" /> SUPPORT</span>;
    return null;
  })();

  return (
    <div className="space-y-4">
      {/* ===== ШАПКА ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl overflow-hidden shadow-card"
      >
        <div className={`h-28 ${currentBanner?.css || 'bg-gradient-to-br from-orange to-orange2'} relative`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_65%)]" />
        </div>

        <div className="px-5 pb-5 -mt-14">
          <div className="flex items-end justify-between mb-3">
            <div className="relative">
              <div className={`w-28 h-28 rounded-full bg-white border-4 border-white overflow-hidden flex items-center justify-center ${currentFrame?.style || ''}`}>
                {user.avatar_url || user.photo_url ? (
                  <img src={user.avatar_url || user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-muted" strokeWidth={1.5} />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-orange text-white flex items-center justify-center shadow-orange hover:bg-orangeDark transition-colors border-2 border-white"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => { haptic('light'); setShowCustomize(true); }}
                className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/30 flex items-center justify-center text-orange hover:bg-orange/20 transition-colors"
              >
                <Palette className="w-4 h-4" />
              </button>
              <button
                onClick={() => { haptic('light'); setShowSettings(true); }}
                className="w-10 h-10 rounded-xl bg-bg2 border border-border flex items-center justify-center text-muted hover:border-orange/40 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
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

      {/* ===== БОЛЬШАЯ СТАТИСТИКА ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-3xl p-5 shadow-card"
      >
        <div className="flex items-center gap-2 mb-5">
          <Target className="w-4 h-4 text-orange" />
          <div className="text-black font-black text-sm uppercase tracking-wide">Статистика</div>
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted text-[10px] font-bold">{stats.matches} матчей</span>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <BigCircle label="К/Д" value={kd.toFixed(2)} percent={Math.min(100, kd * 33)} color="#FF6B00" />
          <BigCircle label="КПР" value={kpr.toFixed(1)} percent={Math.min(100, kpr * 10)} color="#34C759" />
          <BigCircle label="ДПР" value={dpr.toFixed(1)} percent={Math.min(100, dpr * 10)} color="#EF4444" />
          <BigCircle label="WIN" value={winrate + '%'} percent={winrate} color="#8B5CF6" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <BigStat label="Матчи" value={stats.matches} />
          <BigStat label="Победы" value={stats.wins} color="text-success" />
          <BigStat label="Поражения" value={stats.losses} color="text-danger" />
        </div>
      </motion.div>

      {/* ===== БЫСТРЫЕ БЛОКИ ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <QuickBlock
          icon={UsersIcon}
          label="Друзья"
          value={friendsCount}
          color="bg-blue-500/10 text-blue-500"
        />
        <QuickBlock
          icon={Swords}
          label="Клан"
          value={clanName || 'Нет'}
          small
          color="bg-purple-500/10 text-purple-500"
        />
        <QuickBlock
          icon={Trophy}
          label="Турниры"
          value={0}
          color="bg-orange/10 text-orange"
        />
        <QuickBlock
          icon={Coins}
          label="Жетоны"
          value={user.tokens || 0}
          color="bg-yellow-500/10 text-yellow-600"
        />
      </motion.div>

      {/* ===== КНОПКА ПОДРОБНЕЕ ===== */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        onClick={() => { haptic('medium'); setShowFullProfile(true); }}
        className="w-full bg-gradient-to-br from-orange to-orange2 text-white font-black rounded-2xl py-4 flex items-center justify-center gap-2 shadow-orange"
      >
        <UserIcon className="w-4 h-4" />
        Подробный профиль
        <ChevronRight className="w-4 h-4" />
      </motion.button>

      {msg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-sm text-orange font-semibold"
        >
          {msg}
        </motion.div>
      )}

      {/* ===== МОДАЛКИ ===== */}
      <AnimatePresence>
        {showFullProfile && (
          <FullProfileModal
            user={user}
            stats={stats}
            recentMatches={recentMatches}
            friendsCount={friendsCount}
            clanName={clanName}
            onClose={() => setShowFullProfile(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCustomize && (
          <Modal onClose={() => setShowCustomize(false)} title="Кастомизация">
            <div className="p-5 border-b border-border">
              <div className="text-black font-bold mb-3 text-sm">Фон профиля</div>
              <div className="grid grid-cols-3 gap-2">
                {PROFILE_BANNERS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => pickBanner(b.id)}
                    className={`relative rounded-xl h-16 ${b.css} border-2 transition-all ${
                      (user.banner_url || 'none') === b.id ? 'border-orange' : 'border-transparent'
                    }`}
                  >
                    {(user.banner_url || 'none') === b.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 border-b border-border">
              <div className="text-black font-bold mb-3 text-sm">Цвет ника</div>
              <div className="grid grid-cols-5 gap-2">
                {NICK_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickColor(c.value)}
                    className={`relative h-12 rounded-xl border-2 transition-all ${
                      nickColor === c.value ? 'border-orange' : 'border-border'
                    }`}
                    style={{ background: c.value === 'rainbow' ? 'linear-gradient(90deg,#ff0000,#ffa500,#ffff00,#00ff00,#0000ff,#8b00ff)' : c.value }}
                  >
                    {nickColor === c.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white drop-shadow-md" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="text-black font-bold mb-3 text-sm">Рамка аватара</div>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_FRAMES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => pickFrame(f.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                      (user.avatar_frame || 'none') === f.id ? 'border-orange bg-orange/5' : 'border-border'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-bg2 ${f.style}`} />
                    <span className="text-[10px] font-bold text-black">{f.name}</span>
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
                  <button
                    onClick={saveStandoffId}
                    className="w-full bg-orange text-white font-bold rounded-xl py-2 text-xs"
                  >
                    Сохранить ID
                  </button>
                </div>
              )}

              <button
                onClick={toggleHidden}
                className="w-full bg-bg2 border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 text-black font-bold text-sm">
                  {user.hide_profile ? <EyeOff className="w-4 h-4 text-orange" /> : <Eye className="w-4 h-4" />}
                  {user.hide_profile ? 'Профиль скрыт' : 'Профиль открыт'}
                </div>
              </button>

              <button
                onClick={toggleTheme}
                className="w-full bg-bg2 border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 text-black font-bold text-sm">
                  {user.theme === 'dark' ? <Moon className="w-4 h-4 text-orange" /> : <Sun className="w-4 h-4" />}
                  Тема: {user.theme === 'dark' ? 'Тёмная' : 'Светлая'}
                </div>
              </button>

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
function FullProfileModal({
  user, stats, recentMatches, friendsCount, clanName, onClose,
}: any) {
  const [tab, setTab] = useState<'info' | 'matches' | 'friends'>('info');

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
        {/* Инфо */}
        {tab === 'info' && (
          <>
            <div className="bg-card border border-border rounded-3xl p-5">
              <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                О себе
              </div>
              <p className="text-black text-sm">
                Здесь будет описание профиля. Скоро добавим.
              </p>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5">
              <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                Клан
              </div>
              <div className="text-black text-sm font-bold">
                {clanName || 'Не в клане'}
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5">
              <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
                Друзья
              </div>
              <div className="text-black text-sm font-bold">{friendsCount} друзей</div>
            </div>
          </>
        )}

        {/* Матчи */}
        {tab === 'matches' && (
          <div className="space-y-2">
            {recentMatches.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted text-sm">
                Пока нет матчей
              </div>
            ) : (
              recentMatches.map((m: any) => (
                <div key={m.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-black text-sm font-bold">Матч #{m.id}</div>
                  <div className="text-muted text-xs">{m.map || 'без карты'}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Друзья */}
        {tab === 'friends' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted text-sm">
            Друзья: {friendsCount}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border grid grid-cols-3 z-20">
        <button
          onClick={() => setTab('info')}
          className={`py-4 text-xs font-bold ${tab === 'info' ? 'text-orange' : 'text-muted'}`}
        >
          Инфо
        </button>
        <button
          onClick={() => setTab('matches')}
          className={`py-4 text-xs font-bold ${tab === 'matches' ? 'text-orange' : 'text-muted'}`}
        >
          Матчи
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`py-4 text-xs font-bold ${tab === 'friends' ? 'text-orange' : 'text-muted'}`}
        >
          Друзья
        </button>
      </div>
    </motion.div>
  );
}

// ===== УТИЛИТЫ =====

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
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function BigCircle({ label, value, percent, color }: any) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[82px] h-[82px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 82 82">
          <circle cx="41" cy="41" r={radius} fill="none" stroke="#EFEFEF" strokeWidth="7" />
          <circle
            cx="41" cy="41" r={radius} fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - dash}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-black font-black text-lg leading-none">{value}</div>
        </div>
      </div>
      <div className="text-muted text-[10px] uppercase tracking-wider font-bold mt-2">
        {label}
      </div>
    </div>
  );
}

function BigStat({ label, value, color = 'text-black' }: any) {
  return (
    <div className="bg-bg2 rounded-2xl p-3 text-center">
      <div className={`font-black text-xl ${color}`}>{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-bold">{label}</div>
    </div>
  );
}

function QuickBlock({ icon: Icon, label, value, color, small }: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-muted text-[10px] uppercase tracking-wider font-bold">{label}</div>
      <div className={`text-black font-black ${small ? 'text-xs' : 'text-lg'} mt-0.5 truncate`}>
        {value}
      </div>
    </div>
  );
}
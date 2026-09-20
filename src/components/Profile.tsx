import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Palette, User as UserIcon, AlertTriangle, Camera, Check, X,
  Crown, Shield, Headphones, Users as UsersIcon, Settings as SettingsIcon,
  Eye, EyeOff, Moon, Sun, Target, Zap, Heart,
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
  const [stats, setStats] = useState({ matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Загружаем статистику
  useState(() => {
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
          assists: 0,
        });
      }
    })();
  });

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
      {/* Шапка профиля */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl overflow-hidden shadow-card"
      >
        <div className={`h-24 ${currentBanner?.css || 'bg-gradient-to-br from-orange to-orange2'} relative`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_65%)]" />
        </div>

        <div className="px-5 pb-5 -mt-12">
          <div className="flex items-end justify-between mb-3">
            <div className="relative">
              <div className={`w-24 h-24 rounded-full bg-white border-4 border-white overflow-hidden flex items-center justify-center ${currentFrame?.style || ''}`}>
                {user.avatar_url || user.photo_url ? (
                  <img src={user.avatar_url || user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-muted" strokeWidth={1.5} />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center shadow-orange hover:bg-orangeDark transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => { haptic('light'); setShowCustomize(true); }}
                className="w-9 h-9 rounded-xl bg-orange/10 border border-orange/30 flex items-center justify-center text-orange hover:bg-orange/20 transition-colors"
                title="Оформить"
              >
                <Palette className="w-4 h-4" />
              </button>
              <button
                onClick={() => { haptic('light'); setShowSettings(true); }}
                className="w-9 h-9 rounded-xl bg-bg2 border border-border flex items-center justify-center text-muted hover:border-orange/40 transition-colors"
                title="Настройки"
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

          {user.standoff_id && (
            <div className="text-muted text-[11px] font-medium">
              🆔 Standoff ID: <span className="text-black font-bold">{user.standoff_id}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Кружки со статистикой */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-3xl p-5 shadow-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-orange" />
          <div className="text-black font-black text-sm uppercase tracking-wide">Статистика</div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <StatCircle label="К/Д" value={kd.toFixed(2)} percent={Math.min(100, kd * 33)} color="#FF6B00" icon={Target} />
          <StatCircle label="КПР" value={kpr.toFixed(1)} percent={Math.min(100, kpr * 10)} color="#34C759" icon={Zap} />
          <StatCircle label="ДПР" value={dpr.toFixed(1)} percent={Math.min(100, dpr * 10)} color="#EF4444" icon={Heart} />
          <StatCircle label="Винрейт" value={winrate + '%'} percent={winrate} color="#8B5CF6" icon={Crown} />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
          <MiniStat label="Матчи" value={stats.matches} />
          <MiniStat label="Победы" value={stats.wins} color="text-success" />
          <MiniStat label="Поражения" value={stats.losses} color="text-danger" />
        </div>
      </motion.div>

      {msg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-sm text-orange font-semibold"
        >
          {msg}
        </motion.div>
      )}

      {!user.standoff_id && (
        <div className="bg-card border-2 border-orange/40 rounded-2xl p-5 shadow-orange/20">
          <div className="text-black font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange" />
            Standoff ID обязателен
          </div>
          <p className="text-muted text-xs mb-3">
            Без Standoff ID ты не сможешь участвовать в турнирах.
          </p>
          <input
            value={standoffId}
            onChange={(e) => setStandoffId(e.target.value.replace(/\D/g, ''))}
            placeholder="Например: 12345678"
            className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm mb-3 focus:border-orange transition-colors"
          />
          <button
            onClick={saveStandoffId}
            disabled={saving}
            className="w-full bg-orange text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50 shadow-orange hover:bg-orangeDark transition-colors"
          >
            {saving ? 'Сохранение...' : 'Привязать Standoff ID'}
          </button>
        </div>
      )}

      {/* Модалка кастомизации */}
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

      {/* Модалка настроек */}
      <AnimatePresence>
        {showSettings && (
          <Modal onClose={() => setShowSettings(false)} title="Настройки">
            <div className="p-5 space-y-2">
              <button
                onClick={toggleHidden}
                className="w-full bg-bg2 border border-border rounded-xl p-4 flex items-center justify-between hover:border-orange/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-black font-bold text-sm">
                  {user.hide_profile ? <EyeOff className="w-4 h-4 text-orange" /> : <Eye className="w-4 h-4" />}
                  {user.hide_profile ? 'Профиль скрыт' : 'Профиль открыт'}
                </div>
                <span className="text-muted text-xs">
                  {user.hide_profile ? 'Показать' : 'Скрыть'}
                </span>
              </button>

              <button
                onClick={toggleTheme}
                className="w-full bg-bg2 border border-border rounded-xl p-4 flex items-center justify-between hover:border-orange/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-black font-bold text-sm">
                  {user.theme === 'dark' ? <Moon className="w-4 h-4 text-orange" /> : <Sun className="w-4 h-4" />}
                  Тема: {user.theme === 'dark' ? 'Тёмная' : 'Светлая'}
                </div>
                <span className="text-muted text-xs">Переключить</span>
              </button>

              <button
                onClick={() => { setShowSettings(false); setShowEditNick(true); }}
                className="w-full bg-bg2 border border-border rounded-xl p-4 flex items-center justify-between hover:border-orange/40 transition-colors"
              >
                <div className="text-black font-bold text-sm">Изменить ник</div>
                <span className="text-muted text-xs">
                  {canChangeNick() ? 'Доступно' : '24ч'}
                </span>
              </button>

              <button
                onClick={() => { setShowSettings(false); setShowCustomize(true); }}
                className="w-full bg-bg2 border border-border rounded-xl p-4 flex items-center justify-between hover:border-orange/40 transition-colors"
              >
                <div className="text-black font-bold text-sm">Кастомизация</div>
                <span className="text-muted text-xs">Открыть</span>
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Модалка изменения ника */}
      <AnimatePresence>
        {showEditNick && (
          <Modal onClose={() => setShowEditNick(false)} title="Изменить ник">
            <div className="p-5">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Введи ник"
                maxLength={16}
                className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm mb-3 focus:border-orange transition-colors"
              />
              <button
                onClick={saveNickname}
                disabled={saving || !canChangeNick()}
                className="w-full bg-orange text-white font-black rounded-xl py-3 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors"
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

// ===== Утилиты =====

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
            className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center hover:bg-bg3 transition-colors"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function StatCircle({ label, value, percent, color, icon: Icon }: any) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[68px] h-[68px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r={radius} fill="none" stroke="#EFEFEF" strokeWidth="6" />
          <circle
            cx="34" cy="34" r={radius} fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - dash}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-black font-black text-sm leading-none">{value}</div>
        </div>
      </div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-bold mt-2 flex items-center gap-0.5">
        <Icon className="w-2.5 h-2.5" style={{ color }} />
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = 'text-black' }: any) {
  return (
    <div className="bg-bg2 rounded-xl p-2.5 text-center">
      <div className={`font-black text-base ${color}`}>{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-bold">{label}</div>
    </div>
  );
}
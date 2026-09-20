import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Palette, Sparkles, User as UserIcon, AlertTriangle,
  Camera, Upload, Check, X, Crown, Shield, Headphones,
} from 'lucide-react';
import { supabase, type User } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import {
  NICK_COLORS, AVATAR_FRAMES, PROFILE_BANNERS,
  updateProfile, uploadAvatar,
} from '../lib/profile';

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
  const fileRef = useRef<HTMLInputElement>(null);

  const canChangeNick = () => {
    if (!user.last_nick_change) return true;
    const diff = Date.now() - new Date(user.last_nick_change).getTime();
    return diff > 24 * 60 * 60 * 1000;
  };

  const saveNickname = async () => {
    if (!nickname.trim() || nickname.length < 3) {
      hapticError(); setMsg('Ник минимум 3 символа'); return;
    }
    if (!canChangeNick()) {
      hapticError(); setMsg('Ник можно менять раз в 24 часа'); return;
    }
    setSaving(true);
    const { data, error } = await updateProfile(user.user_id, {
      nickname: nickname.trim(),
      last_nick_change: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { hapticError(); setMsg(error.message); }
    else { hapticSuccess(); setUser(data as User); setMsg('Ник обновлён'); }
  };

  const saveStandoffId = async () => {
    if (!standoffId.trim() || standoffId.length < 5) {
      hapticError(); setMsg('Введи корректный Standoff ID'); return;
    }
    setSaving(true);
    const { data, error } = await updateProfile(user.user_id, { standoff_id: standoffId.trim() });
    setSaving(false);
    if (error) { hapticError(); setMsg(error.message); }
    else { hapticSuccess(); setUser(data as User); setMsg('Standoff ID сохранён'); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      hapticError(); setMsg('Файл больше 5MB'); return;
    }
    haptic('medium');
    setSaving(true);
    const url = await uploadAvatar(user.user_id, file);
    if (!url) {
      setSaving(false); hapticError(); setMsg('Ошибка загрузки'); return;
    }
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
      {/* Шапка профиля с баннером */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-card"
      >
        <div className={`h-24 ${currentBanner?.css || 'bg-gradient-to-br from-bg2 to-bg3'} relative`} />

        <div className="px-5 pb-5 -mt-10">
          <div className="flex items-end justify-between mb-3">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full bg-white border-4 border-white overflow-hidden flex items-center justify-center ${currentFrame?.style || ''}`}>
                {user.avatar_url || user.photo_url ? (
                  <img src={user.avatar_url || user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8 text-muted" strokeWidth={1.5} />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange text-white flex items-center justify-center shadow-orange hover:bg-orangeDark transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <button
              onClick={() => { haptic('light'); setShowCustomize(true); }}
              className="bg-orange/10 border border-orange/30 text-orange text-xs font-bold rounded-xl px-3 py-2 flex items-center gap-1.5 hover:bg-orange/20 transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
              Оформить
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-xl" style={{ color: nickColor }}>
              {user.nickname || user.first_name || 'Игрок'}
            </span>
            {roleBadge}
          </div>
          <div className="text-muted text-xs mb-3">@{user.username ?? 'нет'}</div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatBox label="Баланс" value={user.balance || 0} accent="orange" />
            <StatBox label="Побед" value={user.wins || 0} accent="success" />
            <StatBox label="Поражений" value={user.losses || 0} accent="danger" />
          </div>
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

      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-black font-bold mb-3">Никнейм</div>
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
          className="w-full bg-orange text-white font-bold rounded-xl py-3 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors"
        >
          {canChangeNick() ? 'Сохранить ник' : 'Доступно раз в 24 часа'}
        </button>
      </div>

      {/* Модалка кастомизации */}
      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setShowCustomize(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white p-5 border-b border-border flex items-center justify-between z-10">
                <div className="text-black font-black text-base">Кастомизация</div>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center hover:bg-bg3 transition-colors"
                >
                  <X className="w-4 h-4 text-black" />
                </button>
              </div>

              {/* Фоны профиля */}
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
                      <div className="absolute bottom-1 left-1 text-[9px] text-white font-bold bg-black/40 rounded px-1.5 py-0.5">
                        {b.price === 0 ? 'FREE' : `${b.price}💰`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Цвет ника */}
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

              {/* Рамки */}
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
                      <span className="text-[9px] text-muted">{f.price === 0 ? 'FREE' : `${f.price}💰`}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  const colors: any = {
    orange: 'text-orange',
    success: 'text-success',
    danger: 'text-danger',
  };
  return (
    <div className="bg-bg2 rounded-xl p-2.5 text-center">
      <div className={`font-black text-lg ${colors[accent]}`}>{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}
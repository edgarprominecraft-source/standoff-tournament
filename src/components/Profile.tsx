import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Palette, Sparkles, User as UserIcon, AlertTriangle } from 'lucide-react';
import { supabase, type User } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';

type Props = {
  user: User;
  setUser: (u: User) => void;
};

export default function Profile({ user, setUser }: Props) {
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [standoffId, setStandoffId] = useState(user.standoff_id ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canChangeNick = () => {
    if (!user.last_nick_change) return true;
    const diff = Date.now() - new Date(user.last_nick_change).getTime();
    return diff > 24 * 60 * 60 * 1000;
  };

  const saveNickname = async () => {
    if (!nickname.trim() || nickname.length < 3) {
      hapticError();
      setMsg('Ник минимум 3 символа');
      return;
    }
    if (!canChangeNick()) {
      hapticError();
      setMsg('Ник можно менять раз в 24 часа');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('users')
      .update({
        nickname: nickname.trim(),
        last_nick_change: new Date().toISOString(),
      })
      .eq('user_id', user.user_id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      hapticError();
      setMsg(error.message);
    } else {
      hapticSuccess();
      setUser(data as User);
      setMsg('Ник обновлён');
    }
  };

  const saveStandoffId = async () => {
    if (!standoffId.trim() || standoffId.length < 5) {
      hapticError();
      setMsg('Введи корректный Standoff ID');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('users')
      .update({ standoff_id: standoffId.trim() })
      .eq('user_id', user.user_id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      hapticError();
      setMsg(error.message);
    } else {
      hapticSuccess();
      setUser(data as User);
      setMsg('Standoff ID сохранён');
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-card2 border border-border flex items-center justify-center overflow-hidden">
          {user.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-7 h-7 text-muted" strokeWidth={1.5} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-lg truncate">
            {user.nickname || user.first_name || 'Игрок'}
          </div>
          <div className="text-muted text-xs truncate">@{user.username ?? 'нет'}</div>
          <div className="text-white mt-1.5 text-sm flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" />
            <span className="text-muted">Баланс:</span>
            <span className="font-bold">{user.balance}</span>
          </div>
        </div>
      </motion.div>

      {msg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card2 border border-border rounded-xl p-3 text-sm text-white"
        >
          {msg}
        </motion.div>
      )}

      {!user.standoff_id && (
        <div className="bg-card border border-yellow-500/40 rounded-2xl p-5">
          <div className="text-white font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Standoff ID обязателен
          </div>
          <p className="text-muted text-xs mb-3">
            Без Standoff ID ты не сможешь участвовать в турнирах. Тебя выкинет из сетки.
          </p>
          <input
            value={standoffId}
            onChange={(e) => setStandoffId(e.target.value.replace(/\D/g, ''))}
            placeholder="Например: 12345678"
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm mb-3 focus:border-white/50 transition-colors"
          />
          <button
            onClick={saveStandoffId}
            disabled={saving}
            className="w-full bg-white text-black font-bold rounded-xl py-3 text-sm disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Привязать Standoff ID'}
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-white font-bold mb-3">Никнейм</div>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Введи ник"
          maxLength={16}
          className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm mb-3 focus:border-white/50 transition-colors"
        />
        <button
          onClick={saveNickname}
          disabled={saving || !canChangeNick()}
          className="w-full bg-white text-black font-bold rounded-xl py-3 text-sm disabled:opacity-40"
        >
          {canChangeNick() ? 'Сохранить ник' : 'Доступно раз в 24 часа'}
        </button>
        <p className="text-muted text-[10px] mt-2">
          Ник можно менять раз в 24 часа. Смена бесплатна.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-white font-bold mb-3">Кастомизация</div>
        <div className="space-y-2">
          <button
            onClick={() => haptic('light')}
            className="w-full text-left bg-bg border border-border rounded-xl px-4 py-3 text-sm text-muted flex items-center justify-between hover:border-white/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-white">
              <Palette className="w-4 h-4" />
              Фон профиля
            </span>
            <span className="text-white flex items-center gap-1">
              1000 <Coins className="w-3 h-3" />
            </span>
          </button>
          <button
            onClick={() => haptic('light')}
            className="w-full text-left bg-bg border border-border rounded-xl px-4 py-3 text-sm text-muted flex items-center justify-between hover:border-white/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-white">
              <Sparkles className="w-4 h-4" />
              Цветной ник
            </span>
            <span className="text-white flex items-center gap-1">
              500 <Coins className="w-3 h-3" />
            </span>
          </button>
        </div>
        <p className="text-muted text-[10px] mt-3">
          Валюта начисляется за участие в турнирах. Даже за проигрыш.
        </p>
      </div>
    </div>
  );
}
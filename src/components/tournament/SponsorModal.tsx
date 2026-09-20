import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, Check, Loader2, AlertCircle,
  ShieldCheck, PartyPopper,
} from 'lucide-react';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import { checkSubscription, type SubscriptionResult } from '../../lib/subscription';
import { supabase, type User } from '../../supabase';

export type Sponsor = {
  id: number;
  name: string;
  channel_username: string;
  channel_link: string;
};

type Props = {
  user: User;
  telegramId: number | null; // ID из Telegram (для проверки подписки)
  sponsors: Sponsor[];
  onAllSubscribed: () => void;
  onClose: () => void;
};

export default function SponsorModal({
  user,
  telegramId,
  sponsors,
  onAllSubscribed,
  onClose,
}: Props) {
  const [results, setResults] = useState<Record<number, SubscriptionResult | null>>({});
  const [checking, setChecking] = useState<Record<number, boolean>>({});
  const [sponsorNames, setSponsorNames] = useState<Record<number, string>>({});
  const [allDone, setAllDone] = useState(false);

  // Инициализация
  useEffect(() => {
    const init: Record<number, SubscriptionResult | null> = {};
    sponsors.forEach((s) => (init[s.id] = null));
    setResults(init);

    // Первая проверка сразу
    if (telegramId) {
      sponsors.forEach((s) => checkOne(s));
    }
  }, [telegramId]);

  // Проверяем периодически (каждые 3 сек)
  useEffect(() => {
    if (!telegramId) return;
    const interval = setInterval(() => {
      sponsors.forEach((s) => {
        if (!results[s.id]?.subscribed) checkOne(s, true);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [telegramId, sponsors, results]);

  // Если все подписаны — вызываем callback
  useEffect(() => {
    if (!telegramId) return;
    const allSubscribed = sponsors.every((s) => results[s.id]?.subscribed);
    if (allSubscribed && sponsors.length > 0 && !allDone) {
      setAllDone(true);
      hapticSuccess();
    }
  }, [results, sponsors, telegramId, allDone]);

  const checkOne = async (s: Sponsor, silent = false) => {
    if (!telegramId) return;
    if (!silent) setChecking((prev) => ({ ...prev, [s.id]: true }));
    const res = await checkSubscription(telegramId, s.channel_username);
    setResults((prev) => ({ ...prev, [s.id]: res }));
    if (!silent) setChecking((prev) => ({ ...prev, [s.id]: false }));
  };

  const openChannel = async (s: Sponsor) => {
    haptic('light');
    // Логируем клик
    await supabase.from('user_actions').insert({
      user_id: user.user_id,
      action: 'sponsor_click',
      payload: { sponsor_id: s.id, sponsor_name: s.name },
    });
    window.open(s.channel_link, '_blank');
    // Через 2 сек проверим
    setTimeout(() => checkOne(s), 2000);
  };

  const allSubscribed = sponsors.every((s) => results[s.id]?.subscribed);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl overflow-hidden"
      >
        {/* Заголовок */}
        <div className="relative p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <div className="text-white font-black text-base tracking-tight">
                  Подписка на спонсоров
                </div>
                <div className="text-muted text-[11px]">
                  {sponsors.length} {sponsors.length === 1 ? 'канал' : 'канала'}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 border border-border flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>

          {/* Прогресс */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-muted uppercase tracking-widest mb-1.5">
              <span>Подписано</span>
              <span>
                {sponsors.filter((s) => results[s.id]?.subscribed).length} / {sponsors.length}
              </span>
            </div>
            <div className="h-1.5 bg-bg rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    (sponsors.filter((s) => results[s.id]?.subscribed).length /
                      sponsors.length) *
                    100
                  }%`,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="h-full bg-white"
              />
            </div>
          </div>
        </div>

        {/* Список спонсоров */}
        <div className="p-5 space-y-2 max-h-[50vh] overflow-y-auto">
          {!telegramId && (
            <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-300 leading-relaxed">
                Открой приложение <b>через Telegram-бота</b>, чтобы участвовать в турнирах.
                В браузере проверка подписки не работает.
              </div>
            </div>
          )}

          {sponsors.map((s, idx) => {
            const res = results[s.id];
            const isChecking = checking[s.id];
            const isSubscribed = res?.subscribed;

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-bg border rounded-2xl p-4 transition-colors ${
                  isSubscribed ? 'border-white/50' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSubscribed
                        ? 'bg-white text-black'
                        : 'bg-white/5 border border-border text-muted'
                    }`}
                  >
                    {isSubscribed ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : isChecking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span className="font-bold text-sm">{s.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm truncate">{s.name}</div>
                    <div className="text-muted text-[10px] truncate">{s.channel_username}</div>
                  </div>
                </div>

                <button
                  onClick={() => openChannel(s)}
                  disabled={isSubscribed}
                  className={`w-full font-bold rounded-xl py-3 text-xs flex items-center justify-center gap-2 transition-all ${
                    isSubscribed
                      ? 'bg-white/10 text-white/60 cursor-default'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Подписан
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      Подписаться
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Нижняя панель */}
        <div className="p-5 border-t border-border">
          <AnimatePresence mode="wait">
            {allSubscribed ? (
              <motion.button
                key="ready"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => {
                  hapticSuccess();
                  onAllSubscribed();
                }}
                className="w-full bg-white text-black font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 shadow-glowStrong"
              >
                <PartyPopper className="w-4 h-4" />
                Я в деле — участвовать
              </motion.button>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full bg-white/5 border border-border text-muted rounded-2xl py-4 text-sm flex items-center justify-center gap-2 font-semibold"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Подпишись на всех спонсоров
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-muted text-[10px] text-center mt-3 leading-relaxed">
            Подписка проверяется автоматически. Отписка = вылет из турнира.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
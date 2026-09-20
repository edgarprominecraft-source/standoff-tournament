import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type User } from './supabase';
import { initTelegram, getTelegramUser, haptic } from './lib/telegram';
import Profile from './components/Profile';
import Tournament from './components/Tournament';
import Rating from './components/Rating';
import Info from './components/Info';

type Tab = 'profile' | 'tournament' | 'rating' | 'info';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Аккаунт', icon: '👤' },
  { id: 'tournament', label: 'Турнир', icon: '🏆' },
  { id: 'rating', label: 'Рейтинг', icon: '📊' },
  { id: 'info', label: 'Инфо', icon: 'ℹ️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initTelegram();
    const tgUser = getTelegramUser();

    if (!tgUser) {
      setError('Открой через Telegram');
      setLoading(false);
      return;
    }

    (async () => {
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', tgUser.id)
        .maybeSingle();

      if (existing) {
        setUser(existing as User);
        setLoading(false);
        return;
      }

      const { data: created, error: insErr } = await supabase
        .from('users')
        .insert({
          user_id: tgUser.id,
          username: tgUser.username ?? null,
          first_name: tgUser.first_name ?? null,
          photo_url: tgUser.photo_url ?? null,
          balance: 0,
        })
        .select()
        .single();

      if (insErr) {
        setError(insErr.message);
      } else {
        setUser(created as User);
      }
      setLoading(false);
    })();
  }, []);

  const switchTab = (t: Tab) => {
    haptic('light');
    setTab(t);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-muted">Загрузка...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6 text-center">
        <div>
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white mb-2">Ошибка</div>
          <div className="text-muted text-sm">{error ?? 'Не удалось загрузить профиль'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="px-4 py-4 border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <h1 className="text-lg font-bold tracking-wide text-white">
          STANDOFF <span className="text-muted">TOURNAMENT</span>
        </h1>
      </header>

      <main className="px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'profile' && <Profile user={user} setUser={setUser} />}
            {tab === 'tournament' && <Tournament user={user} />}
            {tab === 'rating' && <Rating />}
            {tab === 'info' && <Info />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20">
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`py-3 flex flex-col items-center gap-1 transition-colors ${
                tab === t.id ? 'text-white' : 'text-muted'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-[10px] uppercase tracking-wide">{t.label}</span>
              {tab === t.id && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute top-0 h-[2px] w-8 bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
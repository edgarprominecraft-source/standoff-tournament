import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Trophy, BarChart3, Info as InfoIcon } from 'lucide-react';
import { supabase, type User } from './supabase';
import { initTelegram, getTelegramUser, haptic } from './lib/telegram';
import Profile from './components/Profile';
import Tournament from './components/Tournament';
import Rating from './components/Rating';
import Info from './components/Info';

type Tab = 'profile' | 'tournament' | 'rating' | 'info';

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: 'profile', label: 'Аккаунт', Icon: UserIcon },
  { id: 'tournament', label: 'Турнир', Icon: Trophy },
  { id: 'rating', label: 'Рейтинг', Icon: BarChart3 },
  { id: 'info', label: 'Инфо', Icon: InfoIcon },
];

const STORAGE_KEY = 'standoff_user_id';

function getAnonymousId(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return parseInt(stored, 10);
  const id = 9000000000 + Math.floor(Math.random() * 999999999);
  localStorage.setItem(STORAGE_KEY, String(id));
  return id;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needRegister, setNeedRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [standoffId, setStandoffId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initTelegram();
    const tgUser = getTelegramUser();

    (async () => {
      let userId: number;
      if (tgUser) {
        userId = tgUser.id;
        const { data: existing } = await supabase
          .from('users').select('*').eq('user_id', userId).maybeSingle();
        if (existing) { setUser(existing as User); setLoading(false); return; }
        const { data: created, error: insErr } = await supabase
          .from('users')
          .insert({
            user_id: userId,
            username: tgUser.username ?? null,
            first_name: tgUser.first_name ?? null,
            photo_url: tgUser.photo_url ?? null,
            balance: 0,
          })
          .select().single();
        if (insErr) setError(insErr.message);
        else setUser(created as User);
        setLoading(false);
        return;
      }

      userId = getAnonymousId();
      const { data: existing } = await supabase
        .from('users').select('*').eq('user_id', userId).maybeSingle();
      if (existing) setUser(existing as User);
      else setNeedRegister(true);
      setLoading(false);
    })();
  }, []);

  const submitRegistration = async () => {
    if (!nickname.trim() || nickname.length < 3) { setError('Ник минимум 3 символа'); return; }
    if (!standoffId.trim() || standoffId.length < 5) { setError('Введи корректный Standoff ID'); return; }
    setRegistering(true);
    setError(null);
    const userId = getAnonymousId();
    const { data: created, error: insErr } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        nickname: nickname.trim(),
        standoff_id: standoffId.trim(),
        first_name: nickname.trim(),
        balance: 0,
        last_nick_change: new Date().toISOString(),
      })
      .select().single();
    setRegistering(false);
    if (insErr) setError(insErr.message);
    else { setUser(created as User); setNeedRegister(false); }
  };

  const switchTab = (t: Tab) => { haptic('light'); setTab(t); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <div className="text-muted text-xs uppercase tracking-widest">Загрузка</div>
        </div>
      </div>
    );
  }

  if (needRegister) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-white font-black text-2xl tracking-tight">STANDOFF CUP</h1>
            <p className="text-muted text-xs mt-1 uppercase tracking-[0.3em]">Регистрация</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div>
              <label className="text-muted text-[10px] uppercase tracking-widest block mb-1.5">Твой ник</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Например: Pastic"
                maxLength={16}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-white/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-muted text-[10px] uppercase tracking-widest block mb-1.5">Standoff ID</label>
              <input
                value={standoffId}
                onChange={(e) => setStandoffId(e.target.value.replace(/\D/g, ''))}
                placeholder="Например: 12345678"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-white/50 transition-colors"
              />
              <p className="text-muted text-[10px] mt-1.5">Найди в Standoff 2 → Профиль → ID</p>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-xs text-red-400">{error}</div>
            )}
            <button
              onClick={submitRegistration}
              disabled={registering}
              className="w-full bg-white text-black font-bold rounded-xl py-3 text-sm disabled:opacity-40"
            >
              {registering ? 'Создаём...' : 'Войти'}
            </button>
          </div>
          <p className="text-muted text-[10px] text-center mt-4">ID хранится только в этом браузере</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6 text-center">
        <div>
          <div className="text-white mb-2 text-lg">Ошибка</div>
          <div className="text-muted text-sm">{error ?? 'Не удалось загрузить профиль'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="px-4 py-4 border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-10">
        <h1 className="text-lg font-black tracking-wider text-white">
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
              className={`py-3 flex flex-col items-center gap-1 transition-colors relative ${
                tab === t.id ? 'text-white' : 'text-muted'
              }`}
            >
              <t.Icon className="w-5 h-5" strokeWidth={tab === t.id ? 2.5 : 2} />
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
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Users, Building2, BarChart3, Info as InfoIcon, Crown, Ban } from 'lucide-react';
import { supabase, type User } from './supabase';
import { initTelegram, getTelegramUser, haptic } from './lib/telegram';
import { isAdmin } from './lib/admin';
import Profile from './components/Profile';
import Clan from './components/Clan';
import Rating from './components/Rating';
import Info from './components/Info';
import OrganizerPage from './components/OrganizerPage';
import AdminPanel from './components/admin/AdminPanel';
import Notifications from './components/Notifications';
import HalloweenBackground from './components/HalloweenBackground';
import HalloweenAudio from './components/HalloweenAudio';

type Tab = 'profile' | 'clan' | 'organizers' | 'rating' | 'info';

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: 'profile', label: 'Аккаунт', Icon: UserIcon },
  { id: 'clan', label: 'Клан', Icon: Users },
  { id: 'organizers', label: 'Орг', Icon: Building2 },
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
  const [admin, setAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    initTelegram();
    const tgUser = getTelegramUser();

    (async () => {
      let userId: number;
      if (tgUser) {
        userId = tgUser.id;
        const { data: existing } = await supabase
          .from('users').select('*').eq('user_id', userId).maybeSingle();
        if (existing) {
          // Синхронизируем username если изменился
          if (tgUser.username && existing.username !== tgUser.username) {
            await supabase.from('users').update({ username: tgUser.username }).eq('user_id', userId);
            existing.username = tgUser.username;
          }
          setUser(existing as User);
          setAdmin(await isAdmin(userId));
          setLoading(false);
          return;
        }
        const { data: created, error: insErr } = await supabase
          .from('users')
          .insert({
            user_id: userId,
            username: tgUser.username ?? null,
            first_name: tgUser.first_name ?? null,
            photo_url: tgUser.photo_url ?? null,
            balance: 0,
            tokens: 10,
            trust_score: 100,
            last_seen: new Date().toISOString(),
          })
          .select().single();
        if (insErr) setError(insErr.message);
        else {
          setUser(created as User);
          setAdmin(await isAdmin(userId));
        }
        setLoading(false);
        return;
      }
      userId = getAnonymousId();
      const { data: existing } = await supabase
        .from('users').select('*').eq('user_id', userId).maybeSingle();
      if (existing) {
        setUser(existing as User);
        setAdmin(await isAdmin(userId));
      } else setNeedRegister(true);
      setLoading(false);
    })();
  }, []);

  // Обновление last_seen раз в минуту
  useEffect(() => {
    if (!user || user.banned) return;
    const update = () => {
      supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('user_id', user.user_id).then(() => {});
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [user]);

  const submitRegistration = async () => {
    if (!nickname.trim() || nickname.length < 3) { setError('Ник минимум 3 символа'); return; }
    if (!standoffId.trim() || standoffId.length < 5) { setError('Введи корректный Standoff ID'); return; }
    setRegistering(true); setError(null);
    const userId = getAnonymousId();
    const { data: created, error: insErr } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        nickname: nickname.trim(),
        standoff_id: standoffId.trim(),
        first_name: nickname.trim(),
        balance: 0,
        tokens: 10,
        trust_score: 100,
        last_nick_change: new Date().toISOString(),
        last_seen: new Date().toISOString(),
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
          <div className="w-10 h-10 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
          <div className="text-muted text-xs uppercase tracking-widest">Загрузка</div>
        </div>
      </div>
    );
  }

  // ===== ЭКРАН РЕГИСТРАЦИИ =====
  if (needRegister) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 bg-pattern">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="Standoff Cup" className="w-24 h-24 mx-auto mb-3" />
            <h1 className="text-black font-black text-2xl tracking-tight">STANDOFF CUP</h1>
            <p className="text-muted text-xs mt-1 uppercase tracking-[0.3em]">Регистрация</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-card">
            <div>
              <label className="text-muted text-[10px] uppercase tracking-widest block mb-1.5">Твой ник</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Например: Pastic"
                maxLength={16}
                className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm focus:border-orange transition-colors"
              />
            </div>
            <div>
              <label className="text-muted text-[10px] uppercase tracking-widest block mb-1.5">Standoff ID</label>
              <input
                value={standoffId}
                onChange={(e) => setStandoffId(e.target.value.replace(/\D/g, ''))}
                placeholder="Например: 12345678"
                className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm focus:border-orange transition-colors"
              />
            </div>
            {error && (
              <div className="bg-danger/10 border border-danger/40 rounded-xl p-3 text-xs text-danger">{error}</div>
            )}
            <button
              onClick={submitRegistration}
              disabled={registering}
              className="w-full bg-orange text-white font-bold rounded-xl py-3 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors"
            >
              {registering ? 'Создаём...' : 'Войти'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6 text-center">
        <div>
          <div className="text-black mb-2 text-lg font-bold">Ошибка</div>
          <div className="text-muted text-sm">{error ?? 'Не удалось загрузить профиль'}</div>
        </div>
      </div>
    );
  }

  // ===== ЭКРАН БАНА =====
  if (user.banned) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-3xl bg-danger/10 border-2 border-danger/40 flex items-center justify-center">
              <Ban className="w-12 h-12 text-danger" strokeWidth={2} />
            </div>
          </div>

          <h1 className="text-danger font-black text-2xl mb-2 uppercase tracking-wider">
            Аккаунт заблокирован
          </h1>

          <div className="bg-card border border-border rounded-2xl p-5 mt-6 text-left">
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">
              Причина
            </div>
            <div className="text-black font-bold text-sm">
              {user.ban_reason || 'Причина не указана'}
            </div>
          </div>

          <div className="bg-orange/10 border border-orange/30 rounded-xl p-4 mt-4">
            <p className="text-muted text-xs leading-relaxed">
              Ты забанен и не можешь пользоваться сайтом. Оспорить бан можно в поддержке:{' '}
              <a
                href="https://t.me/HePastic"
                target="_blank"
                rel="noreferrer"
                className="text-orange font-bold hover:underline"
              >
                @HePastic
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== ОСНОВНОЕ ПРИЛОЖЕНИЕ =====
  return (
    <div className="min-h-screen bg-transparent relative">
      <HalloweenBackground />
      <HalloweenAudio />
      <div className="relative z-10">
      <header className="px-4 py-3 border-b border-border sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Standoff Cup" className="w-9 h-9" />
          <h1 className="text-base font-black tracking-wider text-black flex-1">
            STANDOFF <span className="text-orange">CUP</span>
          </h1>

          <Notifications user={user} />

          {admin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { haptic('medium'); setShowAdmin(true); }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center shadow-orange"
            >
              <Crown className="w-4 h-4 text-white" />
            </motion.button>
          )}
        </div>
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
            {tab === 'clan' && <Clan user={user} />}
            {tab === 'organizers' && <OrganizerPage user={user} />}
            {tab === 'rating' && <Rating />}
            {tab === 'info' && <Info />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`py-3 flex flex-col items-center gap-0.5 transition-colors relative ${
                tab === t.id ? 'text-orange' : 'text-muted'
              }`}
            >
              <t.Icon className="w-5 h-5" strokeWidth={tab === t.id ? 2.5 : 2} />
              <span className="text-[8px] uppercase tracking-wide font-semibold">{t.label}</span>
              {tab === t.id && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute top-0 h-[3px] w-8 bg-orange rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {showAdmin && admin && (
          <AdminPanel admin={user} onClose={() => setShowAdmin(false)} />
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
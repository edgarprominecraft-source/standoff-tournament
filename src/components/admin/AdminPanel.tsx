import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Trophy, Swords, Shield, Coins, Bell, Ban, Check,
  Crown, Search, Send, AlertTriangle, TrendingUp, Lock,
} from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import {
  getAdminStats, searchUsers, getRecentUsers, banUser, unbanUser,
  giveCoins, setUserRole, getAllTournamentsAdmin, finishTournament,
  deleteTournament, sendNotificationToAll, sendNotificationToUser,
} from '../../lib/admin';

type Props = {
  admin: User;
  onClose: () => void;
};

type Tab = 'stats' | 'users' | 'tournaments' | 'notify';

export default function AdminPanel({ admin, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('stats');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Шапка */}
        <div className="bg-gradient-to-br from-orange to-orange2 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur border border-white/40 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-base">Админ-панель</div>
              <div className="text-white/80 text-[10px] uppercase tracking-widest font-bold">
                {admin.nickname || admin.first_name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Табы */}
        <div className="grid grid-cols-4 border-b border-border">
          <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')} icon={TrendingUp} label="Стата" />
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={Users} label="Игроки" />
          <TabBtn active={tab === 'tournaments'} onClick={() => setTab('tournaments')} icon={Trophy} label="Турниры" />
          <TabBtn active={tab === 'notify'} onClick={() => setTab('notify')} icon={Bell} label="Рассылка" />
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'stats' && <StatsTab />}
          {tab === 'users' && <UsersTab admin={admin} />}
          {tab === 'tournaments' && <TournamentsTab />}
          {tab === 'notify' && <NotifyTab />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`py-3 flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
        active ? 'text-orange border-b-2 border-orange' : 'text-muted border-b-2 border-transparent'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ===== СТАТИСТИКА =====
function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getAdminStats();
      setStats(s);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return <div className="text-center text-muted text-sm py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-3">
      <StatRow icon={Users} label="Игроков" value={stats.users} color="bg-blue-500/10 text-blue-600" />
      <StatRow icon={Trophy} label="Турниров" value={stats.tournaments} color="bg-orange/10 text-orange" />
      <StatRow icon={Swords} label="Матчей" value={stats.matches} color="bg-purple-500/10 text-purple-600" />
      <StatRow icon={Shield} label="Кланов" value={stats.clans} color="bg-green-500/10 text-green-600" />
      <StatRow icon={Users} label="Команд в турнирах" value={stats.teams} color="bg-pink-500/10 text-pink-600" />
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold">{label}</div>
        <div className="text-black font-black text-2xl">{value}</div>
      </div>
    </div>
  );
}

// ===== ИГРОКИ =====
function UsersTab({ admin }: { admin: User }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = query.trim() ? await searchUsers(query) : await getRecentUsers(20);
      setUsers(data);
      setLoading(false);
    })();
  }, [query]);

  if (selected) {
    return (
      <UserDetail
        user={selected}
        admin={admin}
        onBack={() => { setSelected(null); setQuery(query); }}
        onUpdate={() => setQuery(query + ' ')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: ник, username, standoff_id"
          className="w-full bg-bg2 border border-border rounded-xl pl-10 pr-4 py-3 text-black text-sm focus:border-orange"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted text-sm py-8">Загрузка...</div>
      ) : users.length === 0 ? (
        <div className="text-center text-muted text-sm py-8">Никого не найдено</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <button
              key={u.user_id}
              onClick={() => setSelected(u)}
              className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-orange/40 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-bg2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {u.avatar_url || u.photo_url ? (
                  <img src={u.avatar_url || u.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-black text-sm font-bold truncate">
                  {u.nickname || u.first_name || 'Игрок'}
                </div>
                <div className="text-muted text-[10px]">
                  ID: {u.user_id} · @{u.username || '—'}
                </div>
              </div>
              {u.banned && (
                <span className="text-[10px] bg-danger/10 text-danger border border-danger/30 rounded px-2 py-0.5 font-bold">
                  БАН
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ДЕТАЛИ ИГРОКА =====
function UserDetail({ user: u, admin, onBack, onUpdate }: any) {
  const [msg, setMsg] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [notifText, setNotifText] = useState('');

  const doBan = async () => {
    if (!banReason.trim()) { hapticError(); setMsg('Укажи причину'); return; }
    await banUser(u.user_id, banReason.trim());
    hapticSuccess(); setMsg('Забанен'); onUpdate();
  };

  const doUnban = async () => {
    await unbanUser(u.user_id);
    hapticSuccess(); setMsg('Разбанен'); onUpdate();
  };

  const doCoins = async () => {
    const n = parseInt(coinAmount);
    if (!n || isNaN(n)) { hapticError(); setMsg('Введи число'); return; }
    await giveCoins(u.user_id, n);
    hapticSuccess(); setMsg(`Баланс изменён на ${n >= 0 ? '+' : ''}${n}`); onUpdate();
  };

  const doRole = async (role: string | null) => {
    await setUserRole(u.user_id, role);
    hapticSuccess(); setMsg(`Роль: ${role || 'снята'}`); onUpdate();
  };

  const doNotify = async () => {
    if (!notifText.trim()) { hapticError(); setMsg('Введи текст'); return; }
    await sendNotificationToUser(u.user_id, 'Сообщение от админа', notifText.trim());
    hapticSuccess(); setMsg('Уведомление отправлено'); setNotifText('');
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-orange text-xs font-bold">← Назад</button>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full bg-bg2 border border-border flex items-center justify-center overflow-hidden">
            {u.avatar_url || u.photo_url ? (
              <img src={u.avatar_url || u.photo_url || ''} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-6 h-6 text-muted" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-black font-black text-base">
              {u.nickname || u.first_name || 'Игрок'}
            </div>
            <div className="text-muted text-[11px]">
              @{u.username || '—'} · ID {u.user_id}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <DetailRow label="Standoff ID" value={u.standoff_id || '—'} />
          <DetailRow label="Баланс" value={`${u.balance || 0} 💰`} />
          <DetailRow label="Роль" value={u.role || '—'} />
          <DetailRow label="Статус" value={u.banned ? '🚫 Забанен' : '✅ Активен'} />
          <DetailRow label="Клан ID" value={u.clan_id || '—'} />
        </div>
      </div>

      {/* Роли */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Роли</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => doRole('admin')} className="bg-purple-500/10 border border-purple-500/30 text-purple-600 rounded-lg px-3 py-1.5 text-xs font-bold">ADMIN</button>
          <button onClick={() => doRole('moderator')} className="bg-blue-500/10 border border-blue-500/30 text-blue-600 rounded-lg px-3 py-1.5 text-xs font-bold">MOD</button>
          <button onClick={() => doRole('support')} className="bg-green-500/10 border border-green-500/30 text-green-600 rounded-lg px-3 py-1.5 text-xs font-bold">SUPPORT</button>
          <button onClick={() => doRole(null)} className="bg-bg2 border border-border text-muted rounded-lg px-3 py-1.5 text-xs font-bold">Снять</button>
        </div>
      </div>

      {/* Монеты */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Монеты</div>
        <div className="flex gap-2">
          <input
            value={coinAmount}
            onChange={(e) => setCoinAmount(e.target.value)}
            placeholder="Например: 1000 или -500"
            className="flex-1 bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm"
          />
          <button onClick={doCoins} className="bg-orange text-white rounded-xl px-4 font-bold text-xs">OK</button>
        </div>
      </div>

      {/* Уведомление */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Личное сообщение</div>
        <textarea
          value={notifText}
          onChange={(e) => setNotifText(e.target.value)}
          placeholder="Текст для игрока..."
          rows={2}
          className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm resize-none mb-2"
        />
        <button onClick={doNotify} className="w-full bg-orange text-white rounded-xl py-2 font-bold text-xs flex items-center justify-center gap-1">
          <Send className="w-3 h-3" /> Отправить
        </button>
      </div>

      {/* Бан */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Бан</div>
        {u.banned ? (
          <button onClick={doUnban} className="w-full bg-green-500 text-white rounded-xl py-2 font-bold text-xs">Разбанить</button>
        ) : (
          <div className="space-y-2">
            <input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Причина"
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm"
            />
            <button onClick={doBan} className="w-full bg-danger text-white rounded-xl py-2 font-bold text-xs flex items-center justify-center gap-1">
              <Ban className="w-3 h-3" /> Забанить
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-xs text-orange font-bold text-center">
          {msg}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-black font-bold">{value}</span>
    </div>
  );
}

// ===== ТУРНИРЫ =====
function TournamentsTab() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await getAllTournamentsAdmin();
    setTournaments(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doFinish = async (id: number) => {
    if (!confirm('Закончить турнир?')) return;
    await finishTournament(id);
    hapticSuccess();
    load();
  };

  const doDelete = async (id: number) => {
    if (!confirm('Удалить турнир? Это необратимо.')) return;
    await deleteTournament(id);
    hapticSuccess();
    load();
  };

  if (loading) return <div className="text-center text-muted text-sm py-8">Загрузка...</div>;

  return (
    <div className="space-y-2">
      {tournaments.length === 0 ? (
        <div className="text-center text-muted text-sm py-8">Турниров нет</div>
      ) : (
        tournaments.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-black font-bold text-sm truncate">{t.name}</div>
                <div className="text-muted text-[10px]">
                  {t.organizers?.name || 'Без орг.'} · {t.max_teams} команд · {t.prize_gold || 0} G
                </div>
              </div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                t.status === 'waiting' ? 'border-orange/40 text-orange' :
                t.status === 'active' ? 'border-green-500/40 text-green-600' :
                'border-border text-muted'
              }`}>
                {t.status}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {t.status === 'active' && (
                <button onClick={() => doFinish(t.id)} className="flex-1 bg-green-500/10 border border-green-500/30 text-green-600 rounded-lg py-2 text-xs font-bold">
                  Закончить
                </button>
              )}
              <button onClick={() => doDelete(t.id)} className="flex-1 bg-danger/10 border border-danger/30 text-danger rounded-lg py-2 text-xs font-bold">
                Удалить
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ===== РАССЫЛКА =====
function NotifyTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) { hapticError(); setMsg('Заполни оба поля'); return; }
    setSending(true);
    const res = await sendNotificationToAll(title.trim(), body.trim());
    setSending(false);
    if (res.error) { setMsg('Ошибка: ' + res.error); }
    else { hapticSuccess(); setMsg('Рассылка отправлена всем'); setTitle(''); setBody(''); }
  };

  return (
    <div className="space-y-3">
      <div className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-xs text-orange font-bold flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Отправится ВСЕМ игрокам
      </div>

      <div>
        <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Заголовок</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Новый турнир!"
          maxLength={60}
          className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm"
        />
      </div>

      <div>
        <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Текст</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Текст рассылки..."
          rows={4}
          maxLength={500}
          className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm resize-none"
        />
      </div>

      <button
        onClick={send}
        disabled={sending}
        className="w-full bg-orange text-white font-black rounded-xl py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? 'Отправляем...' : 'Отправить всем'}
      </button>

      {msg && (
        <div className="bg-card border border-border rounded-xl p-3 text-xs text-black font-bold text-center">
          {msg}
        </div>
      )}
    </div>
  );
}
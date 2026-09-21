import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, Trophy, Swords, Shield, Coins, Bell, Ban, Check,
  Crown, Search, Send, AlertTriangle, TrendingUp, ClipboardList,
  Building2, Plus, Upload, Trash2, Camera, Play, Pause,
} from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import {
  getAdminStats, searchUsers, getRecentUsers, banUser, unbanUser,
  giveCoins, setUserRole, setPremium, setRank,
  getAllTournamentsAdmin, createTournament, finishTournament,
  activateTournament, deleteTournament,
  getAllOrganizersAdmin, createOrganizer, updateOrganizer, deleteOrganizer,
  uploadOrganizerLogo, sendNotificationToAll, sendNotificationToUser,
} from '../../lib/admin';
import ResultInput from './ResultInput';

type Props = {
  admin: User;
  onClose: () => void;
};

type Tab = 'stats' | 'users' | 'organizers' | 'tournaments' | 'results' | 'notify';

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
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
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
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="grid grid-cols-6 border-b border-border">
          <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')} icon={TrendingUp} label="Стата" />
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={Users} label="Игроки" />
          <TabBtn active={tab === 'organizers'} onClick={() => setTab('organizers')} icon={Building2} label="Орг" />
          <TabBtn active={tab === 'tournaments'} onClick={() => setTab('tournaments')} icon={Trophy} label="Турниры" />
          <TabBtn active={tab === 'results'} onClick={() => setTab('results')} icon={ClipboardList} label="Матчи" />
          <TabBtn active={tab === 'notify'} onClick={() => setTab('notify')} icon={Bell} label="Рассылка" />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'stats' && <StatsTab />}
          {tab === 'users' && <UsersTab admin={admin} />}
          {tab === 'organizers' && <OrganizersTab />}
          {tab === 'tournaments' && <TournamentsTab />}
          {tab === 'results' && <ResultInput />}
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
      className={`py-3 flex flex-col items-center gap-1 text-[9px] font-bold uppercase tracking-wide transition-colors ${
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

  if (loading || !stats) return <div className="text-center text-muted text-sm py-8">Загрузка...</div>;

  return (
    <div className="space-y-3">
      <StatRow icon={Users} label="Игроков" value={stats.users} color="bg-blue-500/10 text-blue-600" />
      <StatRow icon={Building2} label="Организаторов" value={stats.organizers} color="bg-purple-500/10 text-purple-600" />
      <StatRow icon={Trophy} label="Турниров" value={stats.tournaments} color="bg-orange/10 text-orange" />
      <StatRow icon={Swords} label="Матчей" value={stats.matches} color="bg-red-500/10 text-red-600" />
      <StatRow icon={Shield} label="Кланов" value={stats.clans} color="bg-green-500/10 text-green-600" />
      <StatRow icon={Users} label="Команд" value={stats.teams} color="bg-pink-500/10 text-pink-600" />
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold">{label}</div>
        <div className="text-black font-black text-2xl">{value}</div>
      </div>
    </motion.div>
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
              <div className="flex flex-col items-end gap-1">
                {u.banned && (
                  <span className="text-[10px] bg-danger/10 text-danger border border-danger/30 rounded px-2 py-0.5 font-bold">
                    БАН
                  </span>
                )}
                {u.has_premium && (
                  <span className="text-[10px] bg-orange/10 text-orange border border-orange/30 rounded px-2 py-0.5 font-bold">
                    ⭐ PREMIUM
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserDetail({ user: u, admin, onBack, onUpdate }: any) {
  const [msg, setMsg] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [notifText, setNotifText] = useState('');
  const [rankInput, setRankInput] = useState('');

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
    hapticSuccess(); setMsg(`Баланс ${n >= 0 ? '+' : ''}${n}`); onUpdate();
  };

  const doRole = async (role: string | null) => {
    await setUserRole(u.user_id, role);
    hapticSuccess(); setMsg(`Роль: ${role || 'снята'}`); onUpdate();
  };

  const doPremium = async (val: boolean) => {
    await setPremium(u.user_id, val);
    hapticSuccess(); setMsg(val ? '⭐ Premium выдан' : 'Premium снят'); onUpdate();
  };

  const doRank = async (rank: string | null) => {
    await setRank(u.user_id, rank);
    hapticSuccess(); setMsg(`Звание: ${rank || 'снято'}`); onUpdate();
  };

  const doNotify = async () => {
    if (!notifText.trim()) { hapticError(); setMsg('Введи текст'); return; }
    await sendNotificationToUser(u.user_id, 'Сообщение от админа', notifText.trim());
    hapticSuccess(); setMsg('Уведомление отправлено'); setNotifText('');
  };

  const ranks = [
    'bronze_1', 'bronze_2', 'bronze_3', 'bronze_4',
    'silver_1', 'silver_2', 'silver_3', 'silver_4',
    'gold_1', 'gold_2', 'gold_3', 'gold_4',
    'phoenix', 'ranger', 'champion', 'master', 'elite', 'legend'
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
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
            <div className="text-black font-black text-base">{u.nickname || u.first_name || 'Игрок'}</div>
            <div className="text-muted text-[11px]">@{u.username || '—'} · ID {u.user_id}</div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <DetailRow label="Standoff ID" value={u.standoff_id || '—'} />
          <DetailRow label="Баланс" value={`${u.balance || 0} 💰`} />
          <DetailRow label="Роль" value={u.role || '—'} />
          <DetailRow label="Premium" value={u.has_premium ? '⭐ Да' : '❌ Нет'} />
          <DetailRow label="Звание" value={u.rank || '—'} />
          <DetailRow label="K/D" value={`${u.kills || 0} / ${u.deaths || 0}`} />
          <DetailRow label="Статус" value={u.banned ? '🚫 Забанен' : '✅ Активен'} />
        </div>
      </div>

      {/* PREMIUM */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Premium</div>
        <div className="flex gap-2">
          <button onClick={() => doPremium(true)} className="flex-1 bg-gradient-to-br from-orange to-orange2 text-white rounded-lg py-2 text-xs font-bold">
            ⭐ Выдать
          </button>
          <button onClick={() => doPremium(false)} className="flex-1 bg-bg2 border border-border text-muted rounded-lg py-2 text-xs font-bold">
            Снять
          </button>
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

      {/* Звания */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Звание</div>
        <select
          value={rankInput || u.rank || ''}
          onChange={(e) => { setRankInput(e.target.value); doRank(e.target.value || null); }}
          className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-xs"
        >
          <option value="">— Не указано —</option>
          {ranks.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Монеты */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Монеты</div>
        <div className="flex gap-2">
          <input
            value={coinAmount}
            onChange={(e) => setCoinAmount(e.target.value)}
            placeholder="+1000 или -500"
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-xs text-orange font-bold text-center"
        >
          {msg}
        </motion.div>
      )}
    </motion.div>
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

// ===== ОРГАНИЗАТОРЫ =====
function OrganizersTab() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getAllOrganizersAdmin();
    setOrganizers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (showCreate) {
    return (
      <CreateOrganizerForm
        onBack={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    );
  }

  if (selectedOrg) {
    return (
      <OrgDetail
        org={selectedOrg}
        onBack={() => { setSelectedOrg(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowCreate(true)}
        className="w-full bg-orange text-white font-black rounded-2xl py-3.5 text-sm shadow-orange flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Добавить организатора
      </button>

      {loading ? (
        <div className="text-center text-muted text-sm py-8">Загрузка...</div>
      ) : organizers.length === 0 ? (
        <div className="bg-bg2 border border-dashed border-border2 rounded-xl p-6 text-center text-muted text-xs">
          Организаторов нет
        </div>
      ) : (
        organizers.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelectedOrg(o)}
            className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-orange/40 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
              {o.logo_url ? (
                <img src={o.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-black text-sm font-bold truncate">{o.name}</div>
              <div className="text-muted text-[10px]">[{o.tag || '—'}]</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

function CreateOrganizerForm({ onBack, onCreated }: any) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (name.trim().length < 2) { setError('Название минимум 2 символа'); return; }
    setSaving(true); setError(null);

    const res = await createOrganizer({
      name: name.trim(),
      tag: tag.trim().toUpperCase(),
      description: desc.trim(),
      logoUrl: null,
      ownerId: null,
    });

    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    hapticSuccess();
    onCreated();
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-orange text-xs font-bold">← Назад</button>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seven Tournament"
            className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm"
          />
        </div>
        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Тег</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="SEVEN"
            maxLength={6}
            className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm"
          />
        </div>
        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Описание</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Организация турниров по Standoff 2"
            rows={2}
            className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm resize-none"
          />
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-xs text-danger font-bold">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-orange text-white font-black rounded-xl py-3 text-sm disabled:opacity-50"
        >
          {saving ? 'Создаём...' : 'Создать организатора'}
        </button>
      </div>
    </div>
  );
}

function OrgDetail({ org, onBack }: { org: any; onBack: () => void }) {
  const [name, setName] = useState(org.name);
  const [tag, setTag] = useState(org.tag || '');
  const [desc, setDesc] = useState(org.description || '');
  const [logo, setLogo] = useState(org.logo_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { hapticError(); setMsg('Файл макс 3MB'); return; }

    setUploading(true);
    const url = await uploadOrganizerLogo(org.id, file);
    if (!url) { setUploading(false); hapticError(); setMsg('Ошибка загрузки'); return; }

    await updateOrganizer(org.id, { logo_url: url });
    setLogo(url);
    setUploading(false);
    hapticSuccess();
    setMsg('Логотип обновлён');
  };

  const save = async () => {
    setSaving(true);
    await updateOrganizer(org.id, {
      name: name.trim(),
      tag: tag.trim().toUpperCase(),
      description: desc.trim(),
    });
    setSaving(false);
    hapticSuccess();
    setMsg('Сохранено');
  };

  const remove = async () => {
    if (!confirm('Удалить организатора?')) return;
    await deleteOrganizer(org.id);
    hapticSuccess();
    onBack();
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-orange text-xs font-bold">← Назад</button>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden border-2 border-orange/30">
              {logo ? (
                <img src={logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-white" />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center shadow-orange border-2 border-white disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-black font-black text-lg">{name}</div>
            <div className="text-orange font-bold text-xs">[{tag || '—'}]</div>
            {uploading && <div className="text-muted text-[10px] mt-1">Загрузка логотипа...</div>}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm" />
          </div>
          <div>
            <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Тег</label>
            <input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 6))} maxLength={6} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm" />
          </div>
          <div>
            <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Описание</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-orange text-white rounded-xl py-2.5 font-bold text-xs disabled:opacity-50"
          >
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <button
            onClick={remove}
            className="bg-danger/10 border border-danger/30 text-danger rounded-xl py-2.5 px-3 font-bold text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Удалить
          </button>
        </div>

        {msg && (
          <div className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-xs text-orange font-bold text-center mt-3">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== ТУРНИРЫ =====
function TournamentsTab() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const [t, o] = await Promise.all([
      getAllTournamentsAdmin(),
      getAllOrganizersAdmin(),
    ]);
    setTournaments(t);
    setOrganizers(o);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doFinish = async (id: number) => {
    if (!confirm('Закончить турнир?')) return;
    await finishTournament(id);
    hapticSuccess();
    load();
  };

  const doActivate = async (id: number) => {
    if (!confirm('Запустить турнир?')) return;
    await activateTournament(id);
    hapticSuccess();
    load();
  };

  const doDelete = async (id: number) => {
    if (!confirm('Удалить турнир? Это необратимо.')) return;
    await deleteTournament(id);
    hapticSuccess();
    load();
  };

  if (showCreate) {
    return (
      <CreateTournamentForm
        organizers={organizers}
        onBack={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    );
  }

  if (loading) return <div className="text-center text-muted text-sm py-8">Загрузка...</div>;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowCreate(true)}
        className="w-full bg-orange text-white font-black rounded-2xl py-3.5 text-sm shadow-orange flex items-center justify-center gap-2 mb-3"
      >
        <Plus className="w-4 h-4" /> Создать турнир
      </button>

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
              {t.status === 'waiting' && (
                <button onClick={() => doActivate(t.id)} className="flex-1 bg-blue-500/10 border border-blue-500/30 text-blue-600 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1">
                  <Play className="w-3 h-3" /> Запустить
                </button>
              )}
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

function CreateTournamentForm({ organizers, onBack, onCreated }: any) {
  const [name, setName] = useState('');
  const [maxTeams, setMaxTeams] = useState('16');
  const [prizeGold, setPrizeGold] = useState('500');
  const [sponsorChannel, setSponsorChannel] = useState('');
  const [organizerId, setOrganizerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (name.trim().length < 3) { setError('Название минимум 3 символа'); return; }
    const mt = parseInt(maxTeams);
    const pg = parseInt(prizeGold);
    if (isNaN(mt) || mt < 2) { setError('Команд минимум 2'); return; }
    if (isNaN(pg) || pg < 0) { setError('Приз ≥ 0'); return; }

    setSaving(true); setError(null);

    const res = await createTournament({
      name: name.trim(),
      maxTeams: mt,
      prizeGold: pg,
      sponsorChannel: sponsorChannel.trim() || null,
      organizerId: organizerId ? parseInt(organizerId) : null,
    });

    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    hapticSuccess();
    onCreated();
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-orange text-xs font-bold">← Назад</button>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seven Cup #1" className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Команд</label>
            <input type="number" value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm" />
          </div>
          <div>
            <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Приз (G)</label>
            <input type="number" value={prizeGold} onChange={(e) => setPrizeGold(e.target.value)} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm" />
          </div>
        </div>

        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Спонсор (канал)</label>
          <input value={sponsorChannel} onChange={(e) => setSponsorChannel(e.target.value)} placeholder="@HePastic" className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm" />
        </div>

        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Организатор</label>
          <select value={organizerId} onChange={(e) => setOrganizerId(e.target.value)} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm">
            <option value="">— Без организатора —</option>
            {organizers.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-xs text-danger font-bold">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-orange text-white font-black rounded-xl py-3 text-sm disabled:opacity-50"
        >
          {saving ? 'Создаём...' : 'Создать турнир'}
        </button>
      </div>
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
    else { hapticSuccess(); setMsg('Рассылка отправлена'); setTitle(''); setBody(''); }
  };

  return (
    <div className="space-y-3">
      <div className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-xs text-orange font-bold flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Отправится ВСЕМ игрокам
      </div>

      <div>
        <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Заголовок</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Новый турнир!" maxLength={60} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm" />
      </div>

      <div>
        <label className="text-muted text-[10px] uppercase tracking-widest font-bold block mb-1">Текст</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Текст..." rows={4} maxLength={500} className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm resize-none" />
      </div>

      <button onClick={send} disabled={sending} className="w-full bg-orange text-white font-black rounded-xl py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
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
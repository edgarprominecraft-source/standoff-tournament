import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BarChart3, Trophy, Users, Link2, Building2, Swords,
  Coins, Award, Megaphone, Ban, ScrollText, FlaskConical,
  Settings as SettingsIcon, Loader2, Search, Trash2, Plus,
  Crown, CheckCircle2, XCircle, RefreshCw, Camera, Upload,
} from 'lucide-react';
import { supabase, type User, type Tournament, type Match, type Team } from '../../supabase';
import { haptic } from '../../lib/telegram';

type Section =
  | 'stats' | 'tournaments' | 'sponsors' | 'organizers'
  | 'matches' | 'users' | 'coins' | 'ranks' | 'broadcast'
  | 'words' | 'logs' | 'test' | 'settings';

const SECTIONS: { id: Section; label: string; Icon: any }[] = [
  { id: 'stats',       label: 'Статистика',   Icon: BarChart3 },
  { id: 'tournaments', label: 'Турниры',      Icon: Trophy },
  { id: 'sponsors',    label: 'Спонсоры',     Icon: Link2 },
  { id: 'organizers',  label: 'Организаторы', Icon: Building2 },
  { id: 'matches',     label: 'Матчи',        Icon: Swords },
  { id: 'users',       label: 'Игроки',       Icon: Users },
  { id: 'coins',       label: 'Монеты',       Icon: Coins },
  { id: 'ranks',       label: 'Звания',       Icon: Award },
  { id: 'broadcast',   label: 'Рассылка',     Icon: Megaphone },
  { id: 'words',       label: 'Банворды',     Icon: Ban },
  { id: 'logs',        label: 'Логи',         Icon: ScrollText },
  { id: 'test',        label: 'Тест',         Icon: FlaskConical },
  { id: 'settings',    label: 'Настройки',    Icon: SettingsIcon },
];

type Props = { admin: User; onClose: () => void };

export default function AdminPanel({ admin, onClose }: Props) {
  const [section, setSection] = useState<Section>('stats');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const switchSection = (s: Section) => {
    haptic('light');
    setSection(s);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl h-[92vh] bg-bg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Шапка */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-gradient-to-br from-orange/10 to-transparent">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center shadow-orange">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-black font-black text-base tracking-wide">АДМИН-ПАНЕЛЬ</div>
            <div className="text-muted text-[10px] uppercase tracking-widest">
              {admin.nickname || admin.first_name || 'Admin'}
            </div>
          </div>
          <button
            onClick={() => { haptic('medium'); onClose(); }}
            className="w-10 h-10 rounded-xl bg-bg2 border border-border flex items-center justify-center hover:bg-bg3 transition-colors"
          >
            <X className="w-4 h-4 text-text2" />
          </button>
        </div>

        {/* Табы */}
        <div className="px-2 py-2 border-b border-border bg-bg overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => switchSection(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  section === s.id
                    ? 'bg-orange text-white shadow-orange'
                    : 'bg-bg2 text-muted hover:bg-bg3 hover:text-text2'
                }`}
              >
                <s.Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 bg-danger/10 border border-danger/40 rounded-xl p-3 text-xs text-danger flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-all">{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {section === 'stats'       && <StatsSection onError={setError} />}
              {section === 'tournaments' && <TournamentsSection onError={setError} onToast={showToast} />}
              {section === 'sponsors'    && <SponsorsSection onError={setError} onToast={showToast} />}
              {section === 'organizers'  && <OrganizersSection onError={setError} onToast={showToast} />}
              {section === 'matches'     && <MatchesSection onError={setError} />}
              {section === 'users'       && <UsersSection onError={setError} onToast={showToast} />}
              {section === 'coins'       && <CoinsSection onError={setError} onToast={showToast} />}
              {section === 'ranks'       && <RanksSection onError={setError} />}
              {section === 'broadcast'   && <BroadcastSection onError={setError} onToast={showToast} />}
              {section === 'words'       && <WordsSection onError={setError} onToast={showToast} />}
              {section === 'logs'        && <LogsSection onError={setError} />}
              {section === 'test'        && <TestSection onError={setError} onToast={showToast} />}
              {section === 'settings'    && <SettingsSection onError={setError} onToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg z-10"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
 *  ОБЩИЕ КОМПОНЕНТЫ
 * ============================================================ */

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-border rounded-2xl p-4 shadow-card ${className}`}>{children}</div>;
}

function Loader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange animate-spin" /></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-12 text-muted text-sm">{text}</div>;
}

function Btn({
  children, onClick, variant = 'primary', disabled, className = '', type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const base = 'px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5';
  const styles = {
    primary: 'bg-orange text-white shadow-orange hover:bg-orangeDark',
    ghost:   'bg-bg2 text-text2 border border-border hover:bg-bg3',
    danger:  'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
    success: 'bg-success/10 text-success border border-success/30 hover:bg-success/20',
  }[variant];
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>{children}</button>;
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm focus:border-orange transition-colors ${className}`}
    />
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso.slice(0, 16); }
}

/* ============================================================
 *  1. СТАТИСТИКА
 * ============================================================ */

function StatsSection({ onError }: { onError: (e: string | null) => void }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, tournaments: 0, matches: 0, banned: 0 });
  const [top, setTop] = useState<User[]>([]);

  const load = useCallback(async () => {
    setLoading(true); onError(null);
    try {
      const [u, t, m, b, topRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('banned', true),
        supabase.from('users').select('*').order('balance', { ascending: false }).limit(5),
      ]);
      setStats({ users: u.count ?? 0, tournaments: t.count ?? 0, matches: m.count ?? 0, banned: b.count ?? 0 });
      setTop((topRes.data ?? []) as User[]);
    } catch (e: any) { onError(e?.message ?? 'Ошибка'); }
    finally { setLoading(false); }
  }, [onError]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <Loader />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Игроков',   value: stats.users,       color: 'text-orange' },
          { label: 'Турниров',  value: stats.tournaments, color: 'text-text' },
          { label: 'Матчей',    value: stats.matches,     color: 'text-text' },
          { label: 'Забанено',  value: stats.banned,      color: 'text-danger' },
        ].map((c) => (
          <Card key={c.label}>
            <div className="text-[10px] uppercase tracking-widest text-muted font-bold">{c.label}</div>
            <div className={`text-3xl font-black ${c.color} mt-1`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted font-bold">Топ-5 по балансу</div>
          <button onClick={load} className="text-muted hover:text-orange transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        {top.length === 0 ? <Empty text="Пусто" /> : (
          <div className="space-y-2">
            {top.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-2 text-sm">
                <span className="text-muted font-bold w-5">{i + 1}.</span>
                <span className="text-black font-semibold flex-1 truncate">{u.nickname || u.first_name || 'Игрок'}</span>
                <span className="text-orange font-bold">{u.balance ?? 0} 💰</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
 *  2. ТУРНИРЫ
 * ============================================================ */

function TournamentsSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Tournament[]>([]);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    max_teams: '16',
    prize_gold: '0',
    sponsor_channel: '',
    organizer_id: '0',
  });

  const load = useCallback(async () => {
    setLoading(true); onError(null);
    const [tRes, oRes] = await Promise.all([
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
      supabase.from('organizers').select('id, name, tag, logo_url').order('name'),
    ]);
    if (tRes.error) onError(tRes.error.message); else setList((tRes.data ?? []) as Tournament[]);
    setOrganizers(oRes.data ?? []);
    setLoading(false);
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (form.name.trim().length < 3) { onError('Название от 3 символов'); return; }
    const orgId = parseInt(form.organizer_id);
    const { error } = await supabase.from('tournaments').insert({
      name: form.name.trim(),
      max_teams: parseInt(form.max_teams) || 16,
      prize_gold: parseInt(form.prize_gold) || 0,
      sponsor_channel: form.sponsor_channel.trim() || null,
      organizer_id: orgId > 0 ? orgId : null,
      status: 'waiting',
    });
    if (error) { onError(error.message); return; }
    onToast('Турнир создан');
    setForm({ name: '', max_teams: '16', prize_gold: '0', sponsor_channel: '', organizer_id: '0' });
    setCreating(false);
    load();
  };

  const finish = async (id: number) => {
    await supabase.from('tournaments').update({ status: 'finished' }).eq('id', id);
    onToast('Завершён'); load();
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить турнир?')) return;
    await supabase.from('tournaments').delete().eq('id', id);
    onToast('Удалён'); load();
  };

  const orgById = (id: number | null) => organizers.find((o) => o.id === id);

  if (loading) return <Loader />;

  return (
    <div className="space-y-3">
      {!creating ? (
        <Btn onClick={() => setCreating(true)} className="w-full"><Plus className="w-4 h-4" /> Создать турнир</Btn>
      ) : (
        <Card className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted font-bold block mb-1">Название</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Standoff Cup #12" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted font-bold block mb-1">Команд</label>
              <Input value={form.max_teams} onChange={(v) => setForm({ ...form, max_teams: v.replace(/\D/g, '') })} placeholder="16" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted font-bold block mb-1">Приз (G)</label>
              <Input value={form.prize_gold} onChange={(v) => setForm({ ...form, prize_gold: v.replace(/\D/g, '') })} placeholder="500" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted font-bold block mb-1">Канал спонсора (username)</label>
            <Input value={form.sponsor_channel} onChange={(v) => setForm({ ...form, sponsor_channel: v })} placeholder="@standoff_news или пусто" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted font-bold block mb-1">Организатор</label>
            <select
              value={form.organizer_id}
              onChange={(e) => setForm({ ...form, organizer_id: e.target.value })}
              className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm focus:border-orange transition-colors"
            >
              <option value="0">— Без организатора —</option>
              {organizers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}{o.tag ? ` [${o.tag}]` : ''}
                </option>
              ))}
            </select>
            {organizers.length === 0 && (
              <div className="text-muted text-[10px] mt-1">
                Сначала добавь организатора во вкладке Организаторы
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Btn onClick={create} className="flex-1"><CheckCircle2 className="w-3.5 h-3.5" /> Создать</Btn>
            <Btn variant="ghost" onClick={() => setCreating(false)}>Отмена</Btn>
          </div>
        </Card>
      )}

      {list.length === 0 ? <Empty text="Турниров нет" /> : list.map((t) => {
        const org = orgById((t as any).organizer_id ?? null);
        return (
          <Card key={t.id}>
            <div className="flex items-start gap-3">
              {org?.logo_url ? (
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg2 border border-border flex-shrink-0">
                  <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-orange/10 border border-orange/30 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-orange" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-black text-sm truncate">{t.name}</div>
                <div className="text-muted text-[11px] mt-1">
                  {t.max_teams} команд · приз {t.prize_gold ?? 0} G · {fmtDate(t.created_at)}
                </div>
                {org && (
                  <div className="text-orange text-[10px] font-bold mt-0.5 truncate">
                    {org.name}{org.tag ? ` [${org.tag}]` : ''}
                  </div>
                )}
                {(t as any).sponsor_channel && (
                  <div className="text-muted text-[10px] mt-0.5 truncate">
                    {(t as any).sponsor_channel}
                  </div>
                )}
                <div className="mt-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    t.status === 'waiting' ? 'bg-success/15 text-success'
                    : t.status === 'active' ? 'bg-orange/15 text-orange'
                    : 'bg-muted/15 text-muted'
                  }`}>{t.status}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {t.status !== 'finished' && (
                  <Btn variant="success" onClick={() => finish(t.id)}>Завершить</Btn>
                )}
                <Btn variant="danger" onClick={() => remove(t.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
/* ============================================================
 *  3. СПОНСОРЫ
 * ============================================================ */

function SponsorsSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', channel_username: '', channel_link: '' });

  const load = useCallback(async () => {
    setLoading(true); onError(null);
    const { data, error } = await supabase.from('sponsors').select('*').order('created_at', { ascending: false });
    if (error) onError(error.message); else setList(data ?? []);
    setLoading(false);
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim() || !form.channel_username.trim() || !form.channel_link.trim()) {
      onError('Заполни все поля'); return;
    }
    const { error } = await supabase.from('sponsors').insert({
      name: form.name.trim(),
      channel_username: form.channel_username.trim(),
      channel_link: form.channel_link.trim(),
    });
    if (error) { onError(error.message); return; }
    onToast('✅ Добавлен');
    setForm({ name: '', channel_username: '', channel_link: '' });
    setCreating(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить спонсора?')) return;
    await supabase.from('sponsors').delete().eq('id', id);
    onToast('❌ Удалён'); load();
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-3">
      {!creating ? (
        <Btn onClick={() => setCreating(true)} className="w-full"><Plus className="w-4 h-4" /> Добавить спонсора</Btn>
      ) : (
        <Card className="space-y-3">
          <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Название" />
          <Input value={form.channel_username} onChange={(v) => setForm({ ...form, channel_username: v })} placeholder="@username" />
          <Input value={form.channel_link} onChange={(v) => setForm({ ...form, channel_link: v })} placeholder="https://t.me/..." />
          <div className="flex gap-2">
            <Btn onClick={create} className="flex-1"><CheckCircle2 className="w-3.5 h-3.5" /> Сохранить</Btn>
            <Btn variant="ghost" onClick={() => setCreating(false)}>Отмена</Btn>
          </div>
        </Card>
      )}

      {list.length === 0 ? <Empty text="Спонсоров нет" /> : list.map((s) => (
        <Card key={s.id}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-black text-sm truncate">{s.name}</div>
              <div className="text-muted text-[11px] truncate">{s.channel_username} · {s.channel_link}</div>
            </div>
            <Btn variant="danger" onClick={() => remove(s.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
 *  4. ОРГАНИЗАТОРЫ
 * ============================================================ */

function OrganizersSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', tag: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true); onError(null);
    const { data, error } = await supabase.from('organizers').select('*').order('created_at', { ascending: false });
    if (error) onError(error.message); else setList(data ?? []);
    setLoading(false);
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (form.name.trim().length < 2) { onError('Название от 2 символов'); return; }
    const { error } = await supabase.from('organizers').insert({
      name: form.name.trim(),
      tag: form.tag.trim() || null,
      description: form.description.trim() || null,
    });
    if (error) { onError(error.message); return; }
    onToast('✅ Добавлен');
    setForm({ name: '', tag: '', description: '' });
    setCreating(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить организатора?')) return;
    await supabase.from('organizers').delete().eq('id', id);
    onToast('❌ Удалён'); load();
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-3">
      {!creating ? (
        <Btn onClick={() => setCreating(true)} className="w-full"><Plus className="w-4 h-4" /> Добавить организатора</Btn>
      ) : (
        <Card className="space-y-3">
          <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Название" />
          <Input value={form.tag} onChange={(v) => setForm({ ...form, tag: v.toUpperCase() })} placeholder="TAG" />
          <Input value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Описание" />
          <div className="flex gap-2">
            <Btn onClick={create} className="flex-1"><CheckCircle2 className="w-3.5 h-3.5" /> Сохранить</Btn>
            <Btn variant="ghost" onClick={() => setCreating(false)}>Отмена</Btn>
          </div>
        </Card>
      )}

      {list.length === 0 ? <Empty text="Организаторов нет" /> : list.map((o) => (
        <Card key={o.id}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-black text-sm truncate">
                {o.name} {o.tag && <span className="text-orange">[{o.tag}]</span>}
              </div>
              {o.description && <div className="text-muted text-[11px] truncate">{o.description}</div>}
            </div>
            <Btn variant="danger" onClick={() => remove(o.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
 *  5. МАТЧИ
 * ============================================================ */

function MatchesSection({ onError }: { onError: (e: string | null) => void }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Match[]>([]);

  useEffect(() => {
    (async () => {
      onError(null);
      const { data, error } = await supabase
        .from('matches').select('*').order('id', { ascending: false }).limit(50);
      if (error) onError(error.message); else setList((data ?? []) as Match[]);
      setLoading(false);
    })();
  }, [onError]);

  if (loading) return <Loader />;
  if (list.length === 0) return <Empty text="Матчей нет" />;

  return (
    <div className="space-y-2">
      {list.map((m) => (
        <Card key={m.id}>
          <div className="flex items-center gap-3 text-xs">
            <div className="font-bold text-black">#{m.id}</div>
            <div className="flex-1 text-muted">Турнир {m.tournament_id}</div>
            <div className={`font-bold ${m.status === 'done' ? 'text-success' : m.status === 'live' ? 'text-orange' : 'text-muted'}`}>
              {m.status}
            </div>
          </div>
          {(m.score_ct != null || m.score_t != null) && (
            <div className="text-[11px] text-muted mt-1">
              CT {m.score_ct ?? '—'} : T {m.score_t ?? '—'} {m.map && `· ${m.map}`}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
 *  6. ИГРОКИ
 * ============================================================ */

function UsersSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);

  const search = async () => {
    if (!query.trim()) { onError('Введи запрос'); return; }
    setLoading(true); onError(null); setSelected(null);
    const q = query.trim();
    let req = supabase.from('users').select('*').limit(20);
    if (/^\d{5,}$/.test(q)) req = req.eq('standoff_id', q);
    else if (q.startsWith('@')) req = req.ilike('username', q.slice(1));
    else if (/^\d+$/.test(q)) req = req.eq('user_id', parseInt(q));
    else req = req.ilike('nickname', `%${q}%`);
    const { data, error } = await req;
    if (error) onError(error.message); else setResults((data ?? []) as User[]);
    setLoading(false);
  };

  const update = async (fields: Partial<User>) => {
    if (!selected) return;
    const { error } = await supabase.from('users').update(fields).eq('user_id', selected.user_id);
    if (error) { onError(error.message); return; }
    onToast('✅ Обновлено');
    setSelected({ ...selected, ...fields });
  };

  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <div className="flex gap-2">
          <Input value={query} onChange={setQuery} placeholder="user_id / @username / Standoff ID / ник" />
          <Btn onClick={search} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </Btn>
        </div>
      </Card>

      {selected ? (
        <UserCard user={selected} onUpdate={update} onBack={() => setSelected(null)} />
      ) : (
        results.length > 0 && (
          <div className="space-y-2">
            {results.map((u) => (
              <Card key={u.user_id}>
                <button onClick={() => setSelected(u)} className="w-full text-left flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-black text-sm truncate">{u.nickname || u.first_name || 'Игрок'}</div>
                    <div className="text-muted text-[11px]">ID {u.user_id} · @{u.username || '—'}</div>
                  </div>
                  {u.banned && <span className="text-danger text-[10px] font-bold">BAN</span>}
                </button>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function UserCard({ user, onUpdate, onBack }: { user: User; onUpdate: (f: Partial<User>) => void; onBack: () => void }) {
  const [coins, setCoins] = useState('');
  const [tokens, setTokens] = useState('');
  const [nick, setNick] = useState(user.nickname || '');

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-muted text-xs hover:text-orange">← Назад</button>
      </div>

      <div>
        <div className="font-bold text-black">{user.nickname || user.first_name || 'Игрок'}</div>
        <div className="text-muted text-[11px]">ID {user.user_id} · @{user.username || '—'}</div>
        <div className="text-muted text-[11px]">Standoff ID: {user.standoff_id || '—'}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg2 rounded-xl p-2">
          <div className="text-[10px] text-muted uppercase">Баланс</div>
          <div className="font-bold text-orange">{user.balance ?? 0}</div>
        </div>
        <div className="bg-bg2 rounded-xl p-2">
          <div className="text-[10px] text-muted uppercase">Жетоны</div>
          <div className="font-bold text-black">{user.tokens ?? 0}</div>
        </div>
        <div className="bg-bg2 rounded-xl p-2">
          <div className="text-[10px] text-muted uppercase">W/L</div>
          <div className="font-bold text-black">{user.wins ?? 0}/{user.losses ?? 0}</div>
        </div>
      </div>

      {/* Роли */}
      <div>
        <div className="text-[10px] text-muted uppercase font-bold mb-1.5">Роль</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[['admin', '👑'], ['moderator', '🛡'], ['support', '🎧'], [null, '🚫']].map(([r, ico]) => (
            <button
              key={String(r)}
              onClick={() => onUpdate({ role: r as any })}
              className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                user.role === r ? 'bg-orange text-white border-orange' : 'bg-bg2 text-text2 border-border'
              }`}
            >{ico as string}</button>
          ))}
        </div>
      </div>

      {/* Баланс */}
      <div className="flex gap-2">
        <Input value={coins} onChange={(v) => setCoins(v.replace(/[^\-\d]/g, ''))} placeholder="+/- монеты" />
        <Btn onClick={() => {
          const delta = parseInt(coins) || 0;
          onUpdate({ balance: Math.max(0, (user.balance ?? 0) + delta) });
          setCoins('');
        }}>💰</Btn>
      </div>

      {/* Жетоны */}
      <div className="flex gap-2">
        <Input value={tokens} onChange={(v) => setTokens(v.replace(/[^\-\d]/g, ''))} placeholder="+/- жетоны" />
        <Btn onClick={() => {
          const delta = parseInt(tokens) || 0;
          onUpdate({ tokens: Math.max(0, (user.tokens ?? 0) + delta) });
          setTokens('');
        }}>🪙</Btn>
      </div>

      {/* Ник */}
      <div className="flex gap-2">
        <Input value={nick} onChange={setNick} placeholder="Ник" />
        <Btn onClick={() => onUpdate({ nickname: nick.trim() })}>💾</Btn>
      </div>

      {/* Бан */}
      <div className="flex gap-2">
        {user.banned ? (
          <Btn variant="success" onClick={() => onUpdate({ banned: false, ban_reason: null })} className="flex-1">
            ✅ Разбанить
          </Btn>
        ) : (
          <Btn variant="danger" onClick={() => {
            const reason = prompt('Причина бана:');
            if (reason) onUpdate({ banned: true, ban_reason: reason });
          }} className="flex-1">
            🚫 Забанить
          </Btn>
        )}
      </div>
    </Card>
  );
}

/* ============================================================
 *  7. МОНЕТЫ
 * ============================================================ */

function CoinsSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [amount, setAmount] = useState('1000');
  const [busy, setBusy] = useState(false);

  const massGive = async () => {
    const delta = parseInt(amount) || 0;
    if (!delta) return;
    setBusy(true); onError(null);
    const { data, error } = await supabase.from('users').select('user_id, balance');
    if (error) { onError(error.message); setBusy(false); return; }
    const rows = data ?? [];
    // Обновляем параллельно порциями
    const chunk = 50;
    for (let i = 0; i < rows.length; i += chunk) {
      await Promise.all(
        rows.slice(i, i + chunk).map((u: any) =>
          supabase.from('users').update({ balance: Math.max(0, (u.balance ?? 0) + delta) }).eq('user_id', u.user_id)
        )
      );
    }
    onToast(`✅ ${delta > 0 ? '+' : ''}${delta} выдано ${rows.length} игрокам`);
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted font-bold">Массовая выдача монет</div>
        <Input value={amount} onChange={(v) => setAmount(v.replace(/[^\-\d]/g, ''))} placeholder="Например 1000 или -500" />
        <Btn onClick={massGive} disabled={busy} className="w-full">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
          Применить ко всем
        </Btn>
        <div className="text-muted text-[11px]">Работает по всем пользователям таблицы users.</div>
      </Card>
    </div>
  );
}

/* ============================================================
 *  8. ЗВАНИЯ
 * ============================================================ */

const RANKS_LIST = [
  ['bronze_1', '🥉 Бронза I'], ['bronze_2', '🥉 Бронза II'], ['bronze_3', '🥉 Бронза III'], ['bronze_4', '🥉 Бронза IV'],
  ['silver_1', '🥈 Серебро I'], ['silver_2', '🥈 Серебро II'], ['silver_3', '🥈 Серебро III'], ['silver_4', '🥈 Серебро IV'],
  ['gold_1', '🥇 Золото I'], ['gold_2', '🥇 Золото II'], ['gold_3', '🥇 Золото III'], ['gold_4', '🥇 Золото IV'],
  ['phoenix', '🔥 Феникс'], ['ranger', '🔫 Рейнджер'], ['champion', '🏆 Чемпион'],
  ['master', '🎖 Мастер'], ['elite', '⭐ Элита'], ['legend', '👑 Легенда'],
];

function RanksSection({ onError }: { onError: (e: string | null) => void }) {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const find = async () => {
    if (!query.trim()) return;
    setLoading(true); onError(null); setUser(null);
    let req = supabase.from('users').select('*').limit(1);
    if (/^\d+$/.test(query)) req = req.eq('user_id', parseInt(query));
    else req = req.ilike('nickname', `%${query}%`);
    const { data, error } = await req.maybeSingle();
    if (error) onError(error.message); else setUser(data as User | null);
    setLoading(false);
  };

  const setRank = async (rank: string | null) => {
    if (!user) return;
    const { error } = await supabase.from('users').update({ rank }).eq('user_id', user.user_id);
    if (error) { onError(error.message); return; }
    setUser({ ...user, rank });
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex gap-2">
          <Input value={query} onChange={setQuery} placeholder="user_id или ник" />
          <Btn onClick={find} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </Btn>
        </div>
      </Card>

      {user && (
        <Card>
          <div className="font-bold text-black mb-3">
            {user.nickname || user.first_name} <span className="text-muted text-xs">#{user.user_id}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {RANKS_LIST.map(([id, name]) => (
              <button
                key={id}
                onClick={() => setRank(id)}
                className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                  user.rank === id ? 'bg-orange text-white border-orange' : 'bg-bg2 text-text2 border-border'
                }`}
              >{name}</button>
            ))}
            <button
              onClick={() => setRank(null)}
              className="col-span-3 py-2 rounded-lg text-[10px] font-bold border border-danger/30 bg-danger/10 text-danger"
            >🚫 Снять звание</button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 *  9. РАССЫЛКА
 * ============================================================ */

function BroadcastSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (text.trim().length < 2) { onError('Слишком короткий текст'); return; }
    if (!confirm('Разослать всем игрокам?')) return;
    setBusy(true); onError(null);
    const { error } = await supabase.from('bot_commands').insert({
      command: 'broadcast',
      payload: { text: text.trim() },
      processed: false,
    });
    if (error) onError(error.message);
    else { onToast('📢 Задача создана'); setText(''); }
    setBusy(false);
  };

  return (
    <Card className="space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-muted font-bold">Рассылка через бота</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Текст сообщения (HTML разрешён)"
        className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm focus:border-orange transition-colors resize-none"
      />
      <Btn onClick={send} disabled={busy} className="w-full">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
        Отправить всем
      </Btn>
      <div className="text-muted text-[11px]">
        Задача уйдёт в очередь <code>bot_commands</code>. Бот разошлёт её сам.
      </div>
    </Card>
  );
}

/* ============================================================
 *  10. БАНВОРДЫ
 * ============================================================ */

function WordsSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [word, setWord] = useState('');

  const load = useCallback(async () => {
    setLoading(true); onError(null);
    const { data, error } = await supabase.from('banned_words').select('*').order('id', { ascending: false });
    if (error) onError(error.message); else setList(data ?? []);
    setLoading(false);
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!word.trim()) return;
    const { error } = await supabase.from('banned_words').insert({ word: word.trim().toLowerCase() });
    if (error) onError(error.message);
    else { setWord(''); onToast('✅ Добавлено'); load(); }
  };

  const remove = async (id: number) => {
    await supabase.from('banned_words').delete().eq('id', id);
    onToast('❌ Удалено'); load();
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex gap-2">
          <Input value={word} onChange={setWord} placeholder="Новое слово" />
          <Btn onClick={add}><Plus className="w-3.5 h-3.5" /></Btn>
        </div>
      </Card>

      {list.length === 0 ? <Empty text="Пусто" /> : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((w) => (
            <button
              key={w.id}
              onClick={() => remove(w.id)}
              className="px-2.5 py-1 bg-bg2 border border-border rounded-lg text-xs text-text2 hover:bg-danger/10 hover:border-danger/30 hover:text-danger transition-all"
            >{w.word} ✕</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 *  11. ЛОГИ
 * ============================================================ */

function LogsSection({ onError }: { onError: (e: string | null) => void }) {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      onError(null);
      const { data, error } = await supabase
        .from('user_actions').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) onError(error.message); else setList(data ?? []);
      setLoading(false);
    })();
  }, [onError]);

  if (loading) return <Loader />;
  if (list.length === 0) return <Empty text="Логов нет" />;

  return (
    <div className="space-y-1.5">
      {list.map((a, i) => (
        <Card key={a.id ?? i} className="!py-2.5 !px-3">
          <div className="flex items-center gap-2 text-[11px]">
            <code className="text-orange font-bold">{a.user_id}</code>
            <span className="text-text2 font-bold flex-1 truncate">{a.action}</span>
            <span className="text-muted">{fmtDate(a.created_at)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
 *  12. ТЕСТ
 * ============================================================ */

function TestSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const testTournament = async () => {
    setBusy('t'); onError(null);
    const { error } = await supabase.from('tournaments').insert({
      name: `🧪 Тест ${new Date().toLocaleTimeString('ru-RU')}`,
      max_teams: 4, prize_gold: 100, status: 'waiting',
    });
    if (error) onError(error.message); else onToast('✅ Создан');
    setBusy(null);
  };

  const coinsAll = async () => {
    setBusy('c'); onError(null);
    const { data, error } = await supabase.from('users').select('user_id, balance');
    if (error) { onError(error.message); setBusy(null); return; }
    await Promise.all((data ?? []).map((u: any) =>
      supabase.from('users').update({ balance: (u.balance ?? 0) + 1000 }).eq('user_id', u.user_id)
    ));
    onToast(`✅ +1000 → ${data?.length ?? 0}`);
    setBusy(null);
  };

  const tokensAll = async () => {
    setBusy('tk'); onError(null);
    const { data, error } = await supabase.from('users').select('user_id, tokens');
    if (error) { onError(error.message); setBusy(null); return; }
    await Promise.all((data ?? []).map((u: any) =>
      supabase.from('users').update({ tokens: (u.tokens ?? 0) + 10 }).eq('user_id', u.user_id)
    ));
    onToast(`✅ +10 жетонов → ${data?.length ?? 0}`);
    setBusy(null);
  };

  const clearTest = async () => {
    if (!confirm('Удалить все тестовые турниры?')) return;
    setBusy('x'); onError(null);
    const { error } = await supabase.from('tournaments').delete().ilike('name', '🧪 Тест%');
    if (error) onError(error.message); else onToast('🧹 Очищено');
    setBusy(null);
  };

  return (
    <div className="space-y-2">
      <Btn onClick={testTournament} disabled={busy !== null} className="w-full">
        {busy === 't' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
        Создать тестовый турнир
      </Btn>
      <Btn onClick={coinsAll} disabled={busy !== null} className="w-full">
        {busy === 'c' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
        +1000 монет всем
      </Btn>
      <Btn onClick={tokensAll} disabled={busy !== null} className="w-full">
        {busy === 'tk' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
        +10 жетонов всем
      </Btn>
      <Btn onClick={clearTest} disabled={busy !== null} variant="danger" className="w-full">
        {busy === 'x' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        Очистить тестовые турниры
      </Btn>
    </div>
  );
}

/* ============================================================
 *  13. НАСТРОЙКИ
 * ============================================================ */

function SettingsSection({ onError, onToast }: { onError: (e: string | null) => void; onToast: (m: string) => void }) {
  const [busy, setBusy] = useState(false);

  const exportDB = async () => {
    setBusy(true); onError(null);
    try {
      const [users, tournaments, sponsors, organizers] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('tournaments').select('*'),
        supabase.from('sponsors').select('*'),
        supabase.from('organizers').select('*'),
      ]);
      const dump = {
        exported_at: new Date().toISOString(),
        users: users.data ?? [],
        tournaments: tournaments.data ?? [],
        sponsors: sponsors.data ?? [],
        organizers: organizers.data ?? [],
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `standoff_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('📥 Экспорт готов');
    } catch (e: any) { onError(e?.message ?? 'Ошибка экспорта'); }
    setBusy(false);
  };

  return (
    <Card className="space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-muted font-bold">Экспорт данных</div>
      <Btn onClick={exportDB} disabled={busy} className="w-full">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SettingsIcon className="w-3.5 h-3.5" />}
        Скачать JSON-бэкап
      </Btn>
      <div className="text-muted text-[11px] leading-relaxed">
        Экспортирует таблицы <code>users</code>, <code>tournaments</code>, <code>sponsors</code>, <code>organizers</code> в один JSON-файл.
      </div>
    </Card>
  );
}
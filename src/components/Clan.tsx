import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Crown, Shield, Search, X, Check, Send,
  LogOut, Trash2, ArrowLeft, Trophy, UserPlus, MessageCircle, Camera,
} from 'lucide-react';
import { supabase, type User } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import {
  type Clan as ClanType, type ClanMember, type ClanMessage,
  getAllClans, getUserClan, createClan, joinClan, leaveClan,
  getClanMembers, getClanMessages, sendClanMessage, deleteClan,
  updateClan, getClanApplications, setClanJoinMode,
} from '../lib/clan';
import PlayerProfileModal from './PlayerProfileModal';
import ClanApplicationsModal from './ClanApplicationsModal';

type Props = { user: User };
type View = 'main' | 'list' | 'create' | 'clan';
type JoinMode = 'open' | 'request' | 'invite';

export default function Clan({ user }: Props) {
  const [myClan, setMyClan] = useState<{ clan: ClanType; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('main');

  const load = async () => {
    const data = await getUserClan(user.user_id);
    setMyClan(data);
    setLoading(false);
    setView(data ? 'clan' : 'main');
  };

  useEffect(() => { load(); }, [user.user_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка</div>
      </div>
    );
  }

  if (view === 'clan' && myClan) {
    return <ClanView user={user} clan={myClan.clan} myRole={myClan.role} onBack={load} onClanUpdate={load} />;
  }
  if (view === 'list') return <ClanList user={user} onBack={() => setView('main')} onJoined={load} />;
  if (view === 'create') return <CreateClan user={user} onBack={() => setView('main')} onCreated={load} />;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-card">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-3xl bg-orange/10 border border-orange/30 flex items-center justify-center">
            <Users className="w-10 h-10 text-orange" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-black font-black text-xl mb-2">Кланы</div>
        <p className="text-muted text-xs leading-relaxed mb-5 max-w-xs mx-auto">
          Создай свой клан бесплатно, приглашай друзей, общайся в чате и соревнуйся с другими кланами
        </p>
        <div className="space-y-2">
          <button onClick={() => { haptic('medium'); setView('create'); }}
            className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm flex items-center justify-center gap-2 shadow-orange hover:bg-orangeDark transition-colors">
            <Plus className="w-4 h-4" /> Создать клан
          </button>
          <button onClick={() => { haptic('light'); setView('list'); }}
            className="w-full bg-bg2 border border-border text-black font-bold rounded-2xl py-4 text-sm flex items-center justify-center gap-2 hover:bg-bg3 transition-colors">
            <Search className="w-4 h-4" /> Найти клан
          </button>
        </div>
      </div>
    </div>
  );
}

function ClanList({ user, onBack, onJoined }: { user: User; onBack: () => void; onJoined: () => void }) {
  const [clans, setClans] = useState<ClanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClan, setSelectedClan] = useState<ClanType | null>(null);
  const [applyMessage, setApplyMessage] = useState('');

  useEffect(() => { (async () => { setClans(await getAllClans()); setLoading(false); })(); }, []);

  const handleJoin = async (clanId: number, mode: JoinMode = 'open') => {
    if (mode === 'request') {
      setSelectedClan(clans.find(c => c.id === clanId) || null);
      return;
    }
    setJoining(clanId); setError(null);
    const res = await joinClan(user.user_id, clanId);
    setJoining(null);
    if (!res.ok) { hapticError(); setError(res.error || 'Ошибка'); return; }
    hapticSuccess(); onJoined();
  };

  const submitApplication = async () => {
    if (!selectedClan) return;
    setJoining(selectedClan.id);
    const res = await joinClan(user.user_id, selectedClan.id);
    setJoining(null);
    if (!res.ok) { hapticError(); setError(res.error || 'Ошибка'); return; }
    hapticSuccess();
    setSelectedClan(null); setApplyMessage('');
    onJoined();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-4 h-4 text-black" />
        </button>
        <div className="flex-1">
          <div className="text-black font-black text-sm">Все кланы</div>
          <div className="text-muted text-[10px] uppercase tracking-widest">{clans.length} кланов</div>
        </div>
      </div>

      {error && <div className="bg-danger/10 border border-danger/40 rounded-xl p-3 text-xs text-danger">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" /></div>
      ) : clans.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Users className="w-10 h-10 text-muted mx-auto mb-3" strokeWidth={1.5} />
          <div className="text-black font-bold mb-1">Кланов пока нет</div>
          <p className="text-muted text-xs">Стань первым — создай свой</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clans.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center text-white font-black text-lg flex-shrink-0 overflow-hidden">
                {c.logo_url ? <img src={c.logo_url} alt="" className="w-full h-full object-cover" /> : c.tag.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-black font-bold text-sm truncate">{c.name}</div>
                <div className="text-muted text-[10px] flex items-center gap-1.5">
                  <span className="font-bold text-orange">[{c.tag}]</span>
                  <span>·</span><span>{c.points} PTS</span>
                  <span>·</span><span>{c.wins}W / {c.losses}L</span>
                </div>
              </div>
              <button onClick={() => handleJoin(c.id)} disabled={joining === c.id}
                className="bg-orange text-white font-bold rounded-xl px-3 py-2 text-xs disabled:opacity-50 shadow-orange hover:bg-orangeDark transition-colors flex items-center gap-1">
                <UserPlus className="w-3 h-3" />{joining === c.id ? '...' : 'Вступить'}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedClan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setSelectedClan(null)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-3xl p-5">
              <div className="text-black font-black text-base mb-1">Заявка в клан</div>
              <div className="text-muted text-xs mb-3">Клан <b>{selectedClan.name}</b> принимает только по заявкам</div>
              <textarea value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="Почему хочешь вступить? (необязательно)" rows={3} maxLength={300}
                className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => setSelectedClan(null)} className="flex-1 bg-bg2 border border-border text-muted rounded-xl py-3 text-xs font-bold">Отмена</button>
                <button onClick={submitApplication} disabled={joining === selectedClan.id}
                  className="flex-1 bg-orange text-white rounded-xl py-3 text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1">
                  <Send className="w-3 h-3" /> Отправить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateClan({ user, onBack, onCreated }: { user: User; onBack: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (name.trim().length < 3) { setError('Имя минимум 3 символа'); return; }
    if (tag.trim().length < 2 || tag.trim().length > 5) { setError('Тег 2-5 символов'); return; }
    setSaving(true); setError(null);
    const res = await createClan(user.user_id, name, tag, desc);
    setSaving(false);
    if (res.error) { hapticError(); setError(res.error); return; }
    hapticSuccess(); onCreated();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-card border border-border">
          <ArrowLeft className="w-4 h-4 text-black" />
        </button>
        <div className="text-black font-black text-sm">Создать клан</div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest block mb-1.5">Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shadow Wolves" maxLength={30}
            className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm focus:border-orange" />
        </div>
        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest block mb-1.5">Тег (2-5)</label>
          <input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="SW" maxLength={5}
            className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm focus:border-orange uppercase" />
        </div>
        <div>
          <label className="text-muted text-[10px] uppercase tracking-widest block mb-1.5">Описание</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="О клане..." maxLength={200} rows={3}
            className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-black text-sm focus:border-orange resize-none" />
        </div>
        {error && <div className="bg-danger/10 border border-danger/40 rounded-xl p-3 text-xs text-danger">{error}</div>}
        <button onClick={handleCreate} disabled={saving}
          className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm disabled:opacity-50 shadow-orange hover:bg-orangeDark transition-colors">
          {saving ? 'Создаём...' : 'Создать бесплатно'}
        </button>
      </div>
    </div>
  );
}

function ClanView({
  user, clan, myRole, onBack, onClanUpdate,
}: {
  user: User;
  clan: ClanType;
  myRole: string;
  onBack: () => void;
  onClanUpdate: () => void;
}) {
  const [tab, setTab] = useState<'info' | 'members' | 'chat'>('info');
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [messages, setMessages] = useState<ClanMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [showApplications, setShowApplications] = useState(false);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const scrollRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const isLeader = myRole === 'leader';
  const isOfficer = myRole === 'officer' || isLeader;

  const loadMembers = async () => setMembers(await getClanMembers(clan.id));
  const loadMessages = async () => setMessages(await getClanMessages(clan.id));

  useEffect(() => {
    loadMembers();
    if (tab === 'chat') {
      loadMessages();
      const ch = supabase.channel(`clan-${clan.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clan_messages', filter: `clan_id=eq.${clan.id}` }, () => loadMessages())
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  }, [clan.id, tab]);

  useEffect(() => {
    if (!isLeader && !isOfficer) return;
    (async () => {
      const { data: c } = await supabase.from('clans').select('join_mode').eq('id', clan.id).maybeSingle();
      if (c && (c as any).join_mode) setJoinMode((c as any).join_mode);
      const apps = await getClanApplications(clan.id);
      setApplicationsCount(apps.length);
    })();
  }, [clan.id, isLeader, isOfficer, tab]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true); haptic('light');
    await sendClanMessage(clan.id, user.user_id, text);
    setSending(false); setInput(''); hapticSuccess();
  };

  const handleLeave = async () => {
    if (!confirm('Точно покинуть клан?')) return;
    haptic('medium');
    await leaveClan(user.user_id, clan.id);
    hapticSuccess(); onBack();
  };

  const handleDelete = async () => {
    if (!confirm('Удалить клан навсегда?')) return;
    haptic('medium');
    await deleteClan(clan.id);
    hapticSuccess(); onBack();
  };

  const changeMode = async (mode: JoinMode) => {
    haptic('light');
    const res = await setClanJoinMode(clan.id, mode);
    if (res.error) { hapticError(); return; }
    setJoinMode(mode); hapticSuccess();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isLeader && !isOfficer) { hapticError(); alert('Только лидер/офицер'); return; }
    if (file.size > 3 * 1024 * 1024) { hapticError(); alert('Макс 3 МБ'); return; }
    haptic('medium'); setUploadingLogo(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `clans/${clan.id}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('standoff').upload(path, file, { upsert: true, cacheControl: '3600' });
    if (upErr) { setUploadingLogo(false); hapticError(); alert(upErr.message); return; }
    const { data } = supabase.storage.from('standoff').getPublicUrl(path);
    const url = data.publicUrl + '?t=' + Date.now();
    const { error: updErr } = await updateClan(clan.id, { logo_url: url });
    setUploadingLogo(false);
    if (updErr) { hapticError(); alert(updErr.message); return; }
    hapticSuccess(); onClanUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-card">
        <div className="h-24 bg-gradient-to-br from-orange to-orange2" />
        <div className="px-5 pb-5 -mt-10">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-3xl bg-white border-4 border-white flex items-center justify-center overflow-hidden">
              {clan.logo_url ? <img src={clan.logo_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-orange to-orange2 flex items-center justify-center text-white font-black text-2xl">{clan.tag.slice(0, 2)}</div>}
            </div>
            {(isLeader || isOfficer) && (
              <>
                <button onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center shadow-orange border-2 border-white disabled:opacity-50">
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </>
            )}
          </div>

          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="font-black text-xl text-black">{clan.name}</span>
              <span className="text-orange font-bold text-sm">[{clan.tag}]</span>
            </div>
            {clan.description && <p className="text-muted text-xs mt-1">{clan.description}</p>}
            {uploadingLogo && <p className="text-orange text-[10px] mt-1 font-bold">Загрузка логотипа...</p>}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatMini label="Очки" value={clan.points} />
            <StatMini label="Побед" value={clan.wins} />
            <StatMini label="Пораж." value={clan.losses} />
          </div>

          {(isLeader || isOfficer) && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="text-muted text-[10px] uppercase tracking-widest font-bold">Режим вступления</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['open', 'request', 'invite'] as const).map((mode) => (
                  <button key={mode} onClick={() => changeMode(mode)}
                    className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      joinMode === mode ? 'bg-orange text-white shadow-orange' : 'bg-bg2 border border-border text-muted'
                    }`}>
                    {mode === 'open' ? '🟢 Открыт' : mode === 'request' ? '🟡 Заявки' : '🔒 Закрыт'}
                  </button>
                ))}
              </div>
              {applicationsCount > 0 && (
                <button onClick={() => { haptic('light'); setShowApplications(true); }}
                  className="w-full mt-2 bg-orange/10 border border-orange/40 text-orange font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-2">
                  📩 Заявки
                  <span className="bg-orange text-white rounded-full min-w-[20px] h-5 px-1.5 text-[10px] font-black flex items-center justify-center">
                    {applicationsCount}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <TabBtn active={tab === 'info'} onClick={() => setTab('info')} icon={Trophy} label="Инфо" />
        <TabBtn active={tab === 'members'} onClick={() => setTab('members')} icon={Users} label="Состав" />
        <TabBtn active={tab === 'chat'} onClick={() => setTab('chat')} icon={MessageCircle} label="Чат" />
      </div>

      {tab === 'info' && (
        <div className="space-y-2">
          <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center">
            <span className="text-muted text-xs">Вступил</span>
            <span className="text-black text-xs font-bold">{new Date(clan.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex justify-between items-center">
            <span className="text-muted text-xs">Твоя роль</span>
            <RoleBadge role={myRole} />
          </div>
          <button onClick={handleLeave} className="w-full bg-bg2 border border-border text-danger font-bold rounded-xl py-3 text-xs hover:bg-danger/10 flex items-center justify-center gap-2">
            <LogOut className="w-3.5 h-3.5" /> Покинуть клан
          </button>
          {isLeader && (
            <button onClick={handleDelete} className="w-full bg-danger/10 border border-danger/40 text-danger font-bold rounded-xl py-3 text-xs hover:bg-danger/20 flex items-center justify-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Удалить клан
            </button>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-2">
          {members.map((m) => (
            <button key={m.id} onClick={() => setSelectedMember(m.user_id)}
              className="w-full cursor-pointer bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-orange/40 transition-colors text-left">
              <div className="w-10 h-10 rounded-full bg-bg2 flex items-center justify-center overflow-hidden flex-shrink-0">
                {m.user?.avatar_url || m.user?.photo_url ? (
                  <img src={m.user.avatar_url || m.user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                ) : <Users className="w-4 h-4 text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-black text-sm font-bold truncate" style={{ color: m.user?.nickname_color || undefined }}>
                  {m.user?.nickname || m.user?.first_name || 'Игрок'}
                </div>
                <div className="text-muted text-[10px]">ID: {m.user?.standoff_id || '—'}</div>
              </div>
              <RoleBadge role={m.role} />
            </button>
          ))}
        </div>
      )}

      {tab === 'chat' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-muted text-xs text-center py-10">Напиши первым</div>
            ) : messages.map((m) => {
              const mine = m.user_id === user.user_id;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-bg2 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {m.author_photo ? <img src={m.author_photo} alt="" className="w-full h-full object-cover" /> : <Users className="w-3 h-3 text-muted" />}
                  </div>
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${mine ? 'bg-orange text-white' : 'bg-bg2 text-black'}`}>
                    {!mine && <div className="text-[10px] font-bold mb-0.5 opacity-70">{m.author_name}</div>}
                    <div className="text-xs break-words">{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Сообщение..." className="flex-1 bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm focus:border-orange" />
            <button onClick={send} disabled={!input.trim() || sending}
              className="bg-orange text-white font-bold rounded-xl px-4 disabled:opacity-40 shadow-orange">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedMember && (
          <PlayerProfileModal userId={selectedMember} currentUserId={user.user_id} onClose={() => setSelectedMember(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showApplications && (
          <ClanApplicationsModal clanId={clan.id} onClose={() => setShowApplications(false)} onCountChange={setApplicationsCount} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-bg2 rounded-xl p-2 text-center">
      <div className="text-orange font-black text-base">{value}</div>
      <div className="text-muted text-[9px] uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all ${
        active ? 'bg-orange text-white shadow-orange' : 'bg-card border border-border text-muted'
      }`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'leader') return <span className="role-admin"><Crown className="w-3 h-3" />Лидер</span>;
  if (role === 'officer') return <span className="role-moderator"><Shield className="w-3 h-3" />Офицер</span>;
  return <span className="bg-bg3 text-muted px-2 py-0.5 rounded text-[10px] font-bold">Участник</span>;
}

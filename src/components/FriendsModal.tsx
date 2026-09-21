import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, UserPlus, Check, UserMinus, Inbox, Clock } from 'lucide-react';
import { supabase } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import {
  getFriends, addFriend, removeFriend, sendFriendRequest,
  getIncomingRequests, getOutgoingRequests, acceptFriendRequest,
  declineFriendRequest, type FriendUser, type FriendRequest,
} from '../lib/friends';
import PlayerProfileModal from './PlayerProfileModal';

type Props = { userId: number; onClose: () => void };
type Tab = 'list' | 'requests' | 'search';

export default function FriendsModal({ userId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('list');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => { document.body.classList.remove('modal-open'); };
  }, []);

  const load = async () => {
    setLoading(true);
    const [f, inc, out] = await Promise.all([
      getFriends(userId),
      getIncomingRequests(userId),
      getOutgoingRequests(userId),
    ]);
    setFriends(f);
    setIncoming(inc);
    setOutgoing(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const q = query.trim();
    let req = supabase.from('users')
      .select('user_id, nickname, first_name, avatar_url, photo_url, standoff_id, nickname_color, role, rank, last_seen')
      .neq('user_id', userId).limit(20);
    if (/^\d{5,}$/.test(q)) req = req.or(`user_id.eq.${q},standoff_id.eq.${q}`);
    else if (q.startsWith('@')) req = req.ilike('username', q.slice(1));
    else req = req.or(`nickname.ilike.%${q}%,first_name.ilike.%${q}%,username.ilike.%${q}%`);
    const { data, error } = await req;
    if (error) {
      showToast('Ошибка: ' + error.message);
      setSearching(false);
      return;
    }
    const found = ((data || []) as FriendUser[]).map((u) => ({
      ...u,
      is_online: u.last_seen ? Date.now() - new Date(u.last_seen).getTime() < 5 * 60 * 1000 : false,
    }));
    setResults(found);
    if (found.length === 0) showToast('Никого не найдено');
    setSearching(false);
  };

  const isFriendUser = (id: number) => friends.some((f) => f.user_id === id);
  const isPendingOut = (id: number) => outgoing.some((r) => r.friend_id === id);
  const isPendingIn = (id: number) => incoming.some((r) => r.user_id === id);

  const handleSend = async (id: number) => {
    setBusy(id);
    haptic('medium');
    const res = await sendFriendRequest(userId, id);
    setBusy(null);
    if (!res.ok) { hapticError(); showToast(res.error || 'Ошибка'); return; }
    hapticSuccess();
    load();
  };

  const handleRemove = async (id: number) => {
    setBusy(id);
    await removeFriend(userId, id);
    setBusy(null);
    hapticSuccess();
    load();
  };

  const handleAccept = async (req: FriendRequest) => {
    setBusy(req.id);
    haptic('medium');
    await acceptFriendRequest(req.id, req.user_id, userId);
    setBusy(null);
    hapticSuccess();
    load();
  };

  const handleDecline = async (req: FriendRequest) => {
    setBusy(req.id);
    await declineFriendRequest(req.id);
    setBusy(null);
    hapticSuccess();
    load();
  };

  const onlineCount = friends.filter((f) => f.is_online).length;
  const totalRequests = incoming.length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col"
        >
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange" />
              <div className="text-black font-black">Друзья</div>
              <span className="text-muted text-xs">· {friends.length} ({onlineCount} онлайн)</span>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center">
              <X className="w-4 h-4 text-black" />
            </button>
          </div>

          <div className="grid grid-cols-3 border-b border-border">
            <button onClick={() => setTab('list')}
              className={`py-3 text-xs font-black uppercase tracking-wide ${tab === 'list' ? 'text-orange border-b-2 border-orange' : 'text-muted'}`}>
              Друзья
            </button>
            <button onClick={() => setTab('requests')}
              className={`py-3 text-xs font-black uppercase tracking-wide relative ${tab === 'requests' ? 'text-orange border-b-2 border-orange' : 'text-muted'}`}>
              Запросы
              {totalRequests > 0 && (
                <span className="absolute top-1 right-2 bg-danger text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {totalRequests}
                </span>
              )}
            </button>
            <button onClick={() => setTab('search')}
              className={`py-3 text-xs font-black uppercase tracking-wide ${tab === 'search' ? 'text-orange border-b-2 border-orange' : 'text-muted'}`}>
              Найти
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* ==== СПИСОК ДРУЗЕЙ ==== */}
            {tab === 'list' && (
              loading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" /></div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted mx-auto mb-2" />
                  <div className="text-muted text-sm">Пока никого нет</div>
                  <button onClick={() => setTab('search')} className="text-orange font-bold text-xs mt-2 underline">Найти друзей →</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => (
                    <div key={f.user_id} className="flex items-center gap-3 bg-bg2 border border-border rounded-2xl p-3">
                      <button onClick={() => setSelectedUser(f.user_id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div className="relative w-11 h-11 rounded-full bg-card border border-border overflow-hidden flex-shrink-0">
                          {f.avatar_url || f.photo_url ? <img src={f.avatar_url || f.photo_url || ''} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-muted text-sm font-black">{(f.nickname || f.first_name || '?')[0].toUpperCase()}</div>}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg2 ${f.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-black font-bold text-sm truncate">{f.nickname || f.first_name || 'Игрок'}</div>
                          <div className={`text-[10px] font-bold ${f.is_online ? 'text-green-600' : 'text-muted'}`}>{f.is_online ? 'в сети' : 'не в сети'}</div>
                        </div>
                      </button>
                      <button onClick={() => handleRemove(f.user_id)} disabled={busy === f.user_id}
                        className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:border-danger/40 hover:text-danger transition-colors disabled:opacity-40">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ==== ЗАПРОСЫ ==== */}
            {tab === 'requests' && (
              loading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {/* Входящие */}
                  <div>
                    <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                      <Inbox className="w-3 h-3 text-orange" /> Входящие ({incoming.length})
                    </div>
                    {incoming.length === 0 ? (
                      <div className="text-center text-muted text-xs py-4 bg-bg2 border border-dashed border-border rounded-xl">Нет входящих заявок</div>
                    ) : (
                      <div className="space-y-2">
                        {incoming.map((r) => (
                          <div key={r.id} className="bg-bg2 border border-border rounded-2xl p-3">
                            <button onClick={() => r.user && setSelectedUser(r.user.user_id)} className="w-full flex items-center gap-3 mb-3 text-left">
                              <div className="w-11 h-11 rounded-full bg-card border border-border overflow-hidden flex-shrink-0">
                                {r.user?.avatar_url || r.user?.photo_url ? <img src={r.user.avatar_url || r.user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-muted text-sm font-black">{(r.user?.nickname || r.user?.first_name || '?')[0].toUpperCase()}</div>}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-black font-bold text-sm truncate">{r.user?.nickname || r.user?.first_name || 'Игрок'}</div>
                                <div className="text-muted text-[10px]">хочет добавить тебя в друзья</div>
                              </div>
                            </button>
                            <div className="flex gap-2">
                              <button onClick={() => handleAccept(r)} disabled={busy === r.id}
                                className="flex-1 bg-green-500 text-white font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40">
                                <Check className="w-3.5 h-3.5" /> Принять
                              </button>
                              <button onClick={() => handleDecline(r)} disabled={busy === r.id}
                                className="flex-1 bg-danger/10 border border-danger/40 text-danger font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40">
                                <X className="w-3.5 h-3.5" /> Отклонить
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Исходящие */}
                  <div>
                    <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-orange" /> Отправленные ({outgoing.length})
                    </div>
                    {outgoing.length === 0 ? (
                      <div className="text-center text-muted text-xs py-4 bg-bg2 border border-dashed border-border rounded-xl">Нет отправленных</div>
                    ) : (
                      <div className="space-y-2">
                        {outgoing.map((r) => (
                          <div key={r.id} className="flex items-center gap-3 bg-bg2 border border-border rounded-2xl p-3">
                            <div className="w-10 h-10 rounded-full bg-card border border-border overflow-hidden flex-shrink-0">
                              {r.user?.avatar_url || r.user?.photo_url ? <img src={r.user.avatar_url || r.user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-muted text-xs font-black">{(r.user?.nickname || r.user?.first_name || '?')[0].toUpperCase()}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-black font-bold text-sm truncate">{r.user?.nickname || r.user?.first_name || 'Игрок'}</div>
                              <div className="text-muted text-[10px]">ожидает ответа</div>
                            </div>
                            <div className="text-muted text-[10px] flex items-center gap-1"><Clock className="w-3 h-3" /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* ==== ПОИСК ==== */}
            {tab === 'search' && (
              <>
                <div className="flex gap-2 mb-3">
                  <input value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    placeholder="Ник или Standoff ID"
                    className="flex-1 bg-bg2 border border-border rounded-xl px-3 py-2.5 text-black text-sm focus:border-orange" />
                  <button onClick={search} disabled={searching} className="bg-orange text-white rounded-xl px-4 disabled:opacity-40">
                    {searching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>

                {results.length === 0 ? (
                  <div className="text-center text-muted text-xs py-8">Введи ник или ID для поиска</div>
                ) : (
                  <div className="space-y-2">
                    {results.map((u) => {
                      const isFriend_ = isFriendUser(u.user_id);
                      const isOut = isPendingOut(u.user_id);
                      const isIn = isPendingIn(u.user_id);
                      return (
                        <div key={u.user_id} className="flex items-center gap-3 bg-bg2 border border-border rounded-2xl p-3">
                          <button onClick={() => setSelectedUser(u.user_id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                            <div className="w-10 h-10 rounded-full bg-card border border-border overflow-hidden flex-shrink-0">
                              {u.avatar_url || u.photo_url ? <img src={u.avatar_url || u.photo_url || ''} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-muted text-xs font-black">{(u.nickname || u.first_name || '?')[0].toUpperCase()}</div>}
                            </div>
                            <div className="min-w-0">
                              <div className="text-black font-bold text-sm truncate">{u.nickname || u.first_name || 'Игрок'}</div>
                              <div className="text-muted text-[10px]">ID {u.user_id}</div>
                            </div>
                          </button>
                          {isFriend_ ? (
                            <span className="text-green-600 text-[10px] font-black flex items-center gap-1"><Check className="w-3 h-3" /> Друг</span>
                          ) : isOut ? (
                            <span className="text-orange text-[10px] font-black flex items-center gap-1"><Clock className="w-3 h-3" /> Заявка</span>
                          ) : isIn ? (
                            <span className="text-orange text-[10px] font-black">Ответь в «Запросы»</span>
                          ) : (
                            <button onClick={() => handleSend(u.user_id)} disabled={busy === u.user_id}
                              className="w-8 h-8 rounded-lg bg-orange text-white flex items-center justify-center shadow-orange disabled:opacity-40">
                              {busy === u.user_id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg z-[90]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg z-[90]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUser && (
          <PlayerProfileModal userId={selectedUser} currentUserId={userId} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

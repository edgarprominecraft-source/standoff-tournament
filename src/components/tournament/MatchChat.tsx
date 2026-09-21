import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, MessageCircle, User as UserIcon, Shield,
  Clock, AlertTriangle, Bell, Check, Swords, Users,
} from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import { isOnline, timeAgo } from '../../lib/format';
import { callAdmin } from '../../lib/match';

type Props = {
  match: any;
  user: User;
  isAdmin: boolean;
  onClose: () => void;
};

type ChatMessage = {
  id: number;
  match_id: number;
  user_id: number;
  text: string;
  is_admin: boolean;
  created_at: string;
  author_name?: string;
  author_photo?: string | null;
  author_last_seen?: string | null;
  author_role?: string;
};

export default function MatchChat({ match, user, isAdmin, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [callReason, setCallReason] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [sendingCall, setSendingCall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('match_chat')
      .select('*')
      .eq('match_id', match.id)
      .order('created_at', { ascending: true });

    if (!data) return;

    const userIds = Array.from(new Set(data.map((m: any) => m.user_id)));
    if (userIds.length === 0) {
      setMessages([]);
      return;
    }

    const { data: users } = await supabase
      .from('users')
      .select('user_id, nickname, first_name, photo_url, avatar_url, last_seen, role')
      .in('user_id', userIds);

    const userMap = new Map<number, any>();
    (users ?? []).forEach((u) => userMap.set(u.user_id, u));

    const enriched: ChatMessage[] = data.map((m: any) => {
      const u = userMap.get(m.user_id);
      return {
        ...m,
        author_name: u?.nickname || u?.first_name || 'Игрок',
        author_photo: u?.avatar_url || u?.photo_url || null,
        author_last_seen: u?.last_seen || null,
        author_role: u?.role || null,
      };
    });

    setMessages(enriched);
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`match-chat-${match.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_chat', filter: `match_id=eq.${match.id}` },
        () => loadMessages()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [match.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    haptic('light');

    const { error } = await supabase.from('match_chat').insert({
      match_id: match.id,
      user_id: user.user_id,
      text: text.slice(0, 500),
      is_admin: isAdmin,
    });

    if (!error) {
      setInput('');
      hapticSuccess();
      await loadMessages();
    }
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  const submitCall = async () => {
    if (!callReason.trim()) {
      hapticError();
      return;
    }
    setSendingCall(true);
    haptic('medium');
    await callAdmin(match.id, user.user_id, callReason.trim());
    setSendingCall(false);
    setShowCallModal(false);
    setCallReason('');
    hapticSuccess();
    await supabase.from('match_chat').insert({
      match_id: match.id,
      user_id: user.user_id,
      text: `🚨 ВЫЗОВ АДМИНА: ${callReason.trim()}`,
      is_admin: false,
    });
    await loadMessages();
  };

  const scheduled = match.scheduled_time
    ? new Date(match.scheduled_time).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : 'не назначено';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Шапка */}
        <div className="bg-gradient-to-br from-orange to-orange2 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur border border-white/40 flex items-center justify-center flex-shrink-0">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-black text-sm truncate">
                  {match.team1?.clan_name || '?'} vs {match.team2?.clan_name || '?'}
                </div>
                <div className="text-white/80 text-[10px] uppercase tracking-widest font-bold">
                  Матч #{match.id}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-white/90 text-[11px]">
            <Clock className="w-3 h-3" />
            Время: {scheduled}
            {match.map && <span className="ml-2">· Карта: {match.map}</span>}
          </div>

          {isAdmin && (
            <div className="mt-3 bg-white/20 backdrop-blur border border-white/40 rounded-xl px-3 py-1.5 text-white text-[10px] font-bold flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Режим модератора — твои сообщения подсвечены
            </div>
          )}
        </div>

        {/* Чат */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle className="w-10 h-10 text-muted2 mx-auto mb-2" />
              <div className="text-muted text-xs">Напиши первым</div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const mine = m.user_id === user.user_id;
                const online = isOnline(m.author_last_seen);
                const isAdminMsg = m.author_role === 'admin' || m.author_role === 'moderator';

                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-card2 border border-border flex items-center justify-center overflow-hidden">
                        {m.author_photo ? (
                          <img src={m.author_photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-muted" strokeWidth={1.5} />
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg ${
                          online ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                    </div>

                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 ${
                        mine
                          ? isAdminMsg
                            ? 'bg-purple-500 text-white'
                            : 'bg-orange text-white'
                          : isAdminMsg
                          ? 'bg-purple-500/15 border border-purple-500/40 text-black'
                          : 'bg-card border border-border text-black'
                      }`}
                    >
                      {!mine && (
                        <div className="text-[10px] font-bold mb-0.5 opacity-80 flex items-center gap-1">
                          {m.author_name}
                          {isAdminMsg && (
                            <span className="bg-purple-500 text-white text-[8px] px-1 rounded uppercase">
                              ADMIN
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs break-words">{m.text}</div>
                      <div className={`text-[9px] mt-0.5 ${mine ? 'text-white/70' : 'text-muted'}`}>
                        {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Кнопка "Вызвать админа" */}
        {!isAdmin && (
          <button
            onClick={() => { haptic('medium'); setShowCallModal(true); }}
            className="mx-3 mb-2 bg-danger/10 border border-danger/30 text-danger rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" />
            Вызвать админа
          </button>
        )}

        {/* Ввод */}
        <div className="p-3 border-t border-border flex gap-2 bg-white">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Сообщение..."
            maxLength={500}
            className="flex-1 bg-bg2 border border-border rounded-xl px-3 py-3 text-black text-sm focus:border-orange transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="bg-orange text-white font-bold rounded-xl px-4 disabled:opacity-40 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Модалка вызова */}
        <AnimatePresence>
          {showCallModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={() => setShowCallModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white rounded-3xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                  <div className="text-black font-black">Вызов админа</div>
                </div>
                <p className="text-muted text-xs mb-3">
                  Опиши проблему. Админ получит уведомление и придёт в чат.
                </p>
                <textarea
                  value={callReason}
                  onChange={(e) => setCallReason(e.target.value)}
                  placeholder="Что случилось?"
                  rows={3}
                  maxLength={200}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-black text-sm resize-none mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCallModal(false)}
                    className="flex-1 bg-bg2 border border-border text-muted rounded-xl py-3 text-xs font-bold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={submitCall}
                    disabled={sendingCall || !callReason.trim()}
                    className="flex-1 bg-danger text-white rounded-xl py-3 text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    <Bell className="w-3 h-3" />
                    {sendingCall ? 'Отправка...' : 'Вызвать'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
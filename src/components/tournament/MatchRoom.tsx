import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, MessageCircle, Gamepad2, Swords, User as UserIcon } from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess } from '../../lib/telegram';
import { isOnline } from '../../lib/format';
import ConfirmBar from './ConfirmBar';
import MapPicker from './MapPicker';

type Props = {
  matchId: number;
  team1Id: number;
  team2Id: number;
  team1Name: string;
  team2Name: string;
  myTeamId: number | null;
  user: User;
  onClose: () => void;
};

type ChatMessage = {
  id: number;
  match_id: number;
  user_id: number;
  text: string;
  created_at: string;
  author_name?: string;
  author_photo?: string | null;
  author_last_seen?: string | null;
};

type Stage = 'confirm' | 'picks' | 'ready';

export default function MatchRoom({
  matchId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  myTeamId,
  user,
  onClose,
}: Props) {
  const [stage, setStage] = useState<Stage>('confirm');
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('match_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (!data) return;

    const userIds = Array.from(new Set(data.map((m: any) => m.user_id)));
    const { data: users } = await supabase
      .from('users')
      .select('user_id, nickname, first_name, photo_url, avatar_url, last_seen')
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
      };
    });

    setMessages(enriched);
  };

  useEffect(() => {
    loadMessages();

    // Realtime подписка на новые сообщения
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_messages',
          filter: `match_id=eq.${matchId}`,
        },
        () => loadMessages()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

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

    const { error } = await supabase.from('match_messages').insert({
      match_id: matchId,
      user_id: user.user_id,
      text: text.slice(0, 500),
    });

    if (!error) {
      setInput('');
      hapticSuccess();
      // Мгновенно подгружаем (не ждём realtime)
      await loadMessages();
    }
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  const reportResult = async (winnerTeamId: number) => {
    hapticSuccess();
    await supabase
      .from('matches')
      .update({ winner_id: winnerTeamId, status: 'done' })
      .eq('id', matchId);
    setTimeout(onClose, 500);
  };

  const stageLabel =
    stage === 'confirm' ? 'Подтверждение' : stage === 'picks' ? 'Пик карты' : 'Матч';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-bg z-50 flex flex-col"
    >
      <div className="border-b border-border p-4 flex items-center gap-3 sticky top-0 bg-bg/95 backdrop-blur z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-card border border-border hover:border-orange/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-bold truncate flex items-center gap-2">
            <span className="truncate">{team1Name}</span>
            <Swords className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            <span className="truncate">{team2Name}</span>
          </div>
          <div className="text-muted text-[10px] uppercase tracking-widest">{stageLabel}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {stage === 'confirm' && (
          <div className="p-4">
            <ConfirmBar
              matchId={matchId}
              team1Id={team1Id}
              team2Id={team2Id}
              myTeamId={myTeamId}
              user={user}
              onBothConfirmed={() => setStage('picks')}
            />

            <div className="mt-4 bg-card border border-border rounded-2xl p-4">
              <div className="text-white font-bold text-sm mb-3">Что происходит</div>
              <ul className="text-muted text-xs space-y-2 leading-relaxed">
                <li className="flex gap-2"><span className="text-white/40">—</span><span>Обе команды нажимают «Я в сети»</span></li>
                <li className="flex gap-2"><span className="text-white/40">—</span><span>Таймер: 3 минуты на всё</span></li>
                <li className="flex gap-2"><span className="text-white/40">—</span><span>Если команда не подтвердила — вылет</span></li>
                <li className="flex gap-2"><span className="text-white/40">—</span><span>После подтверждения — выбор карты</span></li>
              </ul>
            </div>
          </div>
        )}

        {stage === 'picks' && (
          <div className="p-4">
            <MapPicker
              matchId={matchId}
              team1Id={team1Id}
              team2Id={team2Id}
              myTeamId={myTeamId}
              user={user}
              onMapSelected={(mapId) => {
                setSelectedMap(mapId);
                setStage('ready');
              }}
            />
          </div>
        )}

        {stage === 'ready' && (
          <div className="p-4 space-y-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-white/40 rounded-2xl p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/30 mb-3"
              >
                <Gamepad2 className="w-7 h-7 text-white" strokeWidth={1.5} />
              </motion.div>
              <div className="text-white font-bold mb-1">Матч готов</div>
              {selectedMap && (
                <div className="text-muted text-xs mb-3">
                  Карта: <span className="text-white font-semibold">{selectedMap}</span>
                </div>
              )}
              <div className="text-muted text-xs leading-relaxed">
                Создайте лобби в Standoff 2 и играйте. Ниже — чат с соперником.
              </div>
            </motion.div>

            {myTeamId && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => reportResult(team1Id)}
                  className="bg-white/5 border border-border text-white text-xs rounded-xl py-3 hover:bg-white/10 transition-colors font-semibold"
                >
                  Победила {team1Name}
                </button>
                <button
                  onClick={() => reportResult(team2Id)}
                  className="bg-white/5 border border-border text-white text-xs rounded-xl py-3 hover:bg-white/10 transition-colors font-semibold"
                >
                  Победила {team2Name}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="px-4 pb-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <div className="text-white text-xs font-bold uppercase tracking-wide">
                  Чат матча
                </div>
              </div>
              <div className="text-muted text-[10px]">{messages.length} сообщ.</div>
            </div>

            <div ref={scrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-muted text-xs text-center py-8">Напиши первым</div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const mine = m.user_id === user.user_id;
                    const online = isOnline(m.author_last_seen);
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
                          <div className="w-7 h-7 rounded-full bg-card2 border border-border flex items-center justify-center overflow-hidden">
                            {m.author_photo ? (
                              <img src={m.author_photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card2 ${
                            online ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div
                          className={`max-w-[70%] rounded-2xl px-3 py-2 ${
                            mine ? 'bg-white text-black' : 'bg-card2 text-white'
                          }`}
                        >
                          {!mine && (
                            <div className="text-[10px] font-semibold mb-0.5 opacity-70">
                              {m.author_name}
                            </div>
                          )}
                          <div className="text-xs break-words">{m.text}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Сообщение..."
                maxLength={500}
                className="flex-1 bg-bg border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:border-white/40 transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="bg-white text-black font-bold rounded-xl px-4 py-2.5 disabled:opacity-40 hover:bg-white/90 transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess } from '../../lib/telegram';
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

  // ===== Загрузка сообщений =====
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
      .select('user_id, nickname, first_name, photo_url')
      .in('user_id', userIds);

    const userMap = new Map<number, any>();
    (users ?? []).forEach((u) => userMap.set(u.user_id, u));

    const enriched: ChatMessage[] = data.map((m: any) => {
      const u = userMap.get(m.user_id);
      return {
        ...m,
        author_name: u?.nickname || u?.first_name || 'Игрок',
        author_photo: u?.photo_url ?? null,
      };
    });

    setMessages(enriched);
  };

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_messages',
          filter: `match_id=eq.${matchId}`,
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // ===== Автоскролл чата =====
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // ===== Отправка сообщения =====
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

    setSending(false);

    if (!error) {
      setInput('');
      hapticSuccess();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  // ===== Завершение матча (заглушка для будущей логики) =====
  const reportResult = async (winnerTeamId: number) => {
    hapticSuccess();
    await supabase
      .from('matches')
      .update({ winner_id: winnerTeamId, status: 'done' })
      .eq('id', matchId);
    setTimeout(onClose, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-bg z-50 flex flex-col"
    >
      {/* Заголовок */}
      <div className="border-b border-border p-4 flex items-center gap-3">
        <button
          onClick={onClose}
          className="text-muted hover:text-white text-xl"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-bold truncate">
            {team1Name} <span className="text-muted">vs</span> {team2Name}
          </div>
          <div className="text-muted text-[10px] uppercase tracking-widest">
            {stage === 'confirm'
              ? 'Подтверждение'
              : stage === 'picks'
              ? 'Пик карты'
              : 'Матч'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Стадия 1: Подтверждение */}
        {stage === 'confirm' && (
          <div className="p-4">
            <ConfirmBar
              matchId={matchId}
              team1Id={team1Id}
              team2Id={team2Id}
              myTeamId={myTeamId}
              user={user}
              onBothConfirmed={() => {
                setStage('picks');
              }}
            />

            <div className="mt-4 bg-card border border-border rounded-2xl p-4">
              <div className="text-white font-bold text-sm mb-2">
                Что происходит?
              </div>
              <ul className="text-muted text-xs space-y-1 leading-relaxed">
                <li>• Обе команды жмут «Я в сети»</li>
                <li>• Таймер: 3 минуты на всё</li>
                <li>• Если команда не подтвердила — вылет</li>
                <li>• После подтверждения — выбор карты</li>
              </ul>
            </div>
          </div>
        )}

        {/* Стадия 2: Пик карт */}
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

        {/* Стадия 3: Матч готов */}
        {stage === 'ready' && (
          <div className="p-4 space-y-3">
            <div className="bg-card border border-white/40 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">🎮</div>
              <div className="text-white font-bold mb-1">Матч готов</div>
              {selectedMap && (
                <div className="text-muted text-xs mb-3">
                  Карта: <span className="text-white">{selectedMap}</span>
                </div>
              )}
              <div className="text-muted text-xs">
                Создайте лобби в Standoff 2 и играйте. Ниже — чат с соперником.
              </div>
            </div>

            {/* Кнопки репорта результата (для капитана) */}
            {myTeamId && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => reportResult(team1Id)}
                  className="bg-white/10 border border-border text-white text-xs rounded-xl py-3"
                >
                  Победила {team1Name}
                </button>
                <button
                  onClick={() => reportResult(team2Id)}
                  className="bg-white/10 border border-border text-white text-xs rounded-xl py-3"
                >
                  Победила {team2Name}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== ЧАТ (виден на всех стадиях) ===== */}
        <div className="px-4 pb-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-white text-xs font-bold uppercase tracking-wide">
                💬 Чат матча
              </div>
              <div className="text-muted text-[10px]">
                {messages.length} сообщ.
              </div>
            </div>

            <div
              ref={scrollRef}
              className="h-64 overflow-y-auto px-4 py-3 space-y-3"
            >
              {messages.length === 0 ? (
                <div className="text-muted text-xs text-center py-8">
                  Напиши первым
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const mine = m.user_id === user.user_id;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${
                          mine ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {m.author_photo ? (
                          <img
                            src={m.author_photo}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-card2 border border-border flex items-center justify-center text-[10px] flex-shrink-0">
                            👤
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-3 py-2 ${
                            mine
                              ? 'bg-white text-black'
                              : 'bg-card2 text-white'
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

            {/* Поле ввода */}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Сообщение..."
                maxLength={500}
                className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-white text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="bg-white text-black font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
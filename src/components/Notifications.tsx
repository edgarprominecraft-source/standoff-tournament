import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { type User } from '../supabase';
import { haptic, hapticSuccess } from '../lib/telegram';
import {
  getMyNotifications, getUnreadCount, markAsRead, markAllAsRead,
} from '../lib/admin';

type Props = { user: User };

export default function Notifications({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUnread = async () => {
    const c = await getUnreadCount(user.user_id);
    setUnread(c);
  };

  const loadItems = async () => {
    setLoading(true);
    const data = await getMyNotifications(user.user_id, 30);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000); // каждые 30 сек
    return () => clearInterval(interval);
  }, [user.user_id]);

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  const handleOpenItem = async (n: any) => {
    haptic('light');
    if (!n.read) {
      await markAsRead(n.id);
      setItems(items.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnread(Math.max(0, unread - 1));
    }
    if (n.link && n.link.startsWith('http')) {
      window.open(n.link, '_blank');
    }
  };

  const handleReadAll = async () => {
    haptic('medium');
    await markAllAsRead(user.user_id);
    setItems(items.map((i) => ({ ...i, read: true })));
    setUnread(0);
    hapticSuccess();
  };

  return (
    <>
      {/* Колокольчик */}
      <button
        onClick={() => { haptic('light'); setOpen(true); }}
        className="relative w-10 h-10 rounded-xl bg-bg2 border border-border flex items-center justify-center hover:border-orange/40 transition-colors"
      >
        <Bell className="w-4 h-4 text-black" />
        {unread > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-orange text-white text-[10px] font-black flex items-center justify-center px-1"
          >
            {unread > 99 ? '99+' : unread}
          </motion.div>
        )}
      </button>

      {/* Модалка */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange" />
                  <div className="text-black font-black">Уведомления</div>
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={handleReadAll}
                      className="text-[10px] text-orange font-bold flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Прочитать все
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-bg2 flex items-center justify-center">
                    <X className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="text-center text-muted text-sm py-8">Загрузка...</div>
                ) : items.length === 0 ? (
                  <div className="text-center text-muted text-sm py-8">Уведомлений нет</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleOpenItem(n)}
                        className={`w-full text-left rounded-xl p-3 border transition-colors ${
                          n.read
                            ? 'bg-bg2 border-border'
                            : 'bg-orange/5 border-orange/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && (
                            <div className="w-2 h-2 rounded-full bg-orange flex-shrink-0 mt-1.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-black font-bold text-sm">{n.title}</div>
                            {n.body && (
                              <div className="text-muted text-xs mt-0.5 leading-relaxed">{n.body}</div>
                            )}
                            <div className="text-muted text-[10px] mt-1">
                              {new Date(n.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
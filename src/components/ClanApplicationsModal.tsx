import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, UserX, Users, Check, XCircle } from 'lucide-react';
import {
  getClanApplications,
  approveApplication,
  rejectApplication,
  type ClanApplication,
} from '../lib/clan';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';
import { supabase } from '../supabase';
import PlayerProfileModal from './PlayerProfileModal';

type Props = {
  clanId: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

export default function ClanApplicationsModal({ clanId, onClose, onCountChange }: Props) {
  const [apps, setApps] = useState<ClanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getClanApplications(clanId);
    setApps(data);
    onCountChange?.(data.length);
    setLoading(false);
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`clan-apps-${clanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clan_applications', filter: `clan_id=eq.${clanId}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clanId]);

  const approve = async (app: ClanApplication) => {
    if (busy) return;
    setBusy(app.id);
    haptic('medium');
    try {
      await approveApplication(app.id, app.user_id, clanId);
      hapticSuccess();
      await load();
    } catch (e) {
      hapticError();
    }
    setBusy(null);
  };

  const reject = async (app: ClanApplication) => {
    if (busy) return;
    setBusy(app.id);
    haptic('medium');
    try {
      await rejectApplication(app.id);
      hapticSuccess();
      await load();
    } catch (e) {
      hapticError();
    }
    setBusy(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col"
        >
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange" />
              <div className="text-black font-black">Заявки в клан</div>
              <span className="text-muted text-xs">· {apps.length}</span>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center">
              <X className="w-4 h-4 text-black" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-orange/20 border-t-orange rounded-full animate-spin" />
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted mx-auto mb-3" />
                <div className="text-muted text-sm">Нет новых заявок</div>
              </div>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="bg-bg2 border border-border rounded-2xl p-3"
                  >
                    <button
                      onClick={() => setSelectedUser(a.user_id)}
                      className="w-full flex items-center gap-3 mb-3 text-left"
                    >
                      <div className="w-11 h-11 rounded-full bg-card border border-border overflow-hidden flex-shrink-0">
                        {a.user?.avatar_url || a.user?.photo_url ? (
                          <img src={a.user.avatar_url || a.user.photo_url || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted text-sm font-black">
                            {(a.user?.nickname || a.user?.first_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-black font-bold text-sm truncate">
                          {a.user?.nickname || a.user?.first_name || 'Игрок'}
                        </div>
                        <div className="text-muted text-[10px]">
                          ID: {a.user?.standoff_id || '—'}
                        </div>
                      </div>
                    </button>

                    {a.message && (
                      <div className="bg-white border border-border rounded-xl p-2.5 mb-3">
                        <div className="text-muted text-[10px] uppercase tracking-wider font-bold mb-1">Сообщение</div>
                        <div className="text-black text-xs leading-relaxed">{a.message}</div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(a)}
                        disabled={busy === a.id}
                        className="flex-1 bg-green-500 text-white font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-green-600 transition-colors"
                      >
                        {busy === a.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Принять
                      </button>
                      <button
                        onClick={() => reject(a)}
                        disabled={busy === a.id}
                        className="flex-1 bg-danger/10 border border-danger/40 text-danger font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-danger/20 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Отклонить
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selectedUser && (
          <PlayerProfileModal
            userId={selectedUser}
            currentUserId={0}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

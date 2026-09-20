import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, User as UserIcon, Shield } from 'lucide-react';
import type { BracketTeam } from '../../lib/bracket';

type Props = {
  team: BracketTeam;
  onClose: () => void;
};

export default function TeamInfoModal({ team, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-gradient-to-br from-orange to-orange2 p-5 z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur border border-white/40 flex items-center justify-center overflow-hidden">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : team.captain_photo ? (
                    <img src={team.captain_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Shield className="w-7 h-7 text-white" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-white font-black text-lg truncate">{team.name}</div>
                  <div className="text-white/80 text-[11px] font-bold flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    {team.players.length} / 5 игроков
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur border border-white/40 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
              Состав команды
            </div>
            <div className="space-y-2">
              {team.players.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-bg2 border border-border rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.photo ? (
                      <img src={p.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-black font-bold text-sm truncate">{p.name}</div>
                    <div className="text-muted text-[10px] font-medium">
                      {p.standoff_id ? `ID: ${p.standoff_id}` : 'ID не указан'}
                    </div>
                  </div>
                  {i === 0 && (
                    <div className="text-[10px] px-2 py-0.5 rounded-md bg-orange/10 border border-orange/30 text-orange font-bold uppercase tracking-wider flex-shrink-0">
                      Капитан
                    </div>
                  )}
                </motion.div>
              ))}

              {Array.from({ length: Math.max(0, 5 - team.players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="bg-bg2/50 border border-dashed border-border2 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-card border border-dashed border-border2 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-muted2" strokeWidth={1.5} />
                  </div>
                  <div className="text-muted2 text-xs font-medium">Свободный слот</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
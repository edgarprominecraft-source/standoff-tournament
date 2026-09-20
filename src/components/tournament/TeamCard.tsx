import { motion } from 'framer-motion';
import type { BracketTeam } from '../../lib/bracket';

type Props = {
  team: BracketTeam | null;
  winner?: boolean;
  onClick?: () => void;
  compact?: boolean;
};

export default function TeamCard({ team, winner, onClick, compact }: Props) {
  if (!team) {
    return (
      <div
        className={`bg-card2 border border-border rounded-xl flex items-center justify-center ${
          compact ? 'p-2 min-h-[44px]' : 'p-3 min-h-[60px]'
        }`}
      >
        <span className="text-muted text-xs">Ожидание...</span>
      </div>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : {}}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full text-left bg-card border rounded-xl transition-colors ${
        winner
          ? 'border-white shadow-glow'
          : 'border-border hover:border-white/40'
      } ${compact ? 'p-2' : 'p-3'} ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-2">
        {team.player1_photo ? (
          <img
            src={team.player1_photo}
            alt=""
            className={`rounded-full object-cover border border-border ${
              compact ? 'w-6 h-6' : 'w-8 h-8'
            }`}
          />
        ) : (
          <div
            className={`rounded-full bg-card2 border border-border flex items-center justify-center text-xs ${
              compact ? 'w-6 h-6' : 'w-8 h-8'
            }`}
          >
            👤
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            className={`text-white truncate font-semibold ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {team.player1_name || 'Игрок 1'}
          </div>
          {team.player2_name ? (
            <div
              className={`text-muted truncate ${
                compact ? 'text-[10px]' : 'text-xs'
              }`}
            >
              {team.player2_name}
            </div>
          ) : (
            <div
              className={`text-muted/60 italic ${
                compact ? 'text-[10px]' : 'text-xs'
              }`}
            >
              нет напарника
            </div>
          )}
        </div>
        {winner && (
          <div className="text-white text-lg" title="Победитель">
            ✓
          </div>
        )}
      </div>
    </motion.button>
  );
}
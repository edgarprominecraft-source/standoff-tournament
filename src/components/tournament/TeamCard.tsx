import { motion } from 'framer-motion';
import { User as UserIcon, Check, Clock } from 'lucide-react';
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
        <div className="flex items-center gap-1.5 text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">Ожидание</span>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : {}}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full text-left bg-card border rounded-xl transition-all duration-200 ${
        winner
          ? 'border-white shadow-glow'
          : 'border-border hover:border-white/40'
      } ${compact ? 'p-2' : 'p-3'} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`rounded-full bg-card2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0 ${
            compact ? 'w-6 h-6' : 'w-8 h-8'
          }`}
        >
          {team.player1_photo ? (
            <img src={team.player1_photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-muted`} strokeWidth={1.5} />
          )}
        </div>

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
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-black" strokeWidth={3} />
          </div>
        )}
      </div>
    </motion.button>
  );
}
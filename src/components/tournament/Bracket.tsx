import { motion } from 'framer-motion';
import { Swords, Trophy } from 'lucide-react';
import type { BracketMatch } from '../../lib/bracket';
import { roundName } from '../../lib/bracket';
import TeamCard from './TeamCard';

type Props = {
  rounds: BracketMatch[][];
  onMatchClick?: (match: BracketMatch) => void;
  currentMatchId?: number;
};

export default function Bracket({ rounds, onMatchClick, currentMatchId }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-card">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-orange/10 border border-orange/30 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-orange" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-muted text-sm font-medium">Сетка ещё не построена</div>
      </div>
    );
  }

  const totalRounds = rounds.length;

  return (
    <div className="space-y-6">
      {rounds.map((round, rIdx) => (
        <motion.div
          key={rIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: rIdx * 0.06 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 px-1">
            <div className="text-orange font-black text-[11px] uppercase tracking-[0.2em]">
              {roundName(rIdx + 1, totalRounds)}
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className="text-muted text-[10px] uppercase tracking-wider font-bold">
              {round.length} {round.length === 1 ? 'матч' : 'матча'}
            </div>
          </div>

          <div className="space-y-2">
            {round.map((match, mIdx) => {
              const isCurrent = match.matchId === currentMatchId;
              const hasWinner = !!match.winner;
              return (
                <motion.div
                  key={mIdx}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: rIdx * 0.06 + mIdx * 0.02 }}
                  className={`bg-bg2/50 border rounded-2xl p-2 space-y-1 transition-all duration-300 ${
                    isCurrent
                      ? 'border-orange shadow-orange'
                      : hasWinner
                      ? 'border-orange/30'
                      : 'border-border'
                  }`}
                >
                  <TeamCard
                    team={match.team1}
                    winner={match.winner?.id === match.team1?.id && !!match.winner}
                    compact
                    onClick={
                      match.team1 && match.matchId && onMatchClick
                        ? () => onMatchClick(match)
                        : undefined
                    }
                  />

                  <div className="flex items-center justify-center py-0.5">
                    <div className="flex items-center gap-1.5 text-muted">
                      <div className="w-6 h-px bg-border" />
                      <Swords className="w-3 h-3 text-orange" />
                      <div className="w-6 h-px bg-border" />
                    </div>
                  </div>

                  <TeamCard
                    team={match.team2}
                    winner={match.winner?.id === match.team2?.id && !!match.winner}
                    compact
                    onClick={
                      match.team2 && match.matchId && onMatchClick
                        ? () => onMatchClick(match)
                        : undefined
                    }
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
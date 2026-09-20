import { motion } from 'framer-motion';
import { Trophy, Swords, Users } from 'lucide-react';
import type { BracketMatch } from '../../lib/bracket';
import { roundName } from '../../lib/bracket';

type Props = {
  rounds: BracketMatch[][];
  onMatchClick?: (match: BracketMatch) => void;
};

export default function BigBracket({ rounds, onMatchClick }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-card">
        <Trophy className="w-12 h-12 text-orange mx-auto mb-3" strokeWidth={1.5} />
        <div className="text-muted text-sm font-medium">Сетка ещё не построена</div>
      </div>
    );
  }

  const totalRounds = rounds.length;

  const getRoundLabel = (rIdx: number) => {
    const fromEnd = totalRounds - rIdx - 1;
    if (fromEnd === 0) return 'Финал';
    if (fromEnd === 1) return '1/2';
    if (fromEnd === 2) return '1/4';
    if (fromEnd === 3) return '1/8';
    return roundName(rIdx + 1, totalRounds);
  };

  return (
    <div className="bg-white rounded-3xl border border-border p-4 shadow-card overflow-x-auto">
      <div className="flex gap-3 mb-4 min-w-max">
        {rounds.map((round, rIdx) => (
          <div key={rIdx} className="flex-shrink-0" style={{ width: rIdx === 0 ? 200 : 180 }}>
            <div className="text-center">
              <div className="text-orange text-[11px] font-black uppercase tracking-widest">
                {getRoundLabel(rIdx)}
              </div>
              <div className="text-muted text-[10px] font-bold mt-0.5">
                {round.length} {round.length === 1 ? 'матч' : 'матчей'}
              </div>
            </div>
          </div>
        ))}
        <div className="flex-shrink-0 w-[140px]">
          <div className="text-center">
            <div className="text-orange text-[11px] font-black uppercase tracking-widest">
              Победитель
            </div>
            <div className="text-muted text-[10px] font-bold mt-0.5">🏆</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 min-w-max items-stretch">
        {rounds.map((round, rIdx) => {
          const isFirstRound = rIdx === 0;
          const isLastRound = rIdx === rounds.length - 1;

          return (
            <div key={rIdx} className="flex-shrink-0 flex flex-col justify-around" style={{ width: isFirstRound ? 200 : 180 }}>
              {round.map((match, mIdx) => {
                const hasNext = !isLastRound;

                return (
                  <div
                    key={mIdx}
                    className="relative flex items-center"
                    style={{
                      flex: 1,
                      minHeight: isFirstRound ? 80 : 80,
                    }}
                  >
                    <div className="flex-1 z-10">
                      <MatchCard
                        match={match}
                        label={`M${mIdx + 1}`}
                        onClick={
                          match.matchId && onMatchClick
                            ? () => onMatchClick(match)
                            : undefined
                        }
                      />
                    </div>

                    {hasNext && (
                      <>
                        <div
                          className="absolute bg-orange/40"
                          style={{ right: -12, top: '50%', width: 12, height: 2 }}
                        />
                        {mIdx % 2 === 0 && (
                          <div
                            className="absolute bg-orange/40"
                            style={{ right: -12, top: '50%', width: 2, height: 'calc(50% + 40px)' }}
                          />
                        )}
                        {mIdx % 2 === 1 && (
                          <div
                            className="absolute bg-orange/40"
                            style={{ right: -12, bottom: '50%', width: 2, height: 'calc(50% + 40px)' }}
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="flex-shrink-0 flex flex-col justify-center" style={{ width: 140 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-orange to-orange2 rounded-2xl p-4 text-center shadow-orange"
          >
            <Trophy className="w-8 h-8 text-white mx-auto mb-1.5" strokeWidth={2} />
            <div className="text-white font-black text-xs uppercase tracking-wider">Чемпион</div>
            {rounds[rounds.length - 1]?.[0]?.winner ? (
              <div className="text-white text-sm font-bold mt-2 truncate">
                {rounds[rounds.length - 1][0].winner!.name || '—'}
              </div>
            ) : (
              <div className="text-white/60 text-[10px] mt-2 font-semibold">Пока нет</div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  label,
  onClick,
}: {
  match: BracketMatch;
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={!onClick}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={`w-full bg-white border rounded-xl p-2 text-left transition-all ${
        onClick
          ? 'border-border hover:border-orange hover:shadow-card cursor-pointer'
          : 'border-border'
      } ${match.winner ? 'border-orange/60 bg-orange/5' : ''}`}
    >
      <div className="text-[9px] text-muted font-bold mb-1 flex items-center gap-1">
        <Swords className="w-2.5 h-2.5" />
        {label}
      </div>

      <TeamRow
        team={match.team1}
        isWinner={match.winner?.id === match.team1?.id && !!match.winner}
      />

      <div className="h-px bg-border mx-1 my-1" />

      <TeamRow
        team={match.team2}
        isWinner={match.winner?.id === match.team2?.id && !!match.winner}
      />
    </motion.button>
  );
}

function TeamRow({
  team,
  isWinner,
}: {
  team: BracketMatch['team1'];
  isWinner: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-md bg-bg2 border border-dashed border-border2 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-muted2">?</span>
        </div>
        <div className="text-[10px] font-bold text-muted2 truncate flex-1">
          Ожидание
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
        {team.logo_url ? (
          <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
        ) : team.captain_photo ? (
          <img src={team.captain_photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] text-white font-black">
            {team.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        )}
      </div>
      <div className={`text-[10px] font-bold truncate flex-1 ${
        isWinner ? 'text-orange' : 'text-black'
      }`}>
        {team.name || 'Команда'}
      </div>
      <div className="text-[9px] text-muted font-bold flex items-center gap-0.5 flex-shrink-0">
        <Users className="w-2.5 h-2.5" />
        {team.players.length}
      </div>
      {isWinner && (
        <div className="w-3 h-3 rounded-full bg-orange flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[7px] font-black">✓</span>
        </div>
      )}
    </div>
  );
}
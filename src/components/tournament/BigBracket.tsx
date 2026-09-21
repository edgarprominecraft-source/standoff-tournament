import { motion } from 'framer-motion';
import { Trophy, Swords, Shield } from 'lucide-react';
import type { BracketMatch } from '../../lib/bracket';
import { roundName } from '../../lib/bracket';

type Props = {
  rounds: BracketMatch[][];
  onMatchClick?: (match: BracketMatch) => void;
};

function getRoundLabel(rIdx: number, totalRounds: number): string {
  const fromEnd = totalRounds - rIdx - 1;
  if (fromEnd === 0) return 'Финал';
  if (fromEnd === 1) return '1/2';
  if (fromEnd === 2) return '1/4';
  if (fromEnd === 3) return '1/8';
  if (fromEnd === 4) return '1/16';
  return roundName(rIdx + 1, totalRounds);
}

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
  const finalRoundIdx = totalRounds - 1;

  // Разбиваем каждую non-final раунд на левую/правую половины
  const leftRounds: { rIdx: number; matches: BracketMatch[] }[] = [];
  const rightRounds: { rIdx: number; matches: BracketMatch[] }[] = [];

  for (let r = 0; r < finalRoundIdx; r++) {
    const round = rounds[r];
    const half = Math.ceil(round.length / 2);
    leftRounds.push({ rIdx: r, matches: round.slice(0, half) });
    rightRounds.push({ rIdx: r, matches: round.slice(half) });
  }

  // Правая сторона отображается в обратном порядке (ближе к центру — меньшие раунды)
  const rightRoundsOrdered = [...rightRounds].reverse();

  const finalMatch = rounds[finalRoundIdx]?.[0];
  const champion = finalMatch?.winner;

  return (
    <div className="bg-white rounded-3xl border border-border p-4 shadow-card overflow-x-auto">
      <div className="flex items-stretch min-w-max gap-2">
        {/* ===== ЛЕВАЯ СТОРОНА ===== */}
        <div className="flex gap-2">
          {leftRounds.map((r) => (
            <BracketColumn
              key={`L-${r.rIdx}`}
              matches={r.matches}
              label={getRoundLabel(r.rIdx, totalRounds)}
              side="left"
              onMatchClick={onMatchClick}
            />
          ))}
        </div>

        {/* ===== ЦЕНТР: ФИНАЛ + ЧЕМПИОН ===== */}
        <div className="flex flex-col justify-center gap-3 px-2">
          <div className="text-center">
            <div className="text-orange text-[11px] font-black uppercase tracking-widest">
              Финал
            </div>
            <div className="text-muted text-[10px] font-bold mt-0.5">1 матч</div>
          </div>

          <div className="w-[200px]">
            <MatchCard
              match={finalMatch}
              label="Финал"
              onClick={
                finalMatch?.matchId && onMatchClick
                  ? () => onMatchClick(finalMatch)
                  : undefined
              }
            />
          </div>

          {/* Чемпион */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-orange to-orange2 rounded-2xl p-4 text-center shadow-orange"
          >
            <Trophy className="w-8 h-8 text-white mx-auto mb-1.5" strokeWidth={2} />
            <div className="text-white font-black text-xs uppercase tracking-wider">
              Чемпион
            </div>
            {champion ? (
              <div className="text-white text-sm font-bold mt-2 truncate">
                {champion.name || '—'}
              </div>
            ) : (
              <div className="text-white/60 text-[10px] mt-2 font-semibold">
                Пока нет
              </div>
            )}
          </motion.div>
        </div>

        {/* ===== ПРАВАЯ СТОРОНА (обратный порядок) ===== */}
        <div className="flex gap-2">
          {rightRoundsOrdered.map((r) => (
            <BracketColumn
              key={`R-${r.rIdx}`}
              matches={r.matches}
              label={getRoundLabel(r.rIdx, totalRounds)}
              side="right"
              onMatchClick={onMatchClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Колонка раунда =====
function BracketColumn({
  matches,
  label,
  side,
  onMatchClick,
}: {
  matches: BracketMatch[];
  label: string;
  side: 'left' | 'right';
  onMatchClick?: (match: BracketMatch) => void;
}) {
  return (
    <div className="flex-shrink-0 flex flex-col" style={{ width: 200 }}>
      {/* Заголовок */}
      <div className="text-center mb-3">
        <div className="text-orange text-[11px] font-black uppercase tracking-widest">
          {label}
        </div>
        <div className="text-muted text-[10px] font-bold mt-0.5">
          {matches.length} {matches.length === 1 ? 'матч' : 'матчей'}
        </div>
      </div>

      {/* Матчи распределены по вертикали */}
      <div className="flex-1 flex flex-col justify-around gap-2">
        {matches.map((m, mIdx) => (
          <div key={mIdx} className="relative">
            <MatchCard
              match={m}
              label={`M${mIdx + 1}`}
              onClick={
                m.matchId && onMatchClick ? () => onMatchClick(m) : undefined
              }
            />

            {/* Линия к следующему раунду */}
            <div
              className="absolute bg-orange/40"
              style={{
                [side === 'left' ? 'right' : 'left']: -8,
                top: '50%',
                width: 8,
                height: 2,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Карточка матча =====
function MatchCard({
  match,
  label,
  onClick,
}: {
  match: BracketMatch | undefined;
  label: string;
  onClick?: () => void;
}) {
  if (!match) {
    return (
      <div className="bg-bg2 border border-dashed border-border2 rounded-xl p-2 text-center">
        <div className="text-[9px] text-muted font-bold mb-1 flex items-center justify-center gap-1">
          <Swords className="w-2.5 h-2.5" />
          {label}
        </div>
        <div className="text-[10px] text-muted2 font-bold py-2">Ожидание</div>
      </div>
    );
  }

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

// ===== Строка клана =====
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
        ) : (
          <Shield className="w-3 h-3 text-white" strokeWidth={2.5} />
        )}
      </div>
      <div
        className={`text-[10px] font-bold truncate flex-1 ${
          isWinner ? 'text-orange' : 'text-black'
        }`}
      >
        {team.name || 'Клан'}
      </div>
      {isWinner && (
        <div className="w-3 h-3 rounded-full bg-orange flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[7px] font-black">✓</span>
        </div>
      )}
    </div>
  );
}
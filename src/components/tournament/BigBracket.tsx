import { motion } from 'framer-motion';
import { Trophy, Swords, Shield, Clock, MessageCircle } from 'lucide-react';
import type { BracketMatch, BracketTeam } from '../../lib/bracket';
import { roundName } from '../../lib/bracket';

type Props = {
  rounds: BracketMatch[][];
  onMatchClick?: (match: BracketMatch) => void;
  onTeamClick?: (team: BracketTeam) => void;
  myTeamId?: number | null;
  matchTimeMap?: Record<number, string | null>;
};

function getRoundLabel(rIdx: number, totalRounds: number): string {
  const fromEnd = totalRounds - rIdx - 1;
  if (fromEnd === 0) return 'Финал';
  if (fromEnd === 1) return 'Полуфинал';
  if (fromEnd === 2) return 'Четвертьфинал';
  if (fromEnd === 3) return '1/8 финала';
  if (fromEnd === 4) return '1/16 финала';
  if (fromEnd === 5) return '1/32 финала';
  return roundName(rIdx + 1, totalRounds);
}

export default function BigBracket({
  rounds,
  onMatchClick,
  onTeamClick,
  myTeamId,
  matchTimeMap = {},
}: Props) {
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

  const leftRounds: { rIdx: number; matches: BracketMatch[] }[] = [];
  const rightRounds: { rIdx: number; matches: BracketMatch[] }[] = [];

  for (let r = 0; r < finalRoundIdx; r++) {
    const round = rounds[r];
    const half = Math.ceil(round.length / 2);
    leftRounds.push({ rIdx: r, matches: round.slice(0, half) });
    rightRounds.push({ rIdx: r, matches: round.slice(half) });
  }

  const rightRoundsOrdered = [...rightRounds].reverse();
  const finalMatch = rounds[finalRoundIdx]?.[0];
  const champion = finalMatch?.winner;

  return (
    <div className="bg-white rounded-3xl border border-border p-4 shadow-card overflow-x-auto">
      <div className="flex items-stretch min-w-max gap-4">
        {/* ЛЕВАЯ СТОРОНА */}
        <div className="flex gap-5">
          {leftRounds.map((r) => (
            <BracketColumn
              key={`L-${r.rIdx}`}
              matches={r.matches}
              label={getRoundLabel(r.rIdx, totalRounds)}
              side="left"
              onMatchClick={onMatchClick}
              onTeamClick={onTeamClick}
              myTeamId={myTeamId}
              matchTimeMap={matchTimeMap}
            />
          ))}
        </div>

        {/* ЦЕНТР: ФИНАЛ + ЧЕМПИОН */}
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
              onClick={finalMatch?.matchId && onMatchClick ? () => onMatchClick(finalMatch) : undefined}
              onTeamClick={onTeamClick}
              myTeamId={myTeamId}
              scheduledTime={finalMatch?.matchId ? matchTimeMap[finalMatch.matchId] ?? null : null}
            />
          </div>

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

        {/* ПРАВАЯ СТОРОНА */}
        <div className="flex gap-5">
          {rightRoundsOrdered.map((r) => (
            <BracketColumn
              key={`R-${r.rIdx}`}
              matches={r.matches}
              label={getRoundLabel(r.rIdx, totalRounds)}
              side="right"
              onMatchClick={onMatchClick}
              onTeamClick={onTeamClick}
              myTeamId={myTeamId}
              matchTimeMap={matchTimeMap}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted font-semibold">
        <div className="flex items-center gap-1.5">
          <Swords className="w-3 h-3 text-orange" />
          Формат: 5×5 · Single Elimination
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-orange" />
          Игровое время: 17:00 – 22:00
        </div>
      </div>
    </div>
  );
}

function BracketColumn({
  matches,
  label,
  side,
  onMatchClick,
  onTeamClick,
  myTeamId,
  matchTimeMap,
}: {
  matches: BracketMatch[];
  label: string;
  side: 'left' | 'right';
  onMatchClick?: (match: BracketMatch) => void;
  onTeamClick?: (team: BracketTeam) => void;
  myTeamId?: number | null;
  matchTimeMap: Record<number, string | null>;
}) {
  // Группируем матчи в пары — по 2 на каждую ветку
  const pairs: BracketMatch[][] = [];
  for (let i = 0; i < matches.length; i += 2) {
    pairs.push(matches.slice(i, i + 2));
  }

  return (
    <div className="flex-shrink-0 flex flex-col" style={{ width: 200 }}>
      <div className="text-center mb-3">
        <div className="text-orange text-[11px] font-black uppercase tracking-widest">
          {label}
        </div>
        <div className="text-muted text-[10px] font-bold mt-0.5">
          {matches.length} {matches.length === 1 ? 'матч' : 'матчей'}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-around gap-4">
        {pairs.map((pair, pIdx) => (
          <div key={pIdx} className="relative">
            {/* Верхняя карточка пары */}
            <MatchCard
              match={pair[0]}
              label={`M${pIdx * 2 + 1}`}
              onClick={pair[0]?.matchId && onMatchClick ? () => onMatchClick(pair[0]) : undefined}
              onTeamClick={onTeamClick}
              myTeamId={myTeamId}
              scheduledTime={pair[0]?.matchId ? matchTimeMap[pair[0].matchId] ?? null : null}
            />

            {pair[1] && (
              <>
                <div className="h-4" />
                <MatchCard
                  match={pair[1]}
                  label={`M${pIdx * 2 + 2}`}
                  onClick={pair[1]?.matchId && onMatchClick ? () => onMatchClick(pair[1]) : undefined}
                  onTeamClick={onTeamClick}
                  myTeamId={myTeamId}
                  scheduledTime={pair[1]?.matchId ? matchTimeMap[pair[1].matchId] ?? null : null}
                />

                {/* Вертикальная линия — от центра верхней до центра нижней карточки */}
                <div
                  className="absolute bg-orange/50 pointer-events-none"
                  style={{
                    [side === 'left' ? 'right' : 'left']: -22,
                    top: '25%',
                    height: '50%',
                    width: 2,
                  }}
                />

                {/* Горизонтальная линия — от середины пары к следующему раунду */}
                <div
                  className="absolute bg-orange/50 pointer-events-none"
                  style={{
                    [side === 'left' ? 'right' : 'left']: -22,
                    top: '50%',
                    width: 12,
                    height: 2,
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  label,
  onClick,
  onTeamClick,
  myTeamId,
  scheduledTime,
}: {
  match: BracketMatch | undefined;
  label: string;
  onClick?: () => void;
  onTeamClick?: (team: BracketTeam) => void;
  myTeamId?: number | null;
  scheduledTime: string | null;
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

  const hasBothTeams = match.team1 && match.team2;
  const scheduledStr = scheduledTime
    ? new Date(scheduledTime).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div
      className={`w-full bg-white border rounded-xl p-2 transition-all relative ${
        match.winner ? 'border-orange/60 bg-orange/5' : 'border-border'
      } ${onClick ? 'cursor-pointer hover:border-orange' : ''}`}
      style={{ minHeight: 88 }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between text-[9px] text-muted font-bold mb-1">
        <div className="flex items-center gap-1">
          <Swords className="w-2.5 h-2.5" />
          {label}
        </div>
        {onClick && hasBothTeams && (
          <MessageCircle className="w-2.5 h-2.5 text-orange" />
        )}
      </div>

      <TeamRow
        team={match.team1}
        isWinner={match.winner?.id === match.team1?.id && !!match.winner}
        myTeamId={myTeamId}
        onTeamClick={onTeamClick}
      />

      <div className="h-px bg-border mx-1 my-1" />

      <TeamRow
        team={match.team2}
        isWinner={match.winner?.id === match.team2?.id && !!match.winner}
        myTeamId={myTeamId}
        onTeamClick={onTeamClick}
      />

      {scheduledStr && hasBothTeams && (
        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-center gap-1 text-[9px] text-orange font-bold">
          <Clock className="w-2.5 h-2.5" />
          {scheduledStr}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  isWinner,
  myTeamId,
  onTeamClick,
}: {
  team: BracketTeam | null;
  isWinner: boolean;
  myTeamId?: number | null;
  onTeamClick?: (team: BracketTeam) => void;
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

  const isMine = myTeamId && team.id === myTeamId;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTeamClick?.(team);
      }}
      className={`w-full flex items-center gap-1.5 rounded-md px-1 py-0.5 -mx-1 transition-all text-left ${
        isMine
          ? 'bg-orange/15 border border-orange/40'
          : 'border border-transparent hover:bg-bg2'
      }`}
    >
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
      {isMine && (
        <span className="text-[8px] font-black bg-orange text-white rounded px-1 py-0.5 flex-shrink-0">
          МОЯ
        </span>
      )}
      {isWinner && (
        <div className="w-3 h-3 rounded-full bg-orange flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[7px] font-black">✓</span>
        </div>
      )}
    </button>
  );
}
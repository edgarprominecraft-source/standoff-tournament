// Сетка для Single Elimination (5х5, до 32 команд)

export type BracketPlayer = {
  id: number;
  name: string;
  photo: string | null;
  standoff_id?: string | null;
};

export type BracketTeam = {
  id: number;
  players: BracketPlayer[];
  side: 'left' | 'right' | null;
};

export type BracketMatch = {
  round: number;
  position: number;
  team1: BracketTeam | null;
  team2: BracketTeam | null;
  winner: BracketTeam | null;
  matchId?: number;
};

export function buildBracket(teams: BracketTeam[]): BracketMatch[][] {
  if (teams.length === 0) return [];

  const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(teams.length))));
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  const padded: (BracketTeam | null)[] = [...shuffled];
  while (padded.length < size) padded.push(null);

  const rounds: BracketMatch[][] = [];
  const firstRound: BracketMatch[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    firstRound.push({
      round: 1,
      position: i / 2,
      team1: padded[i],
      team2: padded[i + 1],
      winner: null,
    });
  }
  rounds.push(firstRound);

  let prevCount = firstRound.length;
  let roundNum = 2;
  while (prevCount > 1) {
    const nextCount = Math.floor(prevCount / 2);
    const round: BracketMatch[] = [];
    for (let i = 0; i < nextCount; i++) {
      round.push({
        round: roundNum,
        position: i,
        team1: null,
        team2: null,
        winner: null,
      });
    }
    rounds.push(round);
    prevCount = nextCount;
    roundNum++;
  }

  return rounds;
}

export function isRoundComplete(round: BracketMatch[]): boolean {
  return round.every((m) => m.winner !== null);
}

export function advanceWinners(rounds: BracketMatch[][]): BracketMatch[][] {
  const updated = rounds.map((r) => r.map((m) => ({ ...m })));
  for (let r = 0; r < updated.length - 1; r++) {
    const current = updated[r];
    const next = updated[r + 1];
    if (!isRoundComplete(current)) continue;
    for (let i = 0; i < current.length; i += 2) {
      const winnerA = current[i].winner;
      const winnerB = current[i + 1]?.winner ?? null;
      const nextPos = Math.floor(i / 2);
      if (next[nextPos]) {
        next[nextPos].team1 = winnerA;
        next[nextPos].team2 = winnerB;
      }
    }
  }
  return updated;
}

export function roundName(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return 'Финал';
  if (fromEnd === 1) return 'Полуфинал';
  if (fromEnd === 2) return 'Четвертьфинал';
  if (fromEnd === 3) return '1/8 финала';
  if (fromEnd === 4) return '1/16 финала';
  return `Раунд ${round}`;
}

export function totalRounds(teamsCount: number): number {
  return Math.ceil(Math.log2(Math.max(2, teamsCount)));
}

export function teamDisplayName(t: BracketTeam | null): string {
  if (!t || t.players.length === 0) return 'Команда';
  return t.players[0].name;
}

export function playersCount(t: BracketTeam | null): number {
  return t?.players.length ?? 0;
}
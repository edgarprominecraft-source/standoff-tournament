export type BracketTeam = {
  id: number;
  name: string;
  captain_photo: string | null;
  logo_url: string | null;
  clan_id?: number | null;
  players: {
    id: number;
    name: string;
    photo: string | null;
    standoff_id?: string | null;
  }[];
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

export function buildBracket(teams: BracketTeam[], shuffle: boolean = true): BracketMatch[][] {
  if (teams.length === 0) return [];
  const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(teams.length))));
  const ordered = shuffle ? [...teams].sort(() => Math.random() - 0.5) : [...teams];
  const padded: (BracketTeam | null)[] = [...ordered];
  while (padded.length < size) padded.push(null);
  const rounds: BracketMatch[][] = [];
  const firstRound: BracketMatch[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    firstRound.push({ round: 1, position: i / 2, team1: padded[i], team2: padded[i + 1], winner: null });
  }
  rounds.push(firstRound);
  let prevCount = firstRound.length;
  let roundNum = 2;
  while (prevCount > 1) {
    const nextCount = Math.floor(prevCount / 2);
    const round: BracketMatch[] = [];
    for (let i = 0; i < nextCount; i++) {
      round.push({ round: roundNum, position: i, team1: null, team2: null, winner: null });
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
  if (!t) return 'Команда';
  return t.name || 'Команда';
}
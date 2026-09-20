// Генерация турнирной сетки для Single Elimination

export type BracketTeam = {
  id: number;
  player1_id: number;
  player2_id: number | null;
  side: 'left' | 'right' | null;
  player1_name?: string;
  player2_name?: string;
  player1_photo?: string | null;
  player2_photo?: string | null;
};

export type BracketMatch = {
  round: number;         // 1 = первый раунд, 2 = полуфинал, 3 = финал
  position: number;      // позиция в раунде
  team1: BracketTeam | null;
  team2: BracketTeam | null;
  winner: BracketTeam | null;
  matchId?: number;      // id в БД, если матч создан
};

// Сгенерировать сетку из списка команд
export function buildBracket(teams: BracketTeam[]): BracketMatch[][] {
  if (teams.length === 0) return [];

  // Округляем до ближайшей степени двойки (минимум 2)
  const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(teams.length))));

  // Перемешиваем команды случайно
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Заполняем пустыми слотами до size
  const padded: (BracketTeam | null)[] = [...shuffled];
  while (padded.length < size) padded.push(null);

  // Первый раунд — пары
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

  // Остальные раунды (пустые матчи)
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

// Проверить, все ли матчи раунда завершены
export function isRoundComplete(round: BracketMatch[]): boolean {
  return round.every((m) => m.winner !== null);
}

// Продвинуть победителей в следующий раунд
export function advanceWinners(rounds: BracketMatch[][]): BracketMatch[][] {
  const updated = rounds.map((r) => r.map((m) => ({ ...m })));

  for (let r = 0; r < updated.length - 1; r++) {
    const current = updated[r];
    const next = updated[r + 1];

    // Проверяем, завершён ли текущий раунд
    if (!isRoundComplete(current)) continue;

    // Пары победителей попадают в следующий раунд
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

// Название раунда
export function roundName(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return 'Финал';
  if (fromEnd === 1) return 'Полуфинал';
  if (fromEnd === 2) return 'Четвертьфинал';
  return `Раунд ${round}`;
}

// Сколько всего раундов
export function totalRounds(teamsCount: number): number {
  return Math.ceil(Math.log2(Math.max(2, teamsCount)));
}
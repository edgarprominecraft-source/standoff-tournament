export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'не в сети';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);

  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} дн назад`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week} нед назад`;
  const month = Math.floor(day / 30);
  return `${month} мес назад`;
}

export function isOnline(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const diff = Date.now() - new Date(iso).getTime();
  return diff < 5 * 60 * 1000;
}

export function calculateWinStreak(matches: any[], userId: number): number {
  let streak = 0;
  for (const m of matches) {
    if (m.winner_id === userId) streak++;
    else break;
  }
  return streak;
}
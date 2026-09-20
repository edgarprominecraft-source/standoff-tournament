import { supabase } from '../supabase';

export const TOKENS_PER_DAY = 10;
export const MAX_BET = 5;

// Обновить жетоны (если прошёл день — +10)
export async function refillTokensIfNeeded(userId: number) {
  const { data: u } = await supabase
    .from('users')
    .select('tokens, last_token_refill')
    .eq('user_id', userId)
    .maybeSingle();

  if (!u) return 0;

  const last = u.last_token_refill ? new Date(u.last_token_refill).getTime() : 0;
  const dayMs = 24 * 60 * 60 * 1000;

  if (Date.now() - last > dayMs) {
    const newAmount = Math.max(u.tokens || 0, TOKENS_PER_DAY);
    await supabase
      .from('users')
      .update({ tokens: newAmount, last_token_refill: new Date().toISOString() })
      .eq('user_id', userId);
    return newAmount;
  }

  return u.tokens || 0;
}

// Сделать ставку
export async function placeBet(matchId: number, userId: number, teamId: number, amount: number) {
  if (amount < 1 || amount > MAX_BET) return { error: 'Ставка от 1 до ' + MAX_BET };

  const { data: u } = await supabase
    .from('users')
    .select('tokens')
    .eq('user_id', userId)
    .maybeSingle();

  if (!u || (u.tokens || 0) < amount) {
    return { error: 'Недостаточно жетонов' };
  }

  // Уже ставил?
  const { data: existing } = await supabase
    .from('bets')
    .select('id')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return { error: 'Ты уже сделал ставку' };

  await supabase.from('users').update({ tokens: (u.tokens || 0) - amount }).eq('user_id', userId);
  const { error } = await supabase.from('bets').insert({
    match_id: matchId,
    user_id: userId,
    bet_on_team_id: teamId,
    amount,
  });

  return { error: error?.message || null };
}

// Получить ставки на матч
export async function getMatchBets(matchId: number) {
  const { data } = await supabase
    .from('bets')
    .select('*')
    .eq('match_id', matchId);
  return data || [];
}

// Рассчитать выигрыш (вызывается когда матч завершён)
export async function resolveBets(matchId: number, winningTeamId: number) {
  const { data: bets } = await supabase
    .from('bets')
    .select('*')
    .eq('match_id', matchId)
    .eq('status', 'pending');

  if (!bets) return;

  for (const b of bets) {
    const won = b.bet_on_team_id === winningTeamId;
    await supabase.from('bets').update({ status: won ? 'won' : 'lost' }).eq('id', b.id);

    if (won) {
      const { data: u } = await supabase
        .from('users')
        .select('tokens')
        .eq('user_id', b.user_id)
        .maybeSingle();
      if (u) {
        await supabase.from('users').update({ tokens: (u.tokens || 0) + b.amount * 2 }).eq('user_id', b.user_id);
      }
    }
  }
}
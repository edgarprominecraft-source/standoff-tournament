// URL твоего Cloudflare Worker для проверки подписки
const SUB_CHECK_URL = 'https://standoff-sub-check.ТВОЙ-НИК.workers.dev';

export type SubscriptionResult = {
  subscribed: boolean;
  status?: string;
  error?: string;
};

/**
 * Проверяет, подписан ли пользователь на канал
 */
export async function checkSubscription(
  userId: number,
  channel: string
): Promise<SubscriptionResult> {
  try {
    const url = `${SUB_CHECK_URL}/?user_id=${userId}&channel=${encodeURIComponent(channel)}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return { subscribed: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      subscribed: !!data.subscribed,
      status: data.status,
      error: data.error,
    };
  } catch (e: any) {
    return { subscribed: false, error: e.message || 'Ошибка сети' };
  }
}

/**
 * Проверяет подписку на всех спонсоров турнира.
 * Возвращает массив результатов — [true, false, true] например
 */
export async function checkAllSubscriptions(
  userId: number,
  sponsors: { channel_username: string }[]
): Promise<SubscriptionResult[]> {
  return Promise.all(
    sponsors.map((s) => checkSubscription(userId, s.channel_username))
  );
}
import { useEffect, useState } from 'react';
import { supabase, type User } from '../supabase';

export default function Rating() {
  const [top, setTop] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('balance', { ascending: false })
        .limit(50);
      if (data) setTop(data as User[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="text-muted text-center py-10">Загрузка...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-white font-bold mb-1">📊 Рейтинг сезона</div>
        <div className="text-muted text-xs">Топ-50 игроков по балансу</div>
      </div>

      {top.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted text-sm">
          Пока никого нет
        </div>
      ) : (
        top.map((u, i) => (
          <div
            key={u.user_id}
            className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
          >
            <div className="w-8 text-center text-white font-bold">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>
            <div className="w-10 h-10 rounded-full bg-card2 border border-border flex items-center justify-center text-lg overflow-hidden">
              {u.photo_url ? (
                <img src={u.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                '👤'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm truncate">
                {u.nickname || u.first_name || 'Игрок'}
              </div>
              <div className="text-muted text-[10px]">
                {u.standoff_id ? `ID: ${u.standoff_id}` : 'ID не указан'}
              </div>
            </div>
            <div className="text-white font-bold text-sm">{u.balance} 💰</div>
          </div>
        ))
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase, type User, type Tournament as T } from '../supabase';
import { haptic, hapticSuccess, hapticError } from '../lib/telegram';

type Props = { user: User };

export default function Tournament({ user }: Props) {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setList(data as T[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const register = async (t: T) => {
    if (!user.standoff_id) {
      hapticError();
      setMsg('Сначала добавь Standoff ID в профиле');
      return;
    }
    haptic('medium');

    const { data: existingTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', t.id)
      .or(`player1_id.eq.${user.user_id},player2_id.eq.${user.user_id}`)
      .maybeSingle();

    if (existingTeam) {
      hapticError();
      setMsg('Ты уже зарегистрирован в этом турнире');
      return;
    }

    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', t.id);

    const count = teams?.length ?? 0;
    if (count >= t.max_teams) {
      hapticError();
      setMsg('Турнир заполнен');
      return;
    }

    const side = Math.random() < 0.5 ? 'left' : 'right';

    const { error } = await supabase.from('teams').insert({
      tournament_id: t.id,
      player1_id: user.user_id,
      player2_id: null,
      side,
      confirmed1: true,
      confirmed2: false,
    });

    if (error) {
      hapticError();
      setMsg(error.message);
    } else {
      hapticSuccess();
      setMsg('Ты в сетке! Ожидай второго игрока в команду.');
    }
  };

  if (loading) {
    return <div className="text-muted text-center py-10">Загрузка турниров...</div>;
  }

  return (
    <div className="space-y-4">
      {msg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card2 border border-border rounded-xl p-3 text-sm text-white"
        >
          {msg}
        </motion.div>
      )}

      {list.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-white font-bold mb-2">Турниров пока нет</div>
          <p className="text-muted text-xs">
            Как только спонсоры подтвердят приз, турнир появится здесь.
          </p>
        </div>
      ) : (
        list.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-white font-bold">{t.name}</div>
                <div className="text-muted text-xs">
                  {t.sponsor_channel ? `Спонсор: ${t.sponsor_channel}` : 'Спонсор: скоро'}
                </div>
              </div>
              <div
                className={`text-[10px] px-2 py-1 rounded-full border ${
                  t.status === 'waiting'
                    ? 'border-border text-muted'
                    : t.status === 'active'
                    ? 'border-white text-white'
                    : 'border-border text-muted'
                }`}
              >
                {t.status === 'waiting'
                  ? 'Набор'
                  : t.status === 'active'
                  ? 'Идёт'
                  : 'Завершён'}
              </div>
            </div>

            <div className="flex justify-between text-xs text-muted mb-4">
              <span>Максимум команд: {t.max_teams}</span>
              <span>Формат: 2х2</span>
            </div>

            <button
              onClick={() => register(t)}
              className="w-full bg-white text-black font-bold rounded-xl py-3 text-sm"
            >
              Участвовать
            </button>
          </motion.div>
        ))
      )}
    </div>
  );
}
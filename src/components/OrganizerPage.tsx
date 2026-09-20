import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Trophy, ArrowLeft, Users, Coins, Calendar } from 'lucide-react';
import {
  type Organizer,
  getAllOrganizers,
  getOrganizerTournaments,
} from '../lib/organizers';
import { type User } from '../supabase';

type Props = { user: User };

type Tournament = {
  id: number;
  name: string;
  max_teams: number;
  prize_gold: number | null;
  status: string;
  created_at: string;
};

export default function OrganizerPage({ user }: Props) {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [selected, setSelected] = useState<Organizer | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await getAllOrganizers();
      setOrganizers(list);
      setLoading(false);
    })();
  }, []);

  const openOrganizer = async (org: Organizer) => {
    setSelected(org);
    const t = await getOrganizerTournaments(org.id);
    setTournaments(t as Tournament[]);
  };

  // ===== Страница организатора =====
  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="p-2 rounded-xl bg-card border border-border hover:border-orange/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
          </button>
          <div className="flex-1">
            <div className="text-black font-black text-sm">{selected.name}</div>
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold">
              Организатор
            </div>
          </div>
        </div>

        {/* Шапка организатора */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange to-orange2 rounded-3xl overflow-hidden shadow-orange relative"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_65%)]" />
          <div className="relative p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur border border-white/40 flex items-center justify-center overflow-hidden">
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-white" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-black text-xl truncate">
                  {selected.name}
                </div>
                {selected.tag && (
                  <div className="text-white/80 font-bold text-sm">
                    [{selected.tag}]
                  </div>
                )}
              </div>
            </div>
            {selected.description && (
              <p className="text-white/90 text-xs mt-3 leading-relaxed">
                {selected.description}
              </p>
            )}
          </div>
        </motion.div>

        {/* Турниры организатора */}
        <div className="space-y-2">
          <div className="text-muted text-[10px] uppercase tracking-widest px-1 font-bold">
            Турниры ({tournaments.length})
          </div>

          {tournaments.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <Trophy className="w-8 h-8 text-muted mx-auto mb-2" strokeWidth={1.5} />
              <div className="text-muted text-xs">Пока нет турниров</div>
            </div>
          ) : (
            tournaments.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-4 shadow-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-black font-bold text-sm truncate">{t.name}</div>
                    <div className="text-muted text-[10px] flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t.max_teams}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {t.prize_gold || 0} голды
                      </span>
                    </div>
                  </div>
                  <div className={`text-[10px] px-2 py-1 rounded-full border font-bold uppercase ${
                    t.status === 'waiting'
                      ? 'border-orange/40 text-orange bg-orange/10'
                      : 'border-border text-muted'
                  }`}>
                    {t.status === 'waiting' ? 'Набор' : t.status === 'active' ? 'Идёт' : 'Завершён'}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ===== Список организаторов =====
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-5 shadow-orange relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="text-white font-black text-lg">Организаторы</div>
            <div className="text-white/80 text-[11px] font-medium">
              {organizers.length} турнирных организаций
            </div>
          </div>
        </div>
      </div>

      {organizers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-card">
          <Building2 className="w-12 h-12 text-muted mx-auto mb-3" strokeWidth={1.5} />
          <div className="text-black font-bold mb-1">Организаторов пока нет</div>
          <p className="text-muted text-xs">Скоро здесь появятся известные турнирные площадки</p>
        </div>
      ) : (
        <div className="space-y-2">
          {organizers.map((org, i) => (
            <motion.button
              key={org.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openOrganizer(org)}
              className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-orange/40 hover:shadow-card transition-all text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-black font-bold text-sm truncate">{org.name}</div>
                {org.tag && (
                  <div className="text-orange font-bold text-[10px]">[{org.tag}]</div>
                )}
                <div className="text-muted text-[10px] truncate mt-0.5">
                  {org.description || 'Турнирная организация'}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
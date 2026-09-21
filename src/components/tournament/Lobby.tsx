import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, Check, Hourglass, Crown, X, Shield, AlertTriangle, FileText } from 'lucide-react';
import { supabase, type User } from '../../supabase';
import { haptic, hapticSuccess, hapticError } from '../../lib/telegram';
import type { BracketTeam } from '../../lib/bracket';

type Props = {
  tournamentId: number;
  maxTeams: number;
  user: User;
  onReady: () => void;
};

type MyClan = {
  id: number;
  name: string;
  tag: string;
  logo_url: string | null;
  members_count: number;
};

const MIN_CLAN_MEMBERS = 5;

// ===== ТЕКСТ РЕГЛАМЕНТА (присылает организатор) =====
const RULES_TEXT = `РЕГЛАМЕНТ TOURNAMENT (STANDOFF 2)

1. ОБЩИЕ ПОЛОЖЕНИЯ

1.1. Турнир проводится при поддержке и под контролем организаторов Seven Tournament.

1.2. К участию допускаются игроки любой возрастной категории.

1.3. Формат турнира, стадии, расписание, призовой фонд и другая информация публикуются в анонсе конкретного турнира.

1.4. Регистрация на турнир означает полное согласие команды с настоящим регламентом.

1.5. Все спорные ситуации, не предусмотренные данным регламентом, решаются администрацией турнира. Решение администрации является окончательным.

1.6. Все матчи проводятся на последней актуальной версии игры Standoff 2. В случае выхода обновлений администрация вправе внести изменения в регламент.

1.7. Запрещается использование:
— ПК и эмуляторов;
— стороннего программного обеспечения;
— читов, макросов, триггеров;
— геймпадов, джойстиков и других устройств, дающих преимущество.

1.8. Время проведения матча согласовывается капитанами обеих команд. При невозможности договориться окончательное время назначает администрация.

1.9. При необходимости участники обязаны быть подписаны на информационные ресурсы и спонсоров турнира.

1.10. Использование Rog-прицела разрешено.

2. РЕГИСТРАЦИЯ

2.1. Регистрация осуществляется только через организаторов турнира.

2.2. При регистрации необходимо указать:
— название команды;
— основной состав (5 игроков);
— запасных игроков (до 3 человек);
— игровые ID всех участников.

2.3. Игроки могут не состоять под тегом команды в игре, если они указаны в официальной заявке.

2.4. Замена игроков во время турнира возможна только с разрешения администрации.

3. ПРОВЕДЕНИЕ МАТЧЕЙ

3.1. Матчи проводятся в форматах BO1, BO2, BO3 или BO5 (в зависимости от стадии турнира).

3.2. Игровые карты: Sandstone, Rust, Province, Breeze, Prison, Hanami, Dune.

3.3. Настройки лобби:
— режим — 5×5;
— длительность раунда — 2:05;
— количество раундов — 25;
— стартовые деньги — $800;
— максимальная сумма денег — $16 000.

4. ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

4.1. По запросу администрации каждый игрок обязан предоставить:
— СС (скриншот экрана в игре);
— МС (скриншот экрана во вкладках).

4.2. После каждого переподключения или перезахода в матч игрок обязан повторно предоставить СС и МС по требованию администрации.

4.3. Отказ предоставить материалы в установленный срок приравнивается к техническому поражению или дисквалификации.

5. РЕХОСТ

5.1. Рехост возможен в следующих случаях:
— вылет одного или нескольких игроков;
— критический баг игры;
— технические неполадки;
— решение администрации.

6. ТРЕБОВАНИЯ К СОЕДИНЕНИЮ

6.1. Максимально допустимый пинг игрока — 180 ms.

6.2. При превышении допустимого пинга в течении 5-ти раундов администрация вправе перенести матч, провести рехост или вынести иное решение.

7. НАРУШЕНИЯ

За нарушение настоящего регламента администрация может применить следующие санкции:
— предупреждение;
— снятие раундов;
— техническое поражение;
— дисквалификация команды или игрока.

Администрация оставляет за собой право изменить меру наказания в зависимости от тяжести нарушения.`;

export default function Lobby({ tournamentId, maxTeams, user, onReady }: Props) {
  const [teams, setTeams] = useState<BracketTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [myClan, setMyClan] = useState<MyClan | null>(null);
  const [clanError, setClanError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [rulesTimer, setRulesTimer] = useState(10);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const loadTeams = async () => {
    const { data: rawTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (!rawTeams || rawTeams.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const enriched: BracketTeam[] = (rawTeams as any[]).map((t) => ({
      id: t.id,
      name: t.clan_name || t.team_name || 'Клан',
      captain_photo: null,
      logo_url: t.clan_logo_url || t.logo_url || null,
      players: [],
      side: t.side,
    }));

    setTeams(enriched);
    if (enriched.length >= maxTeams) onReady();
    setLoading(false);
  };

  const loadMyClan = async () => {
    if (!user.clan_id) {
      setMyClan(null);
      setClanError('Ты не в клане. Вступи в клан или создай свой, чтобы участвовать.');
      return;
    }

    const { data: clan } = await supabase
      .from('clans')
      .select('id, name, tag, logo_url')
      .eq('id', user.clan_id)
      .maybeSingle();

    if (!clan) {
      setMyClan(null);
      setClanError('Клан не найден');
      return;
    }

    const { count } = await supabase
      .from('clan_members')
      .select('id', { count: 'exact', head: true })
      .eq('clan_id', clan.id);

    setMyClan({
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      logo_url: clan.logo_url,
      members_count: count || 0,
    });

    if ((count || 0) < MIN_CLAN_MEMBERS) {
      setClanError(`Нужно минимум ${MIN_CLAN_MEMBERS} игроков в клане (сейчас ${count || 0})`);
    } else {
      setClanError(null);
    }
  };

  useEffect(() => {
    loadTeams();
    loadMyClan();

    const channel = supabase
      .channel(`lobby-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tournamentId}` },
        () => loadTeams()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, user.clan_id]);

  // ===== Таймер регламента =====
  useEffect(() => {
    if (!showRules) return;
    setRulesTimer(10);
    const t = setInterval(() => {
      setRulesTimer((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleDeclineRules();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [showRules]);

  const myTeam = teams.find((t) => t.name === myClan?.name);
  const alreadyJoined = !!myTeam;
  const full = teams.length >= maxTeams;

  const openRules = () => {
    if (!myClan) { hapticError(); setMsg('Сначала вступи в клан'); return; }
    if (clanError) { hapticError(); setMsg(clanError); return; }
    if (alreadyJoined) { hapticError(); setMsg('Твой клан уже участвует'); return; }
    if (full) { hapticError(); setMsg('Все места заняты'); return; }
    haptic('medium');
    setShowRules(true);
  };

  const handleAcceptRules = async () => {
    setShowRules(false);
    setJoining(true);
    hapticSuccess();

    try {
      const { error } = await supabase.from('teams').insert({
        tournament_id: tournamentId,
        player1_id: user.user_id,
        captain_id: user.user_id,
        clan_id: myClan!.id,
        clan_name: myClan!.name,
        clan_tag: myClan!.tag,
        clan_logo_url: myClan!.logo_url,
        team_name: myClan!.name,
        logo_url: myClan!.logo_url,
        side: Math.random() < 0.5 ? 'left' : 'right',
        rules_accepted: true,
        rules_accepted_at: new Date().toISOString(),
      });

      if (error) {
        hapticError();
        setMsg(error.message);
      } else {
        hapticSuccess();
        setMsg(`Клан "${myClan!.name}" вступил в турнир!`);
        setRulesAccepted(true);
      }
    } catch (e: any) {
      hapticError();
      setMsg(e.message || 'Ошибка');
    }
    setJoining(false);
  };

  const handleDeclineRules = () => {
    setShowRules(false);
    hapticError();
    setMsg('Регламент отклонён. Для участия нужно принять.');
  };

  const leaveTournament = async () => {
    if (!myTeam) return;
    haptic('medium');

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', myTeam.id)
      .maybeSingle();

    if (!teamData) return;

    const { data: member } = await supabase
      .from('clan_members')
      .select('role')
      .eq('clan_id', (teamData as any).clan_id)
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (!member || member.role !== 'leader') {
      hapticError();
      setMsg('Только лидер клана может вывести его из турнира');
      return;
    }

    await supabase.from('teams').delete().eq('id', myTeam.id);
    hapticSuccess();
    setMsg('Клан вышел из турнира');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-3 border-orange/20 border-t-orange rounded-full animate-spin" />
        <div className="text-muted text-xs uppercase tracking-widest">Загрузка лобби</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-5 shadow-orange relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <div className="text-white font-black text-lg">Лобби</div>
          </div>
          <div className="text-white text-lg font-black">
            {teams.length} <span className="text-white/60">/ {maxTeams}</span>
          </div>
        </div>
        <div className="relative text-white/90 text-xs font-medium">
          Кланы участвуют в турнире
        </div>
        <div className="relative mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(teams.length / maxTeams) * 100}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-white"
          />
        </div>
      </motion.div>

      {msg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-orange/10 border border-orange/30 rounded-xl p-3 text-sm text-orange font-semibold"
        >
          {msg}
        </motion.div>
      )}

      {!myClan ? (
        <div className="bg-card border-2 border-orange/40 rounded-2xl p-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange/10 border border-orange/30 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-8 h-8 text-orange" />
          </div>
          <div className="text-black font-black text-base mb-1">Ты не в клане</div>
          <p className="text-muted text-xs leading-relaxed mb-3">
            Чтобы участвовать в турнире — вступи в клан или создай свой.
            Минимум {MIN_CLAN_MEMBERS} игроков.
          </p>
          <div className="text-muted text-[10px]">
            Перейди во вкладку «КЛАН» внизу
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
              {myClan.logo_url ? (
                <img src={myClan.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-lg">
                  {myClan.tag.slice(0, 2)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-black font-black text-base truncate">
                {myClan.name}
              </div>
              <div className="text-orange font-bold text-xs">[{myClan.tag}]</div>
              <div className="text-muted text-[10px] mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {myClan.members_count} / {MIN_CLAN_MEMBERS}+ игроков
              </div>
            </div>
          </div>

          {clanError && (
            <div className="mt-3 bg-danger/10 border border-danger/30 rounded-xl p-2.5 text-xs text-danger font-semibold">
              {clanError}
            </div>
          )}
        </motion.div>
      )}

      {myClan && (
        <>
          {!alreadyJoined ? (
            <button
              onClick={openRules}
              disabled={joining || full || !!clanError}
              className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm disabled:opacity-40 shadow-orange hover:bg-orangeDark transition-colors flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {full ? 'Мест нет' : 'Вступить от клана'}
            </button>
          ) : (
            <div className="bg-card border border-success/40 rounded-2xl p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-success" />
                <span className="text-black font-bold text-sm">Клан в турнире</span>
              </div>
              <button
                onClick={leaveTournament}
                className="w-full bg-bg2 border border-border text-danger text-xs rounded-xl py-2.5 hover:border-danger/40 transition-colors flex items-center justify-center gap-1.5 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Вывести клан из турнира
              </button>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <div className="text-muted text-[10px] uppercase tracking-widest px-1 font-bold">
          Кланы в турнире ({teams.length})
        </div>
        <AnimatePresence>
          {teams.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-card"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-orange2 flex items-center justify-center overflow-hidden flex-shrink-0">
                {t.logo_url ? (
                  <img src={t.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-xs">
                    {t.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-black font-bold text-sm truncate">{t.name}</div>
                <div className="text-muted text-[10px]">В турнире</div>
              </div>
              <Check className="w-4 h-4 text-success" />
            </motion.div>
          ))}
        </AnimatePresence>
        {teams.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-4 text-center text-muted text-xs font-medium">
            Пока никто не зашёл — будь первым
          </div>
        )}
      </div>

      {/* ===== МОДАЛКА РЕГЛАМЕНТА ===== */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col"
            >
              <div className="p-5 border-b border-border flex items-center justify-between bg-gradient-to-br from-orange to-orange2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-white" />
                  <div className="text-white font-black">Регламент турнира</div>
                </div>
                <div className="bg-white/20 backdrop-blur border border-white/40 rounded-full px-3 py-1 text-white font-black text-sm">
                  {rulesTimer}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <pre className="text-[11px] text-black whitespace-pre-wrap leading-relaxed font-sans">
                  {RULES_TEXT}
                </pre>
              </div>

              <div className="p-5 border-t border-border space-y-2">
                <button
                  onClick={handleAcceptRules}
                  disabled={joining}
                  className="w-full bg-orange text-white font-black rounded-2xl py-4 text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Принять и участвовать
                </button>
                <button
                  onClick={handleDeclineRules}
                  className="w-full bg-bg2 border border-border text-muted font-bold rounded-2xl py-3 text-xs"
                >
                  Отменить
                </button>
                <p className="text-muted text-[10px] text-center">
                  У тебя {rulesTimer} сек, чтобы принять
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
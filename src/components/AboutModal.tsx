import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Info, Swords, Trophy, Users, Coins, Gift, ExternalLink } from 'lucide-react';

type Props = { onClose: () => void };

export default function AboutModal({ onClose }: Props) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => { document.body.classList.remove('modal-open'); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white p-5 border-b border-border flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-orange" />
            <div className="text-black font-black text-base">О приложении</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center">
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        <div className="p-5">
          {/* Лого и версия */}
          <div className="text-center mb-6">
            <img src="/logo.png" alt="Standoff Cup" className="w-20 h-20 mx-auto mb-3" />
            <div className="text-black font-black text-xl">STANDOFF CUP</div>
            <div className="text-muted text-xs mt-1">Турниры 5×5 · Standoff 2</div>
            <div className="inline-block mt-3 bg-orange/10 border border-orange/30 rounded-full px-3 py-1">
              <span className="text-orange text-[11px] font-black">версия 1.0</span>
            </div>
          </div>

          {/* Что умеет */}
          <div className="bg-bg2 border border-border rounded-2xl p-4 mb-3">
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
              Что умеет приложение
            </div>
            <div className="space-y-2.5">
              <Feature icon={Swords} text="Турниры 5×5 с автогенерацией сетки" />
              <Feature icon={Users} text="Кланы с режимами вступления" />
              <Feature icon={Trophy} text="Рейтинг игроков и кланов" />
              <Feature icon={Coins} text="Монеты и жетоны за матчи" />
              <Feature icon={Gift} text="Призы от организаторов" />
            </div>
          </div>

          {/* Что нового */}
          <div className="bg-bg2 border border-border rounded-2xl p-4 mb-3">
            <div className="text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
              Что нового в 1.0
            </div>
            <ul className="space-y-1.5 text-xs text-black">
              <li>🎃 Хэллоуин-оформление и музыка</li>
              <li>🎵 Плеер с плейлистом и громкостью</li>
              <li>👥 Друзья с онлайн-статусом</li>
              <li>🏢 Режимы клана: открытый / заявки / закрытый</li>
              <li>🔔 Уведомления и вызовы админа</li>
              <li>📊 Расширенная статистика и ранг</li>
            </ul>
          </div>

          {/* Контакты */}
          <div className="bg-orange/10 border border-orange/30 rounded-2xl p-4">
            <div className="text-orange text-xs font-bold mb-2">Обратная связь</div>
            <a
              href="https://t.me/HePastic"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-black font-bold text-sm hover:text-orange transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              @HePastic
            </a>
            <div className="text-muted text-[10px] mt-2">
              Спонсорство, идеи, баги — пиши сюда
            </div>
          </div>

          <div className="text-center text-muted text-[10px] mt-5">
            © 2026 Standoff Cup · Сделано с ❤️ для Standoff 2
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Feature({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-orange/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-orange" />
      </div>
      <div className="text-black text-xs">{text}</div>
    </div>
  );
}

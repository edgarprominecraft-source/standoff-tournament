import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, Lock, Eye, Trash2 } from 'lucide-react';

type Props = { onClose: () => void };

export default function PrivacyModal({ onClose }: Props) {
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
            <Shield className="w-5 h-5 text-orange" />
            <div className="text-black font-black text-base">Конфиденциальность</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center">
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <Section
            icon={Lock}
            title="Что мы храним"
            text="Telegram ID, имя, username, фото профиля при первом входе. Standoff ID, если ты его указал. Игровую статистику и историю матчей."
          />
          <Section
            icon={Eye}
            title="Зачем это нужно"
            text="Для идентификации, отображения в профиле и сетках турниров, подсчёта статистики, начисления наград. Мы не используем данные для рекламы."
          />
          <Section
            icon={Shield}
            title="Кому передаём"
            text="Никому. Данные не передаются рекламным сетям и третьим лицам. Спонсоры видят только факт подписки на их канал."
          />
          <Section
            icon={Lock}
            title="Как защищаем"
            text="Supabase (Европа, Ирландия) — защищённое хранилище. Пароли не используем — вход только через Telegram. RLS-политики на всех таблицах."
          />
          <Section
            icon={Trash2}
            title="Твои права"
            text="Можешь потребовать удалить профиль и все связанные данные через поддержку @HePastic. Удаление в течение 24 часов."
          />

          <div className="bg-orange/10 border border-orange/30 rounded-2xl p-4">
            <div className="text-orange text-xs font-bold mb-1">Согласие</div>
            <p className="text-muted text-[11px] leading-relaxed">
              Регистрируясь в Standoff Cup, ты подтверждаешь, что тебе 13+ и соглашаешься с правилами платформы. Спорные ситуации решает администрация.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="bg-bg2 border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-orange" />
        <div className="text-black font-bold text-sm">{title}</div>
      </div>
      <p className="text-muted text-xs leading-relaxed">{text}</p>
    </div>
  );
}

import { motion } from 'framer-motion';
import {
  Info as InfoIcon, ScrollText, Phone, Gift, Coins, Trophy, Users,
  Shield, FileText, AlertTriangle, Target,
} from 'lucide-react';

export default function Info() {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <InfoIcon className="w-4 h-4 text-orange" />
          <div className="text-black font-bold">О платформе</div>
        </div>
        <p className="text-muted text-sm leading-relaxed">
          <b className="text-black">Standoff Cup</b> — киберспортивная платформа для турниров
          5×5 по Standoff 2. Организаторы создают турниры, кланы участвуют, зрители следят
          за сеткой. Мы делаем соревновательный опыт доступным для каждого игрока —
          без ботов, читов и скамов.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-orange" />
          <div className="text-black font-bold">Как это работает</div>
        </div>
        <ul className="text-muted text-sm space-y-2.5 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-orange font-black">1.</span>
            <span>Создаёшь клан или вступаешь в существующий (минимум 5 игроков)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange font-black">2.</span>
            <span>Находишь турнир в разделе «Орг»</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange font-black">3.</span>
            <span>Подписываешься на спонсоров турнира</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange font-black">4.</span>
            <span>Регистрируешь клан на турнир</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange font-black">5.</span>
            <span>Играешь матчи по расписанию, побеждаешь, получаешь призы</span>
          </li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="w-4 h-4 text-orange" />
          <div className="text-black font-bold">Правила участия</div>
        </div>
        <ul className="text-muted text-sm space-y-2.5 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-orange">—</span>
            <span>Формат матчей 5×5, одна карта (Bo1) на вылет</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange">—</span>
            <span>Обязательно указывай свой Standoff ID в профиле</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange">—</span>
            <span>Минимум 5 игроков в клане для участия</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange">—</span>
            <span>Подписка на спонсоров обязательна перед стартом</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange">—</span>
            <span>Оскорбления, читы, скам — пожизненный бан</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange">—</span>
            <span>Неявка на матч = техническое поражение</span>
          </li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-orange" />
          <div className="text-black font-bold">Награды</div>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Победа в турнире
            </span>
            <span className="text-black font-bold flex items-center gap-1">
              1000 <Coins className="w-3.5 h-3.5 text-orange" />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Финалист
            </span>
            <span className="text-black font-bold flex items-center gap-1">
              500 <Coins className="w-3.5 h-3.5 text-orange" />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted flex items-center gap-2">
              <Users className="w-4 h-4" />
              Участие
            </span>
            <span className="text-black font-bold flex items-center gap-1">
              50 <Coins className="w-3.5 h-3.5 text-orange" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Политика конфиденциальности */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-orange" />
          <div className="text-black font-bold">Политика конфиденциальности</div>
        </div>
        <div className="text-muted text-xs space-y-3 leading-relaxed">
          <p>
            <b className="text-black">1. Какие данные мы собираем.</b> Мы получаем твой
            Telegram ID, имя, username и фотографию при первом входе. Если ты указываешь
            Standoff ID — он также сохраняется.
          </p>
          <p>
            <b className="text-black">2. Зачем мы это делаем.</b> Для идентификации тебя
            как игрока на платформе, отображения в сетке турнира, подсчёта статистики
            и начисления наград.
          </p>
          <p>
            <b className="text-black">3. Кому передаём.</b> Никому. Твои данные не
            передаются третьим лицам, рекламным сетям или спонсорам. Спонсоры видят
            только факт подписки, не твой профиль.
          </p>
          <p>
            <b className="text-black">4. Хранение.</b> Данные хранятся на серверах
            Supabase (Европа). Мы не храним пароли — вход через Telegram без пароля.
          </p>
          <p>
            <b className="text-black">5. Твои права.</b> Ты можешь в любой момент
            потребовать удаления своего профиля, написав в поддержку.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-orange" />
          <div className="text-black font-bold">Пользовательское соглашение</div>
        </div>
        <div className="text-muted text-xs space-y-3 leading-relaxed">
          <p>
            Регистрируясь на Standoff Cup, ты подтверждаешь, что тебе 13+ лет
            и ты согласен с правилами платформы.
          </p>
          <p>
            Администрация оставляет за собой право банить аккаунты за нарушение
            правил без предварительного уведомления. Оспорить бан можно через
            поддержку.
          </p>
          <p>
            Мы не несём ответственности за внутриигровые действия игроков,
            включая блокировки аккаунта Standoff 2 со стороны Axlebolt.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-orange" />
          <div className="text-black font-bold">Контакты</div>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-muted">
            Спонсорство:{' '}
            <a href="https://t.me/HePastic" target="_blank" rel="noreferrer" className="text-orange font-bold hover:underline">
              @HePastic
            </a>
          </p>
          <p className="text-muted">
            Тех. поддержка:{' '}
            <a href="https://t.me/HePastic" target="_blank" rel="noreferrer" className="text-orange font-bold hover:underline">
              @HePastic
            </a>
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-orange/5 border border-orange/30 rounded-2xl p-5 text-center"
      >
        <AlertTriangle className="w-6 h-6 text-orange mx-auto mb-2" />
        <div className="text-black font-bold text-sm mb-1">Честная игра</div>
        <p className="text-muted text-xs leading-relaxed">
          Мы против читов, бустов и договорных матчей. Все результаты
          матчей проверяются модераторами. Нарушители банятся навсегда.
        </p>
      </motion.div>
    </div>
  );
}
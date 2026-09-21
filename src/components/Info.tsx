import { motion } from 'framer-motion';
import { Info as InfoIcon, ScrollText, Phone, Gift, Coins, Trophy, Users, Shield, Target } from 'lucide-react';

export default function Info() {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange to-orange2 rounded-3xl p-6 shadow-orange relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <img src="/logo.png" alt="" className="w-14 h-14 mb-3" />
          <h1 className="text-white font-black text-2xl mb-1">STANDOFF CUP</h1>
          <p className="text-white/80 text-xs uppercase tracking-[0.2em] font-bold">
            Турниры 5×5 · Standoff 2
          </p>
        </div>
      </motion.div>

      <Block icon={InfoIcon} title="О платформе">
        <p>
          <b className="text-black">Standoff Cup</b> — киберспортивная платформа для турниров 5×5
          по Standoff 2. Организаторы создают турниры, кланы участвуют, зрители следят за сеткой.
          Мы делаем соревновательный опыт доступным для каждого игрока — без ботов, читов и скамов.
        </p>
      </Block>

      <Block icon={Target} title="Как участвовать">
        <ol className="space-y-2 list-decimal list-inside">
          <li>Создай клан или вступи в существующий (минимум 5 игроков)</li>
          <li>Найди турнир в разделе «Орг»</li>
          <li>Подпишись на спонсоров турнира</li>
          <li>Прими регламент турнира (он придёт при регистрации)</li>
          <li>Играй матчи, побеждай, получай призы</li>
        </ol>
      </Block>

      <Block icon={ScrollText} title="Правила">
        <ul className="space-y-2">
          <li>— Формат 5×5, Bo1 на вылет (по стадиям может быть Bo3/Bo5)</li>
          <li>— Обязательно укажи Standoff ID в профиле</li>
          <li>— Минимум 5 игроков в клане</li>
          <li>— Подписка на спонсоров обязательна</li>
          <li>— Запрещены: ПК и эмуляторы, читы, макросы, триггеры, геймпады</li>
          <li>— Оскорбления, читы, скам — пожизненный бан</li>
          <li>— Неявка на матч = техническое поражение</li>
        </ul>
      </Block>

      <Block icon={Gift} title="Награды">
        <div className="space-y-2">
          <Reward label="Победа в турнире" value="1000" />
          <Reward label="Финалист" value="500" />
          <Reward label="Участие (даже за проигрыш)" value="50" />
        </div>
      </Block>

      <Block icon={Shield} title="Конфиденциальность">
        <p className="mb-2">
          <b className="text-black">Что мы храним.</b> Telegram ID, имя, username, фото при первом
          входе. Standoff ID если ты его указал.
        </p>
        <p className="mb-2">
          <b className="text-black">Зачем.</b> Для идентификации, отображения в сетке турниров,
          подсчёта статистики и начисления наград.
        </p>
        <p className="mb-2">
          <b className="text-black">Кому передаём.</b> Никому. Данные не передаются рекламным сетям
          и третьим лицам. Спонсоры видят только факт подписки.
        </p>
        <p className="mb-2">
          <b className="text-black">Хранение.</b> Серверы Supabase (Европа). Пароли не храним —
          вход через Telegram без пароля.
        </p>
        <p>
          <b className="text-black">Твои права.</b> Можно потребовать удаления профиля через поддержку.
        </p>
      </Block>

      <Block icon={ScrollText} title="Пользовательское соглашение">
        <p className="mb-2">
          Регистрируясь, ты подтверждаешь что тебе 13+ и что ты согласен с правилами платформы.
        </p>
        <p className="mb-2">
          Администрация вправе банить аккаунты за нарушения без предварительного уведомления.
          Оспорить бан — через поддержку.
        </p>
        <p>
          Мы не несём ответственности за блокировки аккаунта Standoff 2 со стороны Axlebolt.
        </p>
      </Block>

      <Block icon={Users} title="Честная игра">
        <p>
          Мы против читов, бустов и договорных матчей. Все результаты проверяются модераторами.
          Нарушители банятся навсегда.
        </p>
      </Block>

      <Block icon={Phone} title="Контакты">
        <p className="mb-2">
          Спонсорство:{' '}
          <a href="https://t.me/HePastic" target="_blank" rel="noreferrer" className="text-orange font-bold hover:underline">
            @HePastic
          </a>
        </p>
        <p>
          Поддержка:{' '}
          <a href="https://t.me/HePastic" target="_blank" rel="noreferrer" className="text-orange font-bold hover:underline">
            @HePastic
          </a>
        </p>
      </Block>
    </div>
  );
}

function Block({ icon: Icon, title, children }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-orange" />
        <div className="text-black font-black text-sm">{title}</div>
      </div>
      <div className="text-muted text-xs leading-relaxed">{children}</div>
    </motion.div>
  );
}

function Reward({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-black font-black flex items-center gap-1">
        {value} <Coins className="w-3 h-3 text-orange" />
      </span>
    </div>
  );
}
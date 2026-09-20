import { motion } from 'framer-motion';
import { Info as InfoIcon, ScrollText, Phone, Gift, Coins, Trophy, Users } from 'lucide-react';

export default function Info() {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <InfoIcon className="w-4 h-4 text-white" />
          <div className="text-white font-bold">О проекте</div>
        </div>
        <p className="text-muted text-sm leading-relaxed">
          Standoff Cup — платформа турниров 2х2 для Standoff 2. Регистрируйся,
          собирай команду, играй и зарабатывай внутреннюю валюту. Даже за проигрыш
          ты получаешь монеты.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="w-4 h-4 text-white" />
          <div className="text-white font-bold">Правила</div>
        </div>
        <ul className="text-muted text-sm space-y-2.5 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-white/40">—</span>
            <span>Формат матчей — 2х2, одна карта (Bo1)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-white/40">—</span>
            <span>Обязательно указывай Standoff ID, иначе выкинет из сетки</span>
          </li>
          <li className="flex gap-2">
            <span className="text-white/40">—</span>
            <span>Подтверждение участия: оба игрока команды за 3 минуты</span>
          </li>
          <li className="flex gap-2">
            <span className="text-white/40">—</span>
            <span>Если подтвердил только 1 — команда дисквалифицируется</span>
          </li>
          <li className="flex gap-2">
            <span className="text-white/40">—</span>
            <span>Карты выбираются по очереди: бан, бан, бан...</span>
          </li>
          <li className="flex gap-2">
            <span className="text-white/40">—</span>
            <span>Оскорбления и читы — пожизненный бан</span>
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
          <Gift className="w-4 h-4 text-white" />
          <div className="text-white font-bold">Награды</div>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Победа в турнире
            </span>
            <span className="text-white font-bold flex items-center gap-1">
              1000 <Coins className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Финалист
            </span>
            <span className="text-white font-bold flex items-center gap-1">
              500 <Coins className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted flex items-center gap-2">
              <Users className="w-4 h-4" />
              Участие (даже за проигрыш)
            </span>
            <span className="text-white font-bold flex items-center gap-1">
              50 <Coins className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-white" />
          <div className="text-white font-bold">Контакты</div>
        </div>
        <p className="text-muted text-sm leading-relaxed">
          Спонсорство и вопросы:{' '}
          <a
            href="https://t.me/HePastic"
            target="_blank"
            rel="noreferrer"
            className="text-white font-semibold hover:underline"
          >
            @HePastic
          </a>
        </p>
      </motion.div>
    </div>
  );
}
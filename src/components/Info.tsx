export default function Info() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-white font-bold mb-2">ℹ️ О проекте</div>
        <p className="text-muted text-sm leading-relaxed">
          Standoff Tournament — платформа турниров 2х2 для Standoff 2. Регистрируйся,
          собирай команду, играй и зарабатывай внутреннюю валюту. Даже за проигрыш ты
          получаешь монеты.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-white font-bold mb-2">📜 Правила</div>
        <ul className="text-muted text-sm space-y-2 leading-relaxed">
          <li>• Формат матчей — 2х2, одна карта (Bo1).</li>
          <li>• Обязательно указывай Standoff ID в профиле, иначе выкинет из сетки.</li>
          <li>• Подтверждение участия: оба игрока команды должны подтвердить за 5 минут.</li>
          <li>• Если подтвердил только 1 — команда дисквалифицируется.</li>
          <li>• Карты выбираются по очереди: бан, пик.</li>
          <li>• Оскорбления и читы — пожизненный бан.</li>
        </ul>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-white font-bold mb-2">📞 Контакты</div>
        <p className="text-muted text-sm">
          Спонсорство и вопросы: <span className="text-white">@HePastic</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-white font-bold mb-2">🎁 Награды</div>
        <ul className="text-muted text-sm space-y-1">
          <li>• Победа в турнире: 1000 💰</li>
          <li>• Финалист: 500 💰</li>
          <li>• Участие: 50 💰 (даже за проигрыш)</li>
        </ul>
      </div>
    </div>
  );
}
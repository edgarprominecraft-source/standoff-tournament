import { useEffect, useState, useMemo } from 'react';

type Bat = {
  id: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  flip: boolean;
};

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
};

export default function HalloweenBackground() {
  const [bats, setBats] = useState<Bat[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setBats(
      Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        top: 8 + Math.random() * 35,
        delay: i * 8 + Math.random() * 6,
        duration: 22 + Math.random() * 12,
        size: 18 + Math.random() * 14,
        flip: Math.random() > 0.5,
      }))
    );
    setParticles(
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 15,
        duration: 12 + Math.random() * 12,
        size: 1 + Math.random() * 2.5,
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
      {/* ===== Базовый градиент: тёмно-фиолетовый → чёрный ===== */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #0a0410 0%, #14061f 35%, #1a0820 60%, #050108 100%)',
        }}
      />

      {/* ===== Мягкие цветные пятна (глубина сцены) ===== */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 35% at 15% 20%, rgba(80,20,60,0.25), transparent 70%), ' +
            'radial-gradient(ellipse 50% 40% at 85% 25%, rgba(30,10,60,0.35), transparent 70%), ' +
            'radial-gradient(ellipse 80% 30% at 50% 100%, rgba(60,15,40,0.4), transparent 80%)',
        }}
      />

      {/* ===== Луна (реалистичная, с кратерами) ===== */}
      <div className="absolute top-[6%] right-[8%]" style={{ width: 180, height: 180 }}>
        {/* Внешнее гало */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(244,228,200,0.35) 0%, rgba(244,228,200,0.12) 40%, transparent 70%)',
            transform: 'scale(2.2)',
            filter: 'blur(8px)',
          }}
        />
        {/* Сама луна */}
        <svg viewBox="0 0 180 180" className="relative w-full h-full">
          <defs>
            <radialGradient id="moonBody" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#f8ead0" />
              <stop offset="55%" stopColor="#e6d4b0" />
              <stop offset="100%" stopColor="#a89070" />
            </radialGradient>
            <radialGradient id="craterShadow" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6a5a48" />
              <stop offset="100%" stopColor="#4a3a2a" />
            </radialGradient>
          </defs>
          <circle cx="90" cy="90" r="58" fill="url(#moonBody)" />
          {/* Кратеры */}
          <ellipse cx="72" cy="72" rx="13" ry="11" fill="url(#craterShadow)" opacity="0.55" />
          <ellipse cx="72" cy="72" rx="13" ry="11" fill="none" stroke="#a08870" strokeWidth="0.6" opacity="0.6" />
          <ellipse cx="105" cy="62" rx="6" ry="5" fill="url(#craterShadow)" opacity="0.5" />
          <ellipse cx="85" cy="108" rx="15" ry="12" fill="url(#craterShadow)" opacity="0.5" />
          <ellipse cx="85" cy="108" rx="15" ry="12" fill="none" stroke="#a08870" strokeWidth="0.5" opacity="0.5" />
          <ellipse cx="120" cy="100" rx="7" ry="6" fill="url(#craterShadow)" opacity="0.45" />
          <ellipse cx="65" cy="108" rx="5" ry="4" fill="url(#craterShadow)" opacity="0.4" />
          <ellipse cx="105" cy="128" rx="9" ry="7" fill="url(#craterShadow)" opacity="0.45" />
          <ellipse cx="55" cy="60" rx="4" ry="3" fill="url(#craterShadow)" opacity="0.4" />
        </svg>
      </div>

      {/* ===== Силуэт леса внизу ===== */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1200 320"
        preserveAspectRatio="none"
        style={{ height: '38vh' }}
      >
        <defs>
          <linearGradient id="treeFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0510" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
        </defs>
        {/* Дальний ряд ёлок */}
        <g fill="#0d0618" opacity="0.75">
          {Array.from({ length: 40 }).map((_, i) => {
            const x = i * 30 + Math.sin(i) * 12;
            const h = 90 + Math.abs(Math.sin(i * 1.7)) * 70;
            const w = 24 + Math.abs(Math.cos(i)) * 12;
            return (
              <path
                key={i}
                d={`M${x},${320 - h} L${x + w / 2},${320 - h * 0.55} L${x + w},${320 - h * 0.55} L${x + w / 2 + 4},${320} L${x + w / 2 - 4},${320} Z`}
              />
            );
          })}
        </g>
        {/* Ближний ряд — крупнее и темнее */}
        <g fill="url(#treeFade)">
          {Array.from({ length: 25 }).map((_, i) => {
            const x = i * 50 + Math.sin(i * 2.3) * 20;
            const h = 140 + Math.abs(Math.sin(i * 1.2)) * 100;
            const w = 36 + Math.abs(Math.cos(i * 1.5)) * 18;
            return (
              <path
                key={i}
                d={`M${x},${320 - h} L${x + w / 2},${320 - h * 0.5} L${x + w},${320 - h * 0.5} L${x + w / 2 + 6},${320} L${x + w / 2 - 6},${320} Z`}
              />
            );
          })}
        </g>
      </svg>

      {/* ===== Туман — 3 слоя ===== */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[45vh]"
        style={{
          background:
            'linear-gradient(0deg, rgba(120,60,90,0.28) 0%, rgba(60,20,50,0.15) 40%, transparent 100%)',
          animation: 'fogDrift1 60s ease-in-out infinite alternate',
          filter: 'blur(20px)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-[30vh]"
        style={{
          background:
            'linear-gradient(0deg, rgba(80,40,80,0.35) 0%, transparent 100%)',
          animation: 'fogDrift2 45s ease-in-out infinite alternate',
          filter: 'blur(28px)',
        }}
      />

      {/* ===== Летучие мыши ===== */}
      {bats.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            top: `${b.top}%`,
            left: b.flip ? 'auto' : '-50px',
            right: b.flip ? '-50px' : 'auto',
            width: b.size,
            animation: `batFly${b.flip ? 'R' : 'L'} ${b.duration}s linear ${b.delay}s infinite`,
          }}
        >
          <svg viewBox="0 0 100 50" width="100%" height="100%">
            <path
              d="M50 25 Q43 14 32 10 Q36 18 42 22 Q32 18 22 20 Q28 25 38 27 Q30 30 20 38 Q32 34 42 28 Q45 34 50 38 Q55 34 58 28 Q68 34 80 38 Q70 30 62 27 Q72 25 78 20 Q68 18 58 22 Q64 18 68 10 Q57 14 50 25 Z"
              fill="#000000"
              opacity="0.8"
            />
          </svg>
        </div>
      ))}

      {/* ===== Паутина в левом верхнем углу + паук ===== */}
      <svg
        className="absolute top-0 left-0 opacity-30"
        width="200"
        height="200"
        viewBox="0 0 200 200"
      >
        <g stroke="#c8b4a0" strokeWidth="0.7" fill="none">
          <line x1="0" y1="0" x2="200" y2="55" />
          <line x1="0" y1="0" x2="190" y2="95" />
          <line x1="0" y1="0" x2="150" y2="155" />
          <line x1="0" y1="0" x2="90" y2="195" />
          <line x1="0" y1="0" x2="200" y2="20" />
          <path d="M35 18 Q58 38 52 62" />
          <path d="M75 38 Q102 62 92 102" />
          <path d="M115 62 Q148 90 128 145" />
          <path d="M155 88 Q180 118 155 168" />
        </g>
        {/* Паук */}
        <g transform="translate(48, 52)" fill="#0a0208">
          <ellipse cx="0" cy="0" rx="4" ry="5" />
          <ellipse cx="0" cy="-5" rx="2.5" ry="2.5" />
          <line x1="-3" y1="-2" x2="-9" y2="-6" stroke="#0a0208" strokeWidth="0.8" />
          <line x1="-3" y1="0" x2="-10" y2="0" stroke="#0a0208" strokeWidth="0.8" />
          <line x1="-3" y1="2" x2="-9" y2="6" stroke="#0a0208" strokeWidth="0.8" />
          <line x1="3" y1="-2" x2="9" y2="-6" stroke="#0a0208" strokeWidth="0.8" />
          <line x1="3" y1="0" x2="10" y2="0" stroke="#0a0208" strokeWidth="0.8" />
          <line x1="3" y1="2" x2="9" y2="6" stroke="#0a0208" strokeWidth="0.8" />
        </g>
      </svg>

      {/* ===== Паутина в правом нижнем углу ===== */}
      <svg
        className="absolute bottom-0 right-0 opacity-25 rotate-180"
        width="150"
        height="150"
        viewBox="0 0 150 150"
      >
        <g stroke="#c8b4a0" strokeWidth="0.6" fill="none">
          <line x1="0" y1="0" x2="150" y2="40" />
          <line x1="0" y1="0" x2="130" y2="75" />
          <line x1="0" y1="0" x2="85" y2="125" />
          <line x1="0" y1="0" x2="40" y2="148" />
          <path d="M28 12 Q45 28 42 48" />
          <path d="M58 28 Q78 48 70 80" />
          <path d="M90 45 Q115 70 100 115" />
        </g>
      </svg>

      {/* ===== Искры / пепел ===== */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            background:
              'radial-gradient(circle, rgba(255,180,100,0.9) 0%, rgba(255,120,40,0.4) 60%, transparent 100%)',
            boxShadow: '0 0 6px rgba(255,140,60,0.8)',
            animation: `emberRise ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* ===== Свечи в углах ===== */}
      <div className="absolute bottom-[22vh] left-[6%]" style={{ width: 4, height: 22 }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: 6,
            height: 12,
            background: 'radial-gradient(circle, #ffb347 0%, #ff6b00 60%, transparent 100%)',
            boxShadow: '0 0 18px rgba(255,140,40,0.9), 0 0 36px rgba(255,100,20,0.5)',
            animation: 'candleFlicker 2.3s ease-in-out infinite',
          }}
        />
        <div className="absolute bottom-0 left-0 w-full h-3 rounded" style={{ background: '#c8b896' }} />
      </div>

      {/* ===== Виньетка ===== */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* ===== Анимации ===== */}
      <style>{`
        @keyframes fogDrift1 {
          0% { transform: translateX(-6%) }
          100% { transform: translateX(6%) }
        }
        @keyframes fogDrift2 {
          0% { transform: translateX(5%) }
          100% { transform: translateX(-5%) }
        }
        @keyframes batFlyL {
          0% { transform: translateX(0) translateY(0) scale(0.8) }
          25% { transform: translateX(28vw) translateY(-30px) scale(1) }
          50% { transform: translateX(55vw) translateY(20px) scale(0.9) }
          75% { transform: translateX(82vw) translateY(-25px) scale(1.1) }
          100% { transform: translateX(110vw) translateY(0) scale(0.8) }
        }
        @keyframes batFlyR {
          0% { transform: translateX(0) translateY(0) scale(0.8) }
          25% { transform: translateX(-28vw) translateY(-30px) scale(1) }
          50% { transform: translateX(-55vw) translateY(20px) scale(0.9) }
          75% { transform: translateX(-82vw) translateY(-25px) scale(1.1) }
          100% { transform: translateX(-110vw) translateY(0) scale(0.8) }
        }
        @keyframes emberRise {
          0% { transform: translateY(0) scale(1); opacity: 0 }
          10% { opacity: 1 }
          90% { opacity: 0.6 }
          100% { transform: translateY(-90vh) translateX(30px) scale(0.4); opacity: 0 }
        }
        @keyframes candleFlicker {
          0%, 100% { transform: translateX(-50%) scale(1) }
          25% { transform: translateX(-50%) scale(1.08, 0.95) }
          50% { transform: translateX(-50%) scale(0.95, 1.05) }
          75% { transform: translateX(-50%) scale(1.05, 0.98) }
        }
      `}</style>
    </div>
  );
}
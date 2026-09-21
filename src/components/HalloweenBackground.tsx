import { useEffect, useState } from 'react';

type Bat = {
  id: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  flip: boolean;
};

type Ember = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
};

type Fog = {
  id: number;
  bottom: number;
  height: number;
  delay: number;
  duration: number;
  opacity: number;
};

export default function HalloweenBackground() {
  const [bats, setBats] = useState<Bat[]>([]);
  const [embers, setEmbers] = useState<Ember[]>([]);
  const [fogs, setFogs] = useState<Fog[]>([]);

  useEffect(() => {
    setBats(
      Array.from({ length: 4 }).map((_, i) => ({
        id: i,
        top: 6 + Math.random() * 30,
        delay: i * 10 + Math.random() * 8,
        duration: 26 + Math.random() * 14,
        size: 22 + Math.random() * 18,
        flip: Math.random() > 0.5,
      }))
    );

    setEmbers(
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 20,
        duration: 14 + Math.random() * 12,
        size: 1.5 + Math.random() * 2,
      }))
    );

    setFogs(
      Array.from({ length: 4 }).map((_, i) => ({
        id: i,
        bottom: Math.random() * 15,
        height: 30 + Math.random() * 25,
        delay: Math.random() * 10,
        duration: 40 + Math.random() * 30,
        opacity: 0.15 + Math.random() * 0.15,
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
      {/* ===== Базовый фон: глубокая ночь с бордово-фиолетовым свечением ===== */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 20% 0%, #1a0824 0%, transparent 55%), ' +
            'radial-gradient(ellipse 70% 50% at 85% 15%, #2a0a1a 0%, transparent 60%), ' +
            'radial-gradient(ellipse 120% 80% at 50% 110%, #0a0208 0%, transparent 70%), ' +
            'linear-gradient(180deg, #050208 0%, #0a0410 40%, #050208 100%)',
        }}
      />

      {/* ===== Луна — реалистичная, кроваво-красная (halloween) ===== */}
      <div className="absolute top-[7%] right-[10%]" style={{ width: 160, height: 160 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(200,80,40,0.3) 0%, rgba(150,40,30,0.15) 40%, transparent 70%)',
            transform: 'scale(2.4)',
            filter: 'blur(10px)',
          }}
        />
        <svg viewBox="0 0 160 160" className="relative w-full h-full">
          <defs>
            <radialGradient id="moonBody2" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f0d0a8" />
              <stop offset="45%" stopColor="#d4a878" />
              <stop offset="100%" stopColor="#7a4a38" />
            </radialGradient>
            <radialGradient id="crater" cx="40%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#4a2818" />
              <stop offset="100%" stopColor="#2a1408" />
            </radialGradient>
          </defs>
          <circle cx="80" cy="80" r="52" fill="url(#moonBody2)" />
          <ellipse cx="62" cy="65" rx="12" ry="10" fill="url(#crater)" opacity="0.5" />
          <ellipse cx="100" cy="58" rx="6" ry="5" fill="url(#crater)" opacity="0.5" />
          <ellipse cx="78" cy="98" rx="14" ry="11" fill="url(#crater)" opacity="0.55" />
          <ellipse cx="108" cy="92" rx="7" ry="6" fill="url(#crater)" opacity="0.45" />
          <ellipse cx="55" cy="98" rx="4" ry="3" fill="url(#crater)" opacity="0.4" />
          <ellipse cx="95" cy="118" rx="8" ry="6" fill="url(#crater)" opacity="0.4" />
        </svg>
      </div>

      {/* ===== Туман: 4 медленных слоя у горизонта ===== */}
      {fogs.map((f) => (
        <div
          key={f.id}
          className="absolute left-[-20%] right-[-20%]"
          style={{
            bottom: `${f.bottom}%`,
            height: `${f.height}%`,
            background:
              'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(140,70,100,0.5) 0%, transparent 70%)',
            opacity: f.opacity,
            filter: 'blur(30px)',
            animation: `fogFloat ${f.duration}s ease-in-out ${f.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* ===== Летучие мыши (редкие, реалистичный силуэт) ===== */}
      {bats.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            top: `${b.top}%`,
            left: b.flip ? 'auto' : '-60px',
            right: b.flip ? '-60px' : 'auto',
            width: b.size,
            animation: `batFly${b.flip ? 'R' : 'L'} ${b.duration}s linear ${b.delay}s infinite`,
          }}
        >
          <svg viewBox="0 0 100 40" width="100%" height="100%">
            <path
              d="M50 20 Q44 12 36 8 Q40 15 45 18 Q36 15 26 16 Q32 20 40 21 Q32 24 24 30 Q34 27 42 22 Q46 27 50 30 Q54 27 58 22 Q66 27 76 30 Q68 24 60 21 Q68 20 74 16 Q64 15 55 18 Q60 15 64 8 Q56 12 50 20 Z"
              fill="#000000"
              opacity="0.85"
            />
          </svg>
        </div>
      ))}

      {/* ===== Паутина в левом верхнем углу (тонкая, реалистичная) ===== */}
      <svg
        className="absolute top-0 left-0 opacity-40"
        width="220"
        height="220"
        viewBox="0 0 220 220"
      >
        <g stroke="#b8a890" strokeWidth="0.6" fill="none" opacity="0.7">
          <line x1="0" y1="0" x2="220" y2="50" />
          <line x1="0" y1="0" x2="210" y2="90" />
          <line x1="0" y1="0" x2="170" y2="150" />
          <line x1="0" y1="0" x2="110" y2="200" />
          <line x1="0" y1="0" x2="220" y2="15" />
          <line x1="0" y1="0" x2="60" y2="215" />
          <path d="M40 20 Q62 42 55 68" />
          <path d="M80 40 Q108 68 96 112" />
          <path d="M120 65 Q155 95 132 155" />
          <path d="M160 92 Q190 125 165 180" />
          <path d="M20 40 Q35 55 30 80" />
        </g>
        {/* Паук в паутине */}
        <g transform="translate(52, 58)" fill="#08030a">
          <ellipse cx="0" cy="0" rx="4.5" ry="5.5" />
          <ellipse cx="0" cy="-5" rx="2.5" ry="2.5" />
          <line x1="-4" y1="-2" x2="-11" y2="-7" stroke="#08030a" strokeWidth="0.9" />
          <line x1="-4" y1="0" x2="-12" y2="0" stroke="#08030a" strokeWidth="0.9" />
          <line x1="-4" y1="2" x2="-11" y2="7" stroke="#08030a" strokeWidth="0.9" />
          <line x1="4" y1="-2" x2="11" y2="-7" stroke="#08030a" strokeWidth="0.9" />
          <line x1="4" y1="0" x2="12" y2="0" stroke="#08030a" strokeWidth="0.9" />
          <line x1="4" y1="2" x2="11" y2="7" stroke="#08030a" strokeWidth="0.9" />
        </g>
      </svg>

      {/* ===== Тонкая паутина в правом верхнем углу ===== */}
      <svg
        className="absolute top-0 right-0 opacity-30"
        width="140"
        height="140"
        viewBox="0 0 140 140"
        style={{ transform: 'scaleX(-1)' }}
      >
        <g stroke="#b8a890" strokeWidth="0.5" fill="none">
          <line x1="0" y1="0" x2="140" y2="35" />
          <line x1="0" y1="0" x2="125" y2="70" />
          <line x1="0" y1="0" x2="85" y2="115" />
          <path d="M28 14 Q45 30 40 50" />
          <path d="M58 30 Q78 50 70 82" />
          <path d="M88 48 Q110 72 95 112" />
        </g>
      </svg>

      {/* ===== Искры / пепел — тёплые оранжевые ===== */}
      {embers.map((e) => (
        <div
          key={e.id}
          className="absolute rounded-full"
          style={{
            left: `${e.left}%`,
            bottom: '-10px',
            width: e.size,
            height: e.size,
            background:
              'radial-gradient(circle, rgba(255,200,120,1) 0%, rgba(255,120,30,0.6) 50%, transparent 100%)',
            boxShadow: '0 0 8px rgba(255,150,60,0.9)',
            animation: `emberRise ${e.duration}s linear ${e.delay}s infinite`,
          }}
        />
      ))}

      {/* ===== Кровавая виньетка — тёмные края с бордовым ===== */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 20%, rgba(20,0,10,0.4) 60%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      {/* ===== Анимации ===== */}
      <style>{`
        @keyframes spiderSwing {
          0%, 100% { transform: translateY(0) rotate(-2deg) }
          50% { transform: translateY(6px) rotate(2deg) }
        }
        @keyframes pumpkinGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(255,140,40,0.7)); transform: scale(1) }
          50% { filter: drop-shadow(0 0 14px rgba(255,140,40,1)); transform: scale(1.05) }
        }
        @keyframes fogFloat {
          0% { transform: translateX(-8%) scale(1) }
          100% { transform: translateX(8%) scale(1.15) }
        }
        @keyframes batFlyL {
          0% { transform: translateX(0) tran      {/* Паутины сверху */}
      <svg className="absolute top-0 left-[10%] opacity-50" width="120" height="200" viewBox="0 0 120 200">
        <g stroke="#c8b4a0" strokeWidth="0.5" fill="none">
          <line x1="60" y1="0" x2="60" y2="190" />
          <line x1="60" y1="0" x2="10" y2="150" />
          <line x1="60" y1="0" x2="110" y2="150" />
          <line x1="60" y1="0" x2="20" y2="80" />
          <line x1="60" y1="0" x2="100" y2="80" />
          <path d="M40 40 Q55 60 50 85" />
          <path d="M80 40 Q65 60 70 85" />
          <path d="M30 100 Q50 120 45 150" />
          <path d="M90 100 Q70 120 75 150" />
        </g>
      </svg>

      <svg className="absolute top-0 right-[18%] opacity-40" width="90" height="160" viewBox="0 0 90 160">
        <g stroke="#c8b4a0" strokeWidth="0.5" fill="none">
          <line x1="45" y1="0" x2="45" y2="150" />
          <line x1="45" y1="0" x2="10" y2="110" />
          <line x1="45" y1="0" x2="80" y2="110" />
          <path d="M30 30 Q42 45 38 65" />
          <path d="M60 30 Q48 45 52 65" />
          <path d="M22 80 Q38 95 35 120" />
          <path d="M68 80 Q52 95 55 120" />
        </g>
      </svg>

      {/* Паук на нитке */}
      <div className="absolute top-0 left-[14%]" style={{ animation: 'spiderSwing 6s ease-in-out infinite' }}>
        <svg width="24" height="30" viewBox="0 0 24 30">
          <line x1="12" y1="0" x2="12" y2="12" stroke="#c8b4a0" strokeWidth="0.5" />
          <g transform="translate(12, 18)" fill="#08030a">
            <ellipse cx="0" cy="0" rx="4" ry="5" />
            <ellipse cx="0" cy="-4.5" rx="2.2" ry="2.2" />
            <line x1="-3" y1="-2" x2="-9" y2="-6" stroke="#08030a" strokeWidth="0.8" />
            <line x1="-3" y1="0" x2="-10" y2="0" stroke="#08030a" strokeWidth="0.8" />
            <line x1="-3" y1="2" x2="-9" y2="6" stroke="#08030a" strokeWidth="0.8" />
            <line x1="3" y1="-2" x2="9" y2="-6" stroke="#08030a" strokeWidth="0.8" />
            <line x1="3" y1="0" x2="10" y2="0" stroke="#08030a" strokeWidth="0.8" />
            <line x1="3" y1="2" x2="9" y2="6" stroke="#08030a" strokeWidth="0.8" />
          </g>
        </svg>
      </div>

      {/* Тыквы */}
      <div className="absolute bottom-[14vh] left-[4%]" style={{ animation: 'pumpkinGlow 3.2s ease-in-out infinite' }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <path d="M22 4 Q20 8 20 11" stroke="#3a5a20" strokeWidth="2" fill="none" />
          <ellipse cx="22" cy="25" rx="17" ry="15" fill="#d4551a" />
          <ellipse cx="22" cy="25" rx="17" ry="15" fill="none" stroke="#8a2808" strokeWidth="1" />
          <polygon points="15,22 11,17 15,24" fill="#0a0400" />
          <polygon points="29,22 33,17 29,24" fill="#0a0400" />
          <path d="M14 30 Q22 35 30 30" stroke="#0a0400" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <div className="absolute bottom-[18vh] right-[4%]" style={{ animation: 'pumpkinGlow 3.8s ease-in-out 0.6s infinite' }}>
        <svg width="36" height="36" viewBox="0 0 44 44">
          <path d="M22 4 Q20 8 20 11" stroke="#3a5a20" strokeWidth="2" fill="none" />
          <ellipse cx="22" cy="25" rx="17" ry="15" fill="#e06a24" />
          <ellipse cx="22" cy="25" rx="17" ry="15" fill="none" stroke="#8a2808" strokeWidth="1" />
          <polygon points="15,22 11,17 15,24" fill="#0a0400" />
          <polygon points="29,22 33,17 29,24" fill="#0a0400" />
          <path d="M14 30 Q22 35 30 30" stroke="#0a0400" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Конфеты на нитках */}
      <svg className="absolute top-0 left-[35%] opacity-70" width="80" height="140" viewBox="0 0 80 140">
        <line x1="20" y1="0" x2="20" y2="50" stroke="#aaa" strokeWidth="0.3" />
        <line x1="50" y1="0" x2="50" y2="80" stroke="#aaa" strokeWidth="0.3" />
        <line x1="65" y1="0" x2="65" y2="40" stroke="#aaa" strokeWidth="0.3" />
        <circle cx="20" cy="55" r="7" fill="#ff8a3a" stroke="#0a0400" strokeWidth="0.5" />
        <circle cx="20" cy="55" r="2" fill="#fff" opacity="0.7" />
        <circle cx="50" cy="85" r="8" fill="#d94a8c" stroke="#0a0400" strokeWidth="0.5" />
        <circle cx="50" cy="85" r="2.5" fill="#fff" opacity="0.7" />
        <circle cx="65" cy="45" r="6" fill="#8a3ab8" stroke="#0a0400" strokeWidth="0.5" />
        <circle cx="65" cy="45" r="1.8" fill="#fff" opacity="0.7" />
      </svg>
slateY(0) scale(0.85) }
          25% { transform: translateX(28vw) translateY(-25px) scale(1) }
          50% { transform: translateX(55vw) translateY(18px) scale(0.9) }
          75% { transform: translateX(82vw) translateY(-22px) scale(1.05) }
          100% { transform: translateX(110vw) translateY(0) scale(0.85) }
        }
        @keyframes batFlyR {
          0% { transform: translateX(0) translateY(0) scale(0.85) }
          25% { transform: translateX(-28vw) translateY(-25px) scale(1) }
          50% { transform: translateX(-55vw) translateY(18px) scale(0.9) }
          75% { transform: translateX(-82vw) translateY(-22px) scale(1.05) }
          100% { transform: translateX(-110vw) translateY(0) scale(0.85) }
        }
        @keyframes emberRise {
          0% { transform: translateY(0) translateX(0); opacity: 0 }
          10% { opacity: 1 }
          90% { opacity: 0.4 }
          100% { transform: translateY(-95vh) translateX(40px); opacity: 0 }
        }
      `}</style>
    </div>
  );
}
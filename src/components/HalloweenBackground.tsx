import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Bat = {
  id: number;
  startX: number; startY: number;
  endX: number; endY: number;
  duration: number; delay: number; scale: number;
};

type Ember = {
  id: number; x: number; delay: number; duration: number; size: number;
};

export default function HalloweenBackground() {
  const [bats, setBats] = useState<Bat[]>([]);
  const [embers, setEmbers] = useState<Ember[]>([]);

  useEffect(() => {
    setBats(
      Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        startX: -10 + Math.random() * 30,
        startY: 20 + Math.random() * 25,
        endX: 110 + Math.random() * 20,
        endY: 15 + Math.random() * 30,
        duration: 22 + Math.random() * 14,
        delay: Math.random() * 15,
        scale: 0.6 + Math.random() * 0.7,
      }))
    );
    setEmbers(
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 5 + Math.random() * 6,
        size: 1 + Math.random() * 1.8,
      }))
    );
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* === БАЗОВЫЙ ГРАДИЕНТ — ночь, глубокий фиолет, багровый низ === */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(120, 10, 0, 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 80% 15%, rgba(180, 40, 20, 0.18) 0%, transparent 60%),
            linear-gradient(180deg, #000000 0%, #05000a 25%, #0d0118 50%, #150120 75%, #05000a 100%)
          `,
        }}
      />

      {/* === ТУМАННОСТЬ НАВЕРХУ (размытые пятна) === */}
      {[
        { x: 15, y: 8, size: 340, color: 'rgba(60, 20, 90, 0.35)' },
        { x: 70, y: 20, size: 420, color: 'rgba(40, 10, 70, 0.25)' },
        { x: 45, y: 5, size: 280, color: 'rgba(80, 20, 50, 0.2)' },
      ].map((n, i) => (
        <motion.div
          key={`neb-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            width: n.size,
            height: n.size * 0.4,
            background: `radial-gradient(ellipse, ${n.color} 0%, transparent 70%)`,
            filter: 'blur(30px)',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 12 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* === ЗВЁЗДЫ (мелкие и редкие) === */}
      {Array.from({ length: 70 }).map((_, i) => {
        const size = Math.random() * 1.4 + 0.3;
        const bright = Math.random() > 0.85;
        return (
          <motion.div
            key={`star-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 48}%`,
              width: size,
              height: size,
              background: bright ? '#fff8f0' : '#b8b8d0',
              boxShadow: bright ? '0 0 4px #fff8f0, 0 0 8px rgba(255,200,150,0.5)' : 'none',
            }}
            animate={{ opacity: [0.15, bright ? 1 : 0.7, 0.15] }}
            transition={{
              duration: 3 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 8,
            }}
          />
        );
      })}

      {/* === КРОВАВАЯ ЛУНА (фотореалистичная) === */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 4, ease: 'easeOut' }}
        className="absolute"
        style={{ top: 60, right: 40, width: 130, height: 130 }}
      >
        {/* Внешнее гало — багровое свечение */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -80,
            background:
              'radial-gradient(circle, rgba(200, 40, 10, 0.35) 0%, rgba(120, 10, 0, 0.15) 30%, transparent 65%)',
            filter: 'blur(15px)',
          }}
        />
        {/* Второе гало — фиолетовое */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -140,
            background:
              'radial-gradient(circle, rgba(120, 40, 180, 0.18) 0%, transparent 60%)',
            filter: 'blur(25px)',
          }}
        />
        {/* Сама луна */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, #ffe0b8 0%, #e5a060 25%, #b05020 55%, #4a1005 85%, #200500 100%)',
            boxShadow:
              'inset -10px -15px 30px rgba(0, 0, 0, 0.7), inset 15px 10px 25px rgba(255, 200, 150, 0.25), 0 0 40px rgba(200, 60, 20, 0.5)',
          }}
        >
          {/* Кратеры */}
          <div className="absolute rounded-full" style={{ top: '20%', left: '15%', width: '20%', height: '20%', background: 'radial-gradient(circle, rgba(60,20,5,0.5), transparent)', filter: 'blur(2px)' }} />
          <div className="absolute rounded-full" style={{ top: '55%', left: '30%', width: '15%', height: '15%', background: 'radial-gradient(circle, rgba(80,30,10,0.6), transparent)', filter: 'blur(1.5px)' }} />
          <div className="absolute rounded-full" style={{ top: '35%', right: '22%', width: '12%', height: '12%', background: 'radial-gradient(circle, rgba(60,20,5,0.55), transparent)', filter: 'blur(1.5px)' }} />
          <div className="absolute rounded-full" style={{ bottom: '20%', right: '30%', width: '18%', height: '18%', background: 'radial-gradient(circle, rgba(50,15,0,0.5), transparent)', filter: 'blur(2px)' }} />
          <div className="absolute rounded-full" style={{ top: '10%', right: '40%', width: '8%', height: '8%', background: 'radial-gradient(circle, rgba(80,30,10,0.5), transparent)', filter: 'blur(1px)' }} />
        </div>
      </motion.div>

      {/* === ОБЛАКА, ПРОПЛЫВАЮЩИЕ ЧЕРЕЗ ЛУНУ === */}
      <motion.div
        className="absolute"
        style={{ top: 90, right: -100, width: 420, height: 100, opacity: 0.7 }}
        animate={{ x: ['-100%', '120%'] }}
        transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="w-full h-full"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, #0a0118 0%, #0a0118 40%, transparent 75%)',
            filter: 'blur(12px)',
          }}
        />
      </motion.div>

      {/* === ДАЛЁКИЕ ГОРЫ === */}
      <svg
        className="absolute left-0 right-0 w-full"
        style={{ bottom: 180, height: 140 }}
        viewBox="0 0 1200 140"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="mountGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0525" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#05000a" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d="M0 140 L0 90 Q80 55 160 95 Q240 40 340 80 Q420 20 520 90 Q600 45 700 85 Q800 25 900 95 Q980 55 1080 80 Q1140 50 1200 75 L1200 140 Z"
          fill="url(#mountGrad)"
        />
      </svg>

      {/* === ТУМАН ЗА ЛЕСОМ (движется медленно) === */}
      <motion.div
        className="absolute left-0 right-0"
        style={{ bottom: 100, height: 180 }}
        animate={{ x: ['-10%', '10%', '-10%'] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="w-full h-full"
          style={{
            background:
              'linear-gradient(to top, rgba(80, 40, 120, 0.35) 0%, rgba(80, 40, 120, 0.15) 50%, transparent 100%)',
            filter: 'blur(30px)',
          }}
        />
      </motion.div>

      {/* === ДАЛЬНИЙ ЛЕС === */}
      <svg
        className="absolute left-0 right-0 w-full"
        style={{ bottom: 60, height: 220 }}
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="farTree" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0014" stopOpacity="1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </linearGradient>
        </defs>
        {Array.from({ length: 34 }).map((_, i) => {
          const x = i * 36 + (i % 4) * 8;
          const h = 60 + (i % 5) * 28;
          return (
            <polygon
              key={`ft-${i}`}
              points={`${x},220 ${x - 20},${220 - h} ${x + 20},${220 - h}`}
              fill="url(#farTree)"
              opacity="0.75"
            />
          );
        })}
      </svg>

      {/* === СРЕДНИЙ ЛЕС (более тёмный и высокий) === */}
      <svg
        className="absolute left-0 right-0 w-full"
        style={{ bottom: 40, height: 260 }}
        viewBox="0 0 1200 260"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 26 }).map((_, i) => {
          const x = i * 48 + (i % 3) * 12;
          const h = 100 + (i % 6) * 32;
          return (
            <polygon
              key={`mt-${i}`}
              points={`${x},260 ${x - 26},${260 - h} ${x + 26},${260 - h}`}
              fill="#020002"
            />
          );
        })}
      </svg>

      {/* === ЗЕМЛЯ / ХОЛМ === */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: 80,
          background:
            'linear-gradient(to bottom, #000000 0%, #05000a 40%, #000000 100%)',
        }}
      />

      {/* === КЛАДБИЩЕ — НАДГРОБИЯ РАЗНОГО РАЗМЕРА === */}
      {[
        { x: 8,  w: 26, h: 38, rot: -3 },
        { x: 24, w: 20, h: 30, rot: 2 },
        { x: 38, w: 32, h: 46, rot: -1 },
        { x: 56, w: 22, h: 34, rot: 4 },
        { x: 70, w: 28, h: 42, rot: -2 },
        { x: 84, w: 24, h: 36, rot: 3 },
        { x: 94, w: 18, h: 28, rot: -4 },
      ].map((t, i) => (
        <div
          key={`tomb-${i}`}
          className="absolute"
          style={{
            left: `${t.x}%`,
            bottom: 6 + (i % 2) * 4,
            width: t.w,
            height: t.h,
            transform: `rotate(${t.rot}deg)`,
            filter: 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.8))',
          }}
        >
          <svg viewBox="0 0 30 46" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`tg-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#15151c" />
                <stop offset="100%" stopColor="#050508" />
              </linearGradient>
            </defs>
            <path
              d="M3 46 L3 16 Q3 3 15 3 Q27 3 27 16 L27 46 Z"
              fill={`url(#tg-${i})`}
              stroke="#252530"
              strokeWidth="0.5"
            />
            {/* Крест */}
            <line x1="15" y1="12" x2="15" y2="28" stroke="#2a2a35" strokeWidth="1.8" />
            <line x1="9" y1="20" x2="21" y2="20" stroke="#2a2a35" strokeWidth="1.8" />
            {/* Трещины */}
            <path
              d={`M${8 + i} 5 L${12 + i} 14 L${9 + i} 22`}
              stroke="#0a0a10"
              strokeWidth="0.6"
              fill="none"
              opacity="0.9"
            />
          </svg>
        </div>
      ))}

      {/* === СВЕЧИ НА НАДГРОБИЯХ === */}
      {[
        { x: 12, y: 46 },
        { x: 42, y: 52 },
        { x: 74, y: 50 },
      ].map((c, i) => (
        <motion.div
          key={`candle-${i}`}
          className="absolute"
          style={{ left: `${c.x}%`, bottom: c.y, width: 6, height: 14 }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.5 + i * 0.3, repeat: Infinity }}
        >
          {/* Огонёк */}
          <motion.div
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: -4,
              transform: 'translateX(-50%)',
              width: 5,
              height: 8,
              background:
                'radial-gradient(ellipse at 50% 80%, #fff3b0 0%, #ff9020 40%, #ff4400 70%, transparent 100%)',
              filter: 'blur(0.5px)',
            }}
            animate={{
              scaleY: [1, 1.3, 0.9, 1.15, 1],
              scaleX: [1, 0.9, 1.1, 0.95, 1],
            }}
            transition={{ duration: 0.8 + i * 0.15, repeat: Infinity }}
          />
          {/* Свечение вокруг огня */}
          <div
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: -8,
              transform: 'translateX(-50%)',
              width: 40,
              height: 40,
              background:
                'radial-gradient(circle, rgba(255, 150, 40, 0.4) 0%, transparent 60%)',
              filter: 'blur(8px)',
            }}
          />
          {/* Свеча */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-sm"
            style={{
              height: 12,
              background: 'linear-gradient(180deg, #e0d8c8 0%, #a09080 100%)',
            }}
          />
        </motion.div>
      ))}

      {/* === СВЕТЯЩИЕСЯ ТЫКВЫ — стильные, не мультяшные === */}
      {[
        { x: 6,  size: 52, delay: 0.0, bottom: 22, hue: 20 },
        { x: 20, size: 38, delay: 0.4, bottom: 18, hue: 15 },
        { x: 48, size: 70, delay: 0.8, bottom: 26, hue: 25 },
        { x: 66, size: 44, delay: 1.2, bottom: 20, hue: 18 },
        { x: 88, size: 58, delay: 1.6, bottom: 24, hue: 22 },
      ].map((p) => (
        <motion.div
          key={`pump-${p.x}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{ delay: p.delay, duration: 1.5, ease: 'easeOut' }}
        >
          {/* Внешнее свечение */}
          <motion.div
            className="absolute rounded-full"
            style={{
              inset: -25,
              background:
                'radial-gradient(circle, rgba(255, 100, 20, 0.5) 0%, rgba(200, 40, 0, 0.2) 40%, transparent 70%)',
              filter: 'blur(12px)',
            }}
            animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: p.delay }}
          />
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'relative' }}>
            <defs>
              <radialGradient id={`pk-${p.x}`} cx="50%" cy="60%" r="55%">
                <stop offset="0%" stopColor={`hsl(${p.hue + 20}, 100%, 65%)`} />
                <stop offset="45%" stopColor={`hsl(${p.hue}, 95%, 45%)`} />
                <stop offset="85%" stopColor={`hsl(${p.hue}, 80%, 22%)`} />
                <stop offset="100%" stopColor="#200800" />
              </radialGradient>
            </defs>
            {/* Тело тыквы — 3 сегмента */}
            <ellipse cx="30" cy="60" rx="20" ry="32" fill={`url(#pk-${p.x})`} opacity="0.9" />
            <ellipse cx="70" cy="60" rx="20" ry="32" fill={`url(#pk-${p.x})`} opacity="0.9" />
            <ellipse cx="50" cy="60" rx="22" ry="34" fill={`url(#pk-${p.x})`} />
            {/* Бороздки */}
            <ellipse cx="50" cy="60" rx="14" ry="34" fill="none" stroke="#5a1a00" strokeWidth="0.6" opacity="0.6" />
            <ellipse cx="50" cy="60" rx="28" ry="34" fill="none" stroke="#5a1a00" strokeWidth="0.5" opacity="0.4" />
            {/* Хвостик */}
            <rect x="47" y="20" width="6" height="10" rx="2" fill="#2a1200" />
            <path d="M50 20 Q56 12 62 15" stroke="#1a0a00" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Зловещие глаза — не треугольники, а миндалевидные */}
            <path d="M28 55 Q35 48 42 55 Q35 58 28 55 Z" fill="#000" />
            <path d="M58 55 Q65 48 72 55 Q65 58 58 55 Z" fill="#000" />
            {/* Внутренний свет в глазах */}
            <path d="M31 54 Q36 51 39 54 Q36 56 31 54 Z" fill="#ffb055" opacity="0.9" />
            <path d="M61 54 Q66 51 69 54 Q66 56 61 54 Z" fill="#ffb055" opacity="0.9" />
            {/* Злой рот */}
            <path
              d="M30 72 Q36 80 42 72 Q48 80 54 72 Q60 80 66 72"
              stroke="#000"
              strokeWidth="3.5"
              fill="none"
              strokeLinejoin="round"
            />
            {/* Зубы */}
            <polygon points="36,72 38,78 40,72" fill="#ffddaa" opacity="0.7" />
            <polygon points="48,72 50,78 52,72" fill="#ffddaa" opacity="0.7" />
            <polygon points="60,72 62,78 64,72" fill="#ffddaa" opacity="0.7" />
          </svg>
        </motion.div>
      ))}

      {/* === ПРИЗРАКИ — эфирные, тонкие === */}
      {[
        { x: 18, y: 30, delay: 0, dur: 14, scale: 1 },
        { x: 76, y: 45, delay: 4, dur: 18, scale: 0.85 },
        { x: 52, y: 22, delay: 8, dur: 16, scale: 0.7 },
      ].map((g, i) => (
        <motion.div
          key={`ghost-${i}`}
          className="absolute"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: 70 * g.scale,
            height: 100 * g.scale,
          }}
          animate={{
            y: [-15, 15, -15],
            x: [-8, 8, -8],
            opacity: [0.05, 0.18, 0.05],
          }}
          transition={{
            duration: g.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: g.delay,
          }}
        >
          <svg viewBox="0 0 70 100" width="100%" height="100%">
            <defs>
              <radialGradient id={`gr-${i}`} cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f0f0ff" stopOpacity="1" />
                <stop offset="60%" stopColor="#a0a0d0" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#505080" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M35 5 Q10 5 10 40 L10 90 Q16 84 22 90 Q28 84 35 90 Q42 84 48 90 Q54 84 60 90 L60 40 Q60 5 35 5 Z"
              fill={`url(#gr-${i})`}
              filter="blur(2px)"
            />
            {/* Тонкие тёмные глаза */}
            <ellipse cx="24" cy="38" rx="3.5" ry="5" fill="#0a0a15" opacity="0.6" />
            <ellipse cx="46" cy="38" rx="3.5" ry="5" fill="#0a0a15" opacity="0.6" />
            <ellipse cx="35" cy="56" rx="3" ry="5" fill="#0a0a15" opacity="0.35" />
          </svg>
        </motion.div>
      ))}

      {/* === ВОРОН НА ВЕТКЕ (силуэт) === */}
      <div className="absolute" style={{ left: '10%', top: '18%', width: 60, height: 80 }}>
        {/* Ветка */}
        <svg
          className="absolute"
          style={{ left: -20, top: 50, width: 140, height: 30 }}
          viewBox="0 0 140 30"
        >
          <path
            d="M0 20 Q40 15 70 18 Q100 22 140 15"
            stroke="#050008"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M70 18 Q85 5 100 8"
            stroke="#050008"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        {/* Ворон */}
        <motion.div
          className="absolute"
          style={{ left: 10, top: 20, width: 45, height: 55 }}
          animate={{ rotate: [-1, 1.5, -1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 45 55" width="100%" height="100%">
            <ellipse cx="22" cy="32" rx="11" ry="15" fill="#020002" />
            <circle cx="22" cy="15" r="8" fill="#020002" />
            <polygon points="30,15 40,13 30,18" fill="#3a2510" />
            {/* Глаз — единственная красная точка */}
            <circle cx="25" cy="14" r="1.3" fill="#dd1010" />
            <circle cx="25" cy="14" r="0.5" fill="#ff6060" />
            {/* Хвост */}
            <path d="M22 46 L18 55 L22 52 L26 55 Z" fill="#020002" />
          </svg>
        </motion.div>
      </div>

      {/* === ЛЕТУЧИЕ МЫШИ — силуэты без глаз === */}
      {bats.map((b) => (
        <motion.div
          key={b.id}
          initial={{
            left: `${b.startX}%`,
            top: `${b.startY}%`,
            opacity: 0,
          }}
          animate={{
            left: `${b.endX}%`,
            top: `${b.endY}%`,
            opacity: [0, 0.85, 0.85, 0],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            delay: b.delay,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            transform: `scale(${b.scale})`,
            filter: 'drop-shadow(0 0 8px rgba(80, 20, 120, 0.6))',
          }}
        >
          <svg width="40" height="20" viewBox="0 0 40 20">
            <path
              d="M20 10 Q14 2 4 4 Q10 8 8 14 Q14 12 20 10 Q26 12 32 14 Q30 8 36 4 Q26 2 20 10 Z"
              fill="#020005"
            />
          </svg>
        </motion.div>
      ))}

      {/* === ИСКРЫ / УГЛИ, ВЗЛЕТАЮЩИЕ ВВЕРХ === */}
      {embers.map((e) => (
        <motion.div
          key={`ember-${e.id}`}
          className="absolute rounded-full"
          style={{
            left: `${e.x}%`,
            bottom: 0,
            width: e.size,
            height: e.size,
            background: '#ff8020',
            boxShadow: '0 0 6px #ff8020, 0 0 12px #ff4400',
          }}
          animate={{
            y: [-10, -window.innerHeight * 1.1],
            opacity: [0, 0.9, 0.7, 0],
            x: [0, (Math.random() - 0.5) * 60],
          }}
          transition={{
            duration: e.duration,
            repeat: Infinity,
            delay: e.delay,
            ease: 'linear',
          }}
        />
      ))}

      {/* === ЗЕРНО ПЛЁНКИ (шум) === */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* === ВИНЬЕТКА — тёмные края для кинематографичности === */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.5) 75%, rgba(0, 0, 0, 0.9) 100%)',
        }}
      />

      {/* === ВЕРХНЯЯ ВУАЛЬ — лёгкое затемнение сверху для контраста с UI === */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: 200,
          background:
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
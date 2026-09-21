import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Bat = {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
  size: number;
};

export default function HalloweenBackground() {
  const [bats, setBats] = useState<Bat[]>([]);

  useEffect(() => {
    // Генерируем 6 летучих мышей
    const generated: Bat[] = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      startX: Math.random() * 100,
      startY: 20 + Math.random() * 40,
      endX: Math.random() * 100,
      endY: Math.random() * 60,
      duration: 12 + Math.random() * 8,
      delay: Math.random() * 5,
      size: 20 + Math.random() * 16,
    }));
    setBats(generated);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Градиентный фон с фиолетово-чёрной палитрой */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, #4a1d6e 0%, #1a0a2e 40%, #050208 100%)',
        }}
      />

      {/* Тёмный лес на заднем плане — силуэты ёлок */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-48 opacity-40"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="treeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0510" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </linearGradient>
        </defs>
        {Array.from({ length: 30 }).map((_, i) => {
          const x = i * 42 + (i % 3) * 8;
          const h = 60 + (i % 4) * 25;
          return (
            <polygon
              key={i}
              points={`${x},200 ${x - 18},${200 - h} ${x + 18},${200 - h}`}
              fill="url(#treeGrad)"
            />
          );
        })}
        <rect y="180" width="1200" height="20" fill="#000" />
      </svg>

      {/* Луна */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ duration: 2 }}
        className="absolute top-10 right-10 w-32 h-32 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 35% 35%, #fff8e1 0%, #f0e68c 40%, #d4b106 75%, #8a6d00 100%)',
          boxShadow:
            '0 0 80px rgba(255, 240, 150, 0.4), 0 0 160px rgba(255, 200, 100, 0.2)',
        }}
      />

      {/* Паутина в верхних углах */}
      <svg
        className="absolute top-0 left-0 w-40 h-40 opacity-30"
        viewBox="0 0 100 100"
      >
        {Array.from({ length: 7 }).map((_, i) => {
          const angle = (i * 90) / 6;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={Math.cos(rad) * 100}
              y2={Math.sin(rad) * 100}
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          );
        })}
        {[15, 30, 45, 60, 75, 90].map((r, i) => (
          <path
            key={i}
            d={`M ${r} 0 A ${r} ${r} 0 0 1 0 ${r}`}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="0.4"
          />
        ))}
      </svg>

      <svg
        className="absolute top-0 right-0 w-40 h-40 opacity-30"
        viewBox="0 0 100 100"
        style={{ transform: 'scaleX(-1)' }}
      >
        {Array.from({ length: 7 }).map((_, i) => {
          const angle = (i * 90) / 6;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={Math.cos(rad) * 100}
              y2={Math.sin(rad) * 100}
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          );
        })}
        {[15, 30, 45, 60, 75, 90].map((r, i) => (
          <path
            key={i}
            d={`M ${r} 0 A ${r} ${r} 0 0 1 0 ${r}`}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="0.4"
          />
        ))}
      </svg>

      {/* Туман снизу */}
      <motion.div
        animate={{ x: ['-10%', '10%', '-10%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background:
            'linear-gradient(to top, rgba(80, 40, 120, 0.15) 0%, transparent 100%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Летучие мыши */}
      {bats.map((b) => (
        <motion.div
          key={b.id}
          initial={{
            left: `${b.startX}%`,
            top: `${b.startY}%`,
            opacity: 0,
          }}
          animate={{
            left: [`${b.startX}%`, `${b.endX}%`],
            top: [`${b.startY}%`, `${b.endY}%`],
            opacity: [0, 1, 1, 0],
            scaleX: [1, -1, 1, -1],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            delay: b.delay,
            ease: 'easeInOut',
          }}
          style={{ position: 'absolute' }}
        >
          <svg
            width={b.size}
            height={b.size * 0.5}
            viewBox="0 0 40 20"
            style={{ filter: 'drop-shadow(0 0 6px rgba(180, 100, 255, 0.6))' }}
          >
            <path
              d="M20 10 Q14 2 4 4 Q10 8 8 14 Q14 12 20 10 Q26 12 32 14 Q30 8 36 4 Q26 2 20 10 Z"
              fill="#0a020f"
            />
            <circle cx="17" cy="9" r="0.8" fill="#ff3333" />
            <circle cx="23" cy="9" r="0.8" fill="#ff3333" />
          </svg>
        </motion.div>
      ))}

      {/* Плавающие светящиеся точки-искры */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          initial={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [-10, 10, -10],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: '#ff6b00',
            boxShadow: '0 0 8px #ff6b00',
          }}
        />
      ))}
    </div>
  );
}
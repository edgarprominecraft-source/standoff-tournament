import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'halloween_sound_on';

export default function AudioPlayer() {
  const ref = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Читаем настройку — по умолчанию ВКЛ
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const shouldPlay = saved !== '0'; // если null или '1' → играем
    setMuted(!shouldPlay);
  }, []);

  // Пробуем запустить музыку muted — браузер разрешает
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.muted = true;
    a.play().catch(() => {});
  }, []);

  // Первый тап — снимаем mute
  useEffect(() => {
    if (unlocked) return;
    const handler = () => {
      const a = ref.current;
      if (!a) return;
      a.muted = muted;
      a.play().then(() => setUnlocked(true)).catch(() => {});
    };
    window.addEventListener('touchstart', handler, { once: true });
    window.addEventListener('click', handler, { once: true });
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('click', handler);
    };
  }, [muted, unlocked]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    const next = !muted;
    setMuted(next);
    a.muted = next;
    if (!next) a.play().catch(() => {});
    localStorage.setItem(STORAGE_KEY, next ? '0' : '1');
  };

  return (
    <>
      <audio
        ref={ref}
        src="/halloween.mp3"
        loop
        playsInline
        preload="auto"
        muted
      />
      <button
        onClick={toggle}
        aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        className="fixed top-3 right-3 z-[100] w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-orange-500/40 flex items-center justify-center text-orange-400 hover:bg-black/80 hover:border-orange-500 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </>
  );
}

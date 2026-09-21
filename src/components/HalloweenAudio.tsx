import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, VolumeX, Volume2 } from 'lucide-react';

const STORAGE_KEY = 'halloween_audio_enabled';

export default function HalloweenAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const audio = new Audio('/audio/halloween.mp3');
    audio.loop = true;
    audio.volume = 0.15;
    audio.addEventListener('canplaythrough', () => setReady(true));
    audio.addEventListener('error', () => setReady(false));
    audioRef.current = audio;

    // Автовоспроизведение при первом взаимодействии (требование браузеров)
    if (saved === 'true') {
      const tryPlay = () => {
        audio.play().then(() => {
          setEnabled(true);
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('touchstart', tryPlay);
        }).catch(() => {});
      };
      document.addEventListener('click', tryPlay, { once: true });
      document.addEventListener('touchstart', tryPlay, { once: true });
    }

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (enabled) {
      audio.pause();
      setEnabled(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    } else {
      audio.play().then(() => {
        setEnabled(true);
        localStorage.setItem(STORAGE_KEY, 'true');
      }).catch(() => {});
    }
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={toggle}
      className="fixed bottom-24 right-4 z-40 w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #6a1b9a 0%, #2d0a4a 100%)',
        border: '1px solid rgba(255, 107, 0, 0.5)',
        boxShadow: '0 0 20px rgba(106, 27, 154, 0.6)',
      }}
      title={enabled ? 'Выключить музыку' : 'Включить музыку'}
    >
      <AnimatePresence mode="wait">
        {enabled ? (
          <motion.div
            key="on"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
          >
            <Volume2 className="w-4 h-4 text-orange" />
          </motion.div>
        ) : (
          <motion.div
            key="off"
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: -180 }}
          >
            <VolumeX className="w-4 h-4 text-purple-300" />
          </motion.div>
        )}
      </AnimatePresence>

      {enabled && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ border: '1px solid #ff6b00' }}
        />
      )}
    </motion.button>
  );
}
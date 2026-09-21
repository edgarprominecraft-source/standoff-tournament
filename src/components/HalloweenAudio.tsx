import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, Play, Pause, SkipForward, SkipBack,
  Music, ListMusic, X, AlertCircle,
} from 'lucide-react';

// ===== Ключи localStorage =====
const STORAGE_VOLUME = 'halloween_volume';
const STORAGE_ENABLED = 'halloween_audio_enabled';
const STORAGE_TRACK = 'halloween_track_index';
const STORAGE_MUTED = 'halloween_muted';

// ===== Типы =====
type Track = {
  id: string;
  title: string;
  artist: string;
  src: string;
};

// ===== Плейлист (добавляй треки — UI подстроится) =====
const TRACKS: Track[] = [
  {
    id: 'spook3',
    title: 'Spook 3',
    artist: 'Halloween Ambient',
    src: '/audio/halloween.mp3',
  },
];

// ===== Утилиты =====
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function readNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return fallback;
    return clamp(n, min, max);
  } catch {
    return fallback;
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

function writeValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ===== Главный компонент =====
export default function HalloweenAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  const [enabled, setEnabled] = useState<boolean>(() => readBool(STORAGE_ENABLED, true));
  const [muted, setMuted] = useState<boolean>(() => readBool(STORAGE_MUTED, false));
  const [volume, setVolume] = useState<number>(() => readNumber(STORAGE_VOLUME, 0.25, 0, 1));
  const [trackIndex, setTrackIndex] = useState<number>(() =>
    Math.floor(readNumber(STORAGE_TRACK, 0, 0, Math.max(0, TRACKS.length - 1)))
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTrack = TRACKS[trackIndex] ?? TRACKS[0];

  // ===== Инициализация аудио (один раз) =====
  useEffect(() => {
    const audio = new Audio(currentTrack.src);
    audio.loop = TRACKS.length === 1;
    audio.volume = volume;
    audio.muted = true;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    const onReady = () => setReady(true);
    const onError = () => {
      setError('Не удалось загрузить трек');
      setReady(false);
    };

    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('loadeddata', onReady);
    audio.addEventListener('error', onError);

    audioRef.current = audio;

    // Пытаемся стартовать muted (браузер разрешает)
    if (enabled) {
      audio.play().catch(() => {});
    }

    // ===== Разблокировка autoplay по первому тапу =====
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      const a = audioRef.current;
      if (!a) return;
      a.muted = muted;
      if (enabled) {
        a.play().catch(() => {});
      }
    };

    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('click', unlock);

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Смена трека =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const wasPlaying = enabled && !audio.paused;
    audio.src = currentTrack.src;
    audio.load();
    setProgress(0);
    setCurrentTime(0);
    if (wasPlaying) {
      audio.play().catch(() => {});
    }
    writeValue(STORAGE_TRACK, String(trackIndex));
  }, [trackIndex, currentTrack.src, enabled]);

  // ===== Применяем громкость =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    writeValue(STORAGE_VOLUME, String(volume));
  }, [volume]);

  // ===== Применяем mute =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    writeValue(STORAGE_MUTED, String(muted));
  }, [muted]);

  // ===== Обновление прогресса =====
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let raf = 0;
    const tick = () => {
      const ct = audio.currentTime;
      const d = audio.duration;
      setCurrentTime(ct);
      setDuration(Number.isFinite(d) ? d : 0);
      setProgress(d > 0 ? ct / d : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ===== Переключение play/pause =====
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !enabled;
    setEnabled(next);
    writeValue(STORAGE_ENABLED, next ? 'true' : 'false');
    if (next) {
      audio.muted = muted;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [enabled, muted]);

  // ===== Toggle mute =====
  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  // ===== Next/Prev =====
  const nextTrack = useCallback(() => {
    if (TRACKS.length <= 1) return;
    setTrackIndex((i) => (i + 1) % TRACKS.length);
  }, []);

  const prevTrack = useCallback(() => {
    if (TRACKS.length <= 1) return;
    setTrackIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length);
  }, []);

  // ===== Seek по клику =====
  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = barRef.current;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
    }
  }, []);

  // ===== Выбор трека =====
  const selectTrack = useCallback((idx: number) => {
    setTrackIndex(idx);
  }, []);

  return (
    <>
      {/* ===== Главная кнопка (тоггл) ===== */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={togglePlay}
        className="audio-btn fixed bottom-24 right-4 z-40 w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #6a1b9a 0%, #2d0a4a 100%)',
          border: '1px solid rgba(255, 107, 0, 0.55)',
          boxShadow: enabled
            ? '0 0 22px rgba(106, 27, 154, 0.75), 0 0 6px rgba(255,107,0,0.4)'
            : '0 0 12px rgba(106, 27, 154, 0.4)',
        }}
        title={enabled ? 'Пауза' : 'Играть'}
      >
        <AnimatePresence mode="wait">
          {enabled ? (
            <motion.div
              key="pause"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
            >
              <Pause className="w-4 h-4 text-orange" />
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -180 }}
            >
              <Play className="w-4 h-4 text-purple-300" />
            </motion.div>
          )}
        </AnimatePresence>

        {enabled && ready && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ border: '1px solid #ff6b00' }}
          />
        )}
      </motion.button>

      {/* ===== Маленькая кнопка: открыть панель ===== */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.55, type: 'spring' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setPanelOpen((v) => !v)}
        className="audio-btn fixed bottom-24 right-[68px] z-40 w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #2d0a4a 0%, #6a1b9a 100%)',
          border: '1px solid rgba(255, 107, 0, 0.4)',
          boxShadow: '0 0 18px rgba(45, 10, 74, 0.65)',
        }}
        title="Плейлист и громкость"
      >
        <ListMusic className="w-4 h-4 text-orange" />
      </motion.button>

      {/* ===== Панель управления ===== */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed bottom-[88px] right-4 z-40 w-[300px] rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(20,6,30,0.97) 0%, rgba(45,10,74,0.97) 100%)',
              border: '1px solid rgba(255, 107, 0, 0.35)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 30px rgba(106, 27, 154, 0.45)',
              backdropFilter: 'blur(14px)',
            }}
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/25">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-orange" />
                <span className="text-white text-xs font-black uppercase tracking-widest">
                  Halloween Music
                </span>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="w-7 h-7 rounded-full bg-purple-500/20 hover:bg-purple-500/40 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-purple-200" />
              </button>
            </div>

            {/* Сейчас играет */}
            <div className="px-4 py-3 border-b border-purple-500/20">
              <div className="text-[10px] uppercase tracking-widest text-purple-300/70 font-bold mb-1">
                Сейчас играет
              </div>
              <div className="text-white text-sm font-bold truncate">
                {currentTrack.title}
              </div>
              <div className="text-purple-300/70 text-[10px] truncate">
                {currentTrack.artist}
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-red-400 text-[10px]">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
            </div>

            {/* Прогресс-бар */}
            <div className="px-4 py-3 border-b border-purple-500/20">
              <div className="flex items-center justify-between text-[10px] text-purple-300/80 font-mono mb-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div
                ref={barRef}
                onClick={seek}
                className="relative h-1.5 bg-purple-900/60 rounded-full cursor-pointer overflow-hidden"
              >
                <motion.div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, #ff6b00 0%, #ffb347 100%)',
                    boxShadow: '0 0 8px rgba(255,107,0,0.8)',
                  }}
                />
              </div>
            </div>

            {/* Громкость */}
            <div className="px-4 py-3 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/40 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-orange" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (v > 0 && muted) setMuted(false);
                  }}
                  className="flex-1 h-1.5 accent-orange cursor-pointer"
                />
                <span className="text-[10px] text-purple-200 font-mono w-8 text-right">
                  {Math.round((muted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* Управление */}
            <div className="flex items-center justify-center gap-4 py-3 border-b border-purple-500/20">
              <button
                onClick={prevTrack}
                disabled={TRACKS.length <= 1}
                className="w-9 h-9 rounded-full bg-purple-500/15 hover:bg-purple-500/35 disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <SkipBack className="w-4 h-4 text-purple-200" />
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #6a1b9a 0%, #ff6b00 100%)',
                  boxShadow: '0 0 20px rgba(255,107,0,0.5)',
                }}
              >
                {enabled ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              <button
                onClick={nextTrack}
                disabled={TRACKS.length <= 1}
                className="w-9 h-9 rounded-full bg-purple-500/15 hover:bg-purple-500/35 disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <SkipForward className="w-4 h-4 text-purple-200" />
              </button>
            </div>

            {/* Плейлист */}
            {TRACKS.length > 0 && (
              <div className="px-3 py-2 max-h-[160px] overflow-y-auto">
                <div className="text-[10px] uppercase tracking-widest text-purple-300/70 font-bold px-1 mb-1">
                  Плейлист · {TRACKS.length}
                </div>
                {TRACKS.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => selectTrack(i)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
                      i === trackIndex
                        ? 'bg-orange/15 border border-orange/40'
                        : 'hover:bg-purple-500/15 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        i === trackIndex
                          ? 'bg-gradient-to-br from-orange to-orange2'
                          : 'bg-purple-500/25'
                      }`}
                    >
                      {i === trackIndex && enabled ? (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="w-1.5 h-1.5 rounded-full bg-white"
                        />
                      ) : (
                        <Music className="w-3 h-3 text-purple-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[11px] font-bold truncate ${
                          i === trackIndex ? 'text-orange' : 'text-white'
                        }`}
                      >
                        {t.title}
                      </div>
                      <div className="text-[9px] text-purple-300/60 truncate">
                        {t.artist}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

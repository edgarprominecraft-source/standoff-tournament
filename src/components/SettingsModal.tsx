import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Type, Palette, Shield, Info, Check, ChevronRight,
  Sun, Moon, Plus, Minus, ExternalLink,
} from 'lucide-react';
import { haptic } from '../lib/telegram';

type FontSize = 'small' | 'normal' | 'large';
type Theme = 'light' | 'dark';

type Props = {
  onClose: () => void;
  onOpenPrivacy: () => void;
  onOpenAbout: () => void;
};

const STORAGE_FONT = 'app_font_size';
const STORAGE_THEME = 'app_theme';

export default function SettingsModal({ onClose, onOpenPrivacy, onOpenAbout }: Props) {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const v = localStorage.getItem(STORAGE_FONT);
      return (v as FontSize) || 'normal';
    } catch { return 'normal'; }
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const v = localStorage.getItem(STORAGE_THEME);
      return (v as Theme) || 'light';
    } catch { return 'light'; }
  });

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => { document.body.classList.remove('modal-open'); };
  }, []);

  // Применяем размер шрифта
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-font-scale',
      fontSize === 'small' ? '0.9' : fontSize === 'large' ? '1.15' : '1'
    );
    try { localStorage.setItem(STORAGE_FONT, fontSize); } catch {}
  }, [fontSize]);

  // Применяем тему
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem(STORAGE_THEME, theme); } catch {}
  }, [theme]);

  const changeFont = (delta: number) => {
    haptic('light');
    const order: FontSize[] = ['small', 'normal', 'large'];
    const idx = order.indexOf(fontSize);
    const next = Math.max(0, Math.min(2, idx + delta));
    setFontSize(order[next]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
      >
        {/* Шапка */}
        <div className="sticky top-0 bg-white p-5 border-b border-border flex items-center justify-between z-10">
          <div className="text-black font-black text-base">Настройки</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg2 flex items-center justify-center">
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ==== Размер шрифта ==== */}
          <div className="bg-bg2 border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-orange" />
              <div className="text-black font-bold text-sm">Размер шрифта</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => changeFont(-1)}
                disabled={fontSize === 'small'}
                className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center disabled:opacity-40"
              >
                <Minus className="w-4 h-4 text-black" />
              </button>
              <div className="flex-1 text-center">
                <div className="text-black font-black text-base">
                  {fontSize === 'small' ? 'Меньше' : fontSize === 'large' ? 'Больше' : 'Обычный'}
                </div>
                <div className="text-muted text-[10px] mt-0.5">
                  {fontSize === 'small' ? '90%' : fontSize === 'large' ? '115%' : '100%'}
                </div>
              </div>
              <button
                onClick={() => changeFont(1)}
                disabled={fontSize === 'large'}
                className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center disabled:opacity-40"
              >
                <Plus className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>

          {/* ==== Тема ==== */}
          <div className="bg-bg2 border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-orange" />
              <div className="text-black font-bold text-sm">Тема</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { haptic('light'); setTheme('light'); }}
                className={`py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  theme === 'light'
                    ? 'bg-white border-orange text-orange'
                    : 'bg-white border-border text-muted'
                }`}
              >
                <Sun className="w-4 h-4" /> Белая
                {theme === 'light' && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { haptic('light'); setTheme('dark'); }}
                className={`py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  theme === 'dark'
                    ? 'bg-black border-orange text-orange'
                    : 'bg-black border-border text-muted'
                }`}
              >
                <Moon className="w-4 h-4" /> Чёрная
                {theme === 'dark' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-muted text-[10px] mt-2 leading-relaxed">
              Тёмная тема лучше для глаз вечером
            </div>
          </div>

          {/* ==== Конфиденциальность ==== */}
          <button
            onClick={() => { haptic('light'); onOpenPrivacy(); }}
            className="w-full bg-bg2 border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-bg3 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-orange/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-orange" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-black font-bold text-sm">Конфиденциальность</div>
              <div className="text-muted text-[10px] mt-0.5">Что храним и как используем</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </button>

          {/* ==== О приложении ==== */}
          <button
            onClick={() => { haptic('light'); onOpenAbout(); }}
            className="w-full bg-bg2 border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-bg3 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-orange/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-orange" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-black font-bold text-sm">О приложении</div>
              <div className="text-muted text-[10px] mt-0.5">Standoff Cup · v1.0</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </button>
        </div>

        <div className="p-5 pt-0 text-center">
          <div className="text-muted text-[10px]">
            Standoff Cup · версия 1.0
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
};

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initDataUnsafe: {
    user?: TelegramUser;
  };
  themeParams: Record<string, string>;
  colorScheme: 'light' | 'dark';
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  openLink: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegram(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.user ?? null;
}

export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return;
  tg.ready();
  tg.expand();
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  getTelegram()?.HapticFeedback?.impactOccurred(style);
}

export function hapticSuccess() {
  getTelegram()?.HapticFeedback?.notificationOccurred('success');
}

export function hapticError() {
  getTelegram()?.HapticFeedback?.notificationOccurred('error');
}
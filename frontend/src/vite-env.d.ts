/// <reference types="vite/client" />

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string }
  }
  onEvent: (event: string, cb: () => void) => void
  MainButton: {
    setText: (text: string) => void
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
  }
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    selectionChanged: () => void
  }
  showConfirm?: (message: string, cb: (ok: boolean) => void) => void
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp }
}

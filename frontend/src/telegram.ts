// Тонкая обёртка над Telegram Mini Apps SDK.
// Безопасно работает и вне Telegram (локальная разработка в браузере).

export function initTelegram(): void {
  const tg = window.Telegram?.WebApp
  if (!tg) return

  tg.ready()
  tg.expand()
  applyTheme(tg.colorScheme)

  // Реагируем на смену темы прямо в Telegram.
  tg.onEvent('themeChanged', () => applyTheme(tg.colorScheme))
}

function applyTheme(scheme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', scheme)
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  window.Telegram?.WebApp.HapticFeedback?.impactOccurred(style)
}

export function getTelegramUser() {
  return window.Telegram?.WebApp.initDataUnsafe.user ?? null
}

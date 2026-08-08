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

// Подтверждение действия: нативное в Telegram, иначе стандартный confirm.
export function showConfirm(message: string): Promise<boolean> {
  const tg = window.Telegram?.WebApp
  if (tg?.showConfirm) {
    return new Promise((resolve) => tg.showConfirm!(message, resolve))
  }
  return Promise.resolve(window.confirm(message))
}

/**
 * Нативная кнопка «Назад» в шапке Telegram (не своя в контенте).
 * Возвращает cleanup — снимает обработчик и прячет кнопку.
 */
export function setBackButton(onClick: (() => void) | null): () => void {
  const bb = window.Telegram?.WebApp.BackButton
  if (!bb) return () => {}
  if (!onClick) {
    bb.hide()
    return () => {}
  }
  bb.onClick(onClick)
  bb.show()
  return () => {
    bb.offClick(onClick)
    bb.hide()
  }
}

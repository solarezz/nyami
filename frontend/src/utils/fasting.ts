import type { FastingProtocol } from '../types'

// Длительность окна еды (часы) по протоколу.
export const EAT_HOURS: Record<Exclude<FastingProtocol, 'off'>, number> = {
  '16:8': 8,
  '18:6': 6,
  '20:4': 4,
  omad: 1,
}

export const PROTOCOL_LABELS: { key: FastingProtocol; label: string }[] = [
  { key: 'off', label: 'Выкл' },
  { key: '16:8', label: '16:8' },
  { key: '18:6', label: '18:6' },
  { key: '20:4', label: '20:4' },
  { key: 'omad', label: 'OMAD' },
]

export interface FastingState {
  phase: 'eating' | 'fasting'
  /** Прогресс текущей фазы 0..1. */
  progress: number
  /** Мс до конца текущей фазы. */
  msLeft: number
  /** «Окно еды 12:00–20:00». */
  windowLabel: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Состояние ИГ на текущий момент (по локальному времени устройства).
 * Окно еды: [eatStartHour, eatStartHour + eatHours), голодание — остальное.
 */
export function fastingState(
  protocol: FastingProtocol,
  eatStartHour: number,
  now = new Date(),
): FastingState | null {
  if (protocol === 'off') return null
  const eatHours = EAT_HOURS[protocol]
  const fastHours = 24 - eatHours

  const endHour = (eatStartHour + eatHours) % 24
  const windowLabel = `Окно еды ${pad(eatStartHour)}:00–${pad(endHour)}:00`

  // Минуты от полуночи и от начала окна еды (с обёрткой на сутки).
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const startMin = eatStartHour * 60
  const sinceStart = ((nowMin - startMin) % (24 * 60) + 24 * 60) % (24 * 60)
  const eatMin = eatHours * 60

  if (sinceStart < eatMin) {
    // Внутри окна еды.
    const leftMin = eatMin - sinceStart
    return {
      phase: 'eating',
      progress: sinceStart / eatMin,
      msLeft: Math.round(leftMin * 60 * 1000),
      windowLabel,
    }
  }
  // Голодание.
  const fastElapsed = sinceStart - eatMin
  const fastMin = fastHours * 60
  const leftMin = fastMin - fastElapsed
  return {
    phase: 'fasting',
    progress: fastElapsed / fastMin,
    msLeft: Math.round(leftMin * 60 * 1000),
    windowLabel,
  }
}

/** «7ч 12м» из миллисекунд. */
export function formatLeft(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}м`
  return `${h}ч ${pad(m)}м`
}

// Таймзона пользователя (IANA) — единое место для перевода между UTC-инстантами,
// которые хранятся в БД, и «локальным календарным днём»/часами, которые видит пользователь.
// Без сторонних зависимостей: Node bundles full-icu, Intl.DateTimeFormat этого достаточно.

export const DEFAULT_TIMEZONE = 'Europe/Moscow'

/** Смещение timeZone относительно UTC (в минутах) в момент instant. Положительное — восточнее UTC. */
function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const hour = get('hour') % 24 // '24' на некоторых движках для полуночи
  const asUtcLabel = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  return Math.round((asUtcLabel - instant.getTime()) / 60000)
}

/** Локальная календарная дата instant'а в timeZone, формат YYYY-MM-DD. */
export function localDateKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)
}

/** Локальный час (0–23) instant'а в timeZone. */
export function localHour(instant: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(instant))
}

/** Локальное время instant'а в timeZone, формат HH:mm. */
export function formatHHMM(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }).format(instant)
}

/** Минуты от полуночи локального времени instant'а в timeZone (0–1439). */
export function localMinutesOfDay(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return (get('hour') % 24) * 60 + get('minute')
}

/** Дата YYYY-MM-DD + сдвиг в днях (чисто календарная арифметика, без привязки к часовому поясу). */
export function addDaysToDateStr(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** UTC-инстант, соответствующий `date HH:mm:00` локального времени в timeZone (одна коррекция смещения — достаточно для бытовых таймзон, в т.ч. с DST). */
export function zonedTimeToUtc(date: string, hhmm: string, timeZone: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const [y, mo, da] = date.split('-').map(Number)
  const targetLabelMs = Date.UTC(y, mo - 1, da, h || 0, m || 0, 0)
  const guess = new Date(targetLabelMs)
  const offsetMin = offsetMinutesAt(guess, timeZone)
  return new Date(targetLabelMs - offsetMin * 60000)
}

/** UTC-инстант начала локальных суток (00:00) для date в timeZone. */
export function startOfLocalDay(date: string, timeZone: string): Date {
  return zonedTimeToUtc(date, '00:00', timeZone)
}

/** Границы локальных суток [start, end) в UTC-инстантах — end учитывает возможный переход на летнее/зимнее время. */
export function localDayRange(date: string, timeZone: string): { start: Date; end: Date } {
  return { start: startOfLocalDay(date, timeZone), end: startOfLocalDay(addDaysToDateStr(date, 1), timeZone) }
}

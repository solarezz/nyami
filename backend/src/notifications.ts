import cron from 'node-cron'
import type { MealType } from '@nyami/shared'
import { config } from './config.js'
import { type NyamiRepo, todayKey } from './repo.js'

const TZ = 'Europe/Moscow'

async function tg(method: string, body: Record<string, unknown>): Promise<void> {
  if (!config.botToken) return
  try {
    await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    /* рассылка best-effort */
  }
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  await tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: 'Открыть Nyami', web_app: { url: config.webOrigin } }]] },
  })
}

// ---- Напоминания о пропущенных приёмах пищи ----
//
// Идея: у каждого типа приёма — «личный средний час» (по последним записям), а пока
// истории мало — разумный дефолт. Раз в 15 минут (MSK) проверяем каждого юзера и,
// если время+буфер прошло, а приём не залогирован — шлём НЕ БОЛЬШЕ ОДНОГО напоминания
// за проход (самый ранний просроченный тип). Факт отправки пишем в БД — переживает
// передеплой контейнера и не даёт задублировать сообщение.

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = { breakfast: 'завтрак', lunch: 'обед', dinner: 'ужин', snack: 'перекус' }

// Дефолт на холодный старт (мин. от полуночи MSK). У перекуса дефолта нет —
// напоминаем про него только когда сложилась личная привычка (см. mealThreshold).
const MEAL_DEFAULT_MIN: Record<MealType, number | null> = {
  breakfast: 10 * 60,
  lunch: 15 * 60,
  dinner: 20 * 60 + 30,
  snack: null,
}

const MIN_SAMPLES = 3 // сколько записей нужно, чтобы доверять личному среднему
const GRACE_MIN = 45 // буфер после порога, прежде чем напоминать
const RECENT_LIMIT = 10 // сколько последних записей типа берём для среднего

function moscowMinutesOfDay(d: Date): number {
  // Россия — фиксированный UTC+3 без перехода на летнее время.
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 180) % 1440
}

function moscowMinutesNow(): number {
  return moscowMinutesOfDay(new Date())
}

/** Порог (мин. от полуночи MSK) — когда пора напомнить про этот тип; null — рано/не нужно. */
async function mealThreshold(repo: NyamiRepo, userId: number, type: MealType): Promise<number | null> {
  const recent = await repo.recentMealTimes(userId, type, RECENT_LIMIT)
  if (recent.length >= MIN_SAMPLES) {
    const avg = recent.reduce((s, d) => s + moscowMinutesOfDay(d), 0) / recent.length
    return Math.round(avg)
  }
  return MEAL_DEFAULT_MIN[type]
}

/** Проверяет одного пользователя; при необходимости шлёт одно напоминание. Возвращает тип отправленного или null. */
export async function checkMealReminders(repo: NyamiRepo, userId: number, nowMin = moscowMinutesNow()): Promise<MealType | null> {
  const date = todayKey()
  const day = await repo.getDay(userId, date)
  const logged = new Set(day.meals.map((m) => m.mealType))

  for (const type of MEAL_ORDER) {
    if (logged.has(type)) continue

    // Перекус — необязательный приём: не предлагаем, если бюджет калорий уже исчерпан.
    if (type === 'snack' && day.goalKcal + day.burnedKcal - day.eatenKcal <= 0) continue

    const threshold = await mealThreshold(repo, userId, type)
    if (threshold == null) continue
    if (nowMin < threshold + GRACE_MIN) continue

    const claimed = await repo.claimReminder(userId, date, type)
    if (!claimed) continue // уже напоминали сегодня про этот тип

    const firstOfDay = day.meals.length === 0
    const text = firstOfDay
      ? '🍽 Ты сегодня ещё ничего не отметил. Загляни в Nyami и запиши — это займёт 10 секунд, чтобы не терять стрик!'
      : `⏰ Не забыл записать ${MEAL_LABELS[type]}? Обычно ты делаешь это примерно в это время.`
    await sendMessage(userId, text)
    return type
  }
  return null
}

async function runMealReminders(repo: NyamiRepo): Promise<void> {
  const nowMin = moscowMinutesNow()
  for (const id of await repo.getOnboardedUserIds()) {
    await checkMealReminders(repo, id, nowMin)
    await new Promise((r) => setTimeout(r, 60)) // мягкий троттлинг под лимиты Telegram
  }
}

/** Недельный отчёт по данным пользователя. */
export async function runWeeklyFor(repo: NyamiRepo, userId: number): Promise<void> {
  const [week, day] = await Promise.all([repo.getWeek(userId), repo.getDay(userId, todayKey())])
  const logged = week.days.filter((d) => d.kcal > 0)
  if (logged.length === 0) return // нечего показывать

  const avg = Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length)
  const inNorm = week.days.filter((d) => d.kcal > 0 && !d.over).length
  const w = week.weightSeries
  const wDelta = w.length > 1 ? w[w.length - 1] - w[0] : 0
  const wStr = wDelta === 0 ? '' : ` (${wDelta < 0 ? '−' : '+'}${Math.abs(wDelta).toFixed(1)} за неделю)`

  const text =
    '📊 <b>Итоги недели</b>\n\n' +
    `Ср. калории: <b>${avg.toLocaleString('ru-RU')}</b> ккал/день\n` +
    `В норме: <b>${inNorm}</b> из ${logged.length} записанных дней\n` +
    `Вес: <b>${w[w.length - 1].toFixed(1)} кг</b>${wStr}\n` +
    `Стрик: 🔥 <b>${day.streak}</b> ${plural(day.streak, 'день', 'дня', 'дней')}\n\n` +
    (inNorm >= logged.length - 1 ? 'Отличная неделя! 💪' : 'Новая неделя — новый заход 💪')

  await sendMessage(userId, text)
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

/** Запуск планировщика (только в проде). Напоминания — раз в 15 мин, отчёт — по воскресеньям 20:00 MSK. */
export function startScheduler(repo: NyamiRepo): void {
  if (!config.botToken) return

  cron.schedule('*/15 * * * *', () => runMealReminders(repo).catch((e) => console.error('[notify] meal reminders failed:', e)), { timezone: TZ })
  cron.schedule('0 20 * * 0', () => forEachUser(repo, runWeeklyFor), { timezone: TZ })
}

async function forEachUser(repo: NyamiRepo, fn: (r: NyamiRepo, id: number) => Promise<unknown>): Promise<void> {
  const ids = await repo.getOnboardedUserIds()
  for (const id of ids) {
    await fn(repo, id)
    await new Promise((r) => setTimeout(r, 60)) // мягкий троттлинг под лимиты Telegram
  }
}

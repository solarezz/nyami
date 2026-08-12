import cron from 'node-cron'
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

/** Вечернее напоминание — только тем, кто сегодня ещё ничего не записал. */
export async function runDailyFor(repo: NyamiRepo, userId: number): Promise<boolean> {
  const day = await repo.getDay(userId, todayKey())
  if (day.meals.length > 0) return false
  await sendMessage(userId, '🍽 Ты сегодня ещё ничего не записал.\nОтметь приёмы, чтобы не потерять стрик!')
  return true
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

/** Запуск планировщика (только в проде). Ежедневно 21:00 и по воскресеньям 20:00 MSK. */
export function startScheduler(repo: NyamiRepo): void {
  if (!config.botToken) return

  cron.schedule('0 21 * * *', () => forEachUser(repo, runDailyFor), { timezone: TZ })
  cron.schedule('0 20 * * 0', () => forEachUser(repo, runWeeklyFor), { timezone: TZ })
}

async function forEachUser(repo: NyamiRepo, fn: (r: NyamiRepo, id: number) => Promise<unknown>): Promise<void> {
  const ids = await repo.getOnboardedUserIds()
  for (const id of ids) {
    await fn(repo, id)
    await new Promise((r) => setTimeout(r, 60)) // мягкий троттлинг под лимиты Telegram
  }
}

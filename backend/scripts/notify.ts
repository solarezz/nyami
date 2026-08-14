// Ручная отправка напоминания/отчёта для проверки.
// Использование (на сервере, где есть DATABASE_URL и BOT_TOKEN):
//   npm run notify -- meal   <chatId>
//   npm run notify -- weekly <chatId>
// chatId = telegram_id пользователя (обычно свой, чтобы проверить на себе).

import { createDrizzleRepo } from '../src/db/repo.js'
import { checkMealReminders, runWeeklyFor } from '../src/notifications.js'

const [kind, idArg] = process.argv.slice(2)
const id = Number(idArg)

if ((kind !== 'meal' && kind !== 'weekly') || !Number.isFinite(id)) {
  console.error('Использование: npm run notify -- <meal|weekly> <chatId>')
  process.exit(1)
}

const repo = createDrizzleRepo()
if (kind === 'meal') {
  const sent = await checkMealReminders(repo, id)
  console.log(sent ? `Напоминание отправлено: ${sent}.` : 'Пропущено: всё залогировано, рано по времени или уже напоминали сегодня.')
} else {
  await runWeeklyFor(repo, id)
  console.log('Отчёт отправлен (если есть данные за неделю).')
}
process.exit(0)

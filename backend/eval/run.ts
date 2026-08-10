// Прогон распознавания по эталонному набору и замер точности.
// Запуск: npm run eval -w backend  (нужен GROQ_API_KEY в backend/.env)
//
// Метрика — ошибка ПЛОТНОСТИ энергии (ккал/100 г): она не зависит от оценки веса
// (для текста веса-эталона нет) и отражает «понял ли модель, насколько калориен продукт».
// Картинки: добавь в dataset.json { "id": "...", "imageFile": "eval/images/x.jpg", "per100kcal": N }.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getAi } from '../src/ai/index.js'

interface Case {
  id: string
  text?: string
  imageFile?: string
  per100kcal: number
}

const cases: Case[] = JSON.parse(readFileSync(fileURLToPath(new URL('./dataset.json', import.meta.url)), 'utf-8'))
const ai = getAi()

interface Row { id: string; name: string; truth: number; got: number; err: number }
const rows: Row[] = []

for (const c of cases) {
  try {
    const imageBase64 = c.imageFile
      ? `data:image/jpeg;base64,${readFileSync(fileURLToPath(new URL(`../${c.imageFile}`, import.meta.url))).toString('base64')}`
      : undefined
    const r = await ai.recognize({ text: c.text, imageBase64 })
    const density = r.grams > 0 ? (r.kcal / r.grams) * 100 : 0
    const err = (Math.abs(density - c.per100kcal) / c.per100kcal) * 100
    rows.push({ id: c.id, name: r.name, truth: c.per100kcal, got: Math.round(density), err })
  } catch (e) {
    rows.push({ id: c.id, name: `ОШИБКА: ${(e as Error).message.slice(0, 40)}`, truth: c.per100kcal, got: 0, err: NaN })
  }
}

console.log('\nID                      эталон  оценка  ошибка  распознано')
console.log('─'.repeat(72))
for (const r of rows) {
  const err = Number.isNaN(r.err) ? '  —  ' : `${r.err.toFixed(0).padStart(3)}%`
  console.log(`${r.id.padEnd(22)} ${String(r.truth).padStart(5)}  ${String(r.got).padStart(5)}  ${err}  ${r.name}`)
}

const valid = rows.filter((r) => !Number.isNaN(r.err))
if (valid.length) {
  const mean = valid.reduce((s, r) => s + r.err, 0) / valid.length
  const median = [...valid].sort((a, b) => a.err - b.err)[Math.floor(valid.length / 2)].err
  const w15 = valid.filter((r) => r.err <= 15).length
  const w25 = valid.filter((r) => r.err <= 25).length
  console.log('─'.repeat(72))
  console.log(`Средняя ошибка плотности: ${mean.toFixed(1)}%  |  медиана: ${median.toFixed(1)}%`)
  console.log(`В пределах ±15%: ${w15}/${valid.length}   ±25%: ${w25}/${valid.length}`)
}

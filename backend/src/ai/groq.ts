import type { Recognition, DaySummary, RecognizeRequest } from '@nyami/shared'
import { config } from '../config.js'
import { offLookup } from './off.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

type ChatContent = string | Array<Record<string, unknown>>
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: ChatContent
}
interface ChatOpts {
  jsonMode?: boolean
  /** Для reasoning-моделей (qwen): 'hidden' убирает <think> из ответа. */
  reasoningFormat?: 'hidden' | 'parsed'
}

async function groqChat(messages: ChatMessage[], model: string, opts: ChatOpts = {}): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      ...(opts.reasoningFormat ? { reasoning_format: opts.reasoningFormat } : {}),
    }),
  })
  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

const RECOGNIZE_SYSTEM = `Ты — точный нутрициолог. Определи еду (по фото или описанию) и оцени её пищевую ценность.

КАК СЧИТАТЬ ТОЧНО (это важно):
1) Оцени ПЛОТНОСТЬ энергии — ккал на 100 г — именно для ЭТОГО продукта и способа приготовления.
   Сильно повышают калорийность и ЖИРЫ (не занижай их!): жарка на масле, шоколадная глазурь,
   сливки, сметана, майонез, сыр, орехи, сахар, сладкие соусы. Пример: пломбир в шоколадной
   глазури ≈ 300–320 ккал/100 г, жаренное на масле +20–40% к калориям.
2) Отдельно оцени ВЕС порции в граммах. Типичные ориентиры: эскимо 70–80 г, банан 120 г,
   яблоко 150 г, тарелка супа 300–350 г, кусок хлеба 30 г, ломтик сыра 20 г.
3) Если это УПАКОВАННЫЙ продукт и на фото ЧИТАЕТСЯ таблица «Пищевая ценность / на 100 г» —
   ПРОЧИТАЙ её и возьми эти числа (это точные данные, confidence ≥ 0.9).

Отвечай СТРОГО валидным JSON без пояснений:
{
  "name": "название по-русски",
  "emoji": "один эмодзи еды",
  "grams": число,                // вес порции, г
  "per100kcal": число,           // калорийность на 100 г
  "per100protein": число,        // белки на 100 г
  "per100carbs": число,          // углеводы на 100 г
  "per100fat": число,            // жиры на 100 г
  "packaged": true|false,        // магазинный/брендовый продукт?
  "query": "бренд и название для поиска в базе продуктов (если packaged), иначе ''",
  "confidence": число 0..1,      // высокий (>0.85) только если прочитал этикетку или очень стандартный продукт
  "extras": [ { "name":"...", "emoji":"...", "grams":число, "kcal":число } ]
}
extras — отдельные заметные компоненты (гарнир, хлеб, соус), если есть; иначе [].`

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : fallback
}

interface RawReco {
  name: string
  emoji: string
  grams: number
  per100kcal: number
  per100protein: number
  per100carbs: number
  per100fat: number
  packaged: boolean
  query: string
  confidence: number
  extras: { name: string; emoji: string; grams: number; kcal: number }[]
}

function coerceRaw(raw: string, fallbackName?: string): RawReco {
  // На случай reasoning-моделей убираем блок размышлений.
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  const json = start >= 0 && end > start ? clean.slice(start, end + 1) : clean
  const p = JSON.parse(json) as Record<string, unknown>

  const grams = Math.max(1, Math.round(num(p.grams, 100)))
  // Плотность на 100 г. Если модель дала только суммарные значения — выводим из них.
  const per = (per100: unknown, total: unknown) => {
    const d = num(per100)
    if (d > 0) return d
    return grams > 0 ? (num(total) / grams) * 100 : 0
  }

  return {
    name: String(p.name ?? fallbackName ?? 'Блюдо'),
    emoji: String(p.emoji ?? '🍽️').slice(0, 4),
    grams,
    per100kcal: Math.max(0, per(p.per100kcal, p.kcal)),
    per100protein: Math.max(0, per(p.per100protein, p.protein)),
    per100carbs: Math.max(0, per(p.per100carbs, p.carbs)),
    per100fat: Math.max(0, per(p.per100fat, p.fat)),
    packaged: Boolean(p.packaged),
    query: String(p.query ?? ''),
    confidence: Math.min(1, Math.max(0, num(p.confidence, 0.8))),
    extras: Array.isArray(p.extras)
      ? (p.extras as Record<string, unknown>[]).slice(0, 5).map((e) => ({
          name: String(e.name ?? 'Добавка'),
          emoji: String(e.emoji ?? '🍴').slice(0, 4),
          grams: Math.max(1, Math.round(num(e.grams, 50))),
          kcal: Math.max(0, Math.round(num(e.kcal))),
        }))
      : [],
  }
}

function toRecognition(r: RawReco): Recognition {
  const f = r.grams / 100
  return {
    name: r.name,
    emoji: r.emoji,
    grams: r.grams,
    kcal: Math.max(0, Math.round(r.per100kcal * f)),
    protein: Math.max(0, Math.round(r.per100protein * f)),
    carbs: Math.max(0, Math.round(r.per100carbs * f)),
    fat: Math.max(0, Math.round(r.per100fat * f)),
    confidence: r.confidence,
    extras: r.extras,
  }
}

export async function groqRecognize(input: RecognizeRequest): Promise<Recognition> {
  const hasImage = Boolean(input.imageBase64)
  const model = hasImage ? config.groqVisionModel : config.groqTextModel

  const userContent: ChatContent = hasImage
    ? [
        { type: 'text', text: 'Определи еду на фото и оцени КБЖУ. Если это упаковка с таблицей пищевой ценности — прочитай её.' },
        {
          type: 'image_url',
          image_url: {
            url: input.imageBase64!.startsWith('data:')
              ? input.imageBase64!
              : `data:image/jpeg;base64,${input.imageBase64}`,
          },
        },
      ]
    : `Продукт/блюдо: ${input.text ?? ''}`

  const raw = await groqChat(
    [
      { role: 'system', content: RECOGNIZE_SYSTEM },
      { role: 'user', content: userContent },
    ],
    model,
    // Vision-модель (qwen) — reasoning-модель: прячем <think>. Текстовая — строгий JSON-режим.
    hasImage ? { reasoningFormat: 'hidden' } : { jsonMode: true },
  )

  const reco = coerceRaw(raw, input.text)

  // Для упакованных продуктов уточняем калорийность/100 г из Open Food Facts.
  if (reco.packaged && reco.query) {
    const off = await offLookup(reco.query)
    if (off && off.per100kcal > 0) {
      reco.per100kcal = off.per100kcal
      if (off.per100protein > 0) reco.per100protein = off.per100protein
      if (off.per100carbs > 0) reco.per100carbs = off.per100carbs
      if (off.per100fat > 0) reco.per100fat = off.per100fat
      reco.confidence = Math.max(reco.confidence, 0.9)
    }
  }

  return toRecognition(reco)
}

export async function groqCoach(day: DaySummary, message: string): Promise<string> {
  const left = day.goalKcal - day.eatenKcal
  const m = day.macros
  const system = `Ты — Nyami, дружелюбный диетолог-коуч. Отвечай по-русски, кратко (1–3 предложения), поддерживающе, без морализаторства.
Данные дня пользователя:
- норма ${day.goalKcal} ккал, съедено ${day.eatenKcal}, осталось ${left} ккал
- белки ${m.protein.eaten}/${m.protein.goal} г, жиры ${m.fat.eaten}/${m.fat.goal} г, углеводы ${m.carbs.eaten}/${m.carbs.goal} г
Если спрашивают «можно ли съесть X» — прикинь калорийность X, скажи, впишется ли в остаток, и как это повлияет на остаток дня. Числа приводи конкретно.`

  const reply = await groqChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ],
    config.groqTextModel,
  )
  return reply.trim()
}

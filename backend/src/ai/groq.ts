import type { Recognition, DaySummary, RecognizeRequest } from '@nyami/shared'
import { config } from '../config.js'

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

const RECOGNIZE_SYSTEM = `Ты — нутрициолог. По описанию или фото блюда оцени его пищевую ценность одной порции.
Отвечай СТРОГО валидным JSON без пояснений, по схеме:
{
  "name": "название блюда по-русски",
  "emoji": "один подходящий эмодзи еды",
  "grams": число (примерный вес порции в граммах),
  "kcal": число (калории всей порции),
  "protein": число (белки, г),
  "carbs": число (углеводы, г),
  "fat": число (жиры, г),
  "confidence": число от 0 до 1 (насколько уверен),
  "extras": [ { "name": "...", "emoji": "...", "grams": число, "kcal": число } ]
}
extras — отдельные заметные компоненты (гарнир, хлеб, соус), если они есть; иначе пустой массив.`

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : fallback
}

function coerceRecognition(raw: string, fallbackName?: string): Recognition {
  // На случай reasoning-моделей убираем блок размышлений.
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  const json = start >= 0 && end > start ? clean.slice(start, end + 1) : clean
  const p = JSON.parse(json) as Record<string, unknown>
  return {
    name: String(p.name ?? fallbackName ?? 'Блюдо'),
    emoji: String(p.emoji ?? '🍽️').slice(0, 4),
    grams: Math.max(1, Math.round(num(p.grams, 100))),
    kcal: Math.max(0, Math.round(num(p.kcal))),
    protein: Math.max(0, Math.round(num(p.protein))),
    carbs: Math.max(0, Math.round(num(p.carbs))),
    fat: Math.max(0, Math.round(num(p.fat))),
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

export async function groqRecognize(input: RecognizeRequest): Promise<Recognition> {
  const hasImage = Boolean(input.imageBase64)
  const model = hasImage ? config.groqVisionModel : config.groqTextModel

  const userContent: ChatContent = hasImage
    ? [
        { type: 'text', text: 'Определи блюдо на фото и оцени его КБЖУ.' },
        {
          type: 'image_url',
          image_url: {
            url: input.imageBase64!.startsWith('data:')
              ? input.imageBase64!
              : `data:image/jpeg;base64,${input.imageBase64}`,
          },
        },
      ]
    : `Блюдо: ${input.text ?? ''}`

  const raw = await groqChat(
    [
      { role: 'system', content: RECOGNIZE_SYSTEM },
      { role: 'user', content: userContent },
    ],
    model,
    // Vision-модель (qwen) — reasoning-модель: прячем <think>. Текстовая — строгий JSON-режим.
    hasImage ? { reasoningFormat: 'hidden' } : { jsonMode: true },
  )
  return coerceRecognition(raw, input.text)
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

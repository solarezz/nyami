import type { FastifyInstance } from 'fastify'
import type {
  MeResponse, AddMealRequest, RecognizeRequest, CoachRequest, CoachResponse, UpdateProfileRequest, Recognition, UpdateFastingRequest,
} from '@nyami/shared'
import { authHook } from './auth.js'
import { type NyamiRepo, todayKey } from './repo.js'
import { getAi } from './ai/index.js'
import { offByBarcode } from './ai/off.js'
import { fatsecretByBarcode } from './ai/fatsecret.js'

// Валидная дата YYYY-MM-DD или сегодня.
const dayParam = (d: unknown): string => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayKey())

export function registerRoutes(app: FastifyInstance, repo: NyamiRepo): void {
  const ai = getAi()

  app.get('/api/health', async () => ({ ok: true }))

  // Всё под /api (кроме health) требует авторизации Telegram.
  app.register(async (api) => {
    api.addHook('preHandler', authHook)

    api.get('/api/me', async (req): Promise<MeResponse> => {
      const [profile, onboarded] = await Promise.all([repo.getProfile(req.user.id), repo.isOnboarded(req.user.id)])
      return { user: { id: req.user.id, firstName: req.user.firstName, username: req.user.username }, profile, onboarded }
    })

    // Сохранение профиля (онбординг / редактирование). Норма считается на сервере.
    api.post<{ Body: UpdateProfileRequest }>('/api/profile', async (req) => repo.updateProfile(req.user.id, req.body))

    // Интервальное голодание: протокол + час начала окна еды.
    api.post<{ Body: UpdateFastingRequest }>('/api/fasting', async (req) => repo.setFasting(req.user.id, req.body))

    api.get<{ Querystring: { date?: string } }>('/api/day', async (req) => repo.getDay(req.user.id, dayParam(req.query.date)))

    api.get('/api/week', async (req) => repo.getWeek(req.user.id))

    api.post<{ Body: AddMealRequest & { date?: string } }>('/api/meals', async (req) => {
      const { date, ...meal } = req.body
      return repo.addMeal(req.user.id, meal, dayParam(date))
    })

    api.delete<{ Params: { id: string } }>('/api/meals/:id', async (req) => {
      await repo.deleteMeal(req.user.id, req.params.id)
      return { ok: true }
    })

    // Вода: установить количество стаканов за день (по умолчанию сегодня).
    api.post<{ Body: { glasses: number; date?: string } }>('/api/water', async (req) => {
      const done = await repo.setWater(req.user.id, req.body.glasses, dayParam(req.body.date))
      return { done }
    })

    // Часто добавляемые блюда пользователя.
    api.get('/api/frequent', async (req) => repo.getFrequent(req.user.id))

    // Распознавание еды: фото или текст → КБЖУ (через AI-провайдера).
    api.post<{ Body: RecognizeRequest }>('/api/recognize', async (req) => ai.recognize(req.body))

    // Штрихкод → точные данные продукта из Open Food Facts.
    api.get<{ Params: { code: string } }>('/api/barcode/:code', async (req, reply) => {
      // Open Food Facts → FatSecret (шире по RU/BY) → 404 (фронт предложит фото этикетки).
      const p = (await offByBarcode(req.params.code)) ?? (await fatsecretByBarcode(req.params.code))
      if (!p) return reply.code(404).send({ error: 'not_found' })
      const grams = p.servingG && p.servingG > 0 ? Math.round(p.servingG) : 100
      const f = grams / 100
      const reco: Recognition = {
        name: p.name, emoji: '🍽️', grams,
        kcal: Math.round(p.per100kcal * f),
        protein: Math.round(p.per100protein * f),
        carbs: Math.round(p.per100carbs * f),
        fat: Math.round(p.per100fat * f),
        confidence: 0.95, extras: [],
      }
      return reco
    })

    // Коуч: отвечает с учётом контекста дня пользователя.
    api.post<{ Body: CoachRequest }>('/api/coach', async (req): Promise<CoachResponse> => {
      const day = await repo.getDay(req.user.id, todayKey()) // коуч всегда про сегодня
      const reply = await ai.coach(day, req.body.message)
      return { reply }
    })
  })
}

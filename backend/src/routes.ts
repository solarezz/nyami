import type { FastifyInstance } from 'fastify'
import type {
  MeResponse, AddMealRequest, RecognizeRequest, CoachRequest, CoachResponse,
} from '@nyami/shared'
import { authHook } from './auth.js'
import type { NyamiRepo } from './repo.js'
import { getAi } from './ai/index.js'

export function registerRoutes(app: FastifyInstance, repo: NyamiRepo): void {
  const ai = getAi()

  app.get('/api/health', async () => ({ ok: true }))

  // Всё под /api (кроме health) требует авторизации Telegram.
  app.register(async (api) => {
    api.addHook('preHandler', authHook)

    api.get('/api/me', async (req): Promise<MeResponse> => {
      const profile = await repo.getProfile(req.user.id)
      return { user: { id: req.user.id, firstName: req.user.firstName, username: req.user.username }, profile }
    })

    api.get('/api/day', async (req) => repo.getToday(req.user.id))

    api.get('/api/week', async (req) => repo.getWeek(req.user.id))

    api.post<{ Body: AddMealRequest }>('/api/meals', async (req) => repo.addMeal(req.user.id, req.body))

    // Распознавание еды: фото или текст → КБЖУ (через AI-провайдера).
    api.post<{ Body: RecognizeRequest }>('/api/recognize', async (req) => ai.recognize(req.body))

    // Коуч: отвечает с учётом контекста дня пользователя.
    api.post<{ Body: CoachRequest }>('/api/coach', async (req): Promise<CoachResponse> => {
      const day = await repo.getToday(req.user.id)
      const reply = await ai.coach(day, req.body.message)
      return { reply }
    })
  })
}

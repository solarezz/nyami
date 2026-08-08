import type { FastifyInstance } from 'fastify'
import type {
  MeResponse, AddMealRequest, RecognizeRequest, CoachRequest, CoachResponse, UpdateProfileRequest,
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
      const [profile, onboarded] = await Promise.all([repo.getProfile(req.user.id), repo.isOnboarded(req.user.id)])
      return { user: { id: req.user.id, firstName: req.user.firstName, username: req.user.username }, profile, onboarded }
    })

    // Сохранение профиля (онбординг / редактирование). Норма считается на сервере.
    api.post<{ Body: UpdateProfileRequest }>('/api/profile', async (req) => repo.updateProfile(req.user.id, req.body))

    api.get('/api/day', async (req) => repo.getToday(req.user.id))

    api.get('/api/week', async (req) => repo.getWeek(req.user.id))

    api.post<{ Body: AddMealRequest }>('/api/meals', async (req) => repo.addMeal(req.user.id, req.body))

    api.delete<{ Params: { id: string } }>('/api/meals/:id', async (req) => {
      await repo.deleteMeal(req.user.id, req.params.id)
      return { ok: true }
    })

    // Вода: установить количество стаканов за сегодня.
    api.post<{ Body: { glasses: number } }>('/api/water', async (req) => {
      const done = await repo.setWater(req.user.id, req.body.glasses)
      return { done }
    })

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

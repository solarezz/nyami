import type { FastifyInstance } from 'fastify'
import type {
  MeResponse, AddMealRequest, RecognizeRequest, CoachRequest, CoachResponse, UpdateProfileRequest, Recognition, UpdateFastingRequest,
  AddWorkoutRequest, RecognizeWorkoutRequest, SetWeightRequest, UpdateMealItemRequest,
  StartSessionRequest, RecordSetRequest, UpdateNotificationsRequest,
} from '@nyami/shared'
import { authHook } from './auth.js'
import { type NyamiRepo, LastItemError } from './repo.js'
import type { TrainingRepo } from './training.js'
import { getAi } from './ai/index.js'
import { offByBarcode } from './ai/off.js'
import { fatsecretByBarcode } from './ai/fatsecret.js'
import { groqGenerateProgram } from './ai/groq.js'
import { mockGenerateProgram } from './ai/mock.js'
import { config } from './config.js'

// Явная дата YYYY-MM-DD из запроса, иначе undefined — репозиторий сам подставит
// «сегодня» по локальной таймзоне пользователя (она есть только после ensureUser).
const dayParam = (d: unknown): string | undefined => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined)

export function registerRoutes(app: FastifyInstance, repo: NyamiRepo, training: TrainingRepo): void {
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

    // Напоминания в Telegram (приёмы пищи, еженедельный отчёт) — вкл/выкл.
    api.post<{ Body: UpdateNotificationsRequest }>('/api/notifications', async (req) => repo.setNotifications(req.user.id, req.body))

    api.get<{ Querystring: { date?: string } }>('/api/day', async (req) => repo.getDay(req.user.id, dayParam(req.query.date)))

    api.get('/api/week', async (req) => repo.getWeek(req.user.id))

    api.post<{ Body: AddMealRequest & { date?: string } }>('/api/meals', async (req, reply) => {
      const { date, ...meal } = req.body
      if (!Array.isArray(meal.items) || meal.items.length === 0) {
        return reply.code(400).send({ error: 'items_required' })
      }
      return repo.addMeal(req.user.id, meal, dayParam(date))
    })

    api.delete<{ Params: { id: string } }>('/api/meals/:id', async (req) => {
      await repo.deleteMeal(req.user.id, req.params.id)
      return { ok: true }
    })

    // Изменить массу одного компонента приёма — остальные КБЖУ компонента и агрегат
    // приёма пересчитываются пропорционально.
    api.patch<{ Params: { mealId: string; itemId: string }; Body: UpdateMealItemRequest }>(
      '/api/meals/:mealId/items/:itemId',
      async (req, reply) => {
        const grams = Number(req.body?.grams)
        if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) {
          return reply.code(400).send({ error: 'invalid_grams' })
        }
        try {
          return await repo.updateMealItem(req.user.id, req.params.mealId, req.params.itemId, grams)
        } catch (e) {
          if (e instanceof Error && e.message === 'not_found') return reply.code(404).send({ error: 'not_found' })
          throw e
        }
      },
    )

    // Удалить один компонент приёма. Последний компонент удалять нельзя — для этого есть DELETE /api/meals/:id.
    api.delete<{ Params: { mealId: string; itemId: string } }>('/api/meals/:mealId/items/:itemId', async (req, reply) => {
      try {
        return await repo.deleteMealItem(req.user.id, req.params.mealId, req.params.itemId)
      } catch (e) {
        if (e instanceof LastItemError) return reply.code(400).send({ error: 'last_item' })
        if (e instanceof Error && e.message === 'not_found') return reply.code(404).send({ error: 'not_found' })
        throw e
      }
    })

    // Тренировка: оценка сожжённых калорий по описанию (нужен вес пользователя для MET).
    api.post<{ Body: RecognizeWorkoutRequest }>('/api/workout/recognize', async (req) => {
      const profile = await repo.getProfile(req.user.id)
      return ai.recognizeWorkout(req.body.text, profile.weightKg)
    })

    api.post<{ Body: AddWorkoutRequest & { date?: string } }>('/api/workouts', async (req) => {
      const { date, ...workout } = req.body
      return repo.addWorkout(req.user.id, workout, dayParam(date))
    })

    api.delete<{ Params: { id: string } }>('/api/workouts/:id', async (req) => {
      await repo.deleteWorkout(req.user.id, req.params.id)
      return { ok: true }
    })

    // Вода: установить количество стаканов за день (по умолчанию сегодня).
    api.post<{ Body: { glasses: number; date?: string } }>('/api/water', async (req) => {
      const done = await repo.setWater(req.user.id, req.body.glasses, dayParam(req.body.date))
      return { done }
    })

    // Замер веса: пишем в историю, возвращаем обновлённый weightSeries.
    api.post<{ Body: SetWeightRequest }>('/api/weight', async (req, reply) => {
      const kg = Math.round(Number(req.body?.weightKg) * 10) / 10
      if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
        return reply.code(400).send({ error: 'invalid_weight' })
      }
      const weightSeries = await repo.setWeight(req.user.id, kg)
      return { weightSeries }
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

    // ---- Тренировочный модуль ----

    // Библиотека упражнений (опционально фильтр по группе мышц).
    api.get<{ Querystring: { muscleGroup?: string } }>('/api/exercises', async (req) => training.listExercises(req.query.muscleGroup))

    // Карточка упражнения: фото/видео, мышцы, последний результат, личный рекорд, замены.
    api.get<{ Params: { id: string } }>('/api/exercises/:id', async (req, reply) => {
      const ex = await training.getExercise(req.user.id, req.params.id)
      if (!ex) return reply.code(404).send({ error: 'not_found' })
      return ex
    })

    api.get('/api/training/programs', async (req) => training.listPrograms(req.user.id))

    // ИИ-генерация персональной программы под профиль пользователя (цель/активность)
    // и его реальную историю тренировок (типичные дни недели, если уже накопилась).
    api.post('/api/training/generate-program', async (req) => {
      const profile = await repo.getProfile(req.user.id)
      const [library, pattern] = await Promise.all([
        training.listExercises(),
        training.inferTrainingPattern(req.user.id, profile.timezone),
      ])
      let plan
      try {
        plan = config.aiProvider === 'groq' && config.groqApiKey
          ? await groqGenerateProgram(profile, library, pattern)
          : mockGenerateProgram(library)
      } catch (e) {
        console.error('[training] groq generate-program failed, fallback to mock:', e)
        plan = mockGenerateProgram(library)
      }
      return training.createProgram(req.user.id, plan)
    })

    // Агрегаты по тренировкам за последние 7 дней — для экрана «Прогресс».
    api.get('/api/training/stats', async (req) => training.getTrainingStats(req.user.id, 7))

    api.get<{ Params: { id: string } }>('/api/training/program-days/:id', async (req, reply) => {
      const day = await training.getProgramDay(req.params.id)
      if (!day) return reply.code(404).send({ error: 'not_found' })
      return day
    })

    // Адаптивное расписание: типичные дни недели/время суток по фактической истории
    // тренировок (нужна таймзона пользователя — берём из профиля).
    api.get('/api/training/pattern', async (req) => {
      const profile = await repo.getProfile(req.user.id)
      return training.inferTrainingPattern(req.user.id, profile.timezone)
    })

    api.post<{ Body: StartSessionRequest }>('/api/training/sessions', async (req) => training.startSession(req.user.id, req.body))

    api.get<{ Params: { id: string } }>('/api/training/sessions/:id', async (req, reply) => {
      const session = await training.getSession(req.user.id, req.params.id)
      if (!session) return reply.code(404).send({ error: 'not_found' })
      return session
    })

    api.post<{ Params: { id: string }; Body: RecordSetRequest }>('/api/training/sessions/:id/sets', async (req, reply) => {
      try {
        return await training.recordSet(req.user.id, req.params.id, req.body)
      } catch (e) {
        if (e instanceof Error && e.message === 'not_found') return reply.code(404).send({ error: 'not_found' })
        throw e
      }
    })

    api.post<{ Params: { id: string } }>('/api/training/sessions/:id/complete', async (req, reply) => {
      try {
        return await training.completeSession(req.user.id, req.params.id)
      } catch (e) {
        if (e instanceof Error && e.message === 'not_found') return reply.code(404).send({ error: 'not_found' })
        throw e
      }
    })

    // Коуч: отвечает с учётом контекста дня пользователя.
    api.post<{ Body: CoachRequest }>('/api/coach', async (req): Promise<CoachResponse> => {
      const day = await repo.getDay(req.user.id) // коуч всегда про сегодня (локальная дата пользователя)
      const reply = await ai.coach(day, req.body.message)
      return { reply }
    })
  })
}

import { and, eq, gte, lt, asc, desc } from 'drizzle-orm'
import type { DaySummary, Profile, Meal, AddMealRequest, UpdateProfileRequest, MealType, FastingProtocol, Workout } from '@nyami/shared'
import {
  type NyamiRepo, WATER_GOAL, computeStreak, lastSevenDays, hhmm, todayKey, dayRange, topFrequent, mealTypeForHour,
} from '../repo.js'
import { computeNorm } from '../nutrition.js'
import { db, type Db } from './client.js'
import { users, meals, days, weights, workouts } from './schema.js'

export function createDrizzleRepo(): NyamiRepo {
  const database = db as Db // конструируется только при заданном DATABASE_URL

  async function ensureUser(userId: number): Promise<typeof users.$inferSelect> {
    const found = await database.select().from(users).where(eq(users.telegramId, userId)).limit(1)
    if (found[0]) return found[0]
    // Первый запуск: /api/me,/day,/week идут параллельно и создают юзера одновременно.
    // onConflictDoNothing делает вставку идемпотентной — иначе дубль первичного ключа → 500.
    await database.insert(users).values({ telegramId: userId }).onConflictDoNothing()
    const after = await database.select().from(users).where(eq(users.telegramId, userId)).limit(1)
    return after[0]
  }

  return {
    async getProfile(userId) {
      return toProfile(await ensureUser(userId))
    },

    async isOnboarded(userId) {
      return (await ensureUser(userId)).onboarded
    },

    async updateProfile(userId, req: UpdateProfileRequest) {
      await ensureUser(userId)
      const norm = computeNorm(req)
      const updated = await database
        .update(users)
        .set({ ...req, ...norm, onboarded: true })
        .where(eq(users.telegramId, userId))
        .returning()
      await database.insert(weights).values({ telegramId: userId, weightKg: req.weightKg })
      return toProfile(updated[0])
    },

    async setFasting(userId, req) {
      await ensureUser(userId)
      const updated = await database
        .update(users)
        .set({ fastingProtocol: req.protocol, eatStartHour: req.eatStartHour })
        .where(eq(users.telegramId, userId))
        .returning()
      return toProfile(updated[0])
    },

    async getDay(userId, date) {
      const u = await ensureUser(userId)
      const { start, end } = dayRange(date)
      const rows = await database
        .select().from(meals)
        .where(and(eq(meals.telegramId, userId), gte(meals.eatenAt, start), lt(meals.eatenAt, end)))
        .orderBy(asc(meals.eatenAt))

      const list: Meal[] = rows.map(toMeal)
      const sum = (k: keyof Meal) => list.reduce((s, m) => s + (Number(m[k]) || 0), 0)

      const wkRows = await database
        .select().from(workouts)
        .where(and(eq(workouts.telegramId, userId), gte(workouts.doneAt, start), lt(workouts.doneAt, end)))
        .orderBy(asc(workouts.doneAt))
      const wkList: Workout[] = wkRows.map(toWorkout)

      // Стрик: даты всех приёмов пользователя.
      const allDates = await database.select({ at: meals.eatenAt }).from(meals).where(eq(meals.telegramId, userId))
      const dateSet = new Set(allDates.map((r) => r.at.toISOString().slice(0, 10)))

      const waterRow = await database
        .select().from(days)
        .where(and(eq(days.telegramId, userId), eq(days.date, date))).limit(1)

      const day: DaySummary = {
        date,
        eatenKcal: sum('kcal'),
        goalKcal: u.dailyKcal,
        burnedKcal: wkList.reduce((s, w) => s + w.kcal, 0),
        macros: {
          protein: { eaten: sum('protein'), goal: u.protein },
          fat: { eaten: sum('fat'), goal: u.fat },
          carbs: { eaten: sum('carbs'), goal: u.carbs },
        },
        water: { done: waterRow[0]?.water ?? 0, goal: WATER_GOAL },
        streak: computeStreak(dateSet),
        meals: list,
        workouts: wkList,
      }
      return day
    },

    async getWeek(userId) {
      const u = await ensureUser(userId)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      weekAgo.setHours(0, 0, 0, 0)

      const rows = await database
        .select().from(meals)
        .where(and(eq(meals.telegramId, userId), gte(meals.eatenAt, weekAgo)))
      const byDay = new Map<string, number>()
      for (const m of rows) {
        const key = m.eatenAt.toISOString().slice(0, 10)
        byDay.set(key, (byDay.get(key) ?? 0) + m.kcal)
      }

      const wRows = await database
        .select({ w: weights.weightKg }).from(weights)
        .where(eq(weights.telegramId, userId)).orderBy(asc(weights.at))
      const weightSeries = wRows.length ? wRows.slice(-7).map((r) => r.w) : [u.weightKg]

      return { days: lastSevenDays(byDay, u.dailyKcal), weightSeries }
    },

    async addMeal(userId, req: AddMealRequest, date) {
      await ensureUser(userId)
      const now = new Date()
      // Прошлый день → выбранная дата + текущее время суток.
      const eatenAt = date === todayKey() ? now : new Date(`${date}T${now.toISOString().slice(11)}`)
      const inserted = await database
        .insert(meals)
        // Тип из запроса приоритетнее; если не задан — определяем по времени.
        .values({ telegramId: userId, eatenAt, ...req, mealType: req.mealType ?? mealTypeForHour(eatenAt.getUTCHours()) })
        .returning()
      return toMeal(inserted[0])
    },

    async deleteMeal(userId, mealId) {
      await database.delete(meals).where(and(eq(meals.id, mealId), eq(meals.telegramId, userId)))
    },

    async addWorkout(userId, req, date) {
      await ensureUser(userId)
      const now = new Date()
      const doneAt = date === todayKey() ? now : new Date(`${date}T${now.toISOString().slice(11)}`)
      const inserted = await database
        .insert(workouts)
        .values({ telegramId: userId, doneAt, ...req })
        .returning()
      return toWorkout(inserted[0])
    },

    async deleteWorkout(userId, workoutId) {
      await database.delete(workouts).where(and(eq(workouts.id, workoutId), eq(workouts.telegramId, userId)))
    },

    async setWater(userId, glasses, date) {
      await ensureUser(userId)
      const clamped = Math.max(0, Math.min(20, Math.round(glasses)))
      await database
        .insert(days).values({ telegramId: userId, date, water: clamped })
        .onConflictDoUpdate({ target: [days.telegramId, days.date], set: { water: clamped } })
      return clamped
    },

    async setWeight(userId, weightKg) {
      await ensureUser(userId)
      await database.insert(weights).values({ telegramId: userId, weightKg })
      const wRows = await database
        .select({ w: weights.weightKg }).from(weights)
        .where(eq(weights.telegramId, userId)).orderBy(asc(weights.at))
      return wRows.slice(-7).map((r) => r.w)
    },

    async getFrequent(userId) {
      const rows = await database
        .select().from(meals)
        .where(eq(meals.telegramId, userId))
        .orderBy(desc(meals.eatenAt)).limit(200)
      return topFrequent(rows)
    },

    async getOnboardedUserIds() {
      const rows = await database.select({ id: users.telegramId }).from(users).where(eq(users.onboarded, true))
      return rows.map((r) => r.id)
    },
  }
}

function toMeal(m: typeof meals.$inferSelect): Meal {
  return {
    id: m.id, name: m.name, emoji: m.emoji, time: hhmm(m.eatenAt),
    mealType: m.mealType as MealType,
    kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
  }
}

function toWorkout(w: typeof workouts.$inferSelect): Workout {
  return {
    id: w.id, name: w.name, emoji: w.emoji, minutes: w.minutes, kcal: w.kcal, time: hhmm(w.doneAt),
  }
}

function toProfile(u: typeof users.$inferSelect): Profile {
  return {
    sex: u.sex as Profile['sex'],
    age: u.age,
    heightCm: u.heightCm,
    weightKg: u.weightKg,
    activity: u.activity as Profile['activity'],
    goal: u.goal as Profile['goal'],
    dailyKcal: u.dailyKcal,
    protein: u.protein,
    fat: u.fat,
    carbs: u.carbs,
    fastingProtocol: u.fastingProtocol as FastingProtocol,
    eatStartHour: u.eatStartHour,
  }
}

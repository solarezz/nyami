import { and, eq, gte, asc } from 'drizzle-orm'
import type { DaySummary, Profile, Meal, AddMealRequest, UpdateProfileRequest } from '@nyami/shared'
import {
  type NyamiRepo, WATER_GOAL, computeStreak, lastSevenDays, hhmm, todayKey,
} from '../repo.js'
import { computeNorm } from '../nutrition.js'
import { db, type Db } from './client.js'
import { users, meals, days, weights } from './schema.js'

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function createDrizzleRepo(): NyamiRepo {
  const database = db as Db // конструируется только при заданном DATABASE_URL

  async function ensureUser(userId: number): Promise<typeof users.$inferSelect> {
    const found = await database.select().from(users).where(eq(users.telegramId, userId)).limit(1)
    if (found[0]) return found[0]
    const inserted = await database.insert(users).values({ telegramId: userId }).returning()
    return inserted[0]
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

    async getToday(userId) {
      const u = await ensureUser(userId)
      const rows = await database
        .select().from(meals)
        .where(and(eq(meals.telegramId, userId), gte(meals.eatenAt, startOfToday())))
        .orderBy(asc(meals.eatenAt))

      const list: Meal[] = rows.map(toMeal)
      const sum = (k: keyof Meal) => list.reduce((s, m) => s + (Number(m[k]) || 0), 0)

      // Стрик: даты всех приёмов пользователя.
      const allDates = await database.select({ at: meals.eatenAt }).from(meals).where(eq(meals.telegramId, userId))
      const dateSet = new Set(allDates.map((r) => r.at.toISOString().slice(0, 10)))

      const waterRow = await database
        .select().from(days)
        .where(and(eq(days.telegramId, userId), eq(days.date, todayKey()))).limit(1)

      const day: DaySummary = {
        date: todayKey(),
        eatenKcal: sum('kcal'),
        goalKcal: u.dailyKcal,
        macros: {
          protein: { eaten: sum('protein'), goal: u.protein },
          fat: { eaten: sum('fat'), goal: u.fat },
          carbs: { eaten: sum('carbs'), goal: u.carbs },
        },
        water: { done: waterRow[0]?.water ?? 0, goal: WATER_GOAL },
        streak: computeStreak(dateSet),
        meals: list,
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

    async addMeal(userId, req: AddMealRequest) {
      await ensureUser(userId)
      const inserted = await database.insert(meals).values({ telegramId: userId, ...req }).returning()
      return toMeal(inserted[0])
    },

    async deleteMeal(userId, mealId) {
      await database.delete(meals).where(and(eq(meals.id, mealId), eq(meals.telegramId, userId)))
    },

    async setWater(userId, glasses) {
      await ensureUser(userId)
      const clamped = Math.max(0, Math.min(20, Math.round(glasses)))
      await database
        .insert(days).values({ telegramId: userId, date: todayKey(), water: clamped })
        .onConflictDoUpdate({ target: [days.telegramId, days.date], set: { water: clamped } })
      return clamped
    },
  }
}

function toMeal(m: typeof meals.$inferSelect): Meal {
  return {
    id: m.id, name: m.name, emoji: m.emoji, time: hhmm(m.eatenAt),
    kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
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
  }
}

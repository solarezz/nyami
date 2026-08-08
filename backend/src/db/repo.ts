import { and, eq, gte } from 'drizzle-orm'
import type { DaySummary, Profile, WeekDay, Meal, AddMealRequest } from '@nyami/shared'
import type { NyamiRepo } from '../repo.js'
import { db, type Db } from './client.js'
import { users, meals } from './schema.js'

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function hhmm(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function createDrizzleRepo(): NyamiRepo {
  const database = db as Db // конструируется только при заданном DATABASE_URL

  // Заводит пользователя при первом обращении (значения по умолчанию из схемы).
  async function ensureUser(userId: number): Promise<typeof users.$inferSelect> {
    const found = await database.select().from(users).where(eq(users.telegramId, userId)).limit(1)
    if (found[0]) return found[0]
    const inserted = await database.insert(users).values({ telegramId: userId }).returning()
    return inserted[0]
  }

  return {
    async getProfile(userId) {
      const u = await ensureUser(userId)
      return toProfile(u)
    },

    async getToday(userId) {
      const u = await ensureUser(userId)
      const rows = await database
        .select()
        .from(meals)
        .where(and(eq(meals.telegramId, userId), gte(meals.eatenAt, startOfToday())))
        .orderBy(meals.eatenAt)

      const list: Meal[] = rows.map((m) => ({
        id: m.id,
        name: m.name,
        emoji: m.emoji,
        time: hhmm(m.eatenAt),
        kcal: m.kcal,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      }))
      const sum = (k: keyof Meal) => list.reduce((s, m) => s + (m[k] as number), 0)

      const day: DaySummary = {
        date: startOfToday().toISOString().slice(0, 10),
        eatenKcal: sum('kcal'),
        goalKcal: u.dailyKcal,
        macros: {
          protein: { eaten: sum('protein'), goal: u.protein },
          fat: { eaten: sum('fat'), goal: u.fat },
          carbs: { eaten: sum('carbs'), goal: u.carbs },
        },
        water: { done: 0, goal: 8 },
        streak: u.streak,
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
        .select()
        .from(meals)
        .where(and(eq(meals.telegramId, userId), gte(meals.eatenAt, weekAgo)))

      // Суммируем калории по дням за последние 7 календарных дней.
      const byDay = new Map<string, number>()
      for (const m of rows) {
        const key = m.eatenAt.toISOString().slice(0, 10)
        byDay.set(key, (byDay.get(key) ?? 0) + m.kcal)
      }
      const days: WeekDay[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        const kcal = byDay.get(key) ?? 0
        days.push({ label: WEEKDAY_RU[d.getDay()], kcal, over: kcal > u.dailyKcal, today: i === 0 })
      }

      // Пока храним только текущий вес; график веса появится с таблицей замеров.
      const weightSeries = Array(7).fill(u.weightKg) as number[]
      return { days, weightSeries }
    },

    async addMeal(userId, req: AddMealRequest) {
      await ensureUser(userId)
      const inserted = await database.insert(meals).values({ telegramId: userId, ...req }).returning()
      const m = inserted[0]
      return {
        id: m.id, name: m.name, emoji: m.emoji, time: hhmm(m.eatenAt),
        kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
      }
    },
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

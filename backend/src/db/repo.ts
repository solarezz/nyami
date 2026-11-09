import { and, eq, gte, lt, lte, asc, desc, inArray } from 'drizzle-orm'
import type { DaySummary, Profile, Meal, MealItem, AddMealRequest, UpdateProfileRequest, MealType, FastingProtocol, Workout } from '@nyami/shared'
import {
  type NyamiRepo, WATER_GOAL, computeStreak, lastSevenDays, topFrequent, mealTypeForHour, resolveEntryInstant,
  aggregateItems, rescaleItem, LastItemError,
} from '../repo.js'
import { computeNorm } from '../nutrition.js'
import { localDateKey, localDayRange, localHour, formatHHMM, addDaysToDateStr } from '../tz.js'
import { db, type Db } from './client.js'
import { users, meals, mealItems, days, weights, workouts, mealReminders, dailyTargets } from './schema.js'

type Target = { calories: number; protein: number; fat: number; carbs: number }

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

  // Цель на дату: последний снимок daily_targets с date <= запрошенной; если снимков ещё
  // нет (пользователь из-до миграции, ни разу не менял профиль) — текущие users.* как фолбэк.
  async function targetForDate(u: typeof users.$inferSelect, date: string): Promise<Target> {
    const rows = await database
      .select().from(dailyTargets)
      .where(and(eq(dailyTargets.telegramId, u.telegramId), lte(dailyTargets.date, date)))
      .orderBy(desc(dailyTargets.date))
      .limit(1)
    const row = rows[0]
    return row
      ? { calories: row.calories, protein: row.protein, fat: row.fat, carbs: row.carbs }
      : { calories: u.dailyKcal, protein: u.protein, fat: u.fat, carbs: u.carbs }
  }

  return {
    async getProfile(userId) {
      return toProfile(await ensureUser(userId))
    },

    async isOnboarded(userId) {
      return (await ensureUser(userId)).onboarded
    },

    async updateProfile(userId, req: UpdateProfileRequest) {
      const current = await ensureUser(userId)
      const norm = computeNorm(req)
      const { timezone: reqTz, ...rest } = req
      const timezone = reqTz ?? current.timezone
      const updated = await database
        .update(users)
        .set({ ...rest, timezone, ...norm, onboarded: true })
        .where(eq(users.telegramId, userId))
        .returning()
      await database.insert(weights).values({ telegramId: userId, weightKg: req.weightKg })
      // Снимок цели на сегодня (локальная дата) — не трогает цели, показанные для прошлых дней.
      const today = localDateKey(new Date(), timezone)
      await database
        .insert(dailyTargets)
        .values({ telegramId: userId, date: today, calories: norm.dailyKcal, protein: norm.protein, fat: norm.fat, carbs: norm.carbs })
        .onConflictDoUpdate({
          target: [dailyTargets.telegramId, dailyTargets.date],
          set: { calories: norm.dailyKcal, protein: norm.protein, fat: norm.fat, carbs: norm.carbs },
        })
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
      const resolvedDate = date ?? localDateKey(new Date(), u.timezone)
      const { start, end } = localDayRange(resolvedDate, u.timezone)
      const rows = await database
        .select().from(meals)
        .where(and(eq(meals.telegramId, userId), gte(meals.eatenAt, start), lt(meals.eatenAt, end)))
        .orderBy(asc(meals.eatenAt))

      const itemsByMeal = await loadItemsFor(database, rows.map((m) => m.id))
      const list: Meal[] = rows.map((m) => toMeal(m, itemsByMeal.get(m.id) ?? [], u.timezone))
      const sum = (k: keyof Meal) => list.reduce((s, m) => s + (Number(m[k]) || 0), 0)

      const wkRows = await database
        .select().from(workouts)
        .where(and(eq(workouts.telegramId, userId), gte(workouts.doneAt, start), lt(workouts.doneAt, end)))
        .orderBy(asc(workouts.doneAt))
      const wkList: Workout[] = wkRows.map((w) => toWorkout(w, u.timezone))

      // Стрик: локальные даты всех приёмов пользователя.
      const allDates = await database.select({ at: meals.eatenAt }).from(meals).where(eq(meals.telegramId, userId))
      const dateSet = new Set(allDates.map((r) => localDateKey(r.at, u.timezone)))

      const waterRow = await database
        .select().from(days)
        .where(and(eq(days.telegramId, userId), eq(days.date, resolvedDate))).limit(1)

      const target = await targetForDate(u, resolvedDate)

      const day: DaySummary = {
        date: resolvedDate,
        eatenKcal: sum('kcal'),
        goalKcal: target.calories,
        burnedKcal: wkList.reduce((s, w) => s + w.kcal, 0),
        macros: {
          protein: { eaten: sum('protein'), goal: target.protein },
          fat: { eaten: sum('fat'), goal: target.fat },
          carbs: { eaten: sum('carbs'), goal: target.carbs },
        },
        water: { done: waterRow[0]?.water ?? 0, goal: WATER_GOAL },
        streak: computeStreak(dateSet, u.timezone),
        meals: list,
        workouts: wkList,
      }
      return day
    },

    async getWeek(userId) {
      const u = await ensureUser(userId)
      const today = localDateKey(new Date(), u.timezone)
      const weekStartDate = addDaysToDateStr(today, -6)
      const { start: weekAgo } = localDayRange(weekStartDate, u.timezone)

      const rows = await database
        .select().from(meals)
        .where(and(eq(meals.telegramId, userId), gte(meals.eatenAt, weekAgo)))
      const byDay = new Map<string, number>()
      for (const m of rows) {
        const key = localDateKey(m.eatenAt, u.timezone)
        byDay.set(key, (byDay.get(key) ?? 0) + m.kcal)
      }

      const wRows = await database
        .select({ w: weights.weightKg }).from(weights)
        .where(eq(weights.telegramId, userId)).orderBy(asc(weights.at))
      const weightSeries = wRows.length ? wRows.slice(-7).map((r) => r.w) : [u.weightKg]

      return { days: lastSevenDays(byDay, u.dailyKcal, u.timezone), weightSeries }
    },

    async addMeal(userId, req: AddMealRequest, date) {
      const u = await ensureUser(userId)
      const resolvedDate = date ?? localDateKey(new Date(), u.timezone)
      const eatenAt = resolveEntryInstant(resolvedDate, u.timezone)
      const mealType = req.mealType ?? mealTypeForHour(localHour(eatenAt, u.timezone))
      const agg = aggregateItems(req.items)

      return database.transaction(async (tx) => {
        const insertedMeal = (await tx
          .insert(meals)
          .values({ telegramId: userId, eatenAt, name: req.name, emoji: req.emoji, mealType, ...agg })
          .returning())[0]
        const insertedItems = await tx
          .insert(mealItems)
          .values(req.items.map((it, i) => ({ mealId: insertedMeal.id, ...it, sortOrder: i })))
          .returning()
        return toMeal(insertedMeal, insertedItems.map(toMealItem), u.timezone)
      })
    },

    async deleteMeal(userId, mealId) {
      // meal_items удаляются каскадом (ON DELETE CASCADE на meal_id).
      await database.delete(meals).where(and(eq(meals.id, mealId), eq(meals.telegramId, userId)))
    },

    async updateMealItem(userId, mealId, itemId, grams) {
      const u = await ensureUser(userId)
      return database.transaction(async (tx) => {
        const mealRows = await tx.select().from(meals).where(and(eq(meals.id, mealId), eq(meals.telegramId, userId))).limit(1)
        if (!mealRows[0]) throw new Error('not_found')
        const itemRows = await tx.select().from(mealItems).where(and(eq(mealItems.id, itemId), eq(mealItems.mealId, mealId))).limit(1)
        if (!itemRows[0]) throw new Error('not_found')

        const rescaled = rescaleItem(toMealItem(itemRows[0]), grams)
        await tx.update(mealItems)
          .set({ grams: rescaled.grams, kcal: rescaled.kcal, protein: rescaled.protein, carbs: rescaled.carbs, fat: rescaled.fat })
          .where(eq(mealItems.id, itemId))

        const allItems = (await tx.select().from(mealItems).where(eq(mealItems.mealId, mealId)).orderBy(asc(mealItems.sortOrder))).map(toMealItem)
        const updatedMeal = (await tx.update(meals).set(aggregateItems(allItems)).where(eq(meals.id, mealId)).returning())[0]
        return toMeal(updatedMeal, allItems, u.timezone)
      })
    },

    async deleteMealItem(userId, mealId, itemId) {
      const u = await ensureUser(userId)
      return database.transaction(async (tx) => {
        const mealRows = await tx.select().from(meals).where(and(eq(meals.id, mealId), eq(meals.telegramId, userId))).limit(1)
        if (!mealRows[0]) throw new Error('not_found')

        const existing = await tx.select().from(mealItems).where(eq(mealItems.mealId, mealId))
        if (!existing.some((it) => it.id === itemId)) throw new Error('not_found')
        if (existing.length <= 1) throw new LastItemError()

        await tx.delete(mealItems).where(and(eq(mealItems.id, itemId), eq(mealItems.mealId, mealId)))
        const remaining = (await tx.select().from(mealItems).where(eq(mealItems.mealId, mealId)).orderBy(asc(mealItems.sortOrder))).map(toMealItem)
        const updatedMeal = (await tx.update(meals).set(aggregateItems(remaining)).where(eq(meals.id, mealId)).returning())[0]
        return toMeal(updatedMeal, remaining, u.timezone)
      })
    },

    async addWorkout(userId, req, date) {
      const u = await ensureUser(userId)
      const resolvedDate = date ?? localDateKey(new Date(), u.timezone)
      // req.time — явно выбранное юзером локальное время (HH:mm); иначе берём текущее.
      const { time: reqTime, ...rest } = req
      const doneAt = resolveEntryInstant(resolvedDate, u.timezone, reqTime)
      const inserted = await database
        .insert(workouts)
        .values({ telegramId: userId, doneAt, ...rest })
        .returning()
      return toWorkout(inserted[0], u.timezone)
    },

    async deleteWorkout(userId, workoutId) {
      await database.delete(workouts).where(and(eq(workouts.id, workoutId), eq(workouts.telegramId, userId)))
    },

    async setWater(userId, glasses, date) {
      const u = await ensureUser(userId)
      const resolvedDate = date ?? localDateKey(new Date(), u.timezone)
      const clamped = Math.max(0, Math.min(20, Math.round(glasses)))
      await database
        .insert(days).values({ telegramId: userId, date: resolvedDate, water: clamped })
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

    async recentMealTimes(userId, mealType, limit) {
      const rows = await database
        .select({ at: meals.eatenAt })
        .from(meals)
        .where(and(eq(meals.telegramId, userId), eq(meals.mealType, mealType)))
        .orderBy(desc(meals.eatenAt))
        .limit(limit)
      return rows.map((r) => r.at)
    },

    async claimReminder(userId, date, mealType) {
      const inserted = await database
        .insert(mealReminders)
        .values({ telegramId: userId, date, mealType })
        .onConflictDoNothing()
        .returning()
      return inserted.length > 0
    },

    async getOnboardedUserIds() {
      const rows = await database.select({ id: users.telegramId }).from(users).where(eq(users.onboarded, true))
      return rows.map((r) => r.id)
    },
  }
}

async function loadItemsFor(database: Db, mealIds: string[]): Promise<Map<string, MealItem[]>> {
  const map = new Map<string, MealItem[]>()
  if (mealIds.length === 0) return map
  const rows = await database.select().from(mealItems).where(inArray(mealItems.mealId, mealIds)).orderBy(asc(mealItems.sortOrder))
  for (const r of rows) {
    const arr = map.get(r.mealId) ?? []
    arr.push(toMealItem(r))
    map.set(r.mealId, arr)
  }
  return map
}

function toMealItem(r: typeof mealItems.$inferSelect): MealItem {
  return { id: r.id, name: r.name, emoji: r.emoji, grams: r.grams, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat }
}

function toMeal(m: typeof meals.$inferSelect, items: MealItem[], timeZone: string): Meal {
  return {
    id: m.id, name: m.name, emoji: m.emoji, time: formatHHMM(m.eatenAt, timeZone),
    mealType: m.mealType as MealType,
    kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
    items,
  }
}

function toWorkout(w: typeof workouts.$inferSelect, timeZone: string): Workout {
  return {
    id: w.id, name: w.name, emoji: w.emoji, minutes: w.minutes, kcal: w.kcal, time: formatHHMM(w.doneAt, timeZone),
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
    timezone: u.timezone,
  }
}

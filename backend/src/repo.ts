import type {
  DaySummary, Profile, WeekDay, Meal, AddMealRequest, UpdateProfileRequest, FrequentMeal, MealType,
} from '@nyami/shared'
import { computeNorm } from './nutrition.js'

export const WATER_GOAL = 8

/** Тип приёма пищи по часу дня. */
export function mealTypeForHour(h: number): MealType {
  if (h >= 4 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 16 && h < 22) return 'dinner'
  return 'snack'
}

// Абстракция хранилища. Мок (in-memory) и Postgres (Drizzle) реализуют один интерфейс.
export interface NyamiRepo {
  getProfile(userId: number): Promise<Profile>
  isOnboarded(userId: number): Promise<boolean>
  updateProfile(userId: number, req: UpdateProfileRequest): Promise<Profile>
  getToday(userId: number): Promise<DaySummary>
  getWeek(userId: number): Promise<{ days: WeekDay[]; weightSeries: number[] }>
  addMeal(userId: number, meal: AddMealRequest): Promise<Meal>
  deleteMeal(userId: number, mealId: string): Promise<void>
  setWater(userId: number, glasses: number): Promise<number>
  getFrequent(userId: number): Promise<FrequentMeal[]>
}

// Топ часто добавляемых блюд из списка приёмов (группировка по названию).
export function topFrequent(all: { name: string; emoji: string; kcal: number; protein: number; carbs: number; fat: number }[], limit = 6): FrequentMeal[] {
  const byName = new Map<string, { m: FrequentMeal; count: number }>()
  for (const m of all) {
    const cur = byName.get(m.name)
    if (cur) cur.count++
    else byName.set(m.name, { m: { name: m.name, emoji: m.emoji, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat }, count: 1 })
  }
  return [...byName.values()].sort((a, b) => b.count - a.count).slice(0, limit).map((x) => x.m)
}

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Стрик: сколько дней подряд (включая сегодня) есть хотя бы один приём пищи. */
export function computeStreak(dates: Set<string>): number {
  let streak = 0
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  // Если сегодня ещё пусто — стрик считаем от вчера.
  if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

const defaultProfile: Profile = {
  sex: 'male', age: 28, heightCm: 178, weightKg: 82,
  activity: 'medium', goal: 'lose',
  dailyKcal: 1900, protein: 140, fat: 60, carbs: 190,
}

type StoredMeal = Meal & { eatenAt: string }

export function createMockRepo(): NyamiRepo {
  const meals = new Map<number, StoredMeal[]>()
  const water = new Map<number, Map<string, number>>() // userId -> date -> glasses
  const weights = new Map<number, number[]>()
  const profiles = new Map<number, Profile>()
  const onboardedSet = new Set<number>()

  const getMeals = (u: number) => {
    if (!meals.has(u)) meals.set(u, [])
    return meals.get(u)!
  }
  const getProfileFor = (u: number) => profiles.get(u) ?? defaultProfile

  return {
    async getProfile(u) {
      return getProfileFor(u)
    },

    async isOnboarded(u) {
      return onboardedSet.has(u)
    },

    async updateProfile(u, req) {
      const norm = computeNorm(req)
      const p: Profile = { ...req, ...norm }
      profiles.set(u, p)
      onboardedSet.add(u)
      const w = weights.get(u) ?? []
      w.push(req.weightKg)
      weights.set(u, w)
      return p
    },

    async getToday(u) {
      const list = getMeals(u).filter((m) => m.eatenAt?.slice(0, 10) === todayKey())
      const sum = (k: keyof Meal) => list.reduce((s, m) => s + (Number(m[k]) || 0), 0)
      const p = getProfileFor(u)
      const dates = new Set(getMeals(u).map((m) => m.eatenAt!.slice(0, 10)))
      return {
        date: todayKey(),
        eatenKcal: sum('kcal'),
        goalKcal: p.dailyKcal,
        macros: {
          protein: { eaten: sum('protein'), goal: p.protein },
          fat: { eaten: sum('fat'), goal: p.fat },
          carbs: { eaten: sum('carbs'), goal: p.carbs },
        },
        water: { done: water.get(u)?.get(todayKey()) ?? 0, goal: WATER_GOAL },
        streak: computeStreak(dates),
        meals: list.map(stripInternal),
      }
    },

    async getWeek(u) {
      const p = getProfileFor(u)
      const byDay = new Map<string, number>()
      for (const m of getMeals(u)) byDay.set(m.eatenAt!.slice(0, 10), (byDay.get(m.eatenAt!.slice(0, 10)) ?? 0) + m.kcal)
      const days = lastSevenDays(byDay, p.dailyKcal)
      const w = weights.get(u) ?? []
      return { days, weightSeries: w.length ? w.slice(-7) : [p.weightKg] }
    },

    async addMeal(u, req) {
      const now = new Date()
      const meal: StoredMeal = {
        id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        time: hhmm(now),
        mealType: mealTypeForHour(now.getHours()),
        eatenAt: now.toISOString(),
        ...req,
      }
      getMeals(u).push(meal)
      return stripInternal(meal)
    },

    async deleteMeal(u, mealId) {
      meals.set(u, getMeals(u).filter((m) => m.id !== mealId))
    },

    async setWater(u, glasses) {
      const clamped = Math.max(0, Math.min(20, Math.round(glasses)))
      if (!water.has(u)) water.set(u, new Map())
      water.get(u)!.set(todayKey(), clamped)
      return clamped
    },

    async getFrequent(u) {
      return topFrequent(getMeals(u))
    },
  }
}

// В моке храним eatenAt как служебное поле; наружу отдаём чистый Meal.
function stripInternal(m: StoredMeal): Meal {
  const { eatenAt: _drop, ...rest } = m
  void _drop
  return rest
}

export function lastSevenDays(byDay: Map<string, number>, norm: number): WeekDay[] {
  const days: WeekDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const kcal = byDay.get(key) ?? 0
    days.push({ label: WEEKDAY_RU[d.getDay()], kcal, over: kcal > norm, today: i === 0 })
  }
  return days
}

export function hhmm(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

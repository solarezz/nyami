import type {
  DaySummary, Profile, WeekDay, Meal, MealItem, AddMealRequest, UpdateProfileRequest, FrequentMeal, MealType, UpdateFastingRequest,
  Workout, AddWorkoutRequest,
} from '@nyami/shared'
import { computeNorm } from './nutrition.js'
import { localDateKey, addDaysToDateStr, localHour, formatHHMM, zonedTimeToUtc, DEFAULT_TIMEZONE } from './tz.js'

export const WATER_GOAL = 8
export { DEFAULT_TIMEZONE }

/** Тип приёма пищи по часу дня (локальному часу пользователя). */
export function mealTypeForHour(h: number): MealType {
  if (h >= 4 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 16 && h < 22) return 'dinner'
  return 'snack'
}

/**
 * UTC-инстант для записи приёма/тренировки: явное время (HH:mm, с пикера) —
 * всегда в локальном времени пользователя; без явного времени и для сегодняшней
 * локальной даты — «сейчас»; без явного времени для прошлой даты — текущее
 * локальное время суток, применённое к выбранной дате (чтобы не писать 00:00).
 */
export function resolveEntryInstant(date: string, timeZone: string, explicitHHMM?: string): Date {
  if (explicitHHMM && /^\d{2}:\d{2}$/.test(explicitHHMM)) return zonedTimeToUtc(date, explicitHHMM, timeZone)
  const now = new Date()
  if (date === localDateKey(now, timeZone)) return now
  return zonedTimeToUtc(date, formatHHMM(now, timeZone), timeZone)
}

type ItemNutrients = { kcal: number; protein: number; carbs: number; fat: number }

/** Сумма КБЖУ по компонентам приёма — единственный источник истины для агрегата meal.*. */
export function aggregateItems(items: ItemNutrients[]): ItemNutrients {
  return items.reduce(
    (s, i) => ({ kcal: s.kcal + i.kcal, protein: s.protein + i.protein, carbs: s.carbs + i.carbs, fat: s.fat + i.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

/** Пропорциональный пересчёт КБЖУ компонента при изменении массы (по плотности текущего значения). */
export function rescaleItem<T extends { grams: number } & ItemNutrients>(item: T, newGrams: number): T {
  const grams = Math.max(1, Math.round(newGrams * 10) / 10)
  const scale = item.grams > 0 ? grams / item.grams : 1
  return {
    ...item,
    grams,
    kcal: Math.max(0, Math.round(item.kcal * scale)),
    protein: Math.max(0, Math.round(item.protein * scale)),
    carbs: Math.max(0, Math.round(item.carbs * scale)),
    fat: Math.max(0, Math.round(item.fat * scale)),
  }
}

/** Бросается при попытке удалить последний (единственный) компонент приёма. */
export class LastItemError extends Error {
  constructor() { super('last_item') }
}

// Абстракция хранилища. Мок (in-memory) и Postgres (Drizzle) реализуют один интерфейс.
export interface NyamiRepo {
  getProfile(userId: number): Promise<Profile>
  isOnboarded(userId: number): Promise<boolean>
  updateProfile(userId: number, req: UpdateProfileRequest): Promise<Profile>
  setFasting(userId: number, req: UpdateFastingRequest): Promise<Profile>
  /** Сводка за конкретный день (date = YYYY-MM-DD, локальная дата пользователя). Без даты — сегодня. */
  getDay(userId: number, date?: string): Promise<DaySummary>
  getWeek(userId: number): Promise<{ days: WeekDay[]; weightSeries: number[] }>
  addMeal(userId: number, meal: AddMealRequest, date?: string): Promise<Meal>
  deleteMeal(userId: number, mealId: string): Promise<void>
  /** Изменить массу одного компонента приёма (остальные КБЖУ компонента — пропорционально). Бросает LastItemError, если это удаление последнего. */
  updateMealItem(userId: number, mealId: string, itemId: string, grams: number): Promise<Meal>
  /** Удалить один компонент приёма. Бросает LastItemError для единственного компонента — удаляйте весь приём через deleteMeal. */
  deleteMealItem(userId: number, mealId: string, itemId: string): Promise<Meal>
  addWorkout(userId: number, workout: AddWorkoutRequest, date?: string): Promise<Workout>
  deleteWorkout(userId: number, workoutId: string): Promise<void>
  /** Последние по времени приёмы данного типа (для расчёта личного среднего времени). */
  recentMealTimes(userId: number, mealType: MealType, limit: number): Promise<Date[]>
  /** Атомарно «застолбить» отправку напоминания на день+тип. false — уже отправляли. */
  claimReminder(userId: number, date: string, mealType: MealType): Promise<boolean>
  setWater(userId: number, glasses: number, date?: string): Promise<number>
  /** Записать замер веса; возвращает последние 7 замеров (weightSeries). */
  setWeight(userId: number, weightKg: number): Promise<number[]>
  getFrequent(userId: number): Promise<FrequentMeal[]>
  /** ID всех прошедших онбординг пользователей — для рассылок. */
  getOnboardedUserIds(): Promise<number[]>
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

/** Стрик: сколько дней подряд (включая сегодня, локальная дата пользователя) есть хотя бы один приём пищи. */
export function computeStreak(dates: Set<string>, timeZone: string): number {
  let streak = 0
  let d = localDateKey(new Date(), timeZone)
  // Если сегодня ещё пусто — стрик считаем от вчера.
  if (!dates.has(d)) d = addDaysToDateStr(d, -1)
  while (dates.has(d)) {
    streak++
    d = addDaysToDateStr(d, -1)
  }
  return streak
}

const defaultProfile: Profile = {
  sex: 'male', age: 28, heightCm: 178, weightKg: 82,
  activity: 'medium', goal: 'lose',
  dailyKcal: 1900, protein: 140, fat: 60, carbs: 190,
  fastingProtocol: 'off', eatStartHour: 12,
  timezone: DEFAULT_TIMEZONE,
}

type StoredMeal = Meal & { eatenAt: string }
type StoredWorkout = Workout & { doneAt: string }

export function createMockRepo(): NyamiRepo {
  const meals = new Map<number, StoredMeal[]>()
  const workouts = new Map<number, StoredWorkout[]>()
  const water = new Map<number, Map<string, number>>() // userId -> date -> glasses
  const weights = new Map<number, number[]>()
  const profiles = new Map<number, Profile>()
  const onboardedSet = new Set<number>()
  const remindersSent = new Map<number, Set<string>>() // userId -> {`date:mealType`}
  // userId -> date -> снимок цели на эту дату (версионирование, как и в Postgres-репо).
  const dailyTargets = new Map<number, Map<string, { calories: number; protein: number; fat: number; carbs: number }>>()

  const getMeals = (u: number) => {
    if (!meals.has(u)) meals.set(u, [])
    return meals.get(u)!
  }
  const getWorkouts = (u: number) => {
    if (!workouts.has(u)) workouts.set(u, [])
    return workouts.get(u)!
  }
  const getProfileFor = (u: number) => profiles.get(u) ?? defaultProfile

  // Цель на дату: последний снимок с date <= запрошенной, иначе — текущий профиль (фолбэк).
  const getTargetFor = (u: number, date: string) => {
    const p = getProfileFor(u)
    const byDate = dailyTargets.get(u)
    if (!byDate) return { calories: p.dailyKcal, protein: p.protein, fat: p.fat, carbs: p.carbs }
    let best: { calories: number; protein: number; fat: number; carbs: number } | null = null
    let bestDate = ''
    for (const [d, t] of byDate) {
      if (d <= date && d > bestDate) { best = t; bestDate = d }
    }
    return best ?? { calories: p.dailyKcal, protein: p.protein, fat: p.fat, carbs: p.carbs }
  }

  return {
    async getProfile(u) {
      return getProfileFor(u)
    },

    async isOnboarded(u) {
      return onboardedSet.has(u)
    },

    async updateProfile(u, req) {
      const norm = computeNorm(req)
      const prev = getProfileFor(u)
      const p: Profile = { ...prev, ...req, ...norm, timezone: req.timezone ?? prev.timezone }
      profiles.set(u, p)
      onboardedSet.add(u)
      const w = weights.get(u) ?? []
      w.push(req.weightKg)
      weights.set(u, w)
      if (!dailyTargets.has(u)) dailyTargets.set(u, new Map())
      dailyTargets.get(u)!.set(localDateKey(new Date(), p.timezone), { calories: norm.dailyKcal, protein: norm.protein, fat: norm.fat, carbs: norm.carbs })
      return p
    },

    async setFasting(u, req) {
      const p: Profile = { ...getProfileFor(u), fastingProtocol: req.protocol, eatStartHour: req.eatStartHour }
      profiles.set(u, p)
      return p
    },

    async getDay(u, date) {
      const p = getProfileFor(u)
      const resolvedDate = date ?? localDateKey(new Date(), p.timezone)
      const all = getMeals(u)
      const localKey = (iso: string) => localDateKey(new Date(iso), p.timezone)
      const list = all.filter((m) => localKey(m.eatenAt) === resolvedDate)
      const sum = (k: keyof Meal) => list.reduce((s, m) => s + (Number(m[k]) || 0), 0)
      const dates = new Set(all.map((m) => localKey(m.eatenAt)))
      const wkList = getWorkouts(u).filter((w) => localKey(w.doneAt) === resolvedDate)
      const target = getTargetFor(u, resolvedDate)
      return {
        date: resolvedDate,
        eatenKcal: sum('kcal'),
        goalKcal: target.calories,
        burnedKcal: wkList.reduce((s, w) => s + w.kcal, 0),
        macros: {
          protein: { eaten: sum('protein'), goal: target.protein },
          fat: { eaten: sum('fat'), goal: target.fat },
          carbs: { eaten: sum('carbs'), goal: target.carbs },
        },
        water: { done: water.get(u)?.get(resolvedDate) ?? 0, goal: WATER_GOAL },
        streak: computeStreak(dates, p.timezone),
        meals: list.map(stripInternal),
        workouts: wkList.map(stripWorkout),
      }
    },

    async getWeek(u) {
      const p = getProfileFor(u)
      const byDay = new Map<string, number>()
      for (const m of getMeals(u)) {
        const key = localDateKey(new Date(m.eatenAt), p.timezone)
        byDay.set(key, (byDay.get(key) ?? 0) + m.kcal)
      }
      const days = lastSevenDays(byDay, p.dailyKcal, p.timezone)
      const w = weights.get(u) ?? []
      return { days, weightSeries: w.length ? w.slice(-7) : [p.weightKg] }
    },

    async addMeal(u, req, date) {
      const p = getProfileFor(u)
      const resolvedDate = date ?? localDateKey(new Date(), p.timezone)
      const when = resolveEntryInstant(resolvedDate, p.timezone)
      const eatenAt = when.toISOString()
      const items: MealItem[] = req.items.map((it, i) => ({ id: `mi${Date.now()}${i}${Math.random().toString(36).slice(2, 6)}`, ...it }))
      const agg = aggregateItems(items)
      const meal: StoredMeal = {
        id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        time: formatHHMM(when, p.timezone),
        eatenAt,
        name: req.name,
        emoji: req.emoji,
        items,
        ...agg,
        // Тип из запроса приоритетнее; если не задан — определяем по локальному часу.
        mealType: req.mealType ?? mealTypeForHour(localHour(when, p.timezone)),
      }
      getMeals(u).push(meal)
      return stripInternal(meal)
    },

    async deleteMeal(u, mealId) {
      meals.set(u, getMeals(u).filter((m) => m.id !== mealId))
    },

    async updateMealItem(u, mealId, itemId, grams) {
      const list = getMeals(u)
      const meal = list.find((m) => m.id === mealId)
      if (!meal) throw new Error('not_found')
      const idx = meal.items.findIndex((it) => it.id === itemId)
      if (idx < 0) throw new Error('not_found')
      meal.items[idx] = rescaleItem(meal.items[idx], grams)
      Object.assign(meal, aggregateItems(meal.items))
      return stripInternal(meal)
    },

    async deleteMealItem(u, mealId, itemId) {
      const list = getMeals(u)
      const meal = list.find((m) => m.id === mealId)
      if (!meal) throw new Error('not_found')
      if (meal.items.length <= 1) throw new LastItemError()
      meal.items = meal.items.filter((it) => it.id !== itemId)
      Object.assign(meal, aggregateItems(meal.items))
      return stripInternal(meal)
    },

    async addWorkout(u, req, date) {
      const p = getProfileFor(u)
      const resolvedDate = date ?? localDateKey(new Date(), p.timezone)
      // req.time — явно выбранное юзером локальное время (HH:mm); иначе берём текущее.
      const { time: reqTime, ...rest } = req
      const when = resolveEntryInstant(resolvedDate, p.timezone, reqTime)
      const doneAt = when.toISOString()
      const w: StoredWorkout = {
        id: `w${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        time: formatHHMM(when, p.timezone),
        doneAt,
        ...rest,
      }
      getWorkouts(u).push(w)
      return stripWorkout(w)
    },

    async deleteWorkout(u, workoutId) {
      workouts.set(u, getWorkouts(u).filter((w) => w.id !== workoutId))
    },

    async setWater(u, glasses, date) {
      const p = getProfileFor(u)
      const resolvedDate = date ?? localDateKey(new Date(), p.timezone)
      const clamped = Math.max(0, Math.min(20, Math.round(glasses)))
      if (!water.has(u)) water.set(u, new Map())
      water.get(u)!.set(resolvedDate, clamped)
      return clamped
    },

    async setWeight(u, weightKg) {
      const w = weights.get(u) ?? []
      w.push(weightKg)
      weights.set(u, w)
      return w.slice(-7)
    },

    async getFrequent(u) {
      return topFrequent(getMeals(u))
    },

    async recentMealTimes(u, mealType, limit) {
      return getMeals(u)
        .filter((m) => m.mealType === mealType)
        .sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))
        .slice(0, limit)
        .map((m) => new Date(m.eatenAt))
    },

    async claimReminder(u, date, mealType) {
      const key = `${date}:${mealType}`
      if (!remindersSent.has(u)) remindersSent.set(u, new Set())
      const set = remindersSent.get(u)!
      if (set.has(key)) return false
      set.add(key)
      return true
    },

    async getOnboardedUserIds() {
      return [...onboardedSet]
    },
  }
}

// В моке храним eatenAt как служебное поле; наружу отдаём чистый Meal.
function stripInternal(m: StoredMeal): Meal {
  const { eatenAt: _drop, ...rest } = m
  void _drop
  return rest
}

function stripWorkout(w: StoredWorkout): Workout {
  const { doneAt: _drop, ...rest } = w
  void _drop
  return rest
}

/** Калории по дням за последние 7 локальных суток пользователя (timeZone). */
export function lastSevenDays(byDay: Map<string, number>, norm: number, timeZone: string): WeekDay[] {
  const days: WeekDay[] = []
  const today = localDateKey(new Date(), timeZone)
  for (let i = 6; i >= 0; i--) {
    const key = addDaysToDateStr(today, -i)
    const kcal = byDay.get(key) ?? 0
    // День недели — свойство самой календарной даты, не зависит от часового пояса отображения.
    const weekday = new Date(`${key}T00:00:00.000Z`).getUTCDay()
    days.push({ label: WEEKDAY_RU[weekday], kcal, over: kcal > norm, today: i === 0 })
  }
  return days
}

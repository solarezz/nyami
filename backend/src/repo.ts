import type { DaySummary, Profile, WeekDay, Meal, AddMealRequest } from '@nyami/shared'

// Абстракция хранилища. Сейчас — in-memory мок; позже подменим на PostgreSQL (Drizzle),
// не трогая роуты.
export interface NyamiRepo {
  getProfile(userId: number): Promise<Profile>
  getToday(userId: number): Promise<DaySummary>
  getWeek(userId: number): Promise<{ days: WeekDay[]; weightSeries: number[] }>
  addMeal(userId: number, meal: AddMealRequest): Promise<Meal>
}

const baseProfile: Profile = {
  sex: 'male', age: 28, heightCm: 178, weightKg: 82,
  activity: 'medium', goal: 'lose',
  dailyKcal: 1900, protein: 140, fat: 60, carbs: 190,
}

function seedMeals(): Meal[] {
  return [
    { id: 'm1', name: 'Омлет с овощами', emoji: '🍳', time: '08:20', kcal: 380, protein: 24, carbs: 8, fat: 26 },
    { id: 'm2', name: 'Куриный салат', emoji: '🥗', time: '13:40', kcal: 620, protein: 42, carbs: 18, fat: 40 },
    { id: 'm3', name: 'Яблоко + орехи', emoji: '🍎', time: '16:10', kcal: 240, protein: 6, carbs: 24, fat: 14 },
  ]
}

export function createMockRepo(): NyamiRepo {
  // Хранилище приёмов пищи по пользователю (живёт в памяти процесса).
  const mealsByUser = new Map<number, Meal[]>()

  const getMeals = (userId: number): Meal[] => {
    if (!mealsByUser.has(userId)) mealsByUser.set(userId, seedMeals())
    return mealsByUser.get(userId)!
  }

  return {
    async getProfile() {
      return baseProfile
    },

    async getToday(userId) {
      const meals = getMeals(userId)
      const sum = (k: keyof Meal) => meals.reduce((s, m) => s + (m[k] as number), 0)
      const eaten = sum('kcal')
      return {
        date: new Date().toISOString().slice(0, 10),
        eatenKcal: eaten,
        goalKcal: baseProfile.dailyKcal,
        macros: {
          protein: { eaten: sum('protein'), goal: baseProfile.protein },
          fat: { eaten: sum('fat'), goal: baseProfile.fat },
          carbs: { eaten: sum('carbs'), goal: baseProfile.carbs },
        },
        water: { done: 5, goal: 8 },
        streak: 6,
        meals,
      }
    },

    async getWeek() {
      return {
        days: [
          { label: 'Пн', kcal: 1720, over: false },
          { label: 'Вт', kcal: 1490, over: false },
          { label: 'Ср', kcal: 2180, over: true },
          { label: 'Чт', kcal: 1660, over: false },
          { label: 'Пт', kcal: 1580, over: false },
          { label: 'Сб', kcal: 2050, over: true },
          { label: 'Вс', kcal: 1240, over: false, today: true },
        ],
        weightSeries: [84.0, 83.6, 83.2, 82.9, 82.5, 82.2, 82.0],
      }
    },

    async addMeal(userId, req) {
      const meals = getMeals(userId)
      const meal: Meal = {
        id: `m${Date.now()}`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        ...req,
      }
      meals.push(meal)
      return meal
    },
  }
}

// Доменные типы Nyami. Общие для фронта и бэка (пакет @nyami/shared).

export type MacroKey = 'protein' | 'fat' | 'carbs'

export interface MacroProgress {
  eaten: number
  goal: number
}

export interface Meal {
  id: string
  name: string
  emoji: string
  time: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface DaySummary {
  date: string
  eatenKcal: number
  goalKcal: number
  macros: Record<MacroKey, MacroProgress>
  water: { done: number; goal: number }
  streak: number
  meals: Meal[]
}

export interface Profile {
  sex: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  activity: 'low' | 'medium' | 'high'
  goal: 'lose' | 'maintain' | 'gain'
  dailyKcal: number
  protein: number
  fat: number
  carbs: number
}

export interface WeekDay {
  label: string
  kcal: number
  over: boolean
  today?: boolean
}

export interface ChatMessage {
  id: string
  role: 'coach' | 'user'
  text: string
}

/** Результат распознавания еды нейросетью (черновик перед добавлением). */
export interface Recognition {
  name: string
  emoji: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  confidence: number // 0..1, погрешность оценки
  extras: { name: string; emoji: string; grams: number; kcal: number }[]
}

// ---- Контракты API (запрос/ответ) ----

export interface MeResponse {
  user: { id: number; firstName?: string; username?: string }
  profile: Profile
}

export interface AddMealRequest {
  name: string
  emoji: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface RecognizeRequest {
  text?: string
  imageBase64?: string
}

export interface CoachRequest {
  message: string
}

export interface CoachResponse {
  reply: string
}

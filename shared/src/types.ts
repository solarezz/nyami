// Доменные типы Nyami. Общие для фронта и бэка (пакет @nyami/shared).

export type MacroKey = 'protein' | 'fat' | 'carbs'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FastingProtocol = 'off' | '16:8' | '18:6' | '20:4' | 'omad'

export interface MacroProgress {
  eaten: number
  goal: number
}

export interface Meal {
  id: string
  name: string
  emoji: string
  time: string
  mealType: MealType
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Workout {
  id: string
  name: string
  emoji: string
  minutes: number
  kcal: number // сожжено
  time: string
}

export interface DaySummary {
  date: string
  eatenKcal: number
  goalKcal: number
  burnedKcal: number // сожжено на тренировках — увеличивает остаток
  macros: Record<MacroKey, MacroProgress>
  water: { done: number; goal: number }
  streak: number
  meals: Meal[]
  workouts: Workout[]
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
  fastingProtocol: FastingProtocol
  eatStartHour: number // час начала окна еды (0–23)
}

export interface UpdateFastingRequest {
  protocol: FastingProtocol
  eatStartHour: number
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
  onboarded: boolean
}

/** Данные из онбординга / редактирования профиля (норма считается на сервере). */
export interface UpdateProfileRequest {
  sex: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  activity: 'low' | 'medium' | 'high'
  goal: 'lose' | 'maintain' | 'gain'
}

export interface AddMealRequest {
  name: string
  emoji: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface AddWorkoutRequest {
  name: string
  emoji: string
  minutes: number
  kcal: number
}

export interface RecognizeWorkoutRequest {
  text: string
}

/** Оценка тренировки ИИ (черновик перед добавлением). */
export interface WorkoutRecognition {
  name: string
  emoji: string
  minutes: number
  kcal: number // сожжено
  confidence: number // 0..1
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

/** Часто добавляемое блюдо (из истории пользователя). */
export interface FrequentMeal {
  name: string
  emoji: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

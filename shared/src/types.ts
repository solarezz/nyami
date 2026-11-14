// Доменные типы Nyami. Общие для фронта и бэка (пакет @nyami/shared).

export type MacroKey = 'protein' | 'fat' | 'carbs'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FastingProtocol = 'off' | '16:8' | '18:6' | '20:4' | 'omad'

export interface MacroProgress {
  eaten: number
  goal: number
}

/** Компонент приёма пищи (ингредиент/добавка) — независимо масштабируется по массе. */
export interface MealItem {
  id: string
  name: string
  emoji: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Meal {
  id: string
  name: string
  emoji: string
  time: string
  mealType: MealType
  // Агрегат по items (сумма) — хранится отдельно для быстрого доступа, но всегда
  // пересчитывается из items при любом изменении состава.
  kcal: number
  protein: number
  carbs: number
  fat: number
  items: MealItem[]
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
  timezone: string // IANA, напр. "Europe/Moscow" — определяется на фронте, можно сменить в профиле
  remindersEnabled: boolean // напоминания о приёмах пищи и еженедельный отчёт в Telegram
}

export interface UpdateFastingRequest {
  protocol: FastingProtocol
  eatStartHour: number
}

export interface UpdateNotificationsRequest {
  remindersEnabled: boolean
}

/** Запись замера веса (за сейчас; попадает в weightSeries). */
export interface SetWeightRequest {
  weightKg: number
}

export interface SetWeightResponse {
  weightSeries: number[]
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

/** Дополнительный компонент, распознанный вместе с основным блюдом (гарнир, хлеб, соус). */
export interface RecognizedExtra {
  name: string
  emoji: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
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
  extras: RecognizedExtra[]
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
  timezone?: string // IANA; если не передан — сервер оставляет текущее значение
}

/** Компонент в составе добавляемого приёма пищи (без id — назначается сервером). */
export interface MealItemInput {
  name: string
  emoji: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface AddMealRequest {
  name: string
  emoji: string
  mealType?: MealType // если задан — приём идёт в эту категорию; иначе определяется по времени
  items: MealItemInput[] // минимум один компонент; kcal/БЖУ приёма = сумма по items
}

/** Изменение массы одного компонента приёма — остальные КБЖУ компонента пересчитываются пропорционально. */
export interface UpdateMealItemRequest {
  grams: number
}

export interface AddWorkoutRequest {
  name: string
  emoji: string
  minutes: number
  kcal: number
  time?: string // HH:mm — если не задано, берётся текущее время
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

// ---- Тренировочный модуль (силовые тренировки по программе) ----

export type ExerciseDifficulty = 'easy' | 'medium' | 'hard'

export interface Exercise {
  id: string
  name: string
  description: string | null
  muscleGroup: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string | null
  equipmentPhotoUrl: string | null
  techniqueVideoUrl: string | null
  difficulty: ExerciseDifficulty
}

export interface ExerciseLastPerformance {
  weightKg: number | null
  repetitions: number | null
  performedAt: string // ISO
}

export interface PersonalRecord {
  weightKg: number
  repetitions: number
}

/** Полная карточка упражнения — для экрана с фото/анимацией/мышцами/заменой. */
export interface ExerciseDetail extends Exercise {
  lastPerformance: ExerciseLastPerformance | null
  personalRecord: PersonalRecord | null
  substitutes: Exercise[]
}

export interface ProgramExercise {
  id: string // id строки training_program_exercises
  exercise: Exercise
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  restSeconds: number
}

export interface ProgramDay {
  id: string
  name: string
  weekday: number | null // 1 (пн) .. 7 (вс), null если не привязан к дню недели
  exercises: ProgramExercise[]
}

export interface TrainingProgram {
  id: string
  name: string
  description: string | null
  isTemplate: boolean
  days: ProgramDay[]
}

export type TrainingSessionStatus = 'in_progress' | 'completed' | 'cancelled'

export interface ExerciseSetRecord {
  id: string
  exerciseId: string
  setNumber: number
  weightKg: number | null
  repetitions: number | null
  completed: boolean
}

export interface TrainingSession {
  id: string
  programId: string | null
  programDayId: string | null
  name: string
  startedAt: string
  completedAt: string | null
  status: TrainingSessionStatus
  sets: ExerciseSetRecord[]
}

export interface StartSessionRequest {
  programId?: string
  programDayId?: string
  name: string
}

export interface RecordSetRequest {
  exerciseId: string
  setNumber: number
  weightKg?: number
  repetitions?: number
  completed?: boolean
}

/**
 * Адаптивное расписание тренировок — выведено из фактической истории сессий
 * (аналогично личному среднему времени приёма пищи), не настраивается вручную.
 */
export interface TrainingPattern {
  typicalWeekdays: number[] // подмножество 1..7 — дни, когда пользователь обычно тренируется
  typicalTimeOfDay: 'morning' | 'afternoon' | 'evening' | null
  sampleSize: number // сколько завершённых тренировок учтено
}

/** Агрегаты по завершённым тренировкам за период — для экрана «Прогресс». */
export interface TrainingStats {
  sessionsCount: number
  completedSets: number
  totalVolumeKg: number // сумма вес×повторы по завершённым подходам
  totalMinutes: number
}

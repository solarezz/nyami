import { pgTable, bigint, text, integer, real, timestamp, uuid, boolean, primaryKey } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  telegramId: bigint('telegram_id', { mode: 'number' }).primaryKey(),
  firstName: text('first_name'),
  username: text('username'),
  sex: text('sex').notNull().default('male'),
  age: integer('age').notNull().default(28),
  heightCm: integer('height_cm').notNull().default(178),
  weightKg: real('weight_kg').notNull().default(82),
  activity: text('activity').notNull().default('medium'),
  goal: text('goal').notNull().default('lose'),
  dailyKcal: integer('daily_kcal').notNull().default(1900),
  protein: integer('protein').notNull().default(140),
  fat: integer('fat').notNull().default(60),
  carbs: integer('carbs').notNull().default(190),
  streak: integer('streak').notNull().default(0),
  onboarded: boolean('onboarded').notNull().default(false),
  fastingProtocol: text('fasting_protocol').notNull().default('off'),
  eatStartHour: integer('eat_start_hour').notNull().default(12),
  timezone: text('timezone').notNull().default('Europe/Moscow'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Снимок дневной цели (ккал/БЖУ) на конкретную дату — чтобы смена цели в профиле не
// переписывала задним числом то, что показывается для прошлых дней. PK — пользователь + дата.
export const dailyTargets = pgTable('daily_targets', {
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  date: text('date').notNull(), // локальная дата пользователя (его timezone), YYYY-MM-DD
  calories: integer('calories').notNull(),
  protein: integer('protein').notNull(),
  fat: integer('fat').notNull(),
  carbs: integer('carbs').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.telegramId, t.date] }) }))

// Вода по дням (стаканы). PK — пользователь + дата.
export const days = pgTable('days', {
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  date: text('date').notNull(), // YYYY-MM-DD
  water: integer('water').notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.telegramId, t.date] }) }))

// Замеры веса.
export const weights = pgTable('weights', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  weightKg: real('weight_kg').notNull(),
  at: timestamp('at').notNull().defaultNow(),
})

// Факт отправки напоминания о пропущенном приёме пищи. Не даёт слать дважды за
// день+тип (важно при частых передеплоях — cron не должен задублировать сообщение).
export const mealReminders = pgTable('meal_reminders', {
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  date: text('date').notNull(), // YYYY-MM-DD (UTC, как и days)
  mealType: text('meal_type').notNull(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.telegramId, t.date, t.mealType] }) }))

// Тренировки: сожжённые калории (замена шагам). Оценивает ИИ по описанию.
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('🏃'),
  minutes: integer('minutes').notNull().default(0),
  kcal: integer('kcal').notNull(),
  doneAt: timestamp('done_at').notNull().defaultNow(),
})

export const meals = pgTable('meals', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('🍽️'),
  // Агрегат по meal_items (сумма) — кэш для быстрого чтения, источник истины — meal_items.
  kcal: integer('kcal').notNull(),
  protein: integer('protein').notNull().default(0),
  carbs: integer('carbs').notNull().default(0),
  fat: integer('fat').notNull().default(0),
  mealType: text('meal_type').notNull().default('snack'),
  eatenAt: timestamp('eaten_at').notNull().defaultNow(),
})

// Компоненты приёма пищи (ингредиенты/добавки) — каждый со своей массой и КБЖУ,
// независимо масштабируемый. meals.kcal/protein/carbs/fat — сумма по этим строкам.
export const mealItems = pgTable('meal_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  mealId: uuid('meal_id').notNull().references(() => meals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('🍽️'),
  grams: real('grams').notNull(),
  kcal: integer('kcal').notNull(),
  protein: integer('protein').notNull().default(0),
  carbs: integer('carbs').notNull().default(0),
  fat: integer('fat').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
})

// ===== Тренировочный модуль (силовые тренировки по программе). =====
// `workouts` выше остаётся отдельным путём для кардио/AI-оценки калорий — не трогаем.

// Библиотека упражнений. Фото/видео — внешние URL (без своего файлового хранилища на этом этапе).
export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  muscleGroup: text('muscle_group').notNull(), // основная категория для списков/фильтров
  primaryMuscles: text('primary_muscles').array().notNull().default([]),
  secondaryMuscles: text('secondary_muscles').array().notNull().default([]),
  equipment: text('equipment'),
  equipmentPhotoUrl: text('equipment_photo_url'),
  techniqueVideoUrl: text('technique_video_url'),
  difficulty: text('difficulty').notNull().default('medium'),
  isSystem: boolean('is_system').notNull().default(true),
  createdByUserId: bigint('created_by_user_id', { mode: 'number' }).references(() => users.telegramId),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Чем заменить упражнение (напр. нет нужного тренажёра в зале). Направленная связь,
// при показе читаем в обе стороны — пара должна быть взаимной по смыслу.
export const exerciseSubstitutes = pgTable('exercise_substitutes', {
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
  substituteExerciseId: uuid('substitute_exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.exerciseId, t.substituteExerciseId] }) }))

// Программа тренировок. user_id = null → системный шаблон (Full Body, PPL и т.п.).
export const trainingPrograms = pgTable('training_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.telegramId),
  name: text('name').notNull(),
  description: text('description'),
  isTemplate: boolean('is_template').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// День программы (напр. "День 2 · Pull"). weekday — если жёстко привязан к дню недели;
// null — пользователь выбирает день сам, тогда ленту недели подсвечивает адаптивное
// расписание (по фактической истории training_sessions), а не этот столбец.
export const trainingProgramDays = pgTable('training_program_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => trainingPrograms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  weekday: integer('weekday'), // 1 (пн) .. 7 (вс), nullable
  sortOrder: integer('sort_order').notNull().default(0),
})

export const trainingProgramExercises = pgTable('training_program_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  programDayId: uuid('program_day_id').notNull().references(() => trainingProgramDays.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  sortOrder: integer('sort_order').notNull().default(0),
  targetSets: integer('target_sets').notNull().default(3),
  targetRepsMin: integer('target_reps_min').notNull().default(8),
  targetRepsMax: integer('target_reps_max').notNull().default(12),
  restSeconds: integer('rest_seconds').notNull().default(90),
})

// Тренировочная сессия — запуск тренировки (по программе или свободная).
export const trainingSessions = pgTable('training_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().references(() => users.telegramId),
  programId: uuid('program_id').references(() => trainingPrograms.id),
  programDayId: uuid('program_day_id').references(() => trainingProgramDays.id),
  name: text('name').notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  status: text('status').notNull().default('in_progress'), // in_progress | completed | cancelled
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Один подход одного упражнения внутри сессии.
export const exerciseSets = pgTable('exercise_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingSessionId: uuid('training_session_id').notNull().references(() => trainingSessions.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  setNumber: integer('set_number').notNull(),
  weightKg: real('weight_kg'),
  repetitions: integer('repetitions'),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

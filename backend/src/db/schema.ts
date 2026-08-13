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
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

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
  kcal: integer('kcal').notNull(),
  protein: integer('protein').notNull().default(0),
  carbs: integer('carbs').notNull().default(0),
  fat: integer('fat').notNull().default(0),
  mealType: text('meal_type').notNull().default('snack'),
  eatenAt: timestamp('eaten_at').notNull().defaultNow(),
})

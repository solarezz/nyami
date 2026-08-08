import { pgTable, bigint, text, integer, real, timestamp, uuid } from 'drizzle-orm/pg-core'

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
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  eatenAt: timestamp('eaten_at').notNull().defaultNow(),
})

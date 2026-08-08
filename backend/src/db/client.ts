import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.js'
import { config } from '../config.js'

// Клиент создаётся только если задан DATABASE_URL. Иначе работаем на мок-репозитории.
const sql = config.databaseUrl ? postgres(config.databaseUrl) : null
export const db = sql ? drizzle(sql, { schema }) : null
export type Db = NonNullable<typeof db>

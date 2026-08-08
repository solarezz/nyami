import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { registerRoutes } from './routes.js'
import { createMockRepo } from './repo.js'
import { createDrizzleRepo } from './db/repo.js'

const app = Fastify({
  logger: true,
  bodyLimit: 8 * 1024 * 1024, // до 8 МБ — под base64 фото
})

await app.register(cors, {
  origin: config.webOrigin,
  credentials: true,
})

const repo = config.databaseUrl ? createDrizzleRepo() : createMockRepo()
registerRoutes(app, repo)

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`AI-провайдер: ${config.aiProvider} | хранилище: ${config.databaseUrl ? 'postgres' : 'in-memory mock'}`)
  if (!config.isProduction) {
    app.log.warn('DEV-режим: без валидного Telegram initData используется тестовый юзер.')
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

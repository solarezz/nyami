import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
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

// В проде тот же сервер отдаёт собранный фронт (frontend/dist). В dev его нет — фронт крутит Vite.
const staticDir = fileURLToPath(new URL('../../frontend/dist', import.meta.url))
if (existsSync(staticDir)) {
  await app.register(fastifyStatic, { root: staticDir })
  // SPA-фолбэк: любые не-/api GET отдают index.html.
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
      return reply.sendFile('index.html')
    }
    reply.code(404).send({ error: 'not_found' })
  })
  app.log.info(`Статика фронта: ${staticDir}`)
}

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

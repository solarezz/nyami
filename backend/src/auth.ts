import crypto from 'node:crypto'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { config } from './config.js'

export interface AuthUser {
  id: number
  firstName?: string
  username?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

/**
 * Проверка Telegram initData:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string, botToken: string): AuthUser | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  if (computed !== hash) return null

  try {
    const user = JSON.parse(params.get('user') ?? '{}')
    return { id: user.id, firstName: user.first_name, username: user.username }
  } catch {
    return null
  }
}

const DEV_USER: AuthUser = { id: 1, firstName: 'Dev', username: 'dev' }

/** preHandler: кладёт request.user из заголовка `Authorization: tma <initData>`. */
export async function authHook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers['authorization'] ?? ''
  const initData = header.startsWith('tma ') ? header.slice(4) : ''

  // Валидный подписанный initData → реальный пользователь Telegram.
  if (initData && config.botToken) {
    const user = verifyInitData(initData, config.botToken)
    if (user) {
      req.user = user
      return
    }
  }

  // Dev: без валидного initData (например, браузер вне Telegram) пускаем тестового юзера.
  if (!config.isProduction) {
    req.user = DEV_USER
    return
  }

  reply.code(401).send({ error: 'unauthorized' })
}

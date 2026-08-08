import 'dotenv/config'

const groqApiKey = process.env.GROQ_API_KEY ?? ''

export const config = {
  botToken: process.env.BOT_TOKEN ?? '',
  port: Number(process.env.PORT ?? 8787),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? '',

  // --- AI-провайдер (переключаемый) ---
  // Пустое AI_PROVIDER считаем «не задано» (||), иначе пустая строка ломала автоопределение.
  aiProvider: (process.env.AI_PROVIDER || (groqApiKey ? 'groq' : 'mock')) as 'groq' | 'gemini' | 'mock',
  groqApiKey,
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  groqVisionModel: process.env.GROQ_VISION_MODEL ?? 'qwen/qwen3.6-27b',
  groqTextModel: process.env.GROQ_TEXT_MODEL ?? 'llama-3.3-70b-versatile',

  /** В проде авторизация Telegram строгая; в dev без валидного initData пускаем тестового юзера. */
  isProduction: process.env.NODE_ENV === 'production',
}

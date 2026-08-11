import { config } from '../config.js'
import type { OffProduct } from './off.js'

// FatSecret Platform API: большая международная база продуктов (есть RU-товары).
// OAuth2 client_credentials. Best-effort: при любой проблеме возвращает null,
// и поток штрихкода откатывается на чтение этикетки с фото.
//
// ВАЖНО: FatSecret требует whitelisting IP сервера в кабинете разработчика,
// а barcode-поиск может быть доступен только на тарифе Premier.

const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token'
const API_URL = 'https://platform.fatsecret.com/rest/server.api'

let tokenCache: { token: string; exp: number } | null = null

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// FatSecret barcode ищет по GTIN-13.
function gtin13(code: string): string {
  return code.replace(/\D/g, '').padStart(13, '0').slice(-13)
}

async function fetchJson(url: string, opts: RequestInit): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function getToken(): Promise<string | null> {
  if (!config.fatsecretId || !config.fatsecretSecret) return null
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token

  const basic = Buffer.from(`${config.fatsecretId}:${config.fatsecretSecret}`).toString('base64')
  const data = await fetchJson(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=basic',
  })
  const token = data?.access_token
  if (typeof token !== 'string') return null
  tokenCache = { token, exp: Date.now() + (num(data?.expires_in) || 3600) * 1000 - 60_000 }
  return token
}

export async function fatsecretByBarcode(code: string): Promise<OffProduct | null> {
  const token = await getToken()
  if (!token) return null
  const auth = { Authorization: `Bearer ${token}` }

  // 1) штрихкод → food_id
  const idData = await fetchJson(
    `${API_URL}?method=food.find_id_for_barcode&barcode=${gtin13(code)}&format=json`,
    { headers: auth },
  )
  const foodId = (idData?.food_id as { value?: string } | undefined)?.value
  if (!foodId || foodId === '0') return null

  // 2) food_id → пищевая ценность
  const foodData = await fetchJson(`${API_URL}?method=food.get.v4&food_id=${foodId}&format=json`, { headers: auth })
  const food = foodData?.food as Record<string, unknown> | undefined
  if (!food) return null

  const servingRaw = (food.servings as { serving?: unknown } | undefined)?.serving
  const servings = (Array.isArray(servingRaw) ? servingRaw : servingRaw ? [servingRaw] : []) as Record<string, unknown>[]

  // берём порцию, заданную в граммах, и нормируем к 100 г
  const g = servings.find((s) => String(s.metric_serving_unit).toLowerCase() === 'g' && num(s.metric_serving_amount) > 0)
  if (!g) return null
  const factor = 100 / num(g.metric_serving_amount)

  const name = String(food.food_name ?? 'Продукт')
  return {
    name,
    per100kcal: num(g.calories) * factor,
    per100protein: num(g.protein) * factor,
    per100carbs: num(g.carbohydrate) * factor,
    per100fat: num(g.fat) * factor,
    servingG: null,
    matched: name,
  }
}

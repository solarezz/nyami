import type {
  MeResponse, DaySummary, WeekDay, Meal, Recognition, Profile, FrequentMeal,
  AddMealRequest, RecognizeRequest, CoachResponse, UpdateProfileRequest, UpdateFastingRequest,
} from '@nyami/shared'

// В проде фронт и API на одном домене → относительный путь. В dev — локальный бэкенд.
const BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8787')

// В Telegram передаём подписанный initData; в браузере он пустой → бэк работает в dev-режиме.
function authHeader(): Record<string, string> {
  const initData = window.Telegram?.WebApp.initData ?? ''
  return initData ? { Authorization: `tma ${initData}` } : {}
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...authHeader(), ...(opts.headers as Record<string, string>) }
  // Content-Type ставим ТОЛЬКО при наличии тела: иначе Fastify роняет пустой
  // DELETE/GET с ошибкой FST_ERR_CTP_EMPTY_JSON_BODY.
  if (opts.body != null) headers['Content-Type'] = 'application/json'

  const res = await fetch(BASE + path, { ...opts, headers })
  if (!res.ok) throw new Error(`API ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export interface WeekResponse {
  days: WeekDay[]
  weightSeries: number[]
}

export const api = {
  getMe: () => req<MeResponse>('/api/me'),
  updateProfile: (body: UpdateProfileRequest) => req<Profile>('/api/profile', { method: 'POST', body: JSON.stringify(body) }),
  setFasting: (body: UpdateFastingRequest) => req<Profile>('/api/fasting', { method: 'POST', body: JSON.stringify(body) }),
  getDay: (date?: string) => req<DaySummary>(`/api/day${date ? `?date=${date}` : ''}`),
  getWeek: () => req<WeekResponse>('/api/week'),
  addMeal: (body: AddMealRequest, date?: string) => req<Meal>('/api/meals', { method: 'POST', body: JSON.stringify({ ...body, date }) }),
  deleteMeal: (id: string) => req<{ ok: boolean }>(`/api/meals/${id}`, { method: 'DELETE' }),
  setWater: (glasses: number, date?: string) => req<{ done: number }>('/api/water', { method: 'POST', body: JSON.stringify({ glasses, date }) }),
  getFrequent: () => req<FrequentMeal[]>('/api/frequent'),
  recognize: (body: RecognizeRequest) => req<Recognition>('/api/recognize', { method: 'POST', body: JSON.stringify(body) }),
  getByBarcode: (code: string) => req<Recognition>(`/api/barcode/${encodeURIComponent(code)}`),
  coach: (message: string) => req<CoachResponse>('/api/coach', { method: 'POST', body: JSON.stringify({ message }) }),
}

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type {
  MeResponse, DaySummary, Recognition, AddMealRequest, RecognizeRequest, UpdateProfileRequest,
} from '@nyami/shared'
import { api, type WeekResponse } from '../api'

interface DataState {
  me: MeResponse | null
  day: DaySummary | null
  week: WeekResponse | null
  onboarded: boolean
  loading: boolean
  error: string | null
  // Черновик распознавания, который передаётся с экрана «Добавить» в «Результат».
  pending: Recognition | null
  setPending: (r: Recognition | null) => void
  refresh: () => Promise<void>
  recognize: (req: RecognizeRequest) => Promise<Recognition>
  recognizeBarcode: (code: string) => Promise<Recognition>
  addMeal: (meal: AddMealRequest) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  setWater: (glasses: number) => Promise<void>
  updateProfile: (req: UpdateProfileRequest) => Promise<void>
  askCoach: (message: string) => Promise<string>
}

const Ctx = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [day, setDay] = useState<DaySummary | null>(null)
  const [week, setWeek] = useState<WeekResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Recognition | null>(null)

  const refresh = useCallback(async () => {
    // Сначала getMe — гарантированно заводит юзера, потом остальное параллельно.
    // (плюс на бэке ensureUser идемпотентен — двойная защита от гонки первого запуска)
    const m = await api.getMe()
    const [d, w] = await Promise.all([api.getDay(), api.getWeek()])
    setMe(m)
    setDay(d)
    setWeek(w)
  }, [])

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [refresh])

  const recognize = useCallback(async (r: RecognizeRequest) => {
    const result = await api.recognize(r)
    setPending(result)
    return result
  }, [])

  const recognizeBarcode = useCallback(async (code: string) => {
    const result = await api.getByBarcode(code)
    setPending(result)
    return result
  }, [])

  const addMeal = useCallback(async (meal: AddMealRequest) => {
    await api.addMeal(meal)
    setDay(await api.getDay())
  }, [])

  const deleteMeal = useCallback(async (id: string) => {
    await api.deleteMeal(id)
    setDay(await api.getDay())
  }, [])

  const setWater = useCallback(async (glasses: number) => {
    const { done } = await api.setWater(glasses)
    setDay((d) => (d ? { ...d, water: { ...d.water, done } } : d))
  }, [])

  const updateProfile = useCallback(async (req: UpdateProfileRequest) => {
    await api.updateProfile(req)
    const [m, d, w] = await Promise.all([api.getMe(), api.getDay(), api.getWeek()])
    setMe(m)
    setDay(d)
    setWeek(w)
  }, [])

  const askCoach = useCallback(async (message: string) => {
    const { reply } = await api.coach(message)
    return reply
  }, [])

  return (
    <Ctx.Provider value={{
      me, day, week, onboarded: me?.onboarded ?? false, loading, error, pending, setPending,
      refresh, recognize, recognizeBarcode, addMeal, deleteMeal, setWater, updateProfile, askCoach,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useData(): DataState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData должен использоваться внутри DataProvider')
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type {
  MeResponse, DaySummary, Recognition, AddMealRequest, RecognizeRequest,
} from '@nyami/shared'
import { api, type WeekResponse } from '../api'

interface DataState {
  me: MeResponse | null
  day: DaySummary | null
  week: WeekResponse | null
  loading: boolean
  error: string | null
  // Черновик распознавания, который передаётся с экрана «Добавить» в «Результат».
  pending: Recognition | null
  setPending: (r: Recognition | null) => void
  refresh: () => Promise<void>
  recognize: (req: RecognizeRequest) => Promise<Recognition>
  addMeal: (meal: AddMealRequest) => Promise<void>
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
    const [m, d, w] = await Promise.all([api.getMe(), api.getDay(), api.getWeek()])
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

  const addMeal = useCallback(async (meal: AddMealRequest) => {
    await api.addMeal(meal)
    setDay(await api.getDay())
  }, [])

  const askCoach = useCallback(async (message: string) => {
    const { reply } = await api.coach(message)
    return reply
  }, [])

  return (
    <Ctx.Provider value={{ me, day, week, loading, error, pending, setPending, refresh, recognize, addMeal, askCoach }}>
      {children}
    </Ctx.Provider>
  )
}

export function useData(): DataState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData должен использоваться внутри DataProvider')
  return ctx
}

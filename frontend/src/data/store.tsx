import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type {
  MeResponse, DaySummary, Recognition, AddMealRequest, RecognizeRequest, UpdateProfileRequest, UpdateFastingRequest,
  WorkoutRecognition, AddWorkoutRequest, MealType,
} from '@nyami/shared'
import { api, type WeekResponse } from '../api'

// Дата в UTC — как ключи дней на бэке (чтобы клиент и сервер совпадали).
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

interface DataState {
  me: MeResponse | null
  day: DaySummary | null
  week: WeekResponse | null
  onboarded: boolean
  loading: boolean
  error: string | null
  selectedDate: string
  isToday: boolean
  setSelectedDate: (date: string) => Promise<void>
  retry: () => void
  pending: Recognition | null
  setPending: (r: Recognition | null) => void
  refresh: () => Promise<void>
  recognize: (req: RecognizeRequest) => Promise<Recognition>
  recognizeBarcode: (code: string) => Promise<Recognition>
  selectedMealType: MealType | null
  setSelectedMealType: (t: MealType | null) => void
  addMeal: (meal: AddMealRequest) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  recognizeWorkout: (text: string) => Promise<WorkoutRecognition>
  addWorkout: (workout: AddWorkoutRequest) => Promise<void>
  deleteWorkout: (id: string) => Promise<void>
  setWater: (glasses: number) => Promise<void>
  setWeight: (weightKg: number) => Promise<void>
  updateProfile: (req: UpdateProfileRequest) => Promise<void>
  setFasting: (req: UpdateFastingRequest) => Promise<void>
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
  const [selectedDate, setSelectedDateState] = useState(todayStr())

  // ref, чтобы колбэки всегда видели актуальную дату без пересоздания.
  const dateRef = useRef(selectedDate)
  dateRef.current = selectedDate

  // Выбранная категория приёма (задаётся кнопкой «+» у группы; null → определяется по времени).
  const [selectedMealType, setSelectedMealTypeState] = useState<MealType | null>(null)
  const mealTypeRef = useRef<MealType | null>(selectedMealType)
  mealTypeRef.current = selectedMealType
  const setSelectedMealType = useCallback((t: MealType | null) => {
    setSelectedMealTypeState(t)
    mealTypeRef.current = t
  }, [])

  const refresh = useCallback(async () => {
    const m = await api.getMe()
    const [d, w] = await Promise.all([api.getDay(dateRef.current), api.getWeek()])
    setMe(m)
    setDay(d)
    setWeek(w)
  }, [])

  const retry = useCallback(() => {
    setError(null)
    setLoading(true)
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    retry()
  }, [retry])

  const setSelectedDate = useCallback(async (date: string) => {
    setSelectedDateState(date)
    dateRef.current = date
    setDay(await api.getDay(date))
  }, [])

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

  const reloadDayAndWeek = useCallback(async () => {
    const [d, w] = await Promise.all([api.getDay(dateRef.current), api.getWeek()])
    setDay(d)
    setWeek(w)
  }, [])

  const addMeal = useCallback(async (meal: AddMealRequest) => {
    // Тип из meal приоритетен; иначе — выбранная категория; иначе бэкенд решит по времени.
    await api.addMeal({ ...meal, mealType: meal.mealType ?? mealTypeRef.current ?? undefined }, dateRef.current)
    await reloadDayAndWeek()
  }, [reloadDayAndWeek])

  const deleteMeal = useCallback(async (id: string) => {
    await api.deleteMeal(id)
    await reloadDayAndWeek()
  }, [reloadDayAndWeek])

  const recognizeWorkout = useCallback(async (text: string) => api.recognizeWorkout(text), [])

  const addWorkout = useCallback(async (workout: AddWorkoutRequest) => {
    await api.addWorkout(workout, dateRef.current)
    await reloadDayAndWeek()
  }, [reloadDayAndWeek])

  const deleteWorkout = useCallback(async (id: string) => {
    await api.deleteWorkout(id)
    await reloadDayAndWeek()
  }, [reloadDayAndWeek])

  const setWater = useCallback(async (glasses: number) => {
    const { done } = await api.setWater(glasses, dateRef.current)
    setDay((d) => (d ? { ...d, water: { ...d.water, done } } : d))
  }, [])

  const setWeight = useCallback(async (weightKg: number) => {
    const { weightSeries } = await api.setWeight(weightKg)
    setWeek((w) => (w ? { ...w, weightSeries } : w))
  }, [])

  const updateProfile = useCallback(async (req: UpdateProfileRequest) => {
    await api.updateProfile(req)
    const [m, d, w] = await Promise.all([api.getMe(), api.getDay(dateRef.current), api.getWeek()])
    setMe(m)
    setDay(d)
    setWeek(w)
  }, [])

  const setFasting = useCallback(async (req: UpdateFastingRequest) => {
    await api.setFasting(req)
    const m = await api.getMe()
    setMe(m)
  }, [])

  const askCoach = useCallback(async (message: string) => {
    const { reply } = await api.coach(message)
    return reply
  }, [])

  return (
    <Ctx.Provider value={{
      me, day, week, onboarded: me?.onboarded ?? false, loading, error,
      selectedDate, isToday: selectedDate === todayStr(), setSelectedDate, retry,
      selectedMealType, setSelectedMealType,
      pending, setPending,
      refresh, recognize, recognizeBarcode, addMeal, deleteMeal,
      recognizeWorkout, addWorkout, deleteWorkout,
      setWater, setWeight, updateProfile, setFasting, askCoach,
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

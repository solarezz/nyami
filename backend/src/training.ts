import type {
  Exercise, ExerciseDetail, TrainingProgram, ProgramDay, TrainingSession, ExerciseSetRecord,
  StartSessionRequest, RecordSetRequest, TrainingPattern,
} from '@nyami/shared'
import { localIsoWeekday, localHour } from './tz.js'

// Абстракция хранилища тренировочного модуля — отдельно от NyamiRepo (nutrition/profile),
// т.к. это самостоятельный домен (библиотека упражнений, программы, сессии).
export interface TrainingRepo {
  listExercises(muscleGroup?: string): Promise<Exercise[]>
  getExercise(userId: number, exerciseId: string): Promise<ExerciseDetail | null>
  listPrograms(userId: number): Promise<TrainingProgram[]>
  getProgramDay(programDayId: string): Promise<ProgramDay | null>
  startSession(userId: number, req: StartSessionRequest): Promise<TrainingSession>
  recordSet(userId: number, sessionId: string, req: RecordSetRequest): Promise<TrainingSession>
  completeSession(userId: number, sessionId: string): Promise<TrainingSession>
  getSession(userId: number, sessionId: string): Promise<TrainingSession | null>
  /** Личный паттерн по фактической истории (не настраивается вручную) — дни недели + время суток. */
  inferTrainingPattern(userId: number, timeZone: string): Promise<TrainingPattern>
}

/** Доверяем личному паттерну, только если тренировок заметно больше, чем похожих на случайные. */
export const MIN_SESSIONS_FOR_PATTERN = 3

/** Общая логика вывода паттерна из списка инстантов начала тренировок — переиспользуется мок- и Postgres-репо. */
export function computeTrainingPattern(startedAts: Date[], timeZone: string): TrainingPattern {
  if (startedAts.length < MIN_SESSIONS_FOR_PATTERN) {
    return { typicalWeekdays: [], typicalTimeOfDay: null, sampleSize: startedAts.length }
  }
  const weekdayCounts = new Map<number, number>()
  const hours: number[] = []
  for (const at of startedAts) {
    const wd = localIsoWeekday(at, timeZone)
    weekdayCounts.set(wd, (weekdayCounts.get(wd) ?? 0) + 1)
    hours.push(localHour(at, timeZone))
  }
  const threshold = Math.max(2, Math.ceil(startedAts.length * 0.3))
  const typicalWeekdays = [...weekdayCounts.entries()].filter(([, c]) => c >= threshold).map(([w]) => w).sort((a, b) => a - b)
  const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length
  const typicalTimeOfDay = avgHour < 12 ? 'morning' : avgHour < 18 ? 'afternoon' : 'evening'
  return { typicalWeekdays, typicalTimeOfDay, sampleSize: startedAts.length }
}

const MOCK_EXERCISES: Exercise[] = [
  { id: 'e-bench-barbell', name: 'Жим штанги лёжа', description: null, muscleGroup: 'грудь', primaryMuscles: ['грудь'], secondaryMuscles: ['трицепс', 'передние дельты'], equipment: 'штанга, скамья', equipmentPhotoUrl: null, techniqueVideoUrl: null, difficulty: 'medium' },
  { id: 'e-bench-dumbbell', name: 'Жим гантелей лёжа', description: null, muscleGroup: 'грудь', primaryMuscles: ['грудь'], secondaryMuscles: ['трицепс', 'дельты'], equipment: 'гантели, скамья', equipmentPhotoUrl: null, techniqueVideoUrl: null, difficulty: 'medium' },
  { id: 'e-row-barbell', name: 'Тяга штанги в наклоне', description: null, muscleGroup: 'спина', primaryMuscles: ['спина'], secondaryMuscles: ['бицепс'], equipment: 'штанга', equipmentPhotoUrl: null, techniqueVideoUrl: null, difficulty: 'medium' },
  { id: 'e-pullup', name: 'Подтягивания', description: null, muscleGroup: 'спина', primaryMuscles: ['спина'], secondaryMuscles: ['бицепс'], equipment: 'турник', equipmentPhotoUrl: null, techniqueVideoUrl: null, difficulty: 'hard' },
  { id: 'e-lat-pulldown', name: 'Тяга верхнего блока', description: null, muscleGroup: 'спина', primaryMuscles: ['спина'], secondaryMuscles: ['бицепс'], equipment: 'тренажёр (верхний блок)', equipmentPhotoUrl: null, techniqueVideoUrl: null, difficulty: 'easy' },
  { id: 'e-curl-barbell', name: 'Сгибания рук со штангой', description: null, muscleGroup: 'бицепс', primaryMuscles: ['бицепс'], secondaryMuscles: [], equipment: 'штанга', equipmentPhotoUrl: null, techniqueVideoUrl: null, difficulty: 'easy' },
]

const MOCK_SUBSTITUTES: Record<string, string[]> = {
  'e-bench-barbell': ['e-bench-dumbbell'],
  'e-bench-dumbbell': ['e-bench-barbell'],
  'e-row-barbell': ['e-lat-pulldown', 'e-pullup'],
  'e-lat-pulldown': ['e-pullup'],
}

export function createMockTrainingRepo(): TrainingRepo {
  const sessionsByUser = new Map<number, Map<string, TrainingSession>>()
  let sessionSeq = 0

  const userSessions = (userId: number): Map<string, TrainingSession> => {
    if (!sessionsByUser.has(userId)) sessionsByUser.set(userId, new Map())
    return sessionsByUser.get(userId)!
  }

  const defaultProgram: TrainingProgram = {
    id: 'p-ppl',
    name: 'Push / Pull / Legs',
    description: 'Шаблон на 3 дня в неделю',
    isTemplate: true,
    days: [
      {
        id: 'd-pull', name: 'День 2 · Pull', weekday: null,
        exercises: [
          { id: 'pe-1', exercise: MOCK_EXERCISES[2], targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120 },
          { id: 'pe-2', exercise: MOCK_EXERCISES[3], targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 90 },
          { id: 'pe-3', exercise: MOCK_EXERCISES[4], targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90 },
          { id: 'pe-4', exercise: MOCK_EXERCISES[5], targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60 },
        ],
      },
    ],
  }

  return {
    async listExercises(muscleGroup) {
      return muscleGroup ? MOCK_EXERCISES.filter((e) => e.muscleGroup === muscleGroup) : MOCK_EXERCISES
    },

    async getExercise(userId, exerciseId) {
      const ex = MOCK_EXERCISES.find((e) => e.id === exerciseId)
      if (!ex) return null
      const subIds = MOCK_SUBSTITUTES[exerciseId] ?? []
      const substitutes = MOCK_EXERCISES.filter((e) => subIds.includes(e.id))

      const allSets = [...userSessions(userId).values()]
        .filter((s) => s.sets.some((set) => set.exerciseId === exerciseId))
        .flatMap((s) => s.sets.filter((set) => set.exerciseId === exerciseId).map((set) => ({ set, startedAt: s.startedAt })))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

      const lastPerformance = allSets[0]
        ? { weightKg: allSets[0].set.weightKg, repetitions: allSets[0].set.repetitions, performedAt: allSets[0].startedAt }
        : null

      const completed = allSets.map((a) => a.set).filter((s) => s.completed && s.weightKg != null)
      const personalRecord = completed.length
        ? completed.reduce((best, s) => (s.weightKg! > best.weightKg || (s.weightKg === best.weightKg && (s.repetitions ?? 0) > best.repetitions) ? { weightKg: s.weightKg!, repetitions: s.repetitions ?? 0 } : best), { weightKg: 0, repetitions: 0 })
        : null

      return { ...ex, lastPerformance, personalRecord, substitutes }
    },

    async listPrograms() {
      return [defaultProgram]
    },

    async getProgramDay(programDayId) {
      return defaultProgram.days.find((d) => d.id === programDayId) ?? null
    },

    async startSession(userId, req) {
      const id = `ts${Date.now()}${sessionSeq++}`
      const session: TrainingSession = {
        id, programId: req.programId ?? null, programDayId: req.programDayId ?? null,
        name: req.name, startedAt: new Date().toISOString(), completedAt: null, status: 'in_progress', sets: [],
      }
      userSessions(userId).set(id, session)
      return session
    },

    async recordSet(userId, sessionId, req) {
      const session = userSessions(userId).get(sessionId)
      if (!session) throw new Error('not_found')
      const existingIdx = session.sets.findIndex((s) => s.exerciseId === req.exerciseId && s.setNumber === req.setNumber)
      const record: ExerciseSetRecord = {
        id: existingIdx >= 0 ? session.sets[existingIdx].id : `es${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        exerciseId: req.exerciseId, setNumber: req.setNumber,
        weightKg: req.weightKg ?? null, repetitions: req.repetitions ?? null, completed: req.completed ?? true,
      }
      if (existingIdx >= 0) session.sets[existingIdx] = record
      else session.sets.push(record)
      return session
    },

    async completeSession(userId, sessionId) {
      const session = userSessions(userId).get(sessionId)
      if (!session) throw new Error('not_found')
      session.status = 'completed'
      session.completedAt = new Date().toISOString()
      return session
    },

    async getSession(userId, sessionId) {
      return userSessions(userId).get(sessionId) ?? null
    },

    async inferTrainingPattern(userId, timeZone) {
      const started = [...userSessions(userId).values()].filter((s) => s.status === 'completed').map((s) => new Date(s.startedAt))
      return computeTrainingPattern(started, timeZone)
    },
  }
}

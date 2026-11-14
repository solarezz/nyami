import type { Recognition, DaySummary, WorkoutRecognition, Exercise } from '@nyami/shared'
import type { GeneratedProgramPlan } from '../training.js'

export function mockRecognize(): Recognition {
  return {
    name: 'Борщ со сметаной', emoji: '🍲', grams: 350, kcal: 250,
    protein: 9, carbs: 27, fat: 12, confidence: 0.85,
    extras: [{ name: 'Хлеб ржаной', emoji: '🍞', grams: 80, kcal: 190, protein: 6, carbs: 38, fat: 1 }],
  }
}

export function mockWorkout(weightKg: number): WorkoutRecognition {
  // Бег 30 мин ≈ MET 7 × вес × 0.5ч.
  return { name: 'Бег', emoji: '🏃', minutes: 30, kcal: Math.round(7 * weightKg * 0.5), confidence: 0.6 }
}

export function mockCoach(day: DaySummary, message: string): string {
  const left = day.goalKcal + day.burnedKcal - day.eatenKcal
  return `На сегодня осталось ${left} ккал. (Заглушка — подключи GROQ_API_KEY, чтобы отвечал ИИ.) Ты спросил: «${message}».`
}

// Детерминированный фоллбэк на случай, если ИИ-провайдер недоступен/упал: раскидывает
// доступные упражнения по группам мышц на Push/Pull/Legs (или меньше дней, если мышц мало).
export function mockGenerateProgram(library: Exercise[]): GeneratedProgramPlan {
  const byGroup = new Map<string, Exercise[]>()
  for (const e of library) {
    if (!byGroup.has(e.muscleGroup)) byGroup.set(e.muscleGroup, [])
    byGroup.get(e.muscleGroup)!.push(e)
  }
  const SPLIT: { name: string; groups: string[] }[] = [
    { name: 'День 1 · Push', groups: ['грудь', 'плечи', 'трицепс'] },
    { name: 'День 2 · Pull', groups: ['спина', 'бицепс'] },
    { name: 'День 3 · Legs', groups: ['ноги', 'пресс'] },
  ]
  const days = SPLIT.map((d, i) => {
    const pool = d.groups.flatMap((g) => byGroup.get(g) ?? [])
    return {
      name: d.name,
      weekday: ([1, 3, 5] as (number | null)[])[i] ?? null,
      exercises: pool.slice(0, 5).map((e) => ({ exerciseId: e.id, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 })),
    }
  }).filter((d) => d.exercises.length > 0)

  return { name: 'Базовая программа', description: 'Общая программа на доступных упражнениях (ИИ временно недоступен).', days }
}

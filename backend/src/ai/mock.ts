import type { Recognition, DaySummary, WorkoutRecognition } from '@nyami/shared'

export function mockRecognize(): Recognition {
  return {
    name: 'Борщ со сметаной', emoji: '🍲', grams: 350, kcal: 250,
    protein: 9, carbs: 27, fat: 12, confidence: 0.85,
    extras: [{ name: 'Хлеб ржаной', emoji: '🍞', grams: 80, kcal: 190 }],
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

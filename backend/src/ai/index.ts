import type { Recognition, DaySummary, RecognizeRequest, WorkoutRecognition } from '@nyami/shared'
import { config } from '../config.js'
import { mockRecognize, mockCoach, mockWorkout } from './mock.js'
import { groqRecognize, groqCoach, groqWorkout } from './groq.js'

export interface Ai {
  recognize(input: RecognizeRequest): Promise<Recognition>
  recognizeWorkout(text: string, weightKg: number): Promise<WorkoutRecognition>
  coach(day: DaySummary, message: string): Promise<string>
}

// Провайдер выбирается по config.aiProvider. На любой ошибке провайдера —
// мягкий откат на заглушку, чтобы приложение не падало (напр. гео-блок, лимит).
export function getAi(): Ai {
  if (config.aiProvider === 'groq' && config.groqApiKey) {
    return {
      // Распознавание НЕ откатываем на мок: лучше честно сообщить о неудаче,
      // чем подсунуть неправильное блюдо. groqRecognize сам ретраит.
      async recognize(input) {
        return groqRecognize(input)
      },
      async recognizeWorkout(text, weightKg) {
        return groqWorkout(text, weightKg)
      },
      async coach(day, message) {
        try {
          return await groqCoach(day, message)
        } catch (e) {
          console.error('[ai] groq coach failed, fallback to mock:', e)
          return mockCoach(day, message)
        }
      },
    }
  }

  // mock / провайдер не настроен
  return {
    async recognize() {
      return mockRecognize()
    },
    async recognizeWorkout(_text, weightKg) {
      return mockWorkout(weightKg)
    },
    async coach(day, message) {
      return mockCoach(day, message)
    },
  }
}

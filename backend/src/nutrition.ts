import type { UpdateProfileRequest } from '@nyami/shared'

const ACTIVITY_FACTOR = { low: 1.375, medium: 1.55, high: 1.725 } as const

/** Дневная норма калорий и БЖУ по формуле Миффлина — Сан Жеора. */
export function computeNorm(p: UpdateProfileRequest): {
  dailyKcal: number
  protein: number
  fat: number
  carbs: number
} {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  let tdee = bmr * ACTIVITY_FACTOR[p.activity]
  if (p.goal === 'lose') tdee -= 500
  else if (p.goal === 'gain') tdee += 300

  const dailyKcal = Math.max(1200, Math.round(tdee / 10) * 10)
  const protein = Math.round(p.weightKg * 1.8)
  const fat = Math.round((dailyKcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((dailyKcal - protein * 4 - fat * 9) / 4))
  return { dailyKcal, protein, fat, carbs }
}

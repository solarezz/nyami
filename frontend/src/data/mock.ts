import type { DaySummary, Profile, WeekDay, ChatMessage, Recognition } from '../types'

// Мок-данные для фазы 1 (без бэкенда). Позже заменим на запросы к API.

export const mockProfile: Profile = {
  sex: 'male',
  age: 28,
  heightCm: 178,
  weightKg: 82,
  activity: 'medium',
  goal: 'lose',
  dailyKcal: 1900,
  protein: 140,
  fat: 60,
  carbs: 190,
}

export const mockDay: DaySummary = {
  date: '2026-08-13',
  eatenKcal: 1240,
  goalKcal: 1900,
  macros: {
    protein: { eaten: 82, goal: 140 },
    fat: { eaten: 41, goal: 60 },
    carbs: { eaten: 120, goal: 190 },
  },
  water: { done: 5, goal: 8 },
  streak: 6,
  meals: [
    { id: 'm1', name: 'Омлет с овощами', emoji: '🍳', time: '08:20', kcal: 380, protein: 24, carbs: 8, fat: 26 },
    { id: 'm2', name: 'Куриный салат', emoji: '🥗', time: '13:40', kcal: 620, protein: 42, carbs: 18, fat: 40 },
    { id: 'm3', name: 'Яблоко + орехи', emoji: '🍎', time: '16:10', kcal: 240, protein: 6, carbs: 24, fat: 14 },
  ],
}

export const mockWeekDates = [
  { dn: 'Сб', num: 7 },
  { dn: 'Вс', num: 8 },
  { dn: 'Пн', num: 9 },
  { dn: 'Вт', num: 10 },
  { dn: 'Ср', num: 11 },
  { dn: 'Чт', num: 12 },
  { dn: 'Сег', num: 13, today: true },
]

export const mockWeekChart: WeekDay[] = [
  { label: 'Пн', kcal: 1720, over: false },
  { label: 'Вт', kcal: 1490, over: false },
  { label: 'Ср', kcal: 2180, over: true },
  { label: 'Чт', kcal: 1660, over: false },
  { label: 'Пт', kcal: 1580, over: false },
  { label: 'Сб', kcal: 2050, over: true },
  { label: 'Вс', kcal: 1240, over: false, today: true },
]

export const mockWeightSeries = [84.0, 83.6, 83.2, 82.9, 82.5, 82.2, 82.0]

export const mockChat: ChatMessage[] = [
  { id: 'c1', role: 'coach', text: 'Привет! На сегодня осталось **660 ккал**. Спрашивай, если сомневаешься 🙂' },
  { id: 'c2', role: 'user', text: 'Можно мне ещё банан?' },
  { id: 'c3', role: 'coach', text: 'Да 👍 Банан ~**105 ккал** — останется ~555, хватит на нормальный ужин.' },
  { id: 'c4', role: 'user', text: 'А вместо банана мороженое?' },
  { id: 'c5', role: 'coach', text: 'Можно, но пломбир ~**230 ккал** и почти весь сахар. Тогда ужин сделай легче, ~300 ккал.' },
]

export const mockRecognition: Recognition = {
  name: 'Борщ со сметаной',
  emoji: '🍲',
  grams: 350,
  kcal: 250,
  protein: 9,
  carbs: 27,
  fat: 12,
  confidence: 0.85,
  extras: [{ name: 'Хлеб ржаной', emoji: '🍞', grams: 80, kcal: 190 }],
}

export const frequentMeals = [
  { emoji: '🥣', name: 'Овсянка', kcal: 310 },
  { emoji: '☕', name: 'Кофе', kcal: 60 },
]

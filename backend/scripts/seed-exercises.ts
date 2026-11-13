// Разовое наполнение стартовой библиотеки упражнений.
// Использование (на машине с DATABASE_URL): npm run db:seed-exercises -w backend
//
// Идемпотентно: пропускает упражнения, которые уже есть в базе (по названию).
// Фото оборудования/видео техники — не заполняем здесь (внешние URL появятся отдельно,
// когда будет на что ссылаться); экран упражнения должен нормально работать и без них.

import { db, type Db } from '../src/db/client.js'
import { exercises, exerciseSubstitutes } from '../src/db/schema.js'
import { eq } from 'drizzle-orm'

interface SeedExercise {
  name: string
  muscleGroup: string
  primaryMuscles: string[]
  secondaryMuscles?: string[]
  equipment: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

const EXERCISES: SeedExercise[] = [
  // Грудь
  { name: 'Жим штанги лёжа', muscleGroup: 'грудь', primaryMuscles: ['грудь'], secondaryMuscles: ['трицепс', 'передние дельты'], equipment: 'штанга, скамья', difficulty: 'medium' },
  { name: 'Жим гантелей лёжа', muscleGroup: 'грудь', primaryMuscles: ['грудь'], secondaryMuscles: ['трицепс', 'дельты'], equipment: 'гантели, скамья' },
  { name: 'Жим в тренажёре (чест-пресс)', muscleGroup: 'грудь', primaryMuscles: ['грудь'], secondaryMuscles: ['трицепс'], equipment: 'тренажёр', difficulty: 'easy' },
  { name: 'Разведение гантелей лёжа', muscleGroup: 'грудь', primaryMuscles: ['грудь'], equipment: 'гантели, скамья' },
  { name: 'Отжимания на брусьях', muscleGroup: 'грудь', primaryMuscles: ['грудь'], secondaryMuscles: ['трицепс'], equipment: 'брусья', difficulty: 'hard' },

  // Спина
  { name: 'Тяга штанги в наклоне', muscleGroup: 'спина', primaryMuscles: ['спина'], secondaryMuscles: ['бицепс'], equipment: 'штанга', difficulty: 'medium' },
  { name: 'Подтягивания', muscleGroup: 'спина', primaryMuscles: ['спина'], secondaryMuscles: ['бицепс'], equipment: 'турник', difficulty: 'hard' },
  { name: 'Тяга верхнего блока', muscleGroup: 'спина', primaryMuscles: ['спина'], secondaryMuscles: ['бицепс'], equipment: 'тренажёр (верхний блок)', difficulty: 'easy' },
  { name: 'Тяга нижнего блока сидя', muscleGroup: 'спина', primaryMuscles: ['спина'], secondaryMuscles: ['бицепс'], equipment: 'тренажёр (нижний блок)', difficulty: 'easy' },
  { name: 'Становая тяга', muscleGroup: 'спина', primaryMuscles: ['спина', 'ягодицы'], secondaryMuscles: ['бицепс бедра'], equipment: 'штанга', difficulty: 'hard' },

  // Ноги
  { name: 'Присед со штангой', muscleGroup: 'ноги', primaryMuscles: ['квадрицепс', 'ягодицы'], equipment: 'штанга', difficulty: 'hard' },
  { name: 'Жим ногами', muscleGroup: 'ноги', primaryMuscles: ['квадрицепс', 'ягодицы'], equipment: 'тренажёр', difficulty: 'easy' },
  { name: 'Румынская тяга', muscleGroup: 'ноги', primaryMuscles: ['бицепс бедра', 'ягодицы'], equipment: 'штанга', difficulty: 'medium' },
  { name: 'Выпады с гантелями', muscleGroup: 'ноги', primaryMuscles: ['квадрицепс', 'ягодицы'], equipment: 'гантели', difficulty: 'medium' },
  { name: 'Разгибание ног в тренажёре', muscleGroup: 'ноги', primaryMuscles: ['квадрицепс'], equipment: 'тренажёр', difficulty: 'easy' },
  { name: 'Сгибание ног лёжа', muscleGroup: 'ноги', primaryMuscles: ['бицепс бедра'], equipment: 'тренажёр', difficulty: 'easy' },

  // Плечи
  { name: 'Жим гантелей сидя', muscleGroup: 'плечи', primaryMuscles: ['плечи'], secondaryMuscles: ['трицепс'], equipment: 'гантели' },
  { name: 'Махи гантелями в стороны', muscleGroup: 'плечи', primaryMuscles: ['плечи'], equipment: 'гантели', difficulty: 'easy' },
  { name: 'Тяга штанги к подбородку', muscleGroup: 'плечи', primaryMuscles: ['плечи', 'трапеция'], equipment: 'штанга' },

  // Бицепс
  { name: 'Сгибания рук со штангой', muscleGroup: 'бицепс', primaryMuscles: ['бицепс'], equipment: 'штанга', difficulty: 'easy' },
  { name: 'Сгибания рук с гантелями', muscleGroup: 'бицепс', primaryMuscles: ['бицепс'], equipment: 'гантели', difficulty: 'easy' },

  // Трицепс
  { name: 'Французский жим', muscleGroup: 'трицепс', primaryMuscles: ['трицепс'], equipment: 'штанга или гантель' },
  { name: 'Разгибание рук на блоке', muscleGroup: 'трицепс', primaryMuscles: ['трицепс'], equipment: 'тренажёр (верхний блок)', difficulty: 'easy' },

  // Пресс
  { name: 'Скручивания', muscleGroup: 'пресс', primaryMuscles: ['пресс'], equipment: 'вес тела', difficulty: 'easy' },
  { name: 'Подъём ног в висе', muscleGroup: 'пресс', primaryMuscles: ['пресс'], equipment: 'турник', difficulty: 'hard' },
]

// Пары замен — связь взаимная по смыслу, но в базе храним по одному направлению
// (экран читает exerciseId=X OR substituteExerciseId=X).
const SUBSTITUTE_PAIRS: [string, string][] = [
  ['Жим штанги лёжа', 'Жим гантелей лёжа'],
  ['Жим штанги лёжа', 'Жим в тренажёре (чест-пресс)'],
  ['Жим гантелей лёжа', 'Жим в тренажёре (чест-пресс)'],
  ['Тяга штанги в наклоне', 'Тяга нижнего блока сидя'],
  ['Тяга штанги в наклоне', 'Подтягивания'],
  ['Тяга верхнего блока', 'Подтягивания'],
  ['Присед со штангой', 'Жим ногами'],
  ['Сгибания рук со штангой', 'Сгибания рук с гантелями'],
]

async function main() {
  if (!db) throw new Error('DATABASE_URL не задан — сидить некуда')
  const database = db as Db

  const nameToId = new Map<string, string>()

  for (const ex of EXERCISES) {
    const existing = await database.select({ id: exercises.id }).from(exercises).where(eq(exercises.name, ex.name)).limit(1)
    if (existing[0]) {
      nameToId.set(ex.name, existing[0].id)
      continue
    }
    const inserted = await database.insert(exercises).values({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      primaryMuscles: ex.primaryMuscles,
      secondaryMuscles: ex.secondaryMuscles ?? [],
      equipment: ex.equipment,
      difficulty: ex.difficulty ?? 'medium',
      isSystem: true,
    }).returning({ id: exercises.id })
    nameToId.set(ex.name, inserted[0].id)
    console.log(`+ ${ex.name}`)
  }

  for (const [a, b] of SUBSTITUTE_PAIRS) {
    const idA = nameToId.get(a)
    const idB = nameToId.get(b)
    if (!idA || !idB) {
      console.warn(`пропущена пара замены: не найдено "${!idA ? a : b}"`)
      continue
    }
    await database.insert(exerciseSubstitutes).values({ exerciseId: idA, substituteExerciseId: idB }).onConflictDoNothing()
  }

  console.log(`Готово: ${nameToId.size} упражнений, ${SUBSTITUTE_PAIRS.length} пар замен проверено.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

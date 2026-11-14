import { and, eq, or, desc, gte } from 'drizzle-orm'
import type {
  Exercise, TrainingProgram, ProgramDay, ProgramExercise, TrainingSession, ExerciseSetRecord,
} from '@nyami/shared'
import { type TrainingRepo, computeTrainingPattern, computeTrainingStats } from '../training.js'
import { db, type Db } from './client.js'
import {
  exercises, exerciseSubstitutes, trainingPrograms, trainingProgramDays, trainingProgramExercises,
  trainingSessions, exerciseSets,
} from './schema.js'

type ExerciseRow = typeof exercises.$inferSelect

function toExercise(r: ExerciseRow): Exercise {
  return {
    id: r.id, name: r.name, description: r.description, muscleGroup: r.muscleGroup,
    primaryMuscles: r.primaryMuscles, secondaryMuscles: r.secondaryMuscles,
    equipment: r.equipment, equipmentPhotoUrl: r.equipmentPhotoUrl, techniqueVideoUrl: r.techniqueVideoUrl,
    difficulty: r.difficulty as Exercise['difficulty'],
  }
}

function toSet(r: typeof exerciseSets.$inferSelect): ExerciseSetRecord {
  return { id: r.id, exerciseId: r.exerciseId, setNumber: r.setNumber, weightKg: r.weightKg, repetitions: r.repetitions, completed: r.completed }
}

function toSession(row: typeof trainingSessions.$inferSelect, sets: ExerciseSetRecord[]): TrainingSession {
  return {
    id: row.id, programId: row.programId, programDayId: row.programDayId, name: row.name,
    startedAt: row.startedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null,
    status: row.status as TrainingSession['status'], sets,
  }
}

export function createDrizzleTrainingRepo(): TrainingRepo {
  const database = db as Db

  async function loadDayExercises(programDayId: string): Promise<ProgramExercise[]> {
    const rows = await database
      .select({ pe: trainingProgramExercises, ex: exercises })
      .from(trainingProgramExercises)
      .innerJoin(exercises, eq(trainingProgramExercises.exerciseId, exercises.id))
      .where(eq(trainingProgramExercises.programDayId, programDayId))
      .orderBy(trainingProgramExercises.sortOrder)
    return rows.map((r) => ({
      id: r.pe.id, exercise: toExercise(r.ex), targetSets: r.pe.targetSets,
      targetRepsMin: r.pe.targetRepsMin, targetRepsMax: r.pe.targetRepsMax, restSeconds: r.pe.restSeconds,
    }))
  }

  async function loadProgramDays(programId: string): Promise<ProgramDay[]> {
    const dayRows = await database.select().from(trainingProgramDays).where(eq(trainingProgramDays.programId, programId)).orderBy(trainingProgramDays.sortOrder)
    const days: ProgramDay[] = []
    for (const d of dayRows) {
      days.push({ id: d.id, name: d.name, weekday: d.weekday, exercises: await loadDayExercises(d.id) })
    }
    return days
  }

  async function loadSessionSets(trainingSessionId: string): Promise<ExerciseSetRecord[]> {
    const rows = await database.select().from(exerciseSets).where(eq(exerciseSets.trainingSessionId, trainingSessionId)).orderBy(exerciseSets.createdAt)
    return rows.map(toSet)
  }

  return {
    async listExercises(muscleGroup) {
      const rows = muscleGroup
        ? await database.select().from(exercises).where(eq(exercises.muscleGroup, muscleGroup)).orderBy(exercises.name)
        : await database.select().from(exercises).orderBy(exercises.name)
      return rows.map(toExercise)
    },

    async getExercise(userId, exerciseId) {
      const rows = await database.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1)
      if (!rows[0]) return null
      const ex = toExercise(rows[0])

      const subRows = await database
        .select({ ex: exercises })
        .from(exerciseSubstitutes)
        .innerJoin(exercises, or(
          and(eq(exerciseSubstitutes.exerciseId, exerciseId), eq(exercises.id, exerciseSubstitutes.substituteExerciseId)),
          and(eq(exerciseSubstitutes.substituteExerciseId, exerciseId), eq(exercises.id, exerciseSubstitutes.exerciseId)),
        )!)
        .where(or(eq(exerciseSubstitutes.exerciseId, exerciseId), eq(exerciseSubstitutes.substituteExerciseId, exerciseId)))
      const substitutes = subRows.map((r) => toExercise(r.ex))

      const history = await database
        .select({ set: exerciseSets, session: trainingSessions })
        .from(exerciseSets)
        .innerJoin(trainingSessions, eq(exerciseSets.trainingSessionId, trainingSessions.id))
        .where(and(eq(trainingSessions.telegramId, userId), eq(exerciseSets.exerciseId, exerciseId)))
        .orderBy(desc(exerciseSets.createdAt))

      const lastPerformance = history[0]
        ? { weightKg: history[0].set.weightKg, repetitions: history[0].set.repetitions, performedAt: history[0].session.startedAt.toISOString() }
        : null

      const completed = history.map((h) => h.set).filter((s) => s.completed && s.weightKg != null)
      const personalRecord = completed.length
        ? completed.reduce((best, s) => (s.weightKg! > best.weightKg || (s.weightKg === best.weightKg && (s.repetitions ?? 0) > best.repetitions) ? { weightKg: s.weightKg!, repetitions: s.repetitions ?? 0 } : best), { weightKg: 0, repetitions: 0 })
        : null

      return { ...ex, lastPerformance, personalRecord, substitutes }
    },

    async listPrograms(userId) {
      // Личные программы (новее — выше) идут перед общим шаблоном.
      const rows = await database
        .select()
        .from(trainingPrograms)
        .where(or(eq(trainingPrograms.isTemplate, true), eq(trainingPrograms.userId, userId)))
        .orderBy(trainingPrograms.isTemplate, desc(trainingPrograms.createdAt))
      const programs: TrainingProgram[] = []
      for (const p of rows) {
        programs.push({ id: p.id, name: p.name, description: p.description, isTemplate: p.isTemplate, days: await loadProgramDays(p.id) })
      }
      return programs
    },

    async getProgramDay(programDayId) {
      const rows = await database.select().from(trainingProgramDays).where(eq(trainingProgramDays.id, programDayId)).limit(1)
      if (!rows[0]) return null
      return { id: rows[0].id, name: rows[0].name, weekday: rows[0].weekday, exercises: await loadDayExercises(programDayId) }
    },

    async createProgram(userId, plan) {
      const validExercises = new Set((await database.select({ id: exercises.id }).from(exercises)).map((r) => r.id))

      const [programRow] = await database.insert(trainingPrograms).values({
        userId, name: plan.name, description: plan.description, isTemplate: false,
      }).returning()

      for (let di = 0; di < plan.days.length; di++) {
        const d = plan.days[di]
        const dayExercises = d.exercises.filter((e) => validExercises.has(e.exerciseId))
        if (dayExercises.length === 0) continue
        const [dayRow] = await database.insert(trainingProgramDays).values({
          programId: programRow.id, name: d.name, weekday: d.weekday, sortOrder: di,
        }).returning()
        for (let ei = 0; ei < dayExercises.length; ei++) {
          const e = dayExercises[ei]
          await database.insert(trainingProgramExercises).values({
            programDayId: dayRow.id, exerciseId: e.exerciseId, sortOrder: ei,
            targetSets: e.targetSets, targetRepsMin: e.targetRepsMin, targetRepsMax: e.targetRepsMax, restSeconds: e.restSeconds,
          })
        }
      }

      return { id: programRow.id, name: programRow.name, description: programRow.description, isTemplate: false, days: await loadProgramDays(programRow.id) }
    },

    async startSession(userId, req) {
      const inserted = await database.insert(trainingSessions).values({
        telegramId: userId, programId: req.programId ?? null, programDayId: req.programDayId ?? null, name: req.name,
      }).returning()
      return toSession(inserted[0], [])
    },

    async recordSet(userId, sessionId, req) {
      const sessionRows = await database.select().from(trainingSessions).where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.telegramId, userId))).limit(1)
      if (!sessionRows[0]) throw new Error('not_found')

      const existing = await database.select().from(exerciseSets).where(and(
        eq(exerciseSets.trainingSessionId, sessionId), eq(exerciseSets.exerciseId, req.exerciseId), eq(exerciseSets.setNumber, req.setNumber),
      )).limit(1)

      const values = { weightKg: req.weightKg ?? null, repetitions: req.repetitions ?? null, completed: req.completed ?? true }
      if (existing[0]) {
        await database.update(exerciseSets).set(values).where(eq(exerciseSets.id, existing[0].id))
      } else {
        await database.insert(exerciseSets).values({ trainingSessionId: sessionId, exerciseId: req.exerciseId, setNumber: req.setNumber, ...values })
      }

      return toSession(sessionRows[0], await loadSessionSets(sessionId))
    },

    async completeSession(userId, sessionId) {
      const updated = await database.update(trainingSessions)
        .set({ status: 'completed', completedAt: new Date() })
        .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.telegramId, userId)))
        .returning()
      if (!updated[0]) throw new Error('not_found')
      return toSession(updated[0], await loadSessionSets(sessionId))
    },

    async getSession(userId, sessionId) {
      const rows = await database.select().from(trainingSessions).where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.telegramId, userId))).limit(1)
      if (!rows[0]) return null
      return toSession(rows[0], await loadSessionSets(sessionId))
    },

    async inferTrainingPattern(userId, timeZone) {
      const rows = await database
        .select({ startedAt: trainingSessions.startedAt })
        .from(trainingSessions)
        .where(and(eq(trainingSessions.telegramId, userId), eq(trainingSessions.status, 'completed')))
        .orderBy(desc(trainingSessions.startedAt))
        .limit(20)
      return computeTrainingPattern(rows.map((r) => r.startedAt), timeZone)
    },

    async getTrainingStats(userId, days) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const rows = await database
        .select()
        .from(trainingSessions)
        .where(and(eq(trainingSessions.telegramId, userId), eq(trainingSessions.status, 'completed'), gte(trainingSessions.startedAt, since)))
      const sessions: TrainingSession[] = []
      for (const row of rows) {
        sessions.push(toSession(row, await loadSessionSets(row.id)))
      }
      return computeTrainingStats(sessions)
    },
  }
}

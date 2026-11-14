import { useEffect, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { BottomNavV2 } from '../components/BottomNavV2'
import { muscleColorVars } from '../utils/muscleColor'
import { api } from '../api'
import { haptic } from '../telegram'
import type { Screen } from '../App'
import type { ExerciseDetail, ProgramDay, TrainingPattern, TrainingProgram } from '../types'

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function isoWeekdayToday(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

// Текущая календарная неделя Пн–Вс (для отображения, не для подбора дня программы).
function currentWeekDates(): { wd: number; num: number; today: boolean }[] {
  const todayWd = isoWeekdayToday()
  const now = new Date()
  const out: { wd: number; num: number; today: boolean }[] = []
  for (let wd = 1; wd <= 7; wd++) {
    const d = new Date(now)
    d.setDate(now.getDate() + (wd - todayWd))
    out.push({ wd, num: d.getDate(), today: wd === todayWd })
  }
  return out
}

export function Training({
  onNavigate, onStartSession,
}: {
  onNavigate: (s: Screen) => void
  onStartSession: (sessionId: string, day: ProgramDay, programName: string) => void
}) {
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [pattern, setPattern] = useState<TrainingPattern | null>(null)
  const [details, setDetails] = useState<Record<string, ExerciseDetail>>({})
  const [starting, setStarting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([api.getTrainingPrograms(), api.getTrainingPattern()])
      .then(([programs, p]) => { setProgram(programs[0] ?? null); setPattern(p) })
      .finally(() => setLoaded(true))
  }, [])

  const today = isoWeekdayToday()
  const day = program ? (program.days.find((d) => d.weekday === today) ?? program.days[0]) : null

  useEffect(() => {
    if (!day) return
    Promise.all(day.exercises.map((pe) => api.getExercise(pe.exercise.id)))
      .then((list) => {
        const map: Record<string, ExerciseDetail> = {}
        list.forEach((d) => { if (d) map[d.id] = d })
        setDetails(map)
      })
      .catch(() => {})
  }, [day?.id])

  if (loaded && (!program || !day)) {
    return (
      <div className="screen v2-screen gap fade">
        <div className="v2-h1">Тренировки</div>
        <div className="scrollarea">
          <div className="v2-card" style={{ textAlign: 'center', color: 'var(--v2-mu)', padding: '32px 16px' }}>
            Пока нет программы тренировок.
          </div>
          <button type="button" className="v2-pickrow" style={{ justifyContent: 'center', gap: 8 }} onClick={() => onNavigate('workout')}>
            <MaterialIcon name="directions_run" size={18} />Записать активность вручную
          </button>
        </div>
        <BottomNavV2 active="training" onNavigate={onNavigate} />
      </div>
    )
  }
  if (!day) return null

  const muscleGroups = [...new Set(day.exercises.map((e) => e.exercise.muscleGroup))]
  const totalSets = day.exercises.reduce((s, e) => s + e.targetSets, 0)
  const estMinutes = Math.round(totalSets * 2.5)
  // Объём считаем только когда есть реальные данные о последнем весе хотя бы по части упражнений.
  const totalVolume = day.exercises.reduce((sum, pe) => {
    const d = details[pe.exercise.id]
    return sum + (d?.lastPerformance?.weightKg ?? 0) * (d?.lastPerformance?.repetitions ?? 0) * pe.targetSets
  }, 0)

  const records = Object.values(details).filter((d) => d.personalRecord)
    .sort((a, b) => b.personalRecord!.weightKg - a.personalRecord!.weightKg)
  const topRecord = records[0]

  const hasPattern = (pattern?.sampleSize ?? 0) >= 3

  const start = async () => {
    if (starting) return
    haptic('medium')
    setStarting(true)
    try {
      const session = await api.startTrainingSession({ programId: program!.id, programDayId: day.id, name: `${program!.name} · ${day.name}` })
      onStartSession(session.id, day, program!.name)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="screen v2-screen gap fade">
      <div>
        <div className="v2-label">{program!.name}</div>
        <div className="v2-h1" style={{ marginTop: 2 }}>{day.name}</div>
      </div>

      <div className="scrollarea">
        <div className="v2-daygrid">
          {currentWeekDates().map((w) => (
            <div key={w.wd} className={`v2-daycell${w.today ? ' today' : ''}`}>
              <span className="dn">{WD[w.wd - 1]}</span>
              <span className="dd num">{w.num}</span>
              {hasPattern && pattern!.typicalWeekdays.includes(w.wd) && (
                <span className="msi" style={{ fontSize: 13, color: w.today ? 'currentColor' : 'var(--v2-lime-ink)' }}>fitness_center</span>
              )}
            </div>
          ))}
        </div>

        <div className="v2-hero">
          <span className="msi v2-hero-watermark" style={{ fontSize: 140, right: -20, top: -24, transform: 'rotate(-20deg)' }}>fitness_center</span>
          <div className="v2-hero-badge"><MaterialIcon name="today" size={14} />Сегодня</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative' }}>
            {muscleGroups.map((m) => {
              const c = muscleColorVars(m)
              return <span key={m} className="v2-musclebadge" style={{ background: c.bg, color: c.fg }}>{m}</span>
            })}
          </div>
          <div className="v2-hero-stats">
            <div><div className="v2-hero-stat-n num">{day.exercises.length}</div><div className="v2-hero-stat-l">упражнений</div></div>
            <div><div className="v2-hero-stat-n num">~{estMinutes}</div><div className="v2-hero-stat-l">минут</div></div>
            <div>
              <div className="v2-hero-stat-n num">{totalVolume > 0 ? (totalVolume / 1000).toFixed(1) : totalSets}{totalVolume > 0 && <span style={{ fontSize: 14 }}> т</span>}</div>
              <div className="v2-hero-stat-l">{totalVolume > 0 ? 'объём' : 'подходов'}</div>
            </div>
          </div>
          <button type="button" className="v2-btn" onClick={start} disabled={starting}>
            {starting ? 'Начинаю…' : 'Начать тренировку'}
            <span className="v2-btn-ic"><MaterialIcon name="play_arrow" /></span>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
          <span style={{ font: '700 17px var(--v2-font-text)' }}>Упражнения</span>
          <span style={{ font: '600 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>ПОДХОДЫ × ПОВТ · ПОСЛЕДНИЙ ВЕС</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {day.exercises.map((pe, i) => {
            const d = details[pe.exercise.id]
            const c = muscleColorVars(pe.exercise.muscleGroup)
            return (
              <div key={pe.id} className="v2-exrow">
                <div className="v2-exnum num">{String(i + 1).padStart(2, '0')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 14px var(--v2-font-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pe.exercise.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <span className="v2-musclebadge" style={{ background: c.bg, color: c.fg }}>{pe.exercise.muscleGroup}</span>
                    <span className="num" style={{ font: '600 12px var(--v2-font-num)', color: 'var(--v2-mu)' }}>{pe.targetSets}×{pe.targetRepsMin}–{pe.targetRepsMax}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ font: '700 17px var(--v2-font-num)' }}>{d?.lastPerformance?.weightKg ?? '—'}</div>
                  <div style={{ font: '500 11px var(--v2-font-text)', color: 'var(--v2-mu)' }}>кг</div>
                </div>
              </div>
            )
          })}
        </div>

        {topRecord && (
          <div className="v2-prcard">
            <div className="v2-pricon"><MaterialIcon name="emoji_events" fill size={24} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ font: '700 11px var(--v2-font-num)', letterSpacing: '.08em', color: 'var(--v2-yel-ink)' }}>ЛИЧНЫЙ РЕКОРД · {topRecord.name.toUpperCase()}</div>
              <div className="num" style={{ font: '700 22px var(--v2-font-num)', marginTop: 2 }}>{topRecord.personalRecord!.weightKg} кг × {topRecord.personalRecord!.repetitions}</div>
            </div>
          </div>
        )}

        <button type="button" className="v2-pickrow" style={{ justifyContent: 'center', gap: 8 }} onClick={() => onNavigate('workout')}>
          <MaterialIcon name="directions_run" size={18} />Другая активность (бег, ходьба…)
        </button>
      </div>

      <BottomNavV2 active="training" onNavigate={onNavigate} />
    </div>
  )
}

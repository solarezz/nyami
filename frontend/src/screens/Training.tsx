import { useEffect, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { BottomNavV3 } from '../components/BottomNavV3'
import { muscleColorVars } from '../utils/muscleColor'
import { api } from '../api'
import { haptic } from '../telegram'
import type { Screen } from '../App'
import type { Exercise, ExerciseDetail, ProgramDay, TrainingPattern, TrainingProgram } from '../types'

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const TABS = ['Программы', 'Упражнения', 'Избранное'] as const

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
  const [tab, setTab] = useState<number>(0)
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [pattern, setPattern] = useState<TrainingPattern | null>(null)
  const [details, setDetails] = useState<Record<string, ExerciseDetail>>({})
  const [library, setLibrary] = useState<Exercise[]>([])
  const [starting, setStarting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([api.getTrainingPrograms(), api.getTrainingPattern(), api.getExercises()])
      .then(([programs, p, lib]) => { setProgram(programs[0] ?? null); setPattern(p); setLibrary(lib) })
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

  const start = async () => {
    if (!program || !day || starting) return
    haptic('medium')
    setStarting(true)
    try {
      const session = await api.startTrainingSession({ programId: program.id, programDayId: day.id, name: `${program.name} · ${day.name}` })
      onStartSession(session.id, day, program.name)
    } finally {
      setStarting(false)
    }
  }

  const selectTab = (i: number) => { haptic('light'); setTab(i) }

  const hasPattern = (pattern?.sampleSize ?? 0) >= 3
  const muscleGroups = day ? [...new Set(day.exercises.map((e) => e.exercise.muscleGroup))] : []
  const totalSets = day ? day.exercises.reduce((s, e) => s + e.targetSets, 0) : 0
  const estMinutes = Math.round(totalSets * 2.5)
  // Объём считаем только когда есть реальные данные о последнем весе хотя бы по части упражнений.
  const totalVolume = day ? day.exercises.reduce((sum, pe) => {
    const d = details[pe.exercise.id]
    return sum + (d?.lastPerformance?.weightKg ?? 0) * (d?.lastPerformance?.repetitions ?? 0) * pe.targetSets
  }, 0) : 0
  const records = Object.values(details).filter((d) => d.personalRecord)
    .sort((a, b) => b.personalRecord!.weightKg - a.personalRecord!.weightKg)
  const topRecord = records[0]

  return (
    <div className="screen v3-screen gap fade">
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em' }}>Тренировки</div>
        <div style={{ fontSize: 15, color: 'var(--v3-mu2)', marginTop: 4 }}>Выбирай программу или отдельное упражнение</div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {TABS.map((label, i) => (
          <button key={label} type="button" className={`v3-chip${tab === i ? ' on' : ''}`} onClick={() => selectTab(i)}>{label}</button>
        ))}
      </div>

      <div className="scrollarea">
        {tab === 0 && (
          loaded && (!program || !day) ? (
            <>
              <div className="v3-card" style={{ textAlign: 'center', color: 'var(--v3-mu)', padding: '32px 16px' }}>
                Пока нет программы тренировок.
              </div>
              <button type="button" className="v3-pickrow" style={{ justifyContent: 'center', gap: 8, background: 'var(--v3-card)' }} onClick={() => onNavigate('workout')}>
                <MaterialIcon name="directions_run" variant="rounded" size={18} />Записать активность вручную
              </button>
            </>
          ) : day && (
            <>
              <div className="v3-daygrid">
                {currentWeekDates().map((w) => (
                  <div key={w.wd} className={`v3-daycell${w.today ? ' sel' : ''}`}>
                    <span className="wd">{WD[w.wd - 1]}</span>
                    <span className="dn">{w.num}</span>
                    {hasPattern && pattern!.typicalWeekdays.includes(w.wd) && (
                      <MaterialIcon name="fitness_center" variant="rounded" size={12} style={{ color: w.today ? 'var(--v3-day-ink)' : 'var(--v3-green)' }} />
                    )}
                  </div>
                ))}
              </div>

              <div className="v3-promo">
                <span className="msr" style={{ position: 'absolute', right: -16, top: -16, fontSize: 130, opacity: .15, transform: 'rotate(-15deg)', color: 'var(--v3-hero-ic)', pointerEvents: 'none' }}>fitness_center</span>
                <div style={{ position: 'relative', fontSize: 21, fontWeight: 700, letterSpacing: '-.01em' }}>{day.name}</div>
                <div style={{ position: 'relative', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {muscleGroups.map((m) => {
                    const c = muscleColorVars(m)
                    return <span key={m} style={{ padding: '5px 10px', borderRadius: 10, background: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 600, color: c.fg }}>{m}</span>
                  })}
                </div>
                <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
                  <div className="v3-hero-stat"><div className="num" style={{ fontWeight: 800, fontSize: 15 }}>{day.exercises.length}</div><div style={{ fontSize: 10.5, color: 'var(--v3-mu2)' }}>упр.</div></div>
                  <div className="v3-hero-stat"><div className="num" style={{ fontWeight: 800, fontSize: 15 }}>~{estMinutes}</div><div style={{ fontSize: 10.5, color: 'var(--v3-mu2)' }}>мин</div></div>
                  <div className="v3-hero-stat">
                    <div className="num" style={{ fontWeight: 800, fontSize: 15 }}>{totalVolume > 0 ? (totalVolume / 1000).toFixed(1) : totalSets}{totalVolume > 0 && <span style={{ fontSize: 11 }}> т</span>}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--v3-mu2)' }}>{totalVolume > 0 ? 'объём' : 'подх.'}</div>
                  </div>
                </div>
                <button type="button" className="v3-btn-primary" style={{ alignSelf: 'flex-start', position: 'relative' }} onClick={start} disabled={starting}>
                  {starting ? 'Начинаю…' : 'Начать программу'}<MaterialIcon name="arrow_forward" variant="rounded" size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>Упражнения</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--v3-mu)' }}>ПОДХ.×ПОВТ · ПОСЛ. ВЕС</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {day.exercises.map((pe, i) => {
                  const d = details[pe.exercise.id]
                  const c = muscleColorVars(pe.exercise.muscleGroup)
                  return (
                    <div key={pe.id} className="v3-exrow">
                      <div className="v3-exnum num">{String(i + 1).padStart(2, '0')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pe.exercise.name}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 8, background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600 }}>{pe.exercise.muscleGroup}</span>
                          <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>{pe.targetSets}×{pe.targetRepsMin}–{pe.targetRepsMax}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="num" style={{ fontSize: 17, fontWeight: 700 }}>{d?.lastPerformance?.weightKg ?? '—'}</div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--v3-mu)' }}>кг</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {topRecord && (
                <div className="v3-prcard">
                  <div className="v3-pricon"><MaterialIcon name="emoji_events" variant="rounded" fill size={24} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', color: '#A66A00' }}>ЛИЧНЫЙ РЕКОРД · {topRecord.name.toUpperCase()}</div>
                    <div className="num" style={{ fontSize: 21, fontWeight: 700, marginTop: 2 }}>{topRecord.personalRecord!.weightKg} кг × {topRecord.personalRecord!.repetitions}</div>
                  </div>
                </div>
              )}

              <button type="button" className="v3-pickrow" style={{ justifyContent: 'center', gap: 8, background: 'var(--v3-card)' }} onClick={() => onNavigate('workout')}>
                <MaterialIcon name="directions_run" variant="rounded" size={18} />Другая активность (бег, ходьба…)
              </button>
            </>
          )
        )}

        {tab === 1 && (
          library.length === 0 ? (
            <div className="v3-card" style={{ textAlign: 'center', color: 'var(--v3-mu)', padding: '32px 16px' }}>Библиотека упражнений пуста</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {library.map((ex) => {
                const c = muscleColorVars(ex.muscleGroup)
                return (
                  <button key={ex.id} type="button" className="v3-exgrid-card">
                    <div className="v3-exgrid-ph" style={{ background: c.bg }}><MaterialIcon name="exercise" variant="rounded" size={36} style={{ color: c.fg }} /></div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{ex.name}</div>
                  </button>
                )
              })}
            </div>
          )
        )}

        {tab === 2 && (
          <div className="v3-card" style={{ textAlign: 'center', color: 'var(--v3-mu)', padding: '32px 16px' }}>
            Избранные упражнения появятся здесь — скоро
          </div>
        )}
      </div>

      <BottomNavV3 active="training" onNavigate={onNavigate} />
    </div>
  )
}

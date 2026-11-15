import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { MuscleDiagram } from '../components/MuscleDiagram'
import { muscleColorVars } from '../utils/muscleColor'
import { api } from '../api'
import { haptic, showConfirm } from '../telegram'
import type { ExerciseDetail, ExerciseSetRecord, ProgramDay, ProgramExercise } from '../types'

function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TrainingSession({
  sessionId, programDay, programName, onFinish,
}: {
  sessionId: string
  programDay: ProgramDay
  programName: string
  onFinish: () => void
}) {
  const [exercises, setExercises] = useState<ProgramExercise[]>(programDay.exercises)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sets, setSets] = useState<ExerciseSetRecord[]>([])
  const [detail, setDetail] = useState<ExerciseDetail | null>(null)
  const [draftWeight, setDraftWeight] = useState(0)
  const [draftReps, setDraftReps] = useState(10)
  const [saving, setSaving] = useState(false)
  const [restRemaining, setRestRemaining] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showSubstitute, setShowSubstitute] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const startedAtRef = useRef(Date.now())

  const current = exercises[currentIndex]
  const currentSets = sets.filter((s) => s.exerciseId === current.exercise.id).sort((a, b) => a.setNumber - b.setNumber)
  const nextSetNumber = currentSets.length + 1

  useEffect(() => {
    api.getTrainingSession(sessionId).then((s) => { setSets(s.sets); startedAtRef.current = new Date(s.startedAt).getTime() }).catch(() => {})
  }, [sessionId])

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    api.getExercise(current.exercise.id).then(setDetail).catch(() => setDetail(null))
    setRestRemaining(null)
  }, [current.exercise.id])

  useEffect(() => {
    if (restRemaining == null) return
    if (restRemaining <= 0) return
    const t = setTimeout(() => setRestRemaining((r) => (r == null ? null : r - 1)), 1000)
    return () => clearTimeout(t)
  }, [restRemaining])

  // Черновик подхода: продолжаем с прошлого залогированного здесь же, иначе берём последний реальный результат.
  useEffect(() => {
    const lastHere = currentSets[currentSets.length - 1]
    if (lastHere) {
      setDraftWeight(lastHere.weightKg ?? 0)
      setDraftReps(lastHere.repetitions ?? current.targetRepsMin)
    } else if (detail?.lastPerformance) {
      setDraftWeight(detail.lastPerformance.weightKg ?? 0)
      setDraftReps(detail.lastPerformance.repetitions ?? current.targetRepsMin)
    } else {
      setDraftWeight(0)
      setDraftReps(current.targetRepsMin)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, currentIndex])

  const logSet = async () => {
    if (saving) return
    haptic('medium')
    setSaving(true)
    try {
      const updated = await api.recordSet(sessionId, {
        exerciseId: current.exercise.id, setNumber: nextSetNumber, weightKg: draftWeight || undefined, repetitions: draftReps || undefined, completed: true,
      })
      setSets(updated.sets)
      setRestRemaining(current.restSeconds)
    } finally {
      setSaving(false)
    }
  }

  const repeatLast = () => {
    if (!detail?.lastPerformance) return
    haptic('light')
    setDraftWeight(detail.lastPerformance.weightKg ?? 0)
    setDraftReps(detail.lastPerformance.repetitions ?? current.targetRepsMin)
  }

  const pickSubstitute = (ex: ExerciseDetail['substitutes'][number]) => {
    haptic('light')
    setExercises((prev) => prev.map((pe, i) => (i === currentIndex ? { ...pe, exercise: ex } : pe)))
    setShowSubstitute(false)
  }

  const close = async () => {
    if (!(await showConfirm('Выйти из тренировки? Уже записанные подходы сохранены.'))) return
    onFinish()
  }

  const finish = async () => {
    if (finishing) return
    if (!(await showConfirm('Завершить тренировку?'))) return
    haptic('medium')
    setFinishing(true)
    try {
      await api.completeTrainingSession(sessionId)
      onFinish()
    } finally {
      setFinishing(false)
    }
  }

  const c = muscleColorVars(current.exercise.muscleGroup)
  const REST_BIG_R = 122
  const REST_BIG_CIRC = 2 * Math.PI * REST_BIG_R
  const restBigDash = restRemaining != null ? `${(Math.max(0, restRemaining) / current.restSeconds) * REST_BIG_CIRC} ${REST_BIG_CIRC}` : `0 ${REST_BIG_CIRC}`

  return (
    <>
    {showSubstitute && detail && (
      <div className="v3-sheet-backdrop" onClick={() => setShowSubstitute(false)}>
        <div className="v3-sheet" onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Чем заменить</div>
          {detail.substitutes.filter((ex) => !exercises.some((pe) => pe.exercise.id === ex.id)).map((ex) => (
            <button type="button" key={ex.id} className="v3-optrow" onClick={() => pickSubstitute(ex)}>
              <div style={{ flex: 1 }}>
                <div className="ttl">{ex.name}</div>
                <div className="dsc">{ex.equipment ?? ex.muscleGroup}</div>
              </div>
              <MaterialIcon name="chevron_right" variant="rounded" size={20} />
            </button>
          ))}
        </div>
      </div>
    )}
    {restRemaining != null && (
      <div className="v3-rest">
        <div className="v3-rest-top"><span style={{ width: 24 }} />Отдых между подходами<MaterialIcon name="music_note" variant="rounded" size={24} /></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <div style={{ position: 'relative', width: 270, height: 270 }}>
            <svg width={270} height={270} viewBox="0 0 270 270" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={135} cy={135} r={REST_BIG_R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={12} />
              <circle cx={135} cy={135} r={REST_BIG_R} fill="none" stroke="var(--v3-lime)" strokeWidth={12} strokeLinecap="round" strokeDasharray={restBigDash} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="num" style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-.03em' }}>{fmtClock(Math.max(0, restRemaining))}</div>
              <div style={{ fontSize: 16, color: '#B5BCAE' }}>Отдых</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="v3-chip" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', boxShadow: 'none' }} onClick={() => setRestRemaining((r) => (r ?? 0) + 15)}>+15 с</button>
          </div>
        </div>
        <div className="v3-rest-bottom"><button type="button" className="v3-rest-skip" onClick={() => setRestRemaining(null)}>Пропустить отдых</button></div>
      </div>
    )}
    <div className="screen v3-screen gap fade">
      <div className="v3-sessiontop">
        <button type="button" className="v3-iconbtn" onClick={close} aria-label="Закрыть"><MaterialIcon name="close" variant="rounded" size={22} /></button>
        <div style={{ flex: 1 }}>
          <div className="v3-label">{programName} · ИДЁТ</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700 }}>{fmtClock(elapsed)}</div>
        </div>
        <button type="button" className="v3-finishbtn" onClick={finish} disabled={finishing}>{finishing ? 'Завершаю…' : 'Завершить'}</button>
      </div>

      <div className="v3-exseg">
        {exercises.map((pe, i) => {
          const done = sets.filter((s) => s.exerciseId === pe.exercise.id).length >= pe.targetSets
          return <button key={pe.id} type="button" className={i === currentIndex ? 'current' : done ? 'done' : ''} onClick={() => setCurrentIndex(i)} aria-label={pe.exercise.name} />
        })}
      </div>

      <div className="scrollarea">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="v3-musclebadge" style={{ background: c.bg, color: c.fg }}>{current.exercise.muscleGroup}</span>
            <span className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-mu)' }}>УПРАЖНЕНИЕ {currentIndex + 1} / {exercises.length} · {current.targetSets}×{current.targetRepsMin}–{current.targetRepsMax}</span>
          </div>
          <div className="v3-h1" style={{ textAlign: 'center' }}>{current.exercise.name}</div>
        </div>

        {current.exercise.techniqueVideoUrl ? (
          /\.(mp4|webm|mov)(\?|$)/i.test(current.exercise.techniqueVideoUrl) ? (
            <video key={current.exercise.id} className="v3-videoph" src={current.exercise.techniqueVideoUrl} controls playsInline style={{ width: '100%', background: 'var(--v3-card)', objectFit: 'cover' }} />
          ) : (
            <img key={current.exercise.id} className="v3-videoph" src={current.exercise.techniqueVideoUrl} alt={`Техника: ${current.exercise.name}`} style={{ width: '100%', objectFit: 'cover' }} />
          )
        ) : (
          <div className="v3-videoph"><MaterialIcon name="play_circle" variant="rounded" size={20} />видео техники пока не добавлено</div>
        )}

        {current.exercise.equipment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--v3-mu)' }}>
            <MaterialIcon name="fitness_center" variant="rounded" size={16} />Оборудование: {current.exercise.equipment}
          </div>
        )}

        {detail && (detail.primaryMuscles.length > 0 || detail.secondaryMuscles.length > 0) && (
          <div className="v3-card">
            <MuscleDiagram primaryMuscles={detail.primaryMuscles} secondaryMuscles={detail.secondaryMuscles} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
              {detail.primaryMuscles.map((m) => <span key={m} className="v3-musclebadge" style={{ background: 'var(--v3-lime)', color: 'var(--v3-ink)' }}>{m}</span>)}
              {detail.secondaryMuscles.map((m) => <span key={m} className="v3-musclebadge" style={{ background: 'var(--v3-day-a-off,#F0F1EC)', color: 'var(--v3-mu)' }}>{m}</span>)}
            </div>
          </div>
        )}

        {detail && detail.substitutes.filter((ex) => !exercises.some((pe) => pe.exercise.id === ex.id)).length > 0 && (
          <button type="button" className="v3-pickrow" onClick={() => setShowSubstitute(true)} style={{ justifyContent: 'center', gap: 8 }}>
            <MaterialIcon name="sync_alt" variant="rounded" size={18} />Заменить упражнение
          </button>
        )}

        <div className="v3-setstable">
          <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 56px 46px', gap: 6, padding: '8px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: 'var(--v3-mu)', borderBottom: '1px solid var(--v3-line)' }}>
            <span>#</span><span>ПОДХОД</span><span>КГ</span><span>ПОВТ</span>
          </div>
          {currentSets.length === 0 ? (
            <div style={{ padding: '14px 12px', fontSize: 13, fontWeight: 500, color: 'var(--v3-mu)' }}>Пока нет записанных подходов</div>
          ) : currentSets.map((s) => (
            <div key={s.id} className="v3-setrow">
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--v3-mu)' }}>{s.setNumber}</span>
              <MaterialIcon name="check" variant="rounded" size={18} style={{ color: 'var(--v3-green)' }} />
              <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>{s.weightKg ?? '—'}</span>
              <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>{s.repetitions ?? '—'}</span>
            </div>
          ))}
        </div>

        <div className="v3-bigstepper">
          <div className="v3-label">Подход {nextSetNumber}</div>
          <div className="row">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-mu)' }}>Вес, кг</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="v3-stepbtn" onClick={() => setDraftWeight((w) => Math.max(0, w - 2.5))}><MaterialIcon name="remove" variant="rounded" size={18} /></button>
              <span className="num" style={{ fontSize: 24, fontWeight: 700, minWidth: 54, textAlign: 'center' }}>{draftWeight}</span>
              <button type="button" className="v3-stepbtn" onClick={() => setDraftWeight((w) => w + 2.5)}><MaterialIcon name="add" variant="rounded" size={18} /></button>
            </div>
          </div>
          <div className="row">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-mu)' }}>Повторения</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="v3-stepbtn" onClick={() => setDraftReps((r) => Math.max(0, r - 1))}><MaterialIcon name="remove" variant="rounded" size={18} /></button>
              <span className="num" style={{ fontSize: 24, fontWeight: 700, minWidth: 54, textAlign: 'center' }}>{draftReps}</span>
              <button type="button" className="v3-stepbtn" onClick={() => setDraftReps((r) => r + 1)}><MaterialIcon name="add" variant="rounded" size={18} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {detail?.lastPerformance && currentSets.length === 0 && (
              <button type="button" className="v3-pickrow" style={{ flex: 1, justifyContent: 'center', gap: 6, padding: '12px' }} onClick={repeatLast}>
                <MaterialIcon name="replay" variant="rounded" size={18} />Как в прошлый раз
              </button>
            )}
            <button type="button" className="v3-btn-primary" style={{ flex: 1.2, height: 50, justifyContent: 'center' }} onClick={logSet} disabled={saving}>
              {saving ? 'Записываю…' : 'Записать подход'}
              <MaterialIcon name="check" variant="rounded" size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="v3-navfooter">
        <button type="button" className="v3-navbtn" disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}><MaterialIcon name="chevron_left" variant="rounded" size={24} /></button>
        <button type="button" className="v3-navnext" disabled={currentIndex === exercises.length - 1} onClick={() => setCurrentIndex((i) => i + 1)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="v3-label">Следующее</div>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exercises[currentIndex + 1]?.exercise.name ?? '—'}</div>
          </div>
          <MaterialIcon name="chevron_right" variant="rounded" size={24} />
        </button>
      </div>
    </div>
    </>
  )
}

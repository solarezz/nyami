import { useRef, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { AiOverlay } from '../components/AiOverlay'
import { useData } from '../data/store'
import { haptic, showAlert } from '../telegram'
import type { Screen } from '../App'
import type { WorkoutRecognition } from '../types'

const PRESETS = [
  { emoji: '🏃', label: 'Бег', text: 'Бег 30 минут' },
  { emoji: '🏋️', label: 'Силовая', text: 'Силовая тренировка 45 минут' },
  { emoji: '🚶', label: 'Ходьба', text: 'Быстрая ходьба 40 минут' },
  { emoji: '🚴', label: 'Велосипед', text: 'Велосипед 30 минут' },
  { emoji: '🧘', label: 'Йога', text: 'Йога 30 минут' },
  { emoji: '🏊', label: 'Плавание', text: 'Плавание 30 минут' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

export function AddWorkout({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { recognizeWorkout, addWorkout } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [est, setEst] = useState<WorkoutRecognition | null>(null)
  const [time, setTime] = useState(nowHHMM)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const estimate = async (q?: string) => {
    const query = (q ?? text).trim()
    if (!query) {
      textRef.current?.focus()
      return
    }
    if (busy) return
    if (q) setText(q)
    haptic('light')
    setBusy(true)
    try {
      setEst(await recognizeWorkout(query))
    } catch {
      showAlert('Не смог оценить тренировку. Опиши иначе — например «бег 30 минут».')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!est || saving) return
    setSaving(true)
    try {
      await addWorkout({ name: est.name, emoji: est.emoji, minutes: est.minutes, kcal: est.kcal, time })
      onNavigate('today')
    } catch {
      showAlert('Не удалось добавить тренировку. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <div className="screen v3-screen gap fade">
      {busy && <AiOverlay text="Оцениваю тренировку…" />}
      <div className="v3-h1">Добавить активность</div>

      <div className="scrollarea">
        <div className="v3-searchrow" style={{ height: 'auto', padding: '10px 10px 10px 14px', alignItems: 'flex-start' }}>
          <textarea
            ref={textRef} rows={2} value={text}
            placeholder="Опиши: «бег 30 минут», «силовая час», «10000 шагов»…"
            onChange={(e) => { setText(e.target.value); setEst(null) }}
          />
          <button type="button" className="v3-sendbtn" onClick={() => estimate()} disabled={busy || saving}>
            <MaterialIcon name={busy ? 'hourglass_top' : 'auto_awesome'} variant="rounded" size={20} />
          </button>
        </div>

        <div className="v3-label">Быстрый выбор</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((p) => (
            <button type="button" className="v3-chip" key={p.text} onClick={() => estimate(p.text)} disabled={busy || saving}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {est && (
          <div className="v3-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="v3-mini-icon" style={{ width: 48, height: 48, borderRadius: 16, fontSize: 24, background: 'var(--v3-green-soft)' }}>{est.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{est.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#D99A00' }}>
                  <MaterialIcon name="auto_awesome" variant="rounded" size={14} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>оценка ±{Math.round((1 - est.confidence) * 100)}%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--v3-line)', paddingTop: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-mu)' }}>Длительность</span>
              <span className="num" style={{ fontSize: 14, fontWeight: 700 }}>{est.minutes} мин</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-mu)' }}>Сожжено</span>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--v3-green-deep)' }}>{est.kcal} ккал</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-mu)' }}>Время</span>
              <input
                type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="num" style={{ background: 'transparent', border: 'none', textAlign: 'right', color: 'var(--v3-ink)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}
              />
            </div>
          </div>
        )}

        {est ? (
          <>
            <button type="button" className="v3-btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={confirm} disabled={saving}>
              {saving ? 'Добавляю…' : `Добавить · +${est.kcal} ккал к остатку`}
              <MaterialIcon name="check" variant="rounded" size={20} />
            </button>
            <button type="button" className="v3-pickrow" style={{ justifyContent: 'center' }} onClick={() => setEst(null)} disabled={saving}>Оценить заново</button>
          </>
        ) : (
          <button type="button" className="v3-btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={() => estimate()} disabled={busy}>
            {busy ? 'Оцениваю…' : 'Оценить через ИИ'}
            <MaterialIcon name="auto_awesome" variant="rounded" size={20} />
          </button>
        )}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--v3-mu)' }}>Сожжённые калории добавляются к дневному остатку</div>
      </div>
    </div>
  )
}

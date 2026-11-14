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
    <div className="screen v2-screen gap fade">
      {busy && <AiOverlay text="Оцениваю тренировку…" />}
      <div className="v2-h1">Добавить активность</div>

      <div className="scrollarea">
        <div className="v2-textrow">
          <textarea
            ref={textRef} rows={2} value={text}
            placeholder="Опиши: «бег 30 минут», «силовая час», «10000 шагов»…"
            onChange={(e) => { setText(e.target.value); setEst(null) }}
          />
          <button type="button" className="v2-sendbtn" style={{ background: 'var(--v2-lime)', color: 'var(--v2-on)' }} onClick={() => estimate()} disabled={busy || saving}>
            <MaterialIcon name={busy ? 'hourglass_top' : 'auto_awesome'} size={20} />
          </button>
        </div>

        <div className="v2-label">Быстрый выбор</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((p) => (
            <button type="button" className="v2-chip" key={p.text} onClick={() => estimate(p.text)} disabled={busy || saving}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {est && (
          <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="v2-mini-icon" style={{ width: 48, height: 48, fontSize: 24, background: 'color-mix(in srgb, var(--v2-lime) 20%, transparent)' }}>{est.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ font: '700 17px var(--v2-font-text)' }}>{est.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: 'var(--v2-yel-ink)' }}>
                  <MaterialIcon name="auto_awesome" size={14} />
                  <span style={{ font: '600 12px var(--v2-font-text)' }}>оценка ±{Math.round((1 - est.confidence) * 100)}%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--v2-ln)', paddingTop: 10 }}>
              <span style={{ font: '600 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Длительность</span>
              <span className="num" style={{ font: '700 14px var(--v2-font-num)' }}>{est.minutes} мин</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ font: '600 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Сожжено</span>
              <span className="num" style={{ font: '700 14px var(--v2-font-num)', color: 'var(--v2-lime-ink)' }}>{est.kcal} ккал</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: '600 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Время</span>
              <input
                type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="num" style={{ background: 'transparent', border: 'none', textAlign: 'right', color: 'var(--v2-tx)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}
              />
            </div>
          </div>
        )}

        {est ? (
          <>
            <button type="button" className="v2-btn" onClick={confirm} disabled={saving}>
              {saving ? 'Добавляю…' : `Добавить · +${est.kcal} ккал к остатку`}
              <span className="v2-btn-ic"><MaterialIcon name="check" size={20} /></span>
            </button>
            <button type="button" className="v2-pickrow" style={{ justifyContent: 'center' }} onClick={() => setEst(null)} disabled={saving}>Оценить заново</button>
          </>
        ) : (
          <button type="button" className="v2-btn" onClick={() => estimate()} disabled={busy}>
            {busy ? 'Оцениваю…' : 'Оценить через ИИ'}
            <span className="v2-btn-ic"><MaterialIcon name="auto_awesome" size={20} /></span>
          </button>
        )}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--v2-mu)' }}>Сожжённые калории добавляются к дневному остатку</div>
      </div>
    </div>
  )
}

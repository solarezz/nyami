import { useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { useData } from '../data/store'
import { haptic, showAlert } from '../telegram'
import type { Screen } from '../App'
import type { WorkoutRecognition } from '../types'

const PRESETS = [
  { emoji: '🏃', text: 'Бег 30 минут' },
  { emoji: '🏋️', text: 'Силовая тренировка 45 минут' },
  { emoji: '🚶', text: 'Быстрая ходьба 40 минут' },
  { emoji: '🚴', text: 'Велосипед 30 минут' },
  { emoji: '🧘', text: 'Йога 30 минут' },
  { emoji: '🏊', text: 'Плавание 30 минут' },
]

export function AddWorkout({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { recognizeWorkout, addWorkout } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [est, setEst] = useState<WorkoutRecognition | null>(null)
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
      await addWorkout({ name: est.name, emoji: est.emoji, minutes: est.minutes, kcal: est.kcal })
      onNavigate('today')
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <div className="h2">Добавить тренировку</div>
      </div>

      <div className="scrollarea">
        <div className="tiny">Что за тренировка</div>
        <textarea
          ref={textRef} className="inputcard" rows={2} value={text}
          placeholder="Опиши: «бег 30 минут», «силовая час», «10000 шагов»…"
          onChange={(e) => { setText(e.target.value); setEst(null) }}
        />

        <div className="tiny">Быстрый выбор</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {PRESETS.map((p) => (
            <button className="qchip" key={p.text} onClick={() => estimate(p.text)} disabled={busy || saving}>
              {p.emoji} {p.text.replace(/\s\d.*$/, '')}
            </button>
          ))}
        </div>

        {est && (
          <div className="card" style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div className="thumb" style={{ width: 58, height: 58, borderRadius: 18, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', fontSize: 30, flex: 'none' }}>{est.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.05 }}>{est.name}</div>
                <span className="confpill" style={{ marginTop: 6 }}>оценка ±{Math.round((1 - est.confidence) * 100)}%</span>
              </div>
            </div>
            <div className="frow"><span className="muted">Длительность</span><span className="fv">{est.minutes} мин</span></div>
            <div className="frow"><span className="muted">Сожжено</span><span className="fv" style={{ color: 'var(--accent)' }}>{est.kcal} ккал</span></div>
          </div>
        )}

        <div style={{ flex: 1 }} />
        {est ? (
          <>
            <button className="btn" onClick={confirm} disabled={saving} style={saving ? { opacity: 0.7 } : undefined}>
              <Icon name="check" />{saving ? 'Добавляю…' : `Добавить · +${est.kcal} ккал к остатку`}
            </button>
            <button className="btn ghost" onClick={() => setEst(null)} disabled={saving}>Оценить заново</button>
          </>
        ) : (
          <button className="btn" onClick={() => estimate()} disabled={busy} style={busy ? { opacity: 0.7 } : undefined}>
            <Icon name="spark" />{busy ? 'Оцениваю…' : 'Оценить через ИИ'}
          </button>
        )}
        <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>Сожжённые калории добавляются к дневному остатку</div>
      </div>
    </div>
  )
}

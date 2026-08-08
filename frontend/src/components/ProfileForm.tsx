import { useState } from 'react'
import type { UpdateProfileRequest } from '@nyami/shared'
import { computeNorm } from '../utils/nutrition'
import { NumberField } from './NumberField'

const ACTIVITIES = [
  { key: 'low', label: 'Низкая' },
  { key: 'medium', label: 'Средняя' },
  { key: 'high', label: 'Высокая' },
] as const

const GOALS = [
  { key: 'lose', label: 'Похудеть' },
  { key: 'maintain', label: 'Держать' },
  { key: 'gain', label: 'Набрать' },
] as const

export function ProfileForm({
  initial, submitLabel, onSubmit,
}: {
  initial: UpdateProfileRequest
  submitLabel: string
  onSubmit: (v: UpdateProfileRequest) => Promise<void>
}) {
  const [v, setV] = useState<UpdateProfileRequest>(initial)
  const [saving, setSaving] = useState(false)
  const norm = computeNorm(v)

  const set = <K extends keyof UpdateProfileRequest>(k: K, val: UpdateProfileRequest[K]) =>
    setV((prev) => ({ ...prev, [k]: val }))

  const submit = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSubmit(v)
    } catch {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="seg">
        <span className={v.sex === 'male' ? 'on' : ''} onClick={() => set('sex', 'male')}>Мужской</span>
        <span className={v.sex === 'female' ? 'on' : ''} onClick={() => set('sex', 'female')}>Женский</span>
      </div>

      <div className="card" style={{ padding: '4px 18px' }}>
        <NumberField label="Возраст" value={v.age} min={5} max={120} onChange={(n) => set('age', n)} />
        <NumberField label="Рост, см" value={v.heightCm} min={80} max={250} onChange={(n) => set('heightCm', n)} />
        <NumberField label="Вес, кг" value={v.weightKg} min={20} max={400} decimals={1} onChange={(n) => set('weightKg', n)} />
      </div>

      <div className="tiny">Активность</div>
      <div className="chips">
        {ACTIVITIES.map((a) => (
          <span key={a.key} className={`chip${v.activity === a.key ? ' on' : ''}`} onClick={() => set('activity', a.key)}>{a.label}</span>
        ))}
      </div>

      <div className="tiny">Цель</div>
      <div className="chips">
        {GOALS.map((g) => (
          <span key={g.key} className={`chip${v.goal === g.key ? ' on' : ''}`} onClick={() => set('goal', g.key)}>{g.label}</span>
        ))}
      </div>

      <div className="resultcard">
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>Твоя норма</div>
          <div className="big">{norm.dailyKcal.toLocaleString('ru-RU')}</div>
          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>ккал в день</div>
        </div>
        <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, lineHeight: 1.6 }}>
          Б {norm.protein}<br />Ж {norm.fat}<br />У {norm.carbs}
        </div>
      </div>

      <button className="btn" onClick={submit} disabled={saving} style={saving ? { opacity: 0.7 } : undefined}>
        {saving ? 'Сохраняю…' : submitLabel}
      </button>
    </>
  )
}

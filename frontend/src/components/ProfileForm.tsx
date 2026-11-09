import { useState } from 'react'
import type { UpdateProfileRequest } from '@nyami/shared'
import { computeNorm } from '../utils/nutrition'
import { NumberField } from './NumberField'
import { Tabs } from './ui/Tabs'
import { Select } from './ui/Select'
import { Button } from './ui/Button'

const ACTIVITIES = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
] as const

const GOALS = [
  { value: 'lose', label: 'Похудеть' },
  { value: 'maintain', label: 'Держать' },
  { value: 'gain', label: 'Набрать' },
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
      <Tabs
        options={[{ value: 'male', label: 'Мужской' }, { value: 'female', label: 'Женский' }]}
        value={v.sex} onChange={(sex) => set('sex', sex)}
      />

      <div className="card" style={{ padding: '4px 18px' }}>
        <NumberField label="Возраст" value={v.age} min={5} max={120} onChange={(n) => set('age', n)} />
        <NumberField label="Рост, см" value={v.heightCm} min={80} max={250} onChange={(n) => set('heightCm', n)} />
        <NumberField label="Вес, кг" value={v.weightKg} min={20} max={400} decimals={1} onChange={(n) => set('weightKg', n)} />
      </div>

      <Select label="Активность" options={ACTIVITIES} value={v.activity} onChange={(a) => set('activity', a)} />
      <Select label="Цель" options={GOALS} value={v.goal} onChange={(g) => set('goal', g)} />

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

      <Button onClick={submit} loading={saving} loadingText="Сохраняю…">{submitLabel}</Button>
    </>
  )
}

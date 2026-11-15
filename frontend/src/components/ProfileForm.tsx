import { useState } from 'react'
import type { UpdateProfileRequest } from '@nyami/shared'
import { computeNorm } from '../utils/nutrition'
import { MaterialIcon } from './MaterialIcon'
import { haptic } from '../telegram'

const GOALS = [
  { value: 'lose', icon: 'trending_down', title: 'Похудеть', desc: 'Дефицит калорий для снижения веса', badge: '−500' },
  { value: 'maintain', icon: 'balance', title: 'Держать вес', desc: 'Норма без дефицита и избытка', badge: '—' },
  { value: 'gain', icon: 'trending_up', title: 'Набрать массу', desc: 'Избыток калорий для роста мышц', badge: '+300' },
] as const

const ACTIVITIES = [
  { value: 'low', bars: 1, title: 'Низкая', desc: '0–1 тренировка в неделю', coef: '×1.375' },
  { value: 'medium', bars: 2, title: 'Средняя', desc: '3–5 тренировок в неделю', coef: '×1.55' },
  { value: 'high', bars: 4, title: 'Высокая', desc: '6–7 тренировок в неделю, физический труд', coef: '×1.725' },
] as const

// Пороги ИМТ (ВОЗ): <18.5 дефицит, 18.5–25 норма, 25–30 избыток, 30+ ожирение.
// Шкала и bmiMark считаются на диапазон 0–40.
function bmiMarkPct(bmi: number) {
  return Math.min(100, Math.max(0, (bmi / 40) * 100))
}

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
  const bmi = v.weightKg / (v.heightCm / 100) ** 2
  const protPct = Math.round(((norm.protein * 4) / norm.dailyKcal) * 100)
  const fatPct = Math.round(((norm.fat * 9) / norm.dailyKcal) * 100)
  const carbPct = Math.max(0, 100 - protPct - fatPct)

  const set = <K extends keyof UpdateProfileRequest>(k: K, val: UpdateProfileRequest[K]) => {
    haptic('light')
    setV((prev) => ({ ...prev, [k]: val }))
  }

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
      <div className="v3-sexgrid">
        <button type="button" className={`v3-sexcard${v.sex === 'male' ? ' on' : ''}`} onClick={() => set('sex', 'male')}>
          <MaterialIcon name="male" variant="rounded" size={28} /><span>Мужской</span>
        </button>
        <button type="button" className={`v3-sexcard${v.sex === 'female' ? ' on' : ''}`} onClick={() => set('sex', 'female')}>
          <MaterialIcon name="female" variant="rounded" size={28} /><span>Женский</span>
        </button>
      </div>

      <div className="v3-field">
        <div className="v3-field-icon" style={{ background: 'var(--v3-vio-track)', color: 'var(--v3-vio)' }}>
          <MaterialIcon name="cake" variant="rounded" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="v3-field-label">Возраст</div>
          <div className="v3-field-value num">{v.age} <span className="v3-field-unit">лет</span></div>
        </div>
        <button type="button" className="v3-stepbtn" disabled={v.age <= 5} onClick={() => set('age', Math.max(5, v.age - 1))}><MaterialIcon name="remove" variant="rounded" size={22} /></button>
        <button type="button" className="v3-stepbtn" disabled={v.age >= 120} onClick={() => set('age', Math.min(120, v.age + 1))}><MaterialIcon name="add" variant="rounded" size={22} /></button>
      </div>

      <div className="v3-field">
        <div className="v3-field-icon" style={{ background: 'var(--v3-blu-track)', color: 'var(--v3-blu)' }}>
          <MaterialIcon name="height" variant="rounded" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="v3-field-label">Рост</div>
          <div className="v3-field-value num">{v.heightCm} <span className="v3-field-unit">см</span></div>
        </div>
        <button type="button" className="v3-stepbtn" disabled={v.heightCm <= 80} onClick={() => set('heightCm', Math.max(80, v.heightCm - 1))}><MaterialIcon name="remove" variant="rounded" size={22} /></button>
        <button type="button" className="v3-stepbtn" disabled={v.heightCm >= 250} onClick={() => set('heightCm', Math.min(250, v.heightCm + 1))}><MaterialIcon name="add" variant="rounded" size={22} /></button>
      </div>

      <div className="v3-field">
        <div className="v3-field-icon" style={{ background: 'var(--v3-green-soft)', color: 'var(--v3-green)' }}>
          <MaterialIcon name="monitor_weight" variant="rounded" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="v3-field-label">Вес</div>
          <div className="v3-field-value num">{v.weightKg.toFixed(1)} <span className="v3-field-unit">кг</span></div>
        </div>
        <button type="button" className="v3-stepbtn" disabled={v.weightKg <= 20} onClick={() => set('weightKg', Math.max(20, Math.round((v.weightKg - 0.5) * 10) / 10))}><MaterialIcon name="remove" variant="rounded" size={22} /></button>
        <button type="button" className="v3-stepbtn" disabled={v.weightKg >= 400} onClick={() => set('weightKg', Math.min(400, Math.round((v.weightKg + 0.5) * 10) / 10))}><MaterialIcon name="add" variant="rounded" size={22} /></button>
      </div>

      <div className="v3-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="v3-field-label">Индекс массы тела</span>
          <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{bmi.toFixed(1)}</span>
        </div>
        <div className="v3-bmirow">
          <div style={{ flex: 18.5, height: 8, background: 'var(--v3-blu)' }} />
          <div style={{ flex: 6.5, height: 8, background: 'var(--v3-green)' }} />
          <div style={{ flex: 5, height: 8, background: '#FFA23D' }} />
          <div style={{ flex: 10, height: 8, background: '#E0406A' }} />
          <div className="v3-bmimark" style={{ left: `${bmiMarkPct(bmi)}%` }} />
        </div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 500, color: 'var(--v3-mu)' }}>
          <span>0</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
        </div>
      </div>

      <div className="v3-label" style={{ marginTop: 2 }}>Цель</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GOALS.map((g) => (
          <button type="button" key={g.value} className={`v3-optrow${v.goal === g.value ? ' on' : ''}`} onClick={() => set('goal', g.value)}>
            <div className="v3-optrow-icon"><MaterialIcon name={g.icon} variant="rounded" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="ttl">{g.title}</div>
              <div className="dsc">{g.desc}</div>
            </div>
            <div className="pct num">{g.badge}</div>
          </button>
        ))}
      </div>

      <div className="v3-label" style={{ marginTop: 2 }}>Активность</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ACTIVITIES.map((a) => (
          <button type="button" key={a.value} className={`v3-optrow${v.activity === a.value ? ' on' : ''}`} onClick={() => set('activity', a.value)}>
            <div className="v3-barset">
              {[1, 2, 3, 4].map((i) => <i key={i} className={i <= a.bars ? 'on' : ''} style={{ height: `${i * 22}%` }} />)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="ttl">{a.title}</div>
              <div className="dsc">{a.desc}</div>
            </div>
            <div className="pct num">{a.coef}</div>
          </button>
        ))}
      </div>

      <div className="v3-resulthero">
        <span className="msr" style={{ position: 'absolute', right: -16, top: -18, fontSize: 150, opacity: .15, color: 'var(--v3-hero-ic)' }}>local_fire_department</span>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', position: 'relative' }}>ВАША ДНЕВНАЯ НОРМА</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, position: 'relative' }}>
          <span className="num" style={{ fontSize: 56, lineHeight: .95, fontWeight: 700, letterSpacing: '-.04em' }}>{norm.dailyKcal.toLocaleString('ru-RU')}</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>ккал</span>
        </div>
        <div style={{ display: 'flex', height: 10, gap: 2, marginTop: 6, position: 'relative' }}>
          <div style={{ width: `${protPct}%`, background: 'var(--v3-vio)' }} />
          <div style={{ width: `${fatPct}%`, background: '#FFA23D' }} />
          <div style={{ width: `${carbPct}%`, background: 'var(--v3-blu)' }} />
        </div>
      </div>

      <div className="v3-macrogrid3">
        <div className="v3-macrotile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="v3-dot" style={{ background: 'var(--v3-vio)' }} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>Белки</span></div>
          <div className="num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.03em' }}>{norm.protein}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--v3-mu)' }}> г</span></div>
        </div>
        <div className="v3-macrotile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="v3-dot" style={{ background: '#FFA23D' }} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>Жиры</span></div>
          <div className="num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.03em' }}>{norm.fat}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--v3-mu)' }}> г</span></div>
        </div>
        <div className="v3-macrotile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="v3-dot" style={{ background: 'var(--v3-blu)' }} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>Углеводы</span></div>
          <div className="num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.03em' }}>{norm.carbs}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--v3-mu)' }}> г</span></div>
        </div>
      </div>

      <button type="button" className="v3-btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={submit} disabled={saving}>
        {saving ? 'Сохраняю…' : submitLabel}
        <MaterialIcon name={saving ? 'hourglass_top' : 'arrow_forward'} variant="rounded" size={22} />
      </button>
    </>
  )
}

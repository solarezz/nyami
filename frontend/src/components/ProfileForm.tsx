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
      <div className="v2-sexgrid">
        <button type="button" className={`v2-sexcard${v.sex === 'male' ? ' on' : ''}`} onClick={() => set('sex', 'male')}>
          <MaterialIcon name="male" size={28} /><span>Мужской</span>
        </button>
        <button type="button" className={`v2-sexcard${v.sex === 'female' ? ' on' : ''}`} onClick={() => set('sex', 'female')}>
          <MaterialIcon name="female" size={28} /><span>Женский</span>
        </button>
      </div>

      <div className="v2-field">
        <div className="v2-field-icon" style={{ background: 'color-mix(in srgb, var(--v2-vio) 20%, transparent)', color: 'var(--v2-vio-ink)' }}>
          <MaterialIcon name="cake" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="v2-field-label">Возраст</div>
          <div className="v2-field-value">{v.age} <span className="v2-field-unit">лет</span></div>
        </div>
        <button type="button" className="v2-stepbtn" disabled={v.age <= 5} onClick={() => set('age', Math.max(5, v.age - 1))}><MaterialIcon name="remove" size={22} /></button>
        <button type="button" className="v2-stepbtn" disabled={v.age >= 120} onClick={() => set('age', Math.min(120, v.age + 1))}><MaterialIcon name="add" size={22} /></button>
      </div>

      <div className="v2-field">
        <div className="v2-field-icon" style={{ background: 'color-mix(in srgb, var(--v2-blu) 20%, transparent)', color: 'var(--v2-blu-ink)' }}>
          <MaterialIcon name="height" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="v2-field-label">Рост</div>
          <div className="v2-field-value">{v.heightCm} <span className="v2-field-unit">см</span></div>
        </div>
        <button type="button" className="v2-stepbtn" disabled={v.heightCm <= 80} onClick={() => set('heightCm', Math.max(80, v.heightCm - 1))}><MaterialIcon name="remove" size={22} /></button>
        <button type="button" className="v2-stepbtn" disabled={v.heightCm >= 250} onClick={() => set('heightCm', Math.min(250, v.heightCm + 1))}><MaterialIcon name="add" size={22} /></button>
      </div>

      <div className="v2-field">
        <div className="v2-field-icon" style={{ background: 'color-mix(in srgb, var(--v2-lime) 20%, transparent)', color: 'var(--v2-lime-ink)' }}>
          <MaterialIcon name="monitor_weight" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="v2-field-label">Вес</div>
          <div className="v2-field-value">{v.weightKg.toFixed(1)} <span className="v2-field-unit">кг</span></div>
        </div>
        <button type="button" className="v2-stepbtn" disabled={v.weightKg <= 20} onClick={() => set('weightKg', Math.max(20, Math.round((v.weightKg - 0.5) * 10) / 10))}><MaterialIcon name="remove" size={22} /></button>
        <button type="button" className="v2-stepbtn" disabled={v.weightKg >= 400} onClick={() => set('weightKg', Math.min(400, Math.round((v.weightKg + 0.5) * 10) / 10))}><MaterialIcon name="add" size={22} /></button>
      </div>

      <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="v2-field-label">Индекс массы тела</span>
          <span style={{ font: '700 22px var(--v2-font-num)' }}>{bmi.toFixed(1)}</span>
        </div>
        <div className="v2-bmirow">
          <div style={{ flex: 18.5, height: 8, background: 'var(--v2-blu)' }} />
          <div style={{ flex: 6.5, height: 8, background: 'var(--v2-lime)' }} />
          <div style={{ flex: 5, height: 8, background: 'var(--v2-yel)' }} />
          <div style={{ flex: 10, height: 8, background: 'var(--v2-pnk)' }} />
          <div className="v2-bmimark" style={{ left: `${bmiMarkPct(bmi)}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 11px var(--v2-font-num)', color: 'var(--v2-mu)' }}>
          <span>0</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
        </div>
      </div>

      <div className="v2-label" style={{ marginTop: 2 }}>Цель</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GOALS.map((g) => (
          <button type="button" key={g.value} className={`v2-pickrow${v.goal === g.value ? ' on' : ''}`} onClick={() => set('goal', g.value)}>
            <div className="v2-pickrow-icon"><MaterialIcon name={g.icon} size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="ttl">{g.title}</div>
              <div className="dsc">{g.desc}</div>
            </div>
            <div className="pct">{g.badge}</div>
          </button>
        ))}
      </div>

      <div className="v2-label" style={{ marginTop: 2 }}>Активность</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ACTIVITIES.map((a) => (
          <button type="button" key={a.value} className={`v2-pickrow${v.activity === a.value ? ' on' : ''}`} onClick={() => set('activity', a.value)}>
            <div className="v2-barset">
              {[1, 2, 3, 4].map((i) => <i key={i} className={i <= a.bars ? 'on' : ''} style={{ height: `${i * 22}%` }} />)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="ttl">{a.title}</div>
              <div className="dsc">{a.desc}</div>
            </div>
            <div className="pct">{a.coef}</div>
          </button>
        ))}
      </div>

      <div className="v2-resulthero">
        <MaterialIcon name="local_fire_department" size={150} style={{ position: 'absolute', right: -16, top: -18, opacity: 0.1 }} />
        <div style={{ font: '700 12px var(--v2-font-num)', letterSpacing: '.1em', position: 'relative' }}>ВАША ДНЕВНАЯ НОРМА</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, position: 'relative' }}>
          <span style={{ font: '700 56px/0.95 var(--v2-font-num)', letterSpacing: '-.04em' }}>{norm.dailyKcal.toLocaleString('ru-RU')}</span>
          <span style={{ font: '700 16px var(--v2-font-text)' }}>ккал</span>
        </div>
        <div style={{ display: 'flex', height: 10, gap: 2, marginTop: 6, position: 'relative' }}>
          <div style={{ width: `${protPct}%`, background: 'var(--v2-vio)' }} />
          <div style={{ width: `${fatPct}%`, background: 'var(--v2-yel)' }} />
          <div style={{ width: `${carbPct}%`, background: 'var(--v2-tea)' }} />
        </div>
      </div>

      <div className="v2-macrogrid3">
        <div className="v2-macrotile">
          <div className="v2-macro-row"><span className="v2-macro-dot" style={{ background: 'var(--v2-vio)' }} /><span style={{ font: '600 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Белки</span></div>
          <div style={{ font: '700 26px var(--v2-font-num)', letterSpacing: '-.03em' }}>{norm.protein}<span style={{ font: '500 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}> г</span></div>
        </div>
        <div className="v2-macrotile">
          <div className="v2-macro-row"><span className="v2-macro-dot" style={{ background: 'var(--v2-yel)' }} /><span style={{ font: '600 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Жиры</span></div>
          <div style={{ font: '700 26px var(--v2-font-num)', letterSpacing: '-.03em' }}>{norm.fat}<span style={{ font: '500 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}> г</span></div>
        </div>
        <div className="v2-macrotile">
          <div className="v2-macro-row"><span className="v2-macro-dot" style={{ background: 'var(--v2-tea)' }} /><span style={{ font: '600 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Углеводы</span></div>
          <div style={{ font: '700 26px var(--v2-font-num)', letterSpacing: '-.03em' }}>{norm.carbs}<span style={{ font: '500 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}> г</span></div>
        </div>
      </div>

      <button type="button" className="v2-btn" onClick={submit} disabled={saving}>
        {saving ? 'Сохраняю…' : submitLabel}
        <span className="v2-btn-ic"><MaterialIcon name={saving ? 'hourglass_top' : 'arrow_forward'} size={22} /></span>
      </button>
    </>
  )
}

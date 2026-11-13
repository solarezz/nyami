import { useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { BottomNavV2 } from '../components/BottomNavV2'
import { useToast } from '../components/ui/Toast'
import { useData } from '../data/store'
import type { Screen } from '../App'

export function Progress({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { day, week, me, setWeight } = useData()
  const toast = useToast()
  const [logging, setLogging] = useState(false)
  const [draft, setDraft] = useState(0)
  const [saving, setSaving] = useState(false)
  if (!day || !week) return null

  const NORM = day.goalKcal
  const weekChart = week.days
  const weightSeries = week.weightSeries
  const hasWeight = weightSeries.length > 0
  // Потолок графика подстраивается под норму и фактические пики недели.
  const SCALE = Math.max(NORM, ...weekChart.map((d) => d.kcal)) * 1.1 || 2400
  const loggedDays = weekChart.filter((d) => d.kcal > 0).length
  const avg = loggedDays ? Math.round(weekChart.reduce((s, d) => s + d.kcal, 0) / loggedDays) : 0
  const lastWeight = hasWeight ? weightSeries[weightSeries.length - 1] : 0

  // Изменение веса: последний замер минус первый (0, если замер один).
  const wDelta = weightSeries.length > 1 ? lastWeight - weightSeries[0] : 0
  const wDeltaStr = hasWeight ? `${wDelta < 0 ? '−' : wDelta > 0 ? '+' : ''}${Math.abs(wDelta).toFixed(1)}` : '—'
  const wDeltaGood = wDelta <= 0

  const startLogging = () => {
    setDraft(hasWeight ? lastWeight : me?.profile.weightKg ?? 70)
    setLogging(true)
  }
  const saveWeight = async () => {
    if (saving) return
    setSaving(true)
    try {
      await setWeight(draft)
      setLogging(false)
      toast('Вес сохранён', 'success')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen v2-screen gap fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="v2-h1">Прогресс</div>
        <div className="v2-streak"><MaterialIcon name="local_fire_department" fill size={18} />{day.streak}</div>
      </div>

      <div className="scrollarea">
        <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="v2-field-label">Вес</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ font: '700 34px/1 var(--v2-font-num)', letterSpacing: '-.04em' }}>{hasWeight ? lastWeight.toFixed(1) : '—'}</span>
                <span style={{ font: '500 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}>кг</span>
              </div>
            </div>
            {hasWeight && (
              <span style={{
                padding: '5px 8px', borderRadius: 6, font: '700 13px var(--v2-font-num)',
                background: wDeltaGood ? 'color-mix(in srgb, var(--v2-lime) 18%, transparent)' : 'color-mix(in srgb, var(--v2-pnk) 18%, transparent)',
                color: wDeltaGood ? 'var(--v2-lime-ink)' : 'var(--v2-pnk-ink)',
              }}>
                {wDeltaStr}
              </span>
            )}
          </div>
          {hasWeight ? (
            <svg width="100%" height="90" viewBox="0 0 326 90" preserveAspectRatio="none" style={{ display: 'block' }}>
              <polyline points={chartPoints(weightSeries, 326, 90)} fill="none" stroke="var(--v2-lime-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          ) : (
            <div style={{ font: '600 12px var(--v2-font-text)', color: 'var(--v2-mu)', padding: '10px 0' }}>Пока нет замеров за неделю</div>
          )}
        </div>

        <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: '700 15px var(--v2-font-text)' }}>Калории за неделю</span>
            <span style={{ font: '600 12px var(--v2-font-num)', color: 'var(--v2-mu)' }}>СРЕДНЕЕ {avg.toLocaleString('ru-RU')}</span>
          </div>
          <div style={{ position: 'relative', height: 110, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${Math.min(100, (NORM / SCALE) * 100)}%`, borderTop: '1.5px dashed var(--v2-org-ink)' }} />
            {weekChart.map((d) => (
              <div key={d.label} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ height: `${Math.min(100, (d.kcal / SCALE) * 100)}%`, borderRadius: 3, background: d.today ? 'var(--v2-lime)' : 'var(--v2-org)' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {weekChart.map((d) => <div key={d.label} style={{ flex: 1, textAlign: 'center', font: '600 11px var(--v2-font-text)', color: 'var(--v2-mu)' }}>{d.label}</div>)}
          </div>
        </div>

        <div className="v2-mini-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="v2-mini-icon" style={{ background: 'color-mix(in srgb, var(--v2-lime) 20%, transparent)', color: 'var(--v2-lime-ink)' }}><MaterialIcon name="monitor_weight" size={18} /></div>
            <button type="button" className="v2-stepbtn" style={{ width: 30, height: 30 }} onClick={() => (logging ? setLogging(false) : startLogging())} aria-label={logging ? 'Отмена' : 'Записать вес'}>
              <MaterialIcon name={logging ? 'close' : 'add'} size={18} />
            </button>
          </div>
          {logging ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="v2-stepbtn" onClick={() => setDraft((d) => Math.max(20, Math.round((d - 0.1) * 10) / 10))}><MaterialIcon name="remove" size={18} /></button>
                <span style={{ flex: 1, textAlign: 'center', font: '700 22px var(--v2-font-num)' }}>{draft.toFixed(1)}</span>
                <button type="button" className="v2-stepbtn" onClick={() => setDraft((d) => Math.min(400, Math.round((d + 0.1) * 10) / 10))}><MaterialIcon name="add" size={18} /></button>
              </div>
              <button type="button" className="v2-btn" style={{ height: 44 }} onClick={saveWeight} disabled={saving}>
                {saving ? 'Сохраняю…' : 'Сохранить'}<span className="v2-btn-ic" style={{ width: 32, height: 32 }}><MaterialIcon name="check" size={18} /></span>
              </button>
            </div>
          ) : (
            <div style={{ font: '600 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Новый замер · {hasWeight ? `сейчас ${lastWeight.toFixed(1)} кг` : 'пока нет данных'}</div>
          )}
        </div>
      </div>

      <BottomNavV2 active="progress" onNavigate={onNavigate} />
    </div>
  )
}

// Полилиния для графика веса: значения → точки, выше значение — выше точка.
function chartPoints(values: number[], w: number, h: number): string {
  if (values.length < 2) return `4,${h - 6} ${w - 4},${h - 6}`
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = 4 + (i / (values.length - 1)) * (w - 8)
      const y = 10 + ((max - v) / span) * (h - 20)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

import { useEffect, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { BottomNavV3 } from '../components/BottomNavV3'
import { useToast } from '../components/ui/Toast'
import { useData } from '../data/store'
import { api } from '../api'
import type { Screen } from '../App'
import type { TrainingStats } from '../types'

const PERIODS = ['Неделя', 'Месяц', 'Год'] as const

export function Progress({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { day, week, me, setWeight } = useData()
  const toast = useToast()
  const [period, setPeriod] = useState(0)
  const [logging, setLogging] = useState(false)
  const [draft, setDraft] = useState(0)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<TrainingStats | null>(null)
  useEffect(() => { api.getTrainingStats().then(setStats).catch(() => {}) }, [])
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
    <div className="screen v3-screen gap fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em' }}>Прогресс</div>
        <button type="button" className="v3-iconbtn" aria-label="Напоминания" onClick={() => onNavigate('profile')}><MaterialIcon name="notifications" variant="rounded" size={22} /></button>
      </div>

      <div className="scrollarea">
        <div className="v3-segrow">
          {PERIODS.map((label, i) => (
            <button key={label} type="button" className={`v3-seg${period === i ? ' on' : ''}`} onClick={() => setPeriod(i)}>{label}</button>
          ))}
        </div>

        {period !== 0 ? (
          <div className="v3-card" style={{ textAlign: 'center', color: 'var(--v3-mu)', padding: '32px 16px' }}>
            Статистика за {PERIODS[period].toLowerCase()} появится здесь — скоро
          </div>
        ) : (
          <>
            <div className="v3-card" style={{ position: 'relative', padding: '18px 14px 12px' }}>
              {hasWeight && <div className="v3-chartbadge">{lastWeight.toFixed(1)} кг</div>}
              {hasWeight ? (
                <svg viewBox="0 0 330 170" style={{ width: '100%', height: 170, display: 'block' }}>
                  <line x1={24} y1={20} x2={330} y2={20} stroke="var(--v3-line)" />
                  <line x1={24} y1={80} x2={330} y2={80} stroke="var(--v3-line)" />
                  <line x1={24} y1={140} x2={330} y2={140} stroke="var(--v3-line)" />
                  <polygon points={areaPoints(weightSeries, 24, 316, 20, 150)} fill="var(--v3-green-soft)" />
                  <polyline points={linePoints(weightSeries, 24, 316, 20, 150)} fill="none" stroke="var(--v3-green)" strokeWidth={3} strokeLinecap="round" />
                  {(() => { const p = lastPoint(weightSeries, 24, 316, 20, 150); return <circle cx={p[0]} cy={p[1]} r={6} fill="var(--v3-card)" stroke="var(--v3-green)" strokeWidth={3} /> })()}
                </svg>
              ) : (
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)', padding: '30px 0', textAlign: 'center' }}>Пока нет замеров за неделю</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 4px 0 24px', fontSize: 12, color: 'var(--v3-mu)' }}>
                {weekChart.map((d) => <span key={d.label}>{d.label}</span>)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Калории за неделю</span>
              <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>СРЕДНЕЕ {avg.toLocaleString('ru-RU')}</span>
            </div>
            <div className="v3-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative', height: 110, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${Math.min(100, (NORM / SCALE) * 100)}%`, borderTop: '1.5px dashed #F07A2B' }} />
                {weekChart.map((d) => (
                  <div key={d.label} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ height: `${Math.min(100, (d.kcal / SCALE) * 100)}%`, borderRadius: 3, background: d.today ? 'var(--v3-green)' : '#FFA23D' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {weekChart.map((d) => <div key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--v3-mu)' }}>{d.label}</div>)}
              </div>
            </div>

            <div style={{ fontSize: 17, fontWeight: 700 }}>Статистика</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <div className="v3-statcard">
                <div className="v3-staticon" style={{ background: 'var(--v3-green-soft)' }}><MaterialIcon name="fitness_center" variant="rounded" size={20} style={{ color: 'var(--v3-green)' }} /></div>
                <div className="num" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>{stats?.sessionsCount ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--v3-mu)', lineHeight: 1.25 }}>тренировок</div>
              </div>
              <div className="v3-statcard">
                <div className="v3-staticon" style={{ background: 'var(--v3-vio-track)' }}><MaterialIcon name="repeat" variant="rounded" size={20} style={{ color: 'var(--v3-vio)' }} /></div>
                <div className="num" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>{stats?.completedSets ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--v3-mu)', lineHeight: 1.25 }}>подходов</div>
              </div>
              <div className="v3-statcard">
                <div className="v3-staticon" style={{ background: 'var(--v3-org-track)' }}><MaterialIcon name="schedule" variant="rounded" size={20} style={{ color: '#F07A2B' }} /></div>
                <div className="num" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>{stats?.totalMinutes ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--v3-mu)', lineHeight: 1.25 }}>минут</div>
              </div>
            </div>

            <div className="v3-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--v3-mu)' }}>Текущий вес</div>
                <div className="num" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.03em', marginTop: 2 }}>{hasWeight ? lastWeight.toFixed(1) : '—'} <span style={{ fontSize: 15, color: 'var(--v3-mu)', fontWeight: 500 }}>кг</span></div>
                {hasWeight && (
                  <div className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 6, padding: '4px 10px', borderRadius: 10, background: wDeltaGood ? 'var(--v3-green-soft)' : '#FDE3E8', color: wDeltaGood ? 'var(--v3-green-deep)' : '#C2264A', fontSize: 13, fontWeight: 700 }}>
                    <MaterialIcon name={wDeltaGood ? 'south' : 'north'} variant="rounded" size={16} />{Math.abs(wDelta).toFixed(1)} кг
                  </div>
                )}
              </div>
              <button type="button" className="v3-mini-stepbtn" style={{ width: 44, height: 44, background: logging ? 'var(--v3-org-track)' : 'var(--v3-green-soft)', color: logging ? '#F07A2B' : 'var(--v3-green)' }} onClick={() => (logging ? setLogging(false) : startLogging())} aria-label={logging ? 'Отмена' : 'Записать вес'}>
                <MaterialIcon name={logging ? 'close' : 'add'} variant="rounded" size={22} />
              </button>
            </div>

            {logging && (
              <div className="v3-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button" className="v3-mini-stepbtn" style={{ background: 'var(--v3-line)' }} onClick={() => setDraft((d) => Math.max(20, Math.round((d - 0.1) * 10) / 10))}><MaterialIcon name="remove" variant="rounded" size={18} /></button>
                  <span className="num" style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 700 }}>{draft.toFixed(1)}</span>
                  <button type="button" className="v3-mini-stepbtn" style={{ background: 'var(--v3-line)' }} onClick={() => setDraft((d) => Math.min(400, Math.round((d + 0.1) * 10) / 10))}><MaterialIcon name="add" variant="rounded" size={18} /></button>
                </div>
                <button type="button" className="v3-btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={saveWeight} disabled={saving}>
                  {saving ? 'Сохраняю…' : 'Сохранить'}<MaterialIcon name="check" variant="rounded" size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNavV3 active="progress" onNavigate={onNavigate} />
    </div>
  )
}

// Линия/область графика веса: значения → точки в заданном прямоугольнике (x0..x1, y0..y1).
function weightPoints(values: number[], x0: number, x1: number, y0: number, y1: number): [number, number][] {
  if (values.length < 2) return [[x0, y1], [x1, y1]]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values.map((v, i) => [x0 + (i / (values.length - 1)) * (x1 - x0), y0 + ((max - v) / span) * (y1 - y0)])
}
function linePoints(values: number[], x0: number, x1: number, y0: number, y1: number): string {
  return weightPoints(values, x0, x1, y0, y1).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}
function areaPoints(values: number[], x0: number, x1: number, y0: number, y1: number): string {
  const pts = weightPoints(values, x0, x1, y0, y1)
  const bottom = y1 + 20
  return `${x0},${bottom} ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} ${x1},${bottom}`
}
function lastPoint(values: number[], x0: number, x1: number, y0: number, y1: number): [number, number] {
  const pts = weightPoints(values, x0, x1, y0, y1)
  return pts[pts.length - 1]
}

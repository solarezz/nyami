import { Icon } from '../components/Icons'
import { BottomNav } from '../components/BottomNav'
import { useData } from '../data/store'
import type { Screen } from '../App'

const SCALE = 2400 // верх шкалы графика недели

export function Progress({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { day, week } = useData()
  if (!day || !week) return null

  const NORM = day.goalKcal
  const weekChart = week.days
  const weightSeries = week.weightSeries
  const loggedDays = weekChart.filter((d) => d.kcal > 0).length
  const avg = loggedDays ? Math.round(weekChart.reduce((s, d) => s + d.kcal, 0) / loggedDays) : 0
  const water = day.water
  const lastWeight = weightSeries[weightSeries.length - 1] ?? 0

  // Изменение веса: последний замер минус первый (0, если замер один).
  const wDelta = weightSeries.length > 1 ? lastWeight - weightSeries[0] : 0
  const wDeltaStr = `${wDelta < 0 ? '−' : wDelta > 0 ? '+' : ''}${Math.abs(wDelta).toFixed(1)}`
  const wDeltaColor = wDelta < 0 ? 'var(--accent)' : wDelta > 0 ? 'var(--carb)' : 'var(--sub)'

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <div className="h2">Прогресс</div>
        <div className="flamepill"><Icon name="flame" />{day.streak}</div>
      </div>

      <div className="scrollarea">
        <div className="stat3">
          <div className="statc"><div className="n">{avg.toLocaleString('ru-RU')}</div><div className="s">ср. ккал</div></div>
          <div className="statc"><div className="n" style={{ color: wDeltaColor }}>{wDeltaStr}</div><div className="s">кг</div></div>
          <div className="statc"><div className="n" style={{ color: 'var(--carb)' }}><Icon name="flame" />{day.streak}</div><div className="s">дней</div></div>
        </div>

        <div className="card">
          <div className="h2" style={{ fontSize: 16 }}>Калории за неделю</div>
          <div className="weekchart">
            <div className="tgt" style={{ bottom: `${(NORM / SCALE) * 100}%` }}><span>норма</span></div>
            {weekChart.map((d) => (
              <div className={`wb${d.today ? ' on' : ''}`} key={d.label}>
                <i style={{ height: `${Math.min(100, (d.kcal / SCALE) * 100)}%` }} />
                <small>{d.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="tiles2">
          <div className="tile">
            <div className="th"><Icon name="flame" style={{ color: 'var(--carb)' }} />Калории</div>
            <div className="bn">{day.eatenKcal.toLocaleString('ru-RU')}<small> ккал</small></div>
            <svg className="mini" viewBox="0 0 120 34" preserveAspectRatio="none">
              <polyline points={spark(weekChart.map((d) => d.kcal))} fill="none" stroke="var(--carb)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="tile">
            <div className="th"><Icon name="drop" style={{ color: 'var(--fat)' }} />Вода</div>
            <div className="bn">{water.done}<small> / {water.goal} стак</small></div>
            <div style={{ display: 'flex', gap: 3, marginTop: 12 }}>
              {Array.from({ length: water.goal }).map((_, i) => (
                <i key={i} style={{ flex: 1, height: 22, borderRadius: 4, background: i < water.done ? 'var(--fat)' : 'var(--line)' }} />
              ))}
            </div>
          </div>

          <div className="tile">
            <div className="th"><Icon name="scale" style={{ color: 'var(--accent)' }} />Вес</div>
            <div className="bn">{lastWeight.toFixed(1)}<small> кг</small></div>
            <svg className="mini" viewBox="0 0 120 34" preserveAspectRatio="none">
              <polyline points={spark(weightSeries)} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="tile">
            <div className="th"><Icon name="flame" style={{ color: 'var(--prot)' }} />Серия</div>
            <div className="bn" style={{ color: 'var(--carb)' }}>{day.streak}<small> дней</small></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 12, fontWeight: 800 }}>
              {day.streak > 0 ? 'Так держать 🔥' : 'Начни серию сегодня'}
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="progress" onNavigate={onNavigate} />
    </div>
  )
}

// Мини-спарклайн: значения → точки. Больше значение — выше точка.
function spark(values: number[]): string {
  if (values.length < 2) return '4,17 116,17'
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = 4 + (i / (values.length - 1)) * 112
      const y = 4 + ((max - v) / span) * 26
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

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
  const avg = Math.round(weekChart.reduce((s, d) => s + d.kcal, 0) / weekChart.length)
  const weightPts = weightPolyline(weightSeries)
  const water = day.water

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <div className="h2">Прогресс</div>
        <div className="flamepill"><Icon name="flame" />{day.streak}</div>
      </div>

      <div className="scrollarea">
        <div className="stat3">
          <div className="statc"><div className="n">{avg.toLocaleString('ru-RU')}</div><div className="s">ср. ккал</div></div>
          <div className="statc"><div className="n" style={{ color: 'var(--accent)' }}>−2.0</div><div className="s">кг / 3 нед</div></div>
          <div className="statc"><div className="n" style={{ color: 'var(--carb)' }}><Icon name="flame" />{day.streak}</div><div className="s">дней</div></div>
        </div>

        <div className="card">
          <div className="h2" style={{ fontSize: 16 }}>Калории за неделю</div>
          <div className="weekchart">
            <div className="tgt" style={{ bottom: `${(NORM / SCALE) * 100}%` }}><span>норма</span></div>
            {weekChart.map((d) => (
              <div className={`wb${d.today ? ' on' : ''}`} key={d.label}>
                <i style={{ height: `${(d.kcal / SCALE) * 100}%` }} />
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
              <polyline points="4,24 24,18 44,22 64,12 84,16 116,8" fill="none" stroke="var(--carb)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
            <div className="bn">{weightSeries[weightSeries.length - 1].toFixed(1)}<small> кг</small></div>
            <svg className="mini" viewBox="0 0 120 34" preserveAspectRatio="none">
              <polyline points={weightPts} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="tile">
            <div className="th"><Icon name="flame" style={{ color: 'var(--prot)' }} />Серия</div>
            <div className="bn" style={{ color: 'var(--carb)' }}>{day.streak}<small> дней</small></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 12, fontWeight: 800 }}>Личный рекорд — 11 🔥</div>
          </div>
        </div>
      </div>

      <BottomNav active="progress" onNavigate={onNavigate} />
    </div>
  )
}

function weightPolyline(series: number[]): string {
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  return series
    .map((v, i) => {
      const x = 4 + (i / (series.length - 1)) * 112
      const y = 4 + ((max - v) / span) * 26
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

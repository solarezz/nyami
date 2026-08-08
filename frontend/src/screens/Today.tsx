import { Wordmark } from '../components/Wordmark'
import { Icon } from '../components/Icons'
import { RingStat } from '../components/Ring'
import { BottomNav } from '../components/BottomNav'
import { mockWeekDates } from '../data/mock'
import { useData } from '../data/store'
import type { Screen } from '../App'
import type { Meal } from '../types'

const macroMeta = [
  { key: 'protein', emoji: '🍗', label: 'белки', color: 'var(--prot)', track: 'var(--prot-soft)' },
  { key: 'carbs', emoji: '🌾', label: 'углев.', color: 'var(--carb)', track: 'var(--carb-soft)' },
  { key: 'fat', emoji: '🥑', label: 'жиры', color: 'var(--fat)', track: 'var(--fat-soft)' },
] as const

const thumbBg = ['var(--carb-soft)', 'var(--accent-soft)', 'var(--prot-soft)']

export function Today({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { day } = useData()
  if (!day) return null
  const d = day
  const left = d.goalKcal - d.eatenKcal
  const eatenFrac = d.eatenKcal / d.goalKcal

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <Wordmark size={23} />
        <div className="flamepill"><Icon name="flame" />{d.streak}</div>
      </div>

      <div className="week">
        {mockWeekDates.map((w) => (
          <button key={w.num} className={`wd${w.today ? ' on' : ''}`}>
            <span className="dn">{w.dn}</span>
            <span className="dc">{w.num}</span>
          </button>
        ))}
      </div>

      <div className="scrollarea">
        <div className="card calcard">
          <div className="l">
            <div className="big">{left}</div>
            <div className="lbl">Калорий осталось</div>
            <div className="pill">
              <Icon name="flame" style={{ width: 14, height: 14, fill: 'var(--accent)' }} />
              {d.eatenKcal.toLocaleString('ru-RU')} съедено
            </div>
          </div>
          <RingStat
            progress={eatenFrac} color="var(--accent)" track="var(--scr)" size={118}
            label={<span style={{ fontSize: 27, color: 'var(--ink)' }}>{Math.round(eatenFrac * 100)}%</span>}
          />
        </div>

        <div className="macros3">
          {macroMeta.map((m) => {
            const mp = d.macros[m.key]
            const frac = mp.eaten / mp.goal
            const rest = mp.goal - mp.eaten
            return (
              <div className="mcard" key={m.key}>
                <div className="em">{m.emoji}</div>
                <RingStat
                  progress={frac} color={m.color} track={m.track} size={64} stroke={9}
                  label={<span style={{ fontSize: 15, color: 'var(--ink)' }}>{Math.round(frac * 100)}%</span>}
                />
                <div className="rest">{rest} г · {m.label}</div>
              </div>
            )
          })}
        </div>

        <div className="rowhead">
          <div className="h2">Приёмы пищи</div>
          <button className="add" onClick={() => onNavigate('add')}><Icon name="plus" /></button>
        </div>

        {d.meals.map((meal, i) => (
          <MealCard key={meal.id} meal={meal} bg={thumbBg[i % thumbBg.length]} />
        ))}
      </div>

      <BottomNav active="today" onNavigate={onNavigate} />
    </div>
  )
}

function MealCard({ meal, bg }: { meal: Meal; bg: string }) {
  return (
    <button className="meal">
      <div className="thumb" style={{ background: bg }}>{meal.emoji}</div>
      <div className="mm">
        <div className="nm">{meal.name}</div>
        <div className="chips">
          <span><i style={{ background: 'var(--prot)' }} />{meal.protein} Б</span>
          <span><i style={{ background: 'var(--carb)' }} />{meal.carbs} У</span>
          <span><i style={{ background: 'var(--fat)' }} />{meal.fat} Ж</span>
        </div>
      </div>
      <div className="rt">
        <div className="kc">{meal.kcal}<small> ккал</small></div>
        <div className="tm">{meal.time}</div>
      </div>
    </button>
  )
}

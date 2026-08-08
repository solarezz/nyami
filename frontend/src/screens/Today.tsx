import { Wordmark } from '../components/Wordmark'
import { Icon } from '../components/Icons'
import { RingStat } from '../components/Ring'
import { BottomNav } from '../components/BottomNav'
import { useData } from '../data/store'
import { haptic, showAlert } from '../telegram'
import type { Screen } from '../App'
import type { Meal } from '../types'

const macroMeta = [
  { key: 'protein', emoji: '🍗', label: 'белки', color: 'var(--prot)', track: 'var(--prot-soft)' },
  { key: 'carbs', emoji: '🌾', label: 'углев.', color: 'var(--carb)', track: 'var(--carb-soft)' },
  { key: 'fat', emoji: '🥑', label: 'жиры', color: 'var(--fat)', track: 'var(--fat-soft)' },
] as const

const thumbBg = ['var(--carb-soft)', 'var(--accent-soft)', 'var(--prot-soft)']
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function weekDates() {
  const today = new Date()
  const out: { dn: string; num: number; today: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push({ dn: i === 0 ? 'Сег' : WD[d.getDay()], num: d.getDate(), today: i === 0 })
  }
  return out
}

export function Today({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { day, deleteMeal, setWater } = useData()
  if (!day) return null
  const d = day
  const left = d.goalKcal - d.eatenKcal
  const eatenFrac = d.eatenKcal / d.goalKcal

  const changeWater = (delta: number) => {
    haptic('light')
    setWater(Math.max(0, d.water.done + delta))
  }

  const onDelete = async (meal: Meal) => {
    haptic('medium')
    try {
      await deleteMeal(meal.id)
    } catch {
      showAlert('Не удалось удалить приём. Попробуй ещё раз.')
    }
  }

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <Wordmark size={23} />
        <div className="flamepill"><Icon name="flame" />{d.streak}</div>
      </div>

      <div className="week">
        {weekDates().map((w) => (
          <div key={w.num} className={`wd${w.today ? ' on' : ''}`}>
            <span className="dn">{w.dn}</span>
            <span className="dc">{w.num}</span>
          </div>
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
            const frac = mp.goal ? mp.eaten / mp.goal : 0
            const rest = Math.max(0, mp.goal - mp.eaten)
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

        <div className="card">
          <div className="rowhead" style={{ marginBottom: 10 }}>
            <div className="h2" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="drop" style={{ color: 'var(--fat)', width: 18, height: 18 }} />Вода
            </div>
            <div className="stepper">
              <b onClick={() => changeWater(-1)}><Icon name="minus" /></b>
              <span className="sv">{d.water.done} / {d.water.goal}</span>
              <b onClick={() => changeWater(1)}><Icon name="plus" /></b>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: d.water.goal }).map((_, i) => {
              const filled = i < d.water.done
              return (
                <span key={i} style={{
                  flex: 1, height: 22, borderRadius: 6,
                  background: filled ? 'var(--fat)' : 'transparent',
                  boxShadow: filled ? 'none' : 'inset 0 0 0 1.5px color-mix(in srgb, var(--fat) 38%, transparent)',
                }} />
              )
            })}
          </div>
        </div>

        <div className="rowhead">
          <div className="h2">Приёмы пищи</div>
          <button className="add" onClick={() => onNavigate('add')}><Icon name="plus" /></button>
        </div>

        {d.meals.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--sub)', fontWeight: 800, padding: '22px 18px' }}>
            Пока пусто. Добавь первый приём 👇
          </div>
        ) : (
          d.meals.map((meal, i) => (
            <MealCard key={meal.id} meal={meal} bg={thumbBg[i % thumbBg.length]} onDelete={() => onDelete(meal)} />
          ))
        )}
      </div>

      <BottomNav active="today" onNavigate={onNavigate} />
    </div>
  )
}

function MealCard({ meal, bg, onDelete }: { meal: Meal; bg: string; onDelete: () => void }) {
  return (
    <div className="meal">
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
      <button className="del" onClick={onDelete} aria-label="Удалить"><Icon name="trash" /></button>
    </div>
  )
}

import { Wordmark } from '../components/Wordmark'
import { Icon } from '../components/Icons'
import { RingStat } from '../components/Ring'
import { FastingCard } from '../components/FastingCard'
import { BottomNav } from '../components/BottomNav'
import { useData, todayStr } from '../data/store'
import { haptic, showAlert, showConfirm } from '../telegram'
import type { Screen } from '../App'
import type { Meal, MealType, Workout } from '../types'

const macroMeta = [
  { key: 'protein', emoji: '🍗', label: 'белки', color: 'var(--prot)', track: 'var(--prot-soft)' },
  { key: 'carbs', emoji: '🌾', label: 'углев.', color: 'var(--carb)', track: 'var(--carb-soft)' },
  { key: 'fat', emoji: '🥑', label: 'жиры', color: 'var(--fat)', track: 'var(--fat-soft)' },
] as const

const thumbBg = ['var(--carb-soft)', 'var(--accent-soft)', 'var(--prot-soft)']
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MEAL_GROUPS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Завтрак' },
  { type: 'lunch', label: 'Обед' },
  { type: 'dinner', label: 'Ужин' },
  { type: 'snack', label: 'Перекус' },
]

function weekDates() {
  const now = new Date()
  const out: { dn: string; num: number; date: string; today: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    out.push({
      dn: i === 0 ? 'Сег' : WD[d.getUTCDay()],
      num: d.getUTCDate(),
      date: d.toISOString().slice(0, 10),
      today: i === 0,
    })
  }
  return out
}

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
function dateLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_RU[m - 1]}`
}

export function Today({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { day, me, deleteMeal, deleteWorkout, setWater, selectedDate, isToday, setSelectedDate, setSelectedMealType } = useData()
  if (!day) return null
  const d = day
  // Сожжённые на тренировках калории увеличивают дневной остаток.
  const effectiveGoal = d.goalKcal + d.burnedKcal
  const left = effectiveGoal - d.eatenKcal
  const eatenFrac = d.eatenKcal / effectiveGoal
  const over = left < 0 // съедено больше нормы → показываем «перебор», а не минус

  const changeWater = (delta: number) => {
    haptic('light')
    setWater(Math.min(d.water.goal, Math.max(0, d.water.done + delta)))
  }

  const onDelete = async (meal: Meal) => {
    if (!(await showConfirm(`Удалить «${meal.name}»?`))) return
    haptic('medium')
    try {
      await deleteMeal(meal.id)
    } catch {
      showAlert('Не удалось удалить приём. Попробуй ещё раз.')
    }
  }

  const addToGroup = (type: MealType) => {
    haptic('light')
    setSelectedMealType(type)
    onNavigate('add')
  }

  const onDeleteWorkout = async (w: Workout) => {
    if (!(await showConfirm(`Удалить «${w.name}»?`))) return
    haptic('medium')
    try {
      await deleteWorkout(w.id)
    } catch {
      showAlert('Не удалось удалить тренировку. Попробуй ещё раз.')
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
          <button key={w.date} className={`wd${w.date === selectedDate ? ' on' : ''}`} onClick={() => setSelectedDate(w.date)}>
            <span className="dn">{w.dn}</span>
            <span className="dc">{w.num}</span>
          </button>
        ))}
      </div>

      {!isToday && (
        <div className="daybanner">
          <span>📅 {dateLabel(selectedDate)} — прошлый день</span>
          <button onClick={() => setSelectedDate(todayStr())}>Сегодня</button>
        </div>
      )}

      <div className="scrollarea">
        <div className="card calcard">
          <div className="l">
            <div className="big" style={over ? { color: 'var(--prot)' } : undefined}>{Math.abs(left)}</div>
            <div className="lbl">{over ? 'Калорий перебор' : 'Калорий осталось'}</div>
            <div className="pill">
              <Icon name="flame" style={{ width: 14, height: 14, fill: 'var(--accent)' }} />
              {d.eatenKcal.toLocaleString('ru-RU')} съедено
            </div>
            {d.burnedKcal > 0 && (
              <div className="pill" style={{ marginTop: 6 }}>
                💪 +{d.burnedKcal.toLocaleString('ru-RU')} сожжено
              </div>
            )}
          </div>
          <RingStat
            progress={eatenFrac} color={over ? 'var(--prot)' : 'var(--accent)'} track="var(--scr)" size={118}
            label={<span style={{ fontSize: 27, color: over ? 'var(--prot)' : 'var(--ink)' }}>{Math.round(eatenFrac * 100)}%</span>}
          />
        </div>

        {isToday && me && me.profile.fastingProtocol !== 'off' && (
          <FastingCard protocol={me.profile.fastingProtocol} eatStartHour={me.profile.eatStartHour} />
        )}

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
              <button type="button" onClick={() => changeWater(-1)} aria-label="Меньше воды"><Icon name="minus" /></button>
              <span className="sv">{d.water.done} / {d.water.goal}</span>
              <button type="button" onClick={() => changeWater(1)} aria-label="Больше воды"><Icon name="plus" /></button>
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
        </div>

        {MEAL_GROUPS.map((g) => {
          const items = d.meals.filter((m) => m.mealType === g.type)
          const sum = items.reduce((s, m) => s + m.kcal, 0)
          return (
            <div key={g.type} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div className="rowhead">
                <div className="tiny" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span>{g.label}</span>
                  {sum > 0 && <span style={{ textTransform: 'none', color: 'var(--accent)' }}>{sum} ккал</span>}
                </div>
                <button className="add" onClick={() => addToGroup(g.type)} aria-label={`Добавить: ${g.label}`}>
                  <Icon name="plus" />
                </button>
              </div>
              {items.map((meal, i) => (
                <MealCard key={meal.id} meal={meal} bg={thumbBg[i % thumbBg.length]} onDelete={() => onDelete(meal)} />
              ))}
            </div>
          )
        })}

        <div className="rowhead">
          <div className="h2">Тренировки</div>
          <button className="add" onClick={() => onNavigate('workout')}><Icon name="plus" /></button>
        </div>

        {d.workouts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--sub)', fontWeight: 800, padding: '18px' }}>
            Добавь тренировку — калории пойдут в плюс к остатку 💪
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {d.workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} onDelete={() => onDeleteWorkout(w)} />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="today" onNavigate={onNavigate} />
    </div>
  )
}

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  return (
    <div className="meal">
      <div className="thumb" style={{ background: 'var(--accent-soft)' }}>{workout.emoji}</div>
      <div className="mm">
        <div className="nm">{workout.name}</div>
        <div className="chips"><span className="muted" style={{ fontSize: 12 }}>{workout.minutes} мин · {workout.time}</span></div>
      </div>
      <div className="rt">
        <div className="kc" style={{ color: 'var(--accent)' }}>−{workout.kcal}<small> ккал</small></div>
      </div>
      <button className="del" onClick={onDelete} aria-label="Удалить"><Icon name="trash" /></button>
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

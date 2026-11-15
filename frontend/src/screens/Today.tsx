import { useEffect, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { NumberField } from '../components/NumberField'
import { FastingCard } from '../components/FastingCard'
import { BottomNavV3 } from '../components/BottomNavV3'
import { Avatar } from '../components/Avatar'
import { AiOverlay } from '../components/AiOverlay'
import { useData, todayStr } from '../data/store'
import { api } from '../api'
import { haptic, showAlert, showConfirm, getTelegramUser } from '../telegram'
import type { Screen } from '../App'
import type { Meal, MealType, Workout, ProgramDay, TrainingProgram, FrequentMeal } from '../types'

// Редизайн v3 — макет пользователя «Redesign _Сегодня_ screen/Fitness App.dc.html»,
// экран «01 · Сегодня» (светлая тема, Inter Tight, Material Symbols Rounded).
// Внешние декоративные картинки макета (эмодзи-CDN, 3D-иллюстрации) заменены на
// нативные эмодзи — проект принципиально не грузит сторонние ассеты.

const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MEAL_GROUPS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Завтрак' },
  { type: 'lunch', label: 'Обед' },
  { type: 'dinner', label: 'Ужин' },
  { type: 'snack', label: 'Перекус' },
]

// Локальные (НЕ UTC) календарные дни устройства — должны совпадать с todayStr()/бэкендом.
function weekDates() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const out: { dn: string; num: number; date: string; today: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push({
      dn: i === 0 ? 'Сег' : WD[d.getDay()],
      num: d.getDate(),
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
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

const RING_R = { outer: 50, mid: 39, inner: 28 }
const ringFrac = (eaten: number, goal: number) => (goal ? Math.max(0, Math.min(1, eaten / goal)) : 0)
const ringDash = (r: number, frac: number) => { const c = 2 * Math.PI * r; return `${c * frac} ${c}` }

function sparklinePath(values: number[], w: number, h: number): string {
  if (values.length < 2) return `2,${h - 10} ${w - 2},${h - 10}`
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = 2 + (i / (values.length - 1)) * (w - 4)
      const y = 6 + ((max - v) / span) * (h - 16)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function Today({
  onNavigate, onStartSession,
}: {
  onNavigate: (s: Screen) => void
  onStartSession: (sessionId: string, day: ProgramDay, programName: string) => void
}) {
  const {
    day, week, me, deleteMeal, updateMealItem, deleteMealItem, deleteWorkout, setWater, addMeal,
    selectedDate, isToday, setSelectedDate, setSelectedMealType,
  } = useData()

  // Тренировка на сегодня — из программы пользователя. Если под сегодняшний день недели
  // есть привязанный день программы — берём его, иначе первый день первой программы.
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [programDay, setProgramDay] = useState<ProgramDay | null>(null)
  const [starting, setStarting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [favorites, setFavorites] = useState<FrequentMeal[]>([])
  const [addingFav, setAddingFav] = useState<string | null>(null)

  const applyProgram = (p: TrainingProgram | null) => {
    setProgram(p)
    if (!p) { setProgramDay(null); return }
    const wd = new Date().getDay() === 0 ? 7 : new Date().getDay()
    setProgramDay(p.days.find((d) => d.weekday === wd) ?? p.days[0] ?? null)
  }

  useEffect(() => {
    api.getTrainingPrograms().then((programs) => applyProgram(programs[0] ?? null)).catch(() => {})
    api.getFrequent().then(setFavorites).catch(() => {})
  }, [])

  const startTraining = async () => {
    if (!program || !programDay || starting) return
    haptic('medium')
    setStarting(true)
    try {
      const session = await api.startTrainingSession({ programId: program.id, programDayId: programDay.id, name: `${program.name} · ${programDay.name}` })
      onStartSession(session.id, programDay, program.name)
    } catch {
      showAlert('Не удалось начать тренировку. Попробуй ещё раз.')
    } finally {
      setStarting(false)
    }
  }

  const generateProgram = async () => {
    if (generating) return
    haptic('medium')
    setGenerating(true)
    try {
      applyProgram(await api.generateTrainingProgram())
    } catch {
      showAlert('Не удалось создать программу. Попробуй ещё раз.')
    } finally {
      setGenerating(false)
    }
  }

  const quickAddFavorite = async (f: FrequentMeal) => {
    if (addingFav) return
    haptic('light')
    setAddingFav(f.name)
    try {
      // Масса неизвестна (частое блюдо хранит только итоговые КБЖУ) — 100 г нейтральная оценка порции.
      await addMeal({ name: f.name, emoji: f.emoji, items: [{ name: f.name, emoji: f.emoji, grams: 100, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }] })
    } catch {
      showAlert('Не удалось добавить. Попробуй ещё раз.')
    } finally {
      setAddingFav(null)
    }
  }

  if (!day) return null
  const d = day
  // Сожжённые на тренировках калории увеличивают дневной остаток.
  const effectiveGoal = d.goalKcal + d.burnedKcal
  const left = effectiveGoal - d.eatenKcal
  const over = left < 0 // съедено больше нормы → показываем «перебор», а не минус

  const muscleGroups = programDay ? [...new Set(programDay.exercises.map((e) => e.exercise.muscleGroup))] : []
  const totalSets = programDay ? programDay.exercises.reduce((s, e) => s + e.targetSets, 0) : 0
  const estMinutes = Math.round(totalSets * 2.5)

  const weightSeries = week?.weightSeries ?? []
  const lastWeight = weightSeries.length ? weightSeries[weightSeries.length - 1] : me?.profile.weightKg ?? 0

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

  const onChangeItemGrams = async (mealId: string, itemId: string, grams: number) => {
    try {
      await updateMealItem(mealId, itemId, grams)
    } catch {
      showAlert('Не удалось изменить массу. Попробуй ещё раз.')
    }
  }

  const onDeleteItem = async (mealId: string, itemId: string) => {
    haptic('medium')
    try {
      await deleteMealItem(mealId, itemId)
    } catch {
      showAlert('Это последний компонент приёма — удали весь приём целиком.')
    }
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

  const proteinLeft = Math.max(0, d.macros.protein.goal - d.macros.protein.eaten)

  return (
    <div className="screen v3-screen gap fade">
      {generating && <AiOverlay text="Создаю программу тренировок…" />}
      <div className="v3-topbar">
        <Avatar className="v3-avatar" photoUrl={getTelegramUser()?.photo_url} name={me?.user.firstName ?? 'Н'} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 19, fontWeight: 700, letterSpacing: '-.01em' }}>
          Привет, {me?.user.firstName ?? 'друг'} <span style={{ fontSize: 20 }}>👋</span>
        </div>
        <button type="button" className="v3-iconbtn" aria-label="Напоминания" onClick={() => onNavigate('profile')}>
          <MaterialIcon name="notifications" variant="rounded" size={22} />
        </button>
      </div>

      <div className="v3-daygrid">
        {weekDates().map((w, i) => {
          const logged = (week?.days[i]?.kcal ?? 0) > 0
          const selected = w.date === selectedDate
          return (
            <button key={w.date} type="button" className={`v3-daycell${selected ? ' sel' : ''}`} onClick={() => setSelectedDate(w.date)}>
              <span className="wd">{w.dn}</span>
              <span className="dn">{w.num}</span>
              <span className="dot" style={{ background: logged ? (selected ? 'var(--v3-bg-mid)' : 'var(--v3-green)') : 'transparent' }} />
            </button>
          )
        })}
      </div>

      {!isToday && (
        <div className="v3-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--v3-tip-bg)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--v3-green-deep)' }}>{dateLabel(selectedDate)} — прошлый день</span>
          <button type="button" onClick={() => setSelectedDate(todayStr())} style={{ background: 'var(--v3-green)', color: '#fff', fontWeight: 800, fontSize: 12, borderRadius: 999, padding: '6px 12px', border: 'none' }}>Сегодня</button>
        </div>
      )}

      <div className="scrollarea">
        {isToday && (programDay ? (
          <div className="v3-hero">
            <span className="msr" style={{ position: 'absolute', right: -20, top: -24, fontSize: 150, opacity: .18, transform: 'rotate(-20deg)', color: 'var(--v3-hero-ic)', pointerEvents: 'none' }}>fitness_center</span>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 210 }}>
              <div className="v3-hero-ic"><MaterialIcon name="fitness_center" variant="rounded" size={24} /></div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, opacity: .65, textTransform: 'uppercase', letterSpacing: '.04em' }}>Сегодня по плану</div>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.01em', marginTop: 4, textTransform: 'capitalize' }}>{programDay.name}</div>
                <div style={{ fontSize: 13, color: 'var(--v3-mu2)', marginTop: 2 }}>{muscleGroups.join(', ')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="v3-hero-stat"><div className="num" style={{ fontWeight: 800, fontSize: 15 }}>{programDay.exercises.length}</div><div style={{ fontSize: 10.5, color: 'var(--v3-mu2)' }}>упр.</div></div>
                <div className="v3-hero-stat"><div className="num" style={{ fontWeight: 800, fontSize: 15 }}>~{estMinutes}</div><div style={{ fontSize: 10.5, color: 'var(--v3-mu2)' }}>мин</div></div>
                <div className="v3-hero-stat"><div className="num" style={{ fontWeight: 800, fontSize: 15 }}>{totalSets}</div><div style={{ fontSize: 10.5, color: 'var(--v3-mu2)' }}>подх.</div></div>
              </div>
            </div>
            <button type="button" className="v3-hero-fab" onClick={startTraining} disabled={starting} aria-label="Начать тренировку">
              <MaterialIcon name={starting ? 'hourglass_top' : 'play_arrow'} variant="rounded" size={22} />
            </button>
          </div>
        ) : (
          <div className="v3-hero">
            <span className="msr" style={{ position: 'absolute', right: -20, top: -24, fontSize: 150, opacity: .18, transform: 'rotate(-20deg)', color: 'var(--v3-hero-ic)', pointerEvents: 'none' }}>fitness_center</span>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 190 }}>
              <div className="v3-hero-ic"><MaterialIcon name="fitness_center" variant="rounded" size={26} /></div>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.01em' }}>Добавить тренировку</div>
              <div style={{ fontSize: 14, color: 'var(--v3-mu2)', lineHeight: 1.4 }}>Программы пока нет — ИИ составит её под тебя</div>
            </div>
            <button type="button" className="v3-hero-fab" onClick={generateProgram} disabled={generating} aria-label="Создать программу с ИИ">
              <MaterialIcon name={generating ? 'hourglass_top' : 'auto_awesome'} variant="rounded" size={22} />
            </button>
          </div>
        ))}

        {isToday && me && me.profile.fastingProtocol !== 'off' && (
          <FastingCard protocol={me.profile.fastingProtocol} eatStartHour={me.profile.eatStartHour} />
        )}

        <div className="v3-card v3-nutri-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(160deg,#FFE9D8,#FFD7BA)', display: 'grid', placeItems: 'center' }}>
              <MaterialIcon name="restaurant" variant="rounded" size={21} style={{ color: '#F07A2B' }} />
            </div>
            <div style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>Питание</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--v3-ink)' }}>{d.eatenKcal.toLocaleString('ru-RU')} <span style={{ color: 'var(--v3-mu)', fontWeight: 500 }}>/ {effectiveGoal.toLocaleString('ru-RU')} ккал</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--v3-mu)' }}>{over ? 'Перебор' : 'Осталось'}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span className="num" style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>{Math.abs(left)}</span>
                <span style={{ fontSize: 16, color: 'var(--v3-mu)', fontWeight: 500 }}>ккал</span>
              </div>
            </div>
            <div style={{ position: 'relative', width: 112, height: 112, flex: 'none' }}>
              <svg width={112} height={112} viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={56} cy={56} r={RING_R.outer} fill="none" stroke="var(--v3-vio-track)" strokeWidth={8} />
                <circle cx={56} cy={56} r={RING_R.outer} fill="none" stroke="var(--v3-vio)" strokeWidth={8} strokeLinecap="round" strokeDasharray={ringDash(RING_R.outer, ringFrac(d.macros.protein.eaten, d.macros.protein.goal))} />
                <circle cx={56} cy={56} r={RING_R.mid} fill="none" stroke="var(--v3-org-track)" strokeWidth={8} />
                <circle cx={56} cy={56} r={RING_R.mid} fill="none" stroke="var(--v3-org)" strokeWidth={8} strokeLinecap="round" strokeDasharray={ringDash(RING_R.mid, ringFrac(d.macros.fat.eaten, d.macros.fat.goal))} />
                <circle cx={56} cy={56} r={RING_R.inner} fill="none" stroke="var(--v3-blu-track)" strokeWidth={8} />
                <circle cx={56} cy={56} r={RING_R.inner} fill="none" stroke="var(--v3-blu)" strokeWidth={8} strokeLinecap="round" strokeDasharray={ringDash(RING_R.inner, ringFrac(d.macros.carbs.eaten, d.macros.carbs.goal))} />
              </svg>
              <div style={{ position: 'absolute', left: 36, top: 36, width: 40, height: 40, borderRadius: 20, background: 'var(--v3-card)', boxShadow: '0 2px 6px rgba(0,0,0,.08)', display: 'grid', placeItems: 'center', fontSize: 20 }}>🔥</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <div className="v3-tile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--v3-mu2)' }}><span className="v3-dot" style={{ background: 'var(--v3-vio)' }} />Белки</div>
              <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{d.macros.protein.eaten} <span style={{ color: 'var(--v3-mu)', fontWeight: 500, fontSize: 14 }}>/ {d.macros.protein.goal} г</span></div>
            </div>
            <div className="v3-tile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--v3-mu2)' }}><span className="v3-dot" style={{ background: 'var(--v3-org)' }} />Жиры</div>
              <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{d.macros.fat.eaten} <span style={{ color: 'var(--v3-mu)', fontWeight: 500, fontSize: 14 }}>/ {d.macros.fat.goal} г</span></div>
            </div>
            <div className="v3-tile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--v3-mu2)' }}><span className="v3-dot" style={{ background: 'var(--v3-blu)' }} />Углев.</div>
              <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{d.macros.carbs.eaten} <span style={{ color: 'var(--v3-mu)', fontWeight: 500, fontSize: 14 }}>/ {d.macros.carbs.goal} г</span></div>
            </div>
          </div>
        </div>

        {proteinLeft > 0 && (
          <div className="v3-tip">
            <div className="v3-tip-ic">💡</div>
            <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4, color: 'var(--v3-tip-tx)' }}><b style={{ color: 'var(--v3-ink)' }}>До нормы белка {proteinLeft} г.</b> Добавь порцию белкового продукта к следующему приёму.</div>
            <MaterialIcon name="chevron_right" variant="rounded" size={22} style={{ color: 'var(--v3-mu2)' }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="v3-mini water">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>💧 Вода</div>
            <div className="num" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em' }}>{d.water.done}<span style={{ fontSize: 15, color: 'var(--v3-mu)', fontWeight: 500 }}> / {d.water.goal}</span></div>
            <div style={{ position: 'absolute', right: 16, bottom: 16, width: 52, height: 80, clipPath: 'polygon(0 0,100% 0,88% 100%,12% 100%)', background: 'linear-gradient(90deg,rgba(255,255,255,.9),rgba(220,235,250,.5) 40%,rgba(255,255,255,.9))', borderRadius: '4px 4px 10px 10px', boxShadow: 'inset 0 0 0 2px rgba(150,190,230,.6)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.min(100, (d.water.done / d.water.goal) * 100)}%`, background: 'linear-gradient(180deg,#8EC7FF,#3D8BFF)', transition: 'height .3s' }} />
              <div style={{ position: 'absolute', left: 8, top: 6, width: 4, bottom: 10, borderRadius: 2, background: 'rgba(255,255,255,.85)' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto', position: 'relative', zIndex: 1 }}>
              <button type="button" className="v3-mini-stepbtn" style={{ background: 'var(--v3-blu-soft)', color: 'var(--v3-blu)' }} onClick={() => changeWater(-1)} aria-label="Меньше воды"><MaterialIcon name="remove" variant="rounded" size={20} /></button>
              <button type="button" className="v3-mini-stepbtn" style={{ flex: 1, background: 'var(--v3-blu)', color: '#fff' }} onClick={() => changeWater(1)} aria-label="Больше воды"><MaterialIcon name="add" variant="rounded" size={20} /></button>
            </div>
          </div>
          <button type="button" className="v3-mini" style={{ border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => onNavigate('progress')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--v3-green-soft)', display: 'grid', placeItems: 'center' }}><MaterialIcon name="monitor_weight" variant="rounded" size={17} style={{ color: 'var(--v3-green)' }} /></span>
              Вес
            </div>
            <div className="num" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em' }}>{lastWeight.toFixed(1)}<span style={{ fontSize: 15, color: 'var(--v3-mu)', fontWeight: 500 }}> кг</span></div>
            <svg viewBox="0 0 140 40" style={{ width: '100%', height: 40 }}>
              <polyline points={sparklinePath(weightSeries, 140, 40)} fill="none" stroke="var(--v3-green)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontSize: 13, color: 'var(--v3-mu2)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>Смотреть динамику<MaterialIcon name="arrow_forward" variant="rounded" size={16} /></div>
          </button>
        </div>

        {favorites.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Любимые продукты</div>
              <button type="button" className="v3-link" onClick={() => onNavigate('add')}>Все →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {favorites.slice(0, 4).map((f) => (
                <button key={f.name} type="button" className="v3-fav-card" onClick={() => quickAddFavorite(f)} disabled={addingFav === f.name} aria-label={`Добавить «${f.name}»`} title={f.name}>
                  {addingFav === f.name ? <MaterialIcon name="hourglass_top" variant="rounded" /> : f.emoji}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Приёмы пищи</div>
        </div>

        {d.meals.length === 0 && (
          <button type="button" className="v3-card" style={{ border: 'none', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '22px 18px', color: 'var(--v3-mu)', fontWeight: 700, textAlign: 'center', cursor: 'pointer' }} onClick={() => addToGroup('breakfast')}>
            <MaterialIcon name="restaurant" variant="rounded" size={30} />
            {isToday ? 'Добавь первый приём' : 'В этот день приёмов не было'}
          </button>
        )}

        {d.meals.length > 0 && MEAL_GROUPS.map((g) => {
          const items = d.meals.filter((m) => m.mealType === g.type)
          if (items.length === 0) return null
          const sum = items.reduce((s, m) => s + m.kcal, 0)
          return (
            <div key={g.type} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--v3-mu2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  <span>{g.label}</span>
                  {sum > 0 && <span className="num" style={{ textTransform: 'none', color: 'var(--v3-green-deep)' }}>{sum} ккал</span>}
                </div>
                <button type="button" onClick={() => addToGroup(g.type)} aria-label={`Добавить: ${g.label}`} style={{ color: 'var(--v3-green)', display: 'flex' }}><MaterialIcon name="add_circle" variant="rounded" size={20} /></button>
              </div>
              {items.map((meal) => (
                <MealCard
                  key={meal.id} meal={meal} onDelete={() => onDelete(meal)}
                  onChangeItemGrams={(itemId, grams) => onChangeItemGrams(meal.id, itemId, grams)}
                  onDeleteItem={(itemId) => onDeleteItem(meal.id, itemId)}
                />
              ))}
            </div>
          )
        })}

        {d.workouts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--v3-mu2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Отмечено сегодня</div>
              <button type="button" onClick={() => onNavigate('workout')} style={{ color: 'var(--v3-green)', display: 'flex' }}><MaterialIcon name="add_circle" variant="rounded" size={20} /></button>
            </div>
            {d.workouts.map((w) => <WorkoutCard key={w.id} workout={w} onDelete={() => onDeleteWorkout(w)} />)}
          </div>
        )}
      </div>

      <BottomNavV3 active="today" onNavigate={onNavigate} />
    </div>
  )
}

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  return (
    <div className="v3-meal-row">
      <div className="thumb" style={{ background: 'var(--v3-hero-badge)', color: 'var(--v3-hero-ic)' }}>
        <MaterialIcon name="exercise" variant="rounded" size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{workout.name}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-mu)' }}>{workout.minutes} мин · {workout.time}</div>
      </div>
      <div className="num" style={{ fontWeight: 700, fontSize: 16, color: 'var(--v3-green-deep)' }}>−{workout.kcal}</div>
      <button type="button" onClick={onDelete} aria-label="Удалить" style={{ color: 'var(--v3-mu)', display: 'flex' }}><MaterialIcon name="delete" variant="rounded" size={18} /></button>
    </div>
  )
}

function MealCard({
  meal, onDelete, onChangeItemGrams, onDeleteItem,
}: {
  meal: Meal
  onDelete: () => void
  onChangeItemGrams: (itemId: string, grams: number) => void
  onDeleteItem: (itemId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const multi = meal.items.length > 1

  return (
    <div className="v3-meal-row" style={{ padding: 0, overflow: 'hidden', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <button
        type="button" style={{ width: '100%', border: 'none', background: 'none', padding: 10, display: 'flex', gap: 12, alignItems: 'center', cursor: multi ? 'pointer' : 'default', textAlign: 'left', font: 'inherit', color: 'inherit' }}
        onClick={multi ? () => setOpen((v) => !v) : undefined}
        aria-expanded={multi ? open : undefined}
      >
        <div className="thumb">{meal.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</div>
          <div className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-mu)', marginTop: 2 }}>
            {meal.time} · Б {meal.protein} · Ж {meal.fat} · У {meal.carbs}{multi && ` · ${meal.items.length} комп.`}
          </div>
        </div>
        <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{meal.kcal}</div>
        {multi && <MaterialIcon name={open ? 'expand_less' : 'expand_more'} variant="rounded" size={18} style={{ color: 'var(--v3-mu)' }} />}
        <span
          role="button" tabIndex={0} aria-label="Удалить приём" style={{ color: 'var(--v3-mu)', display: 'flex' }}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onDelete() } }}
        >
          <MaterialIcon name="delete" variant="rounded" size={18} />
        </span>
      </button>

      {open && (
        <div style={{ padding: '2px 10px 10px', display: 'flex', flexDirection: 'column' }}>
          {meal.items.map((it) => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--v3-line)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                <span className="num" style={{ fontSize: 12, color: 'var(--v3-mu)' }}>{it.kcal} ккал · {it.grams} г</span>
              </div>
              <NumberField value={it.grams} min={1} max={2000} step={10} onChange={(g) => onChangeItemGrams(it.id, g)} label={`Масса «${it.name}»`} />
              <button type="button" onClick={() => onDeleteItem(it.id)} aria-label={`Удалить «${it.name}»`} style={{ color: 'var(--v3-mu)', display: 'flex' }}><MaterialIcon name="delete" variant="rounded" size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

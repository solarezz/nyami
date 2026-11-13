import { MaterialIcon } from './MaterialIcon'
import { haptic } from '../telegram'
import { useData } from '../data/store'
import type { Screen } from '../App'

// Дизайн-система v2 (жёсткий спортивный стиль). «Тренировки» заменяют «Коуч» на
// первом уровне (решение из макета, Этап 6) — коуч теперь открывается из профиля.
export function BottomNavV2({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  const { setSelectedMealType } = useData()
  const go = (s: Screen) => { haptic('light'); onNavigate(s) }
  const goAdd = () => { setSelectedMealType(null); go('add') }

  return (
    <nav className="v2-nav">
      <button className={`ni${active === 'today' ? ' on' : ''}`} onClick={() => go('today')} aria-label="Сегодня">
        {active === 'today' ? <span className="v2-nav-pill"><MaterialIcon name="today" size={20} /></span> : <MaterialIcon name="today" size={22} />}
        <span className="nl">Сегодня</span>
      </button>
      <button className={`ni${active === 'training' ? ' on' : ''}`} onClick={() => go('training')} aria-label="Тренировки">
        {active === 'training' ? <span className="v2-nav-pill"><MaterialIcon name="exercise" size={20} /></span> : <MaterialIcon name="exercise" size={22} />}
        <span className="nl">Тренировки</span>
      </button>
      <div className="v2-nav-fab">
        <button className="v2-nav-fab-btn" onClick={goAdd} aria-label="Добавить еду">
          <MaterialIcon name="add" size={28} />
        </button>
      </div>
      <button className={`ni${active === 'progress' ? ' on' : ''}`} onClick={() => go('progress')} aria-label="Прогресс">
        {active === 'progress' ? <span className="v2-nav-pill"><MaterialIcon name="monitoring" size={20} /></span> : <MaterialIcon name="monitoring" size={22} />}
        <span className="nl">Прогресс</span>
      </button>
      <button className={`ni${active === 'profile' ? ' on' : ''}`} onClick={() => go('profile')} aria-label="Профиль">
        {active === 'profile' ? <span className="v2-nav-pill"><MaterialIcon name="person" size={20} /></span> : <MaterialIcon name="person" size={22} />}
        <span className="nl">Профиль</span>
      </button>
    </nav>
  )
}

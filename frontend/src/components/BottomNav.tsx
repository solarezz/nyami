import { Icon } from './Icons'
import { haptic } from '../telegram'
import { useData } from '../data/store'
import type { Screen } from '../App'

export function BottomNav({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  const { setSelectedMealType } = useData()
  const go = (s: Screen) => {
    haptic('light')
    onNavigate(s)
  }
  // FAB — общий вход «Добавить еду»: без выбранной категории (тип по времени).
  const goAdd = () => {
    setSelectedMealType(null)
    go('add')
  }
  return (
    <nav className="nav">
      <button className={`ni${active === 'today' ? ' on' : ''}`} onClick={() => go('today')} aria-label="Сегодня">
        <Icon name="grid" /><span className="nl">Сегодня</span>
      </button>
      <button className={`ni${active === 'progress' ? ' on' : ''}`} onClick={() => go('progress')} aria-label="Прогресс">
        <Icon name="chart" /><span className="nl">Прогресс</span>
      </button>
      <button className="fab" onClick={goAdd} aria-label="Добавить еду">
        <Icon name="plus" />
      </button>
      <button className={`ni${active === 'coach' ? ' on' : ''}`} onClick={() => go('coach')} aria-label="Коуч">
        <Icon name="chat" /><span className="nl">Коуч</span>
      </button>
      <button className={`ni${active === 'profile' ? ' on' : ''}`} onClick={() => go('profile')} aria-label="Профиль">
        <Icon name="user" /><span className="nl">Профиль</span>
      </button>
    </nav>
  )
}

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
        <Icon name="grid" />
      </button>
      <button className={`ni${active === 'progress' ? ' on' : ''}`} onClick={() => go('progress')} aria-label="Прогресс">
        <Icon name="chart" />
      </button>
      <button className="fab" onClick={goAdd} aria-label="Добавить еду">
        <Icon name="camera" />
      </button>
      <button className={`ni${active === 'coach' ? ' on' : ''}`} onClick={() => go('coach')} aria-label="Коуч">
        <Icon name="chat" />
      </button>
      <button className={`ni${active === 'profile' ? ' on' : ''}`} onClick={() => go('profile')} aria-label="Профиль">
        <Icon name="user" />
      </button>
    </nav>
  )
}

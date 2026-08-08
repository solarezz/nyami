import { Icon } from './Icons'
import { haptic } from '../telegram'
import type { Screen } from '../App'

export function BottomNav({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  const go = (s: Screen) => {
    haptic('light')
    onNavigate(s)
  }
  return (
    <nav className="nav">
      <button className={`ni${active === 'today' ? ' on' : ''}`} onClick={() => go('today')} aria-label="Сегодня">
        <Icon name="grid" />
      </button>
      <button className={`ni${active === 'progress' ? ' on' : ''}`} onClick={() => go('progress')} aria-label="Прогресс">
        <Icon name="chart" />
      </button>
      <button className="fab" onClick={() => go('add')} aria-label="Добавить еду">
        <Icon name="camera" />
      </button>
      <button className={`ni${active === 'coach' ? ' on' : ''}`} onClick={() => go('coach')} aria-label="Коуч">
        <Icon name="chat" />
      </button>
      <button className="ni" onClick={() => go('today')} aria-label="Профиль">
        <Icon name="user" />
      </button>
    </nav>
  )
}

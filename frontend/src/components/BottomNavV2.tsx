import { useState } from 'react'
import { MaterialIcon } from './MaterialIcon'
import { haptic } from '../telegram'
import { useData } from '../data/store'
import type { Screen } from '../App'

// Дизайн-система v2 (жёсткий спортивный стиль). «Тренировки» заменяют «Коуч» на
// первом уровне (решение из макета, Этап 6) — коуч теперь открывается из профиля.
export function BottomNavV2({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  const { setSelectedMealType } = useData()
  const [pickerOpen, setPickerOpen] = useState(false)
  const go = (s: Screen) => { haptic('light'); onNavigate(s) }

  const openPicker = () => { haptic('light'); setPickerOpen(true) }
  const pickMeal = () => { setPickerOpen(false); setSelectedMealType(null); go('add') }
  const pickActivity = () => { setPickerOpen(false); go('workout') }

  return (
    <>
      {pickerOpen && (
        <div className="v2-sheet-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="v2-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ font: '700 17px var(--v2-font-text)' }}>Что добавить?</div>
            <button type="button" className="v2-pickrow" onClick={pickMeal}>
              <div className="v2-mini-icon" style={{ background: 'color-mix(in srgb, var(--v2-org) 20%, transparent)', color: 'var(--v2-org-ink)' }}><MaterialIcon name="restaurant" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="ttl">Приём пищи</div>
                <div className="dsc">Фото, текст или штрихкод</div>
              </div>
              <MaterialIcon name="chevron_right" size={20} />
            </button>
            <button type="button" className="v2-pickrow" onClick={pickActivity}>
              <div className="v2-mini-icon" style={{ background: 'color-mix(in srgb, var(--v2-lime) 20%, transparent)', color: 'var(--v2-lime-ink)' }}><MaterialIcon name="exercise" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="ttl">Активность вне программы</div>
                <div className="dsc">Бег, шаги, велосипед и т.п.</div>
              </div>
              <MaterialIcon name="chevron_right" size={20} />
            </button>
          </div>
        </div>
      )}
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
          <button className="v2-nav-fab-btn" onClick={openPicker} aria-label="Добавить запись">
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
    </>
  )
}

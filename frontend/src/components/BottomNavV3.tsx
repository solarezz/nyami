import { useState } from 'react'
import { MaterialIcon } from './MaterialIcon'
import { haptic } from '../telegram'
import { useData } from '../data/store'
import type { Screen } from '../App'

// Нижняя навигация редизайна v3 (светлая тема, экран «Сегодня») — тот же состав
// разделов и шторка выбора записи, что в BottomNavV2, но в новой визуальной теме.
export function BottomNavV3({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  const { setSelectedMealType } = useData()
  const [pickerOpen, setPickerOpen] = useState(false)
  const go = (s: Screen) => { haptic('light'); onNavigate(s) }

  const openPicker = () => { haptic('light'); setPickerOpen(true) }
  const pickMeal = () => { setPickerOpen(false); setSelectedMealType(null); go('add') }
  const pickActivity = () => { setPickerOpen(false); go('workout') }

  return (
    <>
      {pickerOpen && (
        <div className="v3-sheet-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="v3-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Что добавить?</div>
            <button type="button" className="v3-pickrow" onClick={pickMeal}>
              <div className="v3-hero-ic" style={{ width: 40, height: 40, borderRadius: 20 }}><MaterialIcon name="restaurant" variant="rounded" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="ttl">Приём пищи</div>
                <div className="dsc">Фото, текст или штрихкод</div>
              </div>
              <MaterialIcon name="chevron_right" variant="rounded" size={20} />
            </button>
            <button type="button" className="v3-pickrow" onClick={pickActivity}>
              <div className="v3-hero-ic" style={{ width: 40, height: 40, borderRadius: 20 }}><MaterialIcon name="exercise" variant="rounded" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="ttl">Активность вне программы</div>
                <div className="dsc">Бег, шаги, велосипед и т.п.</div>
              </div>
              <MaterialIcon name="chevron_right" variant="rounded" size={20} />
            </button>
          </div>
        </div>
      )}
      <nav className="v3-nav">
        <button type="button" className={`ni${active === 'today' ? ' on' : ''}`} onClick={() => go('today')} aria-label="Сегодня">
          <MaterialIcon name="home" variant="rounded" fill={active === 'today'} />
          <span className="nl">Сегодня</span>
        </button>
        <button type="button" className={`ni${active === 'training' ? ' on' : ''}`} onClick={() => go('training')} aria-label="Тренировки">
          <MaterialIcon name="exercise" variant="rounded" fill={active === 'training'} />
          <span className="nl">Тренировки</span>
        </button>
        <button type="button" className="v3-nav-fab" onClick={openPicker} aria-label="Добавить запись">
          <MaterialIcon name="add" variant="rounded" size={26} />
        </button>
        <button type="button" className={`ni${active === 'progress' ? ' on' : ''}`} onClick={() => go('progress')} aria-label="Прогресс">
          <MaterialIcon name="monitoring" variant="rounded" fill={active === 'progress'} />
          <span className="nl">Прогресс</span>
        </button>
        <button type="button" className={`ni${active === 'profile' ? ' on' : ''}`} onClick={() => go('profile')} aria-label="Профиль">
          <MaterialIcon name="person" variant="rounded" fill={active === 'profile'} />
          <span className="nl">Профиль</span>
        </button>
      </nav>
    </>
  )
}

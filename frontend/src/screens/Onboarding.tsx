import { useState } from 'react'
import { Wordmark } from '../components/Wordmark'
import { Icon } from '../components/Icons'
import { mockProfile } from '../data/mock'
import type { Screen } from '../App'

export function Onboarding({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [activity, setActivity] = useState<'low' | 'medium' | 'high'>('medium')
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('lose')
  const p = mockProfile

  return (
    <div className="screen gap fade">
      <Wordmark size={24} />
      <div className="h2" style={{ fontSize: 24, lineHeight: 1.05 }}>Давай посчитаем<br />твою норму</div>

      <div className="scrollarea">
        <div className="seg">
          <span className={sex === 'male' ? 'on' : ''} onClick={() => setSex('male')}>Мужской</span>
          <span className={sex === 'female' ? 'on' : ''} onClick={() => setSex('female')}>Женский</span>
        </div>

        <div className="card" style={{ padding: '4px 18px' }}>
          <div className="frow"><span className="muted">Возраст</span><span className="fv">{p.age}</span></div>
          <div className="frow"><span className="muted">Рост</span><span className="fv">{p.heightCm} см</span></div>
          <div className="frow"><span className="muted">Вес</span><span className="fv">{p.weightKg} кг</span></div>
        </div>

        <div className="tiny">Активность</div>
        <div className="chips">
          {(['low', 'medium', 'high'] as const).map((a) => (
            <span key={a} className={`chip${activity === a ? ' on' : ''}`} onClick={() => setActivity(a)}>
              {a === 'low' ? 'Низкая' : a === 'medium' ? 'Средняя' : 'Высокая'}
            </span>
          ))}
        </div>

        <div className="tiny">Цель</div>
        <div className="chips">
          {(['lose', 'maintain', 'gain'] as const).map((g) => (
            <span key={g} className={`chip${goal === g ? ' on' : ''}`} onClick={() => setGoal(g)}>
              {g === 'lose' ? 'Похудеть' : g === 'maintain' ? 'Держать' : 'Набрать'}
            </span>
          ))}
        </div>

        <div className="resultcard">
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>Твоя норма</div>
            <div className="big">{p.dailyKcal.toLocaleString('ru-RU')}</div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>ккал в день</div>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, lineHeight: 1.6 }}>
            Б {p.protein}<br />Ж {p.fat}<br />У {p.carbs}
          </div>
        </div>

        <button className="btn" onClick={() => onNavigate('today')}>Начать <Icon name="check" /></button>
      </div>
    </div>
  )
}

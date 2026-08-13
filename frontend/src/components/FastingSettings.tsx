import { useState } from 'react'
import { Icon } from './Icons'
import { fastingState, formatLeft, PROTOCOL_LABELS } from '../utils/fasting'
import { haptic } from '../telegram'
import { useData } from '../data/store'
import type { FastingProtocol } from '../types'

// Настройки интервального голодания: протокол + час начала окна еды.
export function FastingSettings() {
  const { me, setFasting } = useData()
  const p = me!.profile
  const [protocol, setProtocol] = useState<FastingProtocol>(p.fastingProtocol)
  const [eatStart, setEatStart] = useState<number>(p.eatStartHour)
  const [saving, setSaving] = useState(false)

  const dirty = protocol !== p.fastingProtocol || eatStart !== p.eatStartHour
  const preview = fastingState(protocol, eatStart)

  const save = async () => {
    if (saving) return
    haptic('light')
    setSaving(true)
    try {
      await setFasting({ protocol, eatStartHour: eatStart })
    } finally {
      setSaving(false)
    }
  }

  const shift = (delta: number) => {
    haptic('light')
    setEatStart((h) => (h + delta + 24) % 24)
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="h2" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
        ⏳ Интервальное голодание
      </div>

      <div className="chips">
        {PROTOCOL_LABELS.map((o) => (
          <button
            type="button"
            key={o.key}
            className={`chip${protocol === o.key ? ' on' : ''}`}
            onClick={() => { haptic('light'); setProtocol(o.key) }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {protocol !== 'off' && (
        <>
          <div className="rowhead">
            <div className="tiny">Начало окна еды</div>
            <div className="stepper">
              <button type="button" onClick={() => shift(-1)} aria-label="Раньше"><Icon name="minus" /></button>
              <span className="sv">{String(eatStart).padStart(2, '0')}:00</span>
              <button type="button" onClick={() => shift(1)} aria-label="Позже"><Icon name="plus" /></button>
            </div>
          </div>
          {preview && (
            <div className="tiny" style={{ color: 'var(--sub)' }}>
              {preview.windowLabel} · сейчас {preview.phase === 'eating' ? 'окно еды' : 'голодание'}, осталось {formatLeft(preview.msLeft)}
            </div>
          )}
        </>
      )}

      <button
        className="btn" onClick={save} disabled={!dirty || saving}
        style={!dirty || saving ? { opacity: 0.6 } : undefined}
      >
        {saving ? 'Сохраняю…' : 'Сохранить режим'}
      </button>
    </div>
  )
}

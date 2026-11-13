import { useState } from 'react'
import { MaterialIcon } from './MaterialIcon'
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
    <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MaterialIcon name="hourglass_top" size={18} style={{ color: 'var(--v2-mu)' }} />
        <span style={{ font: '700 15px var(--v2-font-text)' }}>Интервальное голодание</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PROTOCOL_LABELS.map((o) => (
          <button
            type="button" key={o.key} className={`v2-chip${protocol === o.key ? ' on' : ''}`}
            onClick={() => { haptic('light'); setProtocol(o.key) }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {protocol !== 'off' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="v2-field-label">Начало окна еды</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="v2-stepbtn" style={{ width: 32, height: 32 }} onClick={() => shift(-1)} aria-label="Раньше"><MaterialIcon name="remove" size={16} /></button>
              <span style={{ font: '700 16px var(--v2-font-num)', minWidth: 54, textAlign: 'center' }}>{String(eatStart).padStart(2, '0')}:00</span>
              <button type="button" className="v2-stepbtn" style={{ width: 32, height: 32 }} onClick={() => shift(1)} aria-label="Позже"><MaterialIcon name="add" size={16} /></button>
            </div>
          </div>
          {preview && (
            <div style={{ font: '500 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>
              {preview.windowLabel} · сейчас {preview.phase === 'eating' ? 'окно еды' : 'голодание'}, осталось {formatLeft(preview.msLeft)}
            </div>
          )}
        </>
      )}

      <button type="button" className="v2-btn" onClick={save} disabled={!dirty || saving} style={!dirty || saving ? { opacity: 0.6 } : undefined}>
        {saving ? 'Сохраняю…' : 'Сохранить режим'}
        <span className="v2-btn-ic"><MaterialIcon name="check" size={20} /></span>
      </button>
    </div>
  )
}

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
    <div className="v3-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MaterialIcon name="hourglass_top" variant="rounded" size={18} style={{ color: 'var(--v3-mu)' }} />
        <span style={{ fontSize: 15, fontWeight: 700 }}>Интервальное голодание</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PROTOCOL_LABELS.map((o) => (
          <button
            type="button" key={o.key} className={`v3-chip${protocol === o.key ? ' on' : ''}`}
            onClick={() => { haptic('light'); setProtocol(o.key) }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {protocol !== 'off' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="v3-field-label">Начало окна еды</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="v3-stepbtn" style={{ width: 32, height: 32 }} onClick={() => shift(-1)} aria-label="Раньше"><MaterialIcon name="remove" variant="rounded" size={16} /></button>
              <span className="num" style={{ fontSize: 16, fontWeight: 700, minWidth: 54, textAlign: 'center' }}>{String(eatStart).padStart(2, '0')}:00</span>
              <button type="button" className="v3-stepbtn" style={{ width: 32, height: 32 }} onClick={() => shift(1)} aria-label="Позже"><MaterialIcon name="add" variant="rounded" size={16} /></button>
            </div>
          </div>
          {preview && (
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-mu)' }}>
              {preview.windowLabel} · сейчас {preview.phase === 'eating' ? 'окно еды' : 'голодание'}, осталось {formatLeft(preview.msLeft)}
            </div>
          )}
        </>
      )}

      <button type="button" className="v3-btn-primary" style={{ justifyContent: 'center', width: '100%', opacity: !dirty || saving ? 0.6 : 1 }} onClick={save} disabled={!dirty || saving}>
        {saving ? 'Сохраняю…' : 'Сохранить режим'}
        <MaterialIcon name="check" variant="rounded" size={20} />
      </button>
    </div>
  )
}

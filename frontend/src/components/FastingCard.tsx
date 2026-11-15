import { useEffect, useState } from 'react'
import { RingStat } from './Ring'
import { fastingState, formatLeft } from '../utils/fasting'
import type { FastingProtocol } from '../types'

// Карточка интервального голодания: фаза (еда/голод) + обратный отсчёт.
export function FastingCard({ protocol, eatStartHour }: { protocol: FastingProtocol; eatStartHour: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000) // тик раз в 30с
    return () => clearInterval(id)
  }, [])

  const st = fastingState(protocol, eatStartHour, now)
  if (!st) return null

  const eating = st.phase === 'eating'
  const color = eating ? 'var(--v3-green)' : 'var(--v3-blu)'
  const track = eating ? 'var(--v3-green-soft)' : 'var(--v3-blu-track)'

  return (
    <div className="v3-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
          {eating ? '🍽️ Окно еды' : '⏳ Голодание'}
          <span style={{
            padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: 'var(--v3-green-soft)', color: 'var(--v3-green-deep)',
          }}>
            {protocol.toUpperCase()}
          </span>
        </div>
        <div className="num" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.02em', marginTop: 4 }}>{formatLeft(st.msLeft)}</div>
        <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>
          {eating ? 'до конца окна' : 'до начала еды'} · {st.windowLabel}
        </div>
      </div>
      <RingStat
        progress={st.progress} color={color} track={track} size={90} stroke={11}
        label={<span style={{ fontSize: 22 }}>{eating ? '🍽️' : '⏳'}</span>}
      />
    </div>
  )
}

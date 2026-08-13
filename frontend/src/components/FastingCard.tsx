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
  const color = eating ? 'var(--accent)' : 'var(--fat)'
  const track = eating ? 'var(--scr)' : 'var(--fat-soft)'

  return (
    <div className="card calcard">
      <div className="l">
        <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {eating ? '🍽️ Окно еды' : '⏳ Голодание'}
          <span className="pill" style={{ padding: '2px 8px' }}>{protocol.toUpperCase()}</span>
        </div>
        <div className="big" style={{ fontSize: 34 }}>{formatLeft(st.msLeft)}</div>
        <div className="tiny" style={{ marginTop: 2 }}>
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

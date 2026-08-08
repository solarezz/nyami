import { useState } from 'react'
import { Icon } from './Icons'
import { haptic } from '../telegram'

// Числовое поле: −/+ степперы и свободный ввод. Кламп применяется ТОЛЬКО при
// потере фокуса (не на каждый символ) — поэтому ввод не «прыгает».
export function NumberField({
  label, value, min, max, step = 1, decimals = 0, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  decimals?: number
  onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (n: number) => Math.max(min, Math.min(max, n))

  const bump = (delta: number) => {
    haptic('light')
    onChange(round(clamp(value + delta), decimals))
  }

  const commit = () => {
    if (draft === null) return
    const t = draft.trim().replace(',', '.')
    if (t !== '') onChange(round(clamp(Number(t) || value), decimals))
    setDraft(null)
  }

  return (
    <div className="frow">
      <span className="muted">{label}</span>
      <div className="numfield">
        <button onClick={() => bump(-step)} aria-label="Меньше"><Icon name="minus" /></button>
        <input
          type="text" inputMode="decimal"
          value={draft ?? String(value)}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button onClick={() => bump(step)} aria-label="Больше"><Icon name="plus" /></button>
      </div>
    </div>
  )
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

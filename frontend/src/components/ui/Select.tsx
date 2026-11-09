import { haptic } from '../../telegram'

export interface SelectOption<T extends string> { value: T; label: string }

// Группа чипов для выбора одного значения из набора (визуально = .chips/.chip),
// напр. активность/цель в профиле. Для диапазона 2-6 вариантов — не для длинных списков.
export function Select<T extends string>({ label, options, value, onChange }: {
  label?: string
  options: readonly SelectOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      {label && <div className="tiny">{label}</div>}
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value} type="button" role="radio" aria-checked={o.value === value}
            className={`chip${o.value === value ? ' on' : ''}`}
            onClick={() => { if (o.value !== value) { haptic('light'); onChange(o.value) } }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

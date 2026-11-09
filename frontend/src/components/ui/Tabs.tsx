import { haptic } from '../../telegram'

export interface TabOption<T extends string> { value: T; label: string }

// Сегмент-контрол (визуально = .seg): один выбор из 2-4 вариантов, напр. пол в профиле.
export function Tabs<T extends string>({ options, value, onChange }: {
  options: readonly TabOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value} type="button" role="tab" aria-selected={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => { if (o.value !== value) { haptic('light'); onChange(o.value) } }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

import type { CSSProperties } from 'react'

// Иконки дизайн-системы v2 — Material Symbols Sharp по умолчанию, Rounded — для v3
// (редизайн «Сегодня»). Оба хостим сами через пакет material-symbols, без внешней сети.
// Имя — как в каталоге Google Fonts, напр. "fitness_center", "water_drop", "chevron_right".
export function MaterialIcon({
  name, fill, size, style, variant = 'sharp',
}: { name: string; fill?: boolean; size?: number; style?: CSSProperties; variant?: 'sharp' | 'rounded' }) {
  return (
    <span className={`${variant === 'rounded' ? 'msr' : 'msi'}${fill ? ' fill' : ''}`} style={{ fontSize: size, ...style }} aria-hidden="true">
      {name}
    </span>
  )
}

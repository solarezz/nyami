import type { CSSProperties } from 'react'

// Иконки дизайн-системы v2 — Material Symbols Sharp (самостоятельно хостим через
// пакет material-symbols, без внешней сети). Имя — как в каталоге Google Fonts,
// напр. "fitness_center", "water_drop", "chevron_right".
export function MaterialIcon({ name, fill, size, style }: { name: string; fill?: boolean; size?: number; style?: CSSProperties }) {
  return (
    <span className={`msi${fill ? ' fill' : ''}`} style={{ fontSize: size, ...style }} aria-hidden="true">
      {name}
    </span>
  )
}

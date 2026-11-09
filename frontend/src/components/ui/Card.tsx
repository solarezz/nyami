import type { CSSProperties, ReactNode } from 'react'

// .card как типизированный компонент. onClick переключает div → button (семантика + a11y).
export function Card({
  children, className, style, onClick, ariaLabel,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
  ariaLabel?: string
}) {
  const cls = ['card', className].filter(Boolean).join(' ')
  if (onClick) {
    return (
      <button type="button" className={cls} style={{ textAlign: 'left', width: '100%', ...style }} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </button>
    )
  }
  return <div className={cls} style={style}>{children}</div>
}

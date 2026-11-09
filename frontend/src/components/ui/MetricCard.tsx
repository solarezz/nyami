import type { ReactNode } from 'react'

// Формализация карточки-метрики (.mcard/.tile из global.css под одним компонентом).
export function MetricCard({
  icon, title, value, sub, align = 'center', children,
}: {
  icon?: ReactNode
  title?: ReactNode
  value?: ReactNode
  sub?: ReactNode
  align?: 'center' | 'start'
  children?: ReactNode
}) {
  return (
    <div className={`metric-card${align === 'start' ? ' align-start' : ''}`}>
      {icon}
      {title && <div className="tiny" style={{ marginBottom: align === 'start' ? 0 : undefined }}>{title}</div>}
      {children}
      {value !== undefined && <div className="tile-value">{value}</div>}
      {sub && <div className="muted" style={{ fontSize: 11, fontWeight: 800, textAlign: align === 'start' ? 'left' : 'center' }}>{sub}</div>}
    </div>
  )
}

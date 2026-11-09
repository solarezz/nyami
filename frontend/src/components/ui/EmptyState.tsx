import type { ReactNode } from 'react'

export function EmptyState({ emoji, title, subtitle, action }: {
  emoji: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="em">{emoji}</div>
      <div className="ttl">{title}</div>
      {subtitle && <div className="sub">{subtitle}</div>}
      {action}
    </div>
  )
}

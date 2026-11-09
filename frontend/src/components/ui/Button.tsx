import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from '../Icons'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

export function Button({
  variant = 'primary', size = 'md', icon, loading, loadingText, children, className, disabled, ...rest
}: {
  variant?: Variant
  size?: Size
  icon?: IconName
  loading?: boolean
  loadingText?: string
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ['btn', variant !== 'primary' ? variant : '', size === 'sm' ? 'sm' : '', className]
    .filter(Boolean).join(' ')

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {icon && <Icon name={icon} />}{loading ? (loadingText ?? children) : children}
    </button>
  )
}

import { useEffect } from 'react'
import type { ReactNode } from 'react'

// Общий оверлей-примитив (Modal по центру / Drawer снизу). Для подтверждений и алертов
// в Telegram предпочтительнее нативные showConfirm/showAlert (telegram.ts) — этот компонент
// для случаев, которых нативный API не покрывает (формы, составные экраны поверх текущего).
export function Modal({
  open, onClose, children, variant = 'modal',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  variant?: 'modal' | 'drawer'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className={`modal-backdrop${variant === 'drawer' ? ' drawer' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}

export function Drawer(props: Omit<Parameters<typeof Modal>[0], 'variant'>) {
  return <Modal {...props} variant="drawer" />
}

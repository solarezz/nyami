import { createContext, useCallback, useContext, useRef, useState } from 'react'

type Variant = 'default' | 'success' | 'danger'
interface ToastItem { id: number; text: string; variant: Variant }

const Ctx = createContext<((text: string, variant?: Variant) => void) | null>(null)

// Ненавязчивое уведомление поверх интерфейса — для коротких подтверждений ("Вес сохранён"),
// где нативный Telegram showAlert() был бы слишком тяжёл (блокирует, требует тапа ОК).
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback((text: string, variant: Variant = 'default') => {
    const id = nextId.current++
    setItems((prev) => [...prev, { id, text, variant }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2400)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-stack">
        {items.map((t) => <div key={t.id} className={`toast${t.variant !== 'default' ? ` ${t.variant}` : ''}`}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): (text: string, variant?: Variant) => void {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast должен использоваться внутри ToastProvider')
  return ctx
}

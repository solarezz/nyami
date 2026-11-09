import type { InputHTMLAttributes } from 'react'

// Однострочное текстовое поле (визуально = .inputcard, которое пока используется только
// как textarea в AddFood/AddWorkout). Для них самих ничего не меняем — компонент для новых мест.
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={['inputcard', className].filter(Boolean).join(' ')} {...rest} />
}

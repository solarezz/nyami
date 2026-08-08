// Кольцо-прогресс (только дуга). Текст по центру кладётся оверлеем в обёртке.
// progress: 0..1 (доля «съедено»/заполнено).

interface RingProps {
  progress: number
  color: string
  track: string
  size?: number
  stroke?: number
  className?: string
}

export function Ring({ progress, color, track, size = 120, stroke = 13, className }: RingProps) {
  const r = (100 - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  const offset = c * (1 - clamped)
  return (
    <svg className={className} viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
    </svg>
  )
}

// Кольцо с числом по центру.
export function RingStat({
  progress, color, track, size = 120, stroke = 13, label,
}: RingProps & { label: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: size, height: size, flex: 'none', lineHeight: 0 }}>
      <Ring progress={progress} color={color} track={track} size={size} stroke={stroke} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 900, lineHeight: 1 }}>
        {label}
      </div>
    </div>
  )
}

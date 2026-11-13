// Три концентрических кольца БЖУ в одном донате (внешнее → белки, среднее → жиры,
// внутреннее → углеводы) — компактная сводка на Today/Progress в дизайн-системе v2.

function ring(cx: number, cy: number, r: number, frac: number, color: string) {
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, frac))
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--v2-s2)" strokeWidth={9} />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={`${c * clamped} ${c}`} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round"
      />
    </>
  )
}

export function MacroDonut({
  protein, fat, carbs, size = 104,
}: {
  protein: { eaten: number; goal: number }
  fat: { eaten: number; goal: number }
  carbs: { eaten: number; goal: number }
  size?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" style={{ flex: 'none' }}>
      {ring(56, 56, 50, protein.goal ? protein.eaten / protein.goal : 0, 'var(--v2-vio)')}
      {ring(56, 56, 38, fat.goal ? fat.eaten / fat.goal : 0, 'var(--v2-yel)')}
      {ring(56, 56, 26, carbs.goal ? carbs.eaten / carbs.goal : 0, 'var(--v2-tea)')}
    </svg>
  )
}

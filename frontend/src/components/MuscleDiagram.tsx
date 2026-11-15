// Упрощённая схема тела (не анатомический атлас) — ориентир, какие зоны работают.
// Точный список мышц всегда дублируется текстом рядом (primaryMuscles/secondaryMuscles).
type Region = 'shoulders' | 'chest' | 'biceps' | 'abs' | 'quads' | 'back' | 'triceps' | 'glutes' | 'hamstrings'

function matchRegions(names: string[]): Region[] {
  const out = new Set<Region>()
  for (const raw of names) {
    const n = raw.toLowerCase()
    if (n.includes('бедра')) { out.add('hamstrings'); continue }
    if (n.includes('квадрицепс') || n.includes('ног')) { out.add('quads'); continue }
    if (n.includes('ягодиц')) { out.add('glutes'); continue }
    if (n.includes('трицепс')) { out.add('triceps'); continue }
    if (n.includes('бицепс')) { out.add('biceps'); continue }
    if (n.includes('груд')) { out.add('chest'); continue }
    if (n.includes('спин')) { out.add('back'); continue }
    if (n.includes('плеч') || n.includes('дельт') || n.includes('трапец')) { out.add('shoulders'); continue }
    if (n.includes('пресс')) { out.add('abs'); continue }
  }
  return [...out]
}

function fillFor(region: Region, primary: Region[], secondary: Region[]): string {
  if (primary.includes(region)) return 'var(--v3-green)'
  if (secondary.includes(region)) return 'color-mix(in srgb, var(--v3-green) 40%, var(--v3-day-a-off, #E9ECE5))'
  return 'var(--v3-day-a-off, #E9ECE5)'
}

export function MuscleDiagram({ primaryMuscles, secondaryMuscles }: { primaryMuscles: string[]; secondaryMuscles: string[] }) {
  const primary = matchRegions(primaryMuscles)
  const secondary = matchRegions(secondaryMuscles)
  const f = (r: Region) => fillFor(r, primary, secondary)

  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="72" height="150" viewBox="0 0 72 150">
          <circle cx="36" cy="14" r="12" fill="var(--v3-day-a-off, #E9ECE5)" />
          <rect x="16" y="28" width="12" height="14" rx="5" fill={f('shoulders')} />
          <rect x="44" y="28" width="12" height="14" rx="5" fill={f('shoulders')} />
          <rect x="22" y="32" width="28" height="34" rx="6" fill={f('chest')} />
          <rect x="24" y="68" width="24" height="26" rx="5" fill={f('abs')} />
          <rect x="10" y="42" width="10" height="36" rx="5" fill={f('biceps')} />
          <rect x="52" y="42" width="10" height="36" rx="5" fill={f('biceps')} />
          <rect x="20" y="96" width="14" height="48" rx="6" fill={f('quads')} />
          <rect x="38" y="96" width="14" height="48" rx="6" fill={f('quads')} />
        </svg>
        <span style={{ font: '600 11px var(--v3-font-text)', color: 'var(--v3-mu)' }}>Спереди</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="72" height="150" viewBox="0 0 72 150">
          <circle cx="36" cy="14" r="12" fill="var(--v3-day-a-off, #E9ECE5)" />
          <rect x="16" y="28" width="12" height="14" rx="5" fill={f('shoulders')} />
          <rect x="44" y="28" width="12" height="14" rx="5" fill={f('shoulders')} />
          <rect x="22" y="32" width="28" height="40" rx="6" fill={f('back')} />
          <rect x="10" y="42" width="10" height="36" rx="5" fill={f('triceps')} />
          <rect x="52" y="42" width="10" height="36" rx="5" fill={f('triceps')} />
          <rect x="22" y="74" width="28" height="20" rx="6" fill={f('glutes')} />
          <rect x="20" y="96" width="14" height="48" rx="6" fill={f('hamstrings')} />
          <rect x="38" y="96" width="14" height="48" rx="6" fill={f('hamstrings')} />
        </svg>
        <span style={{ font: '600 11px var(--v3-font-text)', color: 'var(--v3-mu)' }}>Сзади</span>
      </div>
    </div>
  )
}

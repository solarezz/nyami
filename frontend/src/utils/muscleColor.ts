// Стабильный цвет-акцент для бейджа мышечной группы (визуально различать группы в списке).
const PALETTE = ['vio', 'blu', 'pnk', 'yel', 'tea', 'org'] as const

export function muscleColorVars(name: string): { bg: string; fg: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  const key = PALETTE[hash % PALETTE.length]
  return {
    bg: `color-mix(in srgb, var(--v2-${key}) 18%, transparent)`,
    fg: `var(--v2-${key}-ink)`,
  }
}

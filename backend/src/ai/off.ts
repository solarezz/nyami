// Open Food Facts — открытая база продуктов (есть RU/BY товары). Берём калорийность
// на 100 г из неё для упакованных/брендовых продуктов, а не «на глаз» из модели.

export interface OffDensity {
  per100kcal: number
  per100protein: number
  per100carbs: number
  per100fat: number
  matched: string
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

/** Поиск по названию/бренду. Best-effort: при любой проблеме возвращает null. */
export async function offLookup(query: string): Promise<OffDensity | null> {
  const q = query.trim()
  if (q.length < 3) return null

  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=5' +
    '&fields=product_name,brands,nutriments&search_terms=' + encodeURIComponent(q)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Nyami/1.0 (calorie tracker)' } })
    if (!res.ok) return null
    const data = (await res.json()) as { products?: Record<string, unknown>[] }
    for (const p of data.products ?? []) {
      const n = (p.nutriments ?? {}) as Record<string, unknown>
      const kcal = num(n['energy-kcal_100g'])
      if (kcal > 0) {
        return {
          per100kcal: kcal,
          per100protein: num(n['proteins_100g']),
          per100carbs: num(n['carbohydrates_100g']),
          per100fat: num(n['fat_100g']),
          matched: String(p.product_name ?? q),
        }
      }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

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

export interface OffProduct extends OffDensity {
  name: string
  servingG: number | null
}

/** Точный поиск по штрихкоду (EAN/UPC). Возвращает данные продукта или null. */
export async function offByBarcode(code: string): Promise<OffProduct | null> {
  const c = code.replace(/\D/g, '')
  if (c.length < 6) return null

  const url = `https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=product_name,brands,nutriments,serving_quantity`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Nyami/1.0 (calorie tracker)' } })
    if (!res.ok) return null
    const data = (await res.json()) as { status?: number; product?: Record<string, unknown> }
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const n = (p.nutriments ?? {}) as Record<string, unknown>
    const kcal = num(n['energy-kcal_100g'])
    if (kcal <= 0) return null
    const serving = num(p.serving_quantity)
    const brand = String(p.brands ?? '').split(',')[0].trim()
    const name = String(p.product_name ?? '').trim() || brand || 'Продукт'
    return {
      name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
      per100kcal: kcal,
      per100protein: num(n['proteins_100g']),
      per100carbs: num(n['carbohydrates_100g']),
      per100fat: num(n['fat_100g']),
      servingG: serving > 0 ? serving : null,
      matched: name,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
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

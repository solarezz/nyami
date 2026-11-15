import { useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { useData } from '../data/store'
import type { Screen } from '../App'

export function Result({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { pending, setPending, pendingImage, setPendingImage, addMeal } = useData()
  const [grams, setGrams] = useState(pending?.grams ?? 100)
  // Масса каждого extra редактируется независимо от основного блюда и друг от друга.
  const [extraGrams, setExtraGrams] = useState<number[]>(() => pending?.extras.map((e) => e.grams) ?? [])
  const [saving, setSaving] = useState(false)

  // Если распознавание не готово (зашли напрямую) — вернём на «Добавить».
  if (!pending) {
    return (
      <div className="screen v3-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <button type="button" className="v3-btn-primary" style={{ maxWidth: 240, justifyContent: 'center' }} onClick={() => onNavigate('add')}>
          Добавить еду<MaterialIcon name="arrow_forward" variant="rounded" size={22} />
        </button>
      </div>
    )
  }

  const r = pending
  const kcalPer = r.kcal / r.grams
  const kcal = Math.round(kcalPer * grams)
  const scale = grams / r.grams
  const scaledExtras = r.extras.map((e, i) => {
    const g = extraGrams[i] ?? e.grams
    const s = e.grams > 0 ? g / e.grams : 1
    return {
      name: e.name, emoji: e.emoji, grams: g,
      kcal: Math.round(e.kcal * s), protein: Math.round(e.protein * s), carbs: Math.round(e.carbs * s), fat: Math.round(e.fat * s),
    }
  })
  const totalKcal = kcal + scaledExtras.reduce((s, e) => s + e.kcal, 0)
  const totalProtein = Math.round(r.protein * scale) + scaledExtras.reduce((s, e) => s + e.protein, 0)
  const totalFat = Math.round(r.fat * scale) + scaledExtras.reduce((s, e) => s + e.fat, 0)
  const totalCarbs = Math.round(r.carbs * scale) + scaledExtras.reduce((s, e) => s + e.carbs, 0)
  const totalGrams = grams + scaledExtras.reduce((s, e) => s + e.grams, 0)
  const confidencePct = Math.round(r.confidence * 100)

  const changeGrams = (g: number) => setGrams(Math.max(1, g))
  const changeExtra = (i: number, g: number) => setExtraGrams((prev) => { const next = [...prev]; next[i] = Math.max(1, g); return next })

  const confirm = async () => {
    if (saving) return
    setSaving(true)
    try {
      // Один приём пищи с несколькими компонентами — масса и БЖУ каждого компонента
      // хранятся независимо (можно поменять порцию гарнира, не трогая основное блюдо).
      await addMeal({
        name: r.name, emoji: r.emoji,
        items: [
          { name: r.name, emoji: r.emoji, grams, kcal, protein: Math.round(r.protein * scale), carbs: Math.round(r.carbs * scale), fat: Math.round(r.fat * scale) },
          ...scaledExtras,
        ],
      })
      setPending(null)
      setPendingImage(null)
      onNavigate('today')
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="screen v3-screen gap fade">
      <div className="v3-h1">Проверь и добавь</div>

      <div className="scrollarea">
        {pendingImage ? (
          <div className="v3-photoframe">
            <img src={pendingImage} alt={r.name} />
            <div className="v3-aibadge"><MaterialIcon name="auto_awesome" variant="rounded" size={15} />Оценка ИИ · уверенность {confidencePct}%</div>
          </div>
        ) : (
          <div className="v3-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MaterialIcon name="auto_awesome" variant="rounded" size={20} style={{ color: '#D99A00' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v3-mu)' }}>Оценка ИИ · уверенность {confidencePct}%</span>
          </div>
        )}

        <div>
          <div style={{ fontSize: 26, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-.035em' }}>{r.emoji} {r.name}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--v3-mu)', marginTop: 4 }}>
            {r.extras.length > 0 ? `${r.extras.length + 1} компонентов · массу можно поправить` : 'массу можно поправить'}
          </div>
        </div>

        <div className="v3-card v3-totalsgrid">
          <div>
            <div className="v3-field-label">Итого</div>
            <div className="num" style={{ fontSize: 30, lineHeight: 1, fontWeight: 700, letterSpacing: '-.04em', color: '#F07A2B' }}>{totalKcal}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--v3-mu)' }}>ккал · {totalGrams} г</div>
          </div>
          <div>
            <div className="v3-totalbar" style={{ background: 'var(--v3-vio)' }} />
            <div className="num" style={{ fontSize: 17, fontWeight: 700 }}>{totalProtein}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--v3-mu)' }}>белки, г</div>
          </div>
          <div>
            <div className="v3-totalbar" style={{ background: '#FFA23D' }} />
            <div className="num" style={{ fontSize: 17, fontWeight: 700 }}>{totalFat}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--v3-mu)' }}>жиры, г</div>
          </div>
          <div>
            <div className="v3-totalbar" style={{ background: 'var(--v3-blu)' }} />
            <div className="num" style={{ fontSize: 17, fontWeight: 700 }}>{totalCarbs}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--v3-mu)' }}>углев., г</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <IngredientRow name={`${r.emoji} ${r.name}`} kcal={kcal} protein={Math.round(r.protein * scale)} fat={Math.round(r.fat * scale)} carbs={Math.round(r.carbs * scale)} grams={grams} onChange={changeGrams} />
          {scaledExtras.map((e, i) => (
            <IngredientRow key={`${e.name}-${i}`} name={`${e.emoji} ${e.name}`} kcal={e.kcal} protein={e.protein} fat={e.fat} carbs={e.carbs} grams={e.grams} onChange={(g) => changeExtra(i, g)} />
          ))}
        </div>

        <button type="button" className="v3-btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={confirm} disabled={saving}>
          {saving ? 'Добавляю…' : `Добавить в обед · ${totalKcal} ккал`}
          <MaterialIcon name={saving ? 'hourglass_top' : 'check'} variant="rounded" size={22} />
        </button>
      </div>
    </div>
  )
}

function IngredientRow({
  name, kcal, protein, fat, carbs, grams, onChange,
}: { name: string; kcal: number; protein: number; fat: number; carbs: number; grams: number; onChange: (g: number) => void }) {
  return (
    <div className="v3-ingrow">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-mu)', marginTop: 3 }}>
          <span style={{ color: 'var(--v3-ink)', fontWeight: 700 }}>{kcal} ккал</span> · Б {protein} · Ж {fat} · У {carbs}
        </div>
      </div>
      <div className="v3-qtystepper">
        <button type="button" onClick={() => onChange(grams - 10)}><MaterialIcon name="remove" variant="rounded" size={18} /></button>
        <input type="number" value={grams} onChange={(e) => onChange(Number(e.target.value) || 0)} />
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--v3-mu)', marginLeft: -2 }}>г</span>
        <button type="button" onClick={() => onChange(grams + 10)}><MaterialIcon name="add" variant="rounded" size={18} /></button>
      </div>
    </div>
  )
}

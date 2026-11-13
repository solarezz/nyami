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
      <div className="screen v2-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <button type="button" className="v2-btn" style={{ maxWidth: 240 }} onClick={() => onNavigate('add')}>
          Добавить еду<span className="v2-btn-ic"><MaterialIcon name="arrow_forward" size={22} /></span>
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
    <div className="screen v2-screen gap fade">
      <div className="v2-h1">Проверь и добавь</div>

      <div className="scrollarea">
        {pendingImage ? (
          <div className="v2-photoframe">
            <img src={pendingImage} alt={r.name} />
            <div className="v2-aibadge"><MaterialIcon name="auto_awesome" size={15} />Оценка ИИ · уверенность {confidencePct}%</div>
          </div>
        ) : (
          <div className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MaterialIcon name="auto_awesome" size={20} style={{ color: 'var(--v2-yel)' }} />
            <span style={{ font: '600 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Оценка ИИ · уверенность {confidencePct}%</span>
          </div>
        )}

        <div>
          <div style={{ font: '800 26px/1.05 var(--v2-font-text)', letterSpacing: '-.035em' }}>{r.emoji} {r.name}</div>
          <div style={{ font: '500 13px var(--v2-font-text)', color: 'var(--v2-mu)', marginTop: 4 }}>
            {r.extras.length > 0 ? `${r.extras.length + 1} компонентов · массу можно поправить` : 'массу можно поправить'}
          </div>
        </div>

        <div className="v2-card v2-totalsgrid">
          <div>
            <div className="v2-field-label">Итого</div>
            <div style={{ font: '700 30px/1 var(--v2-font-num)', letterSpacing: '-.04em', color: 'var(--v2-org-ink)' }}>{totalKcal}</div>
            <div style={{ font: '500 11px var(--v2-font-text)', color: 'var(--v2-mu)' }}>ккал · {totalGrams} г</div>
          </div>
          <div>
            <div className="v2-totalbar" style={{ background: 'var(--v2-vio)' }} />
            <div style={{ font: '700 17px var(--v2-font-num)' }}>{totalProtein}</div>
            <div style={{ font: '500 11px var(--v2-font-text)', color: 'var(--v2-mu)' }}>белки, г</div>
          </div>
          <div>
            <div className="v2-totalbar" style={{ background: 'var(--v2-yel)' }} />
            <div style={{ font: '700 17px var(--v2-font-num)' }}>{totalFat}</div>
            <div style={{ font: '500 11px var(--v2-font-text)', color: 'var(--v2-mu)' }}>жиры, г</div>
          </div>
          <div>
            <div className="v2-totalbar" style={{ background: 'var(--v2-tea)' }} />
            <div style={{ font: '700 17px var(--v2-font-num)' }}>{totalCarbs}</div>
            <div style={{ font: '500 11px var(--v2-font-text)', color: 'var(--v2-mu)' }}>углев., г</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <IngredientRow name={`${r.emoji} ${r.name}`} kcal={kcal} protein={Math.round(r.protein * scale)} fat={Math.round(r.fat * scale)} carbs={Math.round(r.carbs * scale)} grams={grams} onChange={changeGrams} />
          {scaledExtras.map((e, i) => (
            <IngredientRow key={`${e.name}-${i}`} name={`${e.emoji} ${e.name}`} kcal={e.kcal} protein={e.protein} fat={e.fat} carbs={e.carbs} grams={e.grams} onChange={(g) => changeExtra(i, g)} />
          ))}
        </div>

        <button type="button" className="v2-btn" onClick={confirm} disabled={saving}>
          {saving ? 'Добавляю…' : `Добавить в обед · ${totalKcal} ккал`}
          <span className="v2-btn-ic"><MaterialIcon name={saving ? 'hourglass_top' : 'check'} size={22} /></span>
        </button>
      </div>
    </div>
  )
}

function IngredientRow({
  name, kcal, protein, fat, carbs, grams, onChange,
}: { name: string; kcal: number; protein: number; fat: number; carbs: number; grams: number; onChange: (g: number) => void }) {
  return (
    <div className="v2-ingrow">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 14px var(--v2-font-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ font: '500 12px var(--v2-font-num)', color: 'var(--v2-mu)', marginTop: 3 }}>
          <span style={{ color: 'var(--v2-tx)', fontWeight: 700 }}>{kcal} ккал</span> · Б {protein} · Ж {fat} · У {carbs}
        </div>
      </div>
      <div className="v2-qtystepper">
        <button type="button" onClick={() => onChange(grams - 10)}><MaterialIcon name="remove" size={18} /></button>
        <input type="number" value={grams} onChange={(e) => onChange(Number(e.target.value) || 0)} />
        <span style={{ font: '500 11px var(--v2-font-text)', color: 'var(--v2-mu)', marginLeft: -2 }}>г</span>
        <button type="button" onClick={() => onChange(grams + 10)}><MaterialIcon name="add" size={18} /></button>
      </div>
    </div>
  )
}

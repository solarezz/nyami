import { useState } from 'react'
import { Icon } from '../components/Icons'
import { useData } from '../data/store'
import { haptic } from '../telegram'
import type { Screen } from '../App'

export function Result({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { pending, setPending, addMeal } = useData()
  const [grams, setGrams] = useState(pending?.grams ?? 100)
  const [saving, setSaving] = useState(false)

  // Если распознавание не готово (зашли напрямую) — вернём на «Добавить».
  if (!pending) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <button className="btn" style={{ maxWidth: 240 }} onClick={() => onNavigate('add')}>Добавить еду</button>
      </div>
    )
  }

  const r = pending
  const kcalPer = r.kcal / r.grams
  const kcal = Math.round(kcalPer * grams)
  const scale = grams / r.grams
  const extrasKcal = r.extras.reduce((s, e) => s + e.kcal, 0)
  const total = kcal + extrasKcal

  const step = (delta: number) => {
    haptic('light')
    setGrams((g) => Math.max(10, g + delta))
  }

  const confirm = async () => {
    if (saving) return
    setSaving(true)
    try {
      await addMeal({
        name: r.name, emoji: r.emoji, kcal,
        protein: Math.round(r.protein * scale),
        carbs: Math.round(r.carbs * scale),
        fat: Math.round(r.fat * scale),
      })
      for (const e of r.extras) {
        await addMeal({ name: e.name, emoji: e.emoji, kcal: e.kcal, protein: 0, carbs: 0, fat: 0 })
      }
      setPending(null)
      onNavigate('today')
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <button className="iconbtn" onClick={() => onNavigate('add')} aria-label="Назад"><Icon name="chevl" /></button>
        <div className="h2">Проверь и добавь</div>
      </div>

      <div className="scrollarea">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div className="thumb" style={{ width: 58, height: 58, borderRadius: 18, background: 'var(--prot-soft)', display: 'grid', placeItems: 'center', fontSize: 30, flex: 'none' }}>{r.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.05 }}>{r.name}</div>
              <span className="confpill" style={{ marginTop: 6 }}>оценка ±{Math.round((1 - r.confidence) * 100)}%</span>
            </div>
          </div>

          <div className="frow"><span className="muted">Порция</span>
            <div className="stepper">
              <b onClick={() => step(-10)}><Icon name="minus" /></b>
              <span className="sv">{grams} г</span>
              <b onClick={() => step(10)}><Icon name="plus" /></b>
            </div>
          </div>
          <div className="frow"><span className="muted">Калории</span><span className="fv" style={{ color: 'var(--accent)' }}>{kcal} ккал</span></div>

          <div className="chips" style={{ marginTop: 12, justifyContent: 'space-around' }}>
            <MacroChip color="var(--prot)" value={Math.round(r.protein * scale)} label="белки" />
            <MacroChip color="var(--carb)" value={Math.round(r.carbs * scale)} label="углев." />
            <MacroChip color="var(--fat)" value={Math.round(r.fat * scale)} label="жиры" />
          </div>
        </div>

        {r.extras.map((e) => (
          <div className="meal" key={e.name}>
            <div className="thumb" style={{ background: 'var(--carb-soft)' }}>{e.emoji}</div>
            <div className="mm">
              <div className="nm">{e.name}</div>
              <div className="chips"><span className="muted" style={{ fontSize: 12 }}>{e.grams} г · добавил ИИ</span></div>
            </div>
            <div className="rt"><div className="kc">{e.kcal}<small> ккал</small></div></div>
          </div>
        ))}

        <div style={{ flex: 1 }} />
        <button className="btn" onClick={confirm} disabled={saving} style={saving ? { opacity: 0.7 } : undefined}>
          <Icon name="check" />{saving ? 'Добавляю…' : `Добавить · ${total} ккал`}
        </button>
        <button className="btn ghost">Поправить</button>
      </div>
    </div>
  )
}

function MacroChip({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <span style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
      <i style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{value} {label}
    </span>
  )
}

import { useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { frequentMeals } from '../data/mock'
import { useData } from '../data/store'
import { fileToDataUrl } from '../utils/image'
import type { Screen } from '../App'

export function AddFood({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { recognize, addMeal } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<false | 'text' | 'photo' | 'quick'>(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const addQuick = async (f: { emoji: string; name: string; kcal: number }) => {
    if (busy) return
    setBusy('quick')
    try {
      await addMeal({ name: f.name, emoji: f.emoji, kcal: f.kcal, protein: 0, carbs: 0, fat: 0 })
      onNavigate('today')
    } catch {
      setBusy(false)
    }
  }

  const onRecognizeText = async () => {
    if (busy) return
    if (!text.trim()) {
      textRef.current?.focus()
      return
    }
    setBusy('text')
    try {
      await recognize({ text })
      onNavigate('result')
    } catch {
      setBusy(false)
    }
  }

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // чтобы повторный выбор того же файла срабатывал
    if (!file || busy) return
    setBusy('photo')
    try {
      const imageBase64 = await fileToDataUrl(file)
      await recognize({ imageBase64 })
      onNavigate('result')
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <div className="h2">Добавить еду</div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />

      <div className="scrollarea">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <button
            className="optcard" style={{ background: 'var(--accent)', color: '#fff', opacity: busy === 'photo' ? 0.7 : 1 }}
            onClick={() => fileRef.current?.click()} disabled={busy !== false}
          >
            <Icon name="camera" /><div className="ol">{busy === 'photo' ? 'Распознаю…' : 'Сфотографировать'}</div>
          </button>
          <button className="optcard" style={{ background: 'var(--card)' }} onClick={() => textRef.current?.focus()} disabled={busy !== false}>
            <Icon name="pencil" style={{ color: 'var(--accent)' }} /><div className="ol">Описать словами</div>
          </button>
        </div>

        <div className="tiny">Что ты съел</div>
        <textarea ref={textRef} className="inputcard" rows={2} value={text} placeholder="Напиши блюдо: «тарелка борща со сметаной»…" onChange={(e) => setText(e.target.value)} />

        <div className="tiny">Часто</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {frequentMeals.map((f) => (
            <button className="qchip" key={f.name} onClick={() => addQuick(f)} disabled={busy !== false}>
              {f.emoji} {f.name}<span className="muted" style={{ marginLeft: 'auto' }}>{f.kcal}</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn" onClick={onRecognizeText} disabled={busy !== false} style={busy ? { opacity: 0.7 } : undefined}>
          <Icon name="spark" />{busy === 'text' ? 'Распознаю…' : 'Распознать через ИИ'}
        </button>
        <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>Powered by Groq · оценка ±15%</div>
      </div>
    </div>
  )
}

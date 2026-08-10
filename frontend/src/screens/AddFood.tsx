import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { api } from '../api'
import { useData } from '../data/store'
import { fileToDataUrl } from '../utils/image'
import { decodeBarcode } from '../utils/barcode'
import { showAlert } from '../telegram'
import type { Screen } from '../App'
import type { FrequentMeal } from '../types'

export function AddFood({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { recognize, recognizeBarcode, addMeal } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<false | 'text' | 'photo' | 'quick' | 'barcode'>(false)
  const [frequent, setFrequent] = useState<FrequentMeal[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.getFrequent().then(setFrequent).catch(() => {})
  }, [])

  const addQuick = async (f: FrequentMeal) => {
    if (busy) return
    setBusy('quick')
    try {
      await addMeal({ name: f.name, emoji: f.emoji, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })
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

  const onBarcode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || busy) return
    setBusy('barcode')
    try {
      const code = await decodeBarcode(file)
      if (!code) {
        showAlert('Не разглядел штрихкод — сфоткай его крупнее и ровнее, при хорошем свете.')
        setBusy(false)
        return
      }
      await recognizeBarcode(code)
      onNavigate('result')
    } catch {
      showAlert('Такого продукта нет в базе Open Food Facts. Добавь по фото или тексту.')
      setBusy(false)
    }
  }

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <div className="h2">Добавить еду</div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
      <input ref={barcodeRef} type="file" accept="image/*" capture="environment" onChange={onBarcode} hidden />

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

        <button
          className="optcard" style={{ background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, flexDirection: 'row', padding: '14px' }}
          onClick={() => barcodeRef.current?.click()} disabled={busy !== false}
        >
          <Icon name="barcode" style={{ color: 'var(--accent)' }} />
          <span className="ol" style={{ margin: 0 }}>{busy === 'barcode' ? 'Сканирую…' : 'Сканировать штрихкод'}</span>
        </button>

        <div className="tiny">Что ты съел</div>
        <textarea ref={textRef} className="inputcard" rows={2} value={text} placeholder="Напиши блюдо: «тарелка борща со сметаной»…" onChange={(e) => setText(e.target.value)} />

        {frequent.length > 0 && (
          <>
            <div className="tiny">Часто</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {frequent.map((f) => (
                <button className="qchip" key={f.name} onClick={() => addQuick(f)} disabled={busy !== false}>
                  {f.emoji} {f.name}<span className="muted" style={{ marginLeft: 'auto' }}>{f.kcal}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />
        <button className="btn" onClick={onRecognizeText} disabled={busy !== false} style={busy ? { opacity: 0.7 } : undefined}>
          <Icon name="spark" />{busy === 'text' ? 'Распознаю…' : 'Распознать через ИИ'}
        </button>
        <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>Powered by Groq · оценка ±15%</div>
      </div>
    </div>
  )
}

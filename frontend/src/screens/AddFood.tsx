import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { AiOverlay } from '../components/AiOverlay'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { api } from '../api'
import { useData } from '../data/store'
import { fileToDataUrl } from '../utils/image'
import { showAlert } from '../telegram'
import type { Screen } from '../App'
import type { FrequentMeal } from '../types'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус',
}

export function AddFood({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { recognize, recognizeBarcode, addMeal, selectedMealType, setPendingImage } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<false | 'text' | 'photo' | 'quick' | 'barcode'>(false)
  const [frequent, setFrequent] = useState<FrequentMeal[]>([])
  const [scanning, setScanning] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getFrequent().then(setFrequent).catch(() => {})
  }, [])

  const addQuick = async (f: FrequentMeal) => {
    if (busy) return
    setBusy('quick')
    try {
      // Масса неизвестна (частое блюдо хранит только итоговые КБЖУ) — 100 г нейтральная оценка порции.
      await addMeal({ name: f.name, emoji: f.emoji, items: [{ name: f.name, emoji: f.emoji, grams: 100, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }] })
      onNavigate('today')
    } catch {
      setBusy(false)
    }
  }

  const onRecognizeText = async () => {
    if (busy) return
    if (!text.trim()) return
    setBusy('text')
    try {
      setPendingImage(null)
      await recognize({ text })
      onNavigate('result')
    } catch {
      showAlert('Не смог распознать. Сформулируй иначе или добавь фото/штрихкод.')
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
      setPendingImage(imageBase64)
      await recognize({ imageBase64 })
      onNavigate('result')
    } catch {
      setPendingImage(null)
      showAlert('Не смог распознать это фото. Сфоткай поближе и при хорошем свете, или опиши текстом.')
      setBusy(false)
    }
  }

  // Фото упаковки: ИИ прочитает таблицу КБЖУ/состав. Наш «бесконечный» запасной план.
  const openLabelPhoto = () => {
    setScanning(false)
    cameraRef.current?.click()
  }

  const onScanDetected = async (code: string) => {
    setScanning(false)
    setBusy('barcode')
    try {
      setPendingImage(null)
      await recognizeBarcode(code)
      onNavigate('result')
    } catch {
      // Штрихкода нет в базе (частый случай для RU/BY) → читаем этикетку с фото.
      setBusy(false)
      showAlert('Этого товара нет в базе. Сфоткай таблицу КБЖУ / состав с упаковки — распознаю по ней.')
      openLabelPhoto()
    }
  }

  // Камера для живого сканера недоступна → сразу к фото упаковки.
  const onScanError = () => {
    showAlert('Камера недоступна для сканера. Сфоткай упаковку с составом — прочитаю КБЖУ.')
    openLabelPhoto()
  }

  const overlayText = busy === 'photo' ? 'Распознаю блюдо по фото…' : busy === 'text' ? 'Распознаю блюдо…' : busy === 'barcode' ? 'Ищу товар…' : ''

  return (
    <>
      {busy && busy !== 'quick' && <AiOverlay text={overlayText} />}
      {scanning && (
        <BarcodeScanner
          onDetected={onScanDetected}
          onClose={() => setScanning(false)}
          onError={onScanError}
          onManual={openLabelPhoto}
        />
      )}
      <div className="screen v2-screen gap fade">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
        <input ref={galleryRef} type="file" accept="image/*" onChange={onPhoto} hidden />

        <div className="v2-h1">{selectedMealType ? `Добавить: ${MEAL_LABELS[selectedMealType]}` : 'Добавить еду'}</div>

        <div className="scrollarea">
          <button type="button" className="v2-photocta" onClick={() => cameraRef.current?.click()} disabled={busy !== false}>
            <div style={{ position: 'absolute', right: 16, top: 16, width: 84, height: 84, border: '2.5px solid var(--v2-on)', borderRadius: 10, opacity: 0.25 }} />
            <div className="v2-photocta-ic"><MaterialIcon name="photo_camera" size={28} fill /></div>
            <div>
              <div style={{ font: '800 22px/1.05 var(--v2-font-text)', letterSpacing: '-.03em' }}>{busy === 'photo' ? 'Распознаю…' : 'Сфотографировать блюдо'}</div>
              <div style={{ font: '600 13px var(--v2-font-text)', marginTop: 6, opacity: 0.75 }}>ИИ определит ингредиенты и массу</div>
            </div>
          </button>

          <div className="v2-opt2">
            <button type="button" className="v2-optmini" onClick={() => setScanning(true)} disabled={busy !== false}>
              <div className="v2-optmini-ic" style={{ background: 'color-mix(in srgb, var(--v2-org) 20%, transparent)', color: 'var(--v2-org-ink)' }}><MaterialIcon name="barcode_scanner" size={22} /></div>
              <div>
                <div style={{ font: '700 15px var(--v2-font-text)' }}>{busy === 'barcode' ? 'Сканирую…' : 'Штрихкод'}</div>
                <div style={{ font: '500 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>данные с упаковки</div>
              </div>
            </button>
            <button type="button" className="v2-optmini" onClick={() => galleryRef.current?.click()} disabled={busy !== false}>
              <div className="v2-optmini-ic" style={{ background: 'color-mix(in srgb, var(--v2-org) 20%, transparent)', color: 'var(--v2-org-ink)' }}><MaterialIcon name="image" size={22} /></div>
              <div>
                <div style={{ font: '700 15px var(--v2-font-text)' }}>Из галереи</div>
                <div style={{ font: '500 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>готовое фото</div>
              </div>
            </button>
          </div>

          <div className="v2-textrow">
            <textarea
              rows={1} value={text} placeholder="Напиши блюдо: «тарелка борща со сметаной»…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRecognizeText() } }}
            />
            <button type="button" className="v2-sendbtn" onClick={onRecognizeText} disabled={busy !== false || !text.trim()}>
              <MaterialIcon name={busy === 'text' ? 'hourglass_top' : 'arrow_upward'} size={20} />
            </button>
          </div>

          <div className="v2-aihint">
            <MaterialIcon name="auto_awesome" size={20} style={{ color: 'var(--v2-yel)', flex: 'none' }} />
            <div><span style={{ fontWeight: 700, color: 'var(--v2-tx)' }}>Фото и текст распознаёт ИИ — это оценка.</span> Масса и калории приблизительные, проверь их перед сохранением. Штрихкод даёт данные производителя.</div>
          </div>

          {frequent.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 }}>
                <span style={{ font: '700 17px var(--v2-font-text)' }}>Частые блюда</span>
                <span style={{ font: '600 12px var(--v2-font-text)', color: 'var(--v2-mu)' }}>за 30 дней</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {frequent.map((f) => (
                  <button type="button" className="v2-freqrow" key={f.name} onClick={() => addQuick(f)} disabled={busy !== false}>
                    <div className="v2-meal-thumb" style={{ borderTop: 'none' }}>{f.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 14px var(--v2-font-text)' }}>{f.name}</div>
                      <div style={{ font: '500 12px var(--v2-font-num)', color: 'var(--v2-mu)' }}>{f.kcal} ккал</div>
                    </div>
                    <div className="v2-stepbtn" style={{ width: 36, height: 36, color: 'var(--v2-org-ink)' }}><MaterialIcon name="add" size={20} /></div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

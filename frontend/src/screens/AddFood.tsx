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

// v3 — редизайн по Fitness App.dc.html, экран «06 · Добавить еду». В макете это
// поиск по каталогу продуктов, которого у нас нет: распознавание идёт через ИИ
// (фото/текст/штрихкод), поэтому поисковая строка макета переиспользована как
// поле описания блюда, а не как настоящий поиск.

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
      <div className="screen v3-screen gap fade">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
        <input ref={galleryRef} type="file" accept="image/*" onChange={onPhoto} hidden />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="v3-iconbtn" aria-label="Назад" onClick={() => onNavigate('today')}><MaterialIcon name="arrow_back" variant="rounded" size={22} /></button>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{selectedMealType ? `Добавить: ${MEAL_LABELS[selectedMealType]}` : 'Добавить еду'}</div>
        </div>

        <div className="scrollarea">
          <button type="button" className="v3-photocta" onClick={() => cameraRef.current?.click()} disabled={busy !== false}>
            <div style={{ position: 'absolute', right: 16, top: 16, width: 84, height: 84, border: '2.5px solid #fff', borderRadius: 14, opacity: 0.25 }} />
            <div className="v3-photocta-ic"><MaterialIcon name="photo_camera" variant="rounded" size={28} fill /></div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-.02em' }}>{busy === 'photo' ? 'Распознаю…' : 'Сфотографировать блюдо'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, opacity: 0.85 }}>ИИ определит ингредиенты и массу</div>
            </div>
          </button>

          <div className="v3-opt2">
            <button type="button" className="v3-optmini" onClick={() => setScanning(true)} disabled={busy !== false}>
              <div className="v3-optmini-ic" style={{ background: 'var(--v3-org-track)', color: '#F07A2B' }}><MaterialIcon name="barcode_scanner" variant="rounded" size={22} /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{busy === 'barcode' ? 'Сканирую…' : 'Штрихкод'}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-mu)' }}>данные с упаковки</div>
              </div>
            </button>
            <button type="button" className="v3-optmini" onClick={() => galleryRef.current?.click()} disabled={busy !== false}>
              <div className="v3-optmini-ic" style={{ background: 'var(--v3-org-track)', color: '#F07A2B' }}><MaterialIcon name="image" variant="rounded" size={22} /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Из галереи</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-mu)' }}>готовое фото</div>
              </div>
            </button>
          </div>

          <div className="v3-searchrow">
            <MaterialIcon name="search" variant="rounded" size={22} style={{ color: 'var(--v3-mu)' }} />
            <textarea
              rows={1} value={text} placeholder="Напиши блюдо: «тарелка борща со сметаной»…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRecognizeText() } }}
            />
            <button type="button" className="v3-sendbtn" onClick={onRecognizeText} disabled={busy !== false || !text.trim()}>
              <MaterialIcon name={busy === 'text' ? 'hourglass_top' : 'arrow_upward'} variant="rounded" size={20} />
            </button>
          </div>

          <div className="v3-aihint">
            <MaterialIcon name="auto_awesome" variant="rounded" size={20} style={{ color: '#D99A00', flex: 'none' }} />
            <div><span style={{ fontWeight: 700, color: 'var(--v3-ink)' }}>Фото и текст распознаёт ИИ — это оценка.</span> Масса и калории приблизительные, проверь их перед сохранением. Штрихкод даёт данные производителя.</div>
          </div>

          {frequent.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>Частые блюда</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>за 30 дней</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {frequent.map((f) => (
                  <button type="button" className="v3-meal-row" key={f.name} onClick={() => addQuick(f)} disabled={busy !== false} style={{ border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                    <div className="thumb">{f.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                      <div className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--v3-mu)' }}>{f.kcal} ккал</div>
                    </div>
                    <div className="v3-mini-stepbtn" style={{ background: 'var(--v3-org-track)', color: '#F07A2B' }}><MaterialIcon name="add" variant="rounded" size={20} /></div>
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

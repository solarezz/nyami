import { useEffect, useRef } from 'react'
import { Icon } from './Icons'

// Живой сканер штрихкода: камера + непрерывное распознавание (ZXing).
export function BarcodeScanner({
  onDetected, onClose, onError,
}: {
  onDetected: (code: string) => void
  onClose: () => void
  onError: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let controls: { stop: () => void } | null = null
    let done = false

    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        // facingMode environment — задняя камера.
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (result) => {
            if (result && !done) {
              done = true
              onDetected(result.getText())
            }
          },
        )
      } catch {
        onError()
      }
    })()

    return () => {
      done = true
      controls?.stop()
    }
  }, [onDetected, onError])

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner-video" playsInline muted />
      <div className="scanner-frame" />
      <div className="scanner-hint">Наведи камеру на штрихкод</div>
      <button className="scanner-close" onClick={onClose} aria-label="Закрыть"><Icon name="x" /></button>
    </div>
  )
}

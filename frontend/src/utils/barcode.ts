// Декодирует штрихкод из фото. Быстрый путь — нативный BarcodeDetector
// (Android/Chrome), иначе кросс-платформенный ZXing (ленивая загрузка).

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

export async function decodeBarcode(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (i: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (native) {
      try {
        const det = new native({ formats: FORMATS })
        const img = await loadImage(url)
        const codes = await det.detect(img)
        if (codes.length) return codes[0].rawValue
      } catch {
        /* упадём на ZXing */
      }
    }
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const reader = new BrowserMultiFormatReader()
    const result = await reader.decodeFromImageUrl(url)
    return result.getText()
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

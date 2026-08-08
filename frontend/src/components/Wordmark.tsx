// Логотип-вордмарк Nya[mi] — «mi» в зелёной скруглённой рамке.

export function Wordmark({ size = 23 }: { size?: number }) {
  return (
    <span className="wmlogo" style={{ fontSize: size }}>
      Nya<span className="box">mi</span>
    </span>
  )
}

// Полноэкранный оверлей на время многосекундного запроса к ИИ.
export function AiOverlay({ text }: { text: string }) {
  return (
    <div className="ai-overlay">
      <div className="box">
        <div className="spin" />
        <div className="txt">{text}</div>
      </div>
    </div>
  )
}

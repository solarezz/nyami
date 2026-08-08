import { useState } from 'react'
import { Icon } from '../components/Icons'
import { Ring } from '../components/Ring'
import { useData } from '../data/store'
import { haptic } from '../telegram'
import type { Screen } from '../App'
import type { ChatMessage } from '../types'

export function Coach({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { day, askCoach } = useData()
  const left = day ? day.goalKcal - day.eatenKcal : 0
  const frac = day ? day.eatenKcal / day.goalKcal : 0

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greet', role: 'coach', text: `Привет! На сегодня осталось **${left} ккал**. Спрашивай, если сомневаешься 🙂` },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    haptic('light')
    setInput('')
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text }])
    setBusy(true)
    try {
      const reply = await askCoach(text)
      setMessages((m) => [...m, { id: `c${Date.now()}`, role: 'coach', text: reply }])
    } catch {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: 'coach', text: 'Не получилось ответить, попробуй ещё раз.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen fade" style={{ gap: 12 }}>
      <div className="topbar" style={{ marginBottom: 2 }}>
        <div>
          <div className="h2" style={{ fontSize: 17 }}>Коуч Nyami</div>
          <div className="muted" style={{ fontSize: 12 }}>видит твой день</div>
        </div>
      </div>

      <div className="mini-budget">
        <div>
          <div className="n">{left}</div>
          <div className="s">ккал до нормы</div>
        </div>
        <Ring progress={frac} color="#fff" track="rgba(255,255,255,.35)" size={46} stroke={11} />
      </div>

      <div className="chatarea">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {busy && <div className="bub in muted">…</div>}
      </div>

      <div className="chatbar">
        <input
          className="chatf" placeholder="Спросить у коуча…" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="sendb" aria-label="Отправить" onClick={send}><Icon name="send" /></button>
      </div>
    </div>
  )
}

// Простой рендер **жирного** внутри пузыря.
function Bubble({ msg }: { msg: ChatMessage }) {
  const parts = msg.text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <div className={`bub ${msg.role === 'user' ? 'out' : 'in'}`}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>,
      )}
    </div>
  )
}

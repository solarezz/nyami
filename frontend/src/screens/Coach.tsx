import { useEffect, useState } from 'react'
import { Icon } from '../components/Icons'
import { Ring } from '../components/Ring'
import { useData } from '../data/store'
import { api } from '../api'
import { haptic } from '../telegram'
import type { Screen } from '../App'
import type { ChatMessage, DaySummary } from '../types'

export function Coach({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { askCoach } = useData()
  // Коуч всегда про СЕГОДНЯ (независимо от выбранного дня на «Сегодня»).
  const [today, setToday] = useState<DaySummary | null>(null)
  const left = today ? today.goalKcal + today.burnedKcal - today.eatenKcal : 0
  const frac = today ? today.eatenKcal / (today.goalKcal + today.burnedKcal) : 0

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getDay().then((d) => {
      setToday(d)
      const l = d.goalKcal + d.burnedKcal - d.eatenKcal
      setMessages([{ id: 'greet', role: 'coach', text: `Привет! На сегодня осталось **${l} ккал**. Спрашивай, если сомневаешься 🙂` }])
    }).catch(() => {
      setMessages([{ id: 'greet', role: 'coach', text: 'Привет! Спрашивай про питание — помогу 🙂' }])
    })
  }, [])

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

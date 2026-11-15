import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { Ring } from '../components/Ring'
import { useData } from '../data/store'
import { api } from '../api'
import { haptic } from '../telegram'
import type { Screen } from '../App'
import type { ChatMessage, DaySummary } from '../types'

// Переписка живёт в модуле, чтобы не сбрасываться при уходе с экрана и обратно.
let cachedMessages: ChatMessage[] = []

// Приветствие с учётом перебора нормы (остаток может быть отрицательным).
function greeting(left: number): string {
  if (left >= 0) return `Привет! На сегодня осталось **${left} ккал**. Спрашивай, если сомневаешься 🙂`
  return `Привет! Сегодня перебор на **${-left} ккал** — давай разберёмся вместе 🙂`
}

export function Coach({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { askCoach } = useData()
  // Коуч всегда про СЕГОДНЯ (независимо от выбранного дня на «Сегодня»).
  const [today, setToday] = useState<DaySummary | null>(null)
  const left = today ? today.goalKcal + today.burnedKcal - today.eatenKcal : 0
  const frac = today ? today.eatenKcal / (today.goalKcal + today.burnedKcal) : 0

  const [messages, setMessages] = useState<ChatMessage[]>(cachedMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Всегда обновляем бюджет дня; приветствие ставим только если переписка пустая.
  useEffect(() => {
    api.getDay().then((d) => {
      setToday(d)
      const l = d.goalKcal + d.burnedKcal - d.eatenKcal
      setMessages((m) => (m.length ? m : [{ id: 'greet', role: 'coach', text: greeting(l) }]))
    }).catch(() => {
      setMessages((m) => (m.length ? m : [{ id: 'greet', role: 'coach', text: 'Привет! Спрашивай про питание — помогу 🙂' }]))
    })
  }, [])

  // Кэшируем переписку и держим её прокрученной к последнему сообщению.
  useEffect(() => {
    cachedMessages = messages
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

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
    <div className="screen v3-screen gap fade">
      <div>
        <div className="v3-h1" style={{ fontSize: 22 }}>Коуч Nyami</div>
        <div className="v3-sub" style={{ fontSize: 12 }}>видит твой день</div>
      </div>

      <div className="v3-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700, color: left < 0 ? '#C2264A' : 'var(--v3-ink)' }}>{left}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v3-mu)' }}>ккал до нормы</div>
        </div>
        <Ring progress={frac} color="var(--v3-green)" track="var(--v3-green-soft)" size={46} stroke={11} />
      </div>

      <div className="v3-chatarea">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {busy && <div className="v3-bub in" style={{ color: 'var(--v3-mu)' }}>…</div>}
        <div ref={endRef} />
      </div>

      <div className="v3-chatbar">
        <input
          className="v3-chatf" placeholder="Спросить у коуча…" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button type="button" className="v3-sendb" aria-label="Отправить" onClick={send}><MaterialIcon name="send" variant="rounded" size={20} /></button>
      </div>
    </div>
  )
}

// Простой рендер **жирного** внутри пузыря.
function Bubble({ msg }: { msg: ChatMessage }) {
  const parts = msg.text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <div className={`v3-bub ${msg.role === 'user' ? 'out' : 'in'}`}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>,
      )}
    </div>
  )
}

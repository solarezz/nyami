import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/onest/400.css'
import '@fontsource/onest/500.css'
import '@fontsource/onest/600.css'
import '@fontsource/onest/700.css'
import '@fontsource/onest/800.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
// v3 (редизайн экрана «Сегодня», макет Fitness App.dc.html) — светлая тема, Inter Tight.
import '@fontsource/inter-tight/400.css'
import '@fontsource/inter-tight/500.css'
import '@fontsource/inter-tight/600.css'
import '@fontsource/inter-tight/700.css'
import '@fontsource/inter-tight/800.css'
// Статический (не вариативный) шрифт — 460 КБ вместо 3.5 МБ у полного вариативного
// набора material-symbols; FILL/GRAD/opsz-настройка недоступна (fallback — contour-стиль).
import '@material-symbols/font-400/sharp.css'
import '@material-symbols/font-400/rounded.css'
import './styles/global.css'
import { App } from './App'
import { initTelegram } from './telegram'

initTelegram()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

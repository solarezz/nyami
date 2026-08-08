import { useState } from 'react'
import { IconSprite } from './components/Icons'
import { DataProvider, useData } from './data/store'
import { Onboarding } from './screens/Onboarding'
import { Today } from './screens/Today'
import { AddFood } from './screens/AddFood'
import { Result } from './screens/Result'
import { Coach } from './screens/Coach'
import { Progress } from './screens/Progress'
import { Profile } from './screens/Profile'

export type Screen = 'onboarding' | 'today' | 'add' | 'result' | 'coach' | 'progress' | 'profile'

export function App() {
  return (
    <div className="app">
      <IconSprite />
      <DataProvider>
        <Root />
      </DataProvider>
    </div>
  )
}

function Root() {
  const { loading, error, onboarded } = useData()

  if (loading) return <Splash text="Загружаем…" />
  if (error) return <Splash text={`Не удалось подключиться к серверу.\n${error}`} />

  return <Router startOnboarding={!onboarded} />
}

function Router({ startOnboarding }: { startOnboarding: boolean }) {
  // Новый пользователь начинает с онбординга, остальные — с «Сегодня».
  const [screen, setScreen] = useState<Screen>(startOnboarding ? 'onboarding' : 'today')

  return (
    <>
      {screen === 'onboarding' && <Onboarding onNavigate={setScreen} />}
      {screen === 'today' && <Today onNavigate={setScreen} />}
      {screen === 'add' && <AddFood onNavigate={setScreen} />}
      {screen === 'result' && <Result onNavigate={setScreen} />}
      {screen === 'coach' && <Coach onNavigate={setScreen} />}
      {screen === 'progress' && <Progress onNavigate={setScreen} />}
      {screen === 'profile' && <Profile onNavigate={setScreen} />}
    </>
  )
}

function Splash({ text }: { text: string }) {
  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'pre-line', color: 'var(--sub)', fontWeight: 800 }}>
      {text}
    </div>
  )
}

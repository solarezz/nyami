import { useEffect, useState } from 'react'
import { IconSprite } from './components/Icons'
import { Button } from './components/ui/Button'
import { TodaySkeleton } from './components/ui/Skeleton'
import { ToastProvider } from './components/ui/Toast'
import { DataProvider, useData } from './data/store'
import { setBackButton } from './telegram'
import { Onboarding } from './screens/Onboarding'
import { Today } from './screens/Today'
import { AddFood } from './screens/AddFood'
import { AddWorkout } from './screens/AddWorkout'
import { Result } from './screens/Result'
import { Coach } from './screens/Coach'
import { Progress } from './screens/Progress'
import { Profile } from './screens/Profile'
import { Training } from './screens/Training'
import { TrainingSession } from './screens/TrainingSession'
import type { ProgramDay } from './types'

export type Screen = 'onboarding' | 'today' | 'add' | 'workout' | 'result' | 'coach' | 'progress' | 'profile' | 'training' | 'session'

export function App() {
  return (
    <div className="app">
      <IconSprite />
      <DataProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </DataProvider>
    </div>
  )
}

function Root() {
  const { loading, error, onboarded, retry } = useData()

  if (loading) return <TodaySkeleton />
  if (error) return <ErrorScreen onRetry={retry} />

  return <Router startOnboarding={!onboarded} />
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
      <div style={{ fontSize: 40 }}>😔</div>
      <div style={{ color: 'var(--sub)', fontWeight: 600, maxWidth: 280 }}>
        Не удалось подключиться. Проверь интернет и попробуй ещё раз.
      </div>
      <Button style={{ maxWidth: 240 }} onClick={onRetry}>Повторить</Button>
    </div>
  )
}

// Куда ведёт нативная кнопка «Назад» с каждого экрана (undefined = кнопки нет).
const BACK_TO: Partial<Record<Screen, Screen>> = { add: 'today', workout: 'today', result: 'add', coach: 'profile' }

interface ActiveSession { sessionId: string; day: ProgramDay; programName: string }

function Router({ startOnboarding }: { startOnboarding: boolean }) {
  // Новый пользователь начинает с онбординга, остальные — с «Сегодня».
  const [screen, setScreen] = useState<Screen>(startOnboarding ? 'onboarding' : 'today')
  // Активная тренировочная сессия живёт здесь (не в глобальном сторе — нужна только
  // для моста между «Тренировки»/«Сегодня» и экраном сессии).
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)

  const startSession = (sessionId: string, day: ProgramDay, programName: string) => {
    setActiveSession({ sessionId, day, programName })
    setScreen('session')
  }
  const finishSession = () => {
    setActiveSession(null)
    setScreen('training')
  }

  useEffect(() => {
    const target = BACK_TO[screen]
    return setBackButton(target ? () => setScreen(target) : null)
  }, [screen])

  return (
    <>
      {screen === 'onboarding' && <Onboarding onNavigate={setScreen} />}
      {screen === 'today' && <Today onNavigate={setScreen} onStartSession={startSession} />}
      {screen === 'add' && <AddFood onNavigate={setScreen} />}
      {screen === 'workout' && <AddWorkout onNavigate={setScreen} />}
      {screen === 'result' && <Result onNavigate={setScreen} />}
      {screen === 'coach' && <Coach onNavigate={setScreen} />}
      {screen === 'progress' && <Progress onNavigate={setScreen} />}
      {screen === 'profile' && <Profile onNavigate={setScreen} />}
      {screen === 'training' && <Training onNavigate={setScreen} onStartSession={startSession} />}
      {screen === 'session' && activeSession && (
        <TrainingSession sessionId={activeSession.sessionId} programDay={activeSession.day} programName={activeSession.programName} onFinish={finishSession} />
      )}
    </>
  )
}

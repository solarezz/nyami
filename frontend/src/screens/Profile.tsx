import { Wordmark } from '../components/Wordmark'
import { ProfileForm } from '../components/ProfileForm'
import { BottomNav } from '../components/BottomNav'
import { useData } from '../data/store'
import type { Screen } from '../App'
import type { UpdateProfileRequest } from '../types'

export function Profile({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { me, updateProfile } = useData()
  if (!me) return null
  const p = me.profile
  const initial: UpdateProfileRequest = {
    sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: p.weightKg, activity: p.activity, goal: p.goal,
  }

  const submit = async (v: UpdateProfileRequest) => {
    await updateProfile(v)
    onNavigate('today')
  }

  const name = [me.user.firstName, me.user.username ? `@${me.user.username}` : null].filter(Boolean).join(' · ')

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <div className="h2">Профиль</div>
        <Wordmark size={20} />
      </div>

      <div className="scrollarea">
        {name && <div className="muted" style={{ fontSize: 13, padding: '0 2px' }}>{name}</div>}
        <ProfileForm initial={initial} submitLabel="Сохранить" onSubmit={submit} />
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  )
}

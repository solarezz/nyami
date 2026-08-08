import { Wordmark } from '../components/Wordmark'
import { ProfileForm } from '../components/ProfileForm'
import { useData } from '../data/store'
import type { Screen } from '../App'
import type { UpdateProfileRequest } from '../types'

const DEFAULTS: UpdateProfileRequest = {
  sex: 'male', age: 28, heightCm: 178, weightKg: 82, activity: 'medium', goal: 'lose',
}

export function Onboarding({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { me, updateProfile } = useData()
  const initial: UpdateProfileRequest = me
    ? { sex: me.profile.sex, age: me.profile.age, heightCm: me.profile.heightCm, weightKg: me.profile.weightKg, activity: me.profile.activity, goal: me.profile.goal }
    : DEFAULTS

  const submit = async (v: UpdateProfileRequest) => {
    await updateProfile(v)
    onNavigate('today')
  }

  return (
    <div className="screen gap fade">
      <Wordmark size={24} />
      <div className="h2" style={{ fontSize: 24, lineHeight: 1.05 }}>Давай посчитаем<br />твою норму</div>
      <div className="scrollarea">
        <ProfileForm initial={initial} submitLabel="Начать" onSubmit={submit} />
      </div>
    </div>
  )
}

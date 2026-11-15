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
    // Таймзона определяется автоматически из браузера/Telegram WebView; переопределяется
    // сама, если пользователь позже откроет приложение из другого пояса.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    await updateProfile({ ...v, timezone })
    onNavigate('today')
  }

  return (
    <div className="screen v3-screen gap fade">
      <div className="v3-stepbar"><i className="on" /><i className="on" /><i className="on" /><i className="on" /></div>
      <div>
        <div className="v3-h1">Расскажите о себе</div>
        <div className="v3-sub" style={{ marginTop: 6 }}>Нужно для расчёта нормы по формуле Миффлина — Сан Жеора.</div>
      </div>
      <div className="scrollarea">
        <ProfileForm initial={initial} submitLabel="Начать" onSubmit={submit} />
      </div>
    </div>
  )
}

import { ProfileForm } from '../components/ProfileForm'
import { BottomNav } from '../components/BottomNav'
import { useData } from '../data/store'
import { getTelegramUser } from '../telegram'
import type { Screen } from '../App'
import type { UpdateProfileRequest } from '../types'

export function Profile({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { me, updateProfile } = useData()
  if (!me) return null
  const p = me.profile
  const tgUser = getTelegramUser()
  const photo = tgUser?.photo_url
  const initial = (me.user.firstName ?? tgUser?.first_name ?? 'U').slice(0, 1).toUpperCase()

  const formInitial: UpdateProfileRequest = {
    sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: p.weightKg, activity: p.activity, goal: p.goal,
  }

  const submit = async (v: UpdateProfileRequest) => {
    await updateProfile(v)
    onNavigate('today')
  }

  return (
    <div className="screen gap fade">
      <div className="topbar">
        <div className="h2">Профиль</div>
      </div>

      <div className="scrollarea">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 2px 4px' }}>
          {photo ? <img className="avatar" src={photo} alt="" /> : <div className="avatar">{initial}</div>}
          <div>
            <div style={{ fontWeight: 900, fontSize: 19 }}>{me.user.firstName ?? 'Профиль'}</div>
            {me.user.username && <div className="muted" style={{ fontSize: 13 }}>@{me.user.username}</div>}
          </div>
        </div>

        <ProfileForm initial={formInitial} submitLabel="Сохранить" onSubmit={submit} />
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  )
}

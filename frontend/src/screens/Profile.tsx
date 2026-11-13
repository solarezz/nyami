import { ProfileForm } from '../components/ProfileForm'
import { FastingSettings } from '../components/FastingSettings'
import { BottomNavV2 } from '../components/BottomNavV2'
import { MaterialIcon } from '../components/MaterialIcon'
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
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    await updateProfile({ ...v, timezone })
    onNavigate('today')
  }

  return (
    <div className="screen v2-screen gap fade">
      <div className="v2-topbar">
        {photo ? <img className="v2-avatar" src={photo} alt="" style={{ objectFit: 'cover' }} /> : <div className="v2-avatar">{initial}</div>}
        <div style={{ flex: 1 }}>
          <div style={{ font: '800 20px var(--v2-font-text)', letterSpacing: '-.025em' }}>{me.user.firstName ?? 'Профиль'}</div>
          {me.user.username && <div style={{ font: '500 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}>@{me.user.username}</div>}
        </div>
      </div>

      <div className="scrollarea">
        <ProfileForm initial={formInitial} submitLabel="Сохранить" onSubmit={submit} />

        <FastingSettings />

        <div className="v2-label" style={{ marginTop: 2 }}>Настройки</div>
        <div className="v2-settingsrow">
          <button type="button" className="row" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => onNavigate('coach')}>
            <MaterialIcon name="forum" size={20} style={{ color: 'var(--v2-mu)' }} />
            <span style={{ flex: 1 }}>Коуч</span>
            <MaterialIcon name="chevron_right" size={20} style={{ color: 'var(--v2-mu)' }} />
          </button>
          <div className="row">
            <MaterialIcon name="public" size={20} style={{ color: 'var(--v2-mu)' }} />
            <span style={{ flex: 1 }}>Часовой пояс</span>
            <span style={{ font: '500 13px var(--v2-font-num)', color: 'var(--v2-mu)' }}>{p.timezone}</span>
          </div>
          <div className="row">
            <MaterialIcon name="contrast" size={20} style={{ color: 'var(--v2-mu)' }} />
            <span style={{ flex: 1 }}>Тема</span>
            <span style={{ font: '500 13px var(--v2-font-text)', color: 'var(--v2-mu)' }}>Как в Telegram</span>
          </div>
        </div>
      </div>

      <BottomNavV2 active="profile" onNavigate={onNavigate} />
    </div>
  )
}

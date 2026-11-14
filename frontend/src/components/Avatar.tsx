import { useState } from 'react'

// Фото профиля приходит напрямую с CDN Telegram (photo_url из initDataUnsafe) —
// иногда грузится медленно или не грузится вовсе (приватность/версия клиента).
// Поэтому инициал рисуем сразу, а фото подставляем поверх только после успешной
// загрузки — если оно зависло или упало, пользователь просто видит инициал.
export function Avatar({ photoUrl, name }: { photoUrl?: string | null; name: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const initial = (name || 'Н').slice(0, 1).toUpperCase()
  const showPhoto = Boolean(photoUrl) && !failed

  return (
    <div className="v2-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
      {!loaded && initial}
      {showPhoto && (
        <img
          src={photoUrl!}
          alt=""
          loading="eager"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{
            position: loaded ? 'static' : 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
          }}
        />
      )}
    </div>
  )
}

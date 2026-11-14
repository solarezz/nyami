export function Skeleton({ width = '100%', height = 16, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <div className="v2-skel" style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

// Готовый плейсхолдер главного экрана — показываем вместо текста "Загружаем…" на старте,
// в форме Today v2 (тёмная тема), чтобы не мигать старым светлым видом при холодном старте.
export function TodaySkeleton() {
  return (
    <div className="screen v2-screen gap fade" aria-busy="true" aria-label="Загрузка">
      <div className="v2-topbar">
        <Skeleton width={40} height={40} radius={10} />
        <div style={{ flex: 1 }}><Skeleton width={120} height={16} radius={6} /></div>
        <Skeleton width={48} height={28} radius={8} />
      </div>
      <div className="v2-daygrid">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height={54} radius={10} />)}
      </div>
      <Skeleton height={180} radius={18} />
      <Skeleton height={160} radius={16} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Skeleton height={100} radius={14} />
        <Skeleton height={100} radius={14} />
      </div>
    </div>
  )
}

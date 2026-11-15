export function Skeleton({ width = '100%', height = 16, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <div className="v3-skel" style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

// Готовый плейсхолдер главного экрана — показываем вместо текста "Загружаем…" на старте,
// в форме Today v3 (светлая тема), чтобы не мигать тёмным видом при холодном старте.
export function TodaySkeleton() {
  return (
    <div className="screen v3-screen gap fade" aria-busy="true" aria-label="Загрузка">
      <div className="v3-topbar">
        <Skeleton width={44} height={44} radius={14} />
        <div style={{ flex: 1 }}><Skeleton width={120} height={16} radius={6} /></div>
        <Skeleton width={44} height={44} radius={22} />
      </div>
      <div className="v3-daygrid">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height={62} radius={18} />)}
      </div>
      <Skeleton height={180} radius={28} />
      <Skeleton height={160} radius={28} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Skeleton height={100} radius={24} />
        <Skeleton height={100} radius={24} />
      </div>
    </div>
  )
}

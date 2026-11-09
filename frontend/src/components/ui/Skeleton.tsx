export function Skeleton({ width = '100%', height = 16, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <div className="skel" style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

// Готовый плейсхолдер главного экрана — показываем вместо текста "Загружаем…" на старте.
export function TodaySkeleton() {
  return (
    <div className="screen gap" aria-busy="true" aria-label="Загрузка">
      <div className="topbar">
        <Skeleton width={90} height={23} radius={8} />
        <div style={{ marginLeft: 'auto' }}><Skeleton width={56} height={30} radius={99} /></div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} width={32} height={32} radius={99} />)}
      </div>
      <Skeleton height={140} radius={26} />
      <div className="macros3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={104} radius={22} />)}
      </div>
      <Skeleton height={96} radius={22} />
      <Skeleton height={76} radius={22} />
      <Skeleton height={76} radius={22} />
    </div>
  )
}

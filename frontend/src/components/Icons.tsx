// Набор SVG-иконок (Lucide-style). Спрайт монтируется один раз в App,
// далее <Icon name="..." /> ссылается на символы через <use>.

export type IconName =
  | 'bowl' | 'flame' | 'plus' | 'minus' | 'chev' | 'chevl'
  | 'camera' | 'pencil' | 'spark' | 'send' | 'chat'
  | 'grid' | 'chart' | 'user' | 'drop' | 'scale' | 'check' | 'trash'

export function Icon({ name, style }: { name: IconName; style?: React.CSSProperties }) {
  return (
    <svg className="ic" style={style} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-bowl" viewBox="0 0 24 24"><path d="M3 11h18" /><path d="M4 11a8 8 0 0 0 16 0" /><path d="M9 4c0-1 .8-2 1.6-2M13 4c0-1 .8-2 1.6-2" /></symbol>
        <symbol id="i-flame" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" /></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
        <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
        <symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></symbol>
        <symbol id="i-chevl" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></symbol>
        <symbol id="i-camera" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3.2" /></symbol>
        <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></symbol>
        <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3l1.9 5.6L20 10l-6.1 1.4L12 17l-1.9-5.6L4 10l6.1-1.4Z" /></symbol>
        <symbol id="i-send" viewBox="0 0 24 24"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8Z" /></symbol>
        <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></symbol>
        <symbol id="i-chart" viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-6" /></symbol>
        <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></symbol>
        <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 2.7l5.66 5.66a8 8 0 1 1-11.31 0Z" /></symbol>
        <symbol id="i-scale" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></symbol>
        <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></symbol>
      </defs>
    </svg>
  )
}

// ============================================================
// icons.jsx — minimal line-icon set (stroke, currentColor)
// ============================================================
const ICON_PATHS = {
  // category
  utensils: <><path d="M4 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3"/><path d="M6 12v9"/><path d="M16 3c-1.5 0-3 1.8-3 5s1 4 3 4v9"/></>,
  car: <><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M4 13h16v5H4z"/><circle cx="7.5" cy="18.5" r="1.4"/><circle cx="16.5" cy="18.5" r="1.4"/></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  home: <><path d="M4 11l8-6 8 6"/><path d="M6 10v10h12V10"/></>,
  play: <><circle cx="12" cy="12" r="8"/><path d="M10 9l5 3-5 3z"/></>,
  heart: <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/>,
  book: <><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18h13"/></>,
  plane: <path d="M21 15l-8-3V5.5a1.5 1.5 0 0 0-3 0V12l-8 3v2l8-2v3l-2 1.5V21l3.5-1L15 21v-1.5L13 18v-3l8 2z"/>,
  phone: <rect x="7" y="3" width="10" height="18" rx="2"/>,
  dots: <><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></>,
  wallet: <><path d="M4 7a2 2 0 0 1 2-2h11v4"/><path d="M4 7v10a2 2 0 0 0 2 2h13V7H6"/><circle cx="16" cy="13" r="1.3"/></>,
  gift: <><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 13h16M12 9v11"/><path d="M12 9S10.5 5 8.5 5 6 7 8 9M12 9s1.5-4 3.5-4S18 7 16 9"/></>,
  trend: <><path d="M4 16l5-5 3 3 7-7"/><path d="M16 7h4v4"/></>,
  briefcase: <><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  // nav / ui
  grid: <><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
  chart: <><path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></>,
  download: <><path d="M12 4v10"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/></>,
  close: <path d="M6 6l12 12M18 6L6 18"/>,
  chevL: <path d="M14 6l-6 6 6 6"/>,
  chevR: <path d="M10 6l6 6-6 6"/>,
  chevD: <path d="M6 9l6 6 6-6"/>,
  check: <path d="M5 12l4 4 10-10"/>,
  edit: <><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></>,
  trash: <><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></>,
  arrowUp: <path d="M12 19V6M6 12l6-6 6 6"/>,
  arrowDown: <path d="M12 5v13M6 12l6 6 6-6"/>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  wave: <path d="M12 3v18M7 8v8M17 7v10M3 11v2M21 10v4"/>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7z"/>,
  coins: <><ellipse cx="9" cy="7" rx="5" ry="2.4"/><path d="M4 7v5c0 1.3 2.2 2.4 5 2.4s5-1.1 5-2.4V7"/><path d="M14 12.5c.8.3 1.9.5 3 .5 2.8 0 5-1.1 5-2.4V6"/><ellipse cx="17" cy="6" rx="5" ry="2.4"/></>,
  repeat: <><path d="M17 2l3 3-3 3"/><path d="M4 11.5V11a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 12.5v.5a4 4 0 0 1-4 4H4"/></>,
  listCheck: <><path d="M11 6h9M11 12h9M11 18h9"/><path d="M3.5 6l1.3 1.3L7.5 4.5"/><path d="M3.5 12l1.3 1.3L7.5 10.5"/><path d="M3.5 18l1.3 1.3L7.5 16.5"/></>,
  clock: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4.2l2.8 1.8"/></>,
  power: <><path d="M12 4v8"/><path d="M7.5 7a7 7 0 1 0 9 0"/></>,
  circle: <circle cx="12" cy="12" r="8"/>,
  checkCircle: <><circle cx="12" cy="12" r="8"/><path d="M8.5 12l2.4 2.4L15.5 9.5"/></>,
};

function Icon({ name, size = 20, stroke = 2, fill = "none", style, className }) {
  const p = ICON_PATHS[name];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden="true">
      {p}
    </svg>
  );
}

Object.assign(window, { Icon, ICON_PATHS });

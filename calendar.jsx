// ============================================================
// calendar.jsx — MiniCalendar grid, DatePickerField, helpers
// ============================================================
const { useState: useStateCal, useEffect: useEffectCal, useRef: useRefCal } = React;

function pad2(n) { return String(n).padStart(2, "0"); }
function isoOf(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function fmtFieldDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} 週${WEEKDAYS[d.getDay()]}`;
}

// markers: { "2026-06-07": { inc, exp, items } }
function MiniCalendar({ initialMonth, value, onSelect, markers = {}, min, max, today = todayISO }) {
  const [view, setView] = useStateCal(initialMonth || (value || today).slice(0, 7));
  const [y, m] = view.split("-").map(Number);
  const startDow = new Date(y, m - 1, 1).getDay();
  const daysIn = new Date(y, m, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  const minKey = min ? min.slice(0, 7) : null;
  const maxKey = max ? max.slice(0, 7) : null;
  const step = (delta) => {
    let yy = y, mm = m + delta;
    if (mm > 12) { mm = 1; yy++; } if (mm < 1) { mm = 12; yy--; }
    const nk = `${yy}-${pad2(mm)}`;
    if ((!minKey || nk >= minKey) && (!maxKey || nk <= maxKey)) setView(nk);
  };
  const canPrev = !minKey || view > minKey;
  const canNext = !maxKey || view < maxKey;

  return (
    <div style={{ userSelect: "none" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }} className="num">{y} / {m}</span>
        <div style={{ display: "flex", gap: 2 }}>
          <CalNav name="chevL" disabled={!canPrev} onClick={() => canPrev && step(-1)} />
          <CalNav name="chevR" disabled={!canNext} onClick={() => canNext && step(1)} />
        </div>
      </div>
      {/* weekday row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 500, padding: "4px 0",
            color: i === 0 || i === 6 ? "color-mix(in srgb, var(--text-faint) 80%, var(--expense))" : "var(--text-faint)" }}>{w}</div>
        ))}
      </div>
      {/* days */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={"e" + i} />;
          const iso = isoOf(y, m, d);
          const disabled = (min && iso < min) || (max && iso > max);
          const mk = markers[iso];
          const selected = value === iso;
          const isToday = iso === today;
          return (
            <button key={iso} disabled={disabled} onClick={() => onSelect && onSelect(iso)}
              style={{
                position: "relative", aspectRatio: "1 / 1", borderRadius: 10, fontSize: 13,
                fontFamily: "var(--font-num)", fontWeight: selected ? 700 : 500,
                color: disabled ? "var(--text-faint)" : selected ? "var(--bg)" : "var(--text)",
                opacity: disabled ? 0.35 : 1,
                background: selected ? "var(--accent)" : "transparent",
                border: isToday && !selected ? "1px solid var(--accent)" : "1px solid transparent",
                cursor: disabled ? "default" : "pointer", transition: "background .15s, color .15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { if (!selected && !disabled) e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}>
              {d}
              {mk && (
                <span style={{ position: "absolute", bottom: 4, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3 }}>
                  {mk.exp > 0 && <span style={{ width: 4, height: 4, borderRadius: 4, background: selected ? "rgba(255,255,255,.85)" : "var(--expense)" }} />}
                  {mk.inc > 0 && <span style={{ width: 4, height: 4, borderRadius: 4, background: selected ? "rgba(255,255,255,.85)" : "var(--income)" }} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalNav({ name, onClick, disabled }) {
  const [h, setH] = useStateCal(false);
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center",
        color: disabled ? "var(--text-faint)" : h ? "var(--text)" : "var(--text-dim)",
        background: h && !disabled ? "var(--surface-2)" : "transparent",
        opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer", transition: "all .15s" }}>
      <Icon name={name} size={17} />
    </button>
  );
}

// inline date picker (popover) for the modal
function DatePickerField({ value, onChange, min, max }) {
  const [open, setOpen] = useStateCal(false);
  const ref = useRefCal(null);
  useEffectCal(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "11px 13px", borderRadius: 12, background: "var(--surface-2)",
        border: "1px solid " + (open ? "var(--accent)" : "var(--border)"), color: "var(--text)",
        fontSize: 13.5, outline: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
        <Icon name="calendar" size={16} style={{ color: open ? "var(--accent)" : "var(--text-faint)", flexShrink: 0 }} />
        <span className="num" style={{ flex: 1 }}>{fmtFieldDate(value)}</span>
        <Icon name="chevD" size={15} style={{ color: "var(--text-faint)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: 0, zIndex: 130, width: 286,
          background: "var(--surface-solid)", border: "1px solid var(--border-strong)", borderRadius: 16,
          boxShadow: "var(--shadow)", padding: 14, animation: "pop .16s ease" }}>
          <MiniCalendar initialMonth={value.slice(0, 7)} value={value} min={min} max={max}
            onSelect={(iso) => { onChange(iso); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MiniCalendar, DatePickerField, fmtFieldDate, isoOf });

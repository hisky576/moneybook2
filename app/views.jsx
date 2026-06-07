// ============================================================
// views.jsx — shared UI primitives + Dashboard
// ============================================================
const { useMemo: useMemoV, useState: useStateV } = React;

// ---------- primitives ----------
function Card({ children, style, pad = 20, className, ...rest }) {
  return (
    <div className={className} style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 18, padding: pad, boxShadow: "var(--shadow)", ...style,
    }} {...rest}>{children}</div>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", letterSpacing: ".01em" }}>{children}</h3>
      {right}
    </div>
  );
}

function CatChip({ catId, size = 38, radius }) {
  const c = CAT_MAP[catId] || CAT_MAP.other;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius ?? size * 0.3, flexShrink: 0,
      display: "grid", placeItems: "center", color: c.color,
      background: `color-mix(in srgb, ${c.color} 15%, transparent)`,
    }}>
      <Icon name={c.icon} size={size * 0.52} stroke={2} />
    </div>
  );
}

function Amount({ value, type, size = 15, weight = 600 }) {
  const isInc = type === "income";
  return (
    <span className="num" style={{ fontSize: size, fontWeight: weight, color: isInc ? "var(--income)" : "var(--text)" }}>
      {isInc ? "+" : "−"}{fmtNTD(value)}
    </span>
  );
}

function TxRow({ tx, onEdit, onDelete, showActions = true }) {
  const c = CAT_MAP[tx.catId] || CAT_MAP.other;
  const [hover, setHover] = useStateV(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 6px", borderRadius: 12,
        background: hover ? "var(--surface-2)" : "transparent", transition: "background .15s" }}>
      <CatChip catId={tx.catId} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.note}</div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{c.name} · {fmtDateLong(tx.date)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {showActions && hover && (
          <div style={{ display: "flex", gap: 2, animation: "pop .15s ease" }}>
            <IconBtn name="edit" onClick={() => onEdit && onEdit(tx)} title="編輯" />
            <IconBtn name="trash" onClick={() => onDelete && onDelete(tx)} title="刪除" danger />
          </div>
        )}
        <Amount value={tx.amount} type={tx.type} />
      </div>
    </div>
  );
}

function IconBtn({ name, onClick, title, danger, active, size = 32 }) {
  const [h, setH] = useStateV(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: size, height: size, borderRadius: 9, display: "grid", placeItems: "center",
        color: active ? "var(--accent)" : danger && h ? "var(--expense)" : h ? "var(--text)" : "var(--text-dim)",
        background: active ? "var(--accent-soft)" : h ? "var(--surface-2)" : "transparent", transition: "all .15s" }}>
      <Icon name={name} size={size * 0.56} />
    </button>
  );
}

function Pills({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 11, padding: 3, gap: 2,
      border: "1px solid var(--border)" }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: active ? "var(--bg)" : "var(--text-dim)",
            background: active ? "var(--accent)" : "transparent", transition: "all .18s" }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Delta({ value, invert }) {
  if (value === null || !isFinite(value)) return <span style={{ fontSize: 12, color: "var(--text-faint)" }}>—</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600,
      color: good ? "var(--income)" : "var(--expense)" }}>
      <Icon name={up ? "arrowUp" : "arrowDown"} size={13} stroke={2.6} />
      <span className="num">{Math.abs(value).toFixed(0)}%</span>
    </span>
  );
}

// ---------- month math ----------
function monthStats(txs, mk) {
  const m = txs.filter(t => monthKey(t.date) === mk);
  const income = sum(m.filter(t => t.type === "income").map(t => t.amount));
  const expense = sum(m.filter(t => t.type === "expense").map(t => t.amount));
  return { income, expense, net: income - expense, txs: m };
}
function prevMonthKey(mk) {
  let [y, m] = mk.split("-").map(Number);
  m--; if (m < 1) { m = 12; y--; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
function lastNMonths(mk, n) {
  const out = [];
  let cur = mk;
  for (let i = 0; i < n; i++) { out.unshift(cur); cur = prevMonthKey(cur); }
  return out;
}
function pctChange(cur, prev) {
  if (!prev) return cur ? null : null;
  return ((cur - prev) / prev) * 100;
}

// ============================================================
// Dashboard
// ============================================================
function Dashboard({ txs, mk, budgets, onAdd, onEdit, onDelete, goTransactions }) {
  const st = useMemoV(() => monthStats(txs, mk), [txs, mk]);
  const prev = useMemoV(() => monthStats(txs, prevMonthKey(mk)), [txs, mk]);
  const totalBudget = useMemoV(() => sum(Object.values(budgets)), [budgets]);

  const byCat = useMemoV(() => {
    const g = groupSum(st.txs.filter(t => t.type === "expense"), t => t.catId);
    return Object.entries(g).map(([catId, value]) => ({ catId, value, color: CAT_MAP[catId].color, label: CAT_MAP[catId].name }))
      .sort((a, b) => b.value - a.value);
  }, [st.txs]);

  const months6 = useMemoV(() => lastNMonths(mk, 6), [mk]);
  const series = useMemoV(() => months6.map(k => monthStats(txs, k)), [txs, months6]);

  const budgetPct = totalBudget ? Math.min(999, (st.expense / totalBudget) * 100) : 0;
  const recent = st.txs.slice(0, 6);

  // calendar day map for the selected month
  const dayMap = useMemoV(() => {
    const map = {};
    st.txs.forEach(t => {
      const d = map[t.date] || (map[t.date] = { inc: 0, exp: 0, items: [] });
      if (t.type === "income") d.inc += t.amount; else d.exp += t.amount;
      d.items.push(t);
    });
    return map;
  }, [st.txs]);
  const defaultDay = monthKey(todayISO) === mk ? todayISO : (st.txs[0] ? st.txs[0].date : `${mk}-01`);
  const [selDay, setSelDay] = useStateV(defaultDay);
  const [selDayMk, setSelDayMk] = useStateV(mk);
  if (selDayMk !== mk) { setSelDayMk(mk); setSelDay(defaultDay); }
  const dayInfo = dayMap[selDay];

  const cards = [
    { label: "本月收入", value: st.income, color: "var(--income)", icon: "arrowDown", delta: pctChange(st.income, prev.income), invert: false },
    { label: "本月支出", value: st.expense, color: "var(--expense)", icon: "arrowUp", delta: pctChange(st.expense, prev.expense), invert: true },
    { label: "本月結餘", value: st.net, color: "var(--accent)", icon: "wallet", delta: pctChange(st.net, prev.net), invert: false, signed: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "fadeUp .4s ease" }}>
      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        {cards.map((c, i) => (
          <Card key={i} pad={18} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>{c.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center",
                color: c.color, background: `color-mix(in srgb, ${c.color} 15%, transparent)` }}>
                <Icon name={c.icon} size={16} stroke={2.4} />
              </div>
            </div>
            <div className="num" style={{ fontSize: 27, fontWeight: 600, color: c.signed && c.value < 0 ? "var(--expense)" : "var(--text)", letterSpacing: "-.02em" }}>
              {c.signed && c.value >= 0 ? "+" : c.signed && c.value < 0 ? "−" : ""}{fmtNTD(c.value)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-faint)" }}>
              <Delta value={c.delta} invert={c.invert} /> 較上月
            </div>
          </Card>
        ))}
        {/* budget gauge card */}
        <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>預算使用</span>
            <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center",
              color: budgetPct > 100 ? "var(--expense)" : "var(--accent)",
              background: `color-mix(in srgb, ${budgetPct > 100 ? "var(--expense)" : "var(--accent)"} 15%, transparent)` }}>
              <Icon name="target" size={16} stroke={2.2} />
            </div>
          </div>
          <div className="num" style={{ fontSize: 27, fontWeight: 600, color: budgetPct > 100 ? "var(--expense)" : "var(--text)", letterSpacing: "-.02em" }}>
            {budgetPct.toFixed(0)}<span style={{ fontSize: 15, color: "var(--text-faint)" }}>%</span>
          </div>
          <div style={{ height: 7, borderRadius: 6, background: "var(--surface-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, borderRadius: 6,
              background: budgetPct > 100 ? "var(--expense)" : budgetPct > 85 ? "var(--cat-travel)" : "var(--accent)",
              animation: "growW .8s cubic-bezier(.3,1,.4,1)" }} />
          </div>
        </Card>
      </div>

      {/* middle row: donut + recent */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(320px, 1.15fr)", gap: 18 }} className="dash-mid">
        <Card>
          <SectionLabel>本月支出分布</SectionLabel>
          {byCat.length ? (
            <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
              <Donut data={byCat} centerTop="總支出" centerMain={fmtCompact(st.expense)} centerSub={`${byCat.length} 個分類`} />
              <div style={{ flex: 1, minWidth: 170, display: "flex", flexDirection: "column", gap: 9 }}>
                {byCat.slice(0, 6).map(d => (
                  <div key={d.catId} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--text-dim)", flex: 1 }}>{d.label}</span>
                    <span className="num" style={{ color: "var(--text)", fontWeight: 500 }}>{fmtNTD(d.value)}</span>
                    <span className="num" style={{ color: "var(--text-faint)", width: 38, textAlign: "right" }}>{((d.value / st.expense) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyHint text="本月尚無支出記錄" />}
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <SectionLabel right={<button onClick={goTransactions} style={linkBtnStyle}>查看全部 <Icon name="chevR" size={14} /></button>}>近期交易</SectionLabel>
          {recent.length ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent.map(t => <TxRow key={t.id} tx={t} onEdit={onEdit} onDelete={onDelete} />)}
            </div>
          ) : <EmptyHint text="本月尚無交易" />}
        </Card>
      </div>

      {/* calendar + selected day */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(320px, 1.15fr)", gap: 18 }} className="dash-mid">
        <Card>
          <SectionLabel right={<Legend items={[{ c: "var(--expense)", t: "支出" }, { c: "var(--income)", t: "收入" }]} />}>交易日曆</SectionLabel>
          <MiniCalendar key={mk} initialMonth={mk} value={selDay} markers={dayMap}
            min={"2026-01-01"} max={"2026-06-30"} onSelect={setSelDay} />
        </Card>
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <SectionLabel right={
            <span style={{ display: "flex", gap: 12, fontSize: 12 }}>
              {dayInfo && dayInfo.inc > 0 && <span className="num" style={{ color: "var(--income)", fontWeight: 600 }}>+{fmtNTD(dayInfo.inc)}</span>}
              {dayInfo && dayInfo.exp > 0 && <span className="num" style={{ color: "var(--expense)", fontWeight: 600 }}>−{fmtNTD(dayInfo.exp)}</span>}
            </span>
          }>{fmtFieldDate(selDay)}</SectionLabel>
          {dayInfo && dayInfo.items.length ? (
            <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: 290 }}>
              {dayInfo.items.map(t => <TxRow key={t.id} tx={t} onEdit={onEdit} onDelete={onDelete} />)}
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-faint)" }}>
              <Icon name="calendar" size={34} stroke={1.5} />
              <span style={{ fontSize: 13 }}>這天沒有交易記錄</span>
              <button onClick={() => onAdd && onAdd()} style={{ ...linkBtnStyle, marginTop: 2 }}>
                <Icon name="plus" size={14} stroke={2.4} /> 新增記錄
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* bottom row: bars + trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }} className="dash-mid">
        <Card>
          <SectionLabel right={<Legend items={[{ c: "var(--income)", t: "收入" }, { c: "var(--expense)", t: "支出" }]} />}>近 6 個月收支</SectionLabel>
          <GroupedBars months={months6} income={series.map(s => s.income)} expense={series.map(s => s.expense)} />
        </Card>
        <Card>
          <SectionLabel>結餘趨勢</SectionLabel>
          <AreaTrend values={series.map(s => s.net)} labels={months6.map(shortMonth)} />
        </Card>
      </div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: it.c }} />{it.t}
        </span>
      ))}
    </div>
  );
}
function EmptyHint({ text }) {
  return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>{text}</div>;
}
const linkBtnStyle = { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12.5, color: "var(--accent)", fontWeight: 600 };

Object.assign(window, {
  Card, SectionLabel, CatChip, Amount, TxRow, IconBtn, Pills, Delta,
  Dashboard, Legend, EmptyHint, linkBtnStyle,
  monthStats, prevMonthKey, lastNMonths, pctChange,
});

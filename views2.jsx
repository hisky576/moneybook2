// ============================================================
// views2.jsx — Transactions, Budget, Reports
// ============================================================
const { useMemo: useMemo2, useState: useState2 } = React;

// ============================================================
// Transactions
// ============================================================
function Transactions({ txs, mk, onEdit, onDelete, onAdd }) {
  const [scope, setScope] = useState2("month");   // month | all
  const [q, setQ] = useState2("");
  const [type, setType] = useState2("all");        // all | income | expense
  const [cat, setCat] = useState2("all");

  const filtered = useMemo2(() => {
    let list = scope === "month" ? txs.filter(t => monthKey(t.date) === mk) : txs;
    if (type !== "all") list = list.filter(t => t.type === type);
    if (cat !== "all") list = list.filter(t => t.catId === cat);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(t => t.note.toLowerCase().includes(s) || CAT_MAP[t.catId].name.includes(s));
    }
    return list;
  }, [txs, scope, mk, type, cat, q]);

  const totals = useMemo2(() => ({
    income: sum(filtered.filter(t => t.type === "income").map(t => t.amount)),
    expense: sum(filtered.filter(t => t.type === "expense").map(t => t.amount)),
  }), [filtered]);

  // group by date
  const groups = useMemo2(() => {
    const g = {};
    filtered.forEach(t => { (g[t.date] = g[t.date] || []).push(t); });
    return Object.keys(g).sort().reverse().map(date => ({ date, items: g[date], total: sum(g[date].map(t => t.type === "income" ? t.amount : -t.amount)) }));
  }, [filtered]);

  const catOptions = type === "income" ? INCOME_CATS : type === "expense" ? EXPENSE_CATS : CATEGORIES;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      {/* controls */}
      <Card pad={16} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", display: "grid", placeItems: "center" }}><Icon name="search" size={17} /></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋備註或分類…" style={inputStyle2} />
          </div>
          <Pills value={type} onChange={v => { setType(v); setCat("all"); }} options={[{ value: "all", label: "全部" }, { value: "expense", label: "支出" }, { value: "income", label: "收入" }]} />
          <Pills value={scope} onChange={setScope} options={[{ value: "month", label: shortMonth(mk) }, { value: "all", label: "全部月份" }]} />
        </div>
        {/* category filter chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>全部分類</FilterChip>
          {catOptions.map(c => (
            <FilterChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} color={c.color}>{c.name}</FilterChip>
          ))}
        </div>
      </Card>

      {/* summary strip */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "0 4px" }}>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>共 <b className="num" style={{ color: "var(--text)" }}>{filtered.length}</b> 筆</span>
        <span style={{ width: 1, height: 14, background: "var(--border-strong)" }} />
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>收入 <span className="num" style={{ color: "var(--income)", fontWeight: 600 }}>+{fmtNTD(totals.income)}</span></span>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>支出 <span className="num" style={{ color: "var(--expense)", fontWeight: 600 }}>−{fmtNTD(totals.expense)}</span></span>
        <span style={{ marginLeft: "auto" }} />
        <button onClick={onAdd} style={addMiniBtn}><Icon name="plus" size={16} stroke={2.5} /> 新增</button>
      </div>

      {/* grouped list */}
      {groups.length ? groups.map(g => (
        <Card key={g.date} pad={14}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 6px 8px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)" }}>{fmtDateLong(g.date)}</span>
            <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: g.total >= 0 ? "var(--income)" : "var(--text-faint)" }}>
              {g.total >= 0 ? "+" : "−"}{fmtNTD(g.total)}
            </span>
          </div>
          {g.items.map(t => <TxRow key={t.id} tx={t} onEdit={onEdit} onDelete={onDelete} />)}
        </Card>
      )) : (
        <Card><EmptyHint text="找不到符合條件的交易" /></Card>
      )}
    </div>
  );
}

function FilterChip({ children, active, onClick, color }) {
  const [h, setH] = useState2(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 500,
        border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
        color: active ? "var(--accent)" : h ? "var(--text)" : "var(--text-dim)",
        background: active ? "var(--accent-soft)" : "transparent", transition: "all .15s" }}>
      {color && <span style={{ width: 8, height: 8, borderRadius: 3, background: color }} />}
      {children}
    </button>
  );
}

// ============================================================
// Budget
// ============================================================
function Budget({ txs, mk, budgets, setBudgets, onAdd }) {
  const monthExp = useMemo2(() => groupSum(txs.filter(t => monthKey(t.date) === mk && t.type === "expense"), t => t.catId), [txs, mk]);
  const rows = EXPENSE_CATS.map(c => {
    const spent = monthExp[c.id] || 0;
    const budget = budgets[c.id] || 0;
    const pct = budget ? (spent / budget) * 100 : (spent ? 999 : 0);
    return { c, spent, budget, pct, remain: budget - spent };
  });
  const totalBudget = sum(rows.map(r => r.budget));
  const totalSpent = sum(rows.map(r => r.spent));
  const totalPct = totalBudget ? (totalSpent / totalBudget) * 100 : 0;
  const over = rows.filter(r => r.budget && r.spent > r.budget);
  const warn = rows.filter(r => r.budget && r.pct >= 85 && r.pct <= 100);

  const [editing, setEditing] = useState2(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      {/* overview */}
      <Card style={{ display: "flex", gap: 26, flexWrap: "wrap", alignItems: "center" }}>
        <Donut size={150} thickness={18} data={[{ value: Math.min(totalSpent, totalBudget), color: totalPct > 100 ? "var(--expense)" : "var(--accent)" }, { value: Math.max(totalBudget - totalSpent, 0), color: "var(--surface-2)" }]}
          centerTop="已用" centerMain={`${totalPct.toFixed(0)}%`} centerSub={shortMonth(mk)} />
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <Metric label="月度總預算" value={fmtNTD(totalBudget)} />
            <Metric label="本月已支出" value={fmtNTD(totalSpent)} color={totalPct > 100 ? "var(--expense)" : "var(--text)"} />
            <Metric label="剩餘可用" value={fmtSigned(totalBudget - totalSpent)} color={totalBudget - totalSpent < 0 ? "var(--expense)" : "var(--income)"} />
          </div>
          {(over.length > 0 || warn.length > 0) ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", borderRadius: 12,
              background: `color-mix(in srgb, ${over.length ? "var(--expense)" : "var(--cat-travel)"} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${over.length ? "var(--expense)" : "var(--cat-travel)"} 35%, transparent)` }}>
              <span style={{ color: over.length ? "var(--expense)" : "var(--cat-travel)", marginTop: 1 }}><Icon name="bell" size={17} /></span>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 }}>
                {over.length > 0 && <div><b style={{ color: "var(--expense)" }}>{over.map(r => r.c.name).join("、")}</b> 已超出預算</div>}
                {warn.length > 0 && <div><b style={{ color: "var(--cat-travel)" }}>{warn.map(r => r.c.name).join("、")}</b> 接近上限(達 85%)</div>}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--income)" }}>
              <Icon name="check" size={17} /> 所有分類都在預算範圍內,做得好!
            </div>
          )}
        </div>
      </Card>

      {/* per-category */}
      <Card>
        <SectionLabel right={<span style={{ fontSize: 12, color: "var(--text-faint)" }}>點數字可調整預算</span>}>各分類預算 · {labelMonth(mk)}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {rows.map(r => {
            const isOver = r.budget && r.spent > r.budget;
            const barColor = isOver ? "var(--expense)" : r.pct >= 85 ? "var(--cat-travel)" : "var(--accent)";
            return (
              <div key={r.c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 6px" }}>
                <CatChip catId={r.c.id} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7, gap: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{r.c.name}</span>
                    <span style={{ fontSize: 12.5, color: "var(--text-dim)", display: "flex", gap: 5, alignItems: "baseline" }}>
                      <span className="num" style={{ color: isOver ? "var(--expense)" : "var(--text)", fontWeight: 600 }}>{fmtNTD(r.spent)}</span>
                      <span style={{ color: "var(--text-faint)" }}>/</span>
                      {editing === r.c.id ? (
                        <input autoFocus type="number" defaultValue={r.budget}
                          onBlur={e => { setBudgets({ ...budgets, [r.c.id]: Math.max(0, Math.round(+e.target.value || 0)) }); setEditing(null); }}
                          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditing(null); }}
                          style={budgetInput} />
                      ) : (
                        <button className="num" onClick={() => setEditing(r.c.id)} style={{ color: "var(--accent)", fontWeight: 600, borderBottom: "1px dashed var(--border-strong)" }}>{fmtNTD(r.budget)}</button>
                      )}
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 6, background: "var(--surface-2)", overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${Math.min(r.pct, 100)}%`, borderRadius: 6, background: barColor, animation: "growW .7s cubic-bezier(.3,1,.4,1)" }} />
                  </div>
                </div>
                <div style={{ width: 92, textAlign: "right", fontSize: 12 }}>
                  {isOver
                    ? <span className="num" style={{ color: "var(--expense)", fontWeight: 600 }}>超出 {fmtNTD(r.spent - r.budget)}</span>
                    : <span className="num" style={{ color: "var(--text-faint)" }}>剩 {fmtNTD(Math.max(r.remain, 0))}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
function Metric({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{label}</span>
      <span className="num" style={{ fontSize: 19, fontWeight: 600, color: color || "var(--text)" }}>{value}</span>
    </div>
  );
}

// ============================================================
// Reports
// ============================================================
function Reports({ txs, mk, onExport }) {
  const [scope, setScope] = useState2("month");  // month | year
  const yk = yearKey(mk);

  const data = useMemo2(() => {
    const list = scope === "month" ? txs.filter(t => monthKey(t.date) === mk) : txs.filter(t => yearKey(t.date) === yk);
    const income = sum(list.filter(t => t.type === "income").map(t => t.amount));
    const expense = sum(list.filter(t => t.type === "expense").map(t => t.amount));
    const byCat = Object.entries(groupSum(list.filter(t => t.type === "expense"), t => t.catId))
      .map(([id, v]) => ({ c: CAT_MAP[id], v })).sort((a, b) => b.v - a.v);
    const top = [...list.filter(t => t.type === "expense")].sort((a, b) => b.amount - a.amount).slice(0, 5);
    return { list, income, expense, net: income - expense, byCat, top };
  }, [txs, scope, mk, yk]);

  // monthly series for the year
  const yearMonths = Array.from({ length: 12 }, (_, i) => `${yk}-${String(i + 1).padStart(2, "0")}`);
  const yearSeries = useMemo2(() => yearMonths.map(k => monthStats(txs, k)), [txs, yk]);
  const maxRate = data.expense || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Pills value={scope} onChange={setScope} options={[{ value: "month", label: "月報表" }, { value: "year", label: "年報表" }]} />
        <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{scope === "month" ? labelMonth(mk) : `${yk} 年`}</span>
        <button onClick={() => onExport(scope)} style={{ ...addMiniBtn, marginLeft: "auto" }}><Icon name="download" size={16} /> 匯出 CSV</button>
      </div>

      {/* totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <BigStat label="總收入" value={"+" + fmtNTD(data.income)} color="var(--income)" />
        <BigStat label="總支出" value={"−" + fmtNTD(data.expense)} color="var(--expense)" />
        <BigStat label="淨結餘" value={fmtSigned(data.net)} color={data.net >= 0 ? "var(--accent)" : "var(--expense)"} />
        <BigStat label={scope === "month" ? "日均支出" : "月均支出"} value={fmtNTD(scope === "month" ? data.expense / new Date(+mk.slice(0,4), +mk.slice(5,7), 0).getDate() : data.expense / 12)} color="var(--text)" />
      </div>

      {scope === "year" && (
        <Card>
          <SectionLabel right={<Legend items={[{ c: "var(--income)", t: "收入" }, { c: "var(--expense)", t: "支出" }]} />}>{yk} 年度收支總覽</SectionLabel>
          <GroupedBars months={yearMonths} income={yearSeries.map(s => s.income)} expense={yearSeries.map(s => s.expense)} height={240} />
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: scope === "month" ? "1.2fr 1fr" : "1fr", gap: 18 }} className="dash-mid">
        {/* category breakdown table */}
        <Card>
          <SectionLabel>支出分類明細</SectionLabel>
          {data.byCat.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {data.byCat.map(({ c, v }) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CatChip catId={c.id} size={30} radius={9} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <span style={{ color: "var(--text-dim)" }}>{c.name}</span>
                      <span className="num" style={{ color: "var(--text)", fontWeight: 500 }}>{fmtNTD(v)} <span style={{ color: "var(--text-faint)" }}>· {((v / maxRate) * 100).toFixed(1)}%</span></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(v / data.byCat[0].v) * 100}%`, background: c.color, borderRadius: 5, animation: "growW .7s cubic-bezier(.3,1,.4,1)" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyHint text="此期間尚無支出" />}
        </Card>

        {scope === "month" && (
          <Card>
            <SectionLabel>最大筆支出 Top 5</SectionLabel>
            {data.top.length ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {data.top.map((t, i) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px" }}>
                    <span className="num" style={{ width: 20, color: "var(--text-faint)", fontSize: 13 }}>{i + 1}</span>
                    <CatChip catId={t.catId} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.note}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{fmtDateLong(t.date)}</div>
                    </div>
                    <span className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>−{fmtNTD(t.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyHint text="此期間尚無支出" />}
          </Card>
        )}
      </div>
    </div>
  );
}
function BigStat({ label, value, color }) {
  return (
    <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</span>
      <span className="num" style={{ fontSize: 24, fontWeight: 600, color, letterSpacing: "-.02em" }}>{value}</span>
    </Card>
  );
}

// shared styles
const inputStyle2 = { width: "100%", padding: "10px 12px 10px 38px", borderRadius: 11, background: "var(--surface-2)",
  border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none" };
const budgetInput = { width: 78, padding: "2px 6px", borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--accent)",
  color: "var(--text)", fontSize: 12.5, fontFamily: "var(--font-num)", outline: "none" };
const addMiniBtn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
  background: "var(--accent)", color: "var(--bg)", fontSize: 13, fontWeight: 600 };

Object.assign(window, { Transactions, Budget, Reports, FilterChip, Metric, BigStat, inputStyle2, addMiniBtn });

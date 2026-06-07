// ============================================================
// savings.jsx — 存款紀錄 (deposits / withdrawals + goal)
// ============================================================
const { useState: useStateSv, useMemo: useMemoSv } = React;

const savingsBalance = (savings) => savings.reduce((a, s) => a + (s.kind === "withdraw" ? -s.amount : s.amount), 0);

// cumulative balance series over the entries (for the trend chart)
function savingsSeries(savings, limit = 8) {
  const sorted = [...savings].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let run = 0;
  const pts = sorted.map(s => { run += s.kind === "withdraw" ? -s.amount : s.amount; return { date: s.date, bal: run }; });
  return pts.slice(-limit);
}

// ============================================================
// Savings view
// ============================================================
function Savings({ savings, setSavings, savingsGoal, setSavingsGoal, mk }) {
  const [modal, setModal] = useStateSv(null);
  const [editGoal, setEditGoal] = useStateSv(false);

  const balance = useMemoSv(() => savingsBalance(savings), [savings]);
  const monthIn = useMemoSv(() => sum(savings.filter(s => s.kind !== "withdraw" && monthKey(s.date) === mk).map(s => s.amount)), [savings, mk]);
  const monthOut = useMemoSv(() => sum(savings.filter(s => s.kind === "withdraw" && monthKey(s.date) === mk).map(s => s.amount)), [savings, mk]);
  const series = useMemoSv(() => savingsSeries(savings), [savings]);

  const goalPct = savingsGoal > 0 ? Math.min(100, (balance / savingsGoal) * 100) : 0;

  const save = (s) => {
    if (s.id && savings.find(x => x.id === s.id)) setSavings(savings.map(x => x.id === s.id ? s : x));
    else setSavings([{ ...s, id: s.id || uid() }, ...savings]);
    setModal(null);
  };
  const remove = (s) => setSavings(savings.filter(x => x.id !== s.id));

  // group by date desc
  const groups = useMemoSv(() => {
    const g = {};
    [...savings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).forEach(s => { (g[s.date] = g[s.date] || []).push(s); });
    return Object.entries(g).map(([date, items]) => ({ date, items }));
  }, [savings]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      {/* overview */}
      <Card style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--text-dim)" }}>存款餘額</span>
            <span className="num" style={{ fontSize: 38, fontWeight: 700, color: "var(--accent)", letterSpacing: "-.02em" }}>{fmtNTD(balance)}</span>
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>本月存入 <span className="num" style={{ color: "var(--income)", fontWeight: 600 }}>+{fmtNTD(monthIn)}</span></span>
              {monthOut > 0 && <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>本月領出 <span className="num" style={{ color: "var(--expense)", fontWeight: 600 }}>−{fmtNTD(monthOut)}</span></span>}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={() => setModal({ rec: null, kind: "withdraw" })} style={ghostBtn}><Icon name="arrowUp" size={16} /> 領出</button>
            <button onClick={() => setModal({ rec: null, kind: "deposit" })} style={addMiniBtn}><Icon name="arrowDown" size={16} /> 存入</button>
          </div>
        </div>

        {/* goal */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 7 }}><Icon name="target" size={15} style={{ color: "var(--accent)" }} /> 存款目標</span>
            {editGoal ? (
              <input autoFocus type="number" defaultValue={savingsGoal || ""} placeholder="0" className="num"
                onBlur={e => { setSavingsGoal(Math.max(0, Math.round(+e.target.value || 0))); setEditGoal(false); }}
                onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditGoal(false); }}
                style={{ width: 120, padding: "5px 10px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--text)", fontSize: 13.5, outline: "none", textAlign: "right" }} />
            ) : (
              <button className="num" onClick={() => setEditGoal(true)} style={{ fontSize: 13.5, color: savingsGoal ? "var(--text)" : "var(--accent)", fontWeight: 600, borderBottom: "1px dashed var(--border-strong)" }}>
                {savingsGoal ? fmtNTD(savingsGoal) : "設定目標"}
              </button>
            )}
          </div>
          {savingsGoal > 0 && (
            <>
              <div style={{ height: 9, borderRadius: 6, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${goalPct}%`, borderRadius: 6, background: goalPct >= 100 ? "var(--income)" : "var(--accent)", animation: "growW .8s cubic-bezier(.3,1,.4,1)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-faint)" }}>
                <span className="num">{goalPct.toFixed(0)}%</span>
                <span>{balance >= savingsGoal ? <span style={{ color: "var(--income)" }}>已達成目標 🎉</span> : <span className="num">還差 {fmtNTD(savingsGoal - balance)}</span>}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* trend */}
      {series.length >= 2 && (
        <Card>
          <SectionLabel>存款餘額走勢</SectionLabel>
          <AreaTrend values={series.map(p => p.bal)} labels={series.map(p => `${parseInt(p.date.slice(5, 7))}/${parseInt(p.date.slice(8, 10))}`)} />
        </Card>
      )}

      {/* records */}
      {savings.length === 0 ? (
        <Card><div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Icon name="vault" size={36} stroke={1.5} />
          <div style={{ fontSize: 14 }}>還沒有存款紀錄</div>
          <div style={{ fontSize: 12.5 }}>記下每次存入/領出,追蹤你的存款累積</div>
          <button onClick={() => setModal({ rec: null, kind: "deposit" })} style={{ ...linkBtnStyle, marginTop: 4 }}><Icon name="plus" size={14} stroke={2.4} /> 記第一筆</button>
        </div></Card>
      ) : (
        <Card>
          <SectionLabel right={<span style={{ fontSize: 12, color: "var(--text-faint)" }}>共 {savings.length} 筆</span>}>存款紀錄</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {groups.map(g => (
              <div key={g.date}>
                <div style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 600, padding: "8px 6px 4px" }}>{fmtDateLong(g.date)}</div>
                {g.items.map(s => <SavingsRow key={s.id} rec={s} onEdit={() => setModal({ rec: s })} onDelete={() => remove(s)} />)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {modal && <SavingsModal initial={modal.rec} defaultKind={modal.kind} onSave={save} onClose={() => setModal(null)} onDelete={modal.rec ? () => { remove(modal.rec); setModal(null); } : null} />}
    </div>
  );
}

function SavingsRow({ rec, onEdit, onDelete }) {
  const [hover, setHover] = useStateSv(false);
  const isDep = rec.kind !== "withdraw";
  const color = isDep ? "var(--income)" : "var(--expense)";
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 6px", borderRadius: 12, background: hover ? "var(--surface-2)" : "transparent", transition: "background .15s" }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
        <Icon name={isDep ? "arrowDown" : "arrowUp"} size={19} stroke={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{rec.note || (isDep ? "存入" : "領出")}</div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{isDep ? "存入" : "領出"}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {hover && <div style={{ display: "flex", gap: 2, animation: "pop .15s ease" }}>
          <IconBtn name="edit" onClick={onEdit} title="編輯" />
          <IconBtn name="trash" onClick={onDelete} title="刪除" danger />
        </div>}
        <span className="num" style={{ fontSize: 15, fontWeight: 600, color }}>{isDep ? "+" : "−"}{fmtNTD(rec.amount)}</span>
      </div>
    </div>
  );
}

// ---------- Savings modal ----------
function SavingsModal({ initial, defaultKind, onSave, onClose, onDelete }) {
  const [kind, setKind] = useStateSv(initial?.kind || defaultKind || "deposit");
  const [amount, setAmount] = useStateSv(initial ? String(initial.amount) : "");
  const [date, setDate] = useStateSv(initial?.date || todayISO);
  const [note, setNote] = useStateSv(initial?.note || "");
  const amt = Math.round(+amount || 0);
  const valid = amt > 0;
  const submit = () => { if (!valid) return; onSave({ id: initial?.id, kind, amount: amt, date, note: note.trim() }); };
  const isDep = kind === "deposit";

  return (
    <ModalShell title={initial ? "編輯存款紀錄" : "新增存款紀錄"} onClose={onClose}>
      <div style={{ display: "flex", gap: 8 }}>
        {[{ v: "deposit", l: "存入", c: "var(--income)" }, { v: "withdraw", l: "領出", c: "var(--expense)" }].map(o => {
          const a = kind === o.v;
          return <button key={o.v} onClick={() => setKind(o.v)} style={{ flex: 1, padding: "11px", borderRadius: 12, fontSize: 14, fontWeight: 600,
            border: "1px solid " + (a ? o.c : "var(--border)"), color: a ? o.c : "var(--text-dim)", background: a ? `color-mix(in srgb, ${o.c} 13%, transparent)` : "transparent", transition: "all .15s" }}>{o.l}</button>;
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <span className="num" style={{ fontSize: 24, color: "var(--text-faint)", fontWeight: 500 }}>NT$</span>
        <input autoFocus type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
          onKeyDown={e => { if (e.key === "Enter") submit(); }} className="num"
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: isDep ? "var(--income)" : "var(--expense)", fontSize: 30, fontWeight: 600, width: "100%", textAlign: "right" }} />
      </div>
      <div>
        <Label>備註</Label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="選填,例如:緊急預備金、旅遊基金" onKeyDown={e => { if (e.key === "Enter") submit(); }} style={fieldStyle} />
      </div>
      <div>
        <Label>日期</Label>
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
          <MiniCalendar initialMonth={date.slice(0, 7)} value={date} min="2026-01-01" max="2026-06-30" onSelect={setDate} />
        </div>
      </div>
      <SaveRow onDelete={onDelete} onSave={submit} valid={valid} label={initial ? "儲存變更" : "新增"} />
    </ModalShell>
  );
}

Object.assign(window, { Savings, SavingsModal, savingsBalance, savingsSeries, SavingsRow });

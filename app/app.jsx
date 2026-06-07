// ============================================================
// app.jsx — shell, sidebar, topbar, add/edit modal, state
// ============================================================
const { useState, useEffect, useMemo, useRef } = React;

// layout + responsive styles
const layoutCss = document.createElement("style");
layoutCss.textContent = `
html[data-theme]{ background: var(--bg-grad); background-attachment: fixed; }
.shell{ display:flex; min-height:100vh; }
.sidebar{ width:240px; flex-shrink:0; position:sticky; top:0; height:100vh; display:flex; flex-direction:column;
  padding:22px 16px; border-right:1px solid var(--border); background:color-mix(in srgb, var(--surface) 55%, transparent); backdrop-filter:blur(8px); }
.main{ flex:1; min-width:0; display:flex; flex-direction:column; }
.content{ width:100%; max-width:1200px; margin:0 auto; padding:22px 30px 60px; }
.bottomnav{ display:none; }
.navitem{ display:flex; align-items:center; gap:12px; padding:11px 13px; border-radius:12px; font-size:14px; font-weight:500;
  color:var(--text-dim); cursor:pointer; transition:all .15s; width:100%; text-align:left; }
.navitem:hover{ color:var(--text); background:var(--surface-2); }
.navitem.active{ color:var(--text); background:var(--surface-2); }
.navitem.active .navdot{ opacity:1; }
@media(max-width:880px){
  .sidebar{ display:none; }
  .bottomnav{ display:flex; position:fixed; bottom:0; left:0; right:0; z-index:50; padding:8px 8px calc(8px + env(safe-area-inset-bottom));
    justify-content:space-around; border-top:1px solid var(--border); background:color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter:blur(14px); }
  .bn-item{ display:flex; flex-direction:column; align-items:center; gap:3px; font-size:10.5px; padding:6px 12px; border-radius:12px; color:var(--text-faint); flex:1; }
  .bn-item.active{ color:var(--accent); }
  .content{ padding:14px 14px 90px; }
  .dash-mid{ grid-template-columns:1fr !important; }
  .topbar-title{ font-size:18px !important; }
}
@media(max-width:760px){ .dash-mid{ grid-template-columns:1fr !important; } }
.fab{ display:none; }
@media(max-width:880px){ .fab{ display:grid; position:fixed; right:18px; bottom:78px; z-index:51; width:54px; height:54px; border-radius:18px;
  place-items:center; background:var(--accent); color:var(--bg); box-shadow:0 10px 30px -6px color-mix(in srgb, var(--accent) 60%, transparent); } }
`;
document.head.appendChild(layoutCss);

const MIN_MONTH = "2026-01", MAX_MONTH = "2026-06";

function App() {
  const [theme, setTheme] = useState(() => load(LS.theme, "midnight"));
  const [mk, setMk] = useState("2026-06");
  const [nav, setNav] = useState("dashboard");
  const [modal, setModal] = useState(null); // null | {tx} (tx null => new)

  // ---- auth ----
  const emailLogin = CLOUD_ENABLED && LOGIN_MODE === "email";
  const needPass = CLOUD_ENABLED && LOGIN_MODE === "none" && !!PASSCODE;
  const [session, setSession] = useState(undefined); // undefined=unknown, null=out, obj=in
  const [authReady, setAuthReady] = useState(!emailLogin);
  const [passOK, setPassOK] = useState(() => !needPass || sessionStorage.getItem("ledger.pass") === PASSCODE);
  useEffect(() => {
    if (!emailLogin) { setAuthReady(true); return; }
    Store.getSession().then(s => { setSession(s); setAuthReady(true); });
    return Store.onAuth(s => setSession(s));
  }, []);

  const ready = !CLOUD_ENABLED ? true : (emailLogin ? !!session : (!needPass || passOK));

  // ---- data ----
  const L = useLedger(ready);
  const { txs, budgets, setBudgets, recurring, setRecurring, todos, setTodos, tags, setTags } = L;

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); save(LS.theme, theme); }, [theme]);

  const openAdd = () => setModal({ tx: null });
  const openEdit = (tx) => setModal({ tx });
  const saveTx = (data, keepOpen) => { if (data.id) L.updateTx(data); else L.addTx(data); if (!keepOpen) setModal(null); };
  const delTx = (tx) => L.delTx(tx);

  const exportCSV = (scope) => {
    const list = scope === "year"
      ? txs.filter(t => yearKey(t.date) === yearKey(mk))
      : txs.filter(t => monthKey(t.date) === mk);
    const rows = [["日期", "類型", "分類", "備註", "金額"]];
    [...list].sort((a, b) => a.date < b.date ? 1 : -1).forEach(t => {
      rows.push([t.date, t.type === "income" ? "收入" : "支出", CAT_MAP[t.catId].name, `"${(t.note || "").replace(/"/g, '""')}"`, (t.type === "income" ? "" : "-") + t.amount]);
    });
    const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `記帳_${scope === "year" ? yearKey(mk) : mk}.csv`;
    a.click();
  };

  const navItems = [
    { id: "dashboard", label: "儀表板", icon: "grid" },
    { id: "transactions", label: "交易記錄", icon: "list" },
    { id: "recurring", label: "固定收支", icon: "repeat" },
    { id: "todos", label: "待辦", icon: "listCheck", badge: todos.filter(t => !t.done && t.due && t.due < todayISO).length },
    { id: "budget", label: "預算", icon: "target" },
    { id: "reports", label: "報表", icon: "chart" },
  ];
  const titles = { dashboard: "儀表板", transactions: "交易記錄", recurring: "固定收支", todos: "待辦事項", budget: "預算管理", reports: "財務報表" };

  // ---- auth gating (cloud mode only) ----
  if (emailLogin && !authReady) return <Splash theme={theme} setTheme={setTheme} />;
  if (emailLogin && !session) return <Login theme={theme} setTheme={setTheme} />;
  if (needPass && !passOK) return <Passcode theme={theme} onOk={() => { sessionStorage.setItem("ledger.pass", PASSCODE); setPassOK(true); }} />;

  return (
    <div className="app-root">
      <div className="shell">
        {/* ---------- Sidebar ---------- */}
        <aside className="sidebar">
          <Brand />
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 26, flex: 1 }}>
            {navItems.map(it => (
              <button key={it.id} className={"navitem" + (nav === it.id ? " active" : "")} onClick={() => setNav(it.id)}>
                <Icon name={it.icon} size={19} stroke={nav === it.id ? 2.3 : 2} />
                {it.label}
                {it.badge ? <span className="num" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--bg)", background: "var(--expense)", borderRadius: 9, minWidth: 18, height: 18, display: "grid", placeItems: "center", padding: "0 5px" }}>{it.badge}</span>
                  : <span className="navdot" style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: 4, background: "var(--accent)", opacity: 0, transition: "opacity .2s" }} />}
              </button>
            ))}
          </nav>
          {emailLogin && session && <Account email={session.user.email} />}
          {CLOUD_ENABLED && !emailLogin && <CloudBadge />}
          <ThemeSwitch theme={theme} setTheme={setTheme} />
        </aside>

        {/* ---------- Main ---------- */}
        <main className="main">
          <TopBar title={titles[nav]} mk={mk} setMk={setMk} onAdd={openAdd} />
          <div className="content">
            {L.loading ? <LoadingBlock /> : <>
            {nav === "dashboard" && <Dashboard txs={txs} mk={mk} budgets={budgets} onAdd={openAdd} onEdit={openEdit} onDelete={delTx} goTransactions={() => setNav("transactions")} />}
            {nav === "transactions" && <Transactions txs={txs} mk={mk} onEdit={openEdit} onDelete={delTx} onAdd={openAdd} />}
            {nav === "recurring" && <Recurring recurring={recurring} setRecurring={setRecurring} txs={txs} addTx={L.addTx} mk={mk} />}
            {nav === "todos" && <Todos todos={todos} setTodos={setTodos} />}
            {nav === "budget" && <Budget txs={txs} mk={mk} budgets={budgets} setBudgets={setBudgets} onAdd={openAdd} />}
            {nav === "reports" && <Reports txs={txs} mk={mk} onExport={exportCSV} />}
            </>}
          </div>
        </main>
      </div>

      {/* mobile FAB + bottom nav */}
      <button className="fab" onClick={openAdd}><Icon name="plus" size={24} stroke={2.6} /></button>
      <nav className="bottomnav">
        {navItems.map(it => (
          <button key={it.id} className={"bn-item" + (nav === it.id ? " active" : "")} onClick={() => setNav(it.id)}>
            <Icon name={it.icon} size={21} stroke={nav === it.id ? 2.4 : 2} />
            {it.label}
          </button>
        ))}
      </nav>

      {modal && <TxModal initial={modal.tx} tags={tags} setTags={setTags} onSave={saveTx} onClose={() => setModal(null)} onDelete={modal.tx ? () => { delTx(modal.tx); setModal(null); } : null} />}
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 6px" }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center",
        background: "var(--accent)", color: "var(--bg)" }}>
        <Icon name="coins" size={21} stroke={2.2} />
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>記帳本</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>個人收支管理</div>
      </div>
    </div>
  );
}

function Account({ email }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)" }}>
        {(email || "?")[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>已登入 · 雲端同步</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
      </div>
      <button onClick={() => Store.signOut()} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} title="登出"
        style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: h ? "var(--expense)" : "var(--text-faint)", background: h ? "var(--surface-2)" : "transparent" }}>
        <Icon name="power" size={16} />
      </button>
    </div>
  );
}

function CloudBadge() {
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 9, padding: "12px 6px 0" }}>
      <span style={{ width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }}>
        <Icon name="check" size={14} stroke={2.6} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500 }}>雲端同步中</div>
        <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>資料自動儲存到雲端</div>
      </div>
    </div>
  );
}

function Passcode({ theme, onOk }) {
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  const submit = () => {
    if (code === PASSCODE) onOk();
    else { setShake(true); setCode(""); setTimeout(() => setShake(false), 400); }
  };
  return (
    <div className="app-root" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 320, animation: shake ? "shake .4s" : "fadeUp .4s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--accent)", color: "var(--bg)" }}>
            <Icon name="coins" size={28} stroke={2.2} />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>記帳本</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 22, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 14 }}>
          <Label>請輸入通行碼</Label>
          <input autoFocus type="password" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            style={{ ...fieldStyle, fontSize: 18, textAlign: "center", letterSpacing: ".3em" }} />
          <button onClick={submit} style={{ padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, background: "var(--accent)", color: "var(--bg)" }}>進入</button>
        </div>
      </div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "120px 0", color: "var(--text-faint)" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid var(--surface-2)", borderTopColor: "var(--accent)", animation: "spin .8s linear infinite" }} />
      <span style={{ fontSize: 13 }}>讀取雲端資料…</span>
    </div>
  );
}

function Splash({ theme, setTheme }) {
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  return (
    <div className="app-root" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid var(--surface-2)", borderTopColor: "var(--accent)", animation: "spin .8s linear infinite" }} />
    </div>
  );
}

function Login({ theme, setTheme }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const send = async () => {
    if (!valid || state === "sending") return;
    setState("sending"); setErr("");
    try { const { error } = await Store.sendMagicLink(email.trim()); if (error) throw error; setState("sent"); }
    catch (e) { setErr(e.message || "寄送失敗"); setState("error"); }
  };

  return (
    <div className="app-root" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, animation: "fadeUp .4s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--accent)", color: "var(--bg)" }}>
            <Icon name="coins" size={28} stroke={2.2} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>記帳本</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>登入以在所有裝置同步你的帳本</div>
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 22, boxShadow: "var(--shadow)" }}>
          {state === "sent" ? (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }}><Icon name="check" size={24} stroke={2.4} /></div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>登入連結已寄出</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>請到 <b style={{ color: "var(--text)" }}>{email}</b> 收信,<br />點擊信中的連結即可登入。</div>
              <button onClick={() => setState("idle")} style={{ ...linkBtnStyle, marginTop: 4 }}>使用其他 Email</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <Label>Email</Label>
                <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  onKeyDown={e => { if (e.key === "Enter") send(); }} style={{ ...fieldStyle, fontSize: 15 }} />
              </div>
              {state === "error" && <div style={{ fontSize: 12.5, color: "var(--expense)" }}>{err}</div>}
              <button onClick={send} disabled={!valid || state === "sending"} style={{ padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: valid ? "var(--accent)" : "var(--surface-2)", color: valid ? "var(--bg)" : "var(--text-faint)", cursor: valid ? "pointer" : "not-allowed", transition: "all .15s" }}>
                {state === "sending" ? "寄送中…" : "寄送登入連結"}
              </button>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", textAlign: "center", lineHeight: 1.6 }}>
                免密碼登入 — 我們會寄一封含登入連結的信給你,<br />點一下就完成,安全又方便。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemeSwitch({ theme, setTheme }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 8 }}>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 9, paddingLeft: 6 }}>外觀主題</div>
      <div style={{ display: "flex", gap: 8 }}>
        {THEMES.map(t => {
          const active = t.id === theme;
          return (
            <button key={t.id} onClick={() => setTheme(t.id)} title={t.name}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "9px 4px", borderRadius: 11,
                border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
                background: active ? "var(--accent-soft)" : "transparent", transition: "all .15s" }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: t.bg, border: "1px solid var(--border-strong)", position: "relative" }}>
                <span style={{ position: "absolute", right: 3, bottom: 3, width: 8, height: 8, borderRadius: 4, background: t.dot }} />
              </span>
              <span style={{ fontSize: 10.5, color: active ? "var(--text)" : "var(--text-faint)", fontWeight: 500 }}>{t.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopBar({ title, mk, setMk, onAdd }) {
  const step = (d) => {
    let [y, m] = mk.split("-").map(Number);
    m += d; if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    const nk = `${y}-${String(m).padStart(2, "0")}`;
    if (nk >= MIN_MONTH && nk <= MAX_MONTH) setMk(nk);
  };
  const canPrev = mk > MIN_MONTH, canNext = mk < MAX_MONTH;
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 16,
      padding: "16px 30px", borderBottom: "1px solid var(--border)",
      background: "color-mix(in srgb, var(--bg) 78%, transparent)", backdropFilter: "blur(12px)" }}>
      <h1 className="topbar-title" style={{ fontSize: 21, fontWeight: 700, color: "var(--text)", letterSpacing: "-.01em" }}>{title}</h1>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 3 }}>
          <IconBtn name="chevL" onClick={() => step(-1)} size={30} title="上個月" />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 8px", fontSize: 13.5, fontWeight: 600, color: "var(--text)", minWidth: 108, justifyContent: "center" }}>
            <Icon name="calendar" size={15} style={{ color: "var(--text-faint)" }} />{labelMonth(mk).replace(" 年 ", "/").replace(" 月", "")}
          </span>
          <IconBtn name="chevR" onClick={() => step(1)} size={30} title="下個月" active={false} />
        </div>
        <button onClick={onAdd} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12,
          background: "var(--accent)", color: "var(--bg)", fontSize: 13.5, fontWeight: 600, boxShadow: "0 6px 18px -6px color-mix(in srgb, var(--accent) 70%, transparent)" }}>
          <Icon name="plus" size={17} stroke={2.6} /> 新增記錄
        </button>
      </div>
    </header>
  );
}

// ---------- Add / Edit modal ----------
function TxModal({ initial, tags = [], setTags, onSave, onClose, onDelete }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [catId, setCatId] = useState(initial?.catId || "");
  const [date, setDate] = useState(initial?.date || todayISO);
  const [note, setNote] = useState(initial?.note || "");
  const [editTags, setEditTags] = useState(false);
  const [flash, setFlash] = useState(false);
  const amtRef = useRef(null);
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (catId && !cats.find(c => c.id === catId)) setCatId(""); }, [type]);

  const amt = Math.round(+amount || 0);
  const valid = amt > 0 && catId;
  const submit = (keepOpen) => {
    if (!valid) return;
    onSave({ id: initial?.id, type, amount: amt, catId, date, note: note.trim() || CAT_MAP[catId].name }, keepOpen);
    if (keepOpen) {
      setAmount(""); setNote("");
      setFlash(true); setTimeout(() => setFlash(false), 1200);
      if (amtRef.current) amtRef.current.focus();
    }
  };
  const noteTrim = note.trim();
  const addTag = () => { if (noteTrim && !tags.includes(noteTrim)) setTags([...tags, noteTrim]); };
  const removeTag = (t) => setTags(tags.filter(x => x !== t));

  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, background: "rgba(2,6,16,0.62)", backdropFilter: "blur(4px)", animation: "overlayIn .2s ease" }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", background: "var(--surface-solid)",
        border: "1px solid var(--border-strong)", borderRadius: 22, boxShadow: "var(--shadow)", animation: "pop .22s cubic-bezier(.3,1.1,.4,1)" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{initial ? "編輯記錄" : "新增記錄"}</h2>
          <IconBtn name="close" onClick={onClose} title="關閉" />
        </div>

        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          {/* type toggle */}
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: "expense", l: "支出", c: "var(--expense)" }, { v: "income", l: "收入", c: "var(--income)" }].map(o => {
              const active = type === o.v;
              return (
                <button key={o.v} onClick={() => setType(o.v)} style={{ flex: 1, padding: "11px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                  border: "1px solid " + (active ? o.c : "var(--border)"),
                  color: active ? o.c : "var(--text-dim)",
                  background: active ? `color-mix(in srgb, ${o.c} 13%, transparent)` : "transparent", transition: "all .15s" }}>{o.l}</button>
              );
            })}
          </div>

          {/* amount */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span className="num" style={{ fontSize: 24, color: "var(--text-faint)", fontWeight: 500 }}>NT$</span>
            <input ref={amtRef} autoFocus type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
              onKeyDown={e => { if (e.key === "Enter") submit(false); }}
              className="num" style={{ flex: 1, background: "none", border: "none", outline: "none", color: type === "income" ? "var(--income)" : "var(--text)",
                fontSize: 30, fontWeight: 600, width: "100%", textAlign: "right" }} />
          </div>

          {/* categories */}
          <div>
            <Label>分類</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {cats.map(c => {
                const active = catId === c.id;
                return (
                  <button key={c.id} onClick={() => setCatId(c.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px", borderRadius: 12,
                    border: "1px solid " + (active ? c.color : "var(--border)"),
                    background: active ? `color-mix(in srgb, ${c.color} 14%, transparent)` : "transparent", transition: "all .15s" }}>
                    <span style={{ color: c.color }}><Icon name={c.icon} size={20} /></span>
                    <span style={{ fontSize: 11, color: active ? "var(--text)" : "var(--text-dim)" }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* note + tags */}
          <div>
            <Label>備註</Label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="選填,可點下方標籤快速帶入"
              onKeyDown={e => { if (e.key === "Enter") submit(false); }} style={fieldStyle} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10, alignItems: "center" }}>
              {tags.map(t => {
                const active = note === t;
                return (
                  <button key={t} onClick={() => editTags ? removeTag(t) : setNote(t)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                    border: "1px solid " + (active && !editTags ? "var(--accent)" : "var(--border)"),
                    color: editTags ? "var(--expense)" : active ? "var(--accent)" : "var(--text-dim)",
                    background: active && !editTags ? "var(--accent-soft)" : "var(--surface-2)", transition: "all .12s" }}>
                    {editTags && <Icon name="close" size={12} stroke={2.4} />}{t}
                  </button>
                );
              })}
              {!editTags && noteTrim && !tags.includes(noteTrim) && (
                <button onClick={addTag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  border: "1px dashed var(--border-strong)", color: "var(--text-dim)", background: "transparent" }}>
                  <Icon name="plus" size={12} stroke={2.6} /> 存成標籤
                </button>
              )}
              <button onClick={() => setEditTags(e => !e)} title={editTags ? "完成" : "管理標籤"} style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center",
                color: editTags ? "var(--accent)" : "var(--text-faint)", background: editTags ? "var(--accent-soft)" : "transparent" }}>
                <Icon name={editTags ? "check" : "edit"} size={15} />
              </button>
            </div>
          </div>

          {/* date — inline calendar */}
          <div>
            <Label>日期</Label>
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
              <MiniCalendar initialMonth={date.slice(0, 7)} value={date} min={MIN_MONTH + "-01"} max={MAX_MONTH + "-30"} onSelect={setDate} />
            </div>
          </div>

          {/* actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 2, alignItems: "center" }}>
            {onDelete && <button onClick={onDelete} style={{ padding: "12px 16px", borderRadius: 12, color: "var(--expense)",
              border: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}><Icon name="trash" size={17} /></button>}
            {!initial && (
              <button onClick={() => submit(true)} disabled={!valid} style={{ padding: "13px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                border: "1px solid " + (valid ? "var(--border-strong)" : "var(--border)"), color: valid ? "var(--text)" : "var(--text-faint)",
                background: flash ? "color-mix(in srgb, var(--income) 16%, transparent)" : "var(--surface)", cursor: valid ? "pointer" : "not-allowed", transition: "all .15s", whiteSpace: "nowrap" }}>
                {flash ? "已新增 ✓" : "儲存並繼續"}
              </button>
            )}
            <button onClick={() => submit(false)} disabled={!valid} style={{ flex: 1, padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: valid ? "var(--accent)" : "var(--surface-2)", color: valid ? "var(--bg)" : "var(--text-faint)",
              cursor: valid ? "pointer" : "not-allowed", transition: "all .15s" }}>
              {initial ? "儲存變更" : "完成"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function Label({ children }) {
  return <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 8, fontWeight: 500 }}>{children}</div>;
}
const fieldStyle = { width: "100%", padding: "11px 13px", borderRadius: 12, background: "var(--surface-2)",
  border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none" };

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

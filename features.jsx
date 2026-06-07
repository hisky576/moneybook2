// ============================================================
// features.jsx — Recurring (固定收支) + Todos (待辦/重複)
// ============================================================
const { useState: useStateF, useEffect: useEffectF } = React;

const REPEATS = [
  { v: "none", l: "不重複" }, { v: "daily", l: "每天" }, { v: "weekly", l: "每週" }, { v: "monthly", l: "每月" },
];
const REPEAT_LABEL = Object.fromEntries(REPEATS.map(r => [r.v, r.l]));

function daysInMonthKey(mk) { const [y, m] = mk.split("-").map(Number); return new Date(y, m, 0).getDate(); }
function advanceDate(iso, repeat) {
  const d = new Date(iso + "T00:00:00");
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
const uid = () => "id" + Date.now() + Math.floor(Math.random() * 9999);

// ============================================================
// Recurring (固定收支)
// ============================================================
function Recurring({ recurring, setRecurring, txs, addTx, mk }) {
  const [modal, setModal] = useStateF(null); // null | {tmpl}
  const applied = (id) => txs.some(t => t.recurringId === id && monthKey(t.date) === mk);

  const apply = (tmpl) => {
    if (applied(tmpl.id)) return;
    const day = Math.min(tmpl.day, daysInMonthKey(mk));
    addTx({ type: tmpl.type, catId: tmpl.catId, amount: tmpl.amount, date: `${mk}-${pad2(day)}`, note: tmpl.note, recurringId: tmpl.id });
  };
  const applyAll = () => recurring.filter(t => t.active && !applied(t.id)).forEach(apply);

  const save = (t) => {
    if (t.id && recurring.find(x => x.id === t.id)) setRecurring(recurring.map(x => x.id === t.id ? t : x));
    else setRecurring([...recurring, { ...t, id: t.id || uid() }]);
    setModal(null);
  };
  const remove = (t) => setRecurring(recurring.filter(x => x.id !== t.id));

  const expense = recurring.filter(r => r.type === "expense");
  const income = recurring.filter(r => r.type === "income");
  const pendingCount = recurring.filter(t => t.active && !applied(t.id)).length;
  const monthlyExp = sum(expense.filter(r => r.active).map(r => r.amount));
  const monthlyInc = sum(income.filter(r => r.active).map(r => r.amount));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      <Card style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", flex: 1 }}>
          <Metric label="每月固定收入" value={"+" + fmtNTD(monthlyInc)} color="var(--income)" />
          <Metric label="每月固定支出" value={"−" + fmtNTD(monthlyExp)} color="var(--expense)" />
          <Metric label="淨固定結餘" value={fmtSigned(monthlyInc - monthlyExp)} color={monthlyInc - monthlyExp >= 0 ? "var(--accent)" : "var(--expense)"} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {pendingCount > 0 && (
            <button onClick={applyAll} style={{ ...addMiniBtn, background: "var(--accent)" }}>
              <Icon name="repeat" size={16} /> 一鍵記入本月 ({pendingCount})
            </button>
          )}
          <button onClick={() => setModal({ tmpl: null })} style={ghostBtn}><Icon name="plus" size={16} stroke={2.5} /> 新增固定項目</button>
        </div>
      </Card>

      {recurring.length === 0 ? (
        <Card><div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Icon name="repeat" size={36} stroke={1.5} />
          <div style={{ fontSize: 14 }}>還沒有固定收支項目</div>
          <div style={{ fontSize: 12.5 }}>把每月房租、薪資、訂閱費設為固定,之後一鍵記帳</div>
          <button onClick={() => setModal({ tmpl: null })} style={{ ...linkBtnStyle, marginTop: 4 }}><Icon name="plus" size={14} stroke={2.4} /> 新增第一個</button>
        </div></Card>
      ) : (
        <>
          {income.length > 0 && <RecurGroup title="固定收入" items={income} applied={applied} apply={apply} onEdit={(t) => setModal({ tmpl: t })} onDelete={remove} mk={mk} />}
          {expense.length > 0 && <RecurGroup title="固定支出" items={expense} applied={applied} apply={apply} onEdit={(t) => setModal({ tmpl: t })} onDelete={remove} mk={mk} />}
        </>
      )}

      {modal && <RecurringModal initial={modal.tmpl} onSave={save} onClose={() => setModal(null)} onDelete={modal.tmpl ? () => { remove(modal.tmpl); setModal(null); } : null} />}
    </div>
  );
}

function RecurGroup({ title, items, applied, apply, onEdit, onDelete, mk }) {
  return (
    <Card>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(t => {
          const isApplied = applied(t.id);
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 6px" }}>
              <CatChip catId={t.catId} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: t.active ? "var(--text)" : "var(--text-faint)" }}>{t.note || CAT_MAP[t.catId].name}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2, display: "flex", alignItems: "center", gap: 7 }}>
                  <span>{CAT_MAP[t.catId].name}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="calendar" size={12} /> 每月 {t.day} 號</span>
                  {!t.active && <span style={{ color: "var(--text-faint)" }}>· 已停用</span>}
                </div>
              </div>
              <Amount value={t.amount} type={t.type} />
              <div style={{ width: 104, display: "flex", justifyContent: "flex-end" }}>
                {!t.active ? null : isApplied ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--income)" }}><Icon name="check" size={15} /> 本月已記入</span>
                ) : (
                  <button onClick={() => apply(t)} style={chipBtn}><Icon name="plus" size={13} stroke={2.4} /> 記入本月</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                <IconBtn name="edit" onClick={() => onEdit(t)} title="編輯" />
                <IconBtn name="trash" onClick={() => onDelete(t)} title="刪除" danger />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================
// Todos (待辦事項 + 重複)
// ============================================================
function Todos({ todos, setTodos }) {
  const [modal, setModal] = useStateF(null);

  const save = (t) => {
    if (t.id && todos.find(x => x.id === t.id)) setTodos(todos.map(x => x.id === t.id ? t : x));
    else setTodos([...todos, { ...t, id: t.id || uid(), done: false }]);
    setModal(null);
  };
  const remove = (t) => setTodos(todos.filter(x => x.id !== t.id));
  const toggle = (todo) => {
    if (todo.repeat && todo.repeat !== "none") {
      const base = todo.due && todo.due >= todayISO ? todo.due : todayISO;
      setTodos(todos.map(t => t.id === todo.id ? { ...t, due: advanceDate(base, todo.repeat) } : t));
    } else {
      setTodos(todos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t));
    }
  };

  const active = todos.filter(t => !t.done);
  const byDue = (a, b) => (a.due || "9") < (b.due || "9") ? -1 : 1;
  const overdue = active.filter(t => t.due && t.due < todayISO).sort(byDue);
  const today = active.filter(t => t.due === todayISO).sort(byDue);
  const upcoming = active.filter(t => !t.due || t.due > todayISO).sort(byDue);
  const done = todos.filter(t => t.done).sort(byDue);

  const groups = [
    { key: "overdue", title: "逾期", items: overdue, color: "var(--expense)" },
    { key: "today", title: "今天", items: today, color: "var(--accent)" },
    { key: "upcoming", title: "即將到來", items: upcoming, color: "var(--text-dim)" },
    { key: "done", title: "已完成", items: done, color: "var(--income)" },
  ].filter(g => g.items.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
          待辦 <b className="num" style={{ color: "var(--text)" }}>{active.length}</b>
          {overdue.length > 0 && <span style={{ color: "var(--expense)" }}> · 逾期 {overdue.length}</span>}
        </span>
        <button onClick={() => setModal({ todo: null })} style={{ ...addMiniBtn, marginLeft: "auto" }}><Icon name="plus" size={16} stroke={2.5} /> 新增待辦</button>
      </div>

      {todos.length === 0 ? (
        <Card><div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Icon name="listCheck" size={36} stroke={1.5} />
          <div style={{ fontSize: 14 }}>還沒有待辦事項</div>
          <div style={{ fontSize: 12.5 }}>例如「繳信用卡費」「對帳」,可設定每天/每週/每月重複</div>
          <button onClick={() => setModal({ todo: null })} style={{ ...linkBtnStyle, marginTop: 4 }}><Icon name="plus" size={14} stroke={2.4} /> 新增第一個</button>
        </div></Card>
      ) : groups.map(g => (
        <Card key={g.key}>
          <SectionLabel right={<span className="num" style={{ fontSize: 12, color: "var(--text-faint)" }}>{g.items.length}</span>}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: g.color }} />{g.title}</span>
          </SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {g.items.map(t => <TodoRow key={t.id} todo={t} onToggle={toggle} onEdit={() => setModal({ todo: t })} onDelete={() => remove(t)} />)}
          </div>
        </Card>
      ))}

      {modal && <TodoModal initial={modal.todo} onSave={save} onClose={() => setModal(null)} onDelete={modal.todo ? () => { remove(modal.todo); setModal(null); } : null} />}
    </div>
  );
}

function TodoRow({ todo, onToggle, onEdit, onDelete }) {
  const [hover, setHover] = useStateF(false);
  const repeats = todo.repeat && todo.repeat !== "none";
  const overdue = !todo.done && todo.due && todo.due < todayISO;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 6px", borderRadius: 12, background: hover ? "var(--surface-2)" : "transparent", transition: "background .15s" }}>
      <button onClick={() => onToggle(todo)} title={repeats ? "完成並排下次" : "標記完成"}
        style={{ color: todo.done ? "var(--income)" : repeats ? "var(--accent)" : "var(--text-faint)", display: "grid", placeItems: "center" }}>
        <Icon name={todo.done ? "checkCircle" : repeats ? "repeat" : "circle"} size={22} stroke={2} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: todo.done ? "var(--text-faint)" : "var(--text)", textDecoration: todo.done ? "line-through" : "none" }}>{todo.title}</div>
        <div style={{ fontSize: 12, color: overdue ? "var(--expense)" : "var(--text-faint)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
          {todo.due && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="calendar" size={12} />{fmtFieldDate(todo.due)}</span>}
          {repeats && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent)" }}><Icon name="repeat" size={12} />{REPEAT_LABEL[todo.repeat]}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, opacity: hover ? 1 : 0, transition: "opacity .15s" }}>
        <IconBtn name="edit" onClick={onEdit} title="編輯" />
        <IconBtn name="trash" onClick={onDelete} title="刪除" danger />
      </div>
    </div>
  );
}

const ghostBtn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: 13, fontWeight: 600 };
const chipBtn = { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 12.5, fontWeight: 600 };

Object.assign(window, { Recurring, Todos, REPEATS, REPEAT_LABEL, advanceDate, daysInMonthKey, ghostBtn, chipBtn, uid });

// ============================================================
// modals.jsx — RecurringModal + TodoModal
// ============================================================
const { useState: useStateM, useEffect: useEffectM } = React;

const TODO_MIN = "2026-01-01", TODO_MAX = "2027-12-31";

function ModalShell({ title, onClose, children, width = 460 }) {
  useEffectM(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, background: "rgba(2,6,16,0.62)", backdropFilter: "blur(4px)", animation: "overlayIn .2s ease" }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: "100%", maxWidth: width, background: "var(--surface-solid)",
        border: "1px solid var(--border-strong)", borderRadius: 22, boxShadow: "var(--shadow)", animation: "pop .22s cubic-bezier(.3,1.1,.4,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{title}</h2>
          <IconBtn name="close" onClick={onClose} title="關閉" />
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
      </div>
    </div>
  );
}

function SaveRow({ onDelete, onSave, valid, label }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
      {onDelete && <button onClick={onDelete} style={{ padding: "12px 16px", borderRadius: 12, color: "var(--expense)", border: "1px solid var(--border)", fontSize: 14, fontWeight: 600 }}><Icon name="trash" size={17} /></button>}
      <button onClick={onSave} disabled={!valid} style={{ flex: 1, padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700,
        background: valid ? "var(--accent)" : "var(--surface-2)", color: valid ? "var(--bg)" : "var(--text-faint)", cursor: valid ? "pointer" : "not-allowed", transition: "all .15s" }}>{label}</button>
    </div>
  );
}

// ---------- Recurring template modal ----------
function RecurringModal({ initial, onSave, onClose, onDelete }) {
  const [type, setType] = useStateM(initial?.type || "expense");
  const [amount, setAmount] = useStateM(initial ? String(initial.amount) : "");
  const [catId, setCatId] = useStateM(initial?.catId || "");
  const [day, setDay] = useStateM(initial?.day || 1);
  const [note, setNote] = useStateM(initial?.note || "");
  const [active, setActive] = useStateM(initial ? initial.active !== false : true);
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  useEffectM(() => { if (catId && !cats.find(c => c.id === catId)) setCatId(""); }, [type]);

  const amt = Math.round(+amount || 0);
  const valid = amt > 0 && catId && day >= 1 && day <= 31;
  const submit = () => { if (!valid) return; onSave({ id: initial?.id, type, amount: amt, catId, day: Math.min(31, Math.max(1, +day)), note: note.trim() || CAT_MAP[catId].name, active }); };

  return (
    <ModalShell title={initial ? "編輯固定項目" : "新增固定項目"} onClose={onClose}>
      <div style={{ display: "flex", gap: 8 }}>
        {[{ v: "expense", l: "固定支出", c: "var(--expense)" }, { v: "income", l: "固定收入", c: "var(--income)" }].map(o => {
          const a = type === o.v;
          return <button key={o.v} onClick={() => setType(o.v)} style={{ flex: 1, padding: "11px", borderRadius: 12, fontSize: 14, fontWeight: 600,
            border: "1px solid " + (a ? o.c : "var(--border)"), color: a ? o.c : "var(--text-dim)", background: a ? `color-mix(in srgb, ${o.c} 13%, transparent)` : "transparent", transition: "all .15s" }}>{o.l}</button>;
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <span className="num" style={{ fontSize: 24, color: "var(--text-faint)", fontWeight: 500 }}>NT$</span>
        <input autoFocus type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
          onKeyDown={e => { if (e.key === "Enter") submit(); }} className="num"
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: type === "income" ? "var(--income)" : "var(--text)", fontSize: 30, fontWeight: 600, width: "100%", textAlign: "right" }} />
      </div>

      <div>
        <Label>分類</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {cats.map(c => {
            const a = catId === c.id;
            return <button key={c.id} onClick={() => setCatId(c.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px", borderRadius: 12,
              border: "1px solid " + (a ? c.color : "var(--border)"), background: a ? `color-mix(in srgb, ${c.color} 14%, transparent)` : "transparent", transition: "all .15s" }}>
              <span style={{ color: c.color }}><Icon name={c.icon} size={20} /></span>
              <span style={{ fontSize: 11, color: a ? "var(--text)" : "var(--text-dim)" }}>{c.name}</span>
            </button>;
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 130px" }}>
          <Label>每月扣款日</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, ...fieldStyle, padding: "8px 13px" }}>
            <span style={{ fontSize: 13, color: "var(--text-faint)" }}>每月</span>
            <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="num"
              style={{ width: 48, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 8px", color: "var(--text)", fontSize: 14, outline: "none", textAlign: "center" }} />
            <span style={{ fontSize: 13, color: "var(--text-faint)" }}>號</span>
          </div>
        </div>
        <div style={{ flex: "2 1 180px" }}>
          <Label>備註</Label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="例如:房租、Netflix、薪資" onKeyDown={e => { if (e.key === "Enter") submit(); }} style={fieldStyle} />
        </div>
      </div>

      <button onClick={() => setActive(a => !a)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", textAlign: "left" }}>
        <span style={{ width: 38, height: 22, borderRadius: 12, background: active ? "var(--accent)" : "var(--border-strong)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 2, left: active ? 18 : 2, width: 18, height: 18, borderRadius: 10, background: "#fff", transition: "left .2s" }} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>啟用此項目</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text-faint)", marginTop: 1 }}>停用後不會出現在「一鍵記入本月」</span>
        </span>
      </button>

      <SaveRow onDelete={onDelete} onSave={submit} valid={valid} label={initial ? "儲存變更" : "新增"} />
    </ModalShell>
  );
}

// ---------- Todo modal ----------
function TodoModal({ initial, onSave, onClose, onDelete }) {
  const [title, setTitle] = useStateM(initial?.title || "");
  const [due, setDue] = useStateM(initial?.due || todayISO);
  const [repeat, setRepeat] = useStateM(initial?.repeat || "none");
  const valid = title.trim().length > 0;
  const submit = () => { if (!valid) return; onSave({ id: initial?.id, title: title.trim(), due, repeat, done: initial?.done || false }); };

  return (
    <ModalShell title={initial ? "編輯待辦" : "新增待辦"} onClose={onClose} width={440}>
      <div>
        <Label>事項</Label>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="例如:繳信用卡費、月底對帳"
          onKeyDown={e => { if (e.key === "Enter") submit(); }} style={{ ...fieldStyle, fontSize: 15 }} />
      </div>
      <div>
        <Label>到期日</Label>
        <DatePickerField value={due} onChange={setDue} min={TODO_MIN} max={TODO_MAX} />
      </div>
      <div>
        <Label>重複</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {REPEATS.map(r => {
            const a = repeat === r.v;
            return <button key={r.v} onClick={() => setRepeat(r.v)} style={{ padding: "10px 4px", borderRadius: 11, fontSize: 13, fontWeight: 600,
              border: "1px solid " + (a ? "var(--accent)" : "var(--border)"), color: a ? "var(--accent)" : "var(--text-dim)", background: a ? "var(--accent-soft)" : "transparent", transition: "all .15s" }}>{r.l}</button>;
          })}
        </div>
        {repeat !== "none" && <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 9, display: "flex", alignItems: "center", gap: 5 }}><Icon name="repeat" size={13} style={{ color: "var(--accent)" }} /> 完成後會自動排到下一個{REPEAT_LABEL[repeat].replace("每", "")}</div>}
      </div>
      <SaveRow onDelete={onDelete} onSave={submit} valid={valid} label={initial ? "儲存變更" : "新增待辦"} />
    </ModalShell>
  );
}

Object.assign(window, { ModalShell, SaveRow, RecurringModal, TodoModal });

// ============================================================
// store.jsx — data layer + auth + useLedger hook
//   cloud mode : Supabase (transactions table + app_settings jsonb)
//   local mode : localStorage (works with no setup)
// ============================================================
const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

// ---- localStorage helpers (shared) ----
const LS = { tx: "ledger.tx.v1", settings: "ledger.settings.v1", theme: "ledger.theme.v1" };
const load = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const DEFAULT_SETTINGS = { budgets: DEFAULT_BUDGETS, recurring: [], todos: [] };
const mergeSettings = (s) => ({
  budgets: { ...DEFAULT_BUDGETS, ...(s && s.budgets) },
  recurring: (s && s.recurring) || [],
  todos: (s && s.todos) || [],
});

// ---- supabase client ----
let sb = null;
if (CLOUD_ENABLED) {
  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
    });
  } else {
    console.warn("[記帳本] 已設定 Supabase,但 SDK 未載入,暫時改用本機模式。");
  }
}
const CLOUD = CLOUD_ENABLED && !!sb;

// ---- row <-> app shape ----
const toApp = (r) => ({ id: r.id, type: r.type, catId: r.cat_id, amount: r.amount, date: r.date, note: r.note, recurringId: r.recurring_id || null });
const toDb  = (t) => ({ type: t.type, cat_id: t.catId, amount: t.amount, date: t.date, note: t.note || "", recurring_id: t.recurringId || null });

const Store = {
  cloud: CLOUD,
  sb,
  // ---- auth ----
  async getSession() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session; },
  onAuth(cb) { if (!sb) return () => {}; const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s)); return () => data.subscription.unsubscribe(); },
  async sendMagicLink(email) { return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split("#")[0] } }); },
  async signOut() { if (sb) await sb.auth.signOut(); },
  // ---- transactions ----
  async loadTransactions() {
    const { data, error } = await sb.from("transactions").select("*")
      .order("date", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(toApp);
  },
  async addTransaction(t) {
    const { data, error } = await sb.from("transactions").insert(toDb(t)).select().single();
    if (error) throw error; return toApp(data);
  },
  async updateTransaction(t) {
    const { error } = await sb.from("transactions").update(toDb(t)).eq("id", t.id);
    if (error) throw error; return t;
  },
  async deleteTransaction(id) {
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) throw error;
  },
  // ---- settings (budgets + recurring + todos) ----
  async loadSettings() {
    const { data, error } = await sb.from("app_settings").select("data").maybeSingle();
    if (error) throw error;
    return mergeSettings(data && data.data);
  },
  async saveSettings(next) {
    const { error } = await sb.from("app_settings").upsert({ id: 1, data: next }, { onConflict: "id" });
    if (error) throw error;
  },
};

// ============================================================
// useLedger — owns txs + settings, switches cloud/local
//   ready: in cloud mode, whether we're cleared to load (logged in / shared)
// ============================================================
function useLedger(ready) {
  const cloud = Store.cloud;
  const [txs, setTxs] = useStateS([]);
  const [settings, setSettings] = useStateS(DEFAULT_SETTINGS);
  const [loading, setLoading] = useStateS(false);
  const [error, setError] = useStateS(null);
  const sRef = useRefS(settings);
  useEffectS(() => { sRef.current = settings; }, [settings]);

  useEffectS(() => {
    let alive = true;
    if (cloud) {
      if (!ready) { setTxs([]); setSettings(DEFAULT_SETTINGS); return; }
      setLoading(true); setError(null);
      (async () => {
        try {
          const [t, s] = await Promise.all([Store.loadTransactions(), Store.loadSettings()]);
          if (!alive) return; setTxs(t); setSettings(s);
        } catch (e) { if (alive) setError(e.message || "讀取失敗"); console.error(e); }
        finally { if (alive) setLoading(false); }
      })();
    } else {
      setTxs(load(LS.tx, SAMPLE_TX));
      setSettings(mergeSettings(load(LS.settings, DEFAULT_SETTINGS)));
    }
    return () => { alive = false; };
  }, [cloud, ready]);

  useEffectS(() => { if (!cloud) save(LS.tx, txs); }, [txs, cloud]);

  const fail = (msg, e) => { console.error(e); alert(msg + (e && e.message ? "\n" + e.message : "")); };

  // ---- transactions ----
  const addTx = async (data) => {
    const tmp = { ...data, id: data.id || ("t" + Date.now() + Math.floor(Math.random() * 999)) };
    setTxs(prev => sortTx([tmp, ...prev]));
    if (cloud) {
      try { const row = await Store.addTransaction(data); setTxs(prev => sortTx(prev.map(x => x.id === tmp.id ? row : x))); }
      catch (e) { setTxs(prev => prev.filter(x => x.id !== tmp.id)); fail("新增失敗,請稍後再試。", e); }
    }
    return tmp;
  };
  const updateTx = async (data) => {
    const before = txs;
    setTxs(prev => sortTx(prev.map(x => x.id === data.id ? data : x)));
    if (cloud) { try { await Store.updateTransaction(data); } catch (e) { setTxs(before); fail("更新失敗。", e); } }
  };
  const delTx = async (tx) => {
    const before = txs;
    setTxs(prev => prev.filter(x => x.id !== tx.id));
    if (cloud) { try { await Store.deleteTransaction(tx.id); } catch (e) { setTxs(before); fail("刪除失敗。", e); } }
  };

  // ---- settings ----
  const patchSettings = (partial) => {
    const next = { ...sRef.current, ...partial };
    sRef.current = next; setSettings(next);
    if (cloud) Store.saveSettings(next).catch(e => console.error(e));
    else save(LS.settings, next);
  };
  const setBudgets = (b) => patchSettings({ budgets: b });
  const setRecurring = (r) => patchSettings({ recurring: r });
  const setTodos = (t) => patchSettings({ todos: t });

  return {
    txs, addTx, updateTx, delTx, loading, error,
    budgets: settings.budgets, setBudgets,
    recurring: settings.recurring, setRecurring,
    todos: settings.todos, setTodos,
  };
}

function sortTx(list) { return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); }

Object.assign(window, { Store, useLedger, LS, load, save, CLOUD, DEFAULT_SETTINGS });

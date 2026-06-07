// ============================================================
// data.jsx — categories, seeded sample data, budgets, helpers
// ============================================================

const CATEGORIES = [
  // expense
  { id: "food",    name: "餐飲",   type: "expense", color: "var(--cat-food)",    icon: "utensils" },
  { id: "transit", name: "交通",   type: "expense", color: "var(--cat-transit)", icon: "car" },
  { id: "shop",    name: "購物",   type: "expense", color: "var(--cat-shop)",    icon: "bag" },
  { id: "home",    name: "居家",   type: "expense", color: "var(--cat-home)",    icon: "home" },
  { id: "fun",     name: "娛樂",   type: "expense", color: "var(--cat-fun)",     icon: "play" },
  { id: "health",  name: "醫療",   type: "expense", color: "var(--cat-health)",  icon: "heart" },
  { id: "edu",     name: "教育",   type: "expense", color: "var(--cat-edu)",     icon: "book" },
  { id: "travel",  name: "旅遊",   type: "expense", color: "var(--cat-travel)",  icon: "plane" },
  { id: "comm",    name: "通訊",   type: "expense", color: "var(--cat-comm)",    icon: "phone" },
  { id: "other",   name: "其他",   type: "expense", color: "var(--cat-other)",   icon: "dots" },
  // income
  { id: "salary",  name: "薪資",   type: "income",  color: "var(--income)",      icon: "wallet" },
  { id: "bonus",   name: "獎金",   type: "income",  color: "var(--income)",      icon: "gift" },
  { id: "invest",  name: "投資",   type: "income",  color: "var(--income)",      icon: "trend" },
  { id: "side",    name: "兼職",   type: "income",  color: "var(--income)",      icon: "briefcase" },
  { id: "inother", name: "其他收入", type: "income", color: "var(--income)",     icon: "plus" },
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const EXPENSE_CATS = CATEGORIES.filter(c => c.type === "expense");
const INCOME_CATS = CATEGORIES.filter(c => c.type === "income");

// ---------- seeded RNG (deterministic sample data) ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MERCHANTS = {
  food:    ["全家便利商店", "鼎泰豐", "星巴克", "麥當勞", "路易莎咖啡", "家樂福買菜", "夜市晚餐", "壽司郎", "八方雲集", "拉麵店"],
  transit: ["悠遊卡儲值", "台灣大車隊", "中油加油", "高鐵車票", "停車費", "Uber", "捷運月票", "機車保養"],
  shop:    ["Uniqlo", "蝦皮購物", "屈臣氏", "誠品書店", "Apple Store", "IKEA", "MOMO 購物", "寶雅"],
  home:    ["房租", "台電電費", "自來水費", "瓦斯費", "管理費", "日用品採購"],
  fun:     ["Netflix", "電影票", "KTV", "Spotify", "健身房月費", "演唱會門票", "Steam 遊戲"],
  health:  ["診所掛號", "藥局", "健保補充", "牙醫", "眼鏡行", "保健食品"],
  edu:     ["線上課程", "原文書", "證照報名費", "語言補習班"],
  travel:  ["訂房 Agoda", "機票", "墾丁民宿", "高鐵旅遊", "租車費"],
  comm:    ["中華電信月租", "網路費", "手機分期"],
  other:   ["禮金", "捐款", "雜支", "罰單"],
  salary:  ["月薪轉帳"],
  bonus:   ["年終獎金", "季度績效獎金", "三節獎金"],
  invest:  ["股票股利", "ETF 配息", "定存利息"],
  side:    ["接案收入", "假日兼職", "稿費"],
  inother: ["退稅", "二手轉賣", "中獎"],
};

const AMOUNT_RANGE = {
  food: [60, 480], transit: [30, 1600], shop: [200, 4200], home: [400, 16000],
  fun: [150, 2200], health: [150, 3200], edu: [600, 6000], travel: [1500, 12000],
  comm: [499, 1399], other: [100, 2600],
  salary: [62000, 62000], bonus: [12000, 60000], invest: [800, 9000], side: [2000, 9000], inother: [300, 4000],
};

function genTransactions() {
  const rng = mulberry32(20260607);
  const list = [];
  let id = 1;
  // months: 2026-01 .. 2026-06 (current). Day cap for June = 7.
  const months = [
    { y: 2026, m: 1, days: 31 }, { y: 2026, m: 2, days: 28 }, { y: 2026, m: 3, days: 31 },
    { y: 2026, m: 4, days: 30 }, { y: 2026, m: 5, days: 31 }, { y: 2026, m: 6, days: 7 },
  ];
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const roundTo = (n, step) => Math.round(n / step) * step;

  months.forEach(({ y, m, days }) => {
    // income: salary on the 5th
    if (days >= 5) {
      list.push(mk("salary", y, m, 5, 62000));
    }
    // occasional bonus / invest / side
    if (m === 2) list.push(mk("bonus", y, m, 10, 48000));         // 年終
    if (m === 6 && days >= 5) list.push(mk("invest", y, m, 3, roundTo(900 + rng() * 6000, 50)));
    if (m % 2 === 0) list.push(mk("side", y, m, 18 % days || 18, roundTo(2500 + rng() * 5000, 100)));
    if (m === 1) list.push(mk("invest", y, m, 20, 3200));

    // expenses — denser
    const nExp = m === 6 ? 7 : 13 + Math.floor(rng() * 8);
    for (let i = 0; i < nExp; i++) {
      const cat = pick(EXPENSE_CATS).id;
      // home (rent etc) concentrate early month
      let day;
      if (cat === "home") day = Math.min(days, 1 + Math.floor(rng() * 6));
      else day = 1 + Math.floor(rng() * days);
      const [lo, hi] = AMOUNT_RANGE[cat];
      let amt = roundTo(lo + rng() * (hi - lo), cat === "food" ? 5 : 10);
      // ensure rent appears monthly
      list.push(mk(cat, y, m, day, amt));
    }
    // guaranteed monthly fixed costs
    list.push(mk("home", y, m, 1, 16000, "房租"));
    list.push(mk("comm", y, m, 8 % days || 8, 999, "中華電信月租"));
    list.push(mk("fun", y, m, 2, 390, "Netflix + Spotify"));
  });

  function mk(catId, y, m, d, amount, forceNote) {
    const note = forceNote || pick(MERCHANTS[catId] || ["記錄"]);
    return {
      id: "t" + (id++),
      catId,
      type: CAT_MAP[catId].type,
      amount: Math.round(amount),
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      note,
    };
  }
  // sort desc by date
  return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

const SAMPLE_TX = genTransactions();

// monthly budgets per expense category (NT$)
const DEFAULT_BUDGETS = {
  food: 9000, transit: 2500, shop: 4000, home: 18000, fun: 2000,
  health: 1500, edu: 2000, travel: 3000, comm: 1200, other: 1500,
};

// ---------- helpers ----------
const fmtNTD = (n) => "NT$" + Math.round(Math.abs(n)).toLocaleString("en-US");
const fmtSigned = (n) => (n < 0 ? "-" : "+") + fmtNTD(n);
const fmtCompact = (n) => {
  const a = Math.abs(n);
  if (a >= 10000) return "NT$" + (n / 10000).toFixed(a >= 100000 ? 0 : 1) + "萬";
  return fmtNTD(n);
};
const monthKey = (dateStr) => dateStr.slice(0, 7);            // "2026-06"
const yearKey = (dateStr) => dateStr.slice(0, 4);
const labelMonth = (key) => { const [y, m] = key.split("-"); return `${y} 年 ${parseInt(m)} 月`; };
const shortMonth = (key) => `${parseInt(key.split("-")[1])}月`;
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const fmtDateLong = (s) => {
  const d = new Date(s + "T00:00:00");
  return `${parseInt(s.slice(5, 7))}/${parseInt(s.slice(8, 10))} 週${WEEKDAYS[d.getDay()]}`;
};
const todayISO = "2026-06-07";

function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function groupSum(txs, keyFn) {
  const out = {};
  txs.forEach(t => { const k = keyFn(t); out[k] = (out[k] || 0) + t.amount; });
  return out;
}

// list of month keys present in data, descending
function monthsInData(txs) {
  const set = new Set(txs.map(t => monthKey(t.date)));
  return [...set].sort().reverse();
}

const THEMES = [
  { id: "midnight", name: "午夜藍", dot: "#38bdf8", bg: "#0a1020" },
  { id: "carbon",   name: "石墨黑", dot: "#f0b429", bg: "#0c0c0e" },
  { id: "slate",    name: "鋼藍灰", dot: "#a78bfa", bg: "#0f141b" },
];

Object.assign(window, {
  CATEGORIES, CAT_MAP, EXPENSE_CATS, INCOME_CATS,
  SAMPLE_TX, DEFAULT_BUDGETS, THEMES,
  fmtNTD, fmtSigned, fmtCompact, monthKey, yearKey, labelMonth, shortMonth,
  fmtDateLong, todayISO, sum, groupSum, monthsInData, WEEKDAYS,
});

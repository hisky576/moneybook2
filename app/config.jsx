// ============================================================
// config.jsx — Supabase 連線設定
// ------------------------------------------------------------
// 兩個值都留空 = 本機模式(資料只存這台瀏覽器)。
// 填上 Supabase 資訊 = 雲端同步(跨裝置)。
//   取得:Supabase 專案 → Settings → API
// ============================================================

const SUPABASE_URL = "https://pvdiwbmavokahupyjcca.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZGl3Ym1hdm9rYWh1cHlqY2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDE0MTgsImV4cCI6MjA5NjM3NzQxOH0.7texsOObmDHgbu6NZurOtHMdGRyWL-FMppkVwKgWhL8";

// ---- 登入方式 ----
//   "none"  = 不登入,所有裝置共用同一份帳本(適合自己一個人用)
//   "email" = Email 免密碼登入,每個帳號各自獨立、真正私密
const LOGIN_MODE = "none";

// ---- 通行碼(僅 LOGIN_MODE = "none" 時有效)----
//   留空 = 打開網址直接進入。
//   填字串(例如 "1234")= 進入前要先輸入這組碼,擋掉一般路人。
const PASSCODE = "";

const CLOUD_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

Object.assign(window, { SUPABASE_URL, SUPABASE_ANON_KEY, CLOUD_ENABLED, LOGIN_MODE, PASSCODE });

// ============================================================
// config.jsx — Supabase 連線設定
// ------------------------------------------------------------
// 想開啟「跨裝置雲端同步」,把下面兩個值填上你的 Supabase 專案資訊。
// 兩個都留空 = 本機模式(資料只存這台瀏覽器,不需登入)。
//
// 取得方式:Supabase 專案 → Settings → API
//   Project URL  → 貼到 SUPABASE_URL
//   anon public  → 貼到 SUPABASE_ANON_KEY
// ============================================================

const SUPABASE_URL = "https://pvdiwbmavokahupyjcca.supabase.co";        // 例如 "https://xxxxxxxx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZGl3Ym1hdm9rYWh1cHlqY2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDE0MTgsImV4cCI6MjA5NjM3NzQxOH0.7texsOObmDHgbu6NZurOtHMdGRyWL-FMppkVwKgWhL8";   // 例如 "eyJhbGciOiJI..."

const CLOUD_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

Object.assign(window, { SUPABASE_URL, SUPABASE_ANON_KEY, CLOUD_ENABLED });

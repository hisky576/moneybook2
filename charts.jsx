// ============================================================
// charts.jsx — SVG charts (donut, grouped bars, area trend)
// ============================================================
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

// ---------- Donut ----------
function Donut({ data, size = 188, thickness = 22, centerTop, centerMain, centerSub }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const gap = data.length > 1 ? 2 : 0; // px gap between segments
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke: "var(--surface-2)" }} strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = Math.max(frac * C - gap, 0);
          const off = -acc * C;
          acc += frac;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
              style={{ stroke: d.color, transition: "stroke-dasharray .7s cubic-bezier(.4,0,.2,1)" }}
              strokeWidth={thickness} strokeLinecap="butt"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off} />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2 }}>
        {centerTop && <div style={{ fontSize: 11.5, color: "var(--text-faint)", letterSpacing: ".05em" }}>{centerTop}</div>}
        <div className="num" style={{ fontSize: 23, fontWeight: 600, color: "var(--text)" }}>{centerMain}</div>
        {centerSub && <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{centerSub}</div>}
      </div>
    </div>
  );
}

// ---------- Grouped bars: income vs expense per month ----------
function GroupedBars({ months, income, expense, height = 220 }) {
  const max = Math.max(1, ...income, ...expense);
  const niceMax = niceCeil(max);
  const ticks = 4;
  const padL = 52, padB = 26, padT = 8;
  const W = 100, H = height;
  const innerW = W; // we use flex columns instead of pure svg for crispness
  return (
    <div style={{ display: "flex", gap: 10, height }}>
      {/* y axis */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between",
        paddingBottom: padB, paddingTop: padT, width: 46, textAlign: "right" }}>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = niceMax * (1 - i / ticks);
          return <div key={i} className="num" style={{ fontSize: 10, color: "var(--text-faint)", lineHeight: 1 }}>{shortNum(v)}</div>;
        })}
      </div>
      {/* plot */}
      <div style={{ flex: 1, position: "relative", borderLeft: "1px solid var(--border)", display: "flex", alignItems: "flex-end" }}>
        {/* gridlines */}
        {Array.from({ length: ticks + 1 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0,
            top: padT + (height - padT - padB) * (i / ticks),
            borderTop: "1px dashed var(--border)", opacity: i === ticks ? 0 : 1 }} />
        ))}
        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "space-around",
          height: "100%", paddingBottom: padB, paddingTop: padT, position: "relative", zIndex: 1 }}>
          {months.map((mk, i) => (
            <div key={mk} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: height - padT - padB }}>
                <Bar h={(income[i] / niceMax)} color="var(--income)" delay={i * 60} title={`收入 ${fmtNTD(income[i])}`} />
                <Bar h={(expense[i] / niceMax)} color="var(--expense)" delay={i * 60 + 30} title={`支出 ${fmtNTD(expense[i])}`} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{shortMonth(mk)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function Bar({ h, color, delay, title }) {
  const [grown, setGrown] = useStateC(false);
  useEffectC(() => { const t = setTimeout(() => setGrown(true), delay); return () => clearTimeout(t); }, []);
  return (
    <div title={title} style={{
      width: 16, height: `${Math.max(h * 100, h > 0 ? 1.5 : 0)}%`, minHeight: h > 0 ? 3 : 0,
      background: color, borderRadius: "4px 4px 2px 2px",
      transform: grown ? "scaleY(1)" : "scaleY(0)", transformOrigin: "bottom",
      transition: "transform .6s cubic-bezier(.34,1.2,.5,1)", opacity: .92,
    }} />
  );
}

// ---------- Area trend (net / balance) ----------
function AreaTrend({ values, labels, height = 150, color = "var(--accent)" }) {
  const w = 560, h = height, padB = 22, padT = 12, padL = 6, padR = 6;
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const span = max - min || 1;
  const n = values.length;
  const x = (i) => padL + (w - padL - padR) * (n === 1 ? 0.5 : i / (n - 1));
  const y = (v) => padT + (h - padT - padB) * (1 - (v - min) / span);
  const pts = values.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${x(n - 1)} ${h - padB} L ${x(0)} ${h - padB} Z`;
  const zeroY = y(0);
  const gid = "ag" + Math.round(min + max);
  const [drawn, setDrawn] = useStateC(false);
  useEffectC(() => { const t = setTimeout(() => setDrawn(true), 60); return () => clearTimeout(t); }, []);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {/* zero baseline */}
      <line x1={padL} x2={w - padR} y1={zeroY} y2={zeroY} style={{ stroke: "var(--border-strong)" }} strokeDasharray="3 4" />
      <path d={area} style={{ fill: `url(#${gid})`, opacity: drawn ? 1 : 0, transition: "opacity .8s ease .3s" }} />
      <path d={line} fill="none" style={{ stroke: color }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset={drawn ? 0 : 1} />
      {pts.map((p, i) => (
        <g key={i} style={{ opacity: drawn ? 1 : 0, transition: `opacity .4s ease ${0.5 + i * 0.05}s` }}>
          <circle cx={p[0]} cy={p[1]} r="3.5" style={{ fill: "var(--surface-solid)", stroke: color }} strokeWidth="2.5" />
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={h - 6} textAnchor="middle"
          style={{ fill: "var(--text-faint)", fontSize: 11, fontFamily: "var(--font-ui)" }}>{l}</text>
      ))}
    </svg>
  );
}

// inline style for animated line stroke
const trendCss = document.createElement("style");
trendCss.textContent = `svg path[stroke-dashoffset]{transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1) .1s;}`;
document.head.appendChild(trendCss);

// ---------- helpers ----------
function niceCeil(n) {
  if (n <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / mag;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * mag;
}
function shortNum(v) {
  if (v >= 10000) return (v / 10000) + "萬";
  if (v >= 1000) return (v / 1000) + "k";
  return Math.round(v);
}

Object.assign(window, { Donut, GroupedBars, AreaTrend });

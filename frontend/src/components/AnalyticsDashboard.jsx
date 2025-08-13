import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";
import { palette, yesColor, noColor, gridStroke, axisStroke, textColor } from "../theme";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  PieChart, Pie, Legend, Cell
} from "recharts";

/* Recharts tooltip styles */
const tooltipStyle = { background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-bd)", color: textColor };
const tooltipLabelStyle = { color: textColor };
const tooltipItemStyle  = { color: textColor };

/* Format helpers */
const fmtPct  = (v) => (v==null || isNaN(v) ? "n/a" : `${(v*100).toFixed(1)}%`);
const fmtPct0 = (v) => (v==null || isNaN(v) ? "n/a" : `${(v*100).toFixed(0)}%`);
const fmtCurrency = (v) => (v==null || isNaN(v) ? "n/a" : Intl.NumberFormat(undefined, { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(v));
const tickProps = { fill: axisStroke, fontSize: 12 };

/* Robust field picking to avoid "Unknown" */
const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "");

/* Extract first number from labels like "0-1", "5 years", etc. */
const firstNumber = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return NaN;
};

/* Toggleable info tooltip with custom SVG icon */
function InfoTip() {
  const [open, setOpen] = useState(false);
  return (
    <span className="infotip">
      <button className="infotip-btn" aria-label="How attrition is calculated" onClick={() => setOpen(v => !v)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="8" r="1.6" fill="currentColor" />
          <path d="M12 11v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="infotip-pop">
          <div className="infotip-title">How attrition is calculated</div>
          <div className="infotip-body">
            Attrition rate = <b>count(Attrition = “Yes”)</b> ÷ <b>total employees</b>. Example: <b>0.16 ≈ 16%</b> of employees left.
          </div>
          <div className="infotip-arrow" />
        </div>
      )}
    </span>
  );
}

/* KPI bubble */
function KPI({ label, value, hint }) {
  return (
    <div className="kpi">
      <h4>{label}</h4>
      <div className="val">{value ?? "—"}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

/* Custom tooltip for Income per Role (box-like stacked bar) */
function IncomeTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload; // we stuffed the original quantiles on each row
  return (
    <div style={{ ...tooltipStyle, padding: 10, borderRadius: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div>Max : {fmtCurrency(d.max)}</div>
      <div>Q3  : {fmtCurrency(d.q3)}</div>
      <div>Median : {fmtCurrency(d.median)}</div>
      <div>Q1  : {fmtCurrency(d.q1)}</div>
      <div>Min : {fmtCurrency(d.min)}</div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  // datasets
  const [summary, setSummary] = useState(null);

  const [dept, setDept] = useState([]);
  const [role, setRole] = useState([]);
  const [edu, setEdu] = useState([]);
  const [travel, setTravel] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [deptOT, setDeptOT] = useState([]);

  const [ageHist, setAgeHist] = useState([]);
  const [tenure, setTenure] = useState([]);
  const [scatter, setScatter] = useState([]);
  const [corrs, setCorrs] = useState([]);
  const [gender, setGender] = useState([]);

  // income box stats endpoint (min/q1/median/q3/max per role)
  const [boxIncome, setBoxIncome] = useState([]);

  const [err, setErr] = useState("");

  // load all concurrently
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          endpoints.summary().then(setSummary),
          endpoints.byDepartment().then(setDept),
          endpoints.byRole().then(setRole),
          endpoints.byEducationField().then(setEdu),
          endpoints.byBusinessTravel().then(setTravel),
          endpoints.byOvertime().then(setOvertime),
          endpoints.byTwoDeptOT().then(setDeptOT),
          endpoints.ageHist(12).then(setAgeHist),
          endpoints.tenure(40).then(setTenure),
          endpoints.scatter(1200).then(setScatter),
          endpoints.corrs().then(setCorrs),
          endpoints.genderPie().then(setGender),
          endpoints.boxIncome().then(setBoxIncome), // uses your existing endpoint
        ]);
        if (cancelled) return;
      } catch (e) {
        if (!cancelled) setErr(String(e?.message || e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ——— transforms & helpers ———

  // Normalize label + rate for bar charts
  const normRateRow = (d) => ({
    key: pick(d?.k1, d?.key, d?.department, d?.Department, d?.name, "Unknown"),
    attrition_rate: Number(pick(d?.attrition_rate, d?.rate, d?.value, d?.attritionRate, 0)) || 0
  });

  const deptByRateFull = useMemo(() => (dept || []).map(normRateRow)
    .sort((a,b)=> (b.attrition_rate ?? 0) - (a.attrition_rate ?? 0)), [dept]);

  const deptTop3 = useMemo(() => deptByRateFull.slice(0, 3), [deptByRateFull]);

  const roleByRate = useMemo(() => (role || []).map(normRateRow)
    .sort((a,b)=> (b.attrition_rate ?? 0) - (a.attrition_rate ?? 0)), [role]);

  // Gender pie (percent labels inside the slice)
  const genderTotal = useMemo(() => (gender || []).reduce((s,g)=>s+Number(pick(g?.n,g?.count,g?.value,0))||0,0), [gender]);
  const genderPie = useMemo(() => (gender || []).map(g => ({
    gender: pick(g?.gender, g?.k1, g?.name, "Unknown"),
    value: Number(pick(g?.n, g?.count, g?.value, 0)) || 0
  })), [gender]);

  const renderPieLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
    const RAD = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    const pct = genderTotal ? `${Math.round((value / genderTotal) * 100)}%` : "";
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>
        {pct}
      </text>
    );
  };

  // Tenure — numeric X from labels (e.g., "0-1" => 0)
  const tenureSeries = useMemo(() => {
    const raw = Array.isArray(tenure) ? tenure : [];
    return raw
      .map((d, i) => {
        const label = pick(d?.k1, d?.bin, d?.bucket, d?.label, d?.years_at_company, i);
        const xParsed = firstNumber(label);
        const x = Number.isFinite(xParsed) ? xParsed : i;
        const y = Number(pick(d?.attrition_rate, d?.rate, d?.value, 0)) || 0;
        return { x, attrition_rate: y };
      })
      .sort((a, b) => a.x - b.x);
  }, [tenure]);

  // Income per role — convert to stacked *ranges* so the total height equals `max`
  const incomeBoxData = useMemo(() => {
    const rows = Array.isArray(boxIncome) ? boxIncome : [];
    return rows.map(r => {
      const min = Number(r.min) || 0;
      const q1 = Number(r.q1) || 0;
      const median = Number(r.median) || 0;
      const q3 = Number(r.q3) || 0;
      const max = Number(r.max) || 0;

      // segments for stacking as ranges
      const seg_min = Math.max(min, 0);               // from 0 → min
      const seg_q1  = Math.max(q1 - min, 0);          // min → q1
      const seg_med = Math.max(median - q1, 0);       // q1 → median
      const seg_q3  = Math.max(q3 - median, 0);       // median → q3
      const seg_max = Math.max(max - q3, 0);          // q3 → max

      return {
        job_role: r.job_role ?? "Unknown",
        // original quantiles (for tooltip)
        min, q1, median, q3, max,
        // stacked segments (plotted)
        seg_min, seg_q1, seg_med, seg_q3, seg_max
      };
    });
  }, [boxIncome]);

  const maxIncome = useMemo(
    () => incomeBoxData.reduce((m, d) => Math.max(m, d.max || 0), 0),
    [incomeBoxData]
  );

  // Simple insights row (useful bubbles)
  const insights = useMemo(() => {
    const topDept = deptByRateFull[0];
    const lowDept = deptByRateFull[deptByRateFull.length-1];
    const topRole = roleByRate[0];
    return [
      { label: "Highest attrition by department", text: topDept ? `${topDept.key} (${fmtPct(topDept.attrition_rate)})` : "—" },
      { label: "Lowest attrition by department",  text: lowDept ? `${lowDept.key} (${fmtPct(lowDept.attrition_rate)})` : "—" },
      { label: "Role with highest attrition",     text: topRole ? `${topRole.key} (${fmtPct(topRole.attrition_rate)})` : "—" },
    ];
  }, [deptByRateFull, roleByRate]);

  return (
    <>
      <div className="container">
        <header className="header">
          <h1 className="title">CineScope Dashboard</h1>
          <p className="subtitle">
            HR ATTRITION ANALYTICS <InfoTip />
          </p>

          {/* View Source Code button with GitHub logo */}
          <div className="source inline">
            <a className="btn btn-github" href="https://github.com/RayanBhatti/CineScope" target="_blank" rel="noreferrer">
              <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" style={{marginRight:8}}>
                <path fill="currentColor" d="M8 .2a8 8 0 0 0-2.53 15.6c.4.07.55-.17.55-.38v-1.33c-2.25.49-2.73-1.08-2.73-1.08-.36-.9-.88-1.14-.88-1.14-.72-.49.06-.48.06-.48.79.06 1.2.82 1.2.82.71 1.21 1.86.86 2.31.66.07-.52.28-.86.51-1.06-1.8-.2-3.69-.9-3.69-4a3.15 3.15 0 0 1 .84-2.18c-.08-.2-.37-1.01.08-2.1 0 0 .69-.22 2.25.83a7.78 7.78 0 0 1 4.1 0c1.56-1.05 2.24-.83 2.24-.83.45 1.09.16 1.9.08 2.1.53.59.84 1.34.84 2.18 0 3.11-1.9 3.79-3.71 3.99.29.25.54.73.54 1.48v2.2c0 .21.14.46.55.38A8 8 0 0 0 8 .2Z"/>
              </svg>
              View Source Code
            </a>
          </div>
        </header>

        {/* KPIs */}
        <div className="card" style={{marginBottom:14}}>
          <div className="card-head" style={{paddingBottom:"0.5rem"}}><h3>Overview</h3></div>
          <div className="card-body">
            <div className="kpis">
              <KPI label="Employees" value={summary?.n_total} />
              <KPI label="Left" value={summary?.n_left} />
              <KPI label="Attrition rate" value={summary ? `${(summary.attrition_rate*100).toFixed(1)}%` : "—"} hint="Dataset-wide" />
            </div>
          </div>
        </div>

        {/* Key Insights — row of bubbles */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head"><h3>Key Insights</h3></div>
          <div className="card-body">
            <div className="insights-row">
              {insights.map((ins, i) => (
                <div key={i} className="insight-bubble">
                  <div className="insight-label">{ins.label}</div>
                  <div className="insight-text">{ins.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Attrition by Job Role (full width) ===== */}
        <div className="card" style={{gridColumn:"1 / -1", marginBottom:12}}>
          <div className="card-head"><h3>Attrition by Job Role</h3></div>
          <div className="card-body scroll-y" style={{height:520}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleByRate} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal vertical={false}/>
                <XAxis type="number" stroke={axisStroke} tick={tickProps} />
                <YAxis dataKey="key" type="category" stroke={axisStroke} width={260} tick={tickProps} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "rgba(255,255,255,0.08)" }} formatter={(v)=>fmtPct(v)} />
                <Bar dataKey="attrition_rate">
                  {roleByRate.map((_,i)=>(<Cell key={i} fill={palette[(i+2)%palette.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ===== Gender Split (left) + Top 3 Departments by Attrition (right) ===== */}
        <div className="grid-two" style={{marginBottom:12}}>
          {/* Gender split */}
          <div className="card">
            <div className="card-head"><h3>Gender Split</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Legend />
                  <Pie
                    data={genderPie}
                    dataKey="value"
                    nameKey="gender"
                    outerRadius={120}
                    label={renderPieLabel}
                  >
                    {genderPie.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 3 Departments by Attrition */}
          <div className="card">
            <div className="card-head"><h3>Top 3 Departments by Attrition</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptTop3}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} tick={tickProps} />
                  <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={fmtPct0} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "rgba(255,255,255,0.08)" }} formatter={(v)=>fmtPct(v)} />
                  <Legend />
                  <Bar dataKey="attrition_rate">
                    {deptTop3.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ===== Remaining small charts row ===== */}
        <div className="grid three">
          {/* Age Distribution (bins) */}
          <div className="card">
            <div className="card-head"><h3>Age Distribution (bins)</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ageHist}>
                  <defs>
                    <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette[2]} stopOpacity="0.9"/>
                      <stop offset="100%" stopColor={palette[2]} stopOpacity="0.15"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="k1" stroke={axisStroke} tick={tickProps} />
                  <YAxis stroke={axisStroke} tick={tickProps} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Area dataKey="count" stroke={palette[2]} fill="url(#ageGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attrition vs Tenure — numeric axis */}
          <div className="card">
            <div className="card-head"><h3>Attrition vs Tenure (Years at Company)</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tenureSeries}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    stroke={axisStroke}
                    tick={tickProps}
                    domain={['dataMin', 'dataMax']}
                    allowDecimals={false}
                    tickFormatter={(v) => String(Math.round(v))}
                  />
                  <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={fmtPct0} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(v) => fmtPct(v)}
                    labelFormatter={(v) => `Years: ${Math.round(v)}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="attrition_rate" stroke={palette[6]} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Income per Role (box/whisker as stacked ranges) */}
          <div className="card">
            <div className="card-head"><h3>Income per Role (Min • Q1 • Median • Q3 • Max)</h3></div>
            <div className="card-body" style={{height:280}}>
              {incomeBoxData.length === 0 ? (
                <div className="empty-msg">No income spread data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeBoxData}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="job_role" stroke={axisStroke} tick={tickProps} />
                    <YAxis
                      stroke={axisStroke}
                      tick={tickProps}
                      tickFormatter={(v)=>Intl.NumberFormat().format(v)}
                      domain={[0, maxIncome]}
                    />
                    {/* Custom tooltip showing Max→...→Min (flipped order) with the correct quantiles */}
                    <Tooltip content={<IncomeTooltip />} />
                    <Legend />
                    {/* stack *ranges* so total = max */}
                    <Bar dataKey="seg_min" stackId="spread" name="min"    fill={palette[0]} />
                    <Bar dataKey="seg_q1"  stackId="spread" name="q1"     fill={palette[1]} />
                    <Bar dataKey="seg_med" stackId="spread" name="median" fill={palette[2]} />
                    <Bar dataKey="seg_q3"  stackId="spread" name="q3"     fill={palette[3]} />
                    <Bar dataKey="seg_max" stackId="spread" name="max"    fill={palette[4]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Scatter: Age vs Monthly Income (full width) */}
        <div className="card" style={{gridColumn:"1 / -1", marginTop:12}}>
          <div className="card-head"><h3>Age vs Monthly Income (colored by attrition)</h3></div>
          <div className="card-body" style={{height:420}}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="age" stroke={axisStroke} tick={tickProps} domain={[15, 'dataMax']} />
                <YAxis type="number" dataKey="monthly_income" stroke={axisStroke} tick={tickProps} />
                <ZAxis type="category" dataKey="left_flag" range={[70,70]} />
                <Tooltip contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ fill: "rgba(255,255,255,0.08)" }}
                  formatter={(v, name)=>[name==="monthly_income"?fmtCurrency(v):v, name==="monthly_income"?"Monthly Income":name==="age"?"Age":"Left?"]} />
                <Legend />
                <Scatter data={scatter.filter(d=>d.left_flag===1)} name="Left" fill={yesColor} />
                <Scatter data={scatter.filter(d=>d.left_flag===0)} name="Stayed" fill={noColor} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Correlations — horizontal bar viz */}
        <div className="card" style={{marginTop:12}}>
          <div className="card-head"><h3>Correlation with Attrition (Yes=1, No=0)</h3></div>
          <div className="card-body" style={{height:420}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...(corrs||[])].sort((a,b)=>Math.abs(b.corr||0)-Math.abs(a.corr||0))} layout="vertical" margin={{ left: 160 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal vertical={false}/>
                <XAxis type="number" stroke={axisStroke} tick={tickProps} domain={[-1,1]} />
                <YAxis type="category" dataKey="feature" stroke={axisStroke} width={150} tick={tickProps} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  formatter={(v)=>[v?.toFixed(3) ?? "n/a", "Correlation"]} />
                <Bar dataKey="corr">
                  {[...(corrs||[])].sort((a,b)=>Math.abs(b.corr||0)-Math.abs(a.corr||0)).map((d,i)=>(
                    <Cell key={i} fill={(d.corr??0)>=0 ? yesColor : noColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <footer className="footer">
        © 2025 Rayan Bhatti — All rights reserved.
      </footer>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";
import { palette, yesColor, noColor, gridStroke, axisStroke, textColor } from "../theme";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
  PieChart, Pie, Legend, Cell
} from "recharts";
import { FaGithub } from "react-icons/fa";

const tooltipStyle = { background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-bd)", color: textColor };
const tooltipLabelStyle = { color: textColor };
const tooltipItemStyle  = { color: textColor };
const fmtPct  = (v) => (v==null || isNaN(v) ? "n/a" : `${(v*100).toFixed(1)}%`);
const fmtPct0 = (v) => (v==null || isNaN(v) ? "n/a" : `${(v*100).toFixed(0)}%`);
const fmtCurrency = (v) => (v==null || isNaN(v) ? "n/a" : Intl.NumberFormat(undefined, { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(v));
const tickProps = { fill: axisStroke, fontSize: 12 };
const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "");

/* Info tooltip */
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
            Attrition rate = <b>count(Attrition = “Yes”)</b> ÷ <b>total employees</b>. Example: <b>0.16 ≈ 16%</b>.
          </div>
          <div className="infotip-arrow" />
        </div>
      )}
    </span>
  );
}

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
  const d = payload[0].payload;
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
  const [summary, setSummary] = useState(null);
  const [dept, setDept] = useState([]);
  const [role, setRole] = useState([]);
  const [corrs, setCorrs] = useState([]);
  const [gender, setGender] = useState([]);
  const [scatter, setScatter] = useState([]);
  const [boxIncome, setBoxIncome] = useState([]);

  // Line series
  const [attrVsMinInc, setAttrVsMinInc] = useState([]);           // {min_income, attrition_rate}
  const [attrByJobSat, setAttrByJobSat] = useState([]);           // {job_satisfaction, n, attrition_rate}

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          endpoints.summary().then(setSummary),
          endpoints.byDepartment().then(setDept),
          endpoints.byRole().then(setRole),
          endpoints.corrs().then(setCorrs),
          endpoints.genderPie().then(setGender),
          endpoints.scatter(1200).then(setScatter),
          endpoints.boxIncome().then(setBoxIncome),
          endpoints.attritionVsMinIncome(30).then(setAttrVsMinInc),
          endpoints.attritionByJobSatisfaction().then(setAttrByJobSat),
        ]);
        if (cancelled) return;
      } catch (e) {
        if (!cancelled) console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const normRateRow = (d) => ({
    key: pick(d?.k1, d?.key, d?.department, d?.Department, d?.name, "Unknown"),
    attrition_rate: Number(pick(d?.attrition_rate, d?.rate, d?.value, d?.attritionRate, 0)) || 0
  });

  const deptTop3 = useMemo(
    () => (dept || []).map(normRateRow).sort((a,b)=>b.attrition_rate-a.attrition_rate).slice(0,3),
    [dept]
  );

  const roleByRate = useMemo(
    () => (role || []).map(normRateRow).sort((a,b)=>b.attrition_rate-a.attrition_rate),
    [role]
  );

  // Gender pie (with % labels)
  const genderTotal = useMemo(() => (gender || []).reduce((s,g)=>s+Number(pick(g?.n,g?.count,g?.value,0))||0,0), [gender]);
  const genderPie = useMemo(() => (gender || []).map(g => ({
    gender: pick(g?.gender, g?.k1, g?.name, "Unknown"),
    value: Number(pick(g?.n, g?.count, g?.value, 0)) || 0
  })), [gender]);

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    const RAD = Math.PI/180;
    const r = innerRadius + (outerRadius-innerRadius)*0.6;
    const x = cx + r*Math.cos(-midAngle*RAD);
    const y = cy + r*Math.sin(-midAngle*RAD);
    const pct = genderTotal ? `${Math.round((value/genderTotal)*100)}%` : "";
    return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={700}>{pct}</text>;
  };

  // Income per role -> stacked ranges so total = max
  const incomeBoxData = useMemo(() => {
    const rows = Array.isArray(boxIncome) ? boxIncome : [];
    return rows.map(r => {
      const min = +r.min||0, q1=+r.q1||0, median=+r.median||0, q3=+r.q3||0, max=+r.max||0;
      return {
        job_role: r.job_role ?? "Unknown",
        min, q1, median, q3, max,
        seg_min:min, seg_q1:Math.max(q1-min,0), seg_med:Math.max(median-q1,0),
        seg_q3:Math.max(q3-median,0), seg_max:Math.max(max-q3,0)
      };
    });
  }, [boxIncome]);
  const maxIncome = useMemo(()=>incomeBoxData.reduce((m,d)=>Math.max(m,d.max||0),0),[incomeBoxData]);

  // NEW: clean series
  const attrVsMinIncSorted = useMemo(
    () => (Array.isArray(attrVsMinInc) ? [...attrVsMinInc] : [])
            .filter(d => Number.isFinite(+d.min_income) && Number.isFinite(+d.attrition_rate))
            .sort((a,b)=> (+a.min_income) - (+b.min_income)),
    [attrVsMinInc]
  );

  const jobSatSorted = useMemo(
    () => (Array.isArray(attrByJobSat) ? [...attrByJobSat] : [])
            .filter(d => Number.isFinite(+d.job_satisfaction) && Number.isFinite(+d.attrition_rate))
            .sort((a,b)=> (+a.job_satisfaction) - (+b.job_satisfaction)),
    [attrByJobSat]
  );

  // --- Key Insights (4 bubbles) ---
  const insights = useMemo(() => {
    const overall = summary?.attrition_rate ?? null;

    const deptSorted = (dept || [])
      .map(d => ({
        key: pick(d?.k1, d?.key, d?.department, d?.Department, d?.name, "Unknown"),
        rate: Number(pick(d?.attrition_rate, d?.rate, d?.value, d?.attritionRate, 0)) || 0
      }))
      .sort((a,b)=> b.rate - a.rate);

    const roleSorted = (role || [])
      .map(d => ({
        key: pick(d?.k1, d?.key, d?.job_role, d?.Role, d?.name, "Unknown"),
        rate: Number(pick(d?.attrition_rate, d?.rate, d?.value, d?.attritionRate, 0)) || 0
      }))
      .sort((a,b)=> b.rate - a.rate);

    // gender majority (by count)
    const g = Array.isArray(gender) ? gender : [];
    const tot = g.reduce((s, x) => s + (Number(pick(x?.n, x?.count, x?.value, 0)) || 0), 0);
    const maj = g
      .map(x => ({
        label: pick(x?.gender, x?.k1, x?.name, "Unknown"),
        n: Number(pick(x?.n, x?.count, x?.value, 0)) || 0
      }))
      .sort((a,b)=> b.n - a.n)[0];
    const majPct = tot ? `${Math.round((maj?.n || 0) * 100 / tot)}%` : null;

    return [
      {
        label: "Overall attrition rate",
        text: overall != null ? `${(overall * 100).toFixed(1)}%` : "—",
      },
      {
        label: "Highest attrition department",
        text: deptSorted[0] ? `${deptSorted[0].key} (${(deptSorted[0].rate*100).toFixed(1)}%)` : "—",
      },
      {
        label: "Highest attrition role",
        text: roleSorted[0] ? `${roleSorted[0].key} (${(roleSorted[0].rate*100).toFixed(1)}%)` : "—",
      },
      {
        label: "Gender majority",
        text: maj ? `${maj.label} (${majPct ?? "—"})` : "—",
      },
    ];
  }, [summary, dept, role, gender]);

  return (
    <>
      <div className="container">
        <header className="header">
          <h1 className="title">CineScope Dashboard</h1>
          <p className="subtitle">
            HR ATTRITION ANALYTICS <InfoTip />
          </p>
          <div className="source inline">
            <a
              className="btn btn-github"
              href="https://github.com/RayanBhatti/CineScope"
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", alignItems: "center", background: "transparent", color: "#007bff" }}
            >
              <FaGithub size={32} style={{ marginRight: 8,color: "#007bff" }} />
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

        {/* Key Insights */}
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

        {/* Attrition by Job Role (full width) */}
        <div className="card" style={{gridColumn:"1 / -1", marginBottom:12}}>
          <div className="card-head"><h3>Attrition by Job Role</h3></div>
          <div className="card-body" style={{height:520, overflowY:"auto", paddingRight:6}}>
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

        {/* Gender + Dept top 3 */}
        <div className="grid-two" style={{marginBottom:12}}>
          <div className="card">
            <div className="card-head"><h3>Gender Split</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Legend />
                  <Pie data={genderPie} dataKey="value" nameKey="gender" outerRadius={120} label={renderPieLabel}>
                    {genderPie.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Top 3 Departments by Attrition</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptTop3}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} tick={tickProps} />
                  <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={fmtPct0} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v)=>fmtPct(v)} />
                  <Legend />
                  <Bar dataKey="attrition_rate">
                    {deptTop3.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Three-up row: 1) Attrition vs Min Income, 2) Attrition vs Job Satisfaction, 3) Income per Role */}
        <div className="grid three">
          {/* 1) Attrition vs Minimum Income */}
          <div className="card">
            <div className="card-head"><h3>Attrition vs Minimum Income</h3></div>
            <div className="card-body" style={{height:280}}>
              {attrVsMinIncSorted.length === 0 ? (
                <div className="empty-msg">No data returned from /api/line/attrition_vs_min_income.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attrVsMinIncSorted}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                    <XAxis dataKey="min_income" stroke={axisStroke} tick={tickProps}
                           tickFormatter={(v)=>Intl.NumberFormat().format(v)} />
                    <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={fmtPct0} domain={[0, 'dataMax']} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                      formatter={(v, n)=> n==="attrition_rate" ? fmtPct(v) : fmtCurrency(v)}
                      labelFormatter={(v)=>`Min income: ${fmtCurrency(v)}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="attrition_rate" stroke={palette[6]} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 2) NEW: Attrition vs Job Satisfaction */}
          <div className="card">
            <div className="card-head"><h3>Attrition vs Job Satisfaction</h3></div>
            <div className="card-body" style={{height:280}}>
              {jobSatSorted.length === 0 ? (
                <div className="empty-msg">No data returned from /api/line/attrition_by_job_satisfaction.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={jobSatSorted}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="job_satisfaction"
                      stroke={axisStroke}
                      tick={tickProps}
                      ticks={[1,2,3,4]}
                      tickFormatter={(v)=>({1:"1 (Low)",2:"2",3:"3",4:"4 (High)"}[v] ?? v)}
                    />
                    <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={fmtPct0} domain={[0, 'dataMax']} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                      formatter={(v, n)=> n==="attrition_rate" ? fmtPct(v) : v}
                      labelFormatter={(v)=>`Job satisfaction: ${v}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="attrition_rate" stroke={palette[5]} dot />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 3) Income per Role (box/whisker as stacked ranges) */}
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
                    <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={(v)=>Intl.NumberFormat().format(v)} domain={[0, maxIncome]} />
                    <Tooltip content={<IncomeTooltip />} />
                    <Legend />
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

        {/* Scatter: Age vs Monthly Income */}
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

        {/* Correlations */}
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

      <footer className="footer">© 2025 Rayan Bhatti — All rights reserved.</footer>
    </>
  );
}

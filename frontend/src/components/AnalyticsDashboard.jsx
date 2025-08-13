import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";
import { palette, yesColor, noColor, gridStroke, axisStroke, textColor } from "../theme";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  PieChart, Pie, Legend, Cell
} from "recharts";

/* Readable tooltip style */
const tooltipStyle = { background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-bd)", color: textColor };
const tooltipLabelStyle = { color: textColor };
const tooltipItemStyle  = { color: textColor };

/* Format helpers */
const fmtPct = (v) => (v==null || isNaN(v) ? "n/a" : `${(v*100).toFixed(1)}%`);
const fmtPct0 = (v) => (v==null || isNaN(v) ? "n/a" : `${(v*100).toFixed(0)}%`);
const fmtCurrency = (v) => (v==null || isNaN(v) ? "n/a" : Intl.NumberFormat(undefined, { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(v));
const tickProps = { fill: axisStroke, fontSize: 12 };

/* Robust field picking (prevents "Unknown" when API uses different keys) */
const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "");

/* KPI (inline) */
function KPI({ label, value, hint }) {
  return (
    <div className="kpi">
      <h4>{label}</h4>
      <div className="val">{value ?? "—"}</div>
      {hint ? <div className="hint">{hint}</div> : null}
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
  const [incHist, setIncHist] = useState([]);
  const [tenure, setTenure] = useState([]);
  const [scatter, setScatter] = useState([]);
  const [corrs, setCorrs] = useState([]);
  const [gender, setGender] = useState([]);

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
          endpoints.incomeHist(25).then(setIncHist),
          endpoints.tenure(40).then(setTenure),
          endpoints.scatter(1200).then(setScatter),
          endpoints.corrs().then(setCorrs),
          endpoints.genderPie().then(setGender) // correct API call
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
    key: pick(d?.k1, d?.department, d?.Department, d?.name, d?.key, "Unknown"),
    attrition_rate: Number(pick(d?.attrition_rate, d?.rate, d?.value, d?.attritionRate, 0)) || 0
  });

  const deptByRate = useMemo(() => (dept || []).map(normRateRow)
    .sort((a,b)=> (b.attrition_rate ?? 0) - (a.attrition_rate ?? 0)), [dept]);

  const roleByRate = useMemo(() => (role || []).map(normRateRow)
    .sort((a,b)=> (b.attrition_rate ?? 0) - (a.attrition_rate ?? 0)), [role]);

  const eduByRate = useMemo(() => (edu || []).map(normRateRow)
    .sort((a,b)=> (b.attrition_rate ?? 0) - (a.attrition_rate ?? 0)), [edu]);

  const travelByRate = useMemo(() => (travel || []).map(normRateRow)
    .sort((a,b)=> (b.attrition_rate ?? 0) - (a.attrition_rate ?? 0)), [travel]);

  // Department × Overtime pivot (kept if used elsewhere)
  const deptOvertimePivot = useMemo(() => {
    const by = {};
    for (const r of (deptOT || [])) {
      const k = pick(r?.k1, r?.department, r?.Department, r?.name, r?.key, "Unknown");
      const ot = pick(r?.k2, r?.overtime, r?.Overtime, "Unknown");
      by[k] ||= { department: k, Yes: 0, No: 0 };
      by[k][ot] = Number(pick(r?.attrition_rate, r?.rate, r?.value, 0)) || 0;
    }
    return Object.values(by);
  }, [deptOT]);

  // Gender pie
  const genderPie = useMemo(() => (gender || []).map(g => ({
    gender: pick(g?.gender, g?.k1, g?.name, "Unknown"),
    value: Number(pick(g?.count, g?.value, g?.n, 0)) || 0
  })), [gender]);

  // Age/Income histograms (bin label may be k1|bin|bucket|label)
  const ageHistNorm = useMemo(() => (ageHist || []).map(d => ({
    k1: pick(d?.k1, d?.bin, d?.bucket, d?.label, ""),
    count: Number(pick(d?.count, d?.n, d?.value, 0)) || 0
  })), [ageHist]);

  const incHistNorm = useMemo(() => (incHist || []).map(d => ({
    k1: pick(d?.k1, d?.bin, d?.bucket, d?.label, ""),
    count: Number(pick(d?.count, d?.n, d?.value, 0)) || 0
  })), [incHist]);

  // Tenure line (x may be k1|bin|bucket|label; y may be attrition_rate|rate|value)
  const tenureSeries = useMemo(() => (tenure || []).map(d => ({
    k1: pick(d?.k1, d?.bin, d?.bucket, d?.label, ""),
    attrition_rate: Number(pick(d?.attrition_rate, d?.rate, d?.value, 0)) || 0
  })), [tenure]);

  // Scatter: ensure existence
  const scatterData = useMemo(() => (scatter || []).map(s => ({
    age: Number(pick(s?.age, s?.k1, s?.x, 0)) || 0,
    monthly_income: Number(pick(s?.monthly_income, s?.income, s?.y, 0)) || 0,
    left_flag: Number(pick(s?.left_flag, s?.left, s?.attrition, 0)) || 0
  })), [scatter]);

  // Insights
  const insights = useMemo(() => {
    const topDept = deptByRate[0];
    const lowDept = deptByRate[deptByRate.length-1];
    const topRole = roleByRate[0];

    const incomeCorr = (corrs || []).find(c => pick(c?.feature, c?.name) === "monthly_income");
    const corrVal = incomeCorr?.corr ?? incomeCorr?.value ?? null;

    const incomeText = (() => {
      if (corrVal == null) return "Higher salaries show little direct correlation with attrition in this dataset.";
      const strength = Math.abs(corrVal);
      const dir = corrVal > 0 ? "increase" : "decrease";
      const descr = strength >= 0.3 ? "a strong" : strength >= 0.15 ? "a moderate" : "a weak";
      return `Monthly income shows ${descr} ${dir} in attrition (corr=${corrVal.toFixed(2)}).`;
    })();

    return [
      { label: "Highest attrition by department", text: topDept ? `${topDept.key} (${fmtPct(topDept.attrition_rate)})` : "—" },
      { label: "Lowest attrition by department",  text: lowDept ? `${lowDept.key} (${fmtPct(lowDept.attrition_rate)})` : "—" },
      { label: "Role with highest attrition",     text: topRole ? `${topRole.key} (${fmtPct(topRole.attrition_rate)})` : "—" },
      { label: "Income & attrition",              text: incomeText }
    ];
  }, [deptByRate, roleByRate, corrs]);

  return (
    <>
      <div className="container">
        <header className="header">
          <h1 className="title">CineScope Dashboard</h1>
          <p className="subtitle">HR ATTRITION ANALYTICS</p>
        </header>

        {/* Explanation */}
        <div className="card" style={{marginBottom:14}}>
          <div className="card-head" style={{paddingBottom:"0.5rem"}}><h3>How attrition is calculated</h3></div>
          <div className="card-body">
            <p className="hint" style={{margin:0}}>
              Attrition rate here is the share of employees with <strong>Attrition = "Yes"</strong> divided by <strong>total employees</strong>.
              A value of 0.16 means roughly 16% of employees in this dataset left their roles.
            </p>
          </div>
        </div>

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

        {/* ===== Attrition by Job Role (full width) ===== */}
        <div className="card" style={{gridColumn:"1 / -1", marginBottom:12}}>
          <div className="card-head"><h3>Attrition by Job Role</h3></div>
          <div className="card-body scroll-y" style={{height:520}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleByRate} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={true} vertical={false}/>
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

        {/* ===== Gender Split (left) + Attrition by Department (right) ===== */}
        <div className="grid-two" style={{marginBottom:12}}>
          {/* Gender split */}
          <div className="card">
            <div className="card-head"><h3>Gender Split</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Legend />
                  <Pie data={genderPie} dataKey="value" nameKey="gender" outerRadius={120} label>
                    {genderPie.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attrition by Department */}
          <div className="card">
            <div className="card-head"><h3>Attrition by Department</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptByRate}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} tick={tickProps} />
                  <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={fmtPct0} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "rgba(255,255,255,0.08)" }} formatter={(v)=>fmtPct(v)} />
                  <Legend />
                  <Bar dataKey="attrition_rate">
                    {deptByRate.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
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
                <AreaChart data={ageHistNorm}>
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

          {/* Attrition vs Tenure */}
          <div className="card">
            <div className="card-head"><h3>Attrition vs Tenure (Years at Company)</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tenureSeries}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="k1" stroke={axisStroke} tick={tickProps} />
                  <YAxis stroke={axisStroke} tick={tickProps} tickFormatter={fmtPct0} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v)=>fmtPct(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="attrition_rate" stroke={palette[6]} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Income Distribution (bins) */}
          <div className="card">
            <div className="card-head"><h3>Monthly Income Distribution (bins)</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incHistNorm}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette[4]} stopOpacity="0.9"/>
                      <stop offset="100%" stopColor={palette[4]} stopOpacity="0.15"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="k1" stroke={axisStroke} tick={tickProps} />
                  <YAxis stroke={axisStroke} tick={tickProps} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Area dataKey="count" stroke={palette[4]} fill="url(#incGrad)" />
                </AreaChart>
              </ResponsiveContainer>
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
                <Scatter data={scatterData.filter(d=>d.left_flag===1)} name="Left" fill={yesColor} />
                <Scatter data={scatterData.filter(d=>d.left_flag===0)} name="Stayed" fill={noColor} />
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
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={true} vertical={false}/>
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

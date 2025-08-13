import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";
import { palette, yesColor, noColor, gridStroke, axisStroke, textColor } from "../theme";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Legend, Cell
} from "recharts";

/* Readable tooltip style */
const tooltipStyle = { background: "var(--tooltip-bg)", border: "1px solid var(--tooltip-bd)", color: textColor };

/* KPI component (light inline to keep file self-contained) */
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
  const [radar, setRadar] = useState([]);
  const [corrs, setCorrs] = useState([]);
  const [boxIncome, setBoxIncome] = useState([]);
  const [gender, setGender] = useState([]);

  const [err, setErr] = useState("");

  // load all concurrently
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tasks = [
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
          endpoints.radar().then(setRadar),
          endpoints.corrs().then(setCorrs),
          endpoints.boxIncome().then(setBoxIncome),
          endpoints.genderPie().then(setGender),
        ];
        const res = await Promise.allSettled(tasks);
        const firstErr = res.find(r => r.status === "rejected");
        if (firstErr && !cancelled) setErr(String(firstErr.reason));
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // derived, ordered datasets
  const deptByRate = useMemo(() => [...dept].sort((a,b)=> (b.attrition_rate??0)-(a.attrition_rate??0)), [dept]);
  const roleByRate = useMemo(() => [...role].sort((a,b)=> (b.attrition_rate??0)-(a.attrition_rate??0)), [role]);
  const eduByCount = useMemo(() => [...edu].sort((a,b)=> (b.n??0)-(a.n??0)), [edu]);
  const travelByCount = useMemo(() => [...travel].sort((a,b)=> (b.n??0)-(a.n??0)), [travel]);
  const overtimeByCount = useMemo(() => [...overtime].sort((a,b)=> (b.n??0)-(a.n??0)), [overtime]);

  // department × overtime pivot
  const deptOvertimePivot = useMemo(() => {
    const by = {};
    for (const r of deptOT) {
      const k = r.k1 || "Unknown";
      const ot = r.k2 || "Unknown";
      by[k] ||= { department: k, Yes: 0, No: 0 };
      by[k][ot] = r.attrition_rate;
    }
    return Object.values(by);
  }, [deptOT]);

  // intelligent insights
  const insights = useMemo(() => {
    const topDept = deptByRate.slice(0,1)[0];
    const lowDept = deptByRate.slice(-1)[0];
    const topRole = roleByRate.slice(0,1)[0];
    const otYes = overtimeByCount.find(d=>d.key==="Yes");
    const otNo  = overtimeByCount.find(d=>d.key==="No");
    const otDelta = otYes && otNo ? (otYes.attrition_rate - otNo.attrition_rate) : null;

    // income skew: where most employees cluster
    const incPeak = [...incHist].sort((a,b)=> (b.n??0)-(a.n??0))[0];

    // tenure: early exits?
    const early = tenure.find(t => t.years_at_company === 0 || t.years_at_company === 1);

    return [
      {
        label: "Department risk",
        text: topDept
          ? `${topDept.key} shows the highest attrition rate at about ${(topDept.attrition_rate*100).toFixed(1)}%. ${lowDept ? `${lowDept.key} is the lowest.` : ""}`
          : "Department-level rates are similar in this dataset."
      },
      {
        label: "Role sensitivity",
        text: topRole
          ? `The role ${topRole.key} has the highest attrition rate around ${(topRole.attrition_rate*100).toFixed(1)}%.`
          : "Role-level differences are limited in this dataset."
      },
      {
        label: "Impact of overtime",
        text: otDelta!=null
          ? `Employees reporting overtime have a higher attrition rate by approximately ${(otDelta*100).toFixed(1)} percentage points.`
          : "No strong overtime signal detected."
      },
      {
        label: "Income distribution",
        text: incPeak
          ? `Employee incomes concentrate around bucket ${incPeak.bucket} with ${incPeak.n} employees; attrition exists across bands.`
          : "Income spread appears even across buckets."
      },
      {
        label: "Tenure pattern",
        text: early
          ? `Attrition risk is highest in the early years at the company and tends to taper with tenure.`
          : "Attrition risk by tenure is stable across years."
      }
    ];
  }, [deptByRate, roleByRate, overtimeByCount, incHist, tenure]);

  if (err) {
    return <pre className="card" style={{padding:16, whiteSpace:"pre-wrap", color:"#ffb4b4"}}>{err}</pre>;
  }

  return (
    <>
      {/* Title + subheading + source code button */}
      <header className="header">
        <h1 className="title">CineScope Dashboard</h1>
        <p className="subtitle">HR ATTRITION ANALYTICS</p>
        <div className="source">
          <a className="link" href="https://github.com/RayanBhatti/CineScope" target="_blank" rel="noreferrer">View Source Code</a>
        </div>
      </header>

      {/* Explanation */}
      <div className="container">
        <div className="card" style={{marginBottom:14}}>
          <div className="card-head"><h3>How attrition is calculated</h3></div>
          <div className="card-body">
            <p className="hint" style={{fontSize:14, color:"#d7dcf0"}}>
              Attrition rate is defined as the share of employees who left the company:
              <strong> number of employees with Attrition = "Yes" divided by total employees</strong>.
              A value of 0.16 means roughly 16% of employees in this dataset left their roles.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="card" style={{marginBottom:14}}>
          <div className="card-head"><h3>Overview</h3></div>
          <div className="card-body">
            <div className="kpis">
              <KPI label="Employees" value={summary?.n_total} />
              <KPI label="Left" value={summary?.n_left} />
              <KPI label="Attrition rate" value={summary ? `${(summary.attrition_rate*100).toFixed(1)}%` : "—"} hint="Dataset-wide" />
            </div>
          </div>
        </div>

        {/* Professional insights */}
        <div className="card" style={{marginBottom:14}}>
          <div className="card-head"><h3>Key insights</h3></div>
          <div className="card-body">
            <div className="insights">
              {insights.map((it, idx)=>(
                <div key={idx} className="insight">
                  <div className="label">{it.label}</div>
                  <div className="text">{it.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dense grid of visuals */}
        <div className="grid">
          {/* Departments (all) */}
          <div className="card">
            <div className="card-head"><h3>Attrition by Department</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptByRate}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {deptByRate.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Roles (all; vertical axis so nothing is clipped; ordered by rate) */}
          <div className="card">
            <div className="card-head"><h3>Attrition by Job Role</h3></div>
            <div className="card-body scroll-y" style={{height:520}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleByRate} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={true} vertical={false}/>
                  <XAxis type="number" stroke={axisStroke} />
                  <YAxis dataKey="key" type="category" stroke={axisStroke} width={220} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {roleByRate.map((_,i)=>(<Cell key={i} fill={palette[(i+2)%palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Age distribution */}
          <div className="card">
            <div className="card-head"><h3>Age Distribution (bins)</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ageHist}>
                  <defs>
                    <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette[0]} stopOpacity="0.9"/>
                      <stop offset="100%" stopColor={palette[0]} stopOpacity="0.15"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="n" fill="url(#ageGrad)" stroke={palette[0]} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tenure curve */}
          <div className="card">
            <div className="card-head"><h3>Attrition vs Tenure (Years at Company)</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tenure}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="years_at_company" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line dataKey="attrition_rate" dot={false} stroke={palette[6]} strokeWidth={2.2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dept × Overtime */}
          <div className="card">
            <div className="card-head"><h3>Attrition rate by Department × Overtime</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptOvertimePivot}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="department" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="Yes" stackId="a" fill={yesColor} />
                  <Bar dataKey="No"  stackId="a" fill={noColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly income distribution */}
          <div className="card">
            <div className="card-head"><h3>Monthly Income Distribution (bins)</h3></div>
            <div className="card-body" style={{height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incHist}>
                  <defs>
                    <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette[5]} stopOpacity="0.9"/>
                      <stop offset="100%" stopColor={palette[5]} stopOpacity="0.15"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="n" fill="url(#incGrad)" stroke={palette[5]} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gender split */}
          <div className="card">
            <div className="card-head"><h3>Gender Split</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Pie data={gender} dataKey="n" nameKey="gender" outerRadius={120} label>
                    {gender.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scatter */}
          <div className="card" style={{gridColumn:"1 / -1"}}>
            <div className="card-head"><h3>Age vs Monthly Income (colored by attrition)</h3></div>
            <div className="card-body" style={{height:420}}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="age" stroke={axisStroke} />
                  <YAxis type="number" dataKey="monthly_income" stroke={axisStroke} />
                  <ZAxis type="category" dataKey="left_flag" range={[70,70]} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v, name)=>[v, name==="monthly_income"?"Monthly Income":name==="age"?"Age":"Left?"]} />
                  <Legend />
                  <Scatter data={scatter.filter(d=>d.left_flag===1)} name="Left" fill={yesColor} />
                  <Scatter data={scatter.filter(d=>d.left_flag===0)} name="Stayed" fill={noColor} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Correlations */}
          <div className="card">
            <div className="card-head"><h3>Correlation with Attrition (Yes=1, No=0)</h3></div>
            <div className="card-body" style={{overflowX:"auto"}}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
                <thead>
                  <tr>
                    <th style={{textAlign:"left", padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.12)"}}>Feature</th>
                    <th style={{textAlign:"left", padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.12)"}}>Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {[...corrs].sort((a,b)=>Math.abs(b.corr||0)-Math.abs(a.corr||0)).map(r=>(
                    <tr key={r.feature}>
                      <td style={{padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.06)"}}>{r.feature}</td>
                      <td style={{padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.06)", fontWeight:700, color:(r.corr??0)>0?yesColor:noColor}}>
                        {r.corr?.toFixed(3) ?? "n/a"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="hint" style={{marginTop:8}}>
                Positive value means higher feature values associate with leaving; negative means the opposite.
              </p>
            </div>
          </div>

          {/* Income spread by role (five-number summary) */}
          <div className="card">
            <div className="card-head"><h3>Income spread by Job Role</h3></div>
            <div className="card-body" style={{height:330}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={boxIncome}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="job_role" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v, name)=>[v, ({min:"Min",q1:"Q1",median:"Median",q3:"Q3",max:"Max"}[name]||name)]} />
                  <Legend />
                  <Bar dataKey="min"    stackId="spread" fill={palette[0]} />
                  <Bar dataKey="q1"     stackId="spread" fill={palette[1]} />
                  <Bar dataKey="median" stackId="spread" fill={palette[2]} />
                  <Bar dataKey="q3"     stackId="spread" fill={palette[3]} />
                  <Bar dataKey="max"    stackId="spread" fill={palette[4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New viz #1: Attrition by Education Field */}
          <div className="card">
            <div className="card-head"><h3>Attrition by Education Field</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eduByCount}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {eduByCount.map((_,i)=>(<Cell key={i} fill={palette[(i+4)%palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Satisfaction profile (radar) */}
          <div className="card">
            <div className="card-head"><h3>Satisfaction Profile — Stayed vs Left</h3></div>
            <div className="card-body" style={{height:360}}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar}>
                  <PolarGrid stroke={gridStroke} />
                  <PolarAngleAxis dataKey="group_name" stroke={axisStroke} />
                  <PolarRadiusAxis stroke={axisStroke} />
                  <Radar name="Environment" dataKey="environment" stroke={palette[1]} fill={palette[1]} fillOpacity={0.25} />
                  <Radar name="Job"         dataKey="job"         stroke={palette[2]} fill={palette[2]} fillOpacity={0.25} />
                  <Radar name="Relation"    dataKey="relationship"stroke={palette[3]} fill={palette[3]} fillOpacity={0.25} />
                  <Radar name="Work/Life"   dataKey="work_life"   stroke={palette[4]} fill={palette[4]} fillOpacity={0.25} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New viz #2: Attrition by Business Travel */}
          <div className="card">
            <div className="card-head"><h3>Attrition by Business Travel</h3></div>
            <div className="card-body" style={{height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={travelByCount}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {travelByCount.map((_,i)=>(<Cell key={i} fill={palette[(i+6)%palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      <footer className="footer">
        API: {import.meta.env.VITE_API_BASE}
      </footer>
    </>
  );
}

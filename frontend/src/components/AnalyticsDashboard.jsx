import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";
import ChartCard from "./ChartCard";
import MetricCard from "./MetricCard";
import { palette, yesColor, noColor, gridStroke, axisStroke, textColor, tooltipBg, tooltipBd } from "../theme";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Legend, Cell
} from "recharts";

/* Utility for readable tooltips */
const tooltipStyle = { background: tooltipBg, border: `1px solid ${tooltipBd}`, color: textColor };

/* Sort helpers */
const byAttr = (a,b) => (b.attrition_rate ?? 0) - (a.attrition_rate ?? 0);
const byCount = (a,b) => (b.n ?? 0) - (a.n ?? 0);

export default function AnalyticsDashboard() {
  // datasets
  const [summary, setSummary] = useState(null);

  const [dept, setDept] = useState([]);
  const [role, setRole] = useState([]);
  const [edu, setEdu] = useState([]);
  const [marital, setMarital] = useState([]);
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

  // controls
  const [binsAge, setBinsAge] = useState(12);
  const [binsInc, setBinsInc] = useState(25);
  const [scatterN, setScatterN] = useState(1200);

  const [err, setErr] = useState("");

  // load everything concurrently
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tasks = [
          endpoints.summary().then(setSummary),

          endpoints.byDepartment().then(setDept),
          endpoints.byRole().then(setRole),
          endpoints.byEducationField().then(setEdu),
          endpoints.byMaritalStatus().then(setMarital),
          endpoints.byBusinessTravel().then(setTravel),
          endpoints.byOvertime().then(setOvertime),
          endpoints.byTwoDeptOT().then(setDeptOT),

          endpoints.ageHist(binsAge).then(setAgeHist),
          endpoints.incomeHist(binsInc).then(setIncHist),
          endpoints.tenure().then(setTenure),
          endpoints.scatter(scatterN).then(setScatter),
          endpoints.radar().then(setRadar),
          endpoints.corrs().then(setCorrs),
          endpoints.boxIncome().then(setBoxIncome),
        ];
        const res = await Promise.allSettled(tasks);
        const firstErr = res.find(r => r.status === "rejected");
        if (firstErr && !cancelled) setErr(String(firstErr.reason));
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reactive controls
  useEffect(() => { endpoints.ageHist(binsAge).then(setAgeHist).catch(e=>setErr(String(e))); }, [binsAge]);
  useEffect(() => { endpoints.incomeHist(binsInc).then(setIncHist).catch(e=>setErr(String(e))); }, [binsInc]);
  useEffect(() => { endpoints.scatter(scatterN).then(setScatter).catch(e=>setErr(String(e))); }, [scatterN]);

  // derived datasets
  const deptSorted = useMemo(() => [...dept].sort(byAttr), [dept]);
  const roleSorted = useMemo(() => [...role].sort(byAttr), [role]);
  const eduSorted  = useMemo(() => [...edu].sort(byCount), [edu]);
  const maritalSorted = useMemo(() => [...marital].sort(byCount), [marital]);
  const travelSorted  = useMemo(() => [...travel].sort(byCount), [travel]);
  const overtimeSorted= useMemo(() => [...overtime].sort(byCount), [overtime]);

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

  // insights text (simple but helpful)
  const insights = useMemo(() => {
    const topDept = deptSorted[0];
    const topRole = roleSorted[0];
    const otYes = overtimeSorted.find(d=>d.key==="Yes");
    const otNo  = overtimeSorted.find(d=>d.key==="No");
    const otDelta = otYes && otNo ? (otYes.attrition_rate - otNo.attrition_rate) : null;

    return [
      topDept ? `Highest attrition rate by department appears in ${topDept.key} (~${(topDept.attrition_rate*100).toFixed(1)}%).` : null,
      topRole ? `Among roles, ${topRole.key} shows the highest attrition rate (~${(topRole.attrition_rate*100).toFixed(1)}%).` : null,
      otDelta!=null ? `Overtime associates with a higher attrition rate by about ${(otDelta*100).toFixed(1)} percentage points.` : null,
      `Tenure curve suggests early-year exits dominate and flatten with longer tenure.`,
      `Income distribution is skewed toward lower and mid-salary bands, with attrition pockets across bands.`,
    ].filter(Boolean);
  }, [deptSorted, roleSorted, overtimeSorted]);

  if (err) {
    return <pre className="card" style={{padding:16, whiteSpace:"pre-wrap", color:"#ffb4b4"}}>{err}</pre>;
  }

  return (
    <>
      <header className="header">
        <div className="brand">
          <span className="dot"></span>
          <h1>HR Attrition Analytics</h1>
        </div>
        <div className="right">
          <a className="link" href="https://github.com/RayanBhatti/CineScope" target="_blank" rel="noreferrer">View Source</a>
        </div>
      </header>

      <div className="grid">
        {/* KPIs */}
        <div className="card" style={{gridColumn:"1 / -1"}}>
          <div className="card-head"><h3>Overview</h3></div>
          <div className="card-body">
            <div className="kpis">
              <MetricCard label="Employees" value={summary?.n_total} />
              <MetricCard label="Left" value={summary?.n_left} />
              <MetricCard label="Attrition rate" value={summary ? `${(summary.attrition_rate*100).toFixed(1)}%` : "—"} hint="Company-wide" />
            </div>
          </div>
        </div>

        {/* Insights text */}
        <div className="card" style={{gridColumn:"1 / -1"}}>
          <div className="card-head"><h3>Key insights from the data</h3></div>
          <div className="card-body">
            <ul style={{margin:"6px 0 0 18px"}}>
              {insights.map((t, i) => <li key={i} className="hint" style={{fontSize:14, color:"#d5def7"}}>{t}</li>)}
            </ul>
          </div>
        </div>

        {/* Controls */}
        <div className="card">
          <div className="card-head"><h3>Controls</h3></div>
          <div className="card-body">
            <div className="controls">
              <label className="hint">Age bins</label>
              <input className="input" type="number" min="5" max="30" value={binsAge} onChange={e=>setBinsAge(+e.target.value||12)} />
              <label className="hint">Income bins</label>
              <input className="input" type="number" min="10" max="50" value={binsInc} onChange={e=>setBinsInc(+e.target.value||25)} />
              <label className="hint">Scatter samples</label>
              <input className="input" type="number" min="200" max="3000" value={scatterN} onChange={e=>setScatterN(+e.target.value||1200)} />
            </div>
          </div>
        </div>

        {/* Department – all departments */}
        <div className="card">
          <div className="card-head"><h3>Attrition by Department</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptSorted}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {deptSorted.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Job role – vertical chart so every role is visible; scroll if tall */}
        <div className="card">
          <div className="card-head"><h3>Attrition by Job Role</h3></div>
          <div className="card-body scroll-y">
            <div style={{width:"100%", height:480, minHeight:480}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleSorted} layout="vertical" margin={{left:40}}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={true} vertical={false}/>
                  <XAxis type="number" stroke={axisStroke} />
                  <YAxis dataKey="key" type="category" stroke={axisStroke} width={180} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {roleSorted.map((_,i)=>(<Cell key={i} fill={palette[(i+2)%palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Education field */}
        <div className="card">
          <div className="card-head"><h3>Attrition by Education Field</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:300}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eduSorted}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {eduSorted.map((_,i)=>(<Cell key={i} fill={palette[(i+4)%palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Marital status */}
        <div className="card">
          <div className="card-head"><h3>Attrition by Marital Status</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:300}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maritalSorted}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {maritalSorted.map((_,i)=>(<Cell key={i} fill={palette[(i+5)%palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Business travel */}
        <div className="card">
          <div className="card-head"><h3>Attrition by Business Travel</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:300}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={travelSorted}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {travelSorted.map((_,i)=>(<Cell key={i} fill={palette[(i+6)%palette.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Overtime yes/no */}
        <div className="card">
          <div className="card-head"><h3>Overtime vs Attrition</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:280}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overtimeSorted}>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="key" stroke={axisStroke} />
                  <YAxis stroke={axisStroke} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attrition_rate">
                    {overtimeSorted.map((r,i)=>{
                      const c = r.key==="Yes" ? yesColor : noColor;
                      return <Cell key={i} fill={c} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Department × Overtime stacked */}
        <div className="card">
          <div className="card-head"><h3>Attrition rate by Department × Overtime</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:330}}>
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
        </div>

        {/* Age histogram */}
        <div className="card">
          <div className="card-head"><h3>Age Distribution (bins)</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:280}}>
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
        </div>

        {/* Income histogram */}
        <div className="card">
          <div className="card-head"><h3>Monthly Income Distribution (bins)</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:280}}>
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
        </div>

        {/* Tenure curve */}
        <div className="card">
          <div className="card-head"><h3>Attrition vs Tenure (Years at Company)</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:280}}>
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
        </div>

        {/* Gender pie */}
        <div className="card">
          <div className="card-head"><h3>Gender Split</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:320}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Pie dataKey="n" nameKey="gender" data={summary ? undefined : []} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Scatter */}
        <div className="card" style={{gridColumn:"1 / -1"}}>
          <div className="card-head"><h3>Age vs Monthly Income (colored by attrition)</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:420}}>
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
        </div>

        {/* Correlations table */}
        <div className="card">
          <div className="card-head"><h3>Correlation with Attrition (Yes=1, No=0)</h3></div>
          <div className="card-body scroll-x">
            <table className="table">
              <thead>
                <tr><th className="th">Feature</th><th className="th">Correlation</th></tr>
              </thead>
              <tbody>
                {[...corrs].sort((a,b)=>Math.abs(b.corr||0)-Math.abs(a.corr||0)).map(r=>(
                  <tr key={r.feature}>
                    <td className="td">{r.feature}</td>
                    <td className="td" style={{fontWeight:700, color:(r.corr??0)>0?yesColor:noColor}}>
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

        {/* Income five-number summary (stacked to indicate spread) */}
        <div className="card">
          <div className="card-head"><h3>Income spread by Job Role</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:330}}>
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
            <p className="hint" style={{marginTop:8}}>This is a compact spread view. We can switch to a true box/violin later.</p>
          </div>
        </div>

        {/* Radar */}
        <div className="card">
          <div className="card-head"><h3>Satisfaction Profile — Stayed vs Left</h3></div>
          <div className="card-body">
            <div style={{width:"100%", height:360}}>
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
        </div>

      </div>

      <footer className="footer">
        API: {import.meta.env.VITE_API_BASE}
      </footer>
    </>
  );
}

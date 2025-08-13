import { useEffect, useMemo, useState } from "react";
import { endpoints } from "../api";
import ChartCard from "./ChartCard";
import MetricCard from "./MetricCard";
import { palette, yesColor, noColor, gridStroke, axisStroke, textColor } from "../theme";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Legend, Cell
} from "recharts";

/* ---------- local styles for the simple table ---------- */
const thStyle = { textAlign:"left", padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.12)", fontWeight:700 };
const tdStyle = { textAlign:"left", padding:"8px 10px" };

/* ---------- tiny wrap to give charts consistent padding ---------- */
function ChartWrap({ children }) {
  return <div style={{ width:"100%", height:"100%" }}>{children}</div>;
}

export default function AnalyticsDashboard() {
  // data
  const [summary, setSummary] = useState(null);
  const [byDept, setByDept] = useState([]);
  const [byRole, setByRole] = useState([]);
  const [ageHist, setAgeHist] = useState([]);
  const [incHist, setIncHist] = useState([]);
  const [tenure, setTenure] = useState([]);
  const [deptOvertime, setDeptOvertime] = useState([]);
  const [corrs, setCorrs] = useState([]);
  const [boxIncome, setBoxIncome] = useState([]);
  const [scatter, setScatter] = useState([]);
  const [radar, setRadar] = useState([]);
  const [genderPie, setGenderPie] = useState([]);

  // ui
  const [binsAge, setBinsAge] = useState(9);
  const [binsInc, setBinsInc] = useState(20);
  const [scatterN, setScatterN] = useState(800);
  const [err, setErr] = useState("");

  // initial concurrent load
  useEffect(() => {
    let done = false;
    (async () => {
      try {
        const tasks = [
          endpoints.summary().then(setSummary),
          endpoints.byDept().then(setByDept),
          endpoints.byRole().then(setByRole),
          endpoints.ageHist(binsAge, 18, 60).then(setAgeHist),
          endpoints.incomeHist(binsInc).then(setIncHist),
          endpoints.tenure(40).then(setTenure),
          endpoints.byTwo().then(setDeptOvertime),
          endpoints.corrs().then(setCorrs),
          endpoints.boxIncome().then(setBoxIncome),
          endpoints.scatter(scatterN).then(setScatter),
          endpoints.radar().then(setRadar),
          endpoints.genderPie().then(setGenderPie),
        ];
        const res = await Promise.allSettled(tasks);
        const firstErr = res.find(r => r.status === "rejected");
        if (!done && firstErr) setErr(String(firstErr.reason));
      } catch (e) {
        if (!done) setErr(String(e));
      }
    })();
    return () => { done = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial only

  // reactive controls
  useEffect(() => { endpoints.ageHist(binsAge, 18, 60).then(setAgeHist).catch(e => setErr(String(e))); }, [binsAge]);
  useEffect(() => { endpoints.incomeHist(binsInc).then(setIncHist).catch(e => setErr(String(e))); }, [binsInc]);
  useEffect(() => { endpoints.scatter(scatterN).then(setScatter).catch(e => setErr(String(e))); }, [scatterN]);

  // transforms
  const deptOvertimePivot = useMemo(() => {
    const by = {};
    for (const r of deptOvertime) {
      const k = r.k1 || "Unknown";
      const ot = r.k2 || "Unknown";
      by[k] ||= { department: k, Yes: 0, No: 0 };
      by[k][ot] = r.attrition_rate; // using rate for a stacked comparison
    }
    return Object.values(by);
  }, [deptOvertime]);

  const corrSorted = useMemo(() => {
    return [...corrs]
      .filter(d => d.corr !== null && !Number.isNaN(d.corr))
      .sort((a,b) => Math.abs(b.corr) - Math.abs(a.corr));
  }, [corrs]);

  if (err) {
    return (
      <pre className="card span-12" style={{ padding:16, whiteSpace:"pre-wrap", color:"#ffb4b4", borderColor:"rgba(255,0,0,.25)" }}>
        {err}
      </pre>
    );
  }

  return (
    <>
      {/* KPIs */}
      <div className="grid">
        <div className="kpis span-12">
          <MetricCard label="Employees" value={summary ? summary.n_total : "—"} />
          <MetricCard label="Left (count)" value={summary ? summary.n_left : "—"} />
          <MetricCard
            label="Attrition rate"
            value={summary ? `${(summary.attrition_rate*100).toFixed(1)}%` : "—"}
            hint="Company-wide"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="grid">
        <div className="card span-12">
          <div className="card-head">
            <h3>Dashboard Controls</h3>
            <div className="controls">
              <label className="hint">Age bins</label>
              <input className="input" type="number" min="3" max="20" value={binsAge} onChange={e=>setBinsAge(+e.target.value||9)} />
              <label className="hint">Income bins</label>
              <input className="input" type="number" min="5" max="40" value={binsInc} onChange={e=>setBinsInc(+e.target.value||20)} />
              <label className="hint">Scatter samples</label>
              <input className="input" type="number" min="200" max="2000" value={scatterN} onChange={e=>setScatterN(+e.target.value||800)} />
            </div>
          </div>
          <div className="card-body hint">
            Tune bucket sizes & sample size. Charts update instantly.
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid">
        {/* Department */}
        <ChartCard title="Attrition by Department" className="span-6">
          <ChartWrap>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byDept}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="key" stroke={axisStroke} />
                <YAxis stroke={axisStroke} />
                <Tooltip contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }} />
                <Bar dataKey="attrition_rate">
                  {byDept.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>
        </ChartCard>

        {/* Role */}
        <ChartCard title="Attrition by Job Role" className="span-6">
          <ChartWrap>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byRole}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="key" stroke={axisStroke} />
                <YAxis stroke={axisStroke} />
                <Tooltip contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }} />
                <Bar dataKey="attrition_rate">
                  {byRole.map((_,i)=>(<Cell key={i} fill={palette[(i+2) % palette.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>
        </ChartCard>

        {/* Income histogram */}
        <ChartCard title="Monthly Income Distribution (bins)" className="span-6" right={<span className="legend"><span className="sw" style={{background:palette[0]}}></span>Count</span>}>
          <ChartWrap>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={incHist}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette[0]} stopOpacity="0.9"/>
                    <stop offset="100%" stopColor={palette[0]} stopOpacity="0.15"/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="bucket" stroke={axisStroke} />
                <YAxis stroke={axisStroke} />
                <Tooltip contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }} />
                <Area dataKey="n" fill="url(#incGrad)" stroke={palette[0]} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrap>
        </ChartCard>

        {/* Tenure line */}
        <ChartCard title="Attrition vs Tenure (Years at Company)" className="span-6">
          <ChartWrap>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={tenure}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="years_at_company" stroke={axisStroke} />
                <YAxis stroke={axisStroke} />
                <Tooltip contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }} />
                <Line dataKey="attrition_rate" dot={false} stroke={palette[5]} strokeWidth={2.2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrap>
        </ChartCard>

        {/* Dept × Overtime (stacked rate) */}
        <ChartCard title="Attrition rate by Department × Overtime" className="span-8" right={
          <div className="legend">
            <span className="sw" style={{background:yesColor}}></span>Overtime: Yes
            <span className="sw" style={{background:noColor}}></span>Overtime: No
          </div>
        }>
          <ChartWrap>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={deptOvertimePivot}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="department" stroke={axisStroke} />
                <YAxis stroke={axisStroke} />
                <Tooltip contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }} />
                <Legend />
                <Bar dataKey="Yes" stackId="ot" fill={yesColor} />
                <Bar dataKey="No"  stackId="ot" fill={noColor} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>
        </ChartCard>

        {/* Gender pie */}
        <ChartCard title="Gender Split" className="span-4">
          <ChartWrap>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Tooltip contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }} />
                <Legend />
                <Pie data={genderPie} dataKey="n" nameKey="gender" outerRadius={120} label>
                  {genderPie.map((_,i)=>(<Cell key={i} fill={palette[i % palette.length]} />))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartWrap>
        </ChartCard>

        {/* Scatter */}
        <ChartCard title="Age vs Monthly Income (colored by attrition)" className="span-8">
          <ChartWrap>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="age" stroke={axisStroke} />
                <YAxis type="number" dataKey="monthly_income" stroke={axisStroke} />
                <ZAxis type="category" dataKey="left_flag" range={[80,80]} />
                <Tooltip
                  contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }}
                  formatter={(v, name) => [v, name === "monthly_income" ? "Monthly Income" : name === "age" ? "Age" : "Left?"]}
                />
                <Legend />
                <Scatter data={scatter.filter(d => d.left_flag === 1)} name="Left"   fill={yesColor} />
                <Scatter data={scatter.filter(d => d.left_flag === 0)} name="Stayed" fill={noColor} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartWrap>
        </ChartCard>

        {/* Radar */}
        <ChartCard title="Satisfaction Profile — Stayed vs Left" className="span-4">
          <ChartWrap>
            <ResponsiveContainer width="100%" height={360}>
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
          </ChartWrap>
        </ChartCard>

        {/* Correlations */}
        <ChartCard title="Top correlations with Attrition (Yes=1, No=0)" className="span-6">
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Feature</th>
                  <th style={thStyle}>Correlation</th>
                </tr>
              </thead>
              <tbody>
                {corrSorted.map((r)=>(
                  <tr key={r.feature} style={{ borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                    <td style={tdStyle}>{r.feature}</td>
                    <td style={tdStyle}>
                      <span style={{ color: (r.corr ?? 0)>0 ? yesColor : noColor, fontWeight:700 }}>
                        {r.corr?.toFixed(3) ?? "n/a"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint" style={{ marginTop:8 }}>
              Positive = more likely to leave as the feature increases; Negative = less likely.
            </p>
          </div>
        </ChartCard>

        {/* Income five-number summary — visualized as stacked segments */}
        <ChartCard title="Income spread by Job Role (five-number summary)" className="span-6">
          <ChartWrap>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={boxIncome}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                <XAxis dataKey="job_role" stroke={axisStroke} />
                <YAxis stroke={axisStroke} />
                <Tooltip contentStyle={{ background:"#0f162c", border:"1px solid rgba(255,255,255,.12)", color:textColor }}
                  formatter={(v, name) => {
                    const labels = { min:"Min", q1:"Q1", median:"Median", q3:"Q3", max:"Max" };
                    return [v, labels[name] || name];
                  }}
                />
                <Legend />
                {/* Stack to depict cumulative spread; not a true box, but intuitive */}
                <Bar dataKey="min"    stackId="spread" fill={palette[0]} />
                <Bar dataKey="q1"     stackId="spread" fill={palette[1]} />
                <Bar dataKey="median" stackId="spread" fill={palette[2]} />
                <Bar dataKey="q3"     stackId="spread" fill={palette[3]} />
                <Bar dataKey="max"    stackId="spread" fill={palette[4]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>
          <p className="hint" style={{ marginTop:8, marginBottom:0 }}>
            We’ll swap this for a true box/violin plot in a later pass; this conveys spread segments now.
          </p>
        </ChartCard>
      </div>
    </>
  );
}

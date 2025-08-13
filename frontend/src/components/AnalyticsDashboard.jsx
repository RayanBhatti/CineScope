import { useEffect, useMemo, useState } from "react";
import { endpoints, getDashboard } from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Legend
} from "recharts";

const useBatch = false; // set true after you add /api/dashboard (Option B)

export default function AnalyticsDashboard() {
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
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (useBatch) {
          const d = await getDashboard();
          if (cancelled) return;
          setSummary(d.summary);
          setByDept(d.byDept);
          setByRole(d.byRole);
          setAgeHist(d.ageHist);
          setIncHist(d.incomeHist);
          setTenure(d.tenure);
          setDeptOvertime(d.byTwo);
          setCorrs(d.corrs);
          setBoxIncome(d.boxIncome);
          setScatter(d.scatter);
          setRadar(d.radar);
          setGenderPie(d.genderPie);
        } else {
          // Fire everything concurrently
          const tasks = {
            summary: endpoints.summary(),
            byDept: endpoints.byDept(),
            byRole: endpoints.byRole(),
            ageHist: endpoints.ageHist(),
            incomeHist: endpoints.incomeHist(),
            tenure: endpoints.tenure(),
            byTwo: endpoints.byTwo(),
            corrs: endpoints.corrs(),
            boxIncome: endpoints.boxIncome(),
            scatter: endpoints.scatter(),
            radar: endpoints.radar(),
            genderPie: endpoints.genderPie(),
          };
          const entries = Object.entries(tasks);
          const results = await Promise.allSettled(entries.map(([, p]) => p));

          if (cancelled) return;
          results.forEach((res, i) => {
            const key = entries[i][0];
            if (res.status === "fulfilled") {
              const setterMap = {
                summary: setSummary,
                byDept: setByDept,
                byRole: setByRole,
                ageHist: setAgeHist,
                incomeHist: setIncHist,
                tenure: setTenure,
                byTwo: setDeptOvertime,
                corrs: setCorrs,
                boxIncome: setBoxIncome,
                scatter: setScatter,
                radar: setRadar,
                genderPie: setGenderPie,
              };
              setterMap[key](res.value);
            } else {
              console.warn(`Failed ${key}:`, res.reason);
              // Show the first error prominently
              if (!err) setErr(String(res.reason));
            }
          });
        }
      } catch (e) {
        setErr(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // run once

  const deptOvertimePivot = useMemo(() => {
    const by = {};
    for (const r of deptOvertime) {
      const k = r.k1 || "Unknown";
      const ot = r.k2 || "Unknown";
      by[k] ||= { department: k, Yes: 0, No: 0 };
      by[k][ot] = r.attrition_rate;
    }
    return Object.values(by);
  }, [deptOvertime]);

  const corrSorted = useMemo(() => {
    return [...corrs]
      .filter(d => d.corr !== null && !Number.isNaN(d.corr))
      .sort((a,b) => Math.abs(b.corr) - Math.abs(a.corr));
  }, [corrs]);

  if (err) return <pre style={{whiteSpace:"pre-wrap", color:"crimson"}}>{err}</pre>;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <h2>HR Attrition Analytics — concurrent loading</h2>
      {loading && <p style={{opacity:.7}}>Loading data…</p>}
      {summary && (
        <div style={{ margin: "12px 0", fontWeight: 600 }}>
          Total: {summary.n_total} · Left: {summary.n_left} · Attrition rate: {(summary.attrition_rate*100).toFixed(1)}%
        </div>
      )}

      <Section title="Attrition by Department">
        <ChartOrEmpty data={byDept}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byDept}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" /><YAxis /><Tooltip />
              <Bar dataKey="attrition_rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Attrition by Job Role">
        <ChartOrEmpty data={byRole}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byRole}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" /><YAxis /><Tooltip />
              <Bar dataKey="attrition_rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Monthly Income Distribution (bins)">
        <ChartOrEmpty data={incHist}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={incHist}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" /><YAxis /><Tooltip />
              <Area dataKey="n" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Attrition vs Tenure (Years at Company)">
        <ChartOrEmpty data={tenure}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tenure}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="years_at_company" /><YAxis /><Tooltip />
              <Line dataKey="attrition_rate" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Attrition rate by Department × OverTime">
        <ChartOrEmpty data={deptOvertimePivot}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={deptOvertimePivot}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="Yes" stackId="a" /><Bar dataKey="No" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Age vs Monthly Income (scatter)">
        <ChartOrEmpty data={scatter}>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="age" />
              <YAxis type="number" dataKey="monthly_income" />
              <ZAxis type="category" dataKey="left_flag" range={[60,60]} />
              <Tooltip /><Legend />
              <Scatter data={scatter.filter(d => d.left_flag === 1)} name="Left" />
              <Scatter data={scatter.filter(d => d.left_flag === 0)} name="Stayed" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Satisfaction Profile (Radar) — Stayed vs Left">
        <ChartOrEmpty data={radar}>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radar}>
              <PolarGrid /><PolarAngleAxis dataKey="group_name" /><PolarRadiusAxis />
              <Radar name="Environment" dataKey="environment" />
              <Radar name="Job" dataKey="job" />
              <Radar name="Relationship" dataKey="relationship" />
              <Radar name="Work/Life" dataKey="work_life" />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Gender Split & Attrition rate (Pie)">
        <ChartOrEmpty data={genderPie}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart><Tooltip /><Legend />
              <Pie data={genderPie} dataKey="n" nameKey="gender" outerRadius={120} label />
            </PieChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>

      <Section title="Correlation with Attrition (Yes=1, No=0)">
        <CorrelationTable rows={corrSorted} />
      </Section>

      <Section title="Income spread by Job Role (five-number summary)">
        <ChartOrEmpty data={boxIncome}>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={boxIncome}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="job_role" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="min" stackId="b" /><Bar dataKey="q1" stackId="b" />
              <Bar dataKey="median" stackId="b" /><Bar dataKey="q3" stackId="b" />
              <Bar dataKey="max" stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ margin: "24px 0" }}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ChartOrEmpty({ data, children }) {
  if (!data || data.length === 0) return <div style={{opacity:.6}}>Loading…</div>;
  return children;
}

function CorrelationTable({ rows }) {
  const [sort, setSort] = useState({ key: "corr", dir: "desc" });
  const sorted = useMemo(() => {
    const r = [...rows];
    r.sort((a,b) => {
      const ka = sort.key === "feature" ? a.feature : a.corr ?? -999;
      const kb = sort.key === "feature" ? b.feature : b.corr ?? -999;
      if (ka < kb) return sort.dir === "asc" ? -1 : 1;
      if (ka > kb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return r;
  }, [rows, sort]);

  const toggle = (key) => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th onClick={() => toggle("feature")}>Feature</Th>
            <Th onClick={() => toggle("corr")}>Correlation</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.feature}>
              <Td>{r.feature}</Td>
              <Td>{r.corr !== null ? r.corr.toFixed(3) : "n/a"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Th({ children, onClick }) {
  return <th onClick={onClick} style={{ cursor:"pointer", textAlign:"left", borderBottom:"1px solid #ddd", padding:"6px" }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ borderBottom:"1px solid #eee", padding:"6px" }}>{children}</td>;
}

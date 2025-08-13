import { useEffect, useMemo, useState } from "react";
import {
  getSummary, getAttritionBy, getAgeHist, getIncomeHist, getTenureCurve,
  getByTwo, getCorrelations, getIncomeBoxByRole, getScatterAgeIncome,
  getRadarSatisfaction, getGenderPie
} from "../api";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Legend
} from "recharts";

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

  useEffect(() => {
    (async () => {
      try {
        setSummary(await getSummary());
        setByDept(await getAttritionBy("department"));
        setByRole(await getAttritionBy("job_role"));
        setAgeHist(await getAgeHist({ buckets: 9, min_age: 18, max_age: 60 }));
        setIncHist(await getIncomeHist(20));
        setTenure(await getTenureCurve(40));
        setDeptOvertime(await getByTwo("department","over_time"));
        setCorrs(await getCorrelations());
        setBoxIncome(await getIncomeBoxByRole());
        setScatter(await getScatterAgeIncome(1000));
        setRadar(await getRadarSatisfaction());
        setGenderPie(await getGenderPie());
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);

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
    <div style={{ padding: "1.5rem" }}>
      {summary && (
        <div style={{ margin: "12px 0", fontWeight: 600 }}>
          Total: {summary.n_total} · Left: {summary.n_left} · Attrition rate: {(summary.attrition_rate*100).toFixed(1)}%
        </div>
      )}

      <Section title="Attrition by Department">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byDept}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="attrition_rate" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Attrition by Job Role">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byRole}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="attrition_rate" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Monthly Income Distribution (bins)">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={incHist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Area dataKey="n" />
          </AreaChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Attrition vs Tenure (Years at Company)">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={tenure}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="years_at_company" />
            <YAxis />
            <Tooltip />
            <Line dataKey="attrition_rate" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Attrition rate by Department × OverTime">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={deptOvertimePivot}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Yes" stackId="a" />
            <Bar dataKey="No" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Age vs Monthly Income (scatter)">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="age" />
            <YAxis type="number" dataKey="monthly_income" />
            <ZAxis type="category" dataKey="left_flag" range={[60, 60]} />
            <Tooltip />
            <Scatter data={scatter.filter(d => d.left_flag === 1)} name="Left" />
            <Scatter data={scatter.filter(d => d.left_flag === 0)} name="Stayed" />
            <Legend />
          </ScatterChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Satisfaction Profile (Radar) — Stayed vs Left">
        <ResponsiveContainer width="100%" height={360}>
          <RadarChart data={radar}>
            <PolarGrid />
            <PolarAngleAxis dataKey="group_name" />
            <PolarRadiusAxis />
            <Radar name="Environment" dataKey="environment" />
            <Radar name="Job" dataKey="job" />
            <Radar name="Relationship" dataKey="relationship" />
            <Radar name="Work/Life" dataKey="work_life" />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Gender Split & Attrition rate (Pie)">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={genderPie} dataKey="n" nameKey="gender" outerRadius={120} label />
          </PieChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Correlation with Attrition (Yes=1, No=0)">
        <CorrelationTable rows={corrSorted} />
      </Section>

      <Section title="Income spread by Job Role (five-number summary)">
        <ResponsiveContainer width="100%" height={330}>
          <BarChart data={boxIncome}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="job_role" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="min" stackId="b" />
            <Bar dataKey="q1" stackId="b" />
            <Bar dataKey="median" stackId="b" />
            <Bar dataKey="q3" stackId="b" />
            <Bar dataKey="max" stackId="b" />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
        <p style={{opacity:.7, fontSize:12}}>We’ll swap for a proper box/violin plot during styling.</p>
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

  function toggle(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  }

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

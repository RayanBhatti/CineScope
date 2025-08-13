import { useEffect, useState } from "react";
import { getSummary, getAttritionBy, getAgeHist } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AttritionCharts() {
  const [summary, setSummary] = useState(null);
  const [byDept, setByDept] = useState([]);
  const [byRole, setByRole] = useState([]);
  const [age, setAge] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setSummary(await getSummary());
        setByDept(await getAttritionBy("department"));
        setByRole(await getAttritionBy("job_role"));
        setAge(await getAgeHist({ buckets: 9, min_age: 18, max_age: 60 }));
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h2>HR Attrition Dashboard</h2>
      {summary && (
        <p>
          <b>Total:</b> {summary.n_total} · <b>Left:</b> {summary.n_left} ·{" "}
          <b>Attrition rate:</b> {(summary.attrition_rate * 100).toFixed(1)}%
        </p>
      )}

      <section>
        <h3>Attrition by Department</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byDept}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="attrition_rate" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3>Attrition by Job Role</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byRole}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="attrition_rate" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3>Age buckets vs Attrition</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={age}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="attrition_rate" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

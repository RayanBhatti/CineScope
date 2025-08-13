import AttritionCharts from "./components/AttritionCharts";

export default function App() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
      <h1>HR Attrition Analytics (React + FastAPI + Postgres)</h1>
      <p>Interactive demo using your Neon-backed API.</p>
      <AttritionCharts />
    </main>
  );
}

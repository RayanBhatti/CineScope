import AnalyticsDashboard from "./components/AnalyticsDashboard";

export default function App() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <h1>HR Attrition Analytics — v3</h1>
      <p style={{opacity:.7}}>
        Using API base: {import.meta.env.VITE_API_BASE || "(missing)"} 
      </p>
      <AnalyticsDashboard />
    </main>
  );
}

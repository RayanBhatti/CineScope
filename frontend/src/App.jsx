import AnalyticsDashboard from "./components/AnalyticsDashboard";

export default function App() {
  return (
    <div className="page">
      <header className="page-header glass">
        <div className="brand">
          <span className="dot" />
          <h1>CineScope • HR Attrition Analytics</h1>
        </div>
        <div className="sub">
          <span className="badge">React</span>
          <span className="badge">FastAPI</span>
          <span className="badge">Postgres (Neon)</span>
        </div>
      </header>

      <AnalyticsDashboard />

      <footer className="page-footer">
        <div>API: {import.meta.env.VITE_API_BASE || "(missing)"} · © {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}

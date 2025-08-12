import GenreChart from "./components/Chart";

export default function App() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: 8 }}>CineScope 🎬</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        A tiny React + FastAPI + Postgres demo. Top genres from the sample dataset:
      </p>
      <GenreChart />
      <p style={{ marginTop: 24, fontSize: 12, color: "#777" }}>
        Configure <code>VITE_API_BASE</code> to point to your deployed backend.
      </p>
    </div>
  );
}

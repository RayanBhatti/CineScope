export default function MetricCard({ label, value, hint }) {
  return (
    <div className="kpi">
      <h4>{label}</h4>
      <div className="val">{value}</div>
      {hint ? <div className="trend">{hint}</div> : null}
    </div>
  );
}

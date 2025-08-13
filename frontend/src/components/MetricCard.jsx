export default function ChartCard({ title, right, children }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
        <div className="controls">{right}</div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

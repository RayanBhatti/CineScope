export default function ChartCard({ title, right, children, className = "span-6" }) {
  return (
    <div className={`card ${className}`}>
      <div className="card-head">
        <h3>{title}</h3>
        <div className="controls">{right}</div>
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}

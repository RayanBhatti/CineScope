export const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  throw new Error(
    "VITE_API_BASE is not set. Create frontend/.env.local with:\n" +
    "VITE_API_BASE=https://<your-render-service>.onrender.com\n" +
    "…then restart the dev server."
  );
}

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}\n${t.slice(0,200)}`);
  if (t.trim().startsWith("<")) throw new Error(`Got HTML from ${url}. Check VITE_API_BASE.`);
  return JSON.parse(t);
}

export const endpoints = {
  summary: () => getJSON(`${API_BASE}/api/attrition/summary`),
  byDept: () => getJSON(`${API_BASE}/api/attrition/by?dim=department`),
  byRole: () => getJSON(`${API_BASE}/api/attrition/by?dim=job_role`),
  ageHist: () => getJSON(`${API_BASE}/api/distribution/age?buckets=9&min_age=18&max_age=60`),
  incomeHist: () => getJSON(`${API_BASE}/api/distribution/monthly_income?buckets=20`),
  tenure: () => getJSON(`${API_BASE}/api/attrition/tenure_curve?max_years=40`),
  byTwo: () => getJSON(`${API_BASE}/api/attrition/by_two?dim1=department&dim2=over_time`),
  corrs: () => getJSON(`${API_BASE}/api/correlation/numeric`),
  boxIncome: () => getJSON(`${API_BASE}/api/boxplot/income_by_role`),
  scatter: () => getJSON(`${API_BASE}/api/scatter/age_income?limit=1000`),
  radar: () => getJSON(`${API_BASE}/api/radar/satisfaction`),
  genderPie: () => getJSON(`${API_BASE}/api/pie/gender`),
};

// Optional single-call batch if backend implements /api/dashboard (Option B)
export function getDashboard() {
  return getJSON(`${API_BASE}/api/dashboard`);
}

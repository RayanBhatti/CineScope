export const API_BASE = import.meta.env.VITE_API_BASE;
if (!API_BASE) {
  throw new Error("VITE_API_BASE is not set. Create frontend/.env.local with VITE_API_BASE=http://127.0.0.1:8000");
}

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}\n${t.slice(0,200)}`);
  if (t.trim().startsWith("<")) throw new Error(`Got HTML from ${url}. Check VITE_API_BASE.`);
  return JSON.parse(t);
}

export const by = (dim) => getJSON(`${API_BASE}/api/attrition/by?dim=${encodeURIComponent(dim)}`);

export const endpoints = {
  summary: () => getJSON(`${API_BASE}/api/attrition/summary`),
  byDepartment: () => by("department"),
  byRole: () => by("job_role"),
  byEducationField: () => by("education_field"),
  byMaritalStatus: () => by("marital_status"),
  byBusinessTravel: () => by("business_travel"),
  byOvertime: () => by("over_time"),
  byTwoDeptOT: () => getJSON(`${API_BASE}/api/attrition/by_two?dim1=department&dim2=over_time`),

  ageHist: (b=12, lo=18, hi=60) =>
    getJSON(`${API_BASE}/api/distribution/age?buckets=${b}&min_age=${lo}&max_age=${hi}`),

  incomeHist: (b=25) =>
    getJSON(`${API_BASE}/api/distribution/monthly_income?buckets=${b}`),

  tenure: (max=40) =>
    getJSON(`${API_BASE}/api/attrition/tenure_curve?max_years=${max}`),

  scatter: (n=1200) =>
    getJSON(`${API_BASE}/api/scatter/age_income?limit=${n}`),

  radar: () => getJSON(`${API_BASE}/api/radar/satisfaction`),
  corrs: () => getJSON(`${API_BASE}/api/correlation/numeric`),
  boxIncome: () => getJSON(`${API_BASE}/api/boxplot/income_by_role`),
  genderPie: () => getJSON(`${API_BASE}/api/pie/gender`),

  attritionVsMinIncome: (buckets = 30) =>
    getJSON(`${API_BASE}/api/line/attrition_vs_min_income?buckets=${buckets}`),

  attritionByEmployeeIndex: () =>
    getJSON(`${API_BASE}/api/line/attrition_by_employee_index`),
};

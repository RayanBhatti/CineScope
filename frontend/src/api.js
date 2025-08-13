export const API_BASE = import.meta.env.VITE_API_BASE;

// helper returns JSON or throws with body excerpt (helps debugging)
async function getJSON(url) {
  const r = await fetch(url);
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}\n${t.slice(0, 200)}`);
  try { return JSON.parse(t); } catch (e) {
    throw new Error(`Invalid JSON from ${url}: ${e.message}\nBody: ${t.slice(0, 200)}`);
  }
}

export function getSummary() { return getJSON(`${API_BASE}/api/attrition/summary`); }
export function getAttritionBy(dim) { return getJSON(`${API_BASE}/api/attrition/by?dim=${encodeURIComponent(dim)}`); }
export function getAgeHist(params={buckets:9,min_age:18,max_age:60}) {
  const q = new URLSearchParams(params).toString();
  return getJSON(`${API_BASE}/api/distribution/age?${q}`);
}

export function getIncomeHist(buckets=20) {
  return getJSON(`${API_BASE}/api/distribution/monthly_income?buckets=${buckets}`);
}
export function getTenureCurve(max_years=40) {
  return getJSON(`${API_BASE}/api/attrition/tenure_curve?max_years=${max_years}`);
}
export function getByTwo(dim1, dim2) {
  return getJSON(`${API_BASE}/api/attrition/by_two?dim1=${encodeURIComponent(dim1)}&dim2=${encodeURIComponent(dim2)}`);
}
export function getCorrelations() { return getJSON(`${API_BASE}/api/correlation/numeric`); }
export function getIncomeBoxByRole() { return getJSON(`${API_BASE}/api/boxplot/income_by_role`); }
export function getScatterAgeIncome(limit=1000) { return getJSON(`${API_BASE}/api/scatter/age_income?limit=${limit}`); }
export function getRadarSatisfaction() { return getJSON(`${API_BASE}/api/radar/satisfaction`); }
export function getGenderPie() { return getJSON(`${API_BASE}/api/pie/gender`); }

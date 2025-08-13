export const API_BASE = import.meta.env.VITE_API_BASE;

export async function getSummary() {
  const r = await fetch(`${API_BASE}/api/attrition/summary`);
  if (!r.ok) throw new Error("summary failed");
  return r.json();
}

export async function getAttritionBy(dim) {
  const r = await fetch(`${API_BASE}/api/attrition/by?dim=${encodeURIComponent(dim)}`);
  if (!r.ok) throw new Error("attrition/by failed");
  return r.json();
}

export async function getAgeHist(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`${API_BASE}/api/distribution/age?${q}`);
  if (!r.ok) throw new Error("age hist failed");
  return r.json();
}

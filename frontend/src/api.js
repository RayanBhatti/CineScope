export const API_BASE = import.meta.env.VITE_API_BASE;

export async function fetchTopGenres() {
  const res = await fetch(`${API_BASE}/api/top-genres`);
  if (!res.ok) throw new Error('API error');
  return res.json();
}

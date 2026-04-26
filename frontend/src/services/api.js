const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

/**
 * Analyze a geographic region and return its urban feature vector.
 *
 * @param {[number, number, number, number]} bbox  [south, west, north, east]
 * @returns {Promise<{ features: Record<string, number> }>}
 */
export async function analyzeRegion(bbox) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bbox }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`analyzeRegion failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Find cities that are structurally similar to the given feature vector.
 *
 * @param {Record<string, number>} features  8-dim feature dict from analyzeRegion
 * @param {number} k  Number of results to return (default 10)
 * @returns {Promise<{ results: Array<{ name: string, lat: number, lon: number, similarity_score: number }> }>}
 */
export async function fetchSimilarCities(features, k = 10) {
  const res = await fetch(`${API_BASE}/similarity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features, k }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchSimilarCities failed (${res.status}): ${text}`);
  }
  return res.json();
}

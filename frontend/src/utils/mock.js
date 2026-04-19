/**
 * UrbanOracle — Mock API responses
 */

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

const vectors = {
  paris: {
    road_density: 0.72, road_entropy: 0.45, building_density: 0.81,
    building_regularity: 0.60, water_coverage: 0.18, river_density: 0.35,
    elevation_variance: 0.22, green_ratio: 0.28,
  },
  manhattan: {
    road_density: 0.94, road_entropy: 0.12, building_density: 0.97,
    building_regularity: 0.95, water_coverage: 0.38, river_density: 0.52,
    elevation_variance: 0.08, green_ratio: 0.14,
  },
  amsterdam: {
    road_density: 0.68, road_entropy: 0.52, building_density: 0.74,
    building_regularity: 0.48, water_coverage: 0.44, river_density: 0.78,
    elevation_variance: 0.04, green_ratio: 0.22,
  },
  default: {
    road_density: 0.55, road_entropy: 0.48, building_density: 0.60,
    building_regularity: 0.50, water_coverage: 0.20, river_density: 0.25,
    elevation_variance: 0.30, green_ratio: 0.30,
  },
};

const similarCities = [
  {
    rank: 1, city: 'Lyon', country: 'France', similarity: 0.91,
    lat: 45.764, lng: 4.835,
    tags: ['Dense grid', 'River proximity', 'Low elevation'],
  },
  {
    rank: 2, city: 'Brussels', country: 'Belgium', similarity: 0.84,
    lat: 50.850, lng: 4.352,
    tags: ['Organic roads', 'Medium density', 'Moderate green'],
  },
  {
    rank: 3, city: 'Montréal', country: 'Canada', similarity: 0.78,
    lat: 45.501, lng: -73.567,
    tags: ['Grid layout', 'Waterfront', 'Parks'],
  },
];

export async function mockAnalyze(bbox, onStage, signal) {
  const stages = [
    { label: 'Extracting OSM data…',       delay: 900 },
    { label: 'Building feature vector…',   delay: 800 },
    { label: 'Running similarity search…', delay: 700 },
    { label: 'Ranking matches…',           delay: 500 },
  ];

  for (let i = 0; i < stages.length; i++) {
    onStage(i, stages[i].label, 'active');
    await delay(stages[i].delay, signal);
    onStage(i, stages[i].label, 'done');
  }

  const base = vectors.default;
  const vector = {};
  for (const [k, v] of Object.entries(base)) {
    vector[k] = Math.min(1, Math.max(0, v + (Math.random() - 0.5) * 0.3));
  }

  return {
    vector,
    matches: similarCities.map(c => ({
      ...c,
      similarity: Math.min(0.99, c.similarity + (Math.random() - 0.5) * 0.06),
    })),
  };
}

export async function backendAnalyze(bbox) {
  const resp = await fetch('http://localhost:8000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbox }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

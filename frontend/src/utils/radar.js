/**
 * UrbanOracle — Radar Chart Renderer
 * Draws an 8-axis polygon radar for the feature vector
 */

export const AXES = [
  { key: 'road_density',        label: 'Roads'      },
  { key: 'road_entropy',        label: 'Grid/Org'   },
  { key: 'building_density',    label: 'Buildings'  },
  { key: 'building_regularity', label: 'Regularity' },
  { key: 'water_coverage',      label: 'Water'      },
  { key: 'river_density',       label: 'Rivers'     },
  { key: 'elevation_variance',  label: 'Elevation'  },
  { key: 'green_ratio',         label: 'Green'      },
];

const N = AXES.length;
const TWO_PI = Math.PI * 2;

function getStyles() {
  const root = getComputedStyle(document.documentElement);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    accent:    root.getPropertyValue('--accent').trim()        || '#1a3a6e',
    muted:     root.getPropertyValue('--text-muted').trim()    || '#9a9890',
    secondary: root.getPropertyValue('--text-secondary').trim()|| '#5a5950',
    primary:   root.getPropertyValue('--text-primary').trim()  || '#1a1914',
    grid:      dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    fill:      dark ? 'rgba(74,128,212,0.18)'  : 'rgba(26,58,110,0.12)',
  };
}

export function drawRadar(canvas, vector) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.getBoundingClientRect().width || 240;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const R  = size / 2 - 28;
  const styles = getStyles();

  ctx.clearRect(0, 0, size, size);

  // Grid rings
  [0.25, 0.5, 0.75, 1].forEach(t => {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const angle = (TWO_PI / N) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * R * t;
      const y = cy + Math.sin(angle) * R * t;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = styles.grid;
    ctx.lineWidth = t === 1 ? 1 : 0.5;
    ctx.stroke();
  });

  // Axis spokes
  for (let i = 0; i < N; i++) {
    const angle = (TWO_PI / N) * i - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
    ctx.strokeStyle = styles.grid;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Data polygon
  if (vector) {
    ctx.beginPath();
    AXES.forEach(({ key }, i) => {
      const val   = Math.min(1, Math.max(0, vector[key] || 0));
      const angle = (TWO_PI / N) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * R * val;
      const y = cy + Math.sin(angle) * R * val;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = styles.fill;
    ctx.fill();
    ctx.strokeStyle = styles.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Data points
    AXES.forEach(({ key }, i) => {
      const val   = Math.min(1, Math.max(0, vector[key] || 0));
      const angle = (TWO_PI / N) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * R * val;
      const y = cy + Math.sin(angle) * R * val;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TWO_PI);
      ctx.fillStyle = styles.accent;
      ctx.fill();
    });
  }

  // Axis labels
  const LABEL_PAD = 14;
  ctx.font = `600 9px 'Syne', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = styles.secondary;

  AXES.forEach(({ label }, i) => {
    const angle = (TWO_PI / N) * i - Math.PI / 2;
    const lx = cx + Math.cos(angle) * (R + LABEL_PAD);
    const ly = cy + Math.sin(angle) * (R + LABEL_PAD);
    ctx.fillText(label.toUpperCase(), lx, ly);
  });
}

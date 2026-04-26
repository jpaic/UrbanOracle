import { useEffect, useRef } from 'react';
import { drawRadar } from '../utils/radar';

const RADAR_RANGES = {
  road_density:        { min: 0, max: 5   },
  road_entropy:        { min: 0, max: 6   },
  building_density:    { min: 0, max: 20  },
  building_regularity: { min: 0, max: 1   },
  water_coverage:      { min: 0, max: 1   },
  elevation_variance:  { min: 0, max: 100 },
  green_space_ratio:   { min: 0, max: 1   },
  river_density:       { min: 0, max: 3   },
};

function normalizeVector(vector) {
  if (!vector) return null;
  const out = {};
  for (const [key, { min, max }] of Object.entries(RADAR_RANGES)) {
    const raw = vector[key] ?? 0;
    out[key] = Math.min(Math.max((raw - min) / (max - min), 0), 1);
  }
  return out;
}

function ResultCard({ match, rank, onFly, onFlyToSelection, isActive }) {
  const barRef = useRef(null);
  const rankColors = ['var(--match-1)', 'var(--match-2)', 'var(--match-3)'];

  useEffect(() => {
    if (!barRef.current) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        barRef.current.style.width = `${(match.similarity * 100).toFixed(1)}%`;
      });
    });
  }, [match.similarity]);

  return (
    <div
      className={`result-card${isActive ? ' result-card--active' : ''}`}
      style={{ animationDelay: `${(rank - 1) * 0.08}s` }}
      onClick={() => onFly(match)}
    >
      <div className="result-rank" style={{ color: rankColors[rank - 1] }}>
        {String(rank).padStart(2, '0')}
      </div>
      <div className="result-body">
        <div className="result-city">{match.city}</div>
        <div className="result-country">{match.country}</div>
        <div className="result-score-row">
          <div className="result-score-bar-wrap">
            <div
              ref={barRef}
              className="result-score-bar"
              style={{ width: '0%', background: rankColors[rank - 1] }}
            />
          </div>
          <div className="result-score-val">{(match.similarity * 100).toFixed(0)}%</div>
        </div>
        <div className="result-tags">
          {(match.tags || []).map(tag => (
            <span className="result-tag" key={tag}>{tag}</span>
          ))}
        </div>
        <div className="result-btn-row">
          <button
            className="result-fly-btn"
            onClick={e => { e.stopPropagation(); onFly(match); }}
          >
            View on map →
          </button>
          {isActive && (
            <button
              className="result-back-btn"
              onClick={e => { e.stopPropagation(); onFlyToSelection(); }}
            >
              ← Back to selection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RadarPanel({ vector }) {
  const canvasRef = useRef(null);
  const normalized = normalizeVector(vector);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Always redraw — pass null when no data to clear the canvas
    drawRadar(canvas, normalized);
  }, [normalized]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = () => drawRadar(canvas, normalizeVector(vector));
    let t;
    const debounced = () => { clearTimeout(t); t = setTimeout(handler, 150); };
    window.addEventListener('resize', debounced);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handler);
    return () => {
      window.removeEventListener('resize', debounced);
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handler);
    };
  }, [vector]);

  return (
    <div className="panel" id="panel-radar">
      <div className="panel-label">Signature</div>
      <h3 className="panel-title">Urban Profile</h3>
      {/* Fixed-size wrapper prevents canvas from ever changing sidebar height */}
      <div id="radar-wrap" style={{ position: 'relative', width: '240px', height: '240px', margin: '0 auto', flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          id="radar-canvas"
          width="240"
          height="240"
          style={{ display: 'block', width: '240px', height: '240px' }}
        />
        {!vector && (
          <div id="radar-empty-msg" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            Run analysis to see<br />the urban fingerprint
          </div>
        )}
      </div>
    </div>
  );
}

export default function SidebarRight({ matches, vector, onFlyTo, onFlyToSelection, activeCityKey }) {
  return (
    <aside id="sidebar-right">
      <div className="panel" id="panel-results">
        <div className="panel-label">Analysis Output</div>
        <h3 className="panel-title">Similar Cities</h3>

        {!matches || matches.length === 0 ? (
          <div id="results-empty">
            <div className="empty-icon">⬡</div>
            <div className="empty-text">Structural matches will appear here after analysis</div>
          </div>
        ) : (
          <div id="results-list">
            {matches.slice(0, 3).map((match, idx) => (
              <ResultCard
                key={match.city}
                match={match}
                rank={idx + 1}
                onFly={onFlyTo}
                onFlyToSelection={onFlyToSelection}
                isActive={activeCityKey === match.city}
              />
            ))}
          </div>
        )}
      </div>

      <RadarPanel vector={vector} />

      <div className="panel" id="panel-debug">
        <div className="panel-label">Vector</div>
        <h3 className="panel-title">Raw Feature Data</h3>
        <pre className="raw-pre">
          {vector ? JSON.stringify(vector, null, 2) : 'No data yet.'}
        </pre>
      </div>
    </aside>
  );
}
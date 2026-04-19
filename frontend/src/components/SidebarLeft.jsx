const METRIC_DEFS = [
  { key: 'road_density',        icon: '⊕', label: 'Road Density'      },
  { key: 'road_entropy',        icon: '⊗', label: 'Grid vs Organic'   },
  { key: 'building_density',    icon: '▦', label: 'Building Density'  },
  { key: 'building_regularity', icon: '▣', label: 'Layout Regularity' },
  { key: 'water_coverage',      icon: '◌', label: 'Water Coverage'    },
  { key: 'elevation_variance',  icon: '◿', label: 'Elevation Variance'},
  { key: 'green_ratio',         icon: '◉', label: 'Green Space Ratio' },
  { key: 'river_density',       icon: '∿', label: 'River Density'     },
];

export default function SidebarLeft({ vector }) {
  return (
    <aside id="sidebar-left">
      <div className="panel" id="panel-how">
        <div className="panel-label">Method</div>
        <h3 className="panel-title">How it works</h3>
        <ol className="steps-list">
          {[
            'Draw a bounding box on the map over any urban area',
            'Backend extracts road networks, building density, and terrain data via OSM',
            'A feature vector encodes the urban DNA of your selection',
            'ML similarity search returns the 3 most structurally alike cities globally',
          ].map((text, i) => (
            <li key={i}>
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-text">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel" id="panel-features">
        <div className="panel-label">Feature Vector</div>
        <h3 className="panel-title">Urban Metrics</h3>
        <div id="metrics-grid">
          {METRIC_DEFS.map(({ key, icon, label }) => {
            const val = vector ? vector[key] ?? 0 : 0;
            const pct = (val * 100).toFixed(0);
            const active = !!vector;
            return (
              <div className={`metric-chip${active ? ' active' : ''}`} data-key={key} key={key}>
                <div className="metric-icon">{icon}</div>
                <div className="metric-info">
                  <div className="metric-name">{label}</div>
                  <div className="metric-bar-wrap">
                    <div className="metric-bar" style={{ width: active ? `${pct}%` : '0%' }} />
                  </div>
                </div>
                <div className="metric-val">{active ? `${pct}%` : '—'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

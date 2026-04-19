import logo from '../assets/logo.png';

export default function Header({ status, onAnalyze, onClear, analyzeDisabled }) {
  return (
    <header id="header">
      <div id="logo">
        <img src={logo} alt="Logo" className="logo-img" />
        <span className="logo-text">Urban<em>Oracle</em></span>
      </div>

      <div id="header-center">
        <span className="header-tag">Geospatial Intelligence</span>
        <div className="header-divider" />
        <span className="header-status">{status}</span>
      </div>

      <div id="header-actions">
        <button className="btn-ghost" onClick={onClear} title="Clear selection">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Clear
        </button>
        <button className="btn-primary" onClick={onAnalyze} disabled={analyzeDisabled}>
          <span className="btn-icon">⬡</span>
          Analyze Region
        </button>
      </div>
    </header>
  );
}

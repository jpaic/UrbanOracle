import { useEffect, useRef } from 'react';

const CONFIG = {
  DEFAULT_VIEW: { lat: 48.85, lng: 2.35, zoom: 12 },
  MAP_TILES: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  MAP_ATTR: '© <a href="https://carto.com">CARTO</a> © <a href="https://openstreetmap.org">OSM</a>',
};

function calcAreaKm2(bounds) {
  const R  = 6371;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const dLat = ((ne.lat - sw.lat) * Math.PI) / 180;
  const dLng = ((ne.lng - sw.lng) * Math.PI) / 180;
  const latMid = ((sw.lat + ne.lat) / 2 * Math.PI) / 180;
  return R * R * dLat * dLng * Math.cos(latMid);
}

export default function MapView({
  onBboxChange,
  onClear,
  flyTarget,
  loading,
  loadingStage,
  stageStatuses,
  bbox,
  badgeTitle,
  badgeSub,
  coordsText,
  areaText,
  showHint,
}) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const drawnRef   = useRef(null);
  const rectRef    = useRef(null);


  useEffect(() => {
    const L = window.L;
    if (!L || leafletRef.current) return;

    const map = L.map('map', {
      center: [CONFIG.DEFAULT_VIEW.lat, CONFIG.DEFAULT_VIEW.lng],
      zoom:   CONFIG.DEFAULT_VIEW.zoom,
      zoomControl: false,
    });

    L.tileLayer(CONFIG.MAP_TILES, {
      attribution: CONFIG.MAP_ATTR,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: false, polygon: false, circle: false,
        marker: false, circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: '#1a3a6e', weight: 2, opacity: 0.9,
            fillColor: '#1a3a6e', fillOpacity: 0.12,
          },
        },
      },
      edit: { featureGroup: drawnItems, remove: false },
    });
    map.addControl(drawControl);

    document.querySelectorAll('.leaflet-draw-toolbar a, .leaflet-edit-toolbar a').forEach(a => {
      a.removeAttribute('href');
    });

   map.on(L.Draw.Event.DRAWSTART, () => {
    function clearOnDraw() {
      drawnItems.clearLayers();
      rectRef.current = null;
    }

    map.once('mousedown', clearOnDraw);

    map.once(L.Draw.Event.DRAWSTOP, () => {
      map.off('mousedown', clearOnDraw);
    });
  });

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      rectRef.current = e.layer;
      drawnItems.addLayer(e.layer);
      emitBbox(e.layer.getBounds());

      setTimeout(() => {
        document.querySelectorAll('.leaflet-draw-toolbar a, .leaflet-edit-toolbar a').forEach(a => {
          a.removeAttribute('href');
        });
      }, 50);
    });

    map.on(L.Draw.Event.EDITED, () => {
      if (rectRef.current) emitBbox(rectRef.current.getBounds());
    });

    function emitBbox(bounds) {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      onBboxChange({
        minLat: sw.lat.toFixed(5),
        minLng: sw.lng.toFixed(5),
        maxLat: ne.lat.toFixed(5),
        maxLng: ne.lng.toFixed(5),
        areaSqKm: calcAreaKm2(bounds),
      });
    }

    leafletRef.current = map;
  }, []);

  useEffect(() => {
    if (!flyTarget || !leafletRef.current) return;
    if (flyTarget.bbox) {
      // Fly back to the drawn selection
      const { minLat, minLng, maxLat, maxLng } = flyTarget.bbox;
      leafletRef.current.flyToBounds(
        [[minLat, minLng], [maxLat, maxLng]],
        { padding: [40, 40], duration: 1.8 }
      );
    } else {
      leafletRef.current.flyTo([flyTarget.lat, flyTarget.lng], 12, { duration: 1.8 });
    }
  }, [flyTarget]);

  useEffect(() => {
    if (!drawnRef.current) return;
    drawnRef.current.clearLayers();
    rectRef.current = null;
  }, [onClear]);

  const STAGE_LABELS = ['Extract', 'Vectorize', 'Match', 'Rank'];

  return (
    <div id="map-wrap">
      <div id="map-container">
        <div id="map" ref={mapRef} />

        <div id="map-badge">
          <div className="badge-icon">◈</div>
          <div className="badge-content">
            <div className="badge-title">{badgeTitle}</div>
            <div className="badge-sub">{badgeSub}</div>
          </div>
        </div>

        <div id="draw-hint" className={`map-hint${showHint ? '' : ' hidden'}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
          Click the rectangle tool to select an urban area
        </div>

        <div id="loading-overlay" className={loading ? '' : 'hidden'}>
          <div className="loading-inner">
            <div className="loading-spinner">
              <div className="spinner-ring" />
              <div className="spinner-dot">◈</div>
            </div>
            <div className="loading-stage">{loadingStage}</div>
            <div className="loading-stages-track">
              {STAGE_LABELS.map((label, i) => (
                <div key={label} style={{ display: 'contents' }}>
                  <div className={`stage-item${
                    stageStatuses[i] === 'active' ? ' active' :
                    stageStatuses[i] === 'done'   ? ' done'   : ''
                  }`}>
                    {label}
                  </div>
                  {i < STAGE_LABELS.length - 1 && <div className="stage-line" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="selection-bar">
        <div id="selection-coords">
          <span className="coords-label">Bbox</span>
          <span>{coordsText}</span>
        </div>
        <div id="selection-area">
          <span className="coords-label">Area</span>
          <span>{areaText}</span>
        </div>
        {!bbox && (
          <div id="selection-hint">
            Use the <kbd>□</kbd> tool on the map to draw a selection
          </div>
        )}
      </div>
    </div>
  );
}
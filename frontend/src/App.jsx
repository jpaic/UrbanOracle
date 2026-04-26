import { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import SidebarLeft from './components/SidebarLeft';
import MapView from './components/MapView';
import SidebarRight from './components/SidebarRight';
import { mockAnalyze } from './utils/mock';
import { analyzeRegion, fetchSimilarCities } from './services/api';

const USE_MOCK = false;

const INITIAL_STAGE_STATUSES = ['idle', 'idle', 'idle', 'idle'];

export default function App() {
  const [bbox, setBbox]             = useState(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [vector, setVector]         = useState(null);
  const [matches, setMatches]       = useState(null);
  const [status, setStatus]         = useState('Select a region to begin analysis');
  const [badgeTitle, setBadgeTitle] = useState('No selection');
  const [badgeSub, setBadgeSub]     = useState('Draw a box to begin');
  const [coordsText, setCoordsText] = useState('—');
  const [areaText, setAreaText]     = useState('—');
  const [showHint, setShowHint]     = useState(true);
  const [loadingStage, setLoadingStage] = useState('');
  const [stageStatuses, setStageStatuses] = useState(INITIAL_STAGE_STATUSES);
  const [flyTarget, setFlyTarget]   = useState(null);
  const [activeCityKey, setActiveCityKey] = useState(null);
  const clearTrigger = useRef(0);
  const abortRef = useRef(null);

  const handleBboxChange = useCallback((b) => {
    setBbox(b);
    const { minLat, minLng, maxLat, maxLng, areaSqKm } = b;
    setCoordsText(`[${minLng}, ${minLat}, ${maxLng}, ${maxLat}]`);
    setAreaText(`${areaSqKm.toFixed(2)} km²`);
    setBadgeTitle('Region selected');
    setBadgeSub(`${areaSqKm.toFixed(1)} km² · Ready to analyze`);
    setStatus('Region selected — click Analyze to extract urban features');
    setShowHint(false);
    resetResults();
  }, []);

  function resetResults() {
    setVector(null);
    setMatches(null);
    setActiveCityKey(null);
  }

  function handleClear() {
    clearTrigger.current += 1;
    abortRef.current?.abort();
    setBbox(null);
    setCoordsText('—');
    setAreaText('—');
    setBadgeTitle('No selection');
    setBadgeSub('Draw a box to begin');
    setStatus('Select a region to begin analysis');
    setShowHint(true);
    resetResults();
  }

  async function handleAnalyze() {
    if (!bbox || analyzing) return;
    abortRef.current = new AbortController();
    setAnalyzing(true);
    setStatus('Analyzing urban structure…');
    setStageStatuses(INITIAL_STAGE_STATUSES);
    setLoadingStage('Extracting OSM data…');
    resetResults();

    try {
      const onStage = (idx, label, st) => {
        setLoadingStage(label);
        setStageStatuses(prev => {
          const next = [...prev];
          next[idx] = st;
          return next;
        });
      };

      const result = USE_MOCK
        ? await mockAnalyze(bbox, onStage, abortRef.current.signal)
        : await (async () => {
            onStage(0, 'Extracting OSM data…', 'active');
            const { features } = await analyzeRegion([bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng]);
            onStage(0, 'Extracting OSM data…', 'done');

            onStage(1, 'Building feature vector…', 'active');
            onStage(1, 'Building feature vector…', 'done');

            onStage(2, 'Running similarity search…', 'active');
            const { results } = await fetchSimilarCities(features, 3); // top 3 only
            onStage(2, 'Running similarity search…', 'done');

            onStage(3, 'Ranking matches…', 'active');
            const matches = results.map((r, i) => ({
              rank: i + 1,
              city: r.name,
              country: '',
              similarity: r.similarity_score,
              lat: r.lat,
              lng: r.lon,
              tags: [],
            }));
            onStage(3, 'Ranking matches…', 'done');

            return { vector: features, matches };
          })();

      setVector(result.vector);
      setMatches(result.matches);
      setStatus(`Analysis complete — ${result.matches.length} structural matches found`);
      setBadgeTitle('Analysis done');
      setBadgeSub(`Top match: ${result.matches[0]?.city}`);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Analysis failed:', err);
      setStatus('Analysis failed — check backend connection');
      setBadgeSub('Error: ' + (err.message || 'Unknown error'));
    } finally {
      abortRef.current = null;
      await new Promise(r => setTimeout(r, 50));
      setAnalyzing(false);
    }
  }

  function handleFlyTo(match) {
    setFlyTarget({ lat: match.lat, lng: match.lng, _t: Date.now() });
    setActiveCityKey(match.city);
    setBadgeTitle(match.city);
    setBadgeSub(`${(match.similarity * 100).toFixed(0)}% structural match`);
  }

  function handleFlyToSelection() {
    if (!bbox) return;
    setFlyTarget({ bbox, _t: Date.now() });
    setActiveCityKey(null);
    setBadgeTitle('Region selected');
    setBadgeSub(`${parseFloat(areaText).toFixed(1)} km² · Your selection`);
  }

  return (
    <div id="app">
      <Header
        status={status}
        onAnalyze={handleAnalyze}
        onClear={handleClear}
        analyzeDisabled={!bbox || analyzing}
      />
      <div id="body">
        <SidebarLeft vector={vector} />
        <MapView
          onBboxChange={handleBboxChange}
          onClear={clearTrigger.current}
          flyTarget={flyTarget}
          loading={analyzing}
          loadingStage={loadingStage}
          stageStatuses={stageStatuses}
          bbox={bbox}
          badgeTitle={badgeTitle}
          badgeSub={badgeSub}
          coordsText={coordsText}
          areaText={areaText}
          showHint={showHint}
        />
        <SidebarRight
          matches={matches}
          vector={vector}
          onFlyTo={handleFlyTo}
          onFlyToSelection={handleFlyToSelection}
          activeCityKey={activeCityKey}
        />
      </div>
    </div>
  );
}
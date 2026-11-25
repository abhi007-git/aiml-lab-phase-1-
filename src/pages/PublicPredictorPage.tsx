import React, { useEffect, useState } from 'react';
import {
  PredictionData,
  PredictionGaugeAndSummary,
} from '../components/PredictionOutcome';

interface OptionsResponse {
  years: number[];
  lats: number[];
  lons: number[];
}

interface PublicRecord {
  grid_lat: number;
  grid_lon: number;
  year: number;
  eq_count_3yr: number;
  eq_count_1yr: number;
  mean_mag_3yr: number;
  max_mag_3yr: number;
  mean_depth_3yr: number;
  seismic_energy_3yr: number;
  seismic_energy_1yr: number;
  freq_trend: number;
  mag_trend: number;
}

export const PublicPredictorPage: React.FC = () => {
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [year, setYear] = useState<number>(2011);
  const [lat, setLat] = useState<number>(38);
  const [lon, setLon] = useState<number>(141);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    record?: PublicRecord;
    prediction?: PredictionData;
  } | null>(null);

  useEffect(() => {
    fetch('/api/predictor/options')
      .then((r) => r.json())
      .then((opts: OptionsResponse) => {
        setOptions(opts);
        if (opts.years.length && !opts.years.includes(year)) setYear(opts.years[0]);
        if (opts.lats.length && !opts.lats.includes(lat)) setLat(opts.lats[0]);
        if (opts.lons.length && !opts.lons.includes(lon)) setLon(opts.lons[0]);
      });
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/predictor/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, lat, lon }),
      });
      const json = await res.json();
      setResult(json);
    } finally {
      setLoading(false);
    }
  };

  if (!options) {
    return <div className="cmd-panel">Loading geological coordinate index...</div>;
  }

  return (
    <div className="fade-in-view">
      <div className="cmd-panel-header">PUBLIC SEISMIC RISK PREDICTOR</div>

      <div className="context-callout">
        <strong>What does this mean?</strong> Select a prediction year and region coordinates to
        automatically load historical seismic profiles. The trained Random Forest model will
        evaluate these parameters to generate a fresh seismic risk prediction.
      </div>

      <div className="three-col" style={{ marginBottom: 14 }}>
        <div>
          <label className="field-label">Prediction Year</label>
          <select
            className="select-input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {options.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Latitude</label>
          <select
            className="select-input"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
          >
            {options.lats.map((la) => (
              <option key={la} value={la}>
                {la}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Longitude</label>
          <select
            className="select-input"
            value={lon}
            onChange={(e) => setLon(Number(e.target.value))}
          >
            {options.lons.map((lo) => (
              <option key={lo} value={lo}>
                {lo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="primary-btn" onClick={handlePredict} disabled={loading}>
        {loading ? 'Predicting...' : 'Predict Risk'}
      </button>

      {result && !result.found && (
        <div
          style={{
            backgroundColor: '#FDF2F0',
            border: '1px solid #C0392B',
            borderLeft: '4px solid #C0392B',
            padding: 12,
            borderRadius: 6,
            fontSize: '0.88rem',
            color: '#C0392B',
            marginTop: 15,
          }}
        >
          No historical seismic record found for the selected Year, Latitude, and Longitude. Please
          select another available location.
        </div>
      )}

      {result && result.found && result.record && result.prediction && (
        <>
          <div className="cmd-panel" style={{ marginTop: 16 }}>
            <div className="section-subhead" style={{ marginBottom: 12 }}>
              Historical Seismic Profile
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <tbody>
                {[
                  [
                    'Location',
                    `Grid Centroid: ${result.record.grid_lat}°N, ${result.record.grid_lon}°E`,
                  ],
                  ['Prediction Year', String(result.record.year)],
                  ['Earthquake Count (3 Years)', String(result.record.eq_count_3yr)],
                  ['Earthquake Count (1 Year)', String(result.record.eq_count_1yr)],
                  ['Mean Magnitude', result.record.mean_mag_3yr.toFixed(2)],
                  ['Maximum Magnitude', result.record.max_mag_3yr.toFixed(2)],
                  ['Mean Depth', `${result.record.mean_depth_3yr.toFixed(2)} km`],
                  [
                    'Seismic Energy (3 Years)',
                    `${result.record.seismic_energy_3yr.toExponential(2)} J`,
                  ],
                  [
                    'Seismic Energy (1 Year)',
                    `${result.record.seismic_energy_1yr.toExponential(2)} J`,
                  ],
                  ['Frequency Trend', result.record.freq_trend.toFixed(4)],
                  [
                    'Magnitude Trend',
                    `${result.record.mag_trend >= 0 ? '+' : ''}${result.record.mag_trend.toFixed(4)}`,
                  ],
                ].map(([label, val]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #DAD6CC' }}>
                    <td style={{ padding: '7px 0', fontWeight: 600 }}>{label}</td>
                    <td
                      className="mono"
                      style={{ padding: '7px 0', textAlign: 'right', color: '#0F4C81' }}
                    >
                      {val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="two-col">
            <PredictionGaugeAndSummary prediction={result.prediction} titleLabel="Predicted Risk:" />
          </div>

          <div
            className="cmd-panel"
            style={{
              borderLeft: '4px solid #0F4C81',
              backgroundColor: '#FFFFFF',
              fontSize: '0.82rem',
              marginTop: 12,
            }}
          >
            <span className="badge-med" style={{ marginRight: 10 }}>
              IN DEVELOPMENT
            </span>
            <b>Local SHAP Feature Attribution:</b> Per-feature contribution charts and natural-language
            explanations for individual predictions are currently under development.
          </div>
        </>
      )}
    </div>
  );
};

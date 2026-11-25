import React, { useEffect, useState } from 'react';
import { PlotlyChart } from '../components/PlotlyChart';
import {
  PredictionData,
  PredictionGaugeAndSummary,
} from '../components/PredictionOutcome';

interface PerformanceResponse {
  confusionMatrix: number[][];
  classes: string[];
  classMetrics: { className: string; precision: number; recall: number; f1: number }[];
}

export const PredictWorkstationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'perf' | 'weights'>('live');
  const [inputs, setInputs] = useState({
    grid_lat: 36,
    grid_lon: 141,
    year: 2023,
    eq_count_3yr: 30,
    eq_count_1yr: 10,
    mean_mag_3yr: 4.5,
    max_mag_3yr: 5.5,
    mean_depth_3yr: 30,
    seismic_energy_3yr: 5e8,
    seismic_energy_1yr: 1e8,
    freq_trend: 1.5,
    mag_trend: 0.1,
  });

  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [perf, setPerf] = useState<PerformanceResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/predictor/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then(setPrediction)
      .catch(() => {});
    return () => controller.abort();
  }, [inputs]);

  useEffect(() => {
    if (activeTab === 'perf' && !perf) {
      fetch('/api/predictor/performance')
        .then((r) => r.json())
        .then(setPerf);
    }
  }, [activeTab, perf]);

  const updateField = (key: keyof typeof inputs, val: number) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="fade-in-view">
      <div className="cmd-panel-header">SEISMOAI PREDICTION WORKSTATION</div>

      <div className="context-callout">
        <strong>What does this mean?</strong> Adjust the sliding controls representing geological
        parameters (like hypocenter depth, historical counts, or energy trends) to forecast local
        seismic threat levels using our trained Random Forest model.
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          LIVE PREDICTOR
        </button>
        <button
          className={`tab-btn ${activeTab === 'perf' ? 'active' : ''}`}
          onClick={() => setActiveTab('perf')}
        >
          ENSEMBLE PERFORMANCE
        </button>
        <button
          className={`tab-btn ${activeTab === 'weights' ? 'active' : ''}`}
          onClick={() => setActiveTab('weights')}
        >
          FEATURE WEIGHTINGS
        </button>
      </div>

      {activeTab === 'live' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.25fr)',
              gap: '1.25rem',
            }}
          >
            <div className="cmd-panel">
              <div className="section-subhead">GEOLOGICAL ATTRIBUTES (A)</div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Latitude Index (°N)</span>
                  <span className="mono">{inputs.grid_lat}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={24}
                  max={46}
                  step={1}
                  value={inputs.grid_lat}
                  onChange={(e) => updateField('grid_lat', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Longitude Index (°E)</span>
                  <span className="mono">{inputs.grid_lon}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={122}
                  max={149}
                  step={1}
                  value={inputs.grid_lon}
                  onChange={(e) => updateField('grid_lon', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Simulation Year</span>
                  <span className="mono">{inputs.year}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={2000}
                  max={2024}
                  step={1}
                  value={inputs.year}
                  onChange={(e) => updateField('year', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>3Yr Event Count</span>
                  <span className="mono">{inputs.eq_count_3yr}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={0}
                  max={200}
                  step={1}
                  value={inputs.eq_count_3yr}
                  onChange={(e) => updateField('eq_count_3yr', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <label className="field-label">3Yr Energy Index (J)</label>
                <input
                  type="number"
                  className="number-input mono"
                  value={inputs.seismic_energy_3yr}
                  onChange={(e) => updateField('seismic_energy_3yr', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Frequency Trend Index</span>
                  <span className="mono">{inputs.freq_trend.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={-5}
                  max={30}
                  step={0.1}
                  value={inputs.freq_trend}
                  onChange={(e) => updateField('freq_trend', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="cmd-panel">
              <div className="section-subhead">GEOLOGICAL ATTRIBUTES (B)</div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>1Yr Event Count</span>
                  <span className="mono">{inputs.eq_count_1yr}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={0}
                  max={100}
                  step={1}
                  value={inputs.eq_count_1yr}
                  onChange={(e) => updateField('eq_count_1yr', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Mean Hypocenter Depth (km)</span>
                  <span className="mono">{inputs.mean_depth_3yr}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={0}
                  max={250}
                  step={1}
                  value={inputs.mean_depth_3yr}
                  onChange={(e) => updateField('mean_depth_3yr', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Mean Magnitude (3yr)</span>
                  <span className="mono">{inputs.mean_mag_3yr.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={4.0}
                  max={7.0}
                  step={0.1}
                  value={inputs.mean_mag_3yr}
                  onChange={(e) => updateField('mean_mag_3yr', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Maximum Magnitude (3yr)</span>
                  <span className="mono">{inputs.max_mag_3yr.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={4.0}
                  max={9.0}
                  step={0.1}
                  value={inputs.max_mag_3yr}
                  onChange={(e) => updateField('max_mag_3yr', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <label className="field-label">1Yr Energy Index (J)</label>
                <input
                  type="number"
                  className="number-input mono"
                  value={inputs.seismic_energy_1yr}
                  onChange={(e) => updateField('seismic_energy_1yr', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Magnitude Trend Delta</span>
                  <span className="mono">{inputs.mag_trend.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min={-2.0}
                  max={2.0}
                  step={0.05}
                  value={inputs.mag_trend}
                  onChange={(e) => updateField('mag_trend', Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <div className="section-subhead">PREDICTION TELEMETRY</div>
              {prediction ? (
                <PredictionGaugeAndSummary
                  prediction={prediction}
                  titleLabel="Output State Classification:"
                />
              ) : (
                <div className="cmd-panel">Computing Random Forest inference...</div>
              )}
            </div>
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
            <b>Local SHAP Feature Attribution:</b> Live local feature-impact breakdown for custom
            slider simulations is currently under development.
          </div>
        </div>
      )}

      {activeTab === 'perf' && (
        <div>
          {!perf ? (
            <div className="cmd-panel">Evaluating chronological test performance (2019–2024)...</div>
          ) : (
            <>
              <div className="section-subhead">MODEL PERFORMANCE ASSESSMENT</div>
              <div className="two-col" style={{ marginBottom: 16 }}>
                <div className="cmd-panel">
                  <PlotlyChart
                    data={[
                      {
                        type: 'heatmap',
                        z: perf.confusionMatrix,
                        x: perf.classes,
                        y: perf.classes,
                        colorscale: [
                          [0, '#F1ECE2'],
                          [0.5, '#3A7CA5'],
                          [1, '#0F4C81'],
                        ],
                        showscale: false,
                        text: perf.confusionMatrix.map((row) => row.map((v) => String(v))),
                        texttemplate: '%{text}',
                        textfont: { size: 13, family: 'Inter' },
                      },
                    ]}
                    layout={{
                      title: {
                        text: 'Confusion Matrix',
                        font: { color: '#2C3E50', family: 'Inter', size: 14 },
                      },
                      xaxis: { title: 'Predicted State' },
                      yaxis: { title: 'Actual State', autorange: 'reversed' },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)',
                      margin: { t: 50, b: 50, l: 70, r: 20 },
                      height: 300,
                    }}
                  />
                </div>

                <div>
                  <div className="section-subhead">METRICS DESCRIPTORS</div>
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Class</th>
                          <th>Precision</th>
                          <th>Recall</th>
                          <th>F1-Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {perf.classMetrics.map((m) => (
                          <tr key={m.className}>
                            <td>{m.className}</td>
                            <td>{(m.precision * 100).toFixed(2)}%</td>
                            <td>{(m.recall * 100).toFixed(2)}%</td>
                            <td>{(m.f1 * 100).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div
                className="cmd-panel"
                style={{
                  borderLeft: '4px solid #0F4C81',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.82rem',
                }}
              >
                <span className="badge-med" style={{ marginRight: 10 }}>
                  IN DEVELOPMENT
                </span>
                <b>Baseline Classifier Benchmarking &amp; Historical Landmark Validation:</b>{' '}
                Multi-model comparison (Logistic Regression, Decision Tree vs. Random Forest) and
                landmark backtesting (Tohoku 2011, Kumamoto 2016, Noto 2024) are currently under
                development.
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'weights' && (
        <div
          className="cmd-panel"
          style={{
            borderLeft: '4px solid #0F4C81',
            backgroundColor: '#FFFFFF',
            fontSize: '0.85rem',
            lineHeight: 1.6,
          }}
        >
          <span className="badge-med" style={{ marginBottom: 10 }}>
            IN DEVELOPMENT
          </span>
          <div style={{ marginTop: 8 }}>
            <b>Gini Feature Importance Matrix &amp; SHAP Rank Comparison:</b> Feature weighting
            visualizations are currently under development.
          </div>
        </div>
      )}
    </div>
  );
};

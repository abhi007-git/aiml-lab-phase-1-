import React from 'react';

export type PageKey =
  | 'overview'
  | 'public_predict'
  | 'predict'
  | 'map'
  | 'clusters'
  | 'anomalies'
  | 'shap'
  | 'route';

export const RightIntelPanel: React.FC<{ page: PageKey }> = ({ page }) => {
  return (
    <aside className="intel-col">
      <div className="cmd-panel-header">INTELLIGENCE TELEMETRY</div>

      {page === 'overview' && (
        <>
          <div className="cmd-panel">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F4C81', marginBottom: 8 }}>
              MONITOR REGISTER
            </div>
            <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.55 }}>
              ● Database State: Active
              <br />● Total Records: 29,951 events
              <br />● Grid Coverage: 356 Deg²
              <br />● Target Backtests: 8,188 Yrs
              <br />● Heuristic Index: P50 / P85
            </div>
          </div>
          <div className="cmd-panel">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C0392B', marginBottom: 8 }}>
              ACTIVE ALERTS
            </div>
            <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.55 }}>
              ● Tohoku Region: High Hazard
              <br />● Noto Peninsula: Swarm Anomaly
              <br />● RF Predictor: Operational
              <br />● Evacuation Routing: In Development
            </div>
          </div>
        </>
      )}

      {page === 'public_predict' && (
        <div className="cmd-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F4C81', marginBottom: 8 }}>
            PUBLIC PREDICTOR BRIEFING
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.5 }}>
            <b>Historical Profile Auto-Retrieval:</b>
            <br />
            This interface retrieves historical geological stress variables automatically based on
            the selected year and coordinates.
            <br />
            <br />
            <b>Model Execution:</b>
            <br />
            The trained Random Forest model processes the retrieved features to generate a fresh
            risk classification, rather than showing stored labels.
          </div>
        </div>
      )}

      {page === 'predict' && (
        <div className="cmd-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F4C81', marginBottom: 8 }}>
            PREDICTION BRIEFING
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.5 }}>
            <b>Regional Stress Assessment:</b>
            <br />
            The prediction model identifies seismic load characteristics driven by cumulative 3-year
            event counts and historical energy indices.
            <br />
            <br />
            <b>Methodology:</b>
            <br />A Random Forest classifier analyzes multi-scale rolling temporal inputs against
            historical plate-boundary profiles to project the subsequent year risk.
          </div>
        </div>
      )}

      {page === 'map' && (
        <>
          <div className="cmd-panel">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F4C81', marginBottom: 8 }}>
              H3 GRID METRICS
            </div>
            <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.55 }}>
              ● Grid Resolution: Level 5
              <br />● Hexagon Area: ~2,525 km²
              <br />● Risk Thresholds:
              <br />
              &nbsp;&nbsp;- <span style={{ color: '#C0392B', fontWeight: 700 }}>High</span>: P &gt;
              85%
              <br />
              &nbsp;&nbsp;- <span style={{ color: '#D99A00', fontWeight: 700 }}>Medium</span>: P
              50-85%
              <br />
              &nbsp;&nbsp;- <span style={{ color: '#2E8B57', fontWeight: 700 }}>Low</span>: P &lt;
              50%
            </div>
          </div>
          <div className="cmd-panel">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3A7CA5', marginBottom: 8 }}>
              TIME-LAPSE CONTROLS
            </div>
            <div style={{ fontSize: '0.8rem', color: '#5D6D7E', lineHeight: 1.5 }}>
              Use the controls on the left to trigger the automatic time-lapse player to visualize
              tectonic stress accumulation trends.
            </div>
          </div>
        </>
      )}

      {page === 'clusters' && (
        <div className="cmd-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F4C81', marginBottom: 8 }}>
            TECTONIC ZONATION
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.5 }}>
            K-Means clustering will categorize locations into 4 structural seismic profiles based on
            depth, energy, and count features. Visualization is currently under development.
          </div>
        </div>
      )}

      {page === 'anomalies' && (
        <div className="cmd-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E67E22', marginBottom: 8 }}>
            ANOMALY OBSERVATION
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.5 }}>
            Isolation Forest outlier detection will isolate foreshock/aftershock swarms and historic
            rupture events. Interactive mapping is currently under development.
          </div>
        </div>
      )}

      {page === 'shap' && (
        <div className="cmd-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F4C81', marginBottom: 8 }}>
            FEATURE EXPLAINABILITY
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.5 }}>
            SHAP attribution plots explaining how individual features push predictions away from
            model base values are currently under development.
          </div>
        </div>
      )}

      {page === 'route' && (
        <div className="cmd-panel">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3A7CA5', marginBottom: 8 }}>
            PATHFINDING CRITERIA
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2C3E50', lineHeight: 1.5 }}>
            Risk-weighted A* evacuation routing across H3 cells is currently under development.
          </div>
        </div>
      )}
    </aside>
  );
};

import React, { useState } from 'react';
import { PageKey, RightIntelPanel } from './components/RightIntelPanel';
import { InDevelopmentView } from './components/InDevelopmentView';
import { OverviewPage } from './pages/OverviewPage';
import { PublicPredictorPage } from './pages/PublicPredictorPage';
import { PredictWorkstationPage } from './pages/PredictWorkstationPage';
import { H3MapPage } from './pages/H3MapPage';

const NAV_ITEMS: { key: PageKey; icon: string; name: string }[] = [
  { key: 'overview', icon: '◆', name: 'Overview' },
  { key: 'public_predict', icon: '◎', name: 'Public Risk Predictor' },
  { key: 'predict', icon: '⌥', name: 'Predict Workstation' },
  { key: 'map', icon: '⛯', name: 'H3 Geospatial' },
  { key: 'clusters', icon: '❖', name: 'Tectonic Profiles' },
  { key: 'anomalies', icon: '▲', name: 'Anomaly Threat' },
  { key: 'shap', icon: '⧇', name: 'SHAP AI Explain' },
  { key: 'route', icon: '⌬', name: 'A* Evacuation' },
];

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageKey>('overview');

  return (
    <div className="app-shell">
      <aside className="sidebar-rail">
        <div className="sidebar-logo-container">
          <div className="sidebar-logo-icon-box">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F4C81"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 9h20M2 15h20" />
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-title">SeismoAI</div>
          </div>
        </div>

        <div className="sidebar-section-header">PRIMARY MODULES</div>

        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
            >
              <span>
                {item.icon}&nbsp;&nbsp;{item.name}
              </span>
              {isActive && <span className="nav-btn-dot">●</span>}
            </button>
          );
        })}
      </aside>

      <div className="workspace-grid">
        <main className="main-col">
          {activePage === 'overview' && <OverviewPage />}
          {activePage === 'public_predict' && <PublicPredictorPage />}
          {activePage === 'predict' && <PredictWorkstationPage />}
          {activePage === 'map' && <H3MapPage />}

          {activePage === 'clusters' && (
            <InDevelopmentView
              moduleTitle="TECTONIC ZONATION MATRIX"
              summary="Unsupervised K-Means clustering for partitioning Japan's seismic grid into four tectonic profiles (Quiet Crustal, Active Plate Boundary, Deep Subduction, Tohoku Hotspot) is currently under development."
              plannedTasks={[
                { title: 'Standardized Feature Pipeline (Count, Mag, Depth, Energy)', status: 'Data Ready' },
                { title: 'K-Means Tectonic Zonation Scatter Map', status: 'In Progress' },
                { title: 'Multi-Zone Radar Profile Comparisons & Dossiers', status: 'Pending' },
                { title: 'Elbow Method (WCSS) & Silhouette Validation Curves', status: 'Pending' },
              ]}
            />
          )}

          {activePage === 'anomalies' && (
            <InDevelopmentView
              moduleTitle="THREAT ANOMALY CENTER"
              summary="Isolation Forest outlier detection to identify anomalous seismic region-years and foreshock/aftershock swarms is currently under development."
              plannedTasks={[
                { title: 'Isolation Forest Contamination Scoring Pipeline', status: 'Data Ready' },
                { title: 'Geographic Anomaly Severity Distribution Map', status: 'In Progress' },
                { title: 'Top Critical Anomalies & USGS Historical Cross-Reference', status: 'Pending' },
              ]}
            />
          )}

          {activePage === 'shap' && (
            <InDevelopmentView
              moduleTitle="MODEL EXPLAINABILITY CENTER"
              summary="Global and local SHAP (SHapley Additive exPlanations) attribution analysis for interpreting Random Forest seismic risk predictions is currently under development."
              plannedTasks={[
                { title: 'TreeSHAP Multi-Class Feature Attribution Engine', status: 'In Progress' },
                { title: 'Global SHAP Stacked Bar Matrix (High / Medium / Low)', status: 'Pending' },
                { title: 'Local Prediction Attribution Charts', status: 'Pending' },
                { title: 'SHAP Density Distribution Summary Visualization', status: 'Pending' },
              ]}
            />
          )}

          {activePage === 'route' && (
            <InDevelopmentView
              moduleTitle="TACTICAL EVACUATION ROUTER"
              summary="Risk-weighted A* pathfinding across Uber H3 Resolution 5 hexagonal cells to compare Shortest vs. Safest evacuation corridors between Japanese cities is currently under development."
              plannedTasks={[
                { title: 'H3 Resolution 5 Adjacency Graph Construction', status: 'Data Ready' },
                { title: 'Risk-Weighted A* Cost Heuristic (1x / 5x / 20x)', status: 'In Progress' },
                { title: 'City-to-City Evacuation Corridor Comparison Map', status: 'Pending' },
                { title: 'Route Risk Breakdown & High-Hazard Evasion Metrics', status: 'Pending' },
              ]}
            />
          )}
        </main>

        <RightIntelPanel page={activePage} />
      </div>
    </div>
  );
};

export default App;

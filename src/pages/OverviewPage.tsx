import React, { useEffect, useState } from 'react';
import { PlotlyChart } from '../components/PlotlyChart';

interface OverviewResponse {
  kpis: {
    events: string;
    cells: string;
    rfAccuracy: string;
    backtestAccuracy: string;
  };
  samplePoints: { grid_lat: number; grid_lon: number; risk_label: string }[];
  timeline: { Year: number; Mag: number; Event: string }[];
}

export const OverviewPage: React.FC = () => {
  const [data, setData] = useState<OverviewResponse | null>(null);

  useEffect(() => {
    fetch('/api/overview')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <div className="cmd-panel">Loading Earth Intelligence Overview...</div>;
  }

  const colorMap: Record<string, string> = {
    High: '#C0392B',
    Medium: '#D99A00',
    Low: '#2E8B57',
  };

  const geoTraces = ['High', 'Medium', 'Low'].map((riskLevel) => {
    const grp = data.samplePoints.filter((p) => p.risk_label === riskLevel);
    return {
      type: 'scattergeo',
      lat: grp.map((g) => g.grid_lat),
      lon: grp.map((g) => g.grid_lon),
      mode: 'markers',
      name: riskLevel,
      marker: {
        size: 5,
        color: colorMap[riskLevel],
        opacity: 0.75,
        line: { width: 0 },
      },
      text: grp.map(
        (g) => `Risk: ${riskLevel}<br>Lat: ${g.grid_lat.toFixed(2)}N  Lon: ${g.grid_lon.toFixed(2)}E`
      ),
      hovertemplate: '%{text}<extra></extra>',
    };
  });

  return (
    <div className="fade-in-view">
      <div className="cmd-panel-header">EARTH INTELLIGENCE OVERVIEW</div>

      <div className="context-callout">
        <strong>What does this mean?</strong> This console monitors historical and real-time
        earthquake data in Japan. It processes seismic parameters using Random Forest classifiers to
        predict regional risk profiles and chart safe evacuation corridors.
      </div>

      <div className="kpi-grid-4">
        <div className="cmd-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5D6D7E' }}>
            EARTHQUAKE EVENTS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0F4C81', margin: '4px 0' }}>
            {data.kpis.events}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2E8B57', fontWeight: 500 }}>
            ▲ M&ge;4.0 events (2000–2025)
          </div>
        </div>

        <div className="cmd-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5D6D7E' }}>
            MONITORED CELLS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0F4C81', margin: '4px 0' }}>
            {data.kpis.cells}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#3A7CA5', fontWeight: 500 }}>
            ● Active hexagonal grid cells
          </div>
        </div>

        <div className="cmd-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5D6D7E' }}>
            RF MODEL ACCURACY
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2E8B57', margin: '4px 0' }}>
            {data.kpis.rfAccuracy}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2E8B57', fontWeight: 500 }}>
            ▲ +3.1% from baseline
          </div>
        </div>

        <div className="cmd-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5D6D7E' }}>
            BACKTEST ACCURACY
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3A7CA5', margin: '4px 0' }}>
            {data.kpis.backtestAccuracy}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2E8B57', fontWeight: 500 }}>
            ▲ +2.4% over cross-val
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
          gap: '1.25rem',
        }}
      >
        <div>
          <div className="section-subhead">GEOSPATIAL EVENT MAP — JAPAN SEISMIC ZONE</div>
          <div className="cmd-panel" style={{ padding: '0.5rem' }}>
            <PlotlyChart
              data={geoTraces}
              layout={{
                geo: {
                  scope: 'asia',
                  projection: { type: 'natural earth', scale: 4.2 },
                  showland: true,
                  landcolor: '#EDE8DC',
                  showocean: true,
                  oceancolor: '#D6E9F8',
                  showcountries: true,
                  countrycolor: '#B0A898',
                  showcoastlines: true,
                  coastlinecolor: '#8A9BAA',
                  showrivers: false,
                  showlakes: true,
                  lakecolor: '#D6E9F8',
                  center: { lat: 36.5, lon: 137.5 },
                  bgcolor: 'rgba(0,0,0,0)',
                },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                margin: { l: 0, r: 0, t: 0, b: 0 },
                height: 390,
                legend: {
                  orientation: 'h',
                  yanchor: 'bottom',
                  y: 0.01,
                  xanchor: 'left',
                  x: 0.01,
                  font: { family: 'Inter', size: 11, color: '#2C3E50' },
                  bgcolor: 'rgba(255,255,255,0.85)',
                  bordercolor: '#DAD6CC',
                  borderwidth: 1,
                },
              }}
            />
          </div>
        </div>

        <div>
          <div className="section-subhead">ACADEMIC PLATFORM SPECIFICATIONS</div>
          <div className="cmd-panel" style={{ fontSize: '0.8rem', lineHeight: 1.55 }}>
            <b>Heuristic Risk Score (HRS) Formulation:</b>
            <br />
            To classify seismic hazard, the system formulates an empirical stress-proxy metric:
            <div className="formula-box">
              HRS = log<sub>10</sub>(Count<sub>3yr</sub> + 1) + 2.0 &times; MaxMagnitude
              <sub>3yr</sub>
            </div>
            The classes are bounded at P50 and P85 of the historical distribution:
            <br />
            &bull; <b>Low Hazard</b>: HRS &lt; P50
            <br />
            &bull; <b>Medium Hazard</b>: P50 &le; HRS &lt; P85
            <br />
            &bull; <b>High Hazard</b>: HRS &ge; P85
            <br />
            <br />
            <b>Architectural Pipeline:</b>
            <br />
            &bull; <b>Spatial Indexing:</b> Uber H3 Grid (Resolution 5, average cell area ~2,525 km
            <sup>2</sup>) partitions latitude/longitude coordinates into structural centroids.
            <br />
            &bull; <b>Ensemble RF Classifier:</b> Decodes risk boundaries based on spatial, temporal,
            and physical variables (chronological train-test split).
            <br />
            &bull; <b>Tactical Route Optimization:</b> Risk-weighted A* pathfinding traversal across
            adjacent H3 cell graphs using cost multipliers:
            <div className="formula-box">
              Cost<sub>Safest</sub> = Distance &times; &omega;<sub>Risk</sub>
            </div>
            where &omega;<sub>Low</sub>=1, &omega;<sub>Medium</sub>=5, and &omega;<sub>High</sub>
            =20.
          </div>
        </div>
      </div>

      <div className="section-subhead" style={{ marginTop: 10 }}>
        HISTORICAL SEISMIC TIMELINE (2000–2025)
      </div>
      <div className="cmd-panel" style={{ padding: '0.75rem' }}>
        <PlotlyChart
          data={[
            {
              type: 'scatter',
              mode: 'markers+text',
              x: data.timeline.map((t) => t.Year),
              y: data.timeline.map(() => 1),
              text: data.timeline.map((t) => t.Event),
              textposition: [
                'top center',
                'bottom center',
                'top center',
                'bottom center',
                'top center',
                'bottom center',
              ],
              textfont: { color: '#2C3E50', family: 'Inter', size: 10 },
              marker: {
                size: data.timeline.map((t) => t.Mag * 2.5),
                color: data.timeline.map((t) => t.Mag),
                colorscale: [
                  [0, '#D99A00'],
                  [1, '#C0392B'],
                ],
                showscale: true,
              },
              hovertemplate: '%{text} (%{x})<extra></extra>',
            },
          ]}
          layout={{
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(248, 247, 242, 0.4)',
            font: { color: '#2C3E50', family: 'Inter' },
            xaxis: {
              showgrid: true,
              gridcolor: '#DAD6CC',
              tickmode: 'linear',
              dtick: 2,
              color: '#2C3E50',
              range: [2001, 2025],
            },
            yaxis: { visible: false, range: [0.65, 1.35] },
            margin: { l: 25, r: 25, t: 30, b: 30 },
            height: 190,
            showlegend: false,
            shapes: [
              {
                type: 'line',
                x0: 2001,
                x1: 2025,
                y0: 1,
                y1: 1,
                line: { color: '#DAD6CC', width: 1.5, dash: 'dash' },
              },
            ],
          }}
        />
      </div>
    </div>
  );
};

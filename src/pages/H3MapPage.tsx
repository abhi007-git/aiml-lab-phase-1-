import React, { useEffect, useMemo, useState } from 'react';
import { HexPolygonItem, LeafletMap } from '../components/LeafletMap';

interface H3Cell {
  h3_cell: string;
  grid_lat: number;
  grid_lon: number;
  year: number;
  predicted_risk_label: string;
  predicted_prob_High: number;
  eq_count_3yr: number;
  seismic_energy_3yr: number;
  mean_depth_3yr: number;
  boundary: [number, number][];
}

interface H3Response {
  years: number[];
  year: number;
  cells: H3Cell[];
}

const RISK_COLORS: Record<string, string> = {
  High: '#C0392B',
  Medium: '#D99A00',
  Low: '#2E8B57',
};

export const H3MapPage: React.FC = () => {
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [riskFilter, setRiskFilter] = useState<string[]>(['High', 'Medium', 'Low']);
  const [cells, setCells] = useState<H3Cell[]>([]);
  const [playbackActive, setPlaybackActive] = useState(false);

  useEffect(() => {
    const risks = riskFilter.join(',');
    fetch(`/api/h3-map?year=${selectedYear}&risks=${encodeURIComponent(risks)}`)
      .then((r) => r.json())
      .then((res: H3Response) => {
        setYears(res.years);
        setCells(res.cells);
      });
  }, [selectedYear, riskFilter]);

  useEffect(() => {
    if (!playbackActive || years.length === 0) return;
    const ascYears = [...years].sort((a, b) => a - b);
    const timer = setInterval(() => {
      setSelectedYear((curr) => {
        const idx = ascYears.indexOf(curr);
        return ascYears[(idx + 1) % ascYears.length];
      });
    }, 900);
    return () => clearInterval(timer);
  }, [playbackActive, years]);

  const toggleRisk = (level: string) => {
    setRiskFilter((prev) =>
      prev.includes(level) ? prev.filter((x) => x !== level) : [...prev, level]
    );
  };

  const polygons: HexPolygonItem[] = useMemo(
    () =>
      cells.map((row) => {
        const color = RISK_COLORS[row.predicted_risk_label] ?? '#64748b';
        return {
          boundary: row.boundary,
          color,
          fillColor: color,
          fillOpacity: 0.45,
          weight: 1,
          popupHtml: `
            <div style="font-family: Inter, sans-serif; color: #2C3E50; font-size: 12px; min-width: 220px;">
              <b style="color: #0F4C81; font-size: 13px;">Hazard Cell: ${row.h3_cell}</b>
              <hr style="border: 0; border-top: 1px solid #DAD6CC; margin: 6px 0;" />
              <div><b>Risk Classification:</b> <span style="color:${color};font-weight:bold;">${row.predicted_risk_label}</span></div>
              <div><b>Coordinates:</b> ${row.grid_lat}°N, ${row.grid_lon}°E</div>
              <div><b>Probability (High):</b> ${(row.predicted_prob_High * 100).toFixed(1)}%</div>
              <div><b>3Yr Event Count:</b> ${Math.round(row.eq_count_3yr)}</div>
              <div><b>3Yr Energy Index:</b> ${row.seismic_energy_3yr.toExponential(2)} J</div>
              <div><b>Avg Hypocenter Depth:</b> ${row.mean_depth_3yr.toFixed(1)} km</div>
            </div>
          `,
        };
      }),
    [cells]
  );

  const legendHtml = `
    <b style="color:#0F4C81;display:block;margin-bottom:6px;">SEISMIC RISK LEVEL</b>
    <span style="color:#C0392B">■</span> High Hazard<br/>
    <span style="color:#D99A00">■</span> Moderate Hazard<br/>
    <span style="color:#2E8B57">■</span> Low Hazard
  `;

  return (
    <div className="fade-in-view">
      <div className="cmd-panel-header">H3 GEOSPATIAL HAZARD GRID MAP</div>

      <div className="context-callout">
        <strong>What does this mean?</strong> This map translates irregular regional coordinate risk
        scores into structured hexagonal units (H3 cells). Click on cells to examine local seismic
        characteristics, and use the year dropdown or play button to watch historical risk
        progression.
      </div>

      <div className="three-col" style={{ alignItems: 'end', marginBottom: 16 }}>
        <div>
          <label className="field-label">Telemetry Sync Year:</label>
          <select
            className="select-input"
            value={selectedYear}
            onChange={(e) => {
              setPlaybackActive(false);
              setSelectedYear(Number(e.target.value));
            }}
          >
            {(years.length ? years : [2024]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            className={playbackActive ? 'secondary-btn' : 'primary-btn'}
            style={{ width: '100%' }}
            onClick={() => setPlaybackActive((p) => !p)}
          >
            {playbackActive ? '⏸ PAUSE TIME-LAPSE' : '▶ START RUN TIME-LAPSE'}
          </button>
        </div>

        <div>
          <label className="field-label">Risk Classification:</label>
          <div className="chip-toggle-row">
            {['High', 'Medium', 'Low'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`chip-toggle ${riskFilter.includes(lvl) ? 'selected' : ''}`}
                onClick={() => toggleRisk(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {playbackActive && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#0F4C81',
            marginBottom: 8,
          }}
        >
          📍 {selectedYear}
        </div>
      )}

      <LeafletMap
        center={[36.8, 137.5]}
        zoom={5}
        height={580}
        polygons={polygons}
        legendHtml={legendHtml}
      />
    </div>
  );
};

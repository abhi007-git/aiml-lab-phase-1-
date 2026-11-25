import React from 'react';
import { PlotlyChart } from './PlotlyChart';

export interface PredictionData {
  label: 'Low' | 'Medium' | 'High';
  probs: { Low: number; Medium: number; High: number };
  riskScore: number;
  contributions: { feature: string; contribution: number }[];
}

const RISK_COLORS: Record<string, string> = {
  High: '#C0392B',
  Medium: '#D99A00',
  Low: '#2E8B57',
};

const BADGE_CLASS: Record<string, string> = {
  High: 'badge-high',
  Medium: 'badge-med',
  Low: 'badge-low',
};

export const PredictionGaugeAndSummary: React.FC<{
  prediction: PredictionData;
  titleLabel?: string;
}> = ({ prediction, titleLabel = 'Predicted Risk:' }) => {
  const { label, probs, riskScore } = prediction;
  const riskColor = RISK_COLORS[label] ?? '#2E8B57';
  const badgeClass = BADGE_CLASS[label] ?? 'badge-low';
  const predProb = probs[label];

  let confLevel = 'LOW CONFIDENCE';
  let confColor = '#C0392B';
  let confDesc =
    'Highly variable or high-entropy attribute profiles suggest mixed geological signals for this cell centroid.';
  if (predProb >= 0.7) {
    confLevel = 'HIGH CONFIDENCE';
    confColor = '#2E8B57';
    confDesc =
      'The input attributes strongly match historical geological stress profiles associated with this hazard level.';
  } else if (predProb >= 0.5) {
    confLevel = 'MODERATE CONFIDENCE';
    confColor = '#D99A00';
    confDesc =
      'The input parameters represent a transitional geological state. The historical variance is elevated.';
  }

  return (
    <div>
      <PlotlyChart
        data={[
          {
            type: 'indicator',
            mode: 'gauge+number',
            value: riskScore,
            title: {
              text: 'SEISMIC THREAT INDEX EXPOSURE',
              font: { size: 11, color: '#0F4C81', family: 'Inter' },
            },
            gauge: {
              axis: { range: [0, 100], tickwidth: 1, tickcolor: '#64748B' },
              bar: { color: riskColor, thickness: 0.25 },
              bgcolor: 'rgba(241, 236, 226, 0.4)',
              borderwidth: 1,
              bordercolor: '#DAD6CC',
              steps: [
                { range: [0, 50], color: 'rgba(46, 139, 87, 0.08)' },
                { range: [50, 85], color: 'rgba(212, 160, 23, 0.08)' },
                { range: [85, 100], color: 'rgba(192, 57, 43, 0.08)' },
              ],
            },
          },
        ]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#2C3E50', family: 'Inter' },
          height: 200,
          margin: { l: 10, r: 10, t: 40, b: 10 },
        }}
      />

      <div
        className="cmd-panel"
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#5D6D7E',
              marginRight: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {titleLabel}
          </span>
          <span className={badgeClass}>{label} RISK</span>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid #DAD6CC', margin: '6px 0' }} />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          <span>
            Prob(High): <b style={{ color: '#C0392B' }}>{(probs.High * 100).toFixed(1)}%</b>
          </span>
          <span>
            Prob(Med): <b style={{ color: '#D99A00' }}>{(probs.Medium * 100).toFixed(1)}%</b>
          </span>
          <span>
            Prob(Low): <b style={{ color: '#2E8B57' }}>{(probs.Low * 100).toFixed(1)}%</b>
          </span>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid #DAD6CC', margin: '6px 0' }} />

        <div style={{ textAlign: 'left', fontSize: '0.77rem', lineHeight: 1.4 }}>
          <div>
            <b>Model Prediction Confidence:</b>{' '}
            <span style={{ color: confColor, fontWeight: 700 }}>
              {(predProb * 100).toFixed(1)}% ({confLevel})
            </span>
          </div>
          <div style={{ color: '#5D6D7E', marginTop: 3, fontStyle: 'italic' }}>{confDesc}</div>
        </div>
      </div>
    </div>
  );
};

export const LocalShapSection: React.FC<{ prediction: PredictionData }> = ({ prediction }) => {
  const sorted = [...prediction.contributions].sort(
    (a, b) => Math.abs(a.contribution) - Math.abs(b.contribution)
  );
  const colors = sorted.map((c) => (c.contribution > 0 ? '#C0392B' : '#2E8B57'));

  const posContribs = [...prediction.contributions]
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  const negContribs = [...prediction.contributions]
    .filter((c) => c.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution);

  return (
    <>
      <hr style={{ border: 0, borderTop: '1px solid #DAD6CC', margin: '15px 0' }} />
      <div className="two-col">
        <PlotlyChart
          data={[
            {
              type: 'bar',
              x: sorted.map((c) => c.contribution),
              y: sorted.map((c) => c.feature),
              orientation: 'h',
              marker: { color: colors },
              text: sorted.map((c) => `${c.contribution >= 0 ? '+' : ''}${c.contribution.toFixed(4)}`),
              textposition: 'outside',
              textfont: { color: '#2C3E50', family: 'Inter', size: 10 },
            },
          ]}
          layout={{
            title: {
              text: `LOCAL FEATURE ATTRIBUTION (SHAP FOR ${prediction.label.toUpperCase()} RISK)`,
              font: { color: '#0F4C81', family: 'Inter', size: 12 },
            },
            xaxis: {
              title: 'Local Attribution (Probability Delta)',
              gridcolor: '#DAD6CC',
              zeroline: true,
              zerolinecolor: '#2C3E50',
              zerolinewidth: 1,
              color: '#2C3E50',
              tickfont: { color: '#2C3E50', family: 'Inter', size: 10 },
            },
            yaxis: {
              gridcolor: '#DAD6CC',
              color: '#2C3E50',
              tickfont: { color: '#2C3E50', family: 'Inter', size: 10 },
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(248, 247, 242, 0.4)',
            margin: { t: 50, b: 40, l: 135, r: 45 },
            height: 320,
            showlegend: false,
          }}
        />

        <div className="cmd-panel" style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
          <b style={{ color: '#0F4C81' }}>Understanding the Prediction:</b>
          <br />
          <br />
          {posContribs[0] && (
            <p style={{ margin: '0 0 10px 0' }}>
              ● <b>{posContribs[0].feature}</b> contributed positively (
              <b>+{posContribs[0].contribution.toFixed(3)}</b>), indicating its current value is{' '}
              <b>increasing</b> the predicted seismic hazard.
            </p>
          )}
          {posContribs[1] && (
            <p style={{ margin: '0 0 10px 0' }}>
              ● <b>{posContribs[1].feature}</b> also increased the predicted hazard (
              <b>+{posContribs[1].contribution.toFixed(3)}</b>).
            </p>
          )}
          {negContribs[0] && (
            <p style={{ margin: 0 }}>
              ● <b>{negContribs[0].feature}</b> contributed negatively (
              <b>{negContribs[0].contribution.toFixed(3)}</b>), indicating its current value is{' '}
              <b>suppressing</b> or reducing the predicted hazard.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

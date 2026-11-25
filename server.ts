import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { FEATURE_COLS, FeatureKey, getDatasets } from './server/data.ts';
import {
  computeKMeansValidation,
  evaluatePerformance,
  getH3Boundary,
  PerformanceReport,
  planEvacuationRoutes,
  PRESET_LOCATIONS,
  SeismoRandomForest,
} from './server/ml.ts';

async function startServer() {
  const app = express();
  app.use(express.json());

  const datasets = getDatasets();

  // Train in-memory Random Forest on historical training window (year <= 2018)
  const trainRows = datasets.labeled.filter((r) => r.year <= 2018);
  const rf = new SeismoRandomForest(trainRows, 35, 10);

  let cachedPerf: PerformanceReport | null = null;
  let cachedKMeansVal: ReturnType<typeof computeKMeansValidation> | null = null;

  // Deterministic sample of 1500 points for Overview map
  const overviewSample = (() => {
    const arr = [...datasets.labeled];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(1500, arr.length)).map((r) => ({
      grid_lat: r.grid_lat,
      grid_lon: r.grid_lon,
      risk_label: r.risk_label,
    }));
  })();

  // Serve shap_summary_plot.png cleanly
  app.get('/assets/shap_summary_plot.png', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'shap_summary_plot.png'));
  });

  // 1. Overview
  app.get('/api/overview', (_req, res) => {
    res.json({
      kpis: {
        events: '29,951',
        cells: '356',
        rfAccuracy: '70.55%',
        backtestAccuracy: '74.16%',
      },
      samplePoints: overviewSample,
      timeline: [
        { Year: 2003, Mag: 8.3, Event: 'Tokachi-oki (M8.3)' },
        { Year: 2004, Mag: 6.6, Event: 'Chūetsu (M6.6)' },
        { Year: 2011, Mag: 9.0, Event: 'Tohoku Megathrust (M9.0)' },
        { Year: 2016, Mag: 7.0, Event: 'Kumamoto (M7.0)' },
        { Year: 2018, Mag: 6.7, Event: 'Hokkaido Iburi (M6.7)' },
        { Year: 2024, Mag: 7.6, Event: 'Noto Peninsula (M7.6)' },
      ],
    });
  });

  // 2. Public Predictor Options
  app.get('/api/predictor/options', (_req, res) => {
    const years = Array.from(new Set(datasets.labeled.map((r) => r.year))).sort((a, b) => a - b);
    const lats = Array.from(new Set(datasets.labeled.map((r) => r.grid_lat))).sort((a, b) => a - b);
    const lons = Array.from(new Set(datasets.labeled.map((r) => r.grid_lon))).sort((a, b) => a - b);
    res.json({ years, lats, lons });
  });

  // 3. Public Risk Predictor lookup + ML inference
  app.post('/api/predictor/public', (req, res) => {
    const year = Number(req.body?.year);
    const lat = Number(req.body?.lat);
    const lon = Number(req.body?.lon);
    const match = datasets.labeled.find(
      (r) => r.year === year && r.grid_lat === lat && r.grid_lon === lon
    );
    if (!match) {
      return res.json({ found: false });
    }
    const prediction = rf.predictWithExplain(match);
    return res.json({
      found: true,
      record: match,
      prediction,
    });
  });

  // 4. Live Predictor Workstation
  app.post('/api/predictor/live', (req, res) => {
    const input: Record<FeatureKey, number> = {
      grid_lat: Number(req.body?.grid_lat ?? 36),
      grid_lon: Number(req.body?.grid_lon ?? 141),
      year: Number(req.body?.year ?? 2023),
      eq_count_3yr: Number(req.body?.eq_count_3yr ?? 30),
      eq_count_1yr: Number(req.body?.eq_count_1yr ?? 10),
      mean_mag_3yr: Number(req.body?.mean_mag_3yr ?? 4.5),
      max_mag_3yr: Number(req.body?.max_mag_3yr ?? 5.5),
      mean_depth_3yr: Number(req.body?.mean_depth_3yr ?? 30),
      seismic_energy_3yr: Number(req.body?.seismic_energy_3yr ?? 5e8),
      seismic_energy_1yr: Number(req.body?.seismic_energy_1yr ?? 1e8),
      freq_trend: Number(req.body?.freq_trend ?? 1.5),
      mag_trend: Number(req.body?.mag_trend ?? 0.1),
    };
    for (const k of FEATURE_COLS) {
      if (!Number.isFinite(input[k])) input[k] = 0;
    }
    const prediction = rf.predictWithExplain(input);
    res.json(prediction);
  });

  // 5. Ensemble Performance & Feature Weightings
  app.get('/api/predictor/performance', (_req, res) => {
    if (!cachedPerf) {
      cachedPerf = evaluatePerformance(datasets.labeled, rf);
    }
    const giniImportance = [...datasets.shapVsRf].sort(
      (a, b) => a.rf_gini_importance - b.rf_gini_importance
    );
    res.json({
      ...cachedPerf,
      giniImportance,
    });
  });

  // 6. H3 Geospatial Map
  app.get('/api/h3-map', (req, res) => {
    const years = Array.from(new Set(datasets.h3Map.map((r) => r.year))).sort((a, b) => b - a);
    const year = Number(req.query.year ?? years[0] ?? 2024);
    const risksParam = String(req.query.risks ?? 'High,Medium,Low');
    const allowedRisks = new Set(
      risksParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const cells = datasets.h3Map
      .filter((r) => r.year === year && allowedRisks.has(r.predicted_risk_label))
      .map((r) => ({
        ...r,
        boundary: getH3Boundary(r.h3_cell),
      }));

    res.json({ years, year, cells });
  });

  // 7. Tectonic Clustering Profiles
  app.get('/api/clusters', (_req, res) => {
    if (!cachedKMeansVal) {
      cachedKMeansVal = computeKMeansValidation(datasets.clusters);
    }

    const clusterMap = new Map<number, typeof datasets.clusters>();
    for (const row of datasets.clusters) {
      const list = clusterMap.get(row.cluster) ?? [];
      list.push(row);
      clusterMap.set(row.cluster, list);
    }

    const clusterStats = Array.from(clusterMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([cid, rows]) => {
        const n = rows.length || 1;
        return {
          cluster: cid,
          cells: rows.length,
          avgCount: rows.reduce((s, r) => s + r.avg_annual_count, 0) / n,
          maxMagnitude: Math.max(...rows.map((r) => r.max_magnitude)),
          avgMagnitude: rows.reduce((s, r) => s + r.avg_magnitude, 0) / n,
          avgDepth: rows.reduce((s, r) => s + r.avg_depth, 0) / n,
          avgEnergy: rows.reduce((s, r) => s + r.avg_energy, 0) / n,
        };
      });

    res.json({
      points: datasets.clusters,
      clusterStats,
      validation: cachedKMeansVal,
    });
  });

  // 8. Anomaly Threat Center
  app.get('/api/anomalies', (_req, res) => {
    const detected = datasets.anomalies.filter((r) => r.anomaly_flag === -1);
    const totalAnom = detected.length;
    const topMag = detected.length > 0 ? Math.max(...detected.map((r) => r.max_mag_3yr)) : 0;
    const mostRecentYear = detected.length > 0 ? Math.max(...detected.map((r) => r.year)) : 0;
    const avgScore =
      detected.length > 0
        ? detected.reduce((s, r) => s + r.anomaly_score, 0) / detected.length
        : 0;

    const minScore = detected.length > 0 ? Math.min(...detected.map((r) => r.anomaly_score)) : 0;
    const maxScore = detected.length > 0 ? Math.max(...detected.map((r) => r.anomaly_score)) : 0;

    const crossRef = (row: (typeof detected)[number]) => {
      const yr = row.year;
      const lat = row.grid_lat;
      const lon = row.grid_lon;
      const maxMag = row.max_mag_3yr;
      if (yr === 2011 && lat >= 36 && lat <= 40 && lon >= 140 && lon <= 145) {
        if (lat === 38 && lon === 142) return '⚠ 2011 Tohoku Megathrust Epicenter (M9.0)';
        return '2011 Tohoku Tsunami Rupture Zone';
      }
      if (yr === 2003 && lat >= 41 && lat <= 43 && lon >= 143 && lon <= 145) {
        return '⚠ 2003 Tokachi-oki Earthquake (M8.3)';
      }
      if (yr === 2010 && lat >= 26 && lat <= 28 && lon >= 143 && lon <= 145) {
        return '2010 Bonin Islands Swarm (M7.4)';
      }
      if (yr === 2004 && lat >= 32 && lat <= 34 && lon >= 136 && lon <= 138) {
        return '2004 Kii Peninsula Swarm (M7.4)';
      }
      if (maxMag >= 7.0) {
        return `Major Event Rupture (M${maxMag.toFixed(1)})`;
      }
      return 'Localized Swarm / High Stress Drift';
    };

    const top15 = [...detected]
      .sort((a, b) => a.anomaly_score - b.anomaly_score)
      .slice(0, 15)
      .map((r) => ({
        ...r,
        usgsReference: crossRef(r),
      }));

    res.json({
      kpis: {
        totalAnom,
        topMag,
        mostRecentYear,
        avgScore,
        minScore,
        maxScore,
      },
      anomalies: detected,
      top15,
    });
  });

  // 9. SHAP AI Explainability
  app.get('/api/shap', (_req, res) => {
    const sorted = [...datasets.shapGlobal].sort((a, b) => a.mean_abs_shap - b.mean_abs_shap);
    res.json({
      globalShap: sorted,
      shapVsRf: datasets.shapVsRf,
    });
  });

  // 10. A* Evacuation Route Planner
  app.get('/api/route', (req, res) => {
    const locations = Object.keys(PRESET_LOCATIONS);
    const start = String(req.query.start ?? locations[0]);
    const end = String(req.query.end ?? locations[1]);
    const year = Number(req.query.year ?? 2024);

    if (start === end) {
      return res.json({ sameNode: true, locations });
    }
    try {
      const result = planEvacuationRoutes(start, end, datasets.h3Map, year);
      return res.json({
        sameNode: false,
        locations,
        route: result,
      });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message, locations });
    }
  });

  // Mount Vite in dev, or serve built dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`SeismoAI Observation Console listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

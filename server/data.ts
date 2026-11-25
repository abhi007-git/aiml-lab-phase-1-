import fs from 'node:fs';
import path from 'node:path';

export interface H3RiskRow {
  h3_cell: string;
  grid_lat: number;
  grid_lon: number;
  year: number;
  actual_hrs: number;
  actual_risk_label: string;
  predicted_risk_label: string;
  predicted_prob_High: number;
  predicted_prob_Low: number;
  predicted_prob_Medium: number;
  eq_count_3yr: number;
  seismic_energy_3yr: number;
  mean_depth_3yr: number;
}

export interface LabeledFeatureRow {
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
  target_count: number;
  target_max_mag: number;
  target_energy: number;
  target_hrs: number;
  risk_label: 'Low' | 'Medium' | 'High';
}

export interface ClusterRow {
  grid_lat: number;
  grid_lon: number;
  avg_annual_count: number;
  max_magnitude: number;
  avg_magnitude: number;
  avg_depth: number;
  avg_energy: number;
  cluster: number;
}

export interface AnomalyRow {
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
  target_count: number;
  target_max_mag: number;
  target_energy: number;
  anomaly_flag: number;
  anomaly_score: number;
}

export interface ShapGlobalRow {
  feature: string;
  mean_abs_shap: number;
  mean_abs_shap_High: number;
  mean_abs_shap_Low: number;
  mean_abs_shap_Medium: number;
}

export interface ShapVsRfRow {
  feature: string;
  rf_gini_importance: number;
  mean_abs_shap: number;
  rf_rank: number;
  shap_rank: number;
}

export const FEATURE_COLS = [
  'grid_lat',
  'grid_lon',
  'year',
  'eq_count_3yr',
  'eq_count_1yr',
  'mean_mag_3yr',
  'max_mag_3yr',
  'mean_depth_3yr',
  'seismic_energy_3yr',
  'seismic_energy_1yr',
  'freq_trend',
  'mag_trend',
] as const;

export type FeatureKey = (typeof FEATURE_COLS)[number];

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < headers.length) continue;
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (parts[j] ?? '').trim();
    }
    rows.push(obj);
  }
  return rows;
}

export interface SeismoDatasets {
  h3Map: H3RiskRow[];
  labeled: LabeledFeatureRow[];
  clusters: ClusterRow[];
  anomalies: AnomalyRow[];
  shapGlobal: ShapGlobalRow[];
  shapVsRf: ShapVsRfRow[];
}

let cachedDatasets: SeismoDatasets | null = null;

export function getDatasets(): SeismoDatasets {
  if (cachedDatasets) return cachedDatasets;

  const root = process.cwd();

  const h3Map: H3RiskRow[] = parseCsv(path.join(root, 'h3_risk_map.csv')).map((r) => ({
    h3_cell: r.h3_cell,
    grid_lat: Number(r.grid_lat),
    grid_lon: Number(r.grid_lon),
    year: Number(r.year),
    actual_hrs: Number(r.actual_hrs),
    actual_risk_label: r.actual_risk_label,
    predicted_risk_label: r.predicted_risk_label,
    predicted_prob_High: Number(r.predicted_prob_High),
    predicted_prob_Low: Number(r.predicted_prob_Low),
    predicted_prob_Medium: Number(r.predicted_prob_Medium),
    eq_count_3yr: Number(r.eq_count_3yr),
    seismic_energy_3yr: Number(r.seismic_energy_3yr),
    mean_depth_3yr: Number(r.mean_depth_3yr),
  }));

  const labeled: LabeledFeatureRow[] = parseCsv(
    path.join(root, 'labeled_seismic_features.csv')
  ).map((r) => ({
    grid_lat: Number(r.grid_lat),
    grid_lon: Number(r.grid_lon),
    year: Number(r.year),
    eq_count_3yr: Number(r.eq_count_3yr),
    eq_count_1yr: Number(r.eq_count_1yr),
    mean_mag_3yr: Number(r.mean_mag_3yr),
    max_mag_3yr: Number(r.max_mag_3yr),
    mean_depth_3yr: Number(r.mean_depth_3yr),
    seismic_energy_3yr: Number(r.seismic_energy_3yr),
    seismic_energy_1yr: Number(r.seismic_energy_1yr),
    freq_trend: Number(r.freq_trend),
    mag_trend: Number(r.mag_trend),
    target_count: Number(r.target_count),
    target_max_mag: Number(r.target_max_mag),
    target_energy: Number(r.target_energy),
    target_hrs: Number(r.target_hrs),
    risk_label: r.risk_label as 'Low' | 'Medium' | 'High',
  }));

  const clusters: ClusterRow[] = parseCsv(
    path.join(root, 'seismic_regions_clusters.csv')
  ).map((r) => ({
    grid_lat: Number(r.grid_lat),
    grid_lon: Number(r.grid_lon),
    avg_annual_count: Number(r.avg_annual_count),
    max_magnitude: Number(r.max_magnitude),
    avg_magnitude: Number(r.avg_magnitude),
    avg_depth: Number(r.avg_depth),
    avg_energy: Number(r.avg_energy),
    cluster: Number(r.cluster),
  }));

  const anomalies: AnomalyRow[] = parseCsv(
    path.join(root, 'seismic_anomalies.csv')
  ).map((r) => ({
    grid_lat: Number(r.grid_lat),
    grid_lon: Number(r.grid_lon),
    year: Number(r.year),
    eq_count_3yr: Number(r.eq_count_3yr),
    eq_count_1yr: Number(r.eq_count_1yr),
    mean_mag_3yr: Number(r.mean_mag_3yr),
    max_mag_3yr: Number(r.max_mag_3yr),
    mean_depth_3yr: Number(r.mean_depth_3yr),
    seismic_energy_3yr: Number(r.seismic_energy_3yr),
    seismic_energy_1yr: Number(r.seismic_energy_1yr),
    freq_trend: Number(r.freq_trend),
    mag_trend: Number(r.mag_trend),
    target_count: Number(r.target_count),
    target_max_mag: Number(r.target_max_mag),
    target_energy: Number(r.target_energy),
    anomaly_flag: Number(r.anomaly_flag),
    anomaly_score: Number(r.anomaly_score),
  }));

  const shapGlobal: ShapGlobalRow[] = parseCsv(
    path.join(root, 'shap_global_importance.csv')
  ).map((r) => ({
    feature: r.feature,
    mean_abs_shap: Number(r.mean_abs_shap),
    mean_abs_shap_High: Number(r.mean_abs_shap_High),
    mean_abs_shap_Low: Number(r.mean_abs_shap_Low),
    mean_abs_shap_Medium: Number(r.mean_abs_shap_Medium),
  }));

  const shapVsRf: ShapVsRfRow[] = parseCsv(
    path.join(root, 'shap_vs_rf_importance.csv')
  ).map((r) => ({
    feature: r.feature,
    rf_gini_importance: Number(r.rf_gini_importance),
    mean_abs_shap: Number(r.mean_abs_shap),
    rf_rank: Number(r.rf_rank),
    shap_rank: Number(r.shap_rank),
  }));

  cachedDatasets = { h3Map, labeled, clusters, anomalies, shapGlobal, shapVsRf };
  return cachedDatasets;
}

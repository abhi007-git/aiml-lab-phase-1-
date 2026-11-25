import { cellToBoundary, cellToLatLng, gridDisk, latLngToCell } from 'h3-js';
import {
  ClusterRow,
  FEATURE_COLS,
  FeatureKey,
  H3RiskRow,
  LabeledFeatureRow,
} from './data.ts';

export type RiskClass = 'Low' | 'Medium' | 'High';
const CLASSES: RiskClass[] = ['Low', 'Medium', 'High'];

// Deterministic PRNG for reproducible Random Forest & K-Means
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TreeNode {
  leaf: boolean;
  probs: [number, number, number]; // [Low, Medium, High]
  featureIdx?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

function rowToVec(row: Record<FeatureKey, number>): number[] {
  return FEATURE_COLS.map((k) => Number(row[k]) || 0);
}

function gini(counts: [number, number, number], total: number): number {
  if (total <= 0) return 0;
  let sumSq = 0;
  for (let c = 0; c < 3; c++) {
    const p = counts[c] / total;
    sumSq += p * p;
  }
  return 1 - sumSq;
}

function buildTree(
  X: number[][],
  y: number[],
  weights: number[],
  indices: number[],
  depth: number,
  maxDepth: number,
  minSamplesLeaf: number,
  mtry: number,
  rand: () => number
): TreeNode {
  const counts: [number, number, number] = [0, 0, 0];
  let totalW = 0;
  for (const idx of indices) {
    const c = y[idx];
    const w = weights[idx];
    counts[c] += w;
    totalW += w;
  }
  const probs: [number, number, number] =
    totalW > 0
      ? [counts[0] / totalW, counts[1] / totalW, counts[2] / totalW]
      : [1 / 3, 1 / 3, 1 / 3];

  const pure = counts.filter((c) => c > 0).length <= 1;
  if (depth >= maxDepth || indices.length < minSamplesLeaf * 2 || pure) {
    return { leaf: true, probs };
  }

  // Sample mtry features
  const featIndices = Array.from({ length: FEATURE_COLS.length }, (_, i) => i);
  for (let i = featIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [featIndices[i], featIndices[j]] = [featIndices[j], featIndices[i]];
  }
  const chosenFeats = featIndices.slice(0, mtry);

  const parentGini = gini(counts, totalW);
  let bestGain = 1e-7;
  let bestFeat = -1;
  let bestThresh = 0;

  for (const f of chosenFeats) {
    // Subsample up to 24 candidate thresholds for fast training
    const vals: number[] = [];
    const step = Math.max(1, Math.floor(indices.length / 24));
    for (let i = 0; i < indices.length; i += step) {
      vals.push(X[indices[i]][f]);
    }
    vals.sort((a, b) => a - b);

    for (let t = 0; t < vals.length - 1; t++) {
      if (vals[t] === vals[t + 1]) continue;
      const thresh = 0.5 * (vals[t] + vals[t + 1]);

      const leftC: [number, number, number] = [0, 0, 0];
      const rightC: [number, number, number] = [0, 0, 0];
      let leftW = 0;
      let rightW = 0;
      let leftN = 0;
      let rightN = 0;

      for (const idx of indices) {
        const w = weights[idx];
        const c = y[idx];
        if (X[idx][f] <= thresh) {
          leftC[c] += w;
          leftW += w;
          leftN++;
        } else {
          rightC[c] += w;
          rightW += w;
          rightN++;
        }
      }

      if (leftN < minSamplesLeaf || rightN < minSamplesLeaf) continue;

      const weightedGini =
        (leftW / totalW) * gini(leftC, leftW) + (rightW / totalW) * gini(rightC, rightW);
      const gain = parentGini - weightedGini;
      if (gain > bestGain) {
        bestGain = gain;
        bestFeat = f;
        bestThresh = thresh;
      }
    }
  }

  if (bestFeat === -1) {
    return { leaf: true, probs };
  }

  const leftIdx: number[] = [];
  const rightIdx: number[] = [];
  for (const idx of indices) {
    if (X[idx][bestFeat] <= bestThresh) {
      leftIdx.push(idx);
    } else {
      rightIdx.push(idx);
    }
  }

  return {
    leaf: false,
    probs,
    featureIdx: bestFeat,
    threshold: bestThresh,
    left: buildTree(X, y, weights, leftIdx, depth + 1, maxDepth, minSamplesLeaf, mtry, rand),
    right: buildTree(X, y, weights, rightIdx, depth + 1, maxDepth, minSamplesLeaf, mtry, rand),
  };
}

function predictTreeWithPath(
  node: TreeNode,
  vec: number[],
  classIdx: number,
  contribs: number[]
): [number, number, number] {
  if (node.leaf || node.featureIdx === undefined || node.threshold === undefined) {
    return node.probs;
  }
  const next = vec[node.featureIdx] <= node.threshold ? node.left! : node.right!;
  // Saabas local feature attribution: delta in P(class) along decision path
  contribs[node.featureIdx] += next.probs[classIdx] - node.probs[classIdx];
  return predictTreeWithPath(next, vec, classIdx, contribs);
}

export class SeismoRandomForest {
  private trees: TreeNode[] = [];

  constructor(trainRows: LabeledFeatureRow[], nEstimators = 35, maxDepth = 10) {
    const X = trainRows.map((r) => rowToVec(r));
    const y = trainRows.map((r) => CLASSES.indexOf(r.risk_label));

    // Balanced class weights matching scikit-learn class_weight='balanced'
    const counts = [0, 0, 0];
    for (const c of y) counts[c]++;
    const n = y.length;
    const classWeights = counts.map((cnt) => (cnt > 0 ? n / (3 * cnt) : 1));
    const weights = y.map((c) => classWeights[c]);

    const rand = mulberry32(42);
    const mtry = Math.max(3, Math.round(Math.sqrt(FEATURE_COLS.length)));

    for (let t = 0; t < nEstimators; t++) {
      const boot: number[] = [];
      for (let i = 0; i < n; i++) {
        boot.push(Math.floor(rand() * n));
      }
      this.trees.push(buildTree(X, y, weights, boot, 0, maxDepth, 6, mtry, rand));
    }
  }

  predictProba(input: Record<FeatureKey, number>): Record<RiskClass, number> {
    const vec = rowToVec(input);
    const sum: [number, number, number] = [0, 0, 0];
    const dummy = new Array<number>(FEATURE_COLS.length).fill(0);
    for (const tree of this.trees) {
      const p = predictTreeWithPath(tree, vec, 0, dummy);
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
    }
    const nt = this.trees.length || 1;
    return {
      Low: sum[0] / nt,
      Medium: sum[1] / nt,
      High: sum[2] / nt,
    };
  }

  predictWithExplain(input: Record<FeatureKey, number>): {
    label: RiskClass;
    probs: Record<RiskClass, number>;
    riskScore: number;
    contributions: { feature: string; contribution: number }[];
  } {
    const probs = this.predictProba(input);
    let label: RiskClass = 'Low';
    let bestP = -1;
    for (const cls of CLASSES) {
      if (probs[cls] > bestP) {
        bestP = probs[cls];
        label = cls;
      }
    }

    const classIdx = CLASSES.indexOf(label);
    const vec = rowToVec(input);
    const contribs = new Array<number>(FEATURE_COLS.length).fill(0);
    for (const tree of this.trees) {
      predictTreeWithPath(tree, vec, classIdx, contribs);
    }
    const nt = this.trees.length || 1;
    const contributions = FEATURE_COLS.map((f, i) => ({
      feature: f,
      contribution: contribs[i] / nt,
    }));

    const riskScore = Math.round(probs.High * 100 + probs.Medium * 45);
    return { label, probs, riskScore, contributions };
  }
}

export interface PerformanceReport {
  confusionMatrix: number[][];
  classes: RiskClass[];
  classMetrics: {
    className: RiskClass;
    precision: number;
    recall: number;
    f1: number;
  }[];
  baselineComparison: {
    model: string;
    accuracy: number;
    precisionMacro: number;
    recallMacro: number;
    f1Macro: number;
  }[];
  landmarkValidation: {
    event: string;
    location: string;
    actualMagnitude: string;
    modelPrediction: string;
    actualObservedHazard: string;
    matched: boolean;
  }[];
}

function computeMetrics(yTrue: RiskClass[], yPred: RiskClass[]) {
  let correct = 0;
  const cm = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < yTrue.length; i++) {
    const ti = CLASSES.indexOf(yTrue[i]);
    const pi = CLASSES.indexOf(yPred[i]);
    if (ti === pi) correct++;
    cm[ti][pi]++;
  }
  const accuracy = yTrue.length > 0 ? correct / yTrue.length : 0;
  const classMetrics = CLASSES.map((cls, c) => {
    const tp = cm[c][c];
    const fp = cm[0][c] + cm[1][c] + cm[2][c] - tp;
    const fn = cm[c][0] + cm[c][1] + cm[c][2] - tp;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { className: cls, precision, recall, f1 };
  });

  const precisionMacro = classMetrics.reduce((s, m) => s + m.precision, 0) / 3;
  const recallMacro = classMetrics.reduce((s, m) => s + m.recall, 0) / 3;
  const f1Macro = classMetrics.reduce((s, m) => s + m.f1, 0) / 3;

  return { cm, accuracy, classMetrics, precisionMacro, recallMacro, f1Macro };
}

// Fast Logistic Regression (multinomial softmax via gradient descent on standardized features)
function runLogisticBaseline(train: LabeledFeatureRow[], test: LabeledFeatureRow[]): RiskClass[] {
  const nf = FEATURE_COLS.length;
  const means = new Array(nf).fill(0);
  const stds = new Array(nf).fill(0);

  const Xtr = train.map((r) => rowToVec(r));
  for (const row of Xtr) {
    for (let j = 0; j < nf; j++) means[j] += row[j];
  }
  for (let j = 0; j < nf; j++) means[j] /= Xtr.length || 1;
  for (const row of Xtr) {
    for (let j = 0; j < nf; j++) stds[j] += (row[j] - means[j]) ** 2;
  }
  for (let j = 0; j < nf; j++) stds[j] = Math.sqrt(stds[j] / (Xtr.length || 1)) || 1;

  const norm = (v: number[]) => v.map((val, j) => (val - means[j]) / stds[j]);
  const Xn = Xtr.map(norm);
  const y = train.map((r) => CLASSES.indexOf(r.risk_label));

  const W = [new Array(nf).fill(0), new Array(nf).fill(0), new Array(nf).fill(0)];
  const b = [0, 0, 0];
  const lr = 0.08;
  const epochs = 45;

  for (let ep = 0; ep < epochs; ep++) {
    const gW = [new Array(nf).fill(0), new Array(nf).fill(0), new Array(nf).fill(0)];
    const gb = [0, 0, 0];
    for (let i = 0; i < Xn.length; i++) {
      const x = Xn[i];
      const logits = [0, 1, 2].map((c) => {
        let z = b[c];
        for (let j = 0; j < nf; j++) z += W[c][j] * x[j];
        return z;
      });
      const maxL = Math.max(...logits);
      const exps = logits.map((z) => Math.exp(z - maxL));
      const sumE = exps[0] + exps[1] + exps[2];
      for (let c = 0; c < 3; c++) {
        const diff = exps[c] / sumE - (y[i] === c ? 1 : 0);
        gb[c] += diff;
        for (let j = 0; j < nf; j++) gW[c][j] += diff * x[j];
      }
    }
    const n = Xn.length || 1;
    for (let c = 0; c < 3; c++) {
      b[c] -= (lr * gb[c]) / n;
      for (let j = 0; j < nf; j++) W[c][j] -= (lr * (gW[c][j] / n + 0.01 * W[c][j]));
    }
  }

  return test.map((r) => {
    const x = norm(rowToVec(r));
    const logits = [0, 1, 2].map((c) => {
      let z = b[c];
      for (let j = 0; j < nf; j++) z += W[c][j] * x[j];
      return z;
    });
    let bestC = 0;
    for (let c = 1; c < 3; c++) if (logits[c] > logits[bestC]) bestC = c;
    return CLASSES[bestC];
  });
}

export function evaluatePerformance(
  labeled: LabeledFeatureRow[],
  rf: SeismoRandomForest
): PerformanceReport {
  const train = labeled.filter((r) => r.year <= 2018);
  const test = labeled.filter((r) => r.year >= 2019);
  const yTrue = test.map((r) => r.risk_label);

  // 1. Majority Class
  const counts: Record<RiskClass, number> = { Low: 0, Medium: 0, High: 0 };
  for (const r of train) counts[r.risk_label]++;
  const majClass = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Low') as RiskClass;
  const yDummy = test.map(() => majClass);

  // 2. Logistic Regression
  const yLr = runLogisticBaseline(train, test);

  // 3. Single Decision Tree (1-tree depth-8 RF)
  const dt = new SeismoRandomForest(train, 1, 8);
  const yDt = test.map((r) => dt.predictWithExplain(r).label);

  // 4. Random Forest
  const yRf = test.map((r) => rf.predictWithExplain(r).label);

  const mDummy = computeMetrics(yTrue, yDummy);
  const mLr = computeMetrics(yTrue, yLr);
  const mDt = computeMetrics(yTrue, yDt);
  const mRf = computeMetrics(yTrue, yRf);

  // Landmark Historical Validation
  const landmarkSpecs = [
    {
      event: '2011 Tohoku Megathrust',
      location: '38.0°N, 141.0°E (Sendai Coast)',
      actualMagnitude: 'M 9.0',
      year: 2011,
      lat: 38,
      lon: 141,
      expected: 'High',
    },
    {
      event: '2016 Kumamoto Earthquake',
      location: '33.0°N, 131.0°E (Kyushu)',
      actualMagnitude: 'M 7.0',
      year: 2016,
      lat: 33,
      lon: 131,
      expected: 'Medium',
    },
    {
      event: '2024 Noto Peninsula Earthquake',
      location: '37.0°N, 137.0°E (Ishikawa)',
      actualMagnitude: 'M 7.6',
      year: 2024,
      lat: 37,
      lon: 137,
      expected: 'Medium',
    },
  ];

  const landmarkValidation = landmarkSpecs
    .map((spec) => {
      const row = labeled.find(
        (r) => r.year === spec.year && r.grid_lat === spec.lat && r.grid_lon === spec.lon
      );
      if (!row) return null;
      const pred = rf.predictWithExplain(row).label;
      return {
        event: spec.event,
        location: spec.location,
        actualMagnitude: spec.actualMagnitude,
        modelPrediction: `${pred} Risk`,
        actualObservedHazard: `${spec.expected} Risk`,
        matched: pred === spec.expected,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    confusionMatrix: mRf.cm,
    classes: CLASSES,
    classMetrics: mRf.classMetrics,
    baselineComparison: [
      {
        model: 'Majority Class Baseline',
        accuracy: mDummy.accuracy,
        precisionMacro: mDummy.precisionMacro,
        recallMacro: mDummy.recallMacro,
        f1Macro: mDummy.f1Macro,
      },
      {
        model: 'Logistic Regression',
        accuracy: mLr.accuracy,
        precisionMacro: mLr.precisionMacro,
        recallMacro: mLr.recallMacro,
        f1Macro: mLr.f1Macro,
      },
      {
        model: 'Decision Tree',
        accuracy: mDt.accuracy,
        precisionMacro: mDt.precisionMacro,
        recallMacro: mDt.recallMacro,
        f1Macro: mDt.f1Macro,
      },
      {
        model: 'Random Forest (SeismoAI)',
        accuracy: mRf.accuracy,
        precisionMacro: mRf.precisionMacro,
        recallMacro: mRf.recallMacro,
        f1Macro: mRf.f1Macro,
      },
    ],
    landmarkValidation,
  };
}

// K-Means Validation (Elbow & Silhouette for k=2..8)
export function computeKMeansValidation(clusters: ClusterRow[]) {
  const feats: (keyof ClusterRow)[] = [
    'avg_annual_count',
    'max_magnitude',
    'avg_magnitude',
    'avg_depth',
    'avg_energy',
  ];
  const Xraw = clusters.map((c) => feats.map((f) => Number(c[f])));
  const nf = feats.length;
  const n = Xraw.length;

  const means = new Array(nf).fill(0);
  const stds = new Array(nf).fill(0);
  for (const row of Xraw) for (let j = 0; j < nf; j++) means[j] += row[j];
  for (let j = 0; j < nf; j++) means[j] /= n || 1;
  for (const row of Xraw) for (let j = 0; j < nf; j++) stds[j] += (row[j] - means[j]) ** 2;
  for (let j = 0; j < nf; j++) stds[j] = Math.sqrt(stds[j] / (n || 1)) || 1;

  const X = Xraw.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));

  const distSq = (a: number[], b: number[]) => {
    let s = 0;
    for (let j = 0; j < nf; j++) s += (a[j] - b[j]) ** 2;
    return s;
  };

  const ks = [2, 3, 4, 5, 6, 7, 8];
  const inertias: number[] = [];
  const silhouettes: number[] = [];
  const rand = mulberry32(42);

  for (const k of ks) {
    let bestInertia = Infinity;
    let bestLabels: number[] = new Array(n).fill(0);

    for (let init = 0; init < 5; init++) {
      // K-Means++ style deterministic seed init
      const chosen = new Set<number>();
      while (chosen.size < k) {
        chosen.add(Math.floor(rand() * n));
      }
      const centroids = Array.from(chosen).map((idx) => [...X[idx]]);
      const labels = new Array<number>(n).fill(0);

      for (let iter = 0; iter < 30; iter++) {
        let changed = false;
        for (let i = 0; i < n; i++) {
          let bestC = 0;
          let bestD = Infinity;
          for (let c = 0; c < k; c++) {
            const d = distSq(X[i], centroids[c]);
            if (d < bestD) {
              bestD = d;
              bestC = c;
            }
          }
          if (labels[i] !== bestC) {
            labels[i] = bestC;
            changed = true;
          }
        }
        if (!changed) break;

        const sums = Array.from({ length: k }, () => new Array(nf).fill(0));
        const cnts = new Array(k).fill(0);
        for (let i = 0; i < n; i++) {
          const c = labels[i];
          cnts[c]++;
          for (let j = 0; j < nf; j++) sums[c][j] += X[i][j];
        }
        for (let c = 0; c < k; c++) {
          if (cnts[c] > 0) {
            for (let j = 0; j < nf; j++) centroids[c][j] = sums[c][j] / cnts[c];
          }
        }
      }

      let inertia = 0;
      for (let i = 0; i < n; i++) {
        inertia += distSq(X[i], centroids[labels[i]]);
      }
      if (inertia < bestInertia) {
        bestInertia = inertia;
        bestLabels = labels;
      }
    }

    inertias.push(bestInertia);

    // Silhouette score
    let silSum = 0;
    for (let i = 0; i < n; i++) {
      const ci = bestLabels[i];
      const clusterSums = new Array(k).fill(0);
      const clusterCnts = new Array(k).fill(0);
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = Math.sqrt(distSq(X[i], X[j]));
        clusterSums[bestLabels[j]] += d;
        clusterCnts[bestLabels[j]]++;
      }
      const a = clusterCnts[ci] > 0 ? clusterSums[ci] / clusterCnts[ci] : 0;
      let b = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === ci || clusterCnts[c] === 0) continue;
        const avgD = clusterSums[c] / clusterCnts[c];
        if (avgD < b) b = avgD;
      }
      const s = b === Infinity ? 0 : (b - a) / Math.max(a, b, 1e-9);
      silSum += s;
    }
    silhouettes.push(silSum / (n || 1));
  }

  return { ks, inertias, silhouettes };
}

// A* Evacuation Route Planner on Uber H3 Resolution 5
export const PRESET_LOCATIONS: Record<string, [number, number]> = {
  'Tokyo (Shinjuku)': [35.6895, 139.6917],
  Sendai: [38.2682, 140.8694],
  Osaka: [34.6937, 135.5023],
  'Sapporo (Hokkaido)': [43.0618, 141.3545],
  Nagoya: [35.1815, 136.9066],
  Fukushima: [37.7503, 140.4676],
  'Noto Peninsula': [37.2959, 136.91],
  Hiroshima: [34.3853, 132.4553],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findAStarPath(
  slat: number,
  slon: number,
  elat: number,
  elon: number,
  riskDb: Map<string, string>,
  mode: 'shortest' | 'safest'
) {
  const sc = latLngToCell(slat, slon, 5);
  const ec = latLngToCell(elat, elon, 5);
  if (sc === ec) {
    const [la, lo] = cellToLatLng(sc);
    return { cells: [sc], coords: [[la, lo]], cost: 0, distanceKm: 0 };
  }

  const getCost = (cell: string) => {
    if (mode === 'shortest') return 1.0;
    const r = riskDb.get(cell) ?? 'Low';
    if (r === 'High') return 20.0;
    if (r === 'Medium') return 5.0;
    return 1.0;
  };

  const sl = cellToLatLng(sc);
  const el = cellToLatLng(ec);
  const h0 = haversineKm(sl[0], sl[1], el[0], el[1]);

  interface QueueItem {
    f: number;
    g: number;
    cell: string;
    path: string[];
  }
  const open: QueueItem[] = [{ f: h0, g: 0, cell: sc, path: [sc] }];
  const gScores = new Map<string, number>([[sc, 0]]);
  const closed = new Set<string>();

  while (open.length > 0) {
    // Pop lowest f
    let minIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[minIdx].f) minIdx = i;
    }
    const currItem = open[minIdx];
    open[minIdx] = open[open.length - 1];
    open.pop();

    const { g, cell: curr, path } = currItem;
    if (closed.has(curr)) continue;
    closed.add(curr);

    if (curr === ec) {
      let distanceKm = 0;
      const coords = path.map((c) => cellToLatLng(c));
      for (let i = 0; i < coords.length - 1; i++) {
        distanceKm += haversineKm(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
      }
      return { cells: path, coords, cost: g, distanceKm };
    }

    const [currLat, currLon] = cellToLatLng(curr);
    const neighbors = gridDisk(curr, 1);
    for (const nb of neighbors) {
      if (nb === curr || closed.has(nb)) continue;
      const [lat, lon] = cellToLatLng(nb);
      if (lat < 20 || lat > 48 || lon < 120 || lon > 150) continue;

      const stepDist = haversineKm(currLat, currLon, lat, lon);
      const tg = g + stepDist * getCost(nb);
      const prevG = gScores.get(nb);
      if (prevG === undefined || tg < prevG) {
        gScores.set(nb, tg);
        const hv = haversineKm(lat, lon, el[0], el[1]);
        open.push({ f: tg + hv, g: tg, cell: nb, path: [...path, nb] });
      }
    }
  }

  return null;
}

export function planEvacuationRoutes(
  startName: string,
  endName: string,
  h3Map: H3RiskRow[],
  year = 2024
) {
  const startCoord = PRESET_LOCATIONS[startName];
  const endCoord = PRESET_LOCATIONS[endName];
  if (!startCoord || !endCoord) {
    throw new Error('Unknown location node');
  }

  const yearRows = h3Map.filter((r) => r.year === year);
  const riskDb = new Map<string, string>();
  for (const r of yearRows) {
    riskDb.set(r.h3_cell, r.predicted_risk_label);
  }

  const shortest = findAStarPath(
    startCoord[0],
    startCoord[1],
    endCoord[0],
    endCoord[1],
    riskDb,
    'shortest'
  );
  const safest = findAStarPath(
    startCoord[0],
    startCoord[1],
    endCoord[0],
    endCoord[1],
    riskDb,
    'safest'
  );

  if (!shortest || !safest) {
    return null;
  }

  const countRisks = (cells: string[]) => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const c of cells) {
      const r = riskDb.get(c) ?? 'Low';
      if (r === 'High') high++;
      else if (r === 'Medium') medium++;
      else low++;
    }
    const riskScore = high * 20 + medium * 5 + low * 1;
    return { high, medium, low, totalCells: cells.length, riskScore };
  };

  const shortestBreakdown = countRisks(shortest.cells);
  const safestBreakdown = countRisks(safest.cells);

  const hexOverlays = yearRows.map((r) => ({
    h3_cell: r.h3_cell,
    risk: r.predicted_risk_label,
    boundary: cellToBoundary(r.h3_cell),
  }));

  return {
    start: { name: startName, lat: startCoord[0], lon: startCoord[1] },
    end: { name: endName, lat: endCoord[0], lon: endCoord[1] },
    year,
    shortest: {
      ...shortest,
      ...shortestBreakdown,
    },
    safest: {
      ...safest,
      ...safestBreakdown,
    },
    highRiskEvaded: shortestBreakdown.high - safestBreakdown.high,
    hexOverlays,
  };
}

export function getH3Boundary(cell: string): [number, number][] {
  return cellToBoundary(cell);
}

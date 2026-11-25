# SeismoAI — Data Engineering, AI/ML Methodology, Legitimacy & Evaluator Q&A Guide

> **Purpose:** Complete technical reference for AIML analysts, data handlers, and external viva evaluators reviewing **SeismoAI (AI-Based Seismic Risk Prediction System)**.  
> **Primary Reference:** RVCE AIML Lab SEE Report (`AI244AI`) + Verified Workspace Datasets (`*.csv`) + Live Inference Engine (`server/ml.ts`).

---

## 1. Dataset Overview: What Data Was Used & Why?

### 1.1 Data Source & Geographic Bounding Box
- **Source:** **United States Geological Survey (USGS) Earthquake Hazards Program Catalog** (`earthquake.usgs.gov/earthquakes/search/`).
- **Geographic Bounding Box:** Japan and surrounding Pacific/Philippine Sea subduction trenches:
  - **Latitude:** `24°N` to `48°N`
  - **Longitude:** `122°E` to `150°E`
- **Temporal Span:** January **2000** to June **2025** (`25+ years`).
- **Magnitude Filter:** `Magnitude ≥ 4.0` (`Mw`).

### 1.2 Why Did We Choose This Dataset & Criteria?
1. **Why Japan?** Japan sits at the junction of **four tectonic plates** (Pacific, Philippine Sea, Eurasian, and North American plates) and accounts for roughly **20% of all global `M ≥ 6.0` earthquakes**, giving us rich spatial heterogeneity (shallow crustal faults, deep Wadati-Benioff slabs, and mega-thrust trenches).
2. **Why USGS Catalog?** Globally standardized moment magnitude (`Mw`), consistent hypocentral depth reporting (`km`), ISO-8601 UTC timestamps, and open public availability without licensing restrictions.
3. **Why `M ≥ 4.0` Cutoff (Completeness Magnitude `Mc`)?** In seismology, catalogs below `M 3.5–4.0` suffer from detection bias (offshore ocean-bottom sensors miss tiny tremors, whereas mainland networks catch them). Filtering at `M ≥ 4.0` guarantees uniform catalog completeness across both inland Japan and offshore Pacific trenches over all 25 years.
4. **Why 25 Years (2000–2025)?** Captures multiple seismic cycles and major stress-release/aftershock regimes—including `2003 Tokachi-oki (M8.3)`, `2011 Tohoku (M9.0)`, `2016 Kumamoto (M7.0)`, and `2024 Noto Peninsula (M7.6)`—allowing **3-year rolling historical windows** plus a strict **6-year chronological out-of-time test split**.

---

## 2. Complete Data Pipeline & How Data Was Handled

Every stage produces a verifiable intermediate artifact in the workspace:

| Stage | Artifact File | Exact Row Count | Columns / Schema | Transformation Applied |
|---|---|---|---|---|
| **1. Cleaning** | `cleaned_japan_earthquake_dataset.csv` | **29,951 events** | `time, year, month, day, latitude, longitude, depth, mag, place` | Deduplicated records, parsed ISO-8601 timestamps, validated Japan bounding box (`24–48°N, 122–150°E`), filtered `mag >= 4.0`, removed invalid/missing depth or coordinates. |
| **2. Spatial Discretization & Rolling Features** | `engineered_seismic_features.csv` | **8,188 region-years** (`356 cells × 23 pivot years`) | `grid_lat, grid_lon, year` + `9` rolling/physics features + `3` next-year targets | Quantized events into **`1° × 1°` grid cells** (`floor(lat)`, `floor(lon)`). For each cell and pivot year `y ∈ [2002, 2024]`, aggregated `[y−2, y]` (3-yr window) and `[y]` (1-yr window), plus `y+1` targets. |
| **3. Target Labeling (HRS)** | `labeled_seismic_features.csv` | **8,188 region-years** | Above + `target_hrs`, `risk_label` | Computed Heuristic Risk Score (`HRS`) over `y+1` targets; applied quantile thresholds (`P50`, `P85`) to assign `Low`, `Medium`, or `High`. |
| **4. Tectonic Clustering** | `seismic_regions_clusters.csv` | **356 grid cells** | `grid_lat, grid_lon, avg_annual_count, max_magnitude, avg_magnitude, avg_depth, avg_energy, cluster` | Aggregated 23-year regional averages per cell, standardized with `StandardScaler`, clustered via K-Means (`k = 4`). |
| **5. Anomaly Detection** | `seismic_anomalies.csv` | **8,188 region-years** | Engineered features + `anomaly_flag`, `anomaly_score` | Applied Isolation Forest (`contamination = 0.01`, 100 trees) across all region-years, flagging **82** extreme outliers (`flag = -1`). |
| **6. Spatial Mapping** | `h3_risk_map.csv` | **8,188 rows** | `h3_cell, grid_lat, grid_lon, year, actual_hrs, actual_risk_label, predicted_risk_label, predicted_prob_High/Low/Medium, eq_count_3yr, seismic_energy_3yr, mean_depth_3yr` | Mapped `1° × 1°` centroids (`lat + 0.5, lon + 0.5`) to Uber H3 Resolution 5 hexagonal indices (`h3.latlng_to_cell(..., 5)`). |
| **7. Explainability** | `shap_global_importance.csv`, `shap_vs_rf_importance.csv` | **12 features** | `mean_abs_shap`, per-class `|SHAP|`, `rf_gini_importance`, ranks | Computed exact TreeSHAP attributions on the Random Forest test predictions and compared rank ordering vs. Gini impurity. |

### 2.1 Understanding the 12 Engineered Features (`X ∈ ℝ¹²`)
For a given spatial cell `(grid_lat, grid_lon)` and pivot year `y`:

1. `eq_count_3yr` — Total `M ≥ 4.0` earthquakes in `[y−2, y]`. Measures sustained seismic rate.
2. `eq_count_1yr` — Earthquakes in pivot year `y` alone. Measures immediate activity.
3. `mean_mag_3yr` — Mean magnitude over `[y−2, y]` (defaulted cleanly when count is 0).
4. `max_mag_3yr` — Peak magnitude observed in `[y−2, y]`.
5. `mean_depth_3yr` — Mean hypocenter depth (`km`) over `[y−2, y]`. Shallower events (`<40 km`) cause stronger surface shaking than deep subduction slab events (`>100 km`).
6. `seismic_energy_3yr` — **Physics-based Gutenberg-Richter Energy Proxy:**
   $$\text{Energy}_{3\text{yr}} = \sum_{i \in [y-2, y]} 10^{1.5 \times M_i}$$
   *Why this matters:* Magnitude is logarithmic—an `M 7.0` event releases `~1,000×` more energy than an `M 5.0` event (`10^{1.5 \times 2} = 10^3`). Linear averaging of magnitudes hides this exponential hazard; summing `10^{1.5 M}` preserves physical energy release.
7. `seismic_energy_1yr` — Energy proxy released specifically in pivot year `y`.
8. `freq_trend` — Ratio comparing year `y` count against the prior 2-year (`[y−2, y−1]`) average (`> 1.0` indicates accelerating seismicity / swarm onset).
9. `mag_trend` — Difference between mean magnitude in year `y` and mean magnitude in `[y−2, y−1]` (`> 0` indicates escalating event severity).
10. `grid_lat` — Latitude index (`24` to `46`), encoding north-south plate arc position.
11. `grid_lon` — Longitude index (`123` to `149`), encoding trench vs. back-arc position.
12. `year` — Pivot year (`2002` to `2024`), capturing secular temporal shifts (e.g., post-2011 aftershock regime).

### 2.2 How Ground-Truth Risk Labels Are Formulated (HRS & Quantiles)
Because USGS catalogs do not come with "Low/Medium/High risk" labels, we define a transparent, physically grounded **Heuristic Risk Score (HRS)** over the **target (future) year `y + 1`**:

$$\text{HRS}_{y+1} = \begin{cases} \log_{10}(N_{y+1} + 1) + 2.0 \times M_{\max, y+1}, & \text{if } N_{y+1} > 0 \\ 0.0, & \text{if } N_{y+1} = 0 \end{cases}$$

**Exact Verified Distribution Across `8,188` Observations:**
- **`4,074` region-years (`49.76%`)** have `HRS = 0.0` (zero `M ≥ 4.0` earthquakes in year `y+1`).
- **`P50` Threshold = `8.3010`:** Physically equals `log10(1 + 1) + 2.0 × 4.0 = 8.3010` (a single `M 4.0` event).
  - **Low Risk (`HRS ≤ 8.3010`):** `4,185` rows (**51.11%**) — quiet or at most one minor `M 4.0` tremor.
- **`P85` Threshold = `10.6771`:** Physically corresponds to `~M 5.1+` with multiple events or `M 5.3+`.
  - **Medium Risk (`8.3010 < HRS ≤ 10.6771`):** `2,790` rows (**34.07%**) — moderate activity (`M 4.1–5.3`).
  - **High Risk (`HRS > 10.6771`):** `1,213` rows (**14.81%**, peaking at `20.6814` in Tohoku 2011) — intense clusters and/or strong/major earthquakes (`M ≥ 5.2+`).

---

## 3. How AI & ML Make This System Work (And Proof It Is Legit, Not a Frontend Lookup)

### 3.1 Why It Is NOT a Frontend Lookup
Evaluators often check whether a web dashboard is merely displaying pre-saved CSV labels. Here is how our architecture performs **genuine machine learning**:

1. **Chronological Zero-Leakage Separation:**
   - Target columns (`target_count`, `target_max_mag`, `target_energy`, `target_hrs`, `risk_label`) are **explicitly stripped** from the feature vector `X` before training and inference.
   - Training uses **strictly past pivot years `2002–2018` (`6,052` samples)**; evaluation uses **strictly future pivot years `2019–2024` (`2,136` samples)**. Random `k`-fold CV would leak adjacent overlapping 3-year windows across train/test—our chronological split eliminates temporal leakage completely.
2. **Real Live Inference in the Web Backend (`server/ml.ts`):**
   - On server startup, `server/ml.ts` trains a **balanced CART Random Forest classifier** from scratch on the `6,052` training rows (`2002–2018`) in memory.
   - In **`Public Risk Predictor`**, selecting `(year, lat, lon)` retrieves only the 12 historical input features (`X`) and calls `rf.predictWithExplain(X)` on the trained trees—it **never reads `risk_label`** from the CSV.
   - In **`Predict Workstation`**, dragging any of the 12 sliders creates a synthetic geological state vector that does not exist in any CSV, and `POST /api/predictor/live` traverses all decision trees in real time to output probabilities and risk scores.
   - In **`Ensemble Performance`**, `evaluatePerformance()` runs live predictions across all `2,136` unseen test rows (`2019–2024`) and computes the live Confusion Matrix and Precision/Recall/F1 metrics.

### 3.2 How Each AI/ML Technique Works in SeismoAI
1. **Random Forest Classifier (Supervised Hazard Forecasting):**
   - *Config:* `class_weight='balanced'` (inversely scales sample weights to counteract the `51% / 34% / 15%` class imbalance so `High` risk is not ignored), bootstrapped samples, random feature subsets (`mtry ≈ √12`), Gini impurity splitting.
   - *Live TypeScript Engine (`35 trees, max_depth=10`):* Achieves **71.54% test accuracy** (`65.48%` macro F1) on `2,136` test rows.
   - *Reference Python `scikit-learn` Model (`100 trees, max_depth=12`):* Achieves **70.55% test accuracy** (`64.58%` macro F1) and **74.16% 2020 backtest accuracy**.
2. **K-Means Clustering (Unsupervised Tectonic Zonation — `k = 4`):**
   - Uses `StandardScaler` on `[avg_annual_count, max_magnitude, avg_magnitude, avg_depth, avg_energy]` across 356 cells.
   - Discovers 4 physical regimes without supervision: **Zone 0** (*Quiet Crustal*), **Zone 1** (*Active Plate Boundary*), **Zone 2** (*Deep Subduction Slab*, `>100 km`), **Zone 3** (*Tohoku Mega-Hotspot*, `38°N–42°N, 141°E–144°E`).
3. **Isolation Forest (Unsupervised Anomaly Detection — `1% contamination`):**
   - Builds 100 random isolation trees. Rare extreme seismic surges require shorter average path lengths to isolate, receiving negative anomaly scores. Flags **82 of 8,188** region-years (`1.00%`), capturing `2011 Tohoku`, `2003 Tokachi-oki`, and `2016 Kumamoto`.
4. **SHAP TreeExplainer (Cooperative Game-Theoretic Explainability):**
   - Decomposes predictions into additive feature contributions (`mean |SHAP|`). Top 3 global drivers: `eq_count_3yr` (`0.0684`), `seismic_energy_3yr` (`0.0518`), `mean_depth_3yr` (`0.0339`).
5. **Uber H3 + Risk-Weighted A\* Search (Geospatial Decision Support):**
   - Maps grid coordinates to H3 Resolution 5 hexagons (`h3.latlng_to_cell(lat, lon, 5)`).
   - Runs A* graph traversal over `gridDisk(cell, 1)` neighbors using admissible **Haversine distance** heuristic `h(n)` and risk-weighted traversal costs (`Low=1x`, `Medium=5x`, `High=20x`).

---

## 4. Key Novelty & Differentiators

1. **Honest Framing (Regional Hazard vs. Impossible Event Prediction):** Rather than falsely claiming to predict exact earthquake timestamps, SeismoAI frames the problem scientifically as **1-year-ahead regional hazard classification** with calibrated class probabilities.
2. **Physics-Informed Temporal Engineering:** Combines Gutenberg-Richter exponential energy (`10^{1.5 M}`), Omori-inspired multi-scale rolling counts (`1yr` vs `3yr`), and rate-of-change acceleration (`freq_trend`, `mag_trend`).
3. **Zero-Leakage Chronological Validation:** Trains strictly on `2002–2018` and tests on `2019–2024`, mirroring real-world forward deployment.
4. **End-to-End Decision Loop (Predict → Explain → Map → Evacuate):** Bridges supervised ML (`Random Forest`), unsupervised discovery (`K-Means` + `Isolation Forest`), explainable AI (`SHAP`), hexagonal GIS (`Uber H3`), and classical AI pathfinding (`A*`) in one cohesive platform.

---

## 5. Complete Metrics Reference Sheet (For Evaluators)

### 5.1 Random Forest Classification Metrics
| Metric | Reference `scikit-learn` RF (`100 trees, depth 12`) | Live Web TypeScript RF (`35 trees, depth 10`) |
|---|---|---|
| **Training Set (`2002–2018`)** | `6,052` region-years | `6,052` region-years |
| **Test Set (`2019–2024`)** | `2,136` region-years | `2,136` region-years |
| **Overall Test Accuracy** | **70.55%** | **71.54%** |
| **2020 Backtesting Accuracy (Pivot 2019)** | **74.16%** | — |
| **Macro Precision / Recall / F1** | `65.28%` / `64.18%` / `64.58%` | `65.85%` / `65.17%` / `65.48%` |
| **Low Risk (`~51%`) P / R / F1** | `~0.79` / `~0.82` / `~0.80` | `0.85` / `0.85` / `0.85` |
| **Medium Risk (`~34%`) P / R / F1** | `~0.62` / `~0.58` / `~0.60` | `0.59` / `0.60` / `0.60` |
| **High Risk (`~15%`) P / R / F1** | `~0.71` / `~0.74` / `~0.72` | `0.54` / `0.50` / `0.52` |

### 5.2 Baseline Model Comparison (Live Test Set `2019–2024`)
| Model | Accuracy | Macro Precision | Macro Recall | Macro F1-Score | Why Random Forest Wins |
|---|---|---|---|---|---|
| **Majority Class Baseline** | `51.12%` | `17.04%` | `33.33%` | `22.55%` | Predicts `Low` for everything; `0%` recall on High/Medium danger. |
| **Logistic Regression** | `67.37%` | `69.77%` | `54.73%` | `54.80%` | Linear decision hyperplanes cannot capture non-linear energy/depth interactions. |
| **Single Decision Tree** | `68.45%` | `61.65%` | `62.23%` | `61.90%` | Captures non-linear splits but overfits local coordinate noise (high variance). |
| **Random Forest (SeismoAI)** | **71.54%** | **65.85%** | **65.17%** | **65.48%** | Bagging + random feature splits reduce variance and capture spatial-energy interactions. |

### 5.3 Top Global SHAP & Gini Feature Importances (Exact CSV Values)
| Rank (SHAP) | Feature | Mean `\|SHAP\|` | `\|SHAP\|` High | `\|SHAP\|` Medium | `\|SHAP\|` Low | RF Gini Importance (Rank) |
|---|---|---|---|---|---|---|
| 1 | `eq_count_3yr` | **0.0684** | 0.0618 | 0.0536 | 0.0898 | `0.1532` (#1) |
| 2 | `seismic_energy_3yr` | **0.0518** | 0.0381 | 0.0421 | 0.0752 | `0.1345` (#2) |
| 3 | `mean_depth_3yr` | **0.0339** | 0.0274 | 0.0296 | 0.0449 | `0.1095` (#3) |
| 4 | `eq_count_1yr` | **0.0303** | 0.0345 | 0.0199 | 0.0366 | `0.0750` (#6) |
| 5 | `seismic_energy_1yr` | **0.0285** | 0.0272 | 0.0188 | 0.0395 | `0.0957` (#4) |
| 6 | `grid_lon` | **0.0243** | 0.0200 | 0.0198 | 0.0330 | `0.0709` (#7) |
| 7 | `grid_lat` | **0.0181** | 0.0148 | 0.0174 | 0.0222 | `0.0757` (#5) |

---

## 6. Tough Questions an AIML Analyst or Evaluator Will Ask (With Clear Answers)

**Q1: Why is `70.55%` (or `71.54%`) accuracy considered strong here? Why isn't it `95%`?**  
> **A:** Earthquakes are stochastic geophysical processes governed by unseen sub-surface stress accumulation. A naive baseline gets `51.1%` accuracy (`22.6%` macro F1) by always predicting `Low`. Crossing `70%+` accuracy and `65%` macro F1 on a strict **future chronological hold-out (`2019–2024`)** using only historical catalog statistics—with zero data leakage—demonstrates genuine predictive signal, while remaining scientifically honest about irreducible seismic uncertainty.

**Q2: Why is Medium Risk (`F1 ~0.60`) harder to classify than Low (`~0.80–0.85`) or High (`~0.72`)?**  
> **A:** Medium risk (`8.30 < HRS ≤ 10.68`) sits directly in the transition band between quiescent zones and active rupture zones. Small magnitude fluctuations (`M4.9` vs `M5.1`) shift a cell across the boundary, whereas `Low` (mostly 0 events) and `High` (persistent high energy/count) are much cleaner regimes.

**Q3: How did you prevent data leakage when creating rolling 3-year features?**  
> **A:** First, all features `X` for pivot year `y` are computed strictly from `[y−2, y]` (never `y+1`), while the target `HRS` is computed strictly from year `y+1`. Second, the train-test split separates **all** rows with `year <= 2018` (`6,052` rows) from `year >= 2019` (`2,136` rows), ensuring no future seismic window leaks into training.

**Q4: Why did you choose `1° × 1°` grids for ML training but H3 Resolution 5 for visualization?**  
> **A:** A `1° × 1°` cell (`~111 km × 111 km`) ensures enough `M ≥ 4.0` events per cell over 3 years for statistically stable means, trends, and energy sums (avoiding sparse zero-inflated cells). H3 Resolution 5 hexagons then map those grid centroids onto equal-area, 6-neighbor uniform polygons (`~252 km²` core H3 Res-5 geometry) that avoid rectangular latitude distortion and support clean `gridDisk` graph traversal for A*.

**Q5: Why include `seismic_energy_3yr` alongside `max_mag_3yr` and `eq_count_3yr`?**  
> **A:** Because Richter/Moment magnitude is logarithmic (`10^{1.5 M}`), two regions with `max_mag = 6.0` and `eq_count = 10` can have drastically different total strain release depending on whether the other 9 events were `M 4.0` or `M 5.8`. Summing `10^{1.5 M}` captures cumulative energy release—and SHAP confirms it is the **#2 most important feature** (`0.0518` mean `|SHAP|`).

**Q6: Why use `class_weight='balanced'` in the Random Forest?**  
> **A:** Our P50/P85 labeling creates a `51% / 34% / 15%` class imbalance. Without class balancing, decision trees optimize overall accuracy by over-predicting `Low` and under-predicting `High` risk—which is dangerous in disaster management where a **False Negative** (missing a High-risk zone) is far costlier than a False Positive.

**Q7: In A\* routing, why is Haversine distance an admissible heuristic?**  
> **A:** Because every edge cost is `step_distance × risk_multiplier` where `risk_multiplier ∈ {1.0, 5.0, 20.0} >= 1.0`, the true path cost between any cell `n` and the goal is always **greater than or equal to** the straight-line great-circle (Haversine) distance `h(n)`. Thus `h(n) <= h*(n)` always holds, mathematically guaranteeing that A\* finds the globally optimal lowest-risk path.

**Q8: What are the main limitations and future improvements?**  
> **A:** (1) Spatial resolution is currently `1° × 1°` (can be refined to `0.25°` or native H3 Res-6 aggregation where catalog density permits); (2) Random Forests treat each region-year row independently rather than modeling sequence memory (future work: LSTM / Temporal Convolutional Networks); (3) Current data uses historical CSV snapshots (future work: live streaming ingestion from the USGS API and ground-motion/tsunami multi-hazard coupling).

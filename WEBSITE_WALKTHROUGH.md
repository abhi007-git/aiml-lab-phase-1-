# SeismoAI — Website Walkthrough, Operations Manual & Architecture Guide

> **Project Title:** AI-Based Seismic Risk Prediction System (`SeismoAI`)  
> **Institution:** RV College of Engineering, Bengaluru — Dept. of CSE (AI & ML) (AI244AI)  
> **Authors:** Niranth S P (`1RV24CI079`), Prajwal A U (`1RV24CI084`), Sai Karthik RVK (`1RV24CI104`)  
> **Target Region & Catalog:** Japan (`24°N–48°N`, `122°E–150°E`) | USGS Earthquakes `M ≥ 4.0` (`2000–2025`)

---

## 1. Application Layout Overview

When you open the SeismoAI web console, the workspace is organized into a **3-column scientific dashboard** designed around an Ivory White (`#F8F7F2`) and Sand Beige (`#F1ECE2`) palette with Ocean Blue (`#0F4C81`) accents:

1. **Left Navigation Rail (`280px` fixed sidebar):**
   - Houses the **SeismoAI** emblem and the **PRIMARY MODULES** navigation list (`8` modules total):
     - `◆ Overview` *(Active)*
     - `◎ Public Risk Predictor` *(Active)*
     - `⌥ Predict Workstation` *(Active)*
     - `⛯ H3 Geospatial` *(Active)*
     - `❖ Tectonic Profiles` *(Under Development)*
     - `▲ Anomaly Threat` *(Under Development)*
     - `⧇ SHAP AI Explain` *(Under Development)*
     - `⌬ A* Evacuation` *(Under Development)*
2. **Center Main Visualization Area (`7.6` width ratio):**
   - Displays the active module's context callout (*"What does this mean?"*), interactive controls, charts, tables, or geographic maps.
3. **Right Intelligence Telemetry Panel (`2.4` width ratio):**
   - Dynamically updates per selected module to show **Monitor Register**, **Active Alerts**, **Briefings**, **Grid Metrics**, and **Methodology Notes**.

---

## 2. How to Operate Every Active Feature (Step-by-Step)

### Module 1: `◆ Overview` (Earth Intelligence Overview)
**Purpose:** High-level executive summary of the dataset, model validation scores, spatial coverage, and core equations.

- **Top KPI Row (4 Cards):**
  - **Earthquake Events (`29,951`):** Cleaned `M ≥ 4.0` USGS records across Japan (`2000–2025`).
  - **Monitored Cells (`356`):** Active `1° × 1°` spatial grid cells covering Japan and surrounding trenches.
  - **RF Model Accuracy (`70.55%`):** Reference Random Forest accuracy on the chronological hold-out test set (`2019–2024`), substantially outperforming the `~50%` majority-class baseline.
  - **Backtest Accuracy (`74.16%`):** Model accuracy specifically evaluated on the 2020 target-year backtest (pivot year `2019`).
- **Geospatial Event Map — Japan Seismic Zone:**
  - Interactive Plotly `Scattergeo` map plotting `1,500` stratified/sampled region-year observations colored by `Low` (Green `#2E8B57`), `Medium` (Amber `#D99A00`), and `High` (Red `#C0392B`) risk.
  - **How to operate:** Hover over any point to inspect its exact risk label and grid coordinates (`Lat`, `Lon`). Click legend items (`High`, `Medium`, `Low`) to toggle individual risk layers on/off.
- **Academic Platform Specifications Card:**
  - Displays the **Heuristic Risk Score (HRS)** equation (`HRS = log10(Count_3yr + 1) + 2.0 * MaxMagnitude_3yr`), quantile cutoffs (`P50` / `P85`), Uber H3 Resolution 5 indexing details, and the A* risk-weighted cost formula.
- **Historical Seismic Timeline (`2000–2025`):**
  - Bubble scatter timeline highlighting landmark Japanese earthquakes: **2003 Tokachi-oki (M8.3)**, **2004 Chūetsu (M6.6)**, **2011 Tohoku Megathrust (M9.0)**, **2016 Kumamoto (M7.0)**, **2018 Hokkaido Iburi (M6.7)**, and **2024 Noto Peninsula (M7.6)**. Hover over any bubble for event details.

---

### Module 2: `◎ Public Risk Predictor`
**Purpose:** Allows non-technical users, planners, or evaluators to pick a real historical coordinate and year in Japan, inspect its engineered seismic profile, and run **live Random Forest inference** (not a stored label lookup).

- **How to operate:**
  1. Select a **Prediction Year** from the dropdown (`2002` to `2024`).
  2. Select a **Latitude** (`24°N` to `46°N`) and **Longitude** (`123°E` to `149°E`).
     - *Recommended test coordinates for demo:*
       - **Tohoku Coast (High Risk):** Year `2011`, Lat `38`, Lon `141`
       - **Kumamoto / Kyushu:** Year `2016`, Lat `33`, Lon `131`
       - **Noto Peninsula:** Year `2024`, Lat `37`, Lon `137`
       - **Quiet Inland / Low Risk:** Year `2018`, Lat `35`, Lon `135`
  3. Click **`Predict Risk`**.
- **Reading the Output:**
  - If that `(year, lat, lon)` cell has no recorded `1° × 1°` entry in the dataset, a clear red alert banner prompts you to select another grid coordinate.
  - When a record is found:
    - **Historical Seismic Profile Table:** Shows the 11 retrieved input variables (`eq_count_3yr`, `eq_count_1yr`, `mean_mag_3yr`, `max_mag_3yr`, `mean_depth_3yr`, `seismic_energy_3yr`, `seismic_energy_1yr`, `freq_trend`, `mag_trend`, location, year).
    - **Seismic Threat Index Exposure Gauge (`0–100`):** Computed from the model's predicted probabilities as `int(Prob(High) * 100 + Prob(Medium) * 45)`.
    - **Predicted Risk Card:** Shows the predicted badge (`LOW RISK`, `MEDIUM RISK`, or `HIGH RISK`), exact `Prob(High)`, `Prob(Med)`, `Prob(Low)`, and a **Model Prediction Confidence** tier:
      - `>= 70%`: **HIGH CONFIDENCE**
      - `50% – 69.9%`: **MODERATE CONFIDENCE**
      - `< 50%`: **LOW CONFIDENCE**
    - **Local SHAP Feature Attribution:** Currently displays an *Under Development* notice (reserved for final evaluation release).

---

### Module 3: `⌥ Predict Workstation`
**Purpose:** Technical simulation and model validation workbench for analysts.

- **Tab 1 — `LIVE PREDICTOR`:**
  - **How to operate:** Adjust any of the **12 geological attribute controls** across Columns A and B (`Latitude Index`, `Longitude Index`, `Simulation Year`, `3Yr Event Count`, `3Yr Energy Index (J)`, `Frequency Trend Index`, `1Yr Event Count`, `Mean Hypocenter Depth (km)`, `Mean Magnitude (3yr)`, `Maximum Magnitude (3yr)`, `1Yr Energy Index (J)`, `Magnitude Trend Delta`).
  - **What happens:** Every slider change immediately fires `POST /api/predictor/live` and updates the **Seismic Threat Index Exposure Gauge**, **Output State Classification**, **Class Probabilities**, and **Confidence Tier** in real time.
  - *Demo tip:* Crank `3Yr Event Count` above `100`, `Maximum Magnitude` above `7.0`, and reduce `Mean Hypocenter Depth` below `35 km` to watch the gauge surge into **HIGH RISK**; increase depth to `200 km` and drop counts below `5` to watch it drop to **LOW RISK**.
  - *Note:* The Local SHAP Feature Attribution panel below the sliders is marked *Under Development*.
- **Tab 2 — `ENSEMBLE PERFORMANCE`:**
  - **How to operate:** Click the `ENSEMBLE PERFORMANCE` tab to inspect live evaluation metrics computed on the `2,136` chronological hold-out test samples (`pivot years 2019–2024`).
  - **Displays:**
    - **3×3 Confusion Matrix Heatmap:** Predicted vs. Actual counts across `Low`, `Medium`, and `High`.
    - **Metrics Descriptors Table:** Exact `Precision`, `Recall`, and `F1-Score` for each risk class.
    - Notice card for **Baseline Classifier Benchmarking & Historical Landmark Validation** *(Under Development)*.
- **Tab 3 — `FEATURE WEIGHTINGS`:**
  - Currently displays an *Under Development* notice for the Gini Feature Importance & SHAP Rank comparison matrix.

---

### Module 4: `⛯ H3 Geospatial`
**Purpose:** Translates `1° × 1°` grid predictions onto **Uber H3 Resolution 5 hexagonal cells** (`~252.9 km²` theoretical H3 Res-5 hex area / regional grid projection) over an interactive CartoDB Positron map.

- **How to operate:**
  1. **Telemetry Sync Year:** Choose any year from `2002` to `2024` to view the spatial risk snapshot for that year.
  2. **Time-Lapse Animation:** Click **`▶ START RUN TIME-LAPSE`** to automatically cycle chronologically through all 23 years (`2002 → 2024` at `900 ms` per year). A `📍 YYYY` header tracks the active frame. Click **`⏸ PAUSE TIME-LAPSE`** (or select a manual year) to stop playback.
  3. **Risk Classification Filters:** Click the **`High`**, **`Medium`**, and **`Low`** toggle chips to isolate specific hazard tiers (e.g., show only `High` risk zones).
  4. **Inspecting Individual Hexagons:** Click any colored hexagon on the map to open its telemetry popup showing:
     - H3 Cell ID (e.g., `852e6187fffffff`)
     - Predicted Risk Classification (`High` / `Medium` / `Low`)
     - Grid Coordinates (`°N, °E`)
     - `Probability (High)` (%)
     - `3Yr Event Count`, `3Yr Energy Index (J)`, and `Avg Hypocenter Depth (km)`

---

## 3. Modules Left as "Under Development" — What Will Be Built & Usage

To support staged evaluation, four full modules (and secondary sub-panels) are intentionally held in **Under Development** state while their backend data schemas and algorithms remain documented for the final presentation:

| Module / Component | What Will Be Built in Final Version | Real-World Usage & Analytical Value |
|---|---|---|
| **`❖ Tectonic Profiles` (K-Means Clustering)** | 1. **Tectonic Zonation Scatter Map** of all 356 grid cells.<br>2. **4-Axis Polar Radar Chart & Regional Dossiers** (`Quiet Crustal Zone`, `Active Plate Boundary`, `Deep Subduction Slab`, `Tohoku Mega-Hotspot`).<br>3. **Elbow Method (WCSS) & Silhouette Score** validation plots for `K = 2..8`. | Unsupervised geophysical zoning without needing risk labels. Lets researchers distinguish shallow hazardous crustal zones from deep Wadati-Benioff subduction slabs (`>100 km` depth). |
| **`▲ Anomaly Threat` (Isolation Forest)** | 1. **4 Anomaly KPI Cards** (`82` anomalies detected, Peak Mag `M 9.1`, Most Recent `2024`, Avg Score `-0.0561`).<br>2. **Leaflet CircleMarker Severity Map** scaled by anomaly intensity.<br>3. **Top 15 Critical Anomalies Table** cross-referenced with USGS events (`2011 Tohoku`, `2003 Tokachi-oki`, `2010 Bonin Islands`, `2004 Kii Peninsula`). | Flags statistically rare region-years (`1%` contamination threshold) corresponding to foreshock/aftershock swarms or major ruptures that deviate from baseline seismicity. |
| **`⧇ SHAP AI Explain` & Local SHAP Charts** | 1. **Global SHAP Stacked Bar Matrix** decomposed into `High`, `Medium`, and `Low` class contributions.<br>2. **Beeswarm Density Summary Plot** (`shap_summary_plot.png`).<br>3. **Local Feature Attribution Bars + Plain-English Drivers** inside both predictors.<br>4. **Gini vs. SHAP Rank Table** (`Feature Weightings`). | Solves ML "black-box" opacity. Verifies that the Random Forest relies on physically meaningful variables (`eq_count_3yr`, `seismic_energy_3yr`, `mean_depth_3yr`) rather than spurious artifacts. |
| **`⌬ A* Evacuation` (H3 Route Planner)** | 1. **Start & Destination City Selectors** (`Tokyo`, `Sendai`, `Osaka`, `Sapporo`, `Nagoya`, `Fukushima`, `Noto Peninsula`, `Hiroshima`).<br>2. **A\* Graph Traversal** over adjacent H3 Res-5 cells (`gridDisk(cell, 1)`) comparing **Shortest Path** (`1x` uniform cost) vs. **Safest Path** (`Low=1x`, `Med=5x`, `High=20x`).<br>3. **Route Risk Breakdown Table & Dual-Polyline Map**. | Converts risk classification into actionable emergency logistics—routing evacuation corridors around High-risk coastal/trench hexagons at a modest `5–15%` distance trade-off. |
| **Workstation Benchmarks** | 1. **4-Model Comparison Table** (`Majority Class` vs. `Logistic Regression` vs. `Decision Tree` vs. `Random Forest`).<br>2. **Landmark Earthquake Validation Matrix** (`2011 Tohoku`, `2016 Kumamoto`, `2024 Noto`). | Proves empirically that ensemble Random Forests outperform linear and single-tree baselines on non-linear seismic data and accurately classify historic disasters. |

---

## 4. Tech Stack Used & Why

### Original Academic Pipeline (Report Specification) vs. Live Web Runtime
In the project report, the offline ML research and prototyping pipeline was developed in **Python 3.14** (`scikit-learn`, `SHAP 0.52`, `Uber H3 4.x`, `Plotly`, `Folium`, `Streamlit`). To deploy an ultra-responsive, zero-dependency, browser-native web platform on port `3000` in this container environment (without requiring Python/Streamlit servers or external paid APIs), the live web console runs on a **TypeScript Full-Stack Web Architecture**:

| Layer | Technology Used | Why It Was Chosen |
|---|---|---|
| **Backend Server** | **Node.js 22 + Express + TypeScript (`tsx`)** | Runs both the REST API (`/api/*`) and Vite SPA middleware in a single process on `0.0.0.0:3000` with sub-millisecond CSV/model access and strong type safety. |
| **In-Memory ML Engine** | **Custom TypeScript CART Random Forest + Linear Softmax + Haversine A\*** (`server/ml.ts`) | Trains directly on `labeled_seismic_features.csv` (`year <= 2018`) on server startup in `< 500 ms` with zero native C++ bindings—guaranteeing real, live ML inference rather than canned responses. |
| **Frontend Framework** | **React 18 + Vite + TypeScript** | Fast reactive UI updates (crucial for real-time slider inference and smooth 900 ms H3 time-lapse playback without full-page Streamlit reruns). |
| **Interactive Charts** | **Plotly.js (`plotly.js-dist-min`)** | Preserves publication-grade `Scattergeo` Japan maps, radial gauges, confusion matrix heatmaps, and timeline bubble plots directly in the browser. |
| **Geospatial Mapping** | **Leaflet + CartoDB Positron Basemap** | Lightweight, crisp cartographic tiles (`OpenStreetMap` + `CARTO`) supporting custom H3 polygon layers, interactive popups, and floating legends **with zero API keys required**. |
| **Hexagonal Spatial Indexing** | **Uber `h3-js` (v4)** | Official pure-JS/WebAssembly port of Uber's H3 C library, providing exact `latLngToCell`, `cellToBoundary`, `cellToLatLng`, and `gridDisk` operations identical to Python `h3`. |
| **API Keys Required** | **None (`0` external keys)** | All earthquake data is stored locally in verified USGS-derived CSVs, and map tiles use public CartoDB Positron endpoints. |

---
name: prism-algorithm-selector
description: |
  Problem to algorithm mapping. Decision trees for algorithm selection.
---

**MIT Foundation:** 6.046J (Algorithms), 15.083J (Optimization), 6.867 (ML)

## QUICK REFERENCE BY PROBLEM TYPE

### 🎯 OPTIMIZATION PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Minimize cost with constraints | Simplex / Interior Point | PRISM_CONSTRAINED_OPTIMIZER | 6.251J |
| Multi-objective (cost + time) | NSGA-II | PRISM_NSGA2 | 15.083J |
| Sequence operations | Ant Colony / Genetic | PRISM_ACO_SEQUENCER | 6.034 |
| Parameter tuning | Bayesian Optimization | PRISM_BAYESIAN_SYSTEM | 6.867 |
| Global search (many local minima) | Simulated Annealing | PRISM_SIMULATED_ANNEALING | 6.046J |
| Continuous optimization | Gradient Descent / Adam | PRISM_ADAM_OPTIMIZER | 6.867 |

### 📊 PREDICTION PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Predict numeric value | Random Forest / XGBoost | PRISM_XGBOOST_ENGINE | 6.867 |
| Classify categories | SVM / Logistic Regression | PRISM_SVM_ENGINE | 6.867 |
| Time series forecast | LSTM | PRISM_LSTM_ENGINE | 6.867 |
| Uncertainty quantification | Bayesian / Monte Carlo | PRISM_MONTE_CARLO_ENGINE | 6.041 |
| Few training samples | KNN / Bayesian | PRISM_KNN_ENGINE | 6.867 |

### 🔧 MANUFACTURING PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Cutting force calculation | Kienzle Model | PRISM_KIENZLE_FORCE | 2.810 |
| Tool life prediction | Taylor Equation | PRISM_TAYLOR_TOOL_LIFE | 2.810 |
| Chatter prediction | Stability Lobes | PRISM_STABILITY_LOBES | 2.032 |
| Material flow stress | Johnson-Cook | PRISM_JOHNSON_COOK_ENGINE | 2.810 |
| Heat distribution | FEM / Fourier | PRISM_HEAT_TRANSFER_ENGINE | 2.51 |
| Tool deflection | Beam Theory | PRISM_DEFLECTION_ENGINE | 2.003 |

### 📐 GEOMETRY/CAD PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Collision detection | GJK / A* | PRISM_COLLISION_ENGINE | 6.837 |
| Surface intersection | NURBS | PRISM_SURFACE_INTERSECTION_ENGINE | 6.838 |
| Mesh simplification | Decimation | PRISM_MESH_DECIMATION_ENGINE | 6.838 |
| Feature recognition | Pattern Matching | PRISM_COMPLETE_FEATURE_ENGINE | 6.838 |
| Toolpath optimization | Dijkstra / A* | PRISM_TOOLPATH_OPTIMIZER | 6.046J |

### 📈 SIGNAL PROCESSING PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Frequency analysis | FFT | PRISM_FFT_PREDICTIVE_CHATTER | 6.011 |
| Vibration detection | Wavelet Transform | PRISM_WAVELET_CHATTER | 6.341 |
| Noise filtering | Kalman Filter | PRISM_KALMAN_FILTER | 6.011 |
| Time-frequency analysis | STFT | PRISM_STFT_ENGINE | 6.011 |

### 📅 SCHEDULING PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Job shop scheduling | Dispatching + Meta | PRISM_JOB_SHOP_SCHEDULING_ENGINE | 2.854 |
| Resource allocation | Hungarian / Simplex | PRISM_SCHEDULING_ENGINE | 15.082J |
| Lead time estimation | PERT / Monte Carlo | PRISM_LEAD_TIME_PREDICTOR | 15.060 |
| Capacity planning | Linear Programming | PRISM_CAPACITY_PLANNER | 6.251J |

## COMMON USE CASES WITH EXAMPLES

### Use Case 1: Optimize Cutting Parameters
```
PROBLEM: Find speed, feed, depth that minimize cost while meeting surface finish

SELECTION:
- Category: Multi-objective optimization
- Algorithm: NSGA-II (handles 2-3 objectives well)
- Engine: PRISM_NSGA2

USAGE:
PRISM_NSGA2.optimize({
  objectives: ['minimize_cost', 'minimize_time', 'maximize_tool_life'],
  variables: {
    speed: {min: 50, max: 500},
    feed: {min: 0.05, max: 0.5},
    depth: {min: 0.5, max: 5.0}
  },
  constraints: [
    {type: 'surface_finish', max: 1.6},
    {type: 'power', max: machine.maxPower}
  ]
});

ALTERNATIVES:
- MOEA/D if >4 objectives
- Weighted sum if priorities clear
- PSO if faster convergence needed
```

### Use Case 2: Predict Tool Life
```
PROBLEM: Estimate remaining tool life from current conditions

SELECTION:
- Category: Prediction (regression)
- Algorithm: XGBoost (handles nonlinearity, robust)
- Engine: PRISM_XGBOOST_ENGINE

USAGE:
const model = PRISM_XGBOOST_ENGINE.train({
  features: ['speed', 'feed', 'material_hardness', 'coating', 'coolant'],
  target: 'tool_life_minutes',
  data: historicalData
});

const prediction = model.predict({
  speed: 200,
  feed: 0.15,
  material_hardness: 250,
  coating: 'TiAlN',
  coolant: 'flood'
});

ALTERNATIVES:
- Random Forest for interpretability
- LSTM if sequential wear data
- Bayesian for uncertainty bounds
```

### Use Case 3: Detect Chatter
```
PROBLEM: Real-time chatter detection from vibration sensor

SELECTION:
- Category: Signal processing
- Algorithm: FFT + threshold / Wavelet
- Engine: PRISM_FFT_PREDICTIVE_CHATTER

USAGE:
PRISM_FFT_PREDICTIVE_CHATTER.analyze({
  signal: vibrationData,
  sampleRate: 10000,
  windowSize: 1024,
  chatterFrequencies: [500, 1000, 1500] // from stability analysis
});

ALTERNATIVES:
- Wavelet for time-localized events
- EMD for non-stationary signals
- ML classifier for pattern recognition
```

### Use Case 4: Sequence Operations
```
PROBLEM: Order machining operations to minimize setup changes

SELECTION:
- Category: Combinatorial optimization
- Algorithm: Ant Colony Optimization
- Engine: PRISM_ACO_SEQUENCER

USAGE:
PRISM_ACO_SEQUENCER.sequence({
  operations: operationList,
  setupMatrix: setupTimesBetweenOps,
  constraints: {
    precedence: precedenceGraph,
    maxMachines: 3
  }
});

ALTERNATIVES:
- Genetic Algorithm for diverse solutions
- Tabu Search for fast local optimization
- Branch & Bound for optimal (small problems)
```

### Use Case 5: Cluster Similar Materials
```
PROBLEM: Group materials with similar machinability

SELECTION:
- Category: Unsupervised learning
- Algorithm: DBSCAN (finds natural clusters)
- Engine: PRISM_CLUSTERING_ENGINE

USAGE:
PRISM_CLUSTERING_ENGINE.cluster({
  method: 'dbscan',
  data: materialsWithProperties,
  features: ['hardness', 'machinability', 'thermal_conductivity'],
  eps: 0.5,  // neighborhood radius
  minSamples: 3
});

ALTERNATIVES:
- K-Means if k is known
- Hierarchical for dendrogram visualization
- UMAP + clustering for high dimensions
```

## INTEGRATION WITH PRISM

### In Speed & Feed Calculator
```javascript
// Use PRISM_BAYESIAN_SYSTEM for parameter optimization with uncertainty
const result = PRISM_BAYESIAN_SYSTEM.optimize({
  priors: materialProperties,
  observed: sensorData,
  objective: 'optimal_speed'
});
```

### In Quoting Engine
```javascript
// Use PRISM_MONTE_CARLO for cost uncertainty
const costEstimate = PRISM_MONTE_CARLO.simulate({
  inputs: {
    cycleTime: {mean: 45, std: 5},
    materialCost: {mean: 100, std: 10}
  },
  iterations: 10000
});
```

### In Auto Programmer
```javascript
// Use PRISM_ACO_SEQUENCER for toolpath optimization
const optimalPath = PRISM_ACO_SEQUENCER.optimize({
  features: partFeatures,
  tools: availableTools,
  objective: 'minimize_cycle_time'
});
```

## SOURCE

**ALGORITHM_REGISTRY.json** location:
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\MIT COURSES\ALGORITHM_REGISTRY.json
```

**Statistics:**
- 285 algorithms catalogued
- 187 of 213 PRISM engines mapped (87.8%)
- 9 major categories
- 35+ subcategories

---

## END OF SKILL

**Impact:** Algorithm selection from hours → seconds
**MIT Foundation:** 6.046J algorithms, 15.083J optimization, 6.867 ML

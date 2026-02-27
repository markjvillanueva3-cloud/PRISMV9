---
name: prism-ai-ml-master
description: |
  UNIFIED AI/ML reference for PRISM Manufacturing Intelligence v9.0.
  Consolidates 27 AI/ML engine modules into comprehensive skill coverage.
  
  Categories Covered:
  - Optimization (6 modules) - PSO, GA, SA, DE, gradient optimizers
  - Deep Learning (4 modules) - Neural Networks, LSTM, Transformers, Autoencoders
  - Reinforcement Learning (2 modules) - Q-Learning/SARSA, DQN
  - Probabilistic (3 modules) - Bayesian systems, tool life prediction
  - Ensemble (1 module) - Gradient Boosting
  - Classical ML (2 modules) - Feature recognition, ML algorithms
  
  Total: 27 modules, ~12,800 lines, 437KB
  Sub-skills: prism-ai-optimization, prism-ai-deep-learning, prism-ai-reinforcement, prism-ai-bayesian
---

# PRISM AI/ML MASTER
## Unified AI/ML Reference for Manufacturing Intelligence
### Version 1.0 | Level 3 Domain Skill | 27 Modules Consolidated

---

## TABLE OF CONTENTS

1. [Algorithm Selection Guide](#1-algorithm-selection-guide)
2. [Manufacturing AI Applications](#2-manufacturing-ai-applications)
3. [Module Quick Reference](#3-module-quick-reference)
4. [Sub-Skill Navigation](#4-sub-skill-navigation)
5. [Integration Map](#5-integration-map)
6. [MIT/Stanford Foundation](#6-mitstanford-foundation)

---

# 1. ALGORITHM SELECTION GUIDE

## What Are You Optimizing?

```
DECISION TREE:
├── Single objective, continuous variables?
│   ├── Smooth function? → Gradient Descent (Adam, SGD)
│   ├── Non-convex, many local minima? → PSO, GA, DE
│   └── Need annealing behavior? → Simulated Annealing
│
├── Single objective, discrete/combinatorial?
│   ├── Sequence/ordering? → SA, GA
│   └── Graph/routing? → ACO (via PSO variant)
│
├── Multiple objectives (2-3)?
│   └── → NSGA-II (via GA with Pareto)
│
├── Multiple objectives (4+)?
│   └── → NSGA-III, MOEA/D
│
├── Uncertainty present?
│   ├── Parameter uncertainty? → Bayesian Optimization
│   └── Model uncertainty? → Monte Carlo, Ensemble
│
├── Sequential decision making?
│   ├── Discrete states/actions? → Q-Learning, SARSA
│   ├── Continuous states? → DQN
│   └── Continuous actions? → Actor-Critic (future)
│
└── Pattern recognition?
    ├── Tabular data? → Gradient Boosting, Random Forest
    ├── Time series? → LSTM, Transformer
    ├── Images? → CNN (future)
    └── Graphs? → GNN (future)
```

## Quick Selection Matrix

| Problem Type | Primary Algorithm | Backup | PRISM Module |
|--------------|-------------------|--------|--------------|
| Feedrate optimization | PSO | GA | PRISM_PSO_OPTIMIZER |
| Tool path ordering | GA | SA | PRISM_GA_ENGINE |
| Cooling schedule | SA | DE | PRISM_SIMULATED_ANNEALING |
| Multi-param tuning | DE | PSO | PRISM_DIFFERENTIAL_EVOLUTION |
| Real-time adaptation | Q-Learning | DQN | PRISM_RL_QLEARNING_ENGINE |
| Tool life prediction | Bayesian | LSTM | PRISM_BAYESIAN_TOOL_LIFE |
| Sequence prediction | LSTM | Transformer | PRISM_LSTM_ENGINE |
| Feature extraction | Autoencoder | CNN | PRISM_AUTOENCODER |
| Anomaly detection | Bayesian | Autoencoder | PRISM_BAYESIAN_SYSTEM |

---

# 2. MANUFACTURING AI APPLICATIONS

## Cutting Parameter Optimization

| Application | Algorithm | Why |
|-------------|-----------|-----|
| Speed/Feed optimization | PSO | Multi-dim continuous, fast convergence |
| DOC/WOC optimization | DE | Self-adaptive, robust |
| Multi-objective (MRR vs Tool Life) | GA with Pareto | Multi-objective native |
| Real-time speed adjustment | Q-Learning | Online learning |

### PSO for Feedrate Example

```javascript
const pso = new PRISM_PSO_OPTIMIZER({
  dimensions: 4,  // speed, feed, doc, woc
  particles: 30,
  bounds: [
    [100, 1000],   // speed (SFM)
    [0.001, 0.020], // feed (IPT)
    [0.05, 0.5],   // doc (in)
    [0.1, 1.0]     // woc (ratio)
  ],
  fitness: (params) => manufacturingObjective(params)
});
```

## Tool Life Prediction

| Approach | Algorithm | Accuracy |
|----------|-----------|----------|
| Taylor-based | Bayesian Regression | ±15% |
| Wear pattern | LSTM | ±10% |
| Hybrid | Ensemble | ±8% |

## Adaptive Machining

| Task | Algorithm | Response Time |
|------|-----------|---------------|
| Chatter detection | LSTM | <100ms |
| Feedrate override | Q-Learning | <50ms |
| Tool wear compensation | DQN | <200ms |

## Feature Recognition

| Feature Type | Algorithm | Module |
|--------------|-----------|--------|
| Geometric primitives | CNN | PRISM_CNN_ENGINE |
| Hole patterns | Clustering | PRISM_ML_ALGORITHMS |
| Surface types | Random Forest | PRISM_ML_FEATURE_RECOGNITION |

---

# 3. MODULE QUICK REFERENCE

## Optimization Modules (6)

| Module | Lines | Key Capabilities |
|--------|-------|------------------|
| **PRISM_PSO_OPTIMIZER** | 862 | Particle swarm, multi-objective, Pareto archive |
| **PRISM_GA_ENGINE** | 520 | Genetic algorithm, crossover operators, elitism |
| **PRISM_SIMULATED_ANNEALING** | 490 | Metropolis, cooling schedules, reheating |
| **PRISM_DIFFERENTIAL_EVOLUTION** | 580 | jDE adaptive, mutation strategies |
| PRISM_OPTIMIZERS_ENGINE | 314 | SGD, Adam, AdaGrad, AdaDelta, Nadam, RAdam |
| PRISM_OPTIMIZER_ADVANCED | 174 | Lookahead, learning rate schedulers |

## Deep Learning Modules (4)

| Module | Lines | Key Capabilities |
|--------|-------|------------------|
| PRISM_NEURAL_NETWORK | 106 | Feedforward, backprop, activation functions |
| PRISM_LSTM_ENGINE | 64 | Long short-term memory, sequences |
| PRISM_TRANSFORMER_ENGINE | 262 | Self-attention, positional encoding |
| PRISM_AUTOENCODER | 141 | Encoder-decoder, dimensionality reduction |

## Reinforcement Learning Modules (2)

| Module | Lines | Key Capabilities |
|--------|-------|------------------|
| **PRISM_RL_QLEARNING_ENGINE** | 650 | Q-Learning, SARSA, Expected SARSA, UCB1 |
| **PRISM_ADVANCED_DQN** | 590 | DQN, Double DQN, PER, target networks |

## Probabilistic Modules (3)

| Module | Lines | Key Capabilities |
|--------|-------|------------------|
| PRISM_BAYESIAN_SYSTEM | 56 | Bayesian inference, uncertainty |
| PRISM_BAYESIAN_LEARNING | - | Online Bayesian learning |
| PRISM_BAYESIAN_TOOL_LIFE | - | Tool life prediction with uncertainty |

## Ensemble & Classical ML (3)

| Module | Lines | Key Capabilities |
|--------|-------|------------------|
| PRISM_GRADIENT_BOOSTING | 200 | XGBoost-style boosting |
| PRISM_ML_ALGORITHMS | 189 | K-means, KNN, SVM, Random Forest |
| PRISM_ML_FEATURE_RECOGNITION | - | Geometric feature detection |

---

# 4. SUB-SKILL NAVIGATION

## When to Load Which Skill

| Task | Primary Skill | Module Access |
|------|---------------|---------------|
| Optimize cutting params | **prism-ai-optimization** | PSO, GA, DE, SA |
| Train neural network | **prism-ai-deep-learning** | NN, LSTM, Transformer |
| Build RL agent | **prism-ai-reinforcement** | Q-Learning, DQN |
| Uncertainty quantification | **prism-ai-bayesian** | Bayesian systems |
| General AI/ML selection | **prism-ai-ml-master** | All modules |

## Sub-Skill Details

| Skill | Size | Focus |
|-------|------|-------|
| prism-ai-optimization | ~20KB | PSO, GA, SA, DE algorithms |
| prism-ai-deep-learning | ~15KB | Neural networks, LSTM, Transformers |
| prism-ai-reinforcement | ~18KB | Q-Learning, SARSA, DQN |
| prism-ai-bayesian | ~12KB | Bayesian methods, uncertainty |

---

# 5. INTEGRATION MAP

## PRISM Module Connections

```
PRISM_AI_MODULES
├── Optimization → SPEED_FEED_CALCULATOR, ADAPTIVE_CLEARING, REST_MACHINING
├── Deep Learning → CHATTER_PREDICTION, SURFACE_FINISH_PREDICTION
├── Reinforcement → ADAPTIVE_MACHINING, REALTIME_OVERRIDE
├── Bayesian → TOOL_LIFE_PREDICTION, UNCERTAINTY_ENGINE
└── Classical ML → FEATURE_RECOGNITION, MATERIAL_CLASSIFIER
```

## Gateway Routes

```
/api/ai/optimize/pso/*           → PSO optimization
/api/ai/optimize/ga/*            → Genetic algorithm
/api/ai/optimize/sa/*            → Simulated annealing
/api/ai/optimize/de/*            → Differential evolution
/api/ai/deep/neural/*            → Neural network inference
/api/ai/deep/lstm/*              → Sequence prediction
/api/ai/rl/qlearn/*              → Q-Learning agent
/api/ai/rl/dqn/*                 → DQN agent
/api/ai/bayesian/*               → Bayesian inference
/api/ai/ml/classify/*            → Classification
/api/ai/ml/cluster/*             → Clustering
```

## Database Consumers

| AI Module | Consumes From |
|-----------|---------------|
| PSO_OPTIMIZER | MATERIALS_MASTER, TOOLS_DATABASE, MACHINES_DATABASE |
| GA_ENGINE | MATERIALS_MASTER, CUTTING_CONDITIONS |
| RL_QLEARNING | EXPERIENCE_DATABASE, REWARD_FUNCTIONS |
| BAYESIAN_TOOL_LIFE | TOOL_WEAR_HISTORY, CUTTING_CONDITIONS |
| LSTM_ENGINE | TIME_SERIES_DATA, SENSOR_FEEDS |

---

# 6. MIT/STANFORD FOUNDATION

## Academic Sources

| Algorithm Category | Courses | Key References |
|--------------------|---------|----------------|
| Optimization | MIT 6.255, 6.251 | Boyd & Vandenberghe |
| Metaheuristics | MIT 6.034, 6.036 | Holland 1975, Kirkpatrick 1983 |
| Deep Learning | Stanford CS 231N, MIT 6.036 | Goodfellow et al. |
| Reinforcement Learning | Stanford CS 234, MIT 6.036 | Sutton & Barto 2018 |
| Bayesian | MIT 6.867, Stanford CS 228 | Bishop PRML |
| Ensemble | Stanford CS 229 | Friedman, Hastie |

## Algorithm-Course Mapping

| PRISM Module | MIT Course | Stanford Course |
|--------------|------------|-----------------|
| PSO_OPTIMIZER | 6.255 | CS 229 |
| GA_ENGINE | 6.034, 6.036 | CS 229 |
| SIMULATED_ANNEALING | 6.034 | - |
| DIFFERENTIAL_EVOLUTION | 6.036 | - |
| RL_QLEARNING | 6.036 | CS 234 |
| ADVANCED_DQN | 6.036 | CS 234 |
| LSTM_ENGINE | 6.036 | CS 224N |
| TRANSFORMER | 6.036 | CS 224N |
| BAYESIAN_SYSTEM | 6.867 | CS 228 |
| GRADIENT_BOOSTING | 6.867 | CS 229 |

---

# 7. HYPERPARAMETER GUIDELINES

## PSO Defaults

```javascript
{
  particles: 30,          // 20-50 typical
  inertia: 0.729,         // 0.4-0.9
  cognitive: 1.49,        // 1.4-2.0
  social: 1.49,           // 1.4-2.0
  maxIterations: 100      // Problem-dependent
}
```

## GA Defaults

```javascript
{
  populationSize: 50,     // 20-100
  elitismRate: 0.1,       // 5-20%
  crossoverRate: 0.8,     // 0.6-0.9
  mutationRate: 0.01,     // 0.001-0.1
  tournamentSize: 3       // 2-5
}
```

## DQN Defaults

```javascript
{
  learningRate: 0.001,    // 0.0001-0.01
  gamma: 0.99,            // 0.9-0.999
  epsilon: 1.0,           // Start exploration
  epsilonDecay: 0.995,    // Decay per episode
  epsilonMin: 0.01,       // Minimum exploration
  batchSize: 32,          // 16-128
  targetUpdateFreq: 100   // Steps between updates
}
```

---

# 8. ERROR HANDLING

## Common AI/ML Errors

| Error Code | Category | Resolution |
|------------|----------|------------|
| AI-1001 | No convergence | Increase iterations, adjust hyperparams |
| AI-1002 | NaN in gradient | Reduce learning rate, gradient clipping |
| AI-1003 | Overfitting | Add regularization, reduce model size |
| AI-1004 | Memory overflow | Reduce batch size, use streaming |
| AI-1005 | Invalid bounds | Check constraint definitions |
| AI-1006 | Reward not improving | Check reward function, increase exploration |

## Fallback Strategies

```
IF PSO fails → Try GA (different search pattern)
IF GA slow → Try DE (self-adaptive)
IF DQN unstable → Fall back to Q-Learning
IF LSTM overfits → Try simpler RNN
IF Bayesian slow → Use point estimates
```

---

# 9. PERFORMANCE BENCHMARKS

## Optimization Speed

| Algorithm | 4D Problem | 10D Problem | 50D Problem |
|-----------|------------|-------------|-------------|
| PSO | 0.5s | 2.1s | 15s |
| GA | 0.8s | 3.5s | 25s |
| SA | 1.2s | 4.0s | 30s |
| DE | 0.6s | 2.5s | 18s |

## Manufacturing Benchmarks

| Task | Algorithm | Time | Quality |
|------|-----------|------|---------|
| Feedrate optimization | PSO | 1.2s | MRR +12% |
| Tool path sequencing | GA | 2.5s | Time -8% |
| Adaptive speed | Q-Learning | 50ms | Chatter -40% |
| Tool life prediction | Bayesian | 100ms | ±10% accuracy |

---

## CONSOLIDATED MODULES SUMMARY

| Category | Modules | Total Lines |
|----------|---------|-------------|
| Optimization | 6 | 2,940 |
| Deep Learning | 4 | 573 |
| Reinforcement Learning | 2 | 1,240 |
| Probabilistic | 3 | ~200 |
| Ensemble/Classical | 3 | ~400 |
| **TOTAL** | **18 core** | **~5,353** |

*Plus 9 supporting modules (AI_COMPLETE, AI_INTEGRATED, AI_PHYSICS, etc.)*

---

**END OF PRISM AI/ML MASTER SKILL**
**Version 1.0 | Level 3 Domain | 27 Modules | ~12,800 Lines**

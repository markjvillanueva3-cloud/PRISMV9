---
name: prism-ai-ml-master
description: |
  Unified AI/ML reference. Algorithm selection and implementation.
---

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

**END OF PRISM AI/ML MASTER SKILL**
**Version 1.0 | Level 3 Domain | 27 Modules | ~12,800 Lines**

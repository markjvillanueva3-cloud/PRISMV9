# PRISM AI/ML ENGINE PATTERNS SKILL
## Complete Algorithm Templates for Manufacturing Intelligence
## Version 1.0 | 2026-01-30

---

# OVERVIEW

This skill provides comprehensive templates and patterns for implementing AI/ML algorithms in PRISM Manufacturing Intelligence. Each pattern includes academic sources, core implementation, manufacturing integration, and validation requirements.

---

# ALGORITHM CATEGORIES

| Category | Algorithms | Use Cases |
|----------|------------|-----------|
| **Metaheuristic Optimization** | GA, SA, DE, PSO, ACO | Parameter optimization, toolpath planning |
| **Reinforcement Learning** | Q-Learning, SARSA, DQN, A2C, PPO | Adaptive control, process learning |
| **Deep Learning** | CNN, RNN, LSTM, Transformer | Feature recognition, sequence prediction |
| **Ensemble Methods** | Random Forest, Gradient Boosting, XGBoost | Quality prediction, anomaly detection |
| **Probabilistic** | Bayesian, Monte Carlo, Kalman | Uncertainty quantification, state estimation |
| **Classical ML** | SVM, KNN, Decision Trees | Classification, regression |
| **Gradient-Based** | SGD, Adam, AdaGrad, RMSprop | Neural network training |

---

# PATTERN 1: METAHEURISTIC OPTIMIZATION

## 1.1 Genetic Algorithm (GA)

### Academic Sources
```
MIT 6.034: Artificial Intelligence
MIT 6.036: Introduction to Machine Learning
Holland, J.H. (1975): "Adaptation in Natural and Artificial Systems"
Goldberg, D.E. (1989): "Genetic Algorithms in Search, Optimization and Machine Learning"
```

### Core Components
```javascript
const GA_COMPONENTS = {
  // Population
  initialization: ['random_uniform', 'latin_hypercube', 'sobol_sequence'],
  
  // Selection
  selection: {
    tournament: { tournamentSize: 3 },
    rouletteWheel: { scalingMethod: 'linear' },
    rank: { selectionPressure: 2.0 },
    elitism: { ratio: 0.1 }
  },
  
  // Crossover
  crossover: {
    singlePoint: { rate: 0.8 },
    twoPoint: { rate: 0.8 },
    uniform: { rate: 0.8, mixRatio: 0.5 },
    blend: { alpha: 0.5 },       // BLX-α for real-valued
    sbx: { eta: 20 }             // Simulated Binary Crossover
  },
  
  // Mutation
  mutation: {
    gaussian: { sigma: 0.1, rate: 0.01 },
    uniform: { rate: 0.01 },
    polynomial: { eta: 20, rate: 0.01 },  // For bounded
    boundary: { rate: 0.01 }               // Push to bounds
  }
};
```

### Manufacturing Integration
```javascript
// Cutting parameter optimization
function gaOptimizeCutting(material, tool, machine) {
  const bounds = [
    [material.minSpeed, material.maxSpeed],       // Cutting speed (m/min)
    [material.minFeed * tool.flutes, material.maxFeed * tool.flutes],  // Feed (mm/rev)
    [0.5, tool.maxDoc]                            // Depth of cut (mm)
  ];
  
  const fitness = (chromosome) => {
    const [Vc, fz, ap] = chromosome;
    const MRR = Vc * fz * ap;                     // Material removal rate
    const toolLife = taylorToolLife(Vc, fz, ap, material);
    const power = cuttingPower(Vc, fz, ap, material);
    
    // Multi-objective: maximize MRR, maximize tool life, minimize power
    return 0.5 * MRR / maxMRR + 0.3 * toolLife / maxLife - 0.2 * power / maxPower;
  };
  
  return new GeneticAlgorithm({ bounds, fitness, populationSize: 50, maxGenerations: 100 });
}
```

---

## 1.2 Simulated Annealing (SA)

### Academic Sources
```
MIT 6.034: Artificial Intelligence
Kirkpatrick, S. et al. (1983): "Optimization by Simulated Annealing"
Černý, V. (1985): "Thermodynamical approach to the traveling salesman problem"
```

### Core Components
```javascript
const SA_COMPONENTS = {
  // Cooling schedules
  cooling: {
    geometric: { rate: 0.95 },           // T(k+1) = α * T(k)
    linear: { delta: 0.1 },              // T(k+1) = T(k) - δ
    logarithmic: { c: 1.0 },             // T(k) = c / ln(k+1)
    exponential: { rate: 0.99 },         // T(k) = T0 * exp(-αk)
    adaptive: { windowSize: 100 }        // Adjust based on acceptance ratio
  },
  
  // Acceptance criterion
  acceptance: {
    metropolis: true,                    // P = exp(-ΔE/T) if ΔE > 0
    threshold: false                     // Accept if ΔE/T < threshold
  },
  
  // Reheating strategies
  reheating: {
    onStagnation: { iterations: 50, factor: 1.5 },
    periodic: { interval: 100, factor: 1.2 }
  },
  
  // Neighbor generation
  neighbor: {
    gaussian: { sigma: 'temperature_scaled' },
    uniform: { range: 'adaptive' },
    combinatorial: { swapType: '2-opt' }
  }
};
```

### Manufacturing Integration
```javascript
// Tool sequence optimization (TSP-like)
function saOptimizeToolSequence(tools, operations) {
  const distance = (seq) => {
    let total = 0;
    for (let i = 0; i < seq.length - 1; i++) {
      total += toolChangeTime(seq[i], seq[i+1]);
    }
    return total;
  };
  
  const neighbor = (seq) => {
    // 2-opt swap
    const i = Math.floor(Math.random() * seq.length);
    const j = Math.floor(Math.random() * seq.length);
    const newSeq = [...seq];
    [newSeq[i], newSeq[j]] = [newSeq[j], newSeq[i]];
    return newSeq;
  };
  
  return new SimulatedAnnealing({
    initialTemp: 1000,
    minTemp: 0.01,
    coolingSchedule: 'geometric',
    coolingRate: 0.95,
    energyFunction: distance,
    neighborFunction: neighbor
  });
}
```

---

## 1.3 Differential Evolution (DE)

### Academic Sources
```
MIT 6.036: Introduction to Machine Learning
Storn, R. & Price, K. (1997): "Differential Evolution - A Simple and Efficient Heuristic"
Das, S. & Suganthan, P.N. (2011): "Differential Evolution: A Survey"
```

### Core Components
```javascript
const DE_COMPONENTS = {
  // Mutation strategies
  mutation: {
    'rand/1': { F: 0.8 },           // v = x_r1 + F*(x_r2 - x_r3)
    'best/1': { F: 0.8 },           // v = x_best + F*(x_r1 - x_r2)
    'rand/2': { F: 0.8 },           // v = x_r1 + F*(x_r2 - x_r3) + F*(x_r4 - x_r5)
    'best/2': { F: 0.8 },           // v = x_best + F*(x_r1 - x_r2) + F*(x_r3 - x_r4)
    'current-to-best/1': { F: 0.8 }, // v = x_i + F*(x_best - x_i) + F*(x_r1 - x_r2)
    'current-to-rand/1': { K: 0.5, F: 0.8 }  // v = x_i + K*(x_r1 - x_i) + F*(x_r2 - x_r3)
  },
  
  // Crossover
  crossover: {
    binomial: { CR: 0.9 },          // Each dimension with probability CR
    exponential: { CR: 0.9 }        // Contiguous segment
  },
  
  // Adaptive variants
  adaptive: {
    jDE: { tauF: 0.1, tauCR: 0.1 }, // Self-adaptive F and CR
    SHADE: { H: 100 },               // Success-history based
    JADE: { c: 0.1, p: 0.05 }       // Adaptive with archive
  },
  
  // Boundary handling
  boundary: {
    reflection: true,               // Reflect back into bounds
    random: false,                  // Random within bounds
    clip: false                     // Clip to bounds
  }
};
```

### Manufacturing Integration
```javascript
// Multi-pass cutting optimization
function deOptimizeMultiPass(material, totalDepth, tool) {
  const maxPasses = Math.ceil(totalDepth / tool.maxDoc);
  
  const fitness = (depths) => {
    // depths is array of depth per pass
    let totalTime = 0;
    let maxForce = 0;
    
    for (let i = 0; i < depths.length; i++) {
      const [speed, feed] = optimalSpeedFeed(depths[i], material, tool);
      const time = passTime(depths[i], speed, feed);
      const force = cuttingForce(depths[i], feed, material);
      
      totalTime += time;
      maxForce = Math.max(maxForce, force);
    }
    
    // Minimize time while respecting force constraint
    return maxForce > tool.maxForce ? Infinity : totalTime;
  };
  
  return new DifferentialEvolution({
    dimensions: maxPasses,
    bounds: Array(maxPasses).fill([0.1, tool.maxDoc]),
    mutationStrategy: 'best/1',
    CR: 0.9,
    F: 0.8,
    populationSize: 30,
    maxGenerations: 100,
    fitnessFunction: fitness,
    constraint: (depths) => Math.abs(depths.reduce((a, b) => a + b, 0) - totalDepth) < 0.01
  });
}
```

---

## 1.4 Particle Swarm Optimization (PSO)

### Academic Sources
```
MIT 6.034: Artificial Intelligence
Kennedy, J. & Eberhart, R. (1995): "Particle Swarm Optimization"
Shi, Y. & Eberhart, R. (1998): "A modified particle swarm optimizer"
```

### Core Components
```javascript
const PSO_COMPONENTS = {
  // Velocity update
  velocity: {
    standard: { w: 0.729, c1: 1.49445, c2: 1.49445 },  // Clerc's constriction
    inertia: { w_start: 0.9, w_end: 0.4 },             // Linear decreasing
    adaptive: { w: 'adaptive' }
  },
  
  // Topology
  topology: {
    global: true,           // All particles connected (gbest)
    ring: { k: 2 },         // k neighbors (lbest)
    vonNeumann: true,       // 2D lattice
    random: { k: 3 }        // Random k neighbors
  },
  
  // Boundary handling
  boundary: {
    absorbing: true,        // Velocity = 0 at boundary
    reflecting: false,      // Bounce back
    invisible: false        // Allow outside, evaluate at boundary
  },
  
  // Multi-objective
  multiObjective: {
    paretoArchive: { maxSize: 100 },
    crowdingDistance: true,
    leaderSelection: 'crowding'
  }
};
```

---

# PATTERN 2: REINFORCEMENT LEARNING

## 2.1 Q-Learning / SARSA

### Academic Sources
```
MIT 6.036: Introduction to Machine Learning
Stanford CS 234: Reinforcement Learning
Sutton, R.S. & Barto, A.G. (2018): "Reinforcement Learning: An Introduction"
Watkins, C.J.C.H. (1989): "Learning from Delayed Rewards"
```

### Core Components
```javascript
const RL_TABULAR_COMPONENTS = {
  // Learning algorithms
  algorithms: {
    qLearning: {
      // Off-policy: Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
      offPolicy: true,
      target: 'max'
    },
    sarsa: {
      // On-policy: Q(s,a) ← Q(s,a) + α[r + γ Q(s',a') - Q(s,a)]
      offPolicy: false,
      target: 'actual'
    },
    expectedSarsa: {
      // Q(s,a) ← Q(s,a) + α[r + γ Σ π(a'|s') Q(s',a') - Q(s,a)]
      offPolicy: false,
      target: 'expected'
    }
  },
  
  // Action selection
  actionSelection: {
    epsilonGreedy: { epsilon: 0.1, decay: 0.995 },
    softmax: { temperature: 1.0, decay: 0.99 },
    ucb1: { c: 2.0 },
    thompson: { alpha: 1, beta: 1 }  // Beta distribution
  },
  
  // Exploration
  exploration: {
    decaySchedule: 'exponential',  // linear, exponential, inverse
    minEpsilon: 0.01
  },
  
  // State representation
  stateDiscretization: {
    uniformGrid: { bins: 10 },
    tileEncoding: { tilings: 8, tilesPerDim: 8 }
  }
};
```

### Manufacturing Integration
```javascript
// Adaptive feed rate control
function createFeedRateAgent(machine, material) {
  const states = discretize({
    spindleLoad: { min: 0, max: 150, bins: 15 },     // % of rated
    vibration: { min: 0, max: 10, bins: 10 },        // mm/s RMS
    surfaceQuality: { min: 0, max: 10, bins: 5 }     // Ra estimate
  });
  
  const actions = [
    { type: 'INCREASE_FEED', delta: 0.05 },
    { type: 'MAINTAIN_FEED', delta: 0 },
    { type: 'DECREASE_FEED', delta: -0.05 },
    { type: 'DECREASE_FEED_LARGE', delta: -0.15 }
  ];
  
  const reward = (state, action, nextState) => {
    const mrr = calculateMRR(state);
    const quality = state.surfaceQuality;
    const safety = state.spindleLoad < 100 ? 1 : -10;
    
    return 0.6 * mrr + 0.3 * quality + 0.1 * safety;
  };
  
  return new QLearningAgent({
    states,
    actions,
    reward,
    learningRate: 0.1,
    discountFactor: 0.95,
    epsilon: 0.2
  });
}
```

---

## 2.2 Deep Q-Network (DQN)

### Academic Sources
```
MIT 6.036: Introduction to Machine Learning
Stanford CS 234: Reinforcement Learning
Mnih, V. et al. (2015): "Human-level control through deep reinforcement learning"
van Hasselt, H. et al. (2016): "Deep Reinforcement Learning with Double Q-learning"
```

### Core Components
```javascript
const DQN_COMPONENTS = {
  // Network architecture
  network: {
    inputLayer: 'state_dimension',
    hiddenLayers: [128, 64],
    outputLayer: 'action_count',
    activation: 'relu',
    outputActivation: 'linear'
  },
  
  // Experience replay
  experienceReplay: {
    bufferSize: 100000,
    batchSize: 32,
    minSamples: 1000      // Before training starts
  },
  
  // Target network
  targetNetwork: {
    hardUpdate: { frequency: 1000 },
    softUpdate: { tau: 0.001 }      // θ' ← τθ + (1-τ)θ'
  },
  
  // Variants
  variants: {
    doubleDQN: {
      // Use online network for action selection, target for evaluation
      // a* = argmax_a Q(s', a; θ)
      // y = r + γ Q(s', a*; θ-)
      enabled: true
    },
    duelingDQN: {
      // Q(s,a) = V(s) + A(s,a) - mean(A)
      enabled: false,
      advantageStream: [128],
      valueStream: [128]
    },
    prioritizedReplay: {
      // Priority = |TD-error|^α + ε
      alpha: 0.6,
      beta: 0.4,
      betaAnnealing: 1.0,  // Final value
      epsilon: 0.01
    }
  },
  
  // Training
  training: {
    optimizer: 'adam',
    learningRate: 0.00025,
    gradientClipping: 10
  }
};
```

---

# PATTERN 3: DEEP LEARNING

## 3.1 Neural Networks (Basic)

### Core Components
```javascript
const NN_COMPONENTS = {
  // Layers
  layers: {
    dense: { units: 128, activation: 'relu' },
    dropout: { rate: 0.5 },
    batchNorm: { momentum: 0.99 }
  },
  
  // Activations
  activations: {
    relu: (x) => Math.max(0, x),
    leakyRelu: (x, alpha = 0.01) => x > 0 ? x : alpha * x,
    elu: (x, alpha = 1) => x > 0 ? x : alpha * (Math.exp(x) - 1),
    sigmoid: (x) => 1 / (1 + Math.exp(-x)),
    tanh: (x) => Math.tanh(x),
    softmax: (x) => { /* ... */ }
  },
  
  // Initialization
  initialization: {
    xavier: { mode: 'fan_avg' },    // For sigmoid/tanh
    he: { mode: 'fan_in' },         // For ReLU
    orthogonal: { gain: 1.0 }
  },
  
  // Regularization
  regularization: {
    l1: { lambda: 0.001 },
    l2: { lambda: 0.01 },
    dropout: { rate: 0.5 },
    earlyStop: { patience: 10 }
  }
};
```

---

## 3.2 Gradient-Based Optimizers

### Academic Sources
```
MIT 6.036: Introduction to Machine Learning
Kingma, D.P. & Ba, J. (2015): "Adam: A Method for Stochastic Optimization"
Ruder, S. (2016): "An overview of gradient descent optimization algorithms"
```

### Core Components
```javascript
const OPTIMIZERS = {
  sgd: {
    // θ ← θ - η∇L
    learningRate: 0.01,
    momentum: 0.9,
    nesterov: true
  },
  
  adagrad: {
    // G ← G + g²
    // θ ← θ - η/√(G+ε) * g
    learningRate: 0.01,
    epsilon: 1e-8
  },
  
  rmsprop: {
    // E[g²] ← ρE[g²] + (1-ρ)g²
    // θ ← θ - η/√(E[g²]+ε) * g
    learningRate: 0.001,
    rho: 0.9,
    epsilon: 1e-8
  },
  
  adam: {
    // m ← β₁m + (1-β₁)g
    // v ← β₂v + (1-β₂)g²
    // m̂ ← m/(1-β₁ᵗ), v̂ ← v/(1-β₂ᵗ)
    // θ ← θ - η * m̂/(√v̂+ε)
    learningRate: 0.001,
    beta1: 0.9,
    beta2: 0.999,
    epsilon: 1e-8
  },
  
  adamw: {
    // Adam with decoupled weight decay
    learningRate: 0.001,
    beta1: 0.9,
    beta2: 0.999,
    weightDecay: 0.01
  },
  
  nadam: {
    // Nesterov-accelerated Adam
    learningRate: 0.001,
    beta1: 0.9,
    beta2: 0.999
  }
};
```

---

# PATTERN 4: ENSEMBLE METHODS

## 4.1 Gradient Boosting

### Academic Sources
```
MIT 6.867: Machine Learning
Friedman, J.H. (2001): "Greedy Function Approximation: A Gradient Boosting Machine"
Chen, T. & Guestrin, C. (2016): "XGBoost: A Scalable Tree Boosting System"
```

### Core Components
```javascript
const GRADIENT_BOOSTING_COMPONENTS = {
  // Base learners
  baseLearner: {
    decisionTree: {
      maxDepth: 6,
      minSamplesLeaf: 1
    }
  },
  
  // Boosting parameters
  boosting: {
    numEstimators: 100,
    learningRate: 0.1,        // Shrinkage
    subsample: 0.8,           // Row sampling
    colsampleByTree: 0.8      // Column sampling
  },
  
  // Loss functions
  lossFunctions: {
    regression: {
      mse: (y, yhat) => (y - yhat) ** 2,
      mae: (y, yhat) => Math.abs(y - yhat),
      huber: { delta: 1.0 }
    },
    classification: {
      logLoss: (y, p) => -y * Math.log(p) - (1 - y) * Math.log(1 - p),
      exponential: (y, yhat) => Math.exp(-y * yhat)
    }
  },
  
  // Regularization
  regularization: {
    lambda: 1.0,              // L2 on weights
    alpha: 0.0,               // L1 on weights
    gamma: 0.0                // Min split loss
  }
};
```

---

# PATTERN 5: PROBABILISTIC METHODS

## 5.1 Bayesian Optimization

### Academic Sources
```
MIT 6.867: Machine Learning
Snoek, J. et al. (2012): "Practical Bayesian Optimization of Machine Learning Algorithms"
Shahriari, B. et al. (2016): "Taking the Human Out of the Loop"
```

### Core Components
```javascript
const BAYESIAN_OPT_COMPONENTS = {
  // Surrogate model
  surrogate: {
    gaussianProcess: {
      kernel: 'matern52',      // RBF, Matern32, Matern52
      noise: 0.1
    },
    randomForest: {
      numTrees: 10
    }
  },
  
  // Acquisition functions
  acquisition: {
    EI: true,                  // Expected Improvement
    PI: false,                 // Probability of Improvement
    UCB: { kappa: 2.576 },    // Upper Confidence Bound
    LCB: { kappa: 2.576 }     // Lower Confidence Bound (minimization)
  },
  
  // Initialization
  initialization: {
    numInitial: 5,
    strategy: 'latin_hypercube'  // random, sobol, latin_hypercube
  }
};
```

---

# MANUFACTURING INTEGRATION CHECKLIST

## Every AI/ML Module MUST Include:

```
□ CUTTING PARAMETER OPTIMIZATION
  - Speed/feed/depth optimization
  - Multi-objective (MRR, tool life, quality)
  - Machine/material constraints
  
□ TOOLPATH OPTIMIZATION
  - Sequence optimization (TSP-like)
  - Engagement control
  - Collision avoidance
  
□ PROCESS LEARNING
  - Real-time adaptation
  - Historical data integration
  - Shop floor feedback
  
□ QUALITY PREDICTION
  - Surface finish prediction
  - Tool wear estimation
  - Defect detection
  
□ CONSTRAINT HANDLING
  - Machine limits
  - Tool specifications
  - Material properties
```

---

# SELF-TEST BENCHMARK FUNCTIONS

## Standard Test Functions
```javascript
const BENCHMARK_FUNCTIONS = {
  // Unimodal
  sphere: (x) => x.reduce((s, xi) => s + xi * xi, 0),
  rosenbrock: (x) => {
    let sum = 0;
    for (let i = 0; i < x.length - 1; i++) {
      sum += 100 * (x[i+1] - x[i]**2)**2 + (1 - x[i])**2;
    }
    return sum;
  },
  
  // Multimodal
  rastrigin: (x) => 10 * x.length + x.reduce((s, xi) => 
    s + xi**2 - 10 * Math.cos(2 * Math.PI * xi), 0),
  ackley: (x) => {
    const n = x.length;
    const sum1 = x.reduce((s, xi) => s + xi**2, 0);
    const sum2 = x.reduce((s, xi) => s + Math.cos(2 * Math.PI * xi), 0);
    return -20 * Math.exp(-0.2 * Math.sqrt(sum1 / n)) 
           - Math.exp(sum2 / n) + 20 + Math.E;
  },
  
  // Manufacturing-specific
  cuttingCost: (params) => {
    const [speed, feed, depth] = params;
    const cycleTime = 1000 / (speed * feed);
    const toolLife = 1000 / (speed ** 3 * feed ** 1.5 * depth);
    const toolCost = 50;
    return cycleTime + toolCost / toolLife;
  }
};
```

---

# QUICK REFERENCE

```
AI/ML ENGINE PATTERNS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTIMIZATION:
  GA  → Population, Selection, Crossover, Mutation
  SA  → Temperature, Cooling, Metropolis
  DE  → Mutation (rand/best), Crossover (bin/exp)
  PSO → Velocity, Topology, Inertia

REINFORCEMENT LEARNING:
  Q-Learning → Q-table, ε-greedy, TD update
  DQN        → Neural net, Replay buffer, Target net
  
DEEP LEARNING:
  NN   → Layers, Activations, Backprop
  CNN  → Convolution, Pooling, Feature maps
  LSTM → Gates (input, forget, output), Cell state
  
ENSEMBLE:
  GBM  → Boosting, Trees, Shrinkage
  RF   → Bagging, Trees, Voting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**Version 1.0 | 2026-01-30 | PRISM Manufacturing Intelligence**

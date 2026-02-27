---
name: prism-aiml-engine-patterns
description: |
  AI/ML engine implementation patterns for PRISM.
---

| Category | Algorithms | Use Cases |
|----------|------------|-----------|
| **Metaheuristic Optimization** | GA, SA, DE, PSO, ACO | Parameter optimization, toolpath planning |
| **Reinforcement Learning** | Q-Learning, SARSA, DQN, A2C, PPO | Adaptive control, process learning |
| **Deep Learning** | CNN, RNN, LSTM, Transformer | Feature recognition, sequence prediction |
| **Ensemble Methods** | Random Forest, Gradient Boosting, XGBoost | Quality prediction, anomaly detection |
| **Probabilistic** | Bayesian, Monte Carlo, Kalman | Uncertainty quantification, state estimation |
| **Classical ML** | SVM, KNN, Decision Trees | Classification, regression |
| **Gradient-Based** | SGD, Adam, AdaGrad, RMSprop | Neural network training |

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

**Version 1.0 | 2026-01-30 | PRISM Manufacturing Intelligence**

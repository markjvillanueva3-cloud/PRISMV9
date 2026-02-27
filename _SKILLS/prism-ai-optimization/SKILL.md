---
name: prism-ai-optimization
description: |
  Metaheuristic and gradient-based optimization algorithms for PRISM Manufacturing Intelligence.
  Covers PSO, Genetic Algorithm, Simulated Annealing, Differential Evolution, and gradient optimizers.
  
  Modules Covered:
  - PRISM_PSO_OPTIMIZER (862 lines) - Particle Swarm Optimization
  - PRISM_GA_ENGINE (520 lines) - Genetic Algorithm
  - PRISM_SIMULATED_ANNEALING (490 lines) - Simulated Annealing
  - PRISM_DIFFERENTIAL_EVOLUTION (580 lines) - Differential Evolution
  - PRISM_OPTIMIZERS_ENGINE (314 lines) - SGD, Adam, AdaGrad, etc.
  - PRISM_OPTIMIZER_ADVANCED (174 lines) - Lookahead, schedulers
  
  Total: 6 modules, ~2,940 lines
  Parent: prism-ai-ml-master
---

# PRISM AI OPTIMIZATION
## Metaheuristic & Gradient Optimization Algorithms
### Version 1.0 | Level 4 Reference | 6 Modules

---

## TABLE OF CONTENTS

1. [Algorithm Selection](#1-algorithm-selection)
2. [PSO - Particle Swarm Optimization](#2-pso---particle-swarm-optimization)
3. [GA - Genetic Algorithm](#3-ga---genetic-algorithm)
4. [SA - Simulated Annealing](#4-sa---simulated-annealing)
5. [DE - Differential Evolution](#5-de---differential-evolution)
6. [Gradient Optimizers](#6-gradient-optimizers)
7. [Manufacturing Applications](#7-manufacturing-applications)

---

# 1. ALGORITHM SELECTION

## Decision Matrix

| Criteria | PSO | GA | SA | DE | Gradient |
|----------|-----|----|----|----|----|
| Continuous vars | ✓✓ | ✓ | ✓ | ✓✓ | ✓✓✓ |
| Discrete vars | ✓ | ✓✓ | ✓✓ | ✓ | ✗ |
| Multi-modal | ✓✓ | ✓✓ | ✓✓ | ✓✓✓ | ✓ |
| Multi-objective | ✓✓ | ✓✓✓ | ✓ | ✓ | ✗ |
| Speed | ✓✓✓ | ✓✓ | ✓ | ✓✓ | ✓✓✓ |
| Memory | Low | Med | Low | Med | Low |
| Parallelizable | ✓✓✓ | ✓✓✓ | ✓ | ✓✓✓ | ✓✓ |

## When to Use Each

```
PSO: Fast, continuous, no gradient needed
GA:  Discrete/combinatorial, multi-objective
SA:  Sequence problems, escape local minima
DE:  Robust continuous, unknown landscape
Gradient: Smooth, differentiable, neural nets
```

---

# 2. PSO - PARTICLE SWARM OPTIMIZATION

## Module: PRISM_PSO_OPTIMIZER (862 lines)

### Core Algorithm

```javascript
// Velocity update
v[i] = w * v[i] 
     + c1 * rand() * (pBest[i] - x[i])  // Cognitive
     + c2 * rand() * (gBest - x[i]);    // Social

// Position update
x[i] = x[i] + v[i];
```

### PRISM Implementation

```javascript
const pso = new PRISM_PSO_OPTIMIZER({
  dimensions: 4,
  particles: 30,
  maxIterations: 100,
  bounds: [
    [100, 1000],    // Speed (SFM)
    [0.001, 0.020], // Feed (IPT)
    [0.05, 0.5],    // DOC (in)
    [0.1, 1.0]      // WOC ratio
  ],
  inertia: 0.729,
  cognitive: 1.49,
  social: 1.49,
  velocityClamp: 0.5,
  tolerance: 1e-6
});

const result = await pso.optimize(objectiveFunction);
// result.best, result.fitness, result.iterations
```

### Multi-Objective (Pareto)

```javascript
const mopso = new PRISM_PSO_OPTIMIZER({
  objectives: 2,
  archiveSize: 100,
  crowdingDistance: true
});

// Returns Pareto front
const paretoFront = await mopso.optimizeMultiObjective([
  (x) => -mrr(x),     // Maximize MRR (negate for minimization)
  (x) => toolWear(x)  // Minimize tool wear
]);
```

### Hyperparameters

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| particles | 30 | 20-50 | More = better exploration |
| inertia (w) | 0.729 | 0.4-0.9 | Lower = faster convergence |
| cognitive (c1) | 1.49 | 1.4-2.0 | Personal best influence |
| social (c2) | 1.49 | 1.4-2.0 | Global best influence |
| velocityClamp | 0.5 | 0.1-1.0 | Prevents overshooting |

### Manufacturing Application

```javascript
// Feedrate optimization
function manufacturingObjective(params) {
  const [speed, feed, doc, woc] = params;
  const mrr = calculateMRR(speed, feed, doc, woc);
  const force = calculateCuttingForce(speed, feed, doc);
  const power = calculatePower(force, speed);
  
  // Penalty for constraint violations
  let penalty = 0;
  if (force > maxForce) penalty += 1000 * (force - maxForce);
  if (power > maxPower) penalty += 1000 * (power - maxPower);
  
  return -mrr + penalty; // Minimize (negate MRR)
}
```

---

# 3. GA - GENETIC ALGORITHM

## Module: PRISM_GA_ENGINE (520 lines)

### Core Operations

| Operation | Purpose | PRISM Methods |
|-----------|---------|---------------|
| Selection | Choose parents | tournament, roulette |
| Crossover | Combine genes | singlePoint, twoPoint, uniform, blend |
| Mutation | Random variation | gaussian, uniform |
| Elitism | Preserve best | Top 10% by default |

### PRISM Implementation

```javascript
const ga = new PRISM_GA_ENGINE({
  populationSize: 50,
  chromosomeLength: 4,
  bounds: [
    [100, 1000],
    [0.001, 0.020],
    [0.05, 0.5],
    [0.1, 1.0]
  ],
  selectionMethod: 'tournament',
  crossoverMethod: 'twoPoint',
  mutationMethod: 'gaussian',
  crossoverRate: 0.8,
  mutationRate: 0.01,
  elitismRate: 0.1,
  maxGenerations: 100
});

const result = await ga.evolve(fitnessFunction);
```

### Selection Methods

**Tournament Selection:**
```javascript
// Select k random, choose best
select(population, k=3) {
  const tournament = randomSample(population, k);
  return tournament.reduce((a, b) => 
    fitness(a) > fitness(b) ? a : b
  );
}
```

**Roulette Wheel:**
```javascript
// Probability proportional to fitness
P(individual) = fitness(i) / Σ fitness(all)
```

### Crossover Operators

| Operator | Description | Best For |
|----------|-------------|----------|
| singlePoint | Split at 1 point | Simple problems |
| twoPoint | Split at 2 points | Preserve segments |
| uniform | Random bits from each | High mixing |
| blend (BLX-α) | Linear interpolation | Continuous |

**Blend Crossover (BLX-α):**
```javascript
child = p1 + β * (p2 - p1)
// β ∈ [-α, 1+α], typically α = 0.5
```

### Mutation

**Gaussian Mutation:**
```javascript
x_new = x + N(0, σ)
// σ = mutationStrength * (upperBound - lowerBound)
```

### Multi-Objective (NSGA-II style)

```javascript
const ga = new PRISM_GA_ENGINE({
  objectives: 2,
  paretoRanking: true,
  crowdingDistance: true
});

const paretoFront = await ga.evolveMultiObjective([
  (x) => -mrr(x),
  (x) => surfaceRoughness(x)
]);
```

### Self-Test Verification

```javascript
// Sphere function: f(x) = Σ x²
// Known minimum at origin
ga.selfTest('sphere', { dimensions: 10 });
// Expected: fitness ≈ 0, solution ≈ [0,0,...,0]

// Rastrigin function (multimodal)
ga.selfTest('rastrigin', { dimensions: 10 });
// Expected: fitness ≈ 0
```

---

# 4. SA - SIMULATED ANNEALING

## Module: PRISM_SIMULATED_ANNEALING (490 lines)

### Core Algorithm

```javascript
// Metropolis acceptance criterion
ΔE = f(x_new) - f(x_current)
if (ΔE < 0) {
  accept();  // Always accept improvements
} else {
  P_accept = exp(-ΔE / T);
  if (random() < P_accept) accept();
}
T = coolingSchedule(T);  // Reduce temperature
```

### PRISM Implementation

```javascript
const sa = new PRISM_SIMULATED_ANNEALING({
  initialTemp: 1000,
  finalTemp: 0.001,
  coolingSchedule: 'geometric',
  coolingRate: 0.995,
  iterationsPerTemp: 100,
  bounds: [...],
  neighborStepSize: 0.1
});

const result = await sa.anneal(objectiveFunction);
```

### Cooling Schedules

| Schedule | Formula | Characteristic |
|----------|---------|----------------|
| geometric | T = T₀ × α^k | Most common, α=0.99 |
| linear | T = T₀ - k×δ | Predictable time |
| logarithmic | T = T₀ / log(k+1) | Slow, thorough |
| exponential | T = T₀ × e^(-k/τ) | Fast initial cooling |
| adaptive | Based on acceptance | Self-adjusting |

```javascript
// Cooling schedule examples
coolingSchedules: {
  geometric: (T, rate) => T * rate,
  linear: (T, rate, k, T0) => T0 - k * rate,
  logarithmic: (T, rate, k, T0) => T0 / Math.log(k + 2),
  exponential: (T, rate, k, T0) => T0 * Math.exp(-k * rate)
}
```

### Adaptive Reheating

```javascript
// If stuck (no improvement for N iterations)
if (stagnationCount > maxStagnation) {
  T = T * reheatFactor;  // e.g., reheatFactor = 2.0
  stagnationCount = 0;
}
```

### Sequence Optimization (TSP-like)

```javascript
const sa = new PRISM_SIMULATED_ANNEALING({
  problemType: 'sequence',
  neighborMethods: ['swap', '2opt', 'insert']
});

// Tool path sequencing
const optimalSequence = await sa.optimizeSequence(
  toolOperations,
  (sequence) => calculateTotalTravelTime(sequence)
);
```

### Manufacturing Application

```javascript
// Cutting parameter optimization with annealing
const sa = new PRISM_SIMULATED_ANNEALING({
  initialTemp: 100,
  coolingSchedule: 'adaptive',
  bounds: [
    [100, 800],   // Speed
    [0.002, 0.015] // Feed
  ]
});

const result = await sa.optimizeCutting({
  material: 'AISI_4140',
  tool: 'CNMG_432',
  operation: 'turning'
});
```

---

# 5. DE - DIFFERENTIAL EVOLUTION

## Module: PRISM_DIFFERENTIAL_EVOLUTION (580 lines)

### Core Algorithm

```javascript
// Mutation: v = x_r1 + F * (x_r2 - x_r3)
// Crossover: u[j] = v[j] if rand < CR else x[j]
// Selection: x = u if f(u) < f(x) else x
```

### Mutation Strategies

| Strategy | Formula | Characteristic |
|----------|---------|----------------|
| rand/1 | v = r1 + F(r2-r3) | Balanced exploration |
| best/1 | v = best + F(r1-r2) | Fast convergence |
| rand/2 | v = r1 + F(r2-r3) + F(r4-r5) | More diversity |
| best/2 | v = best + F(r1-r2) + F(r3-r4) | Aggressive |
| current-to-best/1 | v = x + F(best-x) + F(r1-r2) | Hybrid |
| current-to-rand/1 | v = x + K(r1-x) + F(r2-r3) | Rotation invariant |

### PRISM Implementation

```javascript
const de = new PRISM_DIFFERENTIAL_EVOLUTION({
  populationSize: 50,
  dimensions: 4,
  bounds: [...],
  strategy: 'best/1/bin',
  F: 0.8,           // Mutation factor
  CR: 0.9,          // Crossover rate
  maxGenerations: 100,
  adaptive: true    // jDE self-adaptation
});

const result = await de.evolve(objectiveFunction);
```

### Adaptive DE (jDE)

```javascript
// Self-adapting F and CR per individual
if (random() < τ1) {
  F_new = F_min + random() * F_max;
}
if (random() < τ2) {
  CR_new = random();  // CR ∈ [0, 1]
}
// τ1 = τ2 = 0.1 typically
```

### Crossover Types

**Binomial:**
```javascript
u[j] = (random() < CR || j === jrand) ? v[j] : x[j];
```

**Exponential:**
```javascript
// Copy contiguous segment from v
start = randint(D);
L = 1;
while (random() < CR && L < D) L++;
// Copy L elements starting at start
```

### Boundary Handling

| Method | Description |
|--------|-------------|
| Reflect | Bounce back from boundary |
| Clamp | Set to boundary value |
| Random | Random value within bounds |
| Wrap | Wrap around (modulo) |

```javascript
// Reflection
if (x > upper) x = upper - (x - upper);
if (x < lower) x = lower + (lower - x);
```

### Self-Test

```javascript
de.selfTest(); // Runs sphere, Rastrigin, Ackley
// Expected: All converge to near-optimal
```

---

# 6. GRADIENT OPTIMIZERS

## Module: PRISM_OPTIMIZERS_ENGINE (314 lines)

### Available Optimizers

| Optimizer | Best For | Learning Rate |
|-----------|----------|---------------|
| SGD | Simple, well-understood | 0.01-0.1 |
| Momentum | Noisy gradients | 0.01-0.1 |
| Adam | Most deep learning | 0.001 |
| AdaGrad | Sparse features | 0.01 |
| AdaDelta | No LR tuning needed | 1.0 |
| RMSprop | RNNs | 0.001 |
| Nadam | Adam + Nesterov | 0.001 |
| RAdam | Stable Adam | 0.001 |

### SGD with Momentum

```javascript
v = β * v - lr * gradient;
θ = θ + v;

// Nesterov variant
v = β * v - lr * gradient(θ + β * v);
θ = θ + v;
```

### Adam

```javascript
m = β1 * m + (1 - β1) * g;        // First moment
v = β2 * v + (1 - β2) * g²;       // Second moment
m_hat = m / (1 - β1^t);           // Bias correction
v_hat = v / (1 - β2^t);
θ = θ - lr * m_hat / (√v_hat + ε);
```

### PRISM Implementation

```javascript
const optimizer = new PRISM_OPTIMIZERS_ENGINE({
  type: 'adam',
  learningRate: 0.001,
  beta1: 0.9,
  beta2: 0.999,
  epsilon: 1e-8
});

// In training loop
for (let epoch = 0; epoch < epochs; epoch++) {
  const gradient = computeGradient(params, data);
  params = optimizer.step(params, gradient);
}
```

### Learning Rate Schedulers

| Scheduler | Formula | Use Case |
|-----------|---------|----------|
| Step decay | lr × γ^(epoch/step) | Standard |
| Exponential | lr × e^(-k×epoch) | Smooth decay |
| Cosine | lr × (1 + cos(π×t/T))/2 | Warm restarts |
| Reduce on plateau | lr × factor if no improve | Adaptive |

```javascript
const scheduler = new LearningRateScheduler({
  type: 'cosine',
  initialLR: 0.01,
  totalEpochs: 100,
  warmupEpochs: 5
});
```

---

# 7. MANUFACTURING APPLICATIONS

## Feedrate Optimization (PSO)

```javascript
// Objective: Maximize MRR while respecting constraints
function feedrateObjective(params) {
  const [speed, feed, doc] = params;
  
  // Calculate metrics
  const mrr = calculateMRR(speed, feed, doc, toolDiameter);
  const force = kienzle(material, speed, feed, doc);
  const power = force * speed / 60000;
  const temp = estimateTemperature(speed, feed, material);
  
  // Constraints
  let penalty = 0;
  if (force > machine.maxForce) penalty += 10000;
  if (power > machine.maxPower) penalty += 10000;
  if (temp > material.maxTemp) penalty += 10000;
  
  return -mrr + penalty;  // Minimize (maximize MRR)
}

const pso = new PRISM_PSO_OPTIMIZER({
  dimensions: 3,
  bounds: [
    [material.minSpeed, material.maxSpeed],
    [tool.minFeed, tool.maxFeed],
    [0.1 * toolDiameter, 0.5 * toolDiameter]
  ]
});
```

## Tool Path Sequencing (SA)

```javascript
// Minimize total travel + tool changes
const sa = new PRISM_SIMULATED_ANNEALING({
  problemType: 'sequence'
});

const optimalSequence = await sa.optimizeSequence(
  operations,
  (seq) => {
    let cost = 0;
    for (let i = 1; i < seq.length; i++) {
      cost += travelTime(seq[i-1], seq[i]);
      if (seq[i].tool !== seq[i-1].tool) {
        cost += toolChangeTime;
      }
    }
    return cost;
  }
);
```

## Multi-Objective (GA with Pareto)

```javascript
// Optimize MRR vs Surface Finish vs Tool Life
const ga = new PRISM_GA_ENGINE({
  objectives: 3,
  paretoRanking: true
});

const paretoFront = await ga.evolveMultiObjective([
  (x) => -calculateMRR(x),           // Maximize MRR
  (x) => predictSurfaceRoughness(x), // Minimize Ra
  (x) => -predictToolLife(x)         // Maximize tool life
]);

// User selects from Pareto front based on priority
```

## Real-Time Adaptation (Gradient)

```javascript
// Online parameter tuning during machining
const optimizer = new PRISM_OPTIMIZERS_ENGINE({
  type: 'adam',
  learningRate: 0.01
});

// Sensor feedback loop
function adaptiveControl(sensorData) {
  const error = targetForce - sensorData.force;
  const gradient = computeFeedAdjustment(error);
  feedOverride = optimizer.step(feedOverride, gradient);
  return clamp(feedOverride, 0.5, 1.5);
}
```

---

## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| OPT-1001 | No convergence | Increase iterations, particles |
| OPT-1002 | Stuck local minimum | Use SA or increase diversity |
| OPT-1003 | Constraint violation | Tighten bounds or penalties |
| OPT-1004 | NaN fitness | Check objective function |
| OPT-1005 | Population collapse | Increase mutation rate |

---

## BENCHMARKS

| Problem | PSO | GA | SA | DE |
|---------|-----|----|----|-----|
| Sphere (10D) | 0.3s | 0.5s | 0.8s | 0.4s |
| Rastrigin (10D) | 0.8s | 1.2s | 1.5s | 0.6s |
| Feedrate opt | 1.2s | 1.8s | 2.5s | 1.4s |
| Tool sequencing (20 ops) | - | 3.0s | 2.0s | - |

---

**END OF PRISM AI OPTIMIZATION SKILL**
**Version 1.0 | Level 4 Reference | 6 Modules | ~2,940 Lines**

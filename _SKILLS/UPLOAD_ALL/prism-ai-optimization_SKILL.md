---
name: prism-ai-optimization
description: |
  Optimization algorithms. Gradient, evolutionary, swarm methods.
---

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

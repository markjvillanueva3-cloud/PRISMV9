---
name: prism-ai-bayesian
description: |
  Bayesian and probabilistic methods for PRISM Manufacturing Intelligence.
  Covers uncertainty quantification, Bayesian inference, and probabilistic predictions.
  
  Modules Covered:
  - PRISM_BAYESIAN_SYSTEM (56 lines) - Core Bayesian inference
  - PRISM_BAYESIAN_LEARNING - Online Bayesian learning
  - PRISM_BAYESIAN_TOOL_LIFE - Tool life prediction with uncertainty
  
  Total: 3 modules, ~200 lines
  Parent: prism-ai-ml-master
  MIT Foundation: 6.867, Stanford CS 228
---

# PRISM AI BAYESIAN
## Probabilistic Methods & Uncertainty Quantification
### Version 1.0 | Level 4 Reference | 3 Modules

---

## TABLE OF CONTENTS

1. [Why Bayesian?](#1-why-bayesian)
2. [Bayesian Fundamentals](#2-bayesian-fundamentals)
3. [Bayesian Regression](#3-bayesian-regression)
4. [Bayesian Optimization](#4-bayesian-optimization)
5. [Tool Life Prediction](#5-tool-life-prediction)
6. [Monte Carlo Methods](#6-monte-carlo-methods)
7. [Manufacturing Applications](#7-manufacturing-applications)

---

# 1. WHY BAYESIAN?

## Key Benefits for Manufacturing

| Feature | Traditional | Bayesian |
|---------|-------------|----------|
| Output | Point estimate | Distribution (mean ± uncertainty) |
| Confidence | None | Full posterior |
| Small data | Overfits | Prior regularizes |
| New data | Retrain | Online update |
| Decision making | Risky | Uncertainty-aware |

## When to Use Bayesian

```
USE BAYESIAN WHEN:
├── Need uncertainty quantification
│   └── "Tool life is 45 ± 8 minutes (95% CI)"
├── Limited training data
│   └── Prior knowledge helps regularize
├── Online/streaming updates
│   └── Update beliefs as new data arrives
├── Decision under uncertainty
│   └── Risk-aware recommendations
└── Expensive evaluations
    └── Bayesian optimization for tuning
```

---

# 2. BAYESIAN FUNDAMENTALS

## Bayes' Theorem

```
P(θ|D) = P(D|θ) × P(θ) / P(D)

Posterior = Likelihood × Prior / Evidence
```

| Term | Meaning | Manufacturing Example |
|------|---------|----------------------|
| Prior P(θ) | Initial belief | "Tool life typically 30-60 min" |
| Likelihood P(D\|θ) | Data given params | "Observed wear rate data" |
| Posterior P(θ\|D) | Updated belief | "Tool life is 42 ± 5 min" |
| Evidence P(D) | Normalizer | (usually computed implicitly) |

## PRISM Bayesian System

```javascript
const bayesian = new PRISM_BAYESIAN_SYSTEM({
  // Prior specification
  priorType: 'gaussian',
  priorMean: [30, 0.5],      // [tool_life, wear_rate]
  priorStd: [10, 0.2],
  
  // Likelihood model
  likelihoodType: 'gaussian',
  noiseStd: 0.1
});

// Update with observation
bayesian.update(observation);

// Get posterior
const posterior = bayesian.getPosterior();
// { mean: [42, 0.4], std: [5, 0.1], confidence: 0.95 }

// Make prediction with uncertainty
const prediction = bayesian.predict(conditions);
// { value: 38, lower: 32, upper: 44, confidence: 0.95 }
```

---

# 3. BAYESIAN REGRESSION

## Bayesian Linear Regression

```
y = Xw + ε, ε ~ N(0, σ²)

Prior:     w ~ N(μ₀, Σ₀)
Posterior: w|D ~ N(μₙ, Σₙ)

Σₙ = (Σ₀⁻¹ + σ⁻²XᵀX)⁻¹
μₙ = Σₙ(Σ₀⁻¹μ₀ + σ⁻²Xᵀy)
```

### Implementation

```javascript
class BayesianLinearRegression {
  constructor(featureDim, priorStd = 1.0, noiseStd = 0.1) {
    // Prior: N(0, priorStd² × I)
    this.priorMean = zeros(featureDim);
    this.priorCov = eye(featureDim).scale(priorStd ** 2);
    this.noiseVar = noiseStd ** 2;
    
    // Initialize posterior = prior
    this.posteriorMean = this.priorMean.clone();
    this.posteriorCov = this.priorCov.clone();
  }
  
  update(X, y) {
    // Batch update
    const XtX = X.transpose().matmul(X);
    const Xty = X.transpose().matmul(y);
    
    const covInv = this.priorCov.inverse()
                    .add(XtX.scale(1 / this.noiseVar));
    this.posteriorCov = covInv.inverse();
    this.posteriorMean = this.posteriorCov.matmul(
      this.priorCov.inverse().matmul(this.priorMean)
        .add(Xty.scale(1 / this.noiseVar))
    );
  }
  
  predict(xNew) {
    // Predictive distribution
    const mean = xNew.dot(this.posteriorMean);
    const var = xNew.dot(this.posteriorCov.matmul(xNew)) + this.noiseVar;
    
    return {
      mean,
      std: Math.sqrt(var),
      ci95: [mean - 1.96 * Math.sqrt(var), mean + 1.96 * Math.sqrt(var)]
    };
  }
}
```

### Manufacturing Application

```javascript
// Predict surface roughness with uncertainty
const model = new BayesianLinearRegression(5);

// Features: [speed, feed, DOC, tool_wear, hardness]
const X = trainingData.map(d => [d.speed, d.feed, d.doc, d.wear, d.hardness]);
const y = trainingData.map(d => d.roughness);

model.update(X, y);

// Predict for new conditions
const prediction = model.predict([300, 0.1, 0.5, 0.2, 200]);
// { mean: 0.8, std: 0.15, ci95: [0.51, 1.09] }
```

---

# 4. BAYESIAN OPTIMIZATION

## For Expensive Function Optimization

```
Used when:
- Each evaluation is expensive (physical experiment, simulation)
- Few evaluations allowed (< 100)
- Need global optimization

Components:
1. Surrogate model (Gaussian Process)
2. Acquisition function (decides where to sample next)
```

### Gaussian Process (GP)

```javascript
class GaussianProcess {
  constructor(kernel = 'rbf', lengthScale = 1.0, variance = 1.0) {
    this.kernel = kernel;
    this.lengthScale = lengthScale;
    this.variance = variance;
  }
  
  rbfKernel(x1, x2) {
    const dist = euclideanDistance(x1, x2);
    return this.variance * Math.exp(-dist ** 2 / (2 * this.lengthScale ** 2));
  }
  
  fit(X, y) {
    this.X = X;
    this.y = y;
    this.K = this.computeKernelMatrix(X, X);
    this.Kinv = inverse(this.K.add(eye(X.length).scale(1e-6)));
  }
  
  predict(xNew) {
    const kStar = this.X.map(x => this.rbfKernel(xNew, x));
    const kStarStar = this.rbfKernel(xNew, xNew);
    
    // Posterior mean
    const mean = dot(kStar, matmul(this.Kinv, this.y));
    
    // Posterior variance
    const variance = kStarStar - dot(kStar, matmul(this.Kinv, kStar));
    
    return { mean, std: Math.sqrt(Math.max(0, variance)) };
  }
}
```

### Acquisition Functions

| Function | Formula | Behavior |
|----------|---------|----------|
| Expected Improvement (EI) | E[max(f(x) - f*, 0)] | Balance explore/exploit |
| Upper Confidence Bound (UCB) | μ + κσ | κ controls exploration |
| Probability of Improvement (PI) | P(f(x) > f* + ξ) | Conservative |

```javascript
function expectedImprovement(gp, x, fBest) {
  const { mean, std } = gp.predict(x);
  const z = (mean - fBest) / (std + 1e-8);
  return (mean - fBest) * normalCDF(z) + std * normalPDF(z);
}

function upperConfidenceBound(gp, x, kappa = 2.0) {
  const { mean, std } = gp.predict(x);
  return mean + kappa * std;
}
```

### Bayesian Optimization Loop

```javascript
const bayesOpt = new BayesianOptimization({
  bounds: [
    [100, 500],   // Speed
    [0.05, 0.2],  // Feed
    [0.1, 1.0]    // DOC
  ],
  acquisitionFunction: 'ei',
  numInitialPoints: 5,
  maxIterations: 20
});

// Expensive objective (physical cutting test)
function cuttingExperiment(params) {
  // Returns negative MRR (to minimize)
  return -conductCuttingTest(params);
}

const result = await bayesOpt.optimize(cuttingExperiment);
// result.bestParams, result.bestValue, result.iterations
```

---

# 5. TOOL LIFE PREDICTION

## Module: PRISM_BAYESIAN_TOOL_LIFE

### Taylor's Equation with Uncertainty

```
Standard Taylor: VT^n = C

Bayesian Taylor:
  n ~ N(n₀, σₙ²)     // Prior on exponent
  C ~ LogNormal      // Prior on constant
  T|V,n,C ~ LogNormal(log(C/V)/n, σ_obs²)
```

### Implementation

```javascript
const toolLifePredictor = new PRISM_BAYESIAN_TOOL_LIFE({
  // Material-specific priors from literature
  nPriorMean: 0.25,      // Taylor exponent
  nPriorStd: 0.05,
  cPriorMean: 200,       // Taylor constant
  cPriorStd: 50,
  
  // Observation noise
  observationStd: 0.1
});

// Update with cutting data
toolLifePredictor.update({
  speed: 300,
  toolLife: 45,
  material: 'AISI_4140',
  tool: 'CNMG_432'
});

// Predict with uncertainty
const prediction = toolLifePredictor.predict({
  speed: 400,
  material: 'AISI_4140',
  tool: 'CNMG_432'
});
// { 
//   toolLife: 28.5, 
//   lower: 22.3, 
//   upper: 36.2, 
//   confidence: 0.95,
//   recommendation: 'MEDIUM_RISK'
// }
```

### Multi-Factor Model

```javascript
// Extended Taylor with feed and DOC
// VT^n × f^a × d^b = C

const advancedModel = new PRISM_BAYESIAN_TOOL_LIFE({
  model: 'extended_taylor',
  parameters: {
    n: { prior: { mean: 0.25, std: 0.05 } },
    a: { prior: { mean: 0.15, std: 0.03 } },  // Feed exponent
    b: { prior: { mean: 0.10, std: 0.02 } },  // DOC exponent
    C: { prior: { mean: 200, std: 50 } }
  }
});
```

### Online Learning

```javascript
// Update as each tool wears out
function onToolWear(observation) {
  toolLifePredictor.updateIncremental(observation);
  
  // Get updated prediction for current conditions
  const updated = toolLifePredictor.predict(currentConditions);
  
  if (updated.lower < remainingToolLife) {
    alertToolChange();
  }
}
```

---

# 6. MONTE CARLO METHODS

## Simple Monte Carlo

```javascript
// Estimate expectation via sampling
function monteCarloExpectation(distribution, f, nSamples = 10000) {
  let sum = 0;
  for (let i = 0; i < nSamples; i++) {
    const sample = distribution.sample();
    sum += f(sample);
  }
  return sum / nSamples;
}
```

## Uncertainty Propagation

```javascript
// Propagate parameter uncertainty through calculation
function propagateUncertainty(params, calculation, nSamples = 1000) {
  const outputs = [];
  
  for (let i = 0; i < nSamples; i++) {
    // Sample from parameter distributions
    const sampledParams = params.map(p => normalSample(p.mean, p.std));
    
    // Run calculation
    const output = calculation(sampledParams);
    outputs.push(output);
  }
  
  return {
    mean: mean(outputs),
    std: std(outputs),
    percentile5: percentile(outputs, 5),
    percentile95: percentile(outputs, 95)
  };
}

// Example: MRR with uncertain parameters
const mrrUncertainty = propagateUncertainty(
  [
    { mean: 300, std: 10 },   // Speed
    { mean: 0.1, std: 0.01 }, // Feed
    { mean: 0.5, std: 0.05 }  // DOC
  ],
  ([speed, feed, doc]) => calculateMRR(speed, feed, doc)
);
// { mean: 45.2, std: 4.3, percentile5: 38.1, percentile95: 52.8 }
```

## Markov Chain Monte Carlo (MCMC)

```javascript
// Metropolis-Hastings for complex posteriors
function metropolisHastings(logPosterior, initial, nSamples, proposalStd) {
  const samples = [initial];
  let current = initial;
  let currentLogP = logPosterior(current);
  
  for (let i = 0; i < nSamples; i++) {
    // Propose
    const proposed = current.map(v => v + normalSample(0, proposalStd));
    const proposedLogP = logPosterior(proposed);
    
    // Accept/reject
    const logAlpha = proposedLogP - currentLogP;
    if (Math.log(Math.random()) < logAlpha) {
      current = proposed;
      currentLogP = proposedLogP;
    }
    
    samples.push(current);
  }
  
  return samples.slice(Math.floor(nSamples * 0.2)); // Discard burn-in
}
```

---

# 7. MANUFACTURING APPLICATIONS

## Cutting Force Prediction with Uncertainty

```javascript
const forceModel = new BayesianLinearRegression(4);

// Train on historical data
// Features: [kc1.1, feed, DOC, rake_angle]
forceModel.update(trainingFeatures, measuredForces);

// Predict for new cut
const prediction = forceModel.predict([1800, 0.15, 0.5, 6]);
// { mean: 2450, std: 180, ci95: [2097, 2803] }

// Use lower CI for conservative tooling
const maxExpectedForce = prediction.ci95[1];
if (maxExpectedForce > toolCapacity) {
  suggestReducedParameters();
}
```

## Adaptive Machining Parameters

```javascript
// Use Bayesian optimization to find optimal parameters
// Objective: Maximize MRR while respecting force/chatter constraints

const optimizer = new BayesianOptimization({
  bounds: [
    [200, 600],   // Speed (SFM)
    [0.003, 0.015], // Feed (IPR)
    [0.05, 0.3]   // DOC (in)
  ],
  acquisitionFunction: 'ei',
  constraints: [
    (params) => forceModel.predict(params).ci95[1] < 3000,
    (params) => stabilityModel.predict(params).mean > 0.5
  ]
});

// Each iteration performs a real cutting test
const optimalParams = await optimizer.optimize((params) => {
  return conductCuttingTest(params).mrr;
}, { maxIterations: 15 });
```

## Quality Prediction with Uncertainty

```javascript
const qualityModel = new PRISM_BAYESIAN_SYSTEM({
  model: 'gaussian_process',
  outputs: ['roughness', 'dimensional_error', 'burr_height'],
  features: ['speed', 'feed', 'tool_wear', 'coolant_pressure']
});

// Predict all quality metrics with uncertainty
const predictions = qualityModel.predictMultiple(currentConditions);
// {
//   roughness: { mean: 0.8, std: 0.12 },
//   dimensional_error: { mean: 0.02, std: 0.005 },
//   burr_height: { mean: 0.1, std: 0.03 }
// }

// Check if ANY quality metric might exceed tolerance
const risks = Object.entries(predictions).filter(([name, pred]) => {
  const tolerance = tolerances[name];
  return pred.mean + 2 * pred.std > tolerance;
});

if (risks.length > 0) {
  alertQualityRisk(risks);
}
```

## Maintenance Scheduling

```javascript
// Predict time to failure with uncertainty
const ttfModel = new PRISM_BAYESIAN_TOOL_LIFE({
  model: 'weibull',  // Weibull distribution for failure times
  priors: {
    shape: { mean: 2.0, std: 0.3 },
    scale: { mean: 100, std: 20 }
  }
});

// Update with each failure observation
ttfModel.update({ timeToFailure: 85, conditions: currentConditions });

// Get probability of failure in next N hours
const failureProb = ttfModel.probabilityOfFailure(
  currentAge, 
  currentAge + 8  // Next shift
);
// 0.15 = 15% chance of failure

if (failureProb > 0.1) {
  schedulePreventiveMaintenance();
}
```

---

## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| BAY-1001 | Prior-likelihood mismatch | Check conjugate pair |
| BAY-1002 | Non-positive variance | Add noise, regularize |
| BAY-1003 | MCMC not converged | Increase samples, tune proposal |
| BAY-1004 | GP ill-conditioned | Add jitter, reduce data |
| BAY-1005 | BO stuck | Increase exploration (κ) |

---

## INTEGRATION WITH PRISM

### Uncertainty in All Outputs

```javascript
// PRISM COMMANDMENT 5: Never bare numbers
// All outputs should have uncertainty

function prismCalculation(inputs) {
  const result = coreCalculation(inputs);
  const uncertainty = propagateUncertainty(inputs, coreCalculation);
  
  return {
    value: result,
    uncertainty: uncertainty.std,
    confidence: 0.95,
    lower: uncertainty.percentile5,
    upper: uncertainty.percentile95
  };
}
```

### Gateway Routes

```
/api/bayesian/predict           → Point prediction with uncertainty
/api/bayesian/update            → Update model with observation
/api/bayesian/optimize          → Bayesian optimization
/api/bayesian/toollife          → Tool life prediction
/api/bayesian/montecarlo        → Monte Carlo simulation
```

---

**END OF PRISM AI BAYESIAN SKILL**
**Version 1.0 | Level 4 Reference | 3 Modules | ~200 Lines**
**MIT Foundation: 6.867, Stanford CS 228**

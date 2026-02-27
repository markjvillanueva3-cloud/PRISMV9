# PRISM MODULE BUILDER SKILL
## Constructing Complete Modules from Academic Specifications
## Version 1.0 | 2026-01-30

---

# OVERVIEW

When monolith extraction reveals stubs or missing implementations, this skill defines the methodology for building complete, production-quality modules from MIT/Stanford academic specifications, peer-reviewed papers, and established algorithms.

---

# WHEN TO USE

- Monolith contains gateway stub only (1-5 lines)
- Implementation is missing entirely
- Existing code is incomplete or placeholder
- Need to add new algorithm categories
- Upgrading stub to full implementation

---

# ACADEMIC SOURCE HIERARCHY

## Tier 1: Course Materials (Highest Priority)
| Course | University | Domain | Key Algorithms |
|--------|------------|--------|----------------|
| 6.034 | MIT | AI Fundamentals | Search, Learning, Reasoning |
| 6.036 | MIT | Machine Learning | Supervised, Unsupervised, RL |
| 6.867 | MIT | Advanced ML | Deep Learning, Optimization |
| CS 234 | Stanford | Reinforcement Learning | Q-Learning, Policy Gradient |
| CS 229 | Stanford | Machine Learning | Statistical Methods |
| CS 231n | Stanford | CNNs | Convolutional Networks |

## Tier 2: Seminal Papers (Required Citations)
| Algorithm | Authors | Year | Paper |
|-----------|---------|------|-------|
| Genetic Algorithm | Holland | 1975 | "Adaptation in Natural and Artificial Systems" |
| Simulated Annealing | Kirkpatrick et al. | 1983 | "Optimization by Simulated Annealing" |
| Differential Evolution | Storn & Price | 1997 | "Differential Evolution" |
| Q-Learning | Watkins | 1989 | "Learning from Delayed Rewards" |
| DQN | Mnih et al. | 2015 | "Human-level control through deep RL" |
| Double DQN | van Hasselt | 2016 | "Deep RL with Double Q-learning" |
| PSO | Kennedy & Eberhart | 1995 | "Particle Swarm Optimization" |
| Adam | Kingma & Ba | 2015 | "Adam: A Method for Stochastic Optimization" |

## Tier 3: Reference Implementations
- Textbooks (Sutton & Barto, Goodfellow et al.)
- Open-source libraries (scikit-learn, PyTorch, TensorFlow)
- Industry implementations (verified correctness)

---

# MODULE STRUCTURE TEMPLATE

## Standard Module Format (JavaScript)
```javascript
/**
 * PRISM [ALGORITHM_NAME] Engine
 * 
 * Academic Sources:
 *   - MIT [COURSE_NUMBER]: [COURSE_NAME]
 *   - [AUTHOR] ([YEAR]): "[PAPER_TITLE]"
 * 
 * Implementation Features:
 *   - [FEATURE_1]
 *   - [FEATURE_2]
 *   - Manufacturing optimization integration
 *   - Self-test validation
 * 
 * @module PRISM_[NAME]_ENGINE
 * @version 1.0.0
 * @date [DATE]
 */

'use strict';

// ============================================================
// SECTION 1: CONFIGURATION & DEFAULTS
// ============================================================
const DEFAULT_CONFIG = {
  // Algorithm-specific parameters
};

// ============================================================
// SECTION 2: CORE ALGORITHM IMPLEMENTATION
// ============================================================
class [AlgorithmName]Engine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.history = [];
    this.initialized = false;
  }
  
  // Core algorithm methods
  // ...
}

// ============================================================
// SECTION 3: MANUFACTURING OPTIMIZATION FUNCTIONS
// ============================================================
function optimizeCuttingParameters(material, operation, constraints) {
  // Manufacturing-specific optimization
}

function optimizeToolPath(waypoints, machine, constraints) {
  // Toolpath optimization using algorithm
}

// ============================================================
// SECTION 4: UTILITY FUNCTIONS
// ============================================================
// Helper functions, math utilities, etc.

// ============================================================
// SECTION 5: SELF-TEST VALIDATION
// ============================================================
function selfTest() {
  console.log('[ALGORITHM] Self-Test Starting...');
  
  const tests = [
    { name: 'Basic Optimization', fn: testBasicOptimization },
    { name: 'Manufacturing Case', fn: testManufacturingCase },
    { name: 'Edge Cases', fn: testEdgeCases }
  ];
  
  let passed = 0;
  for (const test of tests) {
    try {
      test.fn();
      console.log(`  ✓ ${test.name}: PASSED`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${test.name}: FAILED - ${e.message}`);
    }
  }
  
  console.log(`[ALGORITHM] Self-Test Complete: ${passed}/${tests.length} passed`);
  return passed === tests.length;
}

// ============================================================
// SECTION 6: EXPORTS
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    [AlgorithmName]Engine,
    optimizeCuttingParameters,
    optimizeToolPath,
    selfTest,
    DEFAULT_CONFIG
  };
}

if (typeof window !== 'undefined') {
  window.PRISM_[NAME] = {
    [AlgorithmName]Engine,
    optimizeCuttingParameters,
    optimizeToolPath,
    selfTest
  };
}
```

---

# ALGORITHM-SPECIFIC TEMPLATES

## Genetic Algorithm Template
```javascript
/**
 * Core Components Required:
 * 1. Population initialization (random)
 * 2. Fitness evaluation
 * 3. Selection (tournament, roulette wheel)
 * 4. Crossover (single-point, two-point, uniform, BLX-α)
 * 5. Mutation (gaussian, uniform)
 * 6. Elitism
 * 7. Termination criteria
 */

class GeneticAlgorithm {
  constructor(config) {
    this.populationSize = config.populationSize || 50;
    this.mutationRate = config.mutationRate || 0.01;
    this.crossoverRate = config.crossoverRate || 0.8;
    this.eliteRatio = config.eliteRatio || 0.1;
    this.maxGenerations = config.maxGenerations || 100;
  }
  
  // Selection methods
  tournamentSelection(population, tournamentSize = 3) { /* ... */ }
  rouletteWheelSelection(population) { /* ... */ }
  
  // Crossover methods
  singlePointCrossover(parent1, parent2) { /* ... */ }
  twoPointCrossover(parent1, parent2) { /* ... */ }
  uniformCrossover(parent1, parent2) { /* ... */ }
  blendCrossover(parent1, parent2, alpha = 0.5) { /* ... */ }
  
  // Mutation methods
  gaussianMutation(individual, sigma) { /* ... */ }
  uniformMutation(individual) { /* ... */ }
  
  // Core loop
  evolve(fitnessFunction) { /* ... */ }
}
```

## Simulated Annealing Template
```javascript
/**
 * Core Components Required:
 * 1. Initial solution generation
 * 2. Neighbor generation
 * 3. Energy/cost calculation
 * 4. Acceptance probability (Metropolis criterion)
 * 5. Cooling schedule (geometric, linear, logarithmic, adaptive)
 * 6. Termination criteria
 * 7. Reheating (optional)
 */

class SimulatedAnnealing {
  constructor(config) {
    this.initialTemp = config.initialTemp || 1000;
    this.minTemp = config.minTemp || 0.01;
    this.coolingRate = config.coolingRate || 0.95;
    this.iterationsPerTemp = config.iterationsPerTemp || 100;
    this.coolingSchedule = config.coolingSchedule || 'geometric';
  }
  
  // Cooling schedules
  geometricCooling(temp) { return temp * this.coolingRate; }
  linearCooling(temp, iteration) { /* ... */ }
  logarithmicCooling(temp, iteration) { /* ... */ }
  adaptiveCooling(temp, acceptanceRatio) { /* ... */ }
  
  // Core methods
  generateNeighbor(solution, temperature) { /* ... */ }
  acceptanceProbability(currentEnergy, newEnergy, temperature) {
    if (newEnergy < currentEnergy) return 1.0;
    return Math.exp(-(newEnergy - currentEnergy) / temperature);
  }
  
  // Optimization loop
  optimize(energyFunction, initialSolution) { /* ... */ }
}
```

## Reinforcement Learning Template
```javascript
/**
 * Core Components Required:
 * 1. Q-table or function approximator
 * 2. Action selection (ε-greedy, softmax, UCB1)
 * 3. Learning update (Q-learning, SARSA, Expected SARSA)
 * 4. Experience replay (for DQN)
 * 5. Target network (for DQN)
 * 6. State discretization (for continuous spaces)
 */

class QLearningAgent {
  constructor(config) {
    this.alpha = config.learningRate || 0.1;    // Learning rate
    this.gamma = config.discountFactor || 0.99;  // Discount factor
    this.epsilon = config.epsilon || 0.1;        // Exploration rate
    this.qTable = new Map();
  }
  
  // Action selection
  epsilonGreedy(state, actions) { /* ... */ }
  softmax(state, actions, temperature = 1.0) { /* ... */ }
  ucb1(state, actions, c = 2) { /* ... */ }
  
  // Learning updates
  qLearningUpdate(state, action, reward, nextState) { /* ... */ }
  sarsaUpdate(state, action, reward, nextState, nextAction) { /* ... */ }
  expectedSarsaUpdate(state, action, reward, nextState) { /* ... */ }
  
  // Training
  train(environment, episodes) { /* ... */ }
}
```

---

# MANUFACTURING INTEGRATION PATTERNS

## Cutting Parameter Optimization
```javascript
/**
 * Every algorithm MUST include manufacturing optimization functions
 */

function createManufacturingObjective(material, operation, tool) {
  return {
    // Primary objectives
    minimize: {
      cycleTime: (params) => calculateCycleTime(params),
      toolWear: (params) => estimateToolWear(params, material, tool),
      surfaceRoughness: (params) => predictSurfaceFinish(params)
    },
    
    // Constraints
    constraints: {
      maxSpindleSpeed: tool.maxRPM,
      maxFeedRate: machine.maxFeed,
      maxDepthOfCut: tool.maxDoc,
      minChipLoad: material.minChipLoad,
      maxTemperature: material.maxCuttingTemp
    },
    
    // Bounds for optimization variables
    bounds: {
      speed: [material.minSpeed, material.maxSpeed],
      feed: [material.minFeed, material.maxFeed],
      depth: [0.1, tool.maxDoc]
    }
  };
}

function optimizeCuttingParameters(algorithm, material, operation, tool, machine) {
  const objective = createManufacturingObjective(material, operation, tool);
  
  // Configure algorithm for manufacturing
  const config = {
    dimensions: 3,  // speed, feed, depth
    bounds: [
      objective.bounds.speed,
      objective.bounds.feed,
      objective.bounds.depth
    ],
    constraints: Object.values(objective.constraints)
  };
  
  // Run optimization
  const result = algorithm.optimize(
    (params) => {
      const [speed, feed, depth] = params;
      return evaluateManufacturingCost(speed, feed, depth, objective);
    },
    config
  );
  
  return {
    optimalSpeed: result.solution[0],
    optimalFeed: result.solution[1],
    optimalDepth: result.solution[2],
    predictedCycleTime: result.cost,
    convergenceHistory: result.history
  };
}
```

---

# SELF-TEST REQUIREMENTS

## Mandatory Test Categories

### 1. Algorithm Correctness
```javascript
function testAlgorithmCorrectness() {
  // Test on standard benchmark functions
  const sphere = (x) => x.reduce((s, xi) => s + xi * xi, 0);
  const rastrigin = (x) => 10 * x.length + x.reduce((s, xi) => 
    s + xi * xi - 10 * Math.cos(2 * Math.PI * xi), 0);
  
  // Verify convergence
  const result = algorithm.optimize(sphere, { dimensions: 2, bounds: [[-5, 5], [-5, 5]] });
  assert(result.cost < 0.01, 'Should converge to global minimum');
}
```

### 2. Manufacturing Case
```javascript
function testManufacturingCase() {
  // Test with realistic cutting parameters
  const material = { type: 'AISI 1045', hardness: 200 };
  const tool = { diameter: 12, flutes: 4, maxRPM: 10000 };
  
  const result = optimizeCuttingParameters(algorithm, material, 'roughing', tool);
  
  assert(result.optimalSpeed > 0, 'Speed should be positive');
  assert(result.optimalFeed > 0, 'Feed should be positive');
  assert(result.optimalDepth > 0, 'Depth should be positive');
}
```

### 3. Edge Cases
```javascript
function testEdgeCases() {
  // Test boundary conditions
  // Test with single dimension
  // Test with maximum iterations
  // Test early termination
  // Test constraint violations
}
```

---

# BUILD CHECKLIST

```
MODULE BUILD CHECKLIST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ STEP 1: Identify academic sources
  - Primary course (MIT/Stanford)
  - Seminal paper citations
  - Reference implementations
  
□ STEP 2: Core algorithm implementation
  - All standard variations
  - Configurable parameters
  - Proper initialization
  
□ STEP 3: Manufacturing integration
  - Cutting parameter optimization
  - Toolpath optimization
  - Machine constraints
  
□ STEP 4: Utility functions
  - Math helpers
  - Validation functions
  - Result formatting
  
□ STEP 5: Self-test suite
  - Benchmark functions
  - Manufacturing cases
  - Edge cases
  
□ STEP 6: Documentation
  - Header with sources
  - Inline comments
  - Usage examples
  
□ STEP 7: Exports
  - Node.js module.exports
  - Browser window attachment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# SIZE GUIDELINES

| Module Type | Target Lines | Target Size |
|-------------|--------------|-------------|
| Simple Algorithm | 300-400 | 12-15KB |
| Standard Algorithm | 450-550 | 18-24KB |
| Complex Algorithm | 550-700 | 22-30KB |
| Algorithm Suite | 700-1000 | 28-40KB |

---

# INTEGRATION WITH OTHER SKILLS

| Skill | Integration Point |
|-------|-------------------|
| `prism-swarm-extraction` | Triggers build when stub detected |
| `prism-aiml-engine-patterns` | Provides standard patterns |
| `prism-knowledge-master` | Academic course lookup |
| `prism-quality-master` | Validation gates |
| `prism-sp-verification` | Completion proof |

---

# QUICK REFERENCE

```
BUILD FROM ACADEMIC SPEC:
1. IDENTIFY sources (course + paper)
2. IMPLEMENT core algorithm (all variations)
3. ADD manufacturing functions
4. CREATE self-tests
5. DOCUMENT thoroughly
6. EXPORT for Node + browser
7. UPDATE extraction manifest
```

---

**Version 1.0 | 2026-01-30 | PRISM Manufacturing Intelligence**

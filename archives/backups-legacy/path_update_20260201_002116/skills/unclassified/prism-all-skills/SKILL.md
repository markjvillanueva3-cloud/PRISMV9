---
name: prism-all-skills
description: |
  Complete PRISM Manufacturing Intelligence skill package containing all 50 skills.
  Covers: 9 core development, 3 monolith navigation, 5 materials system, 4 session
  management, 6 quality/validation, 6 code/architecture, 4 context management,
  2 knowledge base, and 10 AI expert role skills. For PRISM v9.0 rebuild.
---

# PRISM Skills Package - All 50 Skills Combined
# Generated: 2026-01-23
# For upload to Claude.ai


========================================
SKILL: prism-algorithm-selector
========================================
---
name: prism-algorithm-selector
description: |
  Instant algorithm selection for any PRISM problem. Maps problems to optimal 
  algorithms and PRISM engines. Covers optimization, prediction, manufacturing 
  physics, geometry, signal processing, and scheduling. Source: 285 algorithms.

  MIT Foundation: 6.046J (Algorithms), 15.083J (Optimization), 6.867 (ML)
---

# PRISM Algorithm Selector Skill
## Problem â†’ Algorithm â†’ PRISM Engine Mapping
**MIT Foundation:** 6.046J (Algorithms), 15.083J (Optimization), 6.867 (ML)

---

## PURPOSE

**Instant algorithm selection** for any PRISM problem. Instead of researching algorithms, use this skill to:
1. Describe your problem
2. Get the optimal algorithm
3. Get the PRISM engine that implements it
4. Get usage examples and alternatives

**Source:** ALGORITHM_REGISTRY.json (285 algorithms, 87.8% PRISM engine coverage)

---

## QUICK REFERENCE BY PROBLEM TYPE

### ðŸŽ¯ OPTIMIZATION PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Minimize cost with constraints | Simplex / Interior Point | PRISM_CONSTRAINED_OPTIMIZER | 6.251J |
| Multi-objective (cost + time) | NSGA-II | PRISM_NSGA2 | 15.083J |
| Sequence operations | Ant Colony / Genetic | PRISM_ACO_SEQUENCER | 6.034 |
| Parameter tuning | Bayesian Optimization | PRISM_BAYESIAN_SYSTEM | 6.867 |
| Global search (many local minima) | Simulated Annealing | PRISM_SIMULATED_ANNEALING | 6.046J |
| Continuous optimization | Gradient Descent / Adam | PRISM_ADAM_OPTIMIZER | 6.867 |

### ðŸ“Š PREDICTION PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Predict numeric value | Random Forest / XGBoost | PRISM_XGBOOST_ENGINE | 6.867 |
| Classify categories | SVM / Logistic Regression | PRISM_SVM_ENGINE | 6.867 |
| Time series forecast | LSTM | PRISM_LSTM_ENGINE | 6.867 |
| Uncertainty quantification | Bayesian / Monte Carlo | PRISM_MONTE_CARLO_ENGINE | 6.041 |
| Few training samples | KNN / Bayesian | PRISM_KNN_ENGINE | 6.867 |

### ðŸ”§ MANUFACTURING PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Cutting force calculation | Kienzle Model | PRISM_KIENZLE_FORCE | 2.810 |
| Tool life prediction | Taylor Equation | PRISM_TAYLOR_TOOL_LIFE | 2.810 |
| Chatter prediction | Stability Lobes | PRISM_STABILITY_LOBES | 2.032 |
| Material flow stress | Johnson-Cook | PRISM_JOHNSON_COOK_ENGINE | 2.810 |
| Heat distribution | FEM / Fourier | PRISM_HEAT_TRANSFER_ENGINE | 2.51 |
| Tool deflection | Beam Theory | PRISM_DEFLECTION_ENGINE | 2.003 |

### ðŸ“ GEOMETRY/CAD PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Collision detection | GJK / A* | PRISM_COLLISION_ENGINE | 6.837 |
| Surface intersection | NURBS | PRISM_SURFACE_INTERSECTION_ENGINE | 6.838 |
| Mesh simplification | Decimation | PRISM_MESH_DECIMATION_ENGINE | 6.838 |
| Feature recognition | Pattern Matching | PRISM_COMPLETE_FEATURE_ENGINE | 6.838 |
| Toolpath optimization | Dijkstra / A* | PRISM_TOOLPATH_OPTIMIZER | 6.046J |

### ðŸ“ˆ SIGNAL PROCESSING PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Frequency analysis | FFT | PRISM_FFT_PREDICTIVE_CHATTER | 6.011 |
| Vibration detection | Wavelet Transform | PRISM_WAVELET_CHATTER | 6.341 |
| Noise filtering | Kalman Filter | PRISM_KALMAN_FILTER | 6.011 |
| Time-frequency analysis | STFT | PRISM_STFT_ENGINE | 6.011 |

### ðŸ“… SCHEDULING PROBLEMS

| Problem | Algorithm | PRISM Engine | Course |
|---------|-----------|--------------|--------|
| Job shop scheduling | Dispatching + Meta | PRISM_JOB_SHOP_SCHEDULING_ENGINE | 2.854 |
| Resource allocation | Hungarian / Simplex | PRISM_SCHEDULING_ENGINE | 15.082J |
| Lead time estimation | PERT / Monte Carlo | PRISM_LEAD_TIME_PREDICTOR | 15.060 |
| Capacity planning | Linear Programming | PRISM_CAPACITY_PLANNER | 6.251J |

---

## DETAILED SELECTION GUIDE

### Step 1: Identify Problem Category

```
Is your problem about...
â”œâ”€â”€ Finding optimal values? â†’ OPTIMIZATION
â”‚   â”œâ”€â”€ Single objective? â†’ Linear/Nonlinear Programming
â”‚   â”œâ”€â”€ Multiple objectives? â†’ Multi-objective (NSGA-II, MOEA/D)
â”‚   â””â”€â”€ Discrete choices? â†’ Metaheuristics (GA, ACO, SA)
â”‚
â”œâ”€â”€ Making predictions? â†’ MACHINE LEARNING
â”‚   â”œâ”€â”€ Continuous output? â†’ Regression
â”‚   â”œâ”€â”€ Categorical output? â†’ Classification
â”‚   â”œâ”€â”€ Grouping data? â†’ Clustering
â”‚   â””â”€â”€ Sequential data? â†’ RNN/LSTM
â”‚
â”œâ”€â”€ Manufacturing physics? â†’ PHYSICS ENGINES
â”‚   â”œâ”€â”€ Cutting forces? â†’ Kienzle/Merchant
â”‚   â”œâ”€â”€ Tool wear? â†’ Taylor/Wear Models
â”‚   â”œâ”€â”€ Vibration? â†’ Stability Analysis
â”‚   â””â”€â”€ Heat? â†’ Thermal Models
â”‚
â”œâ”€â”€ Geometry/CAD? â†’ GEOMETRY ENGINES
â”‚   â”œâ”€â”€ Collision? â†’ GJK/BVH
â”‚   â”œâ”€â”€ Surfaces? â†’ NURBS/Bezier
â”‚   â””â”€â”€ Mesh? â†’ Boolean/Decimation
â”‚
â””â”€â”€ Scheduling? â†’ SCHEDULING ENGINES
    â”œâ”€â”€ Job sequencing? â†’ ACO/GA
    â””â”€â”€ Resource allocation? â†’ LP/Assignment
```

### Step 2: Consider Constraints

| Constraint | Recommendation |
|------------|----------------|
| Must be fast (<100ms) | Avoid metaheuristics, use heuristics |
| Must be accurate | Use ensemble methods, multiple algorithms |
| Limited training data | Bayesian methods, transfer learning |
| Need explainability | Decision trees, XAI engines |
| Real-time updates | Online learning, Kalman filter |

### Step 3: Match to PRISM Engine

Use the tables above or search ALGORITHM_REGISTRY.json:
```javascript
// Example: Find algorithms for "optimization multi-objective"
const category = registry.categories.optimization.multi_objective;
// Returns: NSGA-II, NSGA-III, MOEA/D, SPEA2, etc.
```

---

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

---

## ALGORITHM COMPLEXITY REFERENCE

| Algorithm | Time Complexity | Space | Best For |
|-----------|-----------------|-------|----------|
| Simplex | O(2^n) worst, fast avg | O(nÂ²) | LP, fast |
| Interior Point | O(nÂ³) | O(nÂ²) | Large LP |
| NSGA-II | O(MNÂ²) | O(N) | 2-3 objectives |
| Genetic Algorithm | O(gÃ—nÃ—f) | O(n) | Global search |
| PSO | O(iÃ—nÃ—d) | O(nÃ—d) | Continuous |
| Simulated Annealing | O(iterations) | O(1) | Escape local min |
| XGBoost | O(nÃ—dÃ—log n) | O(n) | Tabular data |
| Random Forest | O(nÃ—dÃ—log n) | O(treesÃ—n) | Interpretable |
| FFT | O(n log n) | O(n) | Frequency analysis |
| Dijkstra | O((V+E) log V) | O(V) | Shortest path |

---

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

---

## QUICK LOOKUP FORMAT

When asked "what algorithm for X?", respond with:

```
PROBLEM: [restate problem]
ALGORITHM: [name] 
PRISM ENGINE: [PRISM_XXX]
COMPLEXITY: [O(?) time, O(?) space]
COURSE: [MIT course number]
USAGE: [one-liner example]
ALTERNATIVES: [2-3 alternatives with tradeoffs]
```

---

## SOURCE

**ALGORITHM_REGISTRY.json** location:
```
C:\\PRISM\MIT COURSES\ALGORITHM_REGISTRY.json
```

**Statistics:**
- 285 algorithms catalogued
- 187 of 213 PRISM engines mapped (87.8%)
- 9 major categories
- 35+ subcategories

---

## END OF SKILL

**Impact:** Algorithm selection from hours â†’ seconds
**MIT Foundation:** 6.046J algorithms, 15.083J optimization, 6.867 ML



========================================
SKILL: prism-auditor
========================================
---
name: prism-auditor
description: Audit PRISM modules for completeness before migration. Use when verifying extracted modules have all functions, data, dependencies documented. Checks extraction quality, identifies gaps, validates against source monolith.
---

# PRISM Module Auditor

Verifies extracted modules are complete and ready for migration.

## Quick Audit

```python
# Audit single module
python scripts/audit_module.py --module PRISM_MATERIALS_MASTER --source monolith.html

# Audit entire category
python scripts/audit_category.py --category databases/materials/

# Generate completeness report
python scripts/completeness_report.py --output audit_report.md
```

## Audit Checks

### 1. Function Count Match
```python
# Compares function count in extracted vs source
Expected: 25 functions
Found: 25 functions âœ“
```

### 2. Data Completeness
```python
# Verifies all data entries present
Materials expected: 618
Materials found: 618 âœ“
```

### 3. Dependency Documentation
```python
# Checks dependencies are listed in header
DEPENDENCIES documented: Yes âœ“
- PRISM_CONSTANTS âœ“
- PRISM_UNITS âœ“
```

### 4. Syntax Validation
```python
# Parses with Node.js to check syntax
Syntax valid: Yes âœ“
```

### 5. Consumer Mapping
```python
# Checks consumers are identified
CONSUMERS documented: 15 listed âœ“
```

## Audit Report Format

```markdown
# PRISM Audit Report - [DATE]

## Summary
- Modules audited: 62
- Complete: 58 (93.5%)
- Issues found: 4

## Issues

### PRISM_MATERIALS_MASTER
- [ ] Missing 3 functions: calcAbrasiveness, getChipType, validateProps

### PRISM_TOOL_DATABASE_V7
- [ ] Data incomplete: 4,892/5,000 tools
```

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| âœ“ PASS | Complete, ready for migration | Proceed |
| âš  WARN | Minor issues, can migrate | Document and proceed |
| âœ— FAIL | Major issues, re-extract | Fix before migration |

## Integration with State

Audit results update CURRENT_STATE.json:

```json
{
  "extractionProgress": {
    "databases": {
      "audited": 62,
      "passed": 58,
      "warned": 3,
      "failed": 1
    }
  }
}
```



========================================
SKILL: prism-category-defaults
========================================
---
name: prism-category-defaults
description: |
  Default parameter values for material categories. Provides baseline values when 
  specific material data is unavailable. DEPRECATED - merged into prism-material-templates.
  
  Status: DEPRECATED (Use prism-material-templates instead)
---

# PRISM Category Defaults (DEPRECATED)

> âš ï¸ **DEPRECATED:** This skill has been merged into `prism-material-templates`
> Use `prism-material-templates` for all material category defaults

---

## Migration Guide

### Old Usage (Deprecated)
```javascript
// DON'T USE THIS
const defaults = PRISM_CATEGORY_DEFAULTS.get('carbon_steel');
```

### New Usage (Use This)
```javascript
// USE prism-material-templates instead
view("/mnt/skills/user/prism-material-templates/SKILL.md")
// Templates include category defaults built-in
```

---

## Why Deprecated

1. **Redundancy:** Category defaults are now embedded in material templates
2. **Better Structure:** Templates include defaults + validation in one place
3. **Maintenance:** Single source of truth easier to maintain

---

## Consumers (Historical)

These modules previously used category-defaults:
- PRISM_MATERIALS_MASTER â†’ Now uses prism-material-templates
- PRISM_SPEED_FEED_CALCULATOR â†’ Direct material lookups
- PRISM_COST_ESTIMATOR â†’ Uses material database

---

## Replacement Skill

| Feature | Now In |
|---------|--------|
| Carbon steel defaults | prism-material-templates (LOW_CARBON_STEEL_TEMPLATE) |
| Aluminum defaults | prism-material-templates (ALUMINUM_ALLOY_TEMPLATE) |
| Titanium defaults | prism-material-templates (TITANIUM_ALLOY_TEMPLATE) |
| Stainless defaults | prism-material-templates (STAINLESS_STEEL_TEMPLATE) |

---

**Status:** DEPRECATED | **Replaced By:** prism-material-templates | **Version:** 1.0 (Final)



========================================
SKILL: prism-coding-patterns
========================================
---
name: prism-coding-patterns
description: |
  MIT-based best practices for PRISM development. Covers SICP abstraction patterns,
  software construction principles, algorithm complexity, and error handling.
  Every pattern links back to MIT course material for academic foundation.

  MIT Foundation: 6.001 (SICP), 6.005 (Software Construction), 6.046J (Algorithms)
---

# PRISM Coding Patterns Skill
## MIT-Based Best Practices for PRISM Development
**MIT Foundation:** 6.001 (SICP), 6.005 (Software Construction), 6.046J (Algorithms)

---

## PURPOSE

Consistent, high-quality code across all PRISM modules using proven academic patterns. Every pattern links back to MIT course material.

---

# SECTION 1: SICP PATTERNS (6.001)

## 1.1 Abstraction Barriers

**Principle:** Create clear boundaries between interface and implementation.

```javascript
// âŒ BAD: Exposing internal structure
const material = MATERIALS_ARRAY[5];
const hardness = material.properties.mechanical.hardness.value;

// âœ… GOOD: Abstraction barrier
const material = PRISM_MATERIALS.get('P-CS-005');
const hardness = PRISM_MATERIALS.getProperty(material, 'hardness');

// The abstraction:
const PRISM_MATERIALS = {
  // INTERFACE (stable, documented)
  get: (id) => /* hidden */,
  getProperty: (material, prop) => /* hidden */,
  setProperty: (material, prop, value) => /* hidden */,
  
  // IMPLEMENTATION (can change)
  _storage: new Map(),
  _index: {},
  _validate: (m) => /* hidden */
};
```

**PRISM Application:**
- All databases expose `get()`, `set()`, `query()` methods
- Internal storage structure can change without breaking consumers
- Validation happens inside the barrier

---

## 1.2 Higher-Order Functions

**Principle:** Functions that take or return functions for flexibility.

```javascript
// âŒ BAD: Repeated validation logic
function validateMaterial(m) { /* ... */ }
function validateTool(t) { /* ... */ }
function validateMachine(m) { /* ... */ }

// âœ… GOOD: Higher-order validator factory
function createValidator(schema, rules) {
  return function(item) {
    const errors = [];
    for (const [field, rule] of Object.entries(rules)) {
      if (!rule.validate(item[field])) {
        errors.push({ field, message: rule.message });
      }
    }
    return { valid: errors.length === 0, errors };
  };
}

// Usage
const validateMaterial = createValidator(MATERIAL_SCHEMA, MATERIAL_RULES);
const validateTool = createValidator(TOOL_SCHEMA, TOOL_RULES);
```

**PRISM Application:**
- Validator factories for different entity types
- Calculator factories with configurable parameters
- Formatter factories for different output formats

---

## 1.3 Data Abstraction

**Principle:** Define data by operations, not representation.

```javascript
// A "Material" is defined by what you can DO with it, not how it's stored

// CONSTRUCTORS (create materials)
const material = Material.create(id, properties);
const material = Material.fromCSV(row);
const material = Material.fromJSON(data);

// SELECTORS (extract data)
Material.getId(material);
Material.getProperty(material, 'hardness');
Material.getCategory(material);

// OPERATIONS (compute/transform)
Material.calculateMachinability(material);
Material.compareTo(material1, material2);
Material.merge(baseMaterial, overrides);

// PREDICATES (test conditions)
Material.isHardMaterial(material);  // > 45 HRC
Material.isComplete(material);       // all 127 params
Material.isCompatibleWith(material, tool);
```

**PRISM Application:**
- Every entity type (Material, Tool, Machine) has defined operations
- Internal representation can be JSON, array, or any structure
- All access goes through defined operations

---

## 1.4 Wishful Thinking

**Principle:** Write code as if helper functions already exist, then implement them.

```javascript
// âœ… GOOD: Write the ideal code first
function calculateOptimalSpeed(material, tool, machine) {
  const baseSpeed = getRecommendedSpeed(material, tool);
  const adjustedSpeed = applyMachineConstraints(baseSpeed, machine);
  const safeSpeed = applyStabilityLimits(adjustedSpeed, getSetup());
  const finalSpeed = applyAIAdjustment(safeSpeed, getHistoricalData());
  
  return {
    value: finalSpeed,
    confidence: calculateConfidence(/* ... */),
    explanation: generateExplanation(/* ... */)
  };
}

// THEN implement the helpers:
function getRecommendedSpeed(material, tool) { /* ... */ }
function applyMachineConstraints(speed, machine) { /* ... */ }
// etc.
```

**PRISM Application:**
- Design high-level flow first
- Implement helpers as needed
- Easier to understand, test, and modify

---

# SECTION 2: SOFTWARE CONSTRUCTION (6.005)

## 2.1 Specifications

**Principle:** Every function has a contract: requires, modifies, effects.

```javascript
/**
 * Calculate Kienzle cutting force coefficient.
 * 
 * @requires material !== null
 * @requires material.kienzle.kc1_1 > 0
 * @requires chipThickness > 0 && chipThickness <= 10
 * 
 * @modifies nothing
 * 
 * @effects Returns specific cutting force in N/mmÂ²
 *          Throws InvalidParameterError if inputs invalid
 *          
 * @example calculateKc(material, 0.1) => 2450
 */
function calculateKc(material, chipThickness) {
  // Validate @requires
  if (!material) throw new InvalidParameterError('material required');
  if (!material.kienzle?.kc1_1) throw new InvalidParameterError('kc1_1 required');
  if (chipThickness <= 0 || chipThickness > 10) {
    throw new InvalidParameterError('chipThickness must be 0-10mm');
  }
  
  // Implementation
  const { kc1_1, mc } = material.kienzle;
  return kc1_1 * Math.pow(chipThickness, -mc);
}
```

**PRISM Application:**
- ALL public functions have JSDoc with requires/modifies/effects
- Input validation enforces @requires
- Tests verify @effects

---

## 2.2 Testing Patterns

**Principle:** Test partitions and boundaries systematically.

```javascript
// PARTITION: Material hardness values
// - Soft: < 200 HB
// - Medium: 200-350 HB  
// - Hard: > 350 HB
// BOUNDARIES: 0, 200, 350, max

describe('calculateSpeedFactor', () => {
  // Partition: Soft materials
  test('soft material (150 HB)', () => {
    expect(calculateSpeedFactor(150)).toBe(1.2);
  });
  
  // Boundary: At soft/medium boundary
  test('boundary soft/medium (200 HB)', () => {
    expect(calculateSpeedFactor(200)).toBe(1.0);
  });
  
  // Partition: Medium materials
  test('medium material (275 HB)', () => {
    expect(calculateSpeedFactor(275)).toBe(0.85);
  });
  
  // Boundary: At medium/hard boundary
  test('boundary medium/hard (350 HB)', () => {
    expect(calculateSpeedFactor(350)).toBe(0.7);
  });
  
  // Partition: Hard materials
  test('hard material (500 HB)', () => {
    expect(calculateSpeedFactor(500)).toBe(0.5);
  });
  
  // Edge cases
  test('zero hardness throws', () => {
    expect(() => calculateSpeedFactor(0)).toThrow();
  });
  
  test('negative hardness throws', () => {
    expect(() => calculateSpeedFactor(-100)).toThrow();
  });
});
```

**PRISM Application:**
- Identify partitions for each input
- Test at every boundary
- Include error cases

---

## 2.3 Defensive Programming

**Principle:** Validate early, fail fast, never trust input.

```javascript
// âœ… GOOD: Defensive input handling
function processMaterial(input) {
  // 1. Validate type
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('Material must be an object');
  }
  
  // 2. Validate required fields
  const required = ['id', 'name', 'category'];
  for (const field of required) {
    if (!(field in input)) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
  
  // 3. Validate field types
  if (typeof input.id !== 'string' || !input.id.match(/^P-[A-Z]{2}-\d{3}$/)) {
    throw new ValidationError('Invalid material ID format');
  }
  
  // 4. Sanitize strings
  const sanitized = {
    ...input,
    name: sanitizeString(input.name),
    notes: input.notes ? sanitizeString(input.notes) : ''
  };
  
  // 5. Deep copy to prevent mutation
  return JSON.parse(JSON.stringify(sanitized));
}
```

**PRISM Application:**
- Validate at every entry point
- Type check, range check, format check
- Sanitize user input
- Deep copy when storing

---

## 2.4 Immutability

**Principle:** Prefer immutable data; make mutations explicit.

```javascript
// âŒ BAD: Mutation hidden in function
function updateMaterial(material, property, value) {
  material[property] = value;  // Mutates original!
  return material;
}

// âœ… GOOD: Explicit immutability
function updateMaterial(material, property, value) {
  return {
    ...material,
    [property]: value,
    _modified: new Date().toISOString()
  };
}

// âœ… GOOD: Deep immutable update
function updateNestedProperty(material, path, value) {
  const result = JSON.parse(JSON.stringify(material));  // Deep copy
  let current = result;
  const parts = path.split('.');
  
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  
  return result;
}
```

**PRISM Application:**
- Database operations return new objects
- Original data never mutated
- History tracking enabled

---

# SECTION 3: PRISM-SPECIFIC PATTERNS

## 3.1 Material Creation Pattern

```
FLOW: template â†’ customize â†’ validate â†’ write â†’ verify

STEPS:
1. Load template from prism-material-templates
2. Set identification fields (ID, name, aliases)
3. Set composition (elements, percentages)
4. Set physical properties (density, melting, conductivity)
5. Set mechanical properties (hardness, strength, elongation)
6. Calculate derived values (Kc, Taylor, J-C)
7. Validate with prism-validator
8. Write with appropriate method (small: single, large: chunked)
9. Verify file saved correctly
```

---

## 3.2 Module Extraction Pattern

```
FLOW: locate â†’ read â†’ parse â†’ document â†’ write â†’ audit

STEPS:
1. Find line number in prism-monolith-index
2. Read section with Desktop Commander (offset + length)
3. Parse to identify:
   - Function boundaries
   - Data structures
   - Dependencies (imports, calls)
   - Outputs (exports, events)
4. Add documentation header
5. Write to EXTRACTED/[category]/
6. Audit with prism-auditor
7. Update extraction index
```

---

## 3.3 Calculation Pattern (6+ Sources)

```
FLOW: gather â†’ physics â†’ ai â†’ confidence â†’ explain

STEPS:
1. GATHER (6+ sources):
   - Material database
   - Tool database
   - Machine database
   - Physics engine
   - Historical data
   - AI recommendation

2. PHYSICS CALCULATION:
   - Apply Kienzle, Taylor, or appropriate model
   - Include uncertainty from parameter ranges

3. AI ADJUSTMENT:
   - Bayesian update with historical data
   - Apply learned corrections

4. CONFIDENCE INTERVAL:
   - Combine uncertainties
   - Generate min/typical/max

5. EXPLANATION:
   - Which sources contributed
   - Key assumptions
   - Limiting factors
```

---

## 3.4 Gateway Route Pattern

```javascript
// Every gateway route follows this pattern:

PRISM_GATEWAY.registerRoute({
  path: '/materials/get/:id',
  method: 'GET',
  
  // Input validation
  validate: (params) => {
    return isValidMaterialId(params.id);
  },
  
  // Main handler
  handler: async (params, context) => {
    const material = await PRISM_MATERIALS.get(params.id);
    return {
      success: true,
      data: material,
      meta: { cached: false, source: 'database' }
    };
  },
  
  // Error handling
  onError: (error, params) => {
    logError('materials/get', error, params);
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN'
    };
  },
  
  // Metadata
  meta: {
    description: 'Get material by ID',
    consumers: ['PRISM_SPEED_FEED', 'PRISM_FORCE_CALC', '...'],
    rateLimit: 100
  }
});
```

---

# SECTION 4: ERROR HANDLING PATTERNS

## 4.1 Error Hierarchy

```javascript
// Base error class
class PRISMError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PRISMError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Specific error types
class ValidationError extends PRISMError {
  constructor(message, field, value) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

class NotFoundError extends PRISMError {
  constructor(entityType, id) {
    super(`${entityType} not found: ${id}`, 'NOT_FOUND', { entityType, id });
    this.name = 'NotFoundError';
  }
}

class CalculationError extends PRISMError {
  constructor(message, inputs, partialResult) {
    super(message, 'CALCULATION_ERROR', { inputs, partialResult });
    this.name = 'CalculationError';
  }
}
```

## 4.2 Graceful Degradation

```javascript
function calculateWithFallback(material, tool, machine) {
  try {
    // Primary: Full calculation with AI
    return fullAICalculation(material, tool, machine);
  } catch (aiError) {
    logWarning('AI calculation failed, using physics-only', aiError);
    
    try {
      // Fallback 1: Physics only
      return physicsOnlyCalculation(material, tool, machine);
    } catch (physicsError) {
      logWarning('Physics calculation failed, using handbook', physicsError);
      
      try {
        // Fallback 2: Handbook lookup
        return handbookLookup(material, tool);
      } catch (handbookError) {
        logError('All calculations failed', handbookError);
        
        // Fallback 3: Conservative defaults
        return {
          value: getConservativeDefault(material),
          confidence: 0.3,
          warning: 'Using conservative defaults - verify before use',
          failedMethods: ['ai', 'physics', 'handbook']
        };
      }
    }
  }
}
```

---

# SECTION 5: QUICK REFERENCE

## Code Quality Checklist

```
â˜ Has JSDoc with @requires, @modifies, @effects
â˜ Validates all inputs (type, range, format)
â˜ Uses immutable patterns (no hidden mutation)
â˜ Has clear abstraction barriers
â˜ Includes error handling with graceful degradation
â˜ Has tests for partitions and boundaries
â˜ Follows PRISM naming conventions
â˜ Documented dependencies and consumers
```

## Naming Conventions

```
MODULES:     PRISM_[CATEGORY]_[NAME]        â†’ PRISM_MATERIALS_MASTER
FUNCTIONS:   verbNoun()                     â†’ getMaterial(), calculateForce()
CONSTANTS:   UPPER_SNAKE_CASE               â†’ MAX_RPM, DEFAULT_CONFIDENCE
VARIABLES:   camelCase                      â†’ materialId, toolDiameter
PRIVATE:     _prefixedCamelCase             â†’ _internalCache, _validate()
EVENTS:      entity:action                  â†’ material:created, tool:updated
ROUTES:      /entity/action/:param          â†’ /materials/get/:id
```

## MIT Course Quick Links

| Pattern | Course | Topic |
|---------|--------|-------|
| Abstraction | 6.001 | Lecture 2-3 |
| Higher-order | 6.001 | Lecture 4-5 |
| Specifications | 6.005 | Lecture 3 |
| Testing | 6.005 | Lecture 5 |
| Defensive | 6.005 | Lecture 9 |
| Algorithms | 6.046J | Full course |

---

## END OF SKILL

**Impact:** Consistent, maintainable, MIT-quality code
**MIT Foundation:** 6.001 SICP, 6.005 Software Construction, 6.046J Algorithms



========================================
SKILL: prism-consumer-mapper
========================================
---
name: prism-consumer-mapper
description: Auto-generate consumer wiring for PRISM's 100% utilization requirement. Use when mapping database consumers, generating wiring code, verifying 6+ source calculations, or blocking incomplete modules. Critical for Stage 3 migration.
---

# PRISM Consumer Mapper

Auto-generates consumer wiring to achieve 100% utilization.

## Core Requirement

**NO module imported without ALL consumers wired.**

## Consumer Matrix

Every database has required consumers:

### PRISM_MATERIALS_MASTER (15 consumers)
| Consumer | Uses Fields |
|----------|-------------|
| SPEED_FEED_CALCULATOR | base_speed, machinability, hardness |
| FORCE_CALCULATOR | kc1_1, mc, yield_strength |
| THERMAL_ENGINE | conductivity, specific_heat, melting_point |
| TOOL_LIFE_ENGINE | taylor_n, taylor_C, abrasiveness |
| SURFACE_FINISH_ENGINE | elasticity, built_up_edge_tendency |
| CHATTER_PREDICTION | damping_ratio, elastic_modulus |
| CHIP_FORMATION_ENGINE | strain_hardening, chip_type |
| COOLANT_SELECTOR | reactivity, coolant_compatibility |
| COATING_OPTIMIZER | chemical_affinity, temperature_limit |
| COST_ESTIMATOR | material_cost, density |
| CYCLE_TIME_PREDICTOR | all cutting parameters |
| QUOTING_ENGINE | material_cost, machinability |
| AI_LEARNING_PIPELINE | ALL fields |
| BAYESIAN_OPTIMIZER | uncertainty in parameters |
| EXPLAINABLE_AI | ALL for explanation |

## Scripts

```python
# Map all consumers for a database
python scripts/map_consumers.py --module PRISM_MATERIALS_MASTER

# Generate wiring code
python scripts/generate_wiring.py --module PRISM_MATERIALS_MASTER --output wiring.js

# Verify calculation uses 6+ sources
python scripts/verify_6_sources.py --calc calculateOptimalSpeed

# Block incomplete module
python scripts/block_incomplete.py --module PRISM_TOOLS_DATABASE --consumers 8
```

## Wiring Code Template

```javascript
// Auto-generated wiring for PRISM_MATERIALS_MASTER
const PRISM_MATERIALS_WIRING = {
  module: 'PRISM_MATERIALS_MASTER',
  consumers: [
    {
      name: 'PRISM_SPEED_FEED_CALCULATOR',
      fields: ['base_speed', 'machinability', 'hardness'],
      gateway_route: '/api/speed-feed/calculate',
      priority: 'CRITICAL'
    },
    // ... 14 more consumers
  ],
  verification: {
    minConsumers: 15,
    allRequired: true,
    lastVerified: '2026-01-21'
  }
};
```

## 6-Source Calculation Requirement

Every calculation MUST include:
1. **Database source** - Material/tool/machine properties
2. **Physics model** - Force, thermal, dynamics
3. **AI/ML prediction** - Bayesian, neural, ensemble
4. **Historical data** - Past successful runs
5. **Manufacturer data** - Catalog specifications
6. **Empirical validation** - Validated against real cuts

## Output Format

```javascript
{
  value: optimal_speed,
  confidence: 0.87,
  range_95: [min, max],
  sources: ['material', 'tool', 'machine', 'physics', 'historical', 'ai'],
  explanation: PRISM_XAI.explain(calculation_trace)
}
```

See `references/consumer_matrix.md` for complete 62-database mapping.



========================================
SKILL: prism-context-dna
========================================
---
name: prism-context-dna
description: |
  Compressed context fingerprints for 90% session recovery after compaction.
  Maintains decision history, proven patterns, and reconstruction hints.
  Store decisions and patterns, not raw data.

  MIT Foundation: 6.033 (Systems), 6.824 (Distributed), 6.005 (Software Construction)
---

# PRISM Context DNA Skill
## Compressed Context Fingerprints for Session Continuity
**MIT Foundation:** 6.033 (Systems), 6.824 (Distributed), 6.005 (Software Construction)

---

## PURPOSE

**90% context recovery** after compaction or new chats by maintaining compressed "DNA fingerprints" that capture the **essence** of sessions without the bulk.

**Key Insight (from 6.033):** Store decisions and patterns, not raw data. The monolith, files, and state contain the data - we just need to know how to use them.

---

## CONTEXT DNA STRUCTURE

### The DNA Object (Add to CURRENT_STATE.json)
```json
{
  "contextDNA": {
    "version": "1.0",
    "lastUpdated": "2026-01-23T18:30:00Z",
    
    "essence": {
      "whatWeAreDoing": "Rebuilding PRISM v9.0 from v8.89 monolith",
      "currentFocus": "Materials database enhancement - carbon steels",
      "currentFile": "carbon_steels_031_040.js",
      "position": "Creating P-CS-031 through P-CS-040"
    },
    
    "keyDecisions": [
      "127-param schema locked - no changes without discussion",
      "Chunked write for files >50KB (prevents truncation)",
      "ENHANCE existing materials before adding new ones",
      "Local C: drive is primary, Box for backup",
      "Desktop Commander:write_file with mode:append for large files"
    ],
    
    "patternsProven": {
      "materialCreation": "template â†’ modify per grade â†’ validate â†’ write",
      "largeFiles": "header chunk (write) â†’ body chunks (append) â†’ verify",
      "extraction": "monolith-index â†’ read section â†’ parse â†’ document â†’ save",
      "sessionStart": "read state â†’ check checkpoint â†’ announce â†’ continue"
    },
    
    "patternsFailed": [
      "Single write_file >50KB â†’ truncates at ~50KB",
      "edit_file for large changes â†’ very slow (5x slower than append)",
      "Container /home/claude/ â†’ resets every session, data lost"
    ],
    
    "criticalPaths": {
      "state": "C:\\PRISM\\CURRENT_STATE.json",
      "materials": "C:\\PRISM REBUILD...\\EXTRACTED\\materials\\enhanced\\",
      "skills": "C:\\PRISM REBUILD...\\_SKILLS\\",
      "monolith": "C:\\PRISM REBUILD...\\_BUILD\\PRISM_v8_89_002...\\*.html"
    },
    
    "toolPreferences": {
      "readFiles": "Filesystem:read_file",
      "writeFiles": "Filesystem:write_file (small) or Desktop Commander (large/append)",
      "search": "Desktop Commander:start_search with searchType",
      "readSkills": "view(/mnt/skills/user/...)"
    },
    
    "reconstructionHints": [
      "If lost: Read CURRENT_STATE.json first",
      "For materials work: Read prism-material-templates skill",
      "For large files: Read prism-large-file-writer skill",
      "Check SESSION_LOGS/ for detailed history"
    ]
  }
}
```

---

## WHEN TO UPDATE DNA

### Mandatory Updates (Every Session)
- [ ] Session start: Verify DNA is current
- [ ] Major decision made: Add to keyDecisions
- [ ] New pattern proven: Add to patternsProven
- [ ] Pattern failed: Add to patternsFailed
- [ ] Session end: Update essence.position

### Triggered Updates
- When approach works well â†’ add to patternsProven
- When approach fails â†’ add to patternsFailed  
- When file/path changes â†’ update criticalPaths
- When tool preference changes â†’ update toolPreferences

---

## DNA OPERATIONS

### 1. Initialize DNA (First Time)
```javascript
// Add to CURRENT_STATE.json if not present
const initialDNA = {
  contextDNA: {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    essence: {
      whatWeAreDoing: "Rebuilding PRISM v9.0",
      currentFocus: "",
      currentFile: "",
      position: ""
    },
    keyDecisions: [],
    patternsProven: {},
    patternsFailed: [],
    criticalPaths: { /* ... */ },
    toolPreferences: { /* ... */ },
    reconstructionHints: []
  }
};
```

### 2. Update DNA (During Session)
```javascript
// Quick essence update
state.contextDNA.essence.currentFocus = "Carbon steels P-CS-031 to P-CS-040";
state.contextDNA.essence.position = "Completed P-CS-035, working on P-CS-036";
state.contextDNA.lastUpdated = new Date().toISOString();

// Add proven pattern
state.contextDNA.patternsProven.chipFormation = "Use ASM Handbook Vol 1 Table 2-1";

// Add failed approach
state.contextDNA.patternsFailed.push("Using Filesystem:write_file for 80KB caused truncation");
```

### 3. Compress DNA (Before Compaction Warning)
```javascript
// Generate minimal reconstruction string
const dnaCompressed = `
PRISM DNA v1.0 | ${new Date().toISOString()}
DOING: ${state.contextDNA.essence.currentFocus}
AT: ${state.contextDNA.essence.position}
FILE: ${state.contextDNA.essence.currentFile}
PATTERN: ${state.contextDNA.patternsProven.materialCreation}
CRITICAL: Use append mode for large files, never container storage
RECOVER: Read CURRENT_STATE.json â†’ check checkpoint â†’ continue
`;
```

### 4. Reconstruct from DNA (After Compaction/New Chat)
```javascript
// 1. Read state file
const state = JSON.parse(await readFile(STATE_PATH));

// 2. Extract DNA
const dna = state.contextDNA;

// 3. Announce recovery
console.log(`
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
RECOVERING FROM CONTEXT DNA
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Focus: ${dna.essence.currentFocus}
Position: ${dna.essence.position}
Pattern: ${dna.patternsProven.materialCreation || 'Check patternProven'}

Key Decisions to Remember:
${dna.keyDecisions.map(d => '- ' + d).join('\n')}

Ready to continue from: ${dna.essence.position}
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
`);

// 4. Resume work
```

---

## DNA QUICK REFERENCE

### Essence Fields (Update EVERY Session)
| Field | Example |
|-------|---------|
| whatWeAreDoing | "Rebuilding PRISM v9.0 from monolith" |
| currentFocus | "Carbon steels P-CS-031 to P-CS-040" |
| currentFile | "carbon_steels_031_040.js" |
| position | "After P-CS-035, starting P-CS-036" |

### Key Decisions (Add When Made)
```
- "127-param schema is LOCKED"
- "Chunked write for >50KB files"
- "ENHANCE before EXPAND (existing materials first)"
- "Local C: primary, Box backup"
```

### Patterns Proven (Add When Working)
```
materialCreation: "template â†’ modify â†’ validate â†’ write"
largeFiles: "header(write) â†’ chunks(append) â†’ verify"
extraction: "index â†’ read â†’ parse â†’ document â†’ save"
```

### Patterns Failed (Add When Broken)
```
- "Single write >50KB truncates"
- "Container storage resets"
- "edit_file slow for large changes"
```

---

## DNA TEMPLATES

### For Material Sessions
```json
{
  "essence": {
    "whatWeAreDoing": "Creating materials database with 127 params each",
    "currentFocus": "Carbon steels [range]",
    "currentFile": "carbon_steels_XXX_XXX.js",
    "position": "Material P-CS-XXX"
  },
  "patternsProven": {
    "materialCreation": "prism-material-templates â†’ modify â†’ prism-validator â†’ write"
  }
}
```

### For Extraction Sessions
```json
{
  "essence": {
    "whatWeAreDoing": "Extracting modules from monolith",
    "currentFocus": "[Category] extraction",
    "currentFile": "EXTRACTED/[category]/[module].js",
    "position": "Module [X] of [Y]"
  },
  "patternsProven": {
    "extraction": "prism-monolith-index â†’ read lines â†’ parse â†’ document deps â†’ save"
  }
}
```

### For Architecture Sessions
```json
{
  "essence": {
    "whatWeAreDoing": "Building PRISM v9.0 architecture",
    "currentFocus": "[Component] implementation",
    "currentFile": "[path]",
    "position": "[specific task]"
  },
  "patternsProven": {
    "architecture": "design â†’ prototype â†’ test â†’ integrate"
  }
}
```

---

## INTEGRATION WITH OTHER SKILLS

| Skill | Integration |
|-------|-------------|
| prism-state-manager | DNA stored in CURRENT_STATE.json |
| prism-session-handoff | Include DNA summary in handoff |
| prism-context-pressure | Compress DNA when pressure high |
| prism-quick-start | Read DNA for instant context |

---

## RECOVERY PROTOCOL

### After Compaction
```
1. Read transcript file mentioned in compaction summary (for details)
2. Read CURRENT_STATE.json (for DNA)
3. Extract contextDNA.essence for quick orientation
4. Check contextDNA.position for exact resume point
5. Reference contextDNA.patternsProven for how to proceed
6. Continue work
```

### After New Chat
```
1. Read CURRENT_STATE.json
2. Announce: "Recovering from DNA..."
3. Display essence (what, where, position)
4. Display key decisions to remember
5. Display proven patterns to use
6. Resume from position
```

### Emergency Recovery (No State File)
```
1. List SESSION_LOGS/ directory
2. Read latest session log
3. Reconstruct DNA from log
4. Read EXTRACTED/ to verify progress
5. Resume from last known point
```

---

## MAINTENANCE

### Keep DNA Lean
- Maximum 10 keyDecisions (remove obsolete)
- Maximum 10 patternsProven (consolidate similar)
- Maximum 10 patternsFailed (oldest can be removed)
- reconstructionHints should be stable

### DNA Health Check
```
âœ“ lastUpdated within last session
âœ“ essence.position matches actual state
âœ“ criticalPaths are valid
âœ“ No duplicate entries
âœ“ Patterns are still relevant
```

---

## END OF SKILL

**Impact:** 90% context recovery vs ~40% without DNA
**MIT Foundation:** 6.033 state management, 6.824 replication, 6.005 immutability



========================================
SKILL: prism-context-pressure
========================================
---
name: prism-context-pressure
description: |
  Real-time context limit monitoring with auto-protection. Defines GREEN/YELLOW/
  ORANGE/RED pressure zones based on tool calls and conversation depth.
  Never lose work to context limits with automatic checkpoints.

  MIT Foundation: 6.172 (Performance), 6.033 (Fault Tolerance), 2.852 (Queuing)
---

# PRISM Context Pressure Skill
## Real-Time Context Limit Monitoring & Auto-Protection
**MIT Foundation:** 6.172 (Performance), 6.033 (Fault Tolerance), 2.852 (Queuing)

---

## PURPOSE

**Never lose work to context limits.** This skill provides:
- Real-time pressure monitoring
- Automatic checkpoint triggers
- Graceful degradation protocols
- Emergency save procedures

---

## PRESSURE ZONES

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        CONTEXT PRESSURE ZONES                               â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                             â”‚
â”‚  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘  GREEN (0-50%)             â”‚
â”‚  Normal operation. Work freely.                                             â”‚
â”‚                                                                             â”‚
â”‚  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘  YELLOW (50-70%)           â”‚
â”‚  Checkpoint soon. Complete current unit, then save.                         â”‚
â”‚                                                                             â”‚
â”‚  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘â–‘  ORANGE (70-85%)           â”‚
â”‚  Checkpoint NOW. Pause, save immediately.                                   â”‚
â”‚                                                                             â”‚
â”‚  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ  RED (85-100%)            â”‚
â”‚  EMERGENCY STOP. Save everything, generate handoff, no new work.            â”‚
â”‚                                                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## PRESSURE METRICS

### 1. Tool Call Count (Primary Indicator)
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Calls since last save | 0-8 | 9-14 | 15-18 | 19+ |
| Action | None | Plan checkpoint | Save NOW | Emergency stop |

### 2. Conversation Depth
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Exchange count | 0-12 | 13-18 | 19-24 | 25+ |
| Action | None | Aware | Checkpoint | Stop |

### 3. Response Length (Current Response)
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Word count | 0-1500 | 1500-2500 | 2500-3500 | 3500+ |
| Action | None | Wrap up | Truncate | Split |

### 4. Task Complexity
| Metric | Green | Yellow | Orange | Red |
|--------|-------|--------|--------|-----|
| Pending operations | 0-3 | 4-6 | 7-10 | 10+ |
| Action | None | Serialize | Checkpoint | Stop |

---

## COMBINED PRESSURE SCORE

```javascript
function calculatePressure() {
  const scores = {
    toolCalls: toolCallsSinceSave / 20,      // 20 is red threshold
    exchanges: conversationDepth / 25,        // 25 is red threshold
    responseLength: currentWords / 4000,      // 4000 is red threshold
    complexity: pendingOperations / 12        // 12 is red threshold
  };
  
  // Weighted average (tool calls matter most)
  return (scores.toolCalls * 0.4) + 
         (scores.exchanges * 0.25) + 
         (scores.responseLength * 0.2) + 
         (scores.complexity * 0.15);
}

// Zone determination
if (pressure < 0.50) return 'GREEN';
if (pressure < 0.70) return 'YELLOW';
if (pressure < 0.85) return 'ORANGE';
return 'RED';
```

---

## AUTO-ACTIONS BY ZONE

### ðŸŸ¢ GREEN ZONE (< 50%)
```
STATUS: Normal operation
ACTIONS: None required
DISPLAY: No indicator needed
```

### ðŸŸ¡ YELLOW ZONE (50-70%)
```
STATUS: Checkpoint approaching
ACTIONS:
  1. Complete current atomic unit (material, function, file)
  2. Plan checkpoint location
  3. Avoid starting complex multi-step operations

INDICATOR: Add to response end:
"âš¡ Context checkpoint recommended after this task."
```

### ðŸŸ  ORANGE ZONE (70-85%)
```
STATUS: Checkpoint required NOW
ACTIONS:
  1. STOP after current statement
  2. Save any in-progress work immediately
  3. Update CURRENT_STATE.json
  4. Update contextDNA
  5. Brief status to user

INDICATOR:
"âš ï¸ CHECKPOINT: Saving progress before continuing..."
[Execute checkpoint sequence]
"âœ“ Checkpoint saved. Continuing..."
```

### ðŸ”´ RED ZONE (85-100%)
```
STATUS: Emergency stop
ACTIONS:
  1. DO NOT start new work
  2. Complete minimum necessary save
  3. Write emergency handoff
  4. Update state with recovery instructions
  5. Inform user

INDICATOR:
"ðŸ›‘ CONTEXT LIMIT - EMERGENCY SAVE"
[Execute emergency protocol]
[Generate handoff]
"To continue: Read CURRENT_STATE.json, resume from [position]"
```

---

## CHECKPOINT SEQUENCE (ORANGE/RED ZONES)

### Quick Checkpoint (Orange Zone)
```javascript
// 1. Save current work
if (currentFile && unsavedContent) {
  Desktop Commander:write_file({
    path: currentFile,
    content: unsavedContent,
    mode: "append"  // or "rewrite" if new file
  });
}

// 2. Update state
state.checkpoint = {
  timestamp: new Date().toISOString(),
  lastCompleted: "P-CS-035",
  nextToDo: "P-CS-036",
  filesModified: ["carbon_steels_031_040.js"],
  pressure: "ORANGE",
  notes: "Checkpoint triggered at 75% pressure"
};

// 3. Update DNA
state.contextDNA.essence.position = "After P-CS-035, checkpoint before P-CS-036";
state.contextDNA.lastUpdated = new Date().toISOString();

// 4. Write state
Filesystem:write_file({
  path: STATE_PATH,
  content: JSON.stringify(state, null, 2)
});

// 5. Confirm
"âœ“ Checkpoint saved: P-CS-035 complete, ready for P-CS-036"
```

### Emergency Save (Red Zone)
```javascript
// 1. Absolute minimum save
const emergencyState = {
  timestamp: new Date().toISOString(),
  emergency: true,
  lastAction: "Creating P-CS-035",
  position: "Mid-material, approximately line 50",
  unsavedContent: "[Content summary if any]",
  recovery: "Read this file, search for P-CS-035, continue from position"
};

// 2. Write emergency file
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\EMERGENCY_RECOVERY.json",
  content: JSON.stringify(emergencyState, null, 2)
});

// 3. Update main state if possible
state.checkpoint = emergencyState;

// 4. Generate handoff
const handoff = `
ðŸ›‘ EMERGENCY CONTEXT LIMIT REACHED
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Last Action: ${emergencyState.lastAction}
Position: ${emergencyState.position}

TO RECOVER:
1. Read CURRENT_STATE.json
2. Check EMERGENCY_RECOVERY.json
3. Read last file being modified
4. Search for last completed item
5. Continue from there
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
`;
```

---

## PRESSURE TRACKING TEMPLATE

### Add to Response (When Tracking)
```markdown
<!-- PRESSURE CHECK
Tool calls: 12/20
Exchanges: 8/25  
Response: ~1800 words
Zone: YELLOW
Action: Checkpoint after current material
-->
```

### State Tracking Object
```json
{
  "sessionPressure": {
    "toolCallsSinceSave": 12,
    "currentExchange": 8,
    "lastCheckpoint": "2026-01-23T18:00:00Z",
    "currentZone": "YELLOW",
    "nextCheckpointTrigger": "After P-CS-036 or 15 tool calls"
  }
}
```

---

## PRESSURE-AWARE PATTERNS

### Pattern 1: Before Complex Operations
```
BEFORE starting multi-file or multi-step work:
1. Check current pressure
2. If YELLOW+: checkpoint first
3. If GREEN: proceed

Example:
"Before creating 10 materials, let me checkpoint current progress..."
[checkpoint]
"Now proceeding with materials P-CS-031 to P-CS-040"
```

### Pattern 2: Batch Size Adaptation
```
Based on current pressure:
- GREEN: Process 10 items per batch
- YELLOW: Process 5 items per batch
- ORANGE: Process 1 item, then checkpoint
- RED: No new processing
```

### Pattern 3: Response Length Management
```
Based on response length:
- Under 2000 words: Include explanations
- 2000-3000 words: Concise only
- Over 3000 words: Split response, checkpoint between
```

---

## INTEGRATION WITH OTHER SKILLS

| Skill | Integration |
|-------|-------------|
| prism-context-dna | Update DNA at checkpoints |
| prism-state-manager | Trigger state saves |
| prism-session-buffer | Share zone thresholds |
| prism-session-handoff | Generate handoff at RED |
| prism-large-file-writer | Checkpoint between chunks |

---

## QUICK REFERENCE

### Zone Actions
| Zone | Tool Calls | Exchanges | Action |
|------|------------|-----------|--------|
| ðŸŸ¢ GREEN | 0-8 | 0-12 | Work normally |
| ðŸŸ¡ YELLOW | 9-14 | 13-18 | Plan checkpoint |
| ðŸŸ  ORANGE | 15-18 | 19-24 | Save NOW |
| ðŸ”´ RED | 19+ | 25+ | STOP, emergency save |

### Checkpoint Triggers
- 10+ tool calls without save
- Starting complex multi-step operation
- Before any destructive operation
- When explicitly requested
- At 70%+ pressure

### Emergency Triggers
- 18+ tool calls without save
- Response approaching 4000 words
- Multiple warning signs combined
- Compaction warning received

---

## END OF SKILL

**Impact:** Zero work loss from context limits
**MIT Foundation:** 6.172 monitoring, 6.033 fault tolerance, 2.852 queue management



========================================
SKILL: prism-debugging
========================================
---
name: prism-debugging
description: |
  Systematic debugging skill adapted from obra/superpowers for PRISM troubleshooting.
  Use when: module extraction fails, calculations produce wrong results, wiring
  doesn't connect, or any unexpected behavior occurs. Enforces methodical diagnosis
  over random trial-and-error. Triggers: extraction failure, calculation errors,
  wiring issues, unexpected behavior, validation failures.
---

# PRISM DEBUGGING SKILL v1.0
## Systematic Debugging for Manufacturing Intelligence
### Adapted from obra/superpowers for PRISM troubleshooting

---

## CORE PRINCIPLE

**DIAGNOSE BEFORE YOU FIX.**

Never make random changes hoping they'll work. Instead:
1. Understand the symptom completely
2. Form a hypothesis about the cause
3. Test the hypothesis
4. Apply targeted fix
5. Verify the fix didn't break anything else

---

## ðŸ” DEBUGGING PROTOCOL

### Phase 1: OBSERVE
```markdown
## 1. DOCUMENT THE SYMPTOM
- What exactly is happening?
- What should be happening instead?
- When did it start failing?
- What was the last successful state?

## 2. GATHER EVIDENCE
- Error messages (exact text)
- Stack traces
- Input values
- Output values
- State file contents
- Related file contents
```

### Phase 2: HYPOTHESIZE
```markdown
## 3. FORM HYPOTHESES
List ALL possible causes (don't stop at the first one):

| # | Hypothesis | Probability | Evidence For | Evidence Against |
|---|-----------|-------------|--------------|------------------|
| 1 |           |             |              |                  |
| 2 |           |             |              |                  |
| 3 |           |             |              |                  |

## 4. RANK BY LIKELIHOOD
Consider:
- What changed recently?
- What's the simplest explanation?
- What has failed before?
```

### Phase 3: TEST
```markdown
## 5. TEST MOST LIKELY HYPOTHESIS
- Design a test that proves/disproves hypothesis
- Execute test
- Record results
- If disproved, move to next hypothesis

## 6. ISOLATE THE PROBLEM
- Minimum reproduction case
- Remove unrelated complexity
- Pinpoint exact location
```

### Phase 4: FIX
```markdown
## 7. APPLY TARGETED FIX
- Change ONLY what's needed
- Don't "clean up" unrelated code
- Document what you changed

## 8. VERIFY FIX
- Does original symptom disappear?
- Do all related tests pass?
- No new symptoms introduced?
```

### Phase 5: PREVENT
```markdown
## 9. ROOT CAUSE ANALYSIS
- Why did this happen?
- How can we prevent recurrence?
- Should we add a test?

## 10. UPDATE DOCUMENTATION
- Add to known issues if recurring
- Update relevant skill files
- Share learnings
```

---

## PRISM-SPECIFIC DEBUG SCENARIOS

### Extraction Failure

```markdown
SYMPTOM: Module not extracting correctly

CHECKLIST:
â˜ Is the source file accessible?
â˜ Are we searching for the right module name?
â˜ Is the line number range correct?
â˜ Are there multiple definitions of the same module?
â˜ Is the regex pattern matching correctly?
â˜ Is the output path writable?

COMMON CAUSES:
1. Module name variation (PRISM_X vs PRISM_X_V2)
2. Module split across non-contiguous lines
3. Unicode/encoding issues in source
4. Write permission to output directory
5. Disk space full
```

### Calculation Error

```markdown
SYMPTOM: Physics/math calculation producing wrong results

CHECKLIST:
â˜ Are input values correct?
â˜ Are units consistent?
â˜ Is the formula implemented correctly?
â˜ Are there division-by-zero possibilities?
â˜ Are there overflow/underflow issues?
â˜ Are database lookups returning expected values?

DEBUG APPROACH:
1. Log intermediate values at each step
2. Compare with hand calculation
3. Check edge cases (zero, negative, very large)
4. Verify database values being used
5. Check unit conversions
```

### Wiring/Connection Issue

```markdown
SYMPTOM: Consumer not receiving data from database

CHECKLIST:
â˜ Is the database registered with Gateway?
â˜ Is the consumer registered with Gateway?
â˜ Is the route defined correctly?
â˜ Are the data field names matching?
â˜ Is the event bus connected?
â˜ Are there any error handlers swallowing errors?

DEBUG APPROACH:
1. Trace data flow step by step
2. Add logging at each junction
3. Verify Gateway route table
4. Check event bus subscriptions
5. Test with minimal consumer
```

### Validation Failure

```markdown
SYMPTOM: Material/module failing validation

CHECKLIST:
â˜ Which specific validation is failing?
â˜ What value is causing the failure?
â˜ Is the validation rule correct?
â˜ Is the data correctly formatted?
â˜ Are there type mismatches?

DEBUG APPROACH:
1. Get exact validation error message
2. Inspect the failing value
3. Check validation rule definition
4. Compare with passing example
5. Test rule with known-good data
```

---

## DEBUG TOOLS & TECHNIQUES

### Logging Strategy

```javascript
// Structured logging for debugging
function debugLog(context, message, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${context}] ${message}`, data);
}

// Usage
debugLog('EXTRACTION', 'Starting module extraction', { moduleName, lineStart });
debugLog('CALCULATION', 'Force calculation', { input, output, intermediate });
debugLog('WIRING', 'Consumer registration', { consumer, database, route });
```

### Assertion Pattern

```javascript
// Fail fast with clear messages
function assertValid(condition, message, context) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}\nContext: ${JSON.stringify(context)}`);
  }
}

// Usage
assertValid(material.kc1_1 > 0, 'kc1_1 must be positive', { material: material.id });
assertValid(consumers.length >= 6, 'Minimum 6 consumers required', { count: consumers.length });
```

### Binary Search Isolation

```markdown
When problem is in large code/data:

1. Divide the suspect area in half
2. Test each half independently
3. Problem is in the failing half
4. Repeat until isolated to smallest unit

Example for extraction:
- Extract first half of module
- Does it work? Yes â†’ problem in second half
- Does it work? No â†’ problem in first half
- Continue halving until exact line found
```

### Diff Analysis

```markdown
When something stopped working:

1. Find last known-good state
2. Compare current state to known-good
3. Identify all differences
4. Evaluate which differences could cause symptom
5. Test reverting suspicious differences
```

---

## DEBUG DOCUMENTATION TEMPLATE

```markdown
## DEBUG SESSION: [ID]

### SYMPTOM
[Exact description of what's wrong]

### EXPECTED BEHAVIOR
[What should happen instead]

### EVIDENCE
- Error: [error message]
- Input: [input values]
- Output: [output values]
- State: [relevant state]

### HYPOTHESES
1. [Most likely cause] - TESTED âœ“/âœ—
2. [Second possibility] - TESTED âœ“/âœ—
3. [Third possibility] - NOT TESTED

### ROOT CAUSE
[What actually caused the problem]

### FIX APPLIED
[What was changed]

### VERIFICATION
- [x] Original symptom resolved
- [x] No new issues introduced
- [x] Related tests pass

### PREVENTION
[How to prevent recurrence]
```

---

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Making random changes hoping something works
âŒ Changing multiple things at once
âŒ Not understanding the symptom before fixing
âŒ Assuming you know the cause without testing
âŒ Ignoring error messages
âŒ "Fixing" things that aren't broken
âŒ Not verifying the fix
âŒ Not documenting the solution

---

## WHEN TO ESCALATE

Sometimes the problem is beyond what can be debugged in session:

```markdown
ESCALATE IF:
- Problem persists after 3 hypothesis tests
- Root cause appears to be in unfamiliar code
- Fix would require major architectural change
- Problem might be in tool/environment

ESCALATION STEPS:
1. Document everything discovered so far
2. Save current state
3. Create detailed bug report
4. Mark as blocker in CURRENT_STATE.json
5. Move to different task
```

---

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Include debug time in estimates
- **prism-tdd**: Tests help isolate bugs
- **prism-verification**: Verification catches bugs early
- **prism-auditor**: Audit prevents bugs in extraction

---

**END OF PRISM DEBUGGING SKILL**



========================================
SKILL: prism-dependency-graph
========================================
---
name: prism-dependency-graph
description: |
  Pre-mapped module relationships from monolith analysis. Databaseâ†’consumer and
  engineâ†’consumer mappings for 100% utilization. Reduces wiring time by 50%.
  Includes PRISM_MATERIALS_MASTER (15 consumers), PRISM_MACHINES_DATABASE (12), etc.
---

# PRISM Dependency Graph Skill
## Pre-Mapped Module Relationships from Monolith Analysis
**Time Savings: 50% wiring time reduction**

---

## PURPOSE
Pre-mapped databaseâ†’consumer and engineâ†’consumer relationships to accelerate Stage 3 migration with 100% utilization.

---

## CORE INFRASTRUCTURE DEPENDENCIES

### PRISM_GATEWAY (Central Router)
**Line:** ~11,888 | **Consumers:** ALL MODULES
```
PRODUCES:
  - Route resolution for all data requests
  - Unified API interface
  - Request/response transformation

CONSUMED BY:
  - Every database (for data routing)
  - Every engine (for inter-module communication)
  - Every UI component (for data fetching)
  - Every learning module (for feedback routing)

TOTAL CONSUMERS: 500+ routes
```

### PRISM_CONSTANTS
**Consumers:** ~50+ modules
```
CONSUMED BY:
  - PRISM_UNITS (unit definitions)
  - PRISM_VALIDATOR (validation rules)
  - All calculation engines (physical constants)
  - All databases (default values)
  - UI components (display constants)
```

### PRISM_UNITS / PRISM_UNITS_ENHANCED
**Consumers:** ~30+ modules
```
CONSUMED BY:
  - All force calculation engines
  - All thermal engines
  - All speed/feed calculators
  - Post processor generators
  - Report generators
  - UI display components
```

---

## DATABASE DEPENDENCIES

### PRISM_MATERIALS_MASTER (618 materials)
**Line:** ~611,225 | **Min Consumers:** 15
```
FIELDS PRODUCED:
  - base_speed, machinability, hardness
  - kc1_1, mc, yield_strength
  - conductivity, specific_heat, melting_point
  - taylor_n, taylor_C, abrasiveness
  - elasticity, built_up_edge_tendency
  - damping_ratio, elastic_modulus
  - strain_hardening, chip_type
  - reactivity, coolant_compatibility
  - chemical_affinity, temperature_limit
  - material_cost, density, ALL fields

CONSUMED BY:
  â”œâ”€â”€ PRISM_SPEED_FEED_CALCULATOR
  â”‚     uses: base_speed, machinability, hardness, kc1_1
  â”‚
  â”œâ”€â”€ PRISM_FORCE_CALCULATOR
  â”‚     uses: kc1_1, mc, yield_strength, hardness
  â”‚
  â”œâ”€â”€ PRISM_THERMAL_ENGINE
  â”‚     uses: conductivity, specific_heat, melting_point, density
  â”‚
  â”œâ”€â”€ PRISM_TOOL_LIFE_ENGINE
  â”‚     uses: taylor_n, taylor_C, abrasiveness, hardness
  â”‚
  â”œâ”€â”€ PRISM_SURFACE_FINISH_ENGINE
  â”‚     uses: elasticity, built_up_edge_tendency, hardness
  â”‚
  â”œâ”€â”€ PRISM_CHATTER_PREDICTION
  â”‚     uses: damping_ratio, elastic_modulus, density
  â”‚
  â”œâ”€â”€ PRISM_CHIP_FORMATION_ENGINE
  â”‚     uses: strain_hardening, chip_type, ductility
  â”‚
  â”œâ”€â”€ PRISM_COOLANT_SELECTOR
  â”‚     uses: reactivity, coolant_compatibility, thermal_conductivity
  â”‚
  â”œâ”€â”€ PRISM_COATING_OPTIMIZER
  â”‚     uses: chemical_affinity, temperature_limit, abrasiveness
  â”‚
  â”œâ”€â”€ PRISM_COST_ESTIMATOR
  â”‚     uses: material_cost, density, machinability
  â”‚
  â”œâ”€â”€ PRISM_CYCLE_TIME_PREDICTOR
  â”‚     uses: ALL cutting parameters
  â”‚
  â”œâ”€â”€ PRISM_QUOTING_ENGINE
  â”‚     uses: material_cost, machinability, density
  â”‚
  â”œâ”€â”€ PRISM_AI_LEARNING_PIPELINE
  â”‚     uses: ALL fields (training data)
  â”‚
  â”œâ”€â”€ PRISM_BAYESIAN_OPTIMIZER
  â”‚     uses: uncertainty parameters, historical data
  â”‚
  â””â”€â”€ PRISM_XAI_ENGINE
        uses: ALL fields (explanation generation)
```

### PRISM_MACHINES_DATABASE (813 machines)
**Min Consumers:** 12
```
FIELDS PRODUCED:
  - rpm_max, feed_max, power, torque
  - work_envelope, axis_limits, kinematics
  - controller, capabilities, options
  - spindle_stiffness, natural_freq
  - rapid_rates, accel_decel
  - hourly_rate, efficiency
  - availability, setup_time

CONSUMED BY:
  â”œâ”€â”€ PRISM_SPEED_FEED_CALCULATOR
  â”‚     uses: rpm_max, feed_max, power
  â”‚
  â”œâ”€â”€ PRISM_COLLISION_ENGINE
  â”‚     uses: work_envelope, axis_limits, kinematics
  â”‚
  â”œâ”€â”€ PRISM_POST_PROCESSOR_GENERATOR
  â”‚     uses: controller, capabilities, options
  â”‚
  â”œâ”€â”€ PRISM_CHATTER_PREDICTION
  â”‚     uses: spindle_stiffness, natural_freq
  â”‚
  â”œâ”€â”€ PRISM_CYCLE_TIME_PREDICTOR
  â”‚     uses: rapid_rates, accel_decel, capabilities
  â”‚
  â”œâ”€â”€ PRISM_COST_ESTIMATOR
  â”‚     uses: hourly_rate, efficiency
  â”‚
  â”œâ”€â”€ PRISM_SCHEDULING_ENGINE
  â”‚     uses: availability, capabilities
  â”‚
  â”œâ”€â”€ PRISM_QUOTING_ENGINE
  â”‚     uses: hourly_rate, setup_time
  â”‚
  â”œâ”€â”€ PRISM_CAPABILITY_MATCHER
  â”‚     uses: ALL capability fields
  â”‚
  â”œâ”€â”€ PRISM_3D_VISUALIZATION
  â”‚     uses: kinematics, geometry
  â”‚
  â”œâ”€â”€ PRISM_AI_LEARNING_PIPELINE
  â”‚     uses: ALL fields
  â”‚
  â””â”€â”€ PRISM_XAI_ENGINE
        uses: ALL fields
```

### PRISM_TOOLS_DATABASE (5000+ tools)
**Min Consumers:** 10
```
FIELDS PRODUCED:
  - geometry, coating, grade
  - rake_angle, edge_radius
  - substrate, expected_life
  - length, diameter, material
  - 3D_model, holder_assembly
  - tool_cost, stock_level
  - cutting_geometry, chip_load

CONSUMED BY:
  â”œâ”€â”€ PRISM_SPEED_FEED_CALCULATOR
  â”‚     uses: geometry, coating, grade
  â”‚
  â”œâ”€â”€ PRISM_FORCE_CALCULATOR
  â”‚     uses: rake_angle, edge_radius
  â”‚
  â”œâ”€â”€ PRISM_TOOL_LIFE_ENGINE
  â”‚     uses: substrate, coating, geometry
  â”‚
  â”œâ”€â”€ PRISM_DEFLECTION_ENGINE
  â”‚     uses: length, diameter, material
  â”‚
  â”œâ”€â”€ PRISM_COLLISION_ENGINE
  â”‚     uses: 3D_model, holder_assembly
  â”‚
  â”œâ”€â”€ PRISM_COST_ESTIMATOR
  â”‚     uses: tool_cost, expected_life
  â”‚
  â”œâ”€â”€ PRISM_INVENTORY_ENGINE
  â”‚     uses: stock_level, reorder_point
  â”‚
  â”œâ”€â”€ PRISM_TOOLPATH_ENGINE
  â”‚     uses: cutting_geometry, chip_load
  â”‚
  â”œâ”€â”€ PRISM_AI_LEARNING_PIPELINE
  â”‚     uses: ALL fields
  â”‚
  â””â”€â”€ PRISM_XAI_ENGINE
        uses: ALL fields
```

---

## ENGINE DEPENDENCIES

### PRISM_KIENZLE_FORCE Engine
```
INPUTS REQUIRED:
  - From PRISM_MATERIALS_MASTER: Kc11, mc, correction_factors
  - From PRISM_TOOLS_DATABASE: rake_angle, edge_radius
  - From User Input: depth_of_cut, feed, cutting_speed

OUTPUTS TO:
  â”œâ”€â”€ PRISM_POWER_CALCULATOR (cutting force)
  â”œâ”€â”€ PRISM_TOOL_LIFE_ENGINE (force impact)
  â”œâ”€â”€ PRISM_CHATTER_PREDICTION (force excitation)
  â”œâ”€â”€ PRISM_DEFLECTION_ENGINE (force loading)
  â”œâ”€â”€ PRISM_THERMAL_ENGINE (heat generation)
  â””â”€â”€ PRISM_SURFACE_FINISH_ENGINE (force effects)
```

### PRISM_TAYLOR_TOOL_LIFE Engine
```
INPUTS REQUIRED:
  - From PRISM_MATERIALS_MASTER: taylor_C, taylor_n per tool type
  - From PRISM_TOOLS_DATABASE: tool_type, coating, grade
  - From Process: cutting_speed, feed, depth

OUTPUTS TO:
  â”œâ”€â”€ PRISM_COST_ESTIMATOR (tool cost/part)
  â”œâ”€â”€ PRISM_CYCLE_TIME_PREDICTOR (tool change time)
  â”œâ”€â”€ PRISM_SCHEDULING_ENGINE (tool availability)
  â”œâ”€â”€ PRISM_INVENTORY_ENGINE (consumption rate)
  â””â”€â”€ PRISM_QUOTING_ENGINE (tooling cost)
```

### PRISM_JOHNSON_COOK Engine
```
INPUTS REQUIRED:
  - From PRISM_MATERIALS_MASTER: A, B, n, C, m parameters
  - From Process: strain, strain_rate, temperature

OUTPUTS TO:
  â”œâ”€â”€ PRISM_CHIP_FORMATION_ENGINE (flow stress)
  â”œâ”€â”€ PRISM_THERMAL_ENGINE (deformation heat)
  â”œâ”€â”€ PRISM_FORCE_CALCULATOR (material resistance)
  â””â”€â”€ PRISM_FEM_ENGINE (constitutive model)
```

### PRISM_CHATTER_PREDICTION Engine
```
INPUTS REQUIRED:
  - From PRISM_MACHINES_DATABASE: spindle_stiffness, natural_freq
  - From PRISM_TOOLS_DATABASE: tool_stiffness, overhang
  - From PRISM_MATERIALS_MASTER: damping, modulus
  - From PRISM_KIENZLE_FORCE: cutting_force

OUTPUTS TO:
  â”œâ”€â”€ PRISM_SPEED_FEED_CALCULATOR (stability limits)
  â”œâ”€â”€ PRISM_TOOLPATH_ENGINE (stable parameters)
  â”œâ”€â”€ PRISM_SURFACE_FINISH_ENGINE (vibration effects)
  â””â”€â”€ PRISM_XAI_ENGINE (stability explanation)
```

---

## AI/ML ENGINE DEPENDENCIES

### PRISM_BAYESIAN_OPTIMIZER
```
INPUTS REQUIRED:
  - From ALL databases: historical data with outcomes
  - From User: objective function, constraints
  - From Process: current parameters, feedback

OUTPUTS TO:
  â”œâ”€â”€ PRISM_SPEED_FEED_CALCULATOR (optimized params)
  â”œâ”€â”€ PRISM_TOOLPATH_ENGINE (path optimization)
  â”œâ”€â”€ PRISM_SCHEDULING_ENGINE (sequence optimization)
  â””â”€â”€ PRISM_LEARNING_PIPELINE (exploration data)
```

### PRISM_NEURAL_NETWORK Engine
```
INPUTS REQUIRED:
  - Training data from PRISM_ML_TRAINING_PATTERNS_DATABASE
  - Features from multiple databases
  - Labels from historical outcomes

OUTPUTS TO:
  â”œâ”€â”€ PRISM_TOOL_LIFE_PREDICTOR (wear prediction)
  â”œâ”€â”€ PRISM_SURFACE_FINISH_PREDICTOR (Ra prediction)
  â”œâ”€â”€ PRISM_CYCLE_TIME_PREDICTOR (time estimation)
  â””â”€â”€ PRISM_ANOMALY_DETECTOR (process monitoring)
```

---

## WIRING VERIFICATION TEMPLATE

For each module migration, verify:

```javascript
// MIGRATION CHECKLIST for [MODULE_NAME]
const migrationChecklist = {
  module: '[MODULE_NAME]',
  
  // 1. INPUT VERIFICATION
  inputs: {
    databases: [
      { name: 'PRISM_XXX', fields: ['field1', 'field2'], verified: false },
      // ... more inputs
    ],
    engines: [
      { name: 'PRISM_YYY', outputs: ['output1'], verified: false },
      // ... more inputs
    ]
  },
  
  // 2. OUTPUT VERIFICATION
  outputs: {
    consumers: [
      { name: 'PRISM_AAA', fields: ['field1'], wired: false },
      { name: 'PRISM_BBB', fields: ['field2'], wired: false },
      // ... minimum 6-8 consumers
    ]
  },
  
  // 3. GATEWAY ROUTES
  routes: [
    { path: '/api/v1/xxx', method: 'GET', registered: false },
    // ... all routes
  ],
  
  // 4. UTILIZATION SCORE
  utilization: {
    inputsWired: 0,
    outputsWired: 0,
    routesRegistered: 0,
    score: 0 // Must be 100%
  }
};
```

---

## QUICK CONSUMER COUNT REQUIREMENTS

| Database Type | Min Consumers | Min Fields Used |
|---------------|---------------|-----------------|
| Materials | 15 | 20+ |
| Machines | 12 | 15+ |
| Tools | 10 | 12+ |
| Workholding | 8 | 8+ |
| Post Processors | 8 | 10+ |
| Controllers | 8 | 10+ |
| Process | 6 | 8+ |
| Business | 6 | 6+ |

| Engine Type | Min Uses | Notes |
|-------------|----------|-------|
| Physics/Force | 8 | Core calculation dependency |
| Thermal | 6 | Temperature effects |
| Tool Life | 8 | Cost and planning |
| Optimization | 10 | Multiple objectives |
| AI/ML | 6 | Learning pipeline |

---

## CRITICAL PATH FOR MIGRATION

```
PHASE 1: Infrastructure (must be first)
  PRISM_CONSTANTS â†’ PRISM_UNITS â†’ PRISM_VALIDATOR â†’ PRISM_GATEWAY

PHASE 2: Core Databases
  PRISM_MATERIALS_MASTER (15 consumers)
  PRISM_MACHINES_DATABASE (12 consumers)
  PRISM_TOOLS_DATABASE (10 consumers)

PHASE 3: Physics Engines
  PRISM_KIENZLE_FORCE â†’ PRISM_TAYLOR â†’ PRISM_JOHNSON_COOK
  â†’ PRISM_THERMAL â†’ PRISM_CHATTER â†’ PRISM_SURFACE_FINISH

PHASE 4: AI/ML Engines
  PRISM_BAYESIAN â†’ PRISM_NEURAL â†’ PRISM_PSO â†’ PRISM_ACO

PHASE 5: Products
  Speed/Feed Calculator (uses 20+ modules)
  Post Processor Generator (uses 15+ modules)
  Quoting Engine (uses 18+ modules)
```

---

## END OF SKILL



========================================
SKILL: prism-derivation-helpers
========================================
---
name: prism-derivation-helpers
description: |
  Helper functions for deriving material properties from base data.
  DEPRECATED - merged into prism-physics-formulas.
  
  Status: DEPRECATED (Use prism-physics-formulas instead)
---

# PRISM Derivation Helpers (DEPRECATED)

> âš ï¸ **DEPRECATED:** This skill has been merged into `prism-physics-formulas`
> Use `prism-physics-formulas` for all property derivations

---

## Migration Guide

### Old Usage (Deprecated)
```javascript
// DON'T USE THIS
const kc = deriveKienzle(material);
const toolLife = deriveTaylor(params);
```

### New Usage (Use This)
```javascript
// USE prism-physics-formulas instead
view("/mnt/skills/user/prism-physics-formulas/SKILL.md")
// Contains all derivation formulas with MIT course foundations
```

---

## Why Deprecated

1. **Consolidation:** All physics derivations now in one skill
2. **MIT Foundation:** prism-physics-formulas includes academic backing
3. **Complete Coverage:** 127 parameters all derivable from one skill

---

## Derivations Now In prism-physics-formulas

| Derivation | Formula Section |
|------------|-----------------|
| Kienzle kc1.1 | Cutting Force Models |
| Taylor tool life | Tool Life Equations |
| Johnson-Cook | Constitutive Models |
| Thermal conductivity | Material Properties |
| Yield strength | Mechanical Properties |

---

## Consumers (Historical)

These modules previously used derivation-helpers:
- PRISM_MATERIALS_MASTER â†’ Now uses physics-formulas
- Material creation workflow â†’ Uses templates + formulas
- PRISM_AI_LEARNING_PIPELINE â†’ Direct formula access

---

**Status:** DEPRECATED | **Replaced By:** prism-physics-formulas | **Version:** 1.0 (Final)



========================================
SKILL: prism-development
========================================
---
name: prism-development
description: |
  PRISM Manufacturing Intelligence v9.0 rebuild development protocols. Claude is the PRIMARY DEVELOPER with full architectural authority. Use this skill when: (1) Working on PRISM extraction, architecture, or migration sessions, (2) Reading/writing to PRISM project files, (3) Managing CURRENT_STATE.json, (4) Extracting modules from the monolith, (5) Building hierarchical database architecture, (6) Enforcing 100% utilization requirements. Source: v8.89.002 (986,621 lines, 831 modules). Target: modular architecture with 100% database/engine utilization.
---

# PRISM Development Skill

## Claude's Role
Claude is the **PRIMARY DEVELOPER** of PRISM Manufacturing Intelligence v9.0 rebuild:
- Lead Software Architect
- Manufacturing domain expert (CNC, CAD/CAM, tooling, physics)
- AI/ML systems integrator  
- Database architect for hierarchical systems

## The 10 Commandments

1. **IF IT EXISTS, USE IT EVERYWHERE** - Every database, engine, algorithm wired to maximum consumers
2. **FUSE THE UNFUSABLE** - Combine concepts from different domains
3. **TRUST BUT VERIFY** - Every calculation validated by physics + empirical + historical
4. **LEARN FROM EVERYTHING** - Every user interaction feeds the learning pipeline
5. **PREDICT WITH UNCERTAINTY** - Every output includes confidence intervals
6. **EXPLAIN EVERYTHING** - Every recommendation has XAI explanation
7. **FAIL GRACEFULLY** - Every operation has fallback
8. **PROTECT EVERYTHING** - All data validated, sanitized, encrypted, backed up
9. **PERFORM ALWAYS** - <2s page load, <500ms calculations
10. **OBSESS OVER USERS** - 3-click rule, smart defaults, instant feedback

## Critical Storage Rules

| Location | Purpose | Persistence |
|----------|---------|-------------|
| `C:\\PRISM\` | PRIMARY WORK | âœ… Persistent |
| `/home/claude/` or container | NEVER USE | âŒ Resets every session |
| Box folder | RESOURCES reference | âœ… Persistent |

## Path Quick Reference

```
LOCAL (Primary):
  Root:      C:\\PRISM\
  State:     [ROOT]\CURRENT_STATE.json
  Extracted: [ROOT]\EXTRACTED\[category]\
  Logs:      [ROOT]\SESSION_LOGS\

BOX (Reference Only):
  Root:      C:\Users\Mark Villanueva\Box\PRISM REBUILD\
  Resources: [BOX]\RESOURCES\
```

## Session Start Protocol (MANDATORY)

1. **Read State File**: `C:\\PRISM\CURRENT_STATE.json`
2. **Verify Folder Access**: List directory to confirm access
3. **Read Latest Session Log** (if exists)
4. **Announce Session Start**:
   ```
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STARTING SESSION [ID]: [NAME]
   Previous: [LAST_SESSION] - [STATUS]
   Focus: [CURRENT_WORK.FOCUS]
   Next Steps: [CURRENT_WORK.NEXTSTEPS]
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ```
5. **Update State**: Set `currentWork.status = "IN_PROGRESS"`

## During Session

- Update state file every 3-5 tool calls
- Save ALL work to LOCAL folder only
- Document progress and decisions
- Never exceed session scope

## Session End Protocol (MANDATORY)

1. **Update CURRENT_STATE.json** completely
2. **Write Session Log** to SESSION_LOGS/
3. **Announce Completion**:
   ```
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPLETING SESSION [ID]
   âœ“ Completed: [LIST]
   âœ“ Files saved: [LIST]
   â†’ Next session: [NEXT_ID] - [DESCRIPTION]
   â†’ State saved to: CURRENT_STATE.json
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ```
4. **Remind About Box Sync**: ðŸ“¦ Consider uploading to Box for backup

## State File Structure

```json
{
  "meta": { "lastUpdated", "lastSessionId", "nextSessionId" },
  "currentWork": { "phase", "focus", "status", "nextSteps", "blockers" },
  "extractionProgress": { /* by category */ },
  "completedSessions": [ /* history */ ],
  "quickResume": { /* recovery instructions */ }
}
```

## Hierarchical Database Layers

```
LAYER 4: LEARNED  - AI/ML-derived optimizations (highest priority)
LAYER 3: USER     - Shop-specific customizations
LAYER 2: ENHANCED - Manufacturer-specific (33 manufacturers complete)
LAYER 1: CORE     - Infrastructure, defaults, validation rules
```

Resolution: LEARNED â†’ USER â†’ ENHANCED â†’ CORE â†’ DEFAULT

## Absolute Requirements

- **NO module without ALL consumers wired**
- **NO calculation with fewer than 6 data sources**
- **NO session without state file update**
- **NO partial extractions**
- **VERIFY before and after EVERY operation**

## Current Stage: EXTRACTION (Stage 1)

Focus: Extract ALL 831 modules from monolith into categorized files

### Module Counts
- Databases: 62
- Engines: 213  
- Knowledge Bases: 14
- Systems & Cores: 31
- Learning Modules: 30
- Business/Quoting: 22
- UI Components: 16
- Lookups: 20
- Manufacturer Catalogs: 44+
- Phase Modules: 46

## Reference Files

For detailed information, read these reference files:

- **[references/extraction-manifest.md](references/extraction-manifest.md)**: Complete list of all 831 modules by category
- **[references/session-templates.md](references/session-templates.md)**: Detailed session templates for extraction and migration
- **[references/data-flow-architecture.md](references/data-flow-architecture.md)**: Databaseâ†’Consumer utilization matrices
- **[references/enforcement-mechanisms.md](references/enforcement-mechanisms.md)**: Utilization verifier code and requirements
- **[references/paths-structure.md](references/paths-structure.md)**: Complete folder structure and path references
- **[references/hierarchical-architecture.md](references/hierarchical-architecture.md)**: Four-layer database design details

## Quick Commands

```javascript
// Read state
view("C:\\PRISM\\CURRENT_STATE.json")

// List extracted modules
view("C:\\PRISM\\EXTRACTED\\")

// Read session log
view("C:\\PRISM\\SESSION_LOGS\\")
```

## Session ID Format

```
STAGE.CATEGORY.NUMBER
â”‚      â”‚        â”‚
â”‚      â”‚        â””â”€â”€ Sequential number
â”‚      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Category (A=DBs, B=Engines, C=KBs, etc.)
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Stage (0=Prep, 1=Extract, 2=Arch, 3=Migrate)
```



========================================
SKILL: prism-error-recovery
========================================
---
name: prism-error-recovery
description: |
  Error recovery protocols for PRISM development. What to do when tools fail, files get corrupted, or operations don't complete. Contains common error patterns and fixes. READ THIS WHEN SOMETHING BREAKS - don't panic or restart unnecessarily.
---

# PRISM Error Recovery

## ðŸ”´ FIRST RULE: DON'T PANIC, DON'T RESTART

When something breaks:
1. **CHECKPOINT** current progress immediately
2. **DIAGNOSE** what actually went wrong
3. **RECOVER** using the patterns below
4. **CONTINUE** from where you were

---

## COMMON ERRORS & FIXES

### Tool Errors

#### "Parent directory does not exist"
```
Error: Parent directory does not exist: C:\...\NEW_FOLDER\file.js
```
**Fix:** Create the directory first
```javascript
Filesystem:create_directory({ path: "C:\\...\\NEW_FOLDER" })
// Then retry your write
```

#### "File not found"
```
Error: ENOENT: no such file or directory
```
**Fix:** Check the path
- Verify spelling (PRISM REBUILD vs PRISM-REBUILD)
- Check for extra/missing backslashes
- Use `Filesystem:list_directory` to verify parent exists

#### "Permission denied"
```
Error: EACCES: permission denied
```
**Fix:** 
- File might be open in another program
- Try closing editors/viewers
- Wait a moment and retry

#### "Search timeout"
```
Search taking too long or no results
```
**Fix:** 
- Use shorter search patterns
- Search smaller directories
- Check if path is correct
- Try `Desktop Commander:get_more_search_results` after starting

---

### State File Issues

#### State file corrupted or invalid JSON
**Symptoms:** JSON parse error when reading CURRENT_STATE.json

**Fix:**
1. Read the file as text to see what's wrong:
```javascript
Filesystem:read_file({ path: "C:\\...\\CURRENT_STATE.json" })
```
2. Look for: missing commas, unclosed brackets, truncated content
3. If recoverable, use `Desktop Commander:edit_block` to fix
4. If not recoverable, check SESSION_LOGS for last known state

#### State file missing
**Fix:**
1. Check if renamed: `Filesystem:list_directory` in root
2. Check SESSION_LOGS for last session info
3. Recreate minimal state structure:
```json
{
  "meta": { "lastUpdated": "NOW", "lastSessionId": "unknown" },
  "currentWork": { "status": "RECOVERING", "focus": "State recovery" }
}
```

---

### Extraction Errors

#### Partial extraction (incomplete module)
**Symptoms:** Module cut off mid-function

**Fix:**
1. Don't delete what you have!
2. Find where extraction stopped
3. Search for module end:
```javascript
Desktop Commander:start_search({
  pattern: "const PRISM_NEXT_MODULE",  // Or end marker
  searchType: "content"
})
```
4. Extract remaining portion and append

#### Module not found in monolith
**Symptoms:** Search returns 0 results

**Fix:**
1. Try alternative patterns:
   - `PRISM_MODULE` vs `PRISM_MODULE_NAME`
   - `const PRISM_` vs `let PRISM_` vs `var PRISM_`
2. Check for typos in module name
3. Search for partial name: `PRISM_MATERIAL` instead of `PRISM_MATERIALS_MASTER`
4. Module might have different naming - check v7.0 documentation

#### Wrong module version extracted
**Symptoms:** Module exists at multiple locations

**Fix:**
1. Search for ALL occurrences
2. Usually want the LATEST version (highest line number)
3. Check version string in module: `version: '3.0.0'`
4. Compare to ensure you have newest

---

### Write/Save Errors

#### Write appears to succeed but file is empty/wrong
**Fix:**
1. Verify with immediate read:
```javascript
Filesystem:read_file({ path: "..." })
```
2. If wrong, don't overwrite - investigate first
3. Check for encoding issues
4. Try writing smaller chunks

#### File truncated during write
**Symptoms:** Large file cut off

**Fix:**
1. For large content (>50KB), write in chunks:
```javascript
// First chunk
Filesystem:write_file({ path: "...", content: part1 })
// Subsequent chunks
Desktop Commander:write_file({ path: "...", content: part2, mode: "append" })
```

---

### Network/Connection Errors

#### Tool call timeout
**Fix:**
1. Wait a moment and retry
2. For long operations, increase timeout:
```javascript
Desktop Commander:start_process({ 
  command: "...", 
  timeout_ms: 60000  // 60 seconds
})
```

#### "Box" or external service unavailable
**Fix:**
1. Box is reference only - work continues locally
2. Note in session log that Box sync is pending
3. Continue with local files

---

## RECOVERY PATTERNS

### Pattern 1: Checkpoint Before Risky Operations
```
Before:
  - Large file writes
  - Multi-step operations
  - Anything that could fail

Do:
  1. Update CURRENT_STATE.json with current progress
  2. Note what you're about to attempt
  3. Then proceed
```

### Pattern 2: Verify After Every Write
```javascript
// Write
Filesystem:write_file({ path: "...", content: "..." })

// Immediately verify
Filesystem:read_file({ path: "...", head: 10 })
// Confirm file starts correctly
```

### Pattern 3: Incremental Extraction
```
Instead of extracting entire module at once:
  1. Extract first 500 lines
  2. Verify it looks correct
  3. Extract next section
  4. Append and verify
  5. Continue until complete
```

### Pattern 4: State File Backup
```
Before making major state changes:
  1. Read current state
  2. Note key values in session log
  3. Then update state
  
If state corrupts, rebuild from session log
```

---

## WHEN TO ASK USER

Ask the user for help when:
- â“ File permissions won't resolve
- â“ Path doesn't exist and you're not sure why
- â“ Multiple conflicting module versions and unclear which to use
- â“ State file is corrupted beyond recovery
- â“ Error you haven't seen before

DON'T restart without asking when:
- âŒ You made a mistake (fix it instead)
- âŒ Tool failed once (retry first)
- âŒ Unsure what went wrong (diagnose first)

---

## RECOVERY CHECKLIST

When something goes wrong:

```
â–¡ 1. STOP - Don't make it worse
â–¡ 2. CHECKPOINT - Save current progress to state file
â–¡ 3. DIAGNOSE - What actually failed? Read error message carefully
â–¡ 4. LOOKUP - Check this skill for known fix
â–¡ 5. FIX - Apply the fix pattern
â–¡ 6. VERIFY - Confirm fix worked
â–¡ 7. CONTINUE - Resume from where you were
â–¡ 8. LOG - Note the issue in session log for future reference
```

---

## EMERGENCY RECOVERY

### If Everything Seems Broken

1. **Breathe** - It's rarely as bad as it seems

2. **List the root directory:**
```javascript
Filesystem:list_directory({ 
  path: "C:\\PRISM\\" 
})
```

3. **Check what exists:**
   - CURRENT_STATE.json?
   - SESSION_LOGS folder?
   - EXTRACTED folder?

4. **Read last session log:**
```javascript
Filesystem:list_directory({ 
  path: "C:\\PRISM\\SESSION_LOGS\\" 
})
// Then read the most recent one
```

5. **Rebuild state from logs** if needed

6. **Ask user** if still stuck

---

## Remember

- **Errors are normal** - They happen during development
- **Most errors are recoverable** - Don't panic
- **Checkpoint frequently** - So recovery is easy
- **Don't restart unnecessarily** - Fix and continue
- **Log issues** - Helps future sessions



========================================
SKILL: prism-expert-cad-expert
========================================
---
name: prism-expert-cad-expert
description: |
  AI Domain Expert for CAD Modeling & Design. Provides feature recognition,
  file format recommendations, DFM analysis, and modeling strategies.
  Covers STEP, IGES, STL formats and feature-based/direct/hybrid modeling.

  MIT Foundation: 2.008 (Design & Manufacturing II), 6.837 (Computer Graphics)
---

# PRISM Expert: CAD Expert
## AI Domain Expert Skill for CAD Modeling & Design

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `cad_expert` |
| **Name** | CAD Expert |
| **Domain** | CAD Modeling & Design |
| **Source** | PRISM_PHASE8_EXPERTS.CADExpert |
| **Lines** | 589777-589866 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Feature Types
```javascript
const featureTypes = [
  'hole',      // Drilled, bored, reamed
  'pocket',    // Open or closed
  'slot',      // Through or blind
  'boss',      // Raised feature
  'fillet',    // Internal radius
  'chamfer',   // Edge break
  'thread',    // Internal or external
  'pattern'    // Linear or circular
];
```

### Supported File Formats
```javascript
const fileFormats = {
  'STEP': { extension: '.stp/.step', interop: 'Excellent' },
  'IGES': { extension: '.igs/.iges', interop: 'Good' },
  'STL':  { extension: '.stl', interop: 'Mesh only' },
  'DXF':  { extension: '.dxf', interop: '2D/3D' },
  'DWG':  { extension: '.dwg', interop: 'AutoCAD native' },
  'SLDPRT': { extension: '.sldprt', interop: 'SolidWorks' },
  'X_T':  { extension: '.x_t', interop: 'Parasolid' },
  'SAT':  { extension: '.sat', interop: 'ACIS' }
};
```

### Modeling Strategies
```javascript
const strategies = [
  'feature_based',     // Parametric features
  'direct_modeling',   // Push-pull operations
  'hybrid',            // Feature + direct
  'surface_modeling'   // Complex forms
];
```

---

## Decision Rules

| Rule | Condition | Recommendation |
|------|-----------|----------------|
| Format Selection | Cross-platform exchange | Use STEP AP214 |
| Feature Recognition | Hole depth/dia > 10:1 | Flag as deep hole |
| DFM Check | Corner radius < 3mm | Warn about tool access |
| Complexity | Feature count > 50 | Suggest simplification |

---

## Analysis Patterns (JavaScript)

### Feature Recognition
```javascript
function recognizeFeatures(geometry) {
    const features = [];
    // Analyze geometry for machinable features
    if (geometry.hasCircularCuts) features.push('hole');
    if (geometry.hasPockets) features.push('pocket');
    if (geometry.hasSlots) features.push('slot');
    return features;
}
```

### Format Recommendation
```javascript
function recommendFormat(requirements) {
    if (requirements.meshOnly) return 'STL';
    if (requirements.parametric) return 'Native CAD';
    if (requirements.interoperability) return 'STEP';
    return 'STEP'; // Default for manufacturing
}
```

### DFM Analysis
```javascript
function analyzeDFM(part) {
    const issues = [];
    // Check for manufacturability issues
    if (part.minCornerRadius < 3) {
        issues.push('Small corner radius - may need EDM');
    }
    if (part.maxDepthRatio > 10) {
        issues.push('Deep feature - special tooling needed');
    }
    return issues;
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_FEATURE_RECOGNITION** - Automatic feature detection
2. **PRISM_DFM_ANALYZER** - Design for Manufacturing checks
3. **PRISM_CAD_IMPORTER** - File format handling
4. **PRISM_TOOLPATH_GENERATOR** - Feature-based toolpaths
5. **PRISM_QUOTING_ENGINE** - Complexity assessment

### Input Requirements
```javascript
{
  problem: {
    partGeometry: { /* CAD data */ },
    targetFormat: 'STEP' | 'STL' | etc,
    dfmRequirements: { tolerances, materials }
  }
}
```

### Output Format
```javascript
{
  expert: 'CAD Expert',
  domain: 'CAD Modeling & Design',
  features: ['hole', 'pocket', 'slot'],
  formatRecommendation: { format: 'STEP', reason: '...' },
  dfmIssues: [...],
  confidence: 0.92
}
```

---

## Quick Consultation

### When to Consult
- Importing customer CAD files
- Feature recognition for CAM
- DFM review before quoting
- File format conversion
- Complex geometry analysis

### Key Questions
1. What features can be automatically recognized?
2. Which file format preserves the most data?
3. Are there any DFM issues with this design?
4. What modeling strategy suits this part best?

---

## MIT Course References
- **2.008** - Design & Manufacturing II
- **2.007** - Design & Manufacturing I
- **6.837** - Computer Graphics
- **2.739** - Product Design & Development



========================================
SKILL: prism-expert-cam-programmer
========================================
---
name: prism-expert-cam-programmer
description: |
  AI Expert for CAM Programming & Toolpath decisions. Covers roughing strategies
  (adaptive, pocketing), finishing strategies (contour, pencil), drilling cycles,
  operation sequencing, tool selection, and cutting parameter calculation.
---

# PRISM Expert: CAM Programmer
## AI Expert for CAM Programming & Toolpath Decisions

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `cam_programmer` |
| **Name** | Senior CAM Programmer |
| **Domain** | CAM Programming & Toolpaths |
| **Confidence** | 1.0 (Expert Level) |
| **Source** | PRISM_PHASE8_EXPERTS (Lines 589868-589996) |

---

## Knowledge Base

### Roughing Strategies
| Strategy | Use Case | Stepover |
|----------|----------|----------|
| `adaptive` | HSM, aluminum, deep pockets | 40% tool diameter |
| `pocketing` | Standard pocket clearing | 40% tool diameter |
| `facing` | Face milling, stock cleanup | 60-70% tool diameter |
| `3d_roughing` | 3D surface roughing | 40% tool diameter |

### Finishing Strategies
| Strategy | Use Case | Stepover |
|----------|----------|----------|
| `contour` | Walls, profiles | 10% tool diameter |
| `pencil` | Corner cleanup | 5-10% tool diameter |
| `parallel` | Flat areas | 10% tool diameter |
| `scallop` | 3D surfaces | Based on scallop height |
| `spiral` | Large flat areas | 10% tool diameter |

### Drilling Strategies
| Strategy | Use Case |
|----------|----------|
| `drill` | Standard holes, shallow |
| `peck` | Deep holes >3xD |
| `bore` | Precision holes |
| `ream` | Finish holes, tight tolerance |
| `tap` | Threaded holes |

---

## Decision Rules

### Rule 1: Rest Machining
**When:** Previous operation exists AND remaining stock detected  
**Then:** Apply rest machining strategy, use smaller tool

```javascript
if (previous_operation && remaining_stock) {
  applyRestMachining();
  useToolSmaller(previousTool.diameter * 0.5);
}
```

### Rule 2: HSM Roughing for Aluminum
**When:** Material is aluminum AND feature is pocket  
**Then:** Use adaptive clearing with high-speed toolpath

```javascript
if (material.isAluminum && feature.type === 'pocket') {
  strategy = 'adaptive_clearing';
  enableHighSpeedToolpath();
}
```

---

## Analysis Patterns

### Operation Sequence Planning
```javascript
function planOperations(features, material) {
  const plan = [];
  const isAluminum = material?.toLowerCase().includes('aluminum');
  
  // 1. Facing first
  plan.push({ op: 'facing', strategy: 'face_milling', priority: 1 });
  
  // 2. Roughing (adaptive for aluminum)
  const roughStrategy = isAluminum ? 'adaptive_clearing' : 'pocket_clearing';
  plan.push({ op: 'roughing', strategy: roughStrategy, priority: 2 });
  
  // 3. Drilling (if holes present)
  const holes = features.filter(f => f.type === 'hole');
  if (holes.length > 0) {
    plan.push({ op: 'drilling', strategy: 'peck_drill', priority: 3, count: holes.length });
  }
  
  // 4. Semi-finish
  plan.push({ op: 'semi_finish', strategy: 'parallel', priority: 4 });
  
  // 5. Finishing
  plan.push({ op: 'finishing', strategy: 'contour', priority: 5 });
  
  return plan;
}
```

### Tool Selection Logic
```javascript
function selectTool(feature) {
  if (feature.type === 'hole') {
    return { type: 'drill', diameter: feature.diameter, material: 'carbide', coating: 'TiAlN' };
  }
  if (feature.type === 'pocket') {
    return { type: 'end_mill', diameter: Math.min(feature.cornerRadius * 2, 12), flutes: 3, material: 'carbide', coating: 'TiAlN' };
  }
  return { type: 'end_mill', diameter: 10, flutes: 4 };
}
```

### Cutting Parameter Calculation
```javascript
const materialFactors = {
  'aluminum': { sfm: 800, fpt: 0.1, doc: 0.5 },
  'steel': { sfm: 300, fpt: 0.05, doc: 0.3 },
  'stainless': { sfm: 150, fpt: 0.03, doc: 0.2 },
  'titanium': { sfm: 100, fpt: 0.02, doc: 0.15 }
};

function calculateParams(material, tool) {
  const factors = materialFactors[material.toLowerCase()] || materialFactors['steel'];
  const rpm = (factors.sfm * 12) / (Math.PI * tool.diameter / 25.4);
  const feedrate = rpm * factors.fpt * (tool.flutes || 4);
  return { rpm: Math.round(rpm), feedrate: Math.round(feedrate), depthOfCut: tool.diameter * factors.doc, stepover: tool.diameter * 0.4 };
}
```

---

## Integration Points

### Uses These PRISM Modules:
- `PRISM_TOOL_DATABASE_V7` - Tool selection
- `PRISM_MATERIALS_MASTER` - Material properties
- `PRISM_ADAPTIVE_CLEARING_ENGINE` - HSM toolpaths
- `PRISM_REST_MACHINING_ENGINE` - Rest detection

### Provides To:
- `PRISM_AUTO_CNC_PROGRAMMER` - Operation sequences
- `PRISM_CYCLE_TIME_ENGINE` - Time estimates
- `PRISM_QUOTING_ENGINE` - CAM time component

---

## Quick Consultation

When making CAM decisions, ask:
1. What material? â†’ Determines strategy and parameters
2. What features? â†’ Determines operation sequence
3. What tolerance? â†’ Determines finishing approach
4. What tools available? â†’ Constrains options
5. What machine? â†’ Determines capabilities

---

**Version:** Created 2026-01-23 | Source: PRISM v8.89.002 Lines 589868-589996



========================================
SKILL: prism-expert-master-machinist
========================================
---
name: prism-expert-master-machinist
description: |
  Master Machinist AI Expert with 40+ years practical machining knowledge. Provides troubleshooting guidance, workholding recommendations, setup optimization, and tool life predictions based on shop floor experience.
---

# PRISM Expert: Master Machinist (40+ Years)
## Practical Machining & Shop Floor Expertise

---

## Expert Profile

```javascript
{
  id: 'master_machinist',
  name: 'Master Machinist (40 years)',
  domain: 'Practical Machining & Shop Floor',
  confidence: 1.0
}
```

---

## Knowledge Base

### Chatter Signs
Indicators that chatter is occurring:
- `surface_pattern` - Visible pattern on machined surface
- `noise` - Unusual sound during cutting
- `tool_wear` - Accelerated or unusual wear patterns
- `vibration` - Excessive machine vibration

### Tool Wear Indicators
Signs that tool needs replacement:
- `surface_finish` - Degrading finish quality
- `dimensional_drift` - Parts going out of tolerance
- `power_increase` - Higher spindle/axis loads
- `sound_change` - Different cutting sound

### Workholding Types
Available workholding options:
- `vise` - Standard for prismatic parts
- `chuck` - Cylindrical parts
- `collet` - Precision cylindrical work
- `fixture` - Custom/production setups
- `vacuum` - Thin/flexible parts
- `magnetic` - Ferrous flat parts

---

## Decision Rules

### Chatter Reduction
**Conditions:** chatter_detected
**Actions:**
1. Reduce speed (RPM -20%)
2. Increase feed rate
3. Change tool (shorter, stiffer)
4. Adjust toolpath (reduce engagement)

### Tool Life Optimization
**Conditions:** excessive_wear, short_life
**Actions:**
1. Reduce cutting speed
2. Check coolant (concentration, flow)
3. Verify runout (<0.0005")

---

## Troubleshooting Guide

### Chatter
| Cause | Solution | Priority |
|-------|----------|----------|
| Speed too high | Reduce RPM by 20% | First |
| Tool overhang | Shorten tool stick-out | Second |
| Weak workholding | Add support | Third |
| Dull tool | Replace tool | Fourth |

**Priority:** Reduce speed first, then check tool

### Poor Surface Finish
| Cause | Solution | Priority |
|-------|----------|----------|
| Dull tool | Fresh cutting edge | First |
| Wrong feeds | Increase feed | Second |
| Chip recutting | Improve chip evacuation | Third |
| Vibration | Check rigidity | Fourth |

**Priority:** Check tool condition first

### Dimensional Error
| Cause | Solution | Priority |
|-------|----------|----------|
| Thermal growth | Allow warmup | First |
| Tool wear | Measure tool wear | Second |
| Wrong offset | Verify offsets | Third |
| Deflection | Reduce forces | Fourth |

**Priority:** Check thermal conditions first

### Tool Breakage
| Cause | Solution | Priority |
|-------|----------|----------|
| Chip load too high | Reduce feed | First |
| Interrupted cut | Ramp entry | Second |
| Wrong tool grade | Use tougher grade | Third |
| Crash | Check program | Fourth |

**Priority:** Review cutting conditions

---

## Workholding Selection

### By Part Shape
| Shape | Primary | Secondary | Notes |
|-------|---------|-----------|-------|
| Prismatic | Vise | Fixture plate | Long parts (>200mm) need more support |
| Cylindrical | Chuck | Collet | Collet for tight tolerance (<0.01mm) |
| Thin wall | Vacuum | Soft jaws | Minimize distortion |

### Decision Logic
```
IF part.shape === 'prismatic':
    â†’ Use vise
    IF part.length > 200mm:
        â†’ Add fixture plate support

IF part.shape === 'cylindrical':
    â†’ Use chuck
    IF part.tolerance < 0.01mm:
        â†’ Use collet for better concentricity

IF part.thinWall:
    â†’ Use vacuum (minimal distortion)
    â†’ Or soft jaws (custom fit)
```

---

## Setup Optimization Tips

### Tool Change Minimization
- Group operations by tool
- Flag warning if >5 tool changes
- Consider combination tools

### Part Flipping
- Minimize number of setups
- Flag warning if >2 sides required
- Consider 5-axis or indexing

### General Setup Checklist
1. âœ“ Touch off all tools before starting
2. âœ“ Verify workholding torque
3. âœ“ Check coolant concentration
4. âœ“ Verify work offset
5. âœ“ Run first part with feed hold ready

---

## Tool Life Prediction

### Taylor Tool Life Equation
```
VT^n = C

Where:
V = Cutting speed (SFM)
T = Tool life (minutes)
n = Material exponent
C = Material constant
```

### Material Constants
| Material | C | n | Notes |
|----------|---|---|-------|
| Steel | 200 | 0.25 | General purpose |
| Aluminum | 400 | 0.35 | High speed possible |
| Stainless | 120 | 0.20 | Work hardening issues |
| Titanium | 80 | 0.15 | Special tooling required |

### Life Calculation
```javascript
lifeMinutes = Math.pow(C / V, 1 / n)
partsPerTool = lifeMinutes / cycleTime

IF lifeMinutes < 30:
    â†’ "Consider reducing speed"
ELSE:
    â†’ "Good tool life expected"
```

---

## Integration Points

### PRISM Modules Used
- `PRISM_CHATTER_PREDICTION_ENGINE` - Stability analysis
- `PRISM_TOOL_LIFE_ENGINE` - Taylor equation calculations
- `PRISM_WORKHOLDING_DATABASE` - Workholding selection
- `PRISM_SURFACE_FINISH_ENGINE` - Finish prediction

### Gateway Routes
- `POST /api/expert/machinist/troubleshoot`
- `POST /api/expert/machinist/workholding`
- `POST /api/expert/machinist/setup-tips`
- `POST /api/expert/machinist/tool-life`

---

## Usage Examples

### Troubleshooting Request
```javascript
masterMachinist.analyze({
  issue: 'chatter'
})
// Returns causes, solutions, priority
```

### Workholding Selection
```javascript
masterMachinist.analyze({
  part: {
    shape: 'prismatic',
    length: 250,
    tolerance: 0.05
  }
})
// Returns: vise + fixture plate recommendation
```

### Tool Life Prediction
```javascript
masterMachinist.analyze({
  tool: { type: 'end_mill' },
  material: 'steel',
  conditions: { sfm: 300, cycleTime: 5 }
})
// Returns estimated life in minutes and parts per tool
```

---

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.MasterMachinist
- **Monolith Lines:** 589998-590132
- **Extracted:** January 2026

---

*Master Machinist Expert - 40+ years of practical shop floor knowledge*



========================================
SKILL: prism-expert-materials-scientist
========================================
---
name: prism-expert-materials-scientist
description: |
  Materials Scientist AI Expert (Dr. level) specializing in metallurgy, material selection, heat treatment recommendations, and machinability assessment. Covers steel grades, aluminum alloys, and specialty materials.
---

# PRISM Expert: Dr. Materials Scientist
## Materials Science & Metallurgy Expertise

---

## Expert Profile

```javascript
{
  id: 'materials_scientist',
  name: 'Dr. Materials Scientist',
  domain: 'Materials Science & Metallurgy',
  confidence: 1.0
}
```

---

## Knowledge Base

### Steel Grades Database

| Grade | Carbon % | Alloying | Tensile (MPa) | Yield (MPa) | Hardness (HB) |
|-------|----------|----------|---------------|-------------|---------------|
| 1018 | 0.18 | - | 440 | 370 | 126 |
| 1045 | 0.45 | - | 585 | 450 | 170 |
| 4140 | 0.40 | 1.0% Cr, 0.2% Mo | 655 | 415 | 197 |
| 4340 | 0.40 | 1.8% Ni, 0.8% Cr, 0.25% Mo | 745 | 470 | 217 |

### Steel Grade Details

#### 1018 Low Carbon Steel
- **Composition:** 0.18% C
- **Properties:** Tensile 440 MPa, Yield 370 MPa, 126 HB
- **Applications:** General purpose, case hardening
- **Machinability:** Excellent (baseline 100)

#### 1045 Medium Carbon Steel
- **Composition:** 0.45% C
- **Properties:** Tensile 585 MPa, Yield 450 MPa, 170 HB
- **Applications:** Shafts, gears, bolts
- **Machinability:** Good (65)

#### 4140 Chromoly Steel
- **Composition:** 0.40% C, 1.0% Cr, 0.2% Mo
- **Properties:** Tensile 655 MPa, Yield 415 MPa, 197 HB
- **Applications:** High-stress components, tooling
- **Machinability:** Fair (55) - needs carbide

#### 4340 Nickel-Chromium-Moly Steel
- **Composition:** 0.40% C, 1.8% Ni, 0.8% Cr, 0.25% Mo
- **Properties:** Tensile 745 MPa, Yield 470 MPa, 217 HB
- **Applications:** Aircraft components, high-strength parts
- **Machinability:** Fair (45) - slower speeds

---

### Aluminum Alloys Database

| Alloy | Tensile (MPa) | Yield (MPa) | Hardness (HB) | Density (g/cmÂ³) |
|-------|---------------|-------------|---------------|-----------------|
| 6061-T6 | 310 | 276 | 95 | 2.70 |
| 7075-T6 | 572 | 503 | 150 | 2.81 |
| 2024-T3 | 483 | 345 | 120 | 2.78 |

### Aluminum Alloy Details

#### 6061-T6 (General Purpose)
- **Properties:** Tensile 310 MPa, Yield 276 MPa, 95 HB
- **Density:** 2.70 g/cmÂ³
- **Applications:** Structural, marine, general purpose
- **Machinability:** Excellent (120)
- **Weldability:** Good

#### 7075-T6 (Aircraft Aluminum)
- **Properties:** Tensile 572 MPa, Yield 503 MPa, 150 HB
- **Density:** 2.81 g/cmÂ³
- **Applications:** Aircraft, high-strength structural
- **Machinability:** Very good (90)
- **Weldability:** Poor (not recommended)

#### 2024-T3 (Aircraft Sheet)
- **Properties:** Tensile 483 MPa, Yield 345 MPa, 120 HB
- **Density:** 2.78 g/cmÂ³
- **Applications:** Aircraft structures, fatigue-critical
- **Machinability:** Very good (90)
- **Weldability:** Poor

---

### Heat Treatment Processes

| Process | Description | Application |
|---------|-------------|-------------|
| Annealing | Soften, relieve stress | Pre-machining preparation |
| Normalizing | Refine grain structure | Improve toughness |
| Hardening | Increase hardness | Wear resistance |
| Tempering | Reduce brittleness | After hardening |
| Case Hardening | Surface hardness | Wear surfaces |
| Nitriding | Surface hardening | Precision parts |

---

## Material Selection Logic

### By Requirements
```javascript
IF requirements.strength === 'high' && requirements.weight === 'low':
    â†’ 7075-T6 Aluminum (High strength-to-weight ratio)
    â†’ Ti-6Al-4V (Excellent strength, low density)

IF requirements.hardness === 'high' && requirements.wear === 'resistant':
    â†’ 4340 Steel heat treated (High hardness and toughness)
    â†’ D2 Tool Steel (Excellent wear resistance)

IF requirements.corrosion === 'resistant':
    â†’ 316 Stainless Steel (Excellent corrosion resistance)

IF requirements.cost === 'low':
    â†’ 1018 Steel (Low cost, good machinability)

DEFAULT:
    â†’ 6061-T6 Aluminum (Good general purpose material)
```

### Selection Matrix
| Requirement | Primary Choice | Secondary Choice |
|-------------|----------------|------------------|
| High strength + Light | 7075-T6 | Ti-6Al-4V |
| High hardness + Wear | 4340 HT | D2 Tool Steel |
| Corrosion resistance | 316 SS | 6061-T6 |
| Low cost | 1018 | 1045 |
| General purpose | 6061-T6 | 1018 |

---

## Heat Treatment Recommendations

### Hardening Process (Steel)
For target hardness >50 HRC:

```
PROCESS: Harden and Temper

STEPS:
1. Austenitize at 845Â°C (1550Â°F)
2. Oil quench
3. Temper at ~200Â°C (~400Â°F) for 50+ HRC

EXPECTED RESULT: 50-55 HRC
```

### Heat Treatment Decision Logic
```javascript
IF material.type === 'steel':
    IF targetHardness > 50:
        â†’ Harden and Temper process
        â†’ Austenitize at 845Â°C
        â†’ Oil quench
        â†’ Temper at ~200Â°C for target HRC
    ELSE IF targetHardness > 30:
        â†’ Normalize and Temper
    ELSE:
        â†’ Anneal for best machinability
ELSE:
    â†’ Consult heat treatment specialist
```

---

## Machinability Ratings

### Rating Scale (1018 = 100 Baseline)

| Material | Rating | Description | Notes |
|----------|--------|-------------|-------|
| 6061 Aluminum | 120 | Excellent | High speeds, excellent finish |
| 1018 Steel | 100 | Excellent | Baseline reference |
| 7075 Aluminum | 90 | Very good | Watch for galling |
| 1045 Steel | 65 | Good | Moderate speeds |
| 4140 Steel | 55 | Fair | Needs carbide tooling |
| 4340 Steel | 45 | Fair | Slower speeds required |
| Stainless Steel | 40 | Poor | Work hardening issues |
| Titanium | 20 | Difficult | Special tooling required |

### Machinability Assessment Logic
```javascript
FOR material IN [1018, 1045, 4140, 4340, stainless, titanium, 6061, 7075]:
    IF material.toLowerCase().includes(key):
        RETURN { rating, description }

DEFAULT:
    RETURN { rating: 50, description: 'Unknown - use conservative parameters' }
```

---

## Properties Lookup

### Steel Lookup
```javascript
material = "4140"
â†’ Returns: {
    C: 0.40,
    Cr: 1.0,
    Mo: 0.2,
    tensile: 655,
    yield: 415,
    hardness: 197,
    type: 'steel',
    grade: '4140'
  }
```

### Aluminum Lookup
```javascript
material = "7075"
â†’ Returns: {
    tensile: 572,
    yield: 503,
    hardness: 150,
    density: 2.81,
    type: 'aluminum',
    grade: '7075-T6'
  }
```

---

## Integration Points

### PRISM Modules Used
- `PRISM_MATERIALS_MASTER` - Master material database (618+ materials)
- `PRISM_MATERIAL_KC_DATABASE` - Kienzle cutting coefficients
- `PRISM_JOHNSON_COOK_DATABASE` - Constitutive model parameters
- `PRISM_ENHANCED_MATERIAL_DATABASE` - Extended properties

### Gateway Routes
- `POST /api/expert/materials/select`
- `POST /api/expert/materials/properties`
- `POST /api/expert/materials/heat-treatment`
- `POST /api/expert/materials/machinability`

---

## Usage Examples

### Material Selection
```javascript
materialsScientist.analyze({
  requirements: {
    strength: 'high',
    weight: 'low',
    corrosion: 'resistant'
  }
})
// Returns: candidates with materials and reasons
```

### Properties Lookup
```javascript
materialsScientist.analyze({
  material: '4140'
})
// Returns: full material properties
```

### Heat Treatment Advice
```javascript
materialsScientist.analyze({
  material: '4340 steel',
  targetHardness: 55
})
// Returns: heat treatment process and steps
```

### Machinability Assessment
```javascript
materialsScientist.analyze({
  material: 'titanium'
})
// Returns: { rating: 20, description: 'Difficult - special tooling' }
```

---

## Quick Reference Tables

### Strength Comparison (MPa)
```
Titanium Ti-6Al-4V:  ~1000
4340 Steel:           745
4140 Steel:           655
7075-T6 Aluminum:     572
1045 Steel:           585
2024-T3 Aluminum:     483
1018 Steel:           440
6061-T6 Aluminum:     310
```

### Density Comparison (g/cmÂ³)
```
Steel (all grades):   7.85
Titanium:             4.43
7075 Aluminum:        2.81
2024 Aluminum:        2.78
6061 Aluminum:        2.70
```

---

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.MaterialsScientist
- **Monolith Lines:** 590504-590624
- **Extracted:** January 2026

---

*Materials Scientist Expert - Metallurgy, selection, and heat treatment guidance*



========================================
SKILL: prism-expert-mathematics
========================================
---
name: prism-expert-mathematics
description: |
  AI Domain Expert for Applied Mathematics & Computation. Provides matrix operations,
  numerical methods, interpolation, root finding, integration, and statistical analysis.
  Covers condition numbers, pivoting strategies, and spline methods.
---

# PRISM Expert: Mathematics Savant
## AI Domain Expert Skill for Applied Mathematics & Computation

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `math_savant` |
| **Name** | Mathematics Savant |
| **Domain** | Applied Mathematics & Computation |
| **Source** | PRISM_PHASE8_EXPERTS.MathematicsSavant |
| **Lines** | 590369-590502 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Matrix Operations
- Determinant calculation (recursive cofactor expansion)
- Matrix inverse (Gaussian elimination with augmented matrix)
- Eigenvalues (Power iteration for dominant eigenvalue)

### Numerical Methods
- Integration (Simpson's rule, n=1000 intervals)
- Curve fitting (Linear regression with RÂ² calculation)
- Optimization (Gradient descent, lr=0.01, 1000 iterations)

---

## Analysis Patterns (JavaScript)

### Determinant (Recursive)
```javascript
function determinant(matrix) {
    const n = matrix.length;
    if (n === 1) return matrix[0][0];
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];

    let det = 0;
    for (let j = 0; j < n; j++) {
        const minor = matrix.slice(1).map(row => 
            [...row.slice(0, j), ...row.slice(j + 1)]
        );
        det += Math.pow(-1, j) * matrix[0][j] * determinant(minor);
    }
    return det;
}
```

### Matrix Inverse (Gaussian Elimination)
```javascript
function matrixInverse(matrix) {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => 
        [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]
    );

    for (let i = 0; i < n; i++) {
        let pivot = augmented[i][i];
        if (Math.abs(pivot) < 1e-10) return null; // Singular

        for (let j = 0; j < 2 * n; j++) augmented[i][j] /= pivot;

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = augmented[k][i];
                for (let j = 0; j < 2 * n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
    }
    return augmented.map(row => row.slice(n));
}
```

### Eigenvalues (Power Iteration)
```javascript
function eigenvalues(matrix) {
    const n = matrix.length;
    let v = Array(n).fill(1);

    for (let iter = 0; iter < 100; iter++) {
        const Av = matrix.map(row => 
            row.reduce((s, val, j) => s + val * v[j], 0)
        );
        const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
        v = Av.map(x => x / norm);
    }
    
    const Av = matrix.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
    const lambda = Av.reduce((s, x, i) => s + x * v[i], 0);

    return { dominant: lambda.toFixed(6), vector: v.map(x => x.toFixed(4)) };
}
```

### Numerical Integration (Simpson's Rule)
```javascript
function integrate(fn, a, b) {
    const n = 1000;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);

    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += (i % 2 === 0 ? 2 : 4) * fn(x);
    }
    return (h / 3 * sum).toFixed(6);
}
```

### Linear Regression with RÂ²
```javascript
function curveFit(points) {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    const ssTotal = points.reduce((s, p) => s + Math.pow(p.y - yMean, 2), 0);
    const ssRes = points.reduce((s, p) => 
        s + Math.pow(p.y - (slope * p.x + intercept), 2), 0
    );
    const r2 = 1 - ssRes / ssTotal;

    return { slope: slope.toFixed(4), intercept: intercept.toFixed(4), r2: r2.toFixed(4) };
}
```

### Gradient Descent Optimization
```javascript
function optimize(objective) {
    let x = objective.initial || [0, 0];
    const lr = 0.01;

    for (let iter = 0; iter < 1000; iter++) {
        const grad = objective.gradient(x);
        x = x.map((xi, i) => xi - lr * grad[i]);
    }
    return { optimum: x.map(v => v.toFixed(4)), value: objective.fn(x).toFixed(4) };
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_OPTIMIZATION_ENGINE** - Multi-variable optimization
2. **PRISM_REGRESSION_ANALYZER** - Data fitting and prediction
3. **PRISM_STABILITY_LOBES** - Eigenvalue calculation for chatter
4. **PRISM_KINEMATICS_SOLVER** - Transformation matrices
5. **PRISM_MONTE_CARLO** - Numerical integration

### Input Requirements
```javascript
{
  problem: {
    matrix: [[values]],           // For matrix operations
    operation: 'inverse' | 'determinant' | 'eigenvalues',
    function: fn,                 // For integration
    bounds: { a, b },
    points: [{ x, y }],           // For curve fitting
    objective: { fn, gradient }   // For optimization
  }
}
```

---

## Quick Consultation

### When to Consult
- Solving system of equations
- Fitting empirical data
- Numerical optimization problems
- Stability analysis (eigenvalues)
- Area/volume calculations

---

## MIT Course References
- **18.06** - Linear Algebra
- **18.03** - Differential Equations
- **6.046J** - Introduction to Algorithms
- **18.085** - Computational Science & Engineering



========================================
SKILL: prism-expert-mechanical-engineer
========================================
---
name: prism-expert-mechanical-engineer
description: |
  AI Domain Expert for Mechanical Design & Analysis. Provides stress analysis,
  deflection calculations, factor of safety assessment, and material strength
  evaluation. Covers beam theory, fatigue analysis, and structural mechanics.
---

# PRISM Expert: Mechanical Engineer
## AI Domain Expert Skill for Mechanical Design & Analysis

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `mechanical_engineer` |
| **Name** | Mechanical Engineer |
| **Domain** | Mechanical Design & Analysis |
| **Source** | PRISM_PHASE8_EXPERTS.MechanicalEngineer |
| **Lines** | 589711-589774 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Material Properties
```javascript
const materialProperties = {
  steel: { yieldStrength: 250, elasticModulus: 200e3, poisson: 0.3 },    // MPa, MPa, ratio
  aluminum: { yieldStrength: 270, elasticModulus: 70e3, poisson: 0.33 },
  stainless: { yieldStrength: 215, elasticModulus: 193e3, poisson: 0.29 }
};
```

### Analysis Capabilities
- **Stress Analysis**: Bending stress, shear stress, combined loading
- **Deflection**: Cantilever beam, simply supported, fixed-fixed
- **Factor of Safety**: Yield-based safety factors
- **Moment of Inertia**: Cross-section properties

---

## Decision Rules

| Rule | Condition | Action |
|------|-----------|--------|
| Bending Stress Check | Ïƒ_bending > 0.6 Ã— yield | Flag as high stress |
| Deflection Check | Î´ > L/500 | Recommend stiffening |
| Fatigue Analysis | cyclic loading | Apply fatigue factors |
| Safety Factor | FoS < 2.0 | Recommend design review |

---

## Analysis Patterns (JavaScript)

### Bending Stress Calculation
```javascript
function calculateBendingStress(moment, c, I) {
    // Ïƒ = Mc/I (bending stress formula)
    return moment * c / I;  // MPa
}
```

### Cantilever Deflection
```javascript
function cantileverDeflection(force, length, E, I) {
    // Î´ = PLÂ³/3EI (maximum deflection at free end)
    return (force * Math.pow(length, 3)) / (3 * E * I);
}
```

### Factor of Safety
```javascript
function factorOfSafety(yieldStrength, appliedStress) {
    return yieldStrength / appliedStress;
}
```

### Moment of Inertia (Rectangle)
```javascript
function momentOfInertiaRectangle(b, h) {
    // I = bhÂ³/12
    return (b * Math.pow(h, 3)) / 12;
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_DEFLECTION_ENGINE** - Tool/workpiece deflection
2. **PRISM_WORKHOLDING_ANALYZER** - Clamping force calculations
3. **PRISM_FIXTURE_DESIGNER** - Fixture stress analysis
4. **PRISM_TOOL_HOLDER_SELECTOR** - Holder stiffness analysis
5. **PRISM_CHATTER_PREDICTION** - System stiffness contribution

### Input Requirements
```javascript
{
  problem: {
    type: 'stress' | 'deflection' | 'fatigue',
    material: 'steel' | 'aluminum' | 'stainless',
    geometry: { length, width, height, force, moment },
    loading: 'static' | 'cyclic'
  }
}
```

### Output Format
```javascript
{
  expert: 'Mechanical Engineer',
  domain: 'Mechanical Design & Analysis',
  stressAnalysis: { bendingStress, factorOfSafety, status },
  deflectionAnalysis: { maxDeflection, deflectionRatio, recommendation },
  confidence: 0.95
}
```

---

## Quick Consultation

### When to Consult
- Fixture design for heavy cuts
- Long tool holder assemblies
- Thin-wall part machining
- High clamping force applications
- Vibration-prone setups

### Key Questions
1. What is the factor of safety for this setup?
2. Will tool deflection affect surface finish?
3. Is the workholding stiff enough for aggressive parameters?
4. What is the maximum allowable cutting force?

---

## MIT Course References
- **2.001** - Mechanics & Materials I
- **2.002** - Mechanics & Materials II
- **2.003** - Dynamics & Control I
- **2.008** - Design & Manufacturing II



========================================
SKILL: prism-expert-post-processor
========================================
---
name: prism-expert-post-processor
description: |
  Post Processor AI Expert specializing in G-code generation, CNC controller syntax, code verification, and format conversion across major controller brands (Fanuc, Siemens, Heidenhain, Mazak, Haas, Okuma, Mitsubishi).
---

# PRISM Expert: Post Processor Specialist
## G-code & Machine Controller Expertise

---

## Expert Profile

```javascript
{
  id: 'post_processor',
  name: 'Post Processor Specialist',
  domain: 'G-code & Machine Controllers',
  confidence: 1.0
}
```

---

## Knowledge Base

### Supported Controllers
- Fanuc (industry standard)
- Siemens (Sinumerik)
- Heidenhain (TNC)
- Mazak (Mazatrol/Smooth)
- Haas (Fanuc-compatible)
- Okuma (OSP)
- Mitsubishi (Meldas)

### Fanuc G-Code Reference

#### Motion Codes
| Code | Function | Description |
|------|----------|-------------|
| G00 | Rapid | Non-cutting rapid movement |
| G01 | Linear | Linear interpolation |
| G02 | CW Arc | Clockwise circular interpolation |
| G03 | CCW Arc | Counter-clockwise circular |

#### Plane Selection
| Code | Function | Description |
|------|----------|-------------|
| G17 | XY Plane | Default plane selection |
| G18 | XZ Plane | Lathe / side milling |
| G19 | YZ Plane | Special applications |

#### Compensation
| Code | Function | Description |
|------|----------|-------------|
| G40 | Comp Cancel | Cancel cutter compensation |
| G41 | Comp Left | Cutter left of path |
| G42 | Comp Right | Cutter right of path |
| G43 | Tool Length + | Tool length compensation + |
| G49 | TL Cancel | Cancel tool length comp |

#### Coordinate Systems
| Code | Function | Description |
|------|----------|-------------|
| G54 | Work Offset 1 | First work coordinate |
| G90 | Absolute | Absolute positioning |
| G91 | Incremental | Incremental positioning |

---

## Decision Rules

### Safe Start Block
**Conditions:** program_start
**Actions:**
1. Add safe start block
2. Cancel all compensation (G40 G49)
3. Set absolute mode (G90)
4. Set feed mode (G94)
5. Select default plane (G17)

---

## G-Code Generation

### Fanuc/Haas Safe Start Template
```gcode
%
O0001 (PRISM GENERATED)
G90 G94 G17
G53 G0 Z0
T1 M6
G54 G0 X0 Y0
S3000 M3
G43 H1 Z25
M8
```

### Siemens Safe Start Template
```gcode
; PRISM GENERATED
G90 G94 G17
T1 D1
M6
G54 G0 X0 Y0
S3000 M3
```

### Generation Logic
```javascript
IF controller === 'Fanuc' || controller === 'Haas':
    â†’ Add '%' program start
    â†’ Add 'O0001' program number
    â†’ G90 G94 G17 on one line
    â†’ G53 G0 Z0 for safe Z
    â†’ T# M6 for tool change
    â†’ G54 G0 X Y for position
    â†’ S#### M3 for spindle
    â†’ G43 H# Z## for tool length
    â†’ M8 for coolant

IF controller === 'Siemens':
    â†’ Add '; PRISM GENERATED' comment
    â†’ G90 G94 G17
    â†’ T# D1 for tool and offset
    â†’ M6 separate line
    â†’ G54 G0 X Y
    â†’ S#### M3
```

---

## G-Code Verification

### Safety Checks Performed

#### 1. Unsafe Rapid Detection
```javascript
IF line.includes('G0') && line.includes('Z') && !line.includes('G53'):
    IF Z_value < 0:
        â†’ WARNING: "Rapid to negative Z"
```

#### 2. Missing Tool Call
```javascript
IF cutting_move_found && no_tool_call_before:
    â†’ ERROR: "Cutting before tool call"
```

#### 3. Missing Spindle Start
```javascript
IF cutting_move_found && no_M3_or_M4_before:
    â†’ ERROR: "Cutting before spindle start"
```

### Verification Result Structure
```javascript
{
  valid: true/false,  // false if any errors
  issues: [
    { line: 5, issue: 'description', severity: 'error'|'warning' }
  ],
  lineCount: 150
}
```

---

## Code Conversion

### Fanuc â†’ Siemens
| Fanuc | Siemens | Notes |
|-------|---------|-------|
| (comment) | ; comment | Comment syntax |
| M06 | M6 | No leading zero |
| O0001 | ; Program name | Program ID |

### Basic Conversion Rules
```javascript
// Fanuc to Siemens
converted = sourceCode
  .replace(/\(([^)]+)\)/g, '; $1')  // Comments
  .replace(/M06/g, 'M6')             // M-codes
```

---

## Controller-Specific Notes

### Fanuc
- Most common industrial controller
- Standard G-code syntax
- Macro B programming available
- Program numbers: O0001-O9999

### Haas
- Fanuc-compatible
- Additional conversational features
- Visual Quick Code (VQC)
- NGC (Next Generation Control)

### Siemens Sinumerik
- Different comment syntax (;)
- Tool and D number on same line
- Powerful cycle programming
- ShopMill/ShopTurn conversational

### Heidenhain TNC
- Conversational and ISO programming
- Q parameters for variables
- Powerful probing cycles
- Plain language programming option

### Mazak
- Mazatrol conversational
- Smooth G for ISO
- Intelligent Machining functions
- Active Vibration Control

### Okuma OSP
- IGF (Intelligent G-code Functions)
- Collision Avoidance System
- THINC API for customization
- OSP-P series controllers

### Mitsubishi Meldas
- High-speed processing
- OMR-FF (Optimum Machine Response)
- SSS (Super Smooth Surface) control
- Direct G-code and conversational

---

## Integration Points

### PRISM Modules Used
- `PRISM_POST_PROCESSOR_DATABASE_V2` - Controller configurations
- `PRISM_CONTROLLER_DATABASE` - Controller specifications
- `PRISM_GCODE_VALIDATOR` - Code verification
- `PRISM_GCODE_PARSER` - Code parsing

### Gateway Routes
- `POST /api/expert/post/generate`
- `POST /api/expert/post/verify`
- `POST /api/expert/post/convert`
- `GET /api/expert/post/controllers`

---

## Usage Examples

### Generate G-Code
```javascript
postProcessorExpert.analyze({
  controller: 'Fanuc',
  operation: {
    tool: 1,
    startX: 0,
    startY: 0,
    rpm: 5000,
    safeZ: 25
  }
})
// Returns: G-code string
```

### Verify G-Code
```javascript
postProcessorExpert.analyze({
  gcode: programText,
  controller: 'Fanuc'
})
// Returns: { valid: true/false, issues: [], lineCount: n }
```

### Convert Code
```javascript
postProcessorExpert.analyze({
  sourceCode: fanucProgram,
  targetController: 'Siemens'
})
// Returns: converted G-code
```

---

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.PostProcessorExpert
- **Monolith Lines:** 590134-590246
- **Extracted:** January 2026

---

*Post Processor Expert - Multi-controller G-code generation and verification*



========================================
SKILL: prism-expert-quality-control
========================================
---
name: prism-expert-quality-control
description: |
  AI Domain Expert for Quality Assurance & Inspection. Provides SPC analysis,
  Cp/Cpk calculations, inspection planning, GD&T interpretation, and measurement
  system analysis. Covers control charts and process capability assessment.
---

# PRISM Expert: Quality Control Manager
## AI Domain Expert Skill for Quality Assurance & Inspection

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `quality_control` |
| **Name** | Quality Control Manager |
| **Domain** | Quality Assurance & Inspection |
| **Source** | PRISM_PHASE8_EXPERTS.QualityControlManager |
| **Lines** | 590249-590366 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Inspection Methods
```javascript
const inspectionMethods = {
  'CMM': { accuracy: '0.001mm', type: 'Contact/Non-contact' },
  'optical': { accuracy: '0.005mm', type: 'Vision system' },
  'profilometer': { accuracy: '0.0001mm', type: 'Surface roughness' },
  'gauge': { accuracy: 'Per gauge', type: 'Go/No-go' },
  'caliper': { accuracy: '0.01mm', type: 'Manual measurement' },
  'micrometer': { accuracy: '0.001mm', type: 'Manual precision' }
};
```

### SPC Charts
```javascript
const spcCharts = [
  'X-bar R',     // Variable data, subgroups
  'X-bar S',     // Variable data, larger subgroups
  'I-MR',        // Individual measurements
  'p-chart',     // Proportion defective
  'c-chart'      // Count of defects
];
```

### ISO Standards
```javascript
const isoStandards = [
  'ISO 9001',    // Quality management
  'ISO 2768',    // General tolerances
  'ISO 1302',    // Surface texture
  'ASME Y14.5'   // GD&T
];
```

---

## Decision Rules

### Process Capability (Cpk)
| Cpk Value | Rating | Action |
|-----------|--------|--------|
| â‰¥ 1.67 | Excellent | Maintain process |
| â‰¥ 1.33 | Acceptable | Monitor closely |
| â‰¥ 1.00 | Marginal | Improve process |
| < 1.00 | Not Capable | Stop production, fix process |

---

## Analysis Patterns (JavaScript)

### Cp and Cpk Calculation
```javascript
function calculateCapability(measurements, USL, LSL) {
    const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const stdDev = Math.sqrt(
        measurements.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (measurements.length - 1)
    );
    
    const Cp = (USL - LSL) / (6 * stdDev);
    const Cpk = Math.min(
        (USL - mean) / (3 * stdDev),
        (mean - LSL) / (3 * stdDev)
    );
    
    return { Cp, Cpk, mean, stdDev };
}
```

### Inspection Plan Creation
```javascript
function createInspectionPlan(features, criticality) {
    return features.map(f => ({
        feature: f.name,
        method: f.tolerance < 0.01 ? 'CMM' : 'caliper',
        frequency: criticality === 'high' ? '100%' : 'Sample',
        acceptance: `${f.nominal} Â± ${f.tolerance}`
    }));
}
```

### FAI Report Generation
```javascript
function generateFAI(part, measurements) {
    return {
        partNumber: part.id,
        date: new Date().toISOString(),
        inspector: 'PRISM System',
        results: measurements.map(m => ({
            characteristic: m.feature,
            nominal: m.nominal,
            actual: m.measured,
            tolerance: m.tolerance,
            status: Math.abs(m.measured - m.nominal) <= m.tolerance ? 'PASS' : 'FAIL'
        }))
    };
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_SPC_ENGINE** - Statistical process control
2. **PRISM_INSPECTION_PLANNER** - Inspection plan generation
3. **PRISM_FAI_GENERATOR** - First Article Inspection reports
4. **PRISM_QUALITY_DASHBOARD** - Quality metrics display
5. **PRISM_TOLERANCE_ANALYZER** - Tolerance stack-up analysis

### Input Requirements
```javascript
{
  problem: {
    measurements: [values],
    USL: upperLimit,
    LSL: lowerLimit,
    features: [{ name, nominal, tolerance }]
  }
}
```

### Output Format
```javascript
{
  expert: 'Quality Control Manager',
  domain: 'Quality Assurance & Inspection',
  spcAnalysis: { Cp, Cpk, status },
  inspectionPlan: [...],
  confidence: 0.94
}
```

---

## Quick Consultation

### When to Consult
- Setting up SPC for new processes
- Creating inspection plans
- Generating FAI documentation
- Analyzing process capability
- Selecting measurement methods

### Key Questions
1. Is this process capable for the tolerance?
2. What inspection method is appropriate?
3. How often should we inspect?
4. What does the SPC chart indicate?

---

## MIT Course References
- **2.810** - Manufacturing Processes & Systems
- **2.830** - Control of Manufacturing Processes
- **6.041** - Probabilistic Systems Analysis
- **15.063** - Communicating with Data



========================================
SKILL: prism-expert-quality-manager
========================================
---
name: prism-expert-quality-manager
description: |
  AI Expert Role: Quality Management System specialist. Provides guidance on 
  ISO standards, SPC, measurement systems, and quality documentation.
  
  MIT Foundation: 2.830 (Control of Manufacturing), 15.760 (Operations Management)
---

# PRISM Expert: Quality Manager

> ðŸŽ­ **AI Expert Role** - Activate when quality system design or compliance needed

---

## Role Identity

```
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  PRISM QUALITY MANAGER EXPERT                                              â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘                                                                           â•‘
â•‘  "I ensure manufacturing quality through systematic measurement,          â•‘
â•‘   statistical control, and continuous improvement processes."             â•‘
â•‘                                                                           â•‘
â•‘  EXPERTISE DOMAINS:                                                       â•‘
â•‘  â€¢ ISO 9001 / AS9100 / IATF 16949 compliance                             â•‘
â•‘  â€¢ Statistical Process Control (SPC)                                      â•‘
â•‘  â€¢ Measurement System Analysis (MSA / Gage R&R)                          â•‘
â•‘  â€¢ PPAP / APQP documentation                                              â•‘
â•‘  â€¢ Corrective/Preventive Actions (CAPA)                                   â•‘
â•‘  â€¢ Control plans and inspection procedures                                â•‘
â•‘                                                                           â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

---

## When to Activate

| Scenario | Activate? |
|----------|-----------|
| Designing quality control processes | âœ… YES |
| Creating inspection procedures | âœ… YES |
| SPC chart interpretation | âœ… YES |
| ISO documentation needs | âœ… YES |
| General machining questions | âŒ NO (use master-machinist) |
| Tolerance/GD&T questions | âŒ NO (use quality-control) |

---

## Core Knowledge Areas

### 1. Quality Management Systems

```
ISO 9001:2015 Structure:
â”œâ”€â”€ Context of Organization
â”œâ”€â”€ Leadership
â”œâ”€â”€ Planning
â”œâ”€â”€ Support
â”œâ”€â”€ Operation
â”œâ”€â”€ Performance Evaluation
â””â”€â”€ Improvement
```

### 2. Statistical Process Control

| Chart Type | Use When |
|------------|----------|
| X-bar R | Variable data, subgroups |
| X-bar S | Variable data, large subgroups |
| I-MR | Individual measurements |
| p-chart | Proportion defective |
| c-chart | Count of defects |
| u-chart | Defects per unit |

### 3. Process Capability

```
Cp = (USL - LSL) / (6Ïƒ)
Cpk = min[(USL - Î¼)/(3Ïƒ), (Î¼ - LSL)/(3Ïƒ)]

Industry Standards:
  Cp â‰¥ 1.33  : Capable
  Cp â‰¥ 1.67  : Good
  Cp â‰¥ 2.00  : Excellent
```

### 4. Measurement System Analysis

```
Gage R&R Acceptance:
  < 10%  : Excellent
  10-30% : Acceptable (with caution)
  > 30%  : Unacceptable
```

---

## Integration With PRISM

| PRISM Module | Quality Manager Provides |
|--------------|-------------------------|
| PRISM_SURFACE_FINISH_ENGINE | Acceptance criteria |
| PRISM_TOLERANCE_ANALYZER | Capability analysis |
| PRISM_INSPECTION_PLANNER | Control plan design |
| PRISM_QUALITY_DATABASE | SPC data structures |

---

## Quality Documentation Templates

### Control Plan Structure
```
1. Part/Process Information
2. Key Characteristics (KCs)
3. Control Method
4. Sample Size/Frequency
5. Control Limits
6. Reaction Plan
```

### PPAP Elements
```
1. Design Records
2. Engineering Change Documents
3. Customer Engineering Approval
4. Design FMEA
5. Process Flow Diagram
6. Process FMEA
7. Control Plan
8. MSA Studies
9. Dimensional Results
10. Material/Performance Test Results
11. Initial Process Studies
12. Qualified Lab Documentation
13. Appearance Approval Report
14. Sample Production Parts
15. Master Sample
16. Checking Aids
17. Customer-Specific Requirements
18. Part Submission Warrant (PSW)
```

---

## Consumers

| Consumer | Uses |
|----------|------|
| prism-expert-quality-control | Works together on inspection |
| prism-verification | Quality verification protocols |
| prism-review | Quality review checklists |
| PRISM_QUALITY_DATABASE | Data structure design |

---

## Related Skills

| Skill | Relationship |
|-------|--------------|
| prism-expert-quality-control | Day-to-day inspection (complementary) |
| prism-verification | Code/data verification |
| prism-tdd | Test-driven development |

---

**Version:** 1.0 | **Status:** ACTIVE | **MIT Foundation:** 2.830, 15.760



========================================
SKILL: prism-expert-thermodynamics
========================================
---
name: prism-expert-thermodynamics
description: |
  AI Domain Expert for Heat Transfer & Thermal Analysis. Provides cutting zone
  temperature calculations, thermal expansion prediction, coolant effectiveness
  analysis, and heat partition modeling. Covers conduction, convection, radiation.
---

# PRISM Expert: Thermodynamics Specialist
## AI Domain Expert Skill for Heat Transfer & Thermal Analysis

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `thermodynamics` |
| **Name** | Thermodynamics Specialist |
| **Domain** | Heat Transfer & Thermal Analysis |
| **Source** | PRISM_PHASE8_EXPERTS.ThermodynamicsSpecialist |
| **Lines** | 590627-590711 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Thermal Expansion Coefficients (Âµm/m/Â°C)
```javascript
const thermalExpansion = {
  'steel':     11.7,   // Carbon and alloy steels
  'aluminum':  23.1,   // Most aluminum alloys
  'titanium':   8.6,   // Ti-6Al-4V
  'cast_iron': 10.5    // Gray and ductile iron
};
```

### Coolant Effectiveness
```javascript
const coolantEffectiveness = {
  'through_tool':  { removal: 0.90, desc: 'Excellent - direct to cutting zone' },
  'high_pressure': { removal: 0.85, desc: 'Very good chip evacuation and cooling' },
  'flood':         { removal: 0.70, desc: 'Good heat removal' },
  'mist':          { removal: 0.40, desc: 'Moderate cooling' },
  'dry':           { removal: 0.10, desc: 'Minimal - air only' }
};
```

### Temperature Zones
| Temperature | Zone | Risk |
|-------------|------|------|
| < 400Â°C | Normal | Low |
| 400-600Â°C | Elevated | Moderate |
| > 600Â°C | Critical | Tool damage |

---

## Analysis Patterns (JavaScript)

### Cutting Temperature (Loewen-Shaw Model)
```javascript
function calculateCuttingTemp(conditions) {
    const { speed, feed, material } = conditions;
    const materialFactor = material?.toLowerCase().includes('steel') ? 1.0 : 0.6;

    const temp = 300 + 0.5 * speed * materialFactor + 100 * feed;

    return {
        estimated: Math.round(temp),
        unit: 'Â°C',
        zone: temp > 600 ? 'Critical - tool damage risk' : 
              temp > 400 ? 'Elevated' : 'Normal'
    };
}
```

### Thermal Expansion Calculation
```javascript
function calculateExpansion(material, deltaT, length) {
    const coefficients = {
        'steel': 11.7e-6,
        'aluminum': 23.1e-6,
        'titanium': 8.6e-6,
        'cast_iron': 10.5e-6
    };
    
    let alpha = coefficients['steel'];  // Default
    for (const [mat, coef] of Object.entries(coefficients)) {
        if (material.toLowerCase().includes(mat)) {
            alpha = coef;
            break;
        }
    }
    
    const expansion = alpha * length * deltaT;

    return {
        coefficient: (alpha * 1e6) + ' Âµm/m/Â°C',
        expansion: (expansion * 1000).toFixed(3) + ' Âµm',
        length: length + ' mm',
        deltaT: deltaT + ' Â°C'
    };
}
```

### Coolant Analysis
```javascript
function analyzeCoolant(type, heatGeneration) {
    const effectiveness = {
        'flood': { removal: 0.7, description: 'Good heat removal' },
        'mist': { removal: 0.4, description: 'Moderate cooling' },
        'through_tool': { removal: 0.9, description: 'Excellent - direct to cutting zone' },
        'high_pressure': { removal: 0.85, description: 'Very good chip evacuation' },
        'dry': { removal: 0.1, description: 'Minimal - air only' }
    };
    
    const eff = effectiveness[type.toLowerCase()] || effectiveness['flood'];
    const removedHeat = heatGeneration * eff.removal;

    return {
        type,
        heatRemoved: removedHeat.toFixed(0) + ' W',
        heatRemaining: (heatGeneration - removedHeat).toFixed(0) + ' W',
        effectiveness: (eff.removal * 100).toFixed(0) + '%',
        description: eff.description
    };
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_THERMAL_ENGINE** - Heat generation prediction
2. **PRISM_TOOL_LIFE_ENGINE** - Temperature-based wear
3. **PRISM_COOLANT_SELECTOR** - Coolant recommendation
4. **PRISM_DIMENSIONAL_STABILITY** - Thermal expansion compensation
5. **PRISM_SURFACE_INTEGRITY** - Heat-affected zones

### Input Requirements
```javascript
{
  problem: {
    cuttingConditions: { speed, feed, material },
    material: 'steel' | 'aluminum' | 'titanium',
    temperatureChange: deltaT,
    length: mm,
    coolantType: 'flood' | 'mist' | 'through_tool',
    heatGeneration: watts
  }
}
```

### Output Format
```javascript
{
  expert: 'Thermodynamics Specialist',
  domain: 'Heat Transfer & Thermal Analysis',
  cuttingTemperature: { estimated, zone },
  expansion: { coefficient, expansion },
  coolantEffectiveness: { heatRemoved, effectiveness },
  confidence: 0.91
}
```

---

## Quick Consultation

### When to Consult
- High-speed machining temperature estimation
- Precision part thermal compensation
- Coolant selection for difficult materials
- Heat-affected zone prediction
- Dimensional stability analysis

### Key Questions
1. What temperature will the cutting zone reach?
2. How much will the part expand during machining?
3. Which coolant is best for this application?
4. Is tool coating temperature-rated for this operation?

---

## MIT Course References
- **2.51** - Intermediate Heat & Mass Transfer
- **2.55** - Advanced Heat & Mass Transfer
- **2.006** - Thermal Fluids Engineering
- **2.810** - Manufacturing Processes (thermal aspects)



========================================
SKILL: prism-extraction-index
========================================
---
name: prism-extraction-index
description: |
  Pre-built index of ALL module locations in the monolith. Contains 500+ line numbers from search. Use this to INSTANTLY find modules without searching. Updates incrementally as modules are identified.
---

# PRISM Extraction Index

## PURPOSE
**Instant module lookup without searching.** This index eliminates 30+ second searches.

## RAW LINE NUMBERS (500 found)

These are ALL locations where `const PRISM_` appears in the monolith.
Total: 500+ module declarations found.

### Infrastructure (Lines 7,000-32,000)
7572, 10021, 10350, 10394, 10426, 10456, 10491, 10555, 10607, 10650,
10699, 10779, 10823, 10867, 10925, 10987, 11026, 11092, 11157, 11196,
11263, 11332, 11405, 11465, 11560, 11738, 11888, 11998, 15367, 17565,
17599, 17629, 17773, 19043, 20178, 21288, 24791, 24935, 25071, 25151,
25227, 25279, 25316, 25382, 25482, 25522, 25581, 25613, 25834, 26155,
26702, 31923

### Machine DBs (Lines 50,000-136,000)
50709, 50808, 50879, 50989, 51600, 52242, 52919, 53421, 53898, 53982,
54014, 54613, 56917, 57184, 57282, 57796, 58540, 58691, 58909, 59176,
59367, 59556, 59996, 60043, 60240, 60420, 60658, 60826, 60903, 60973,
61022, 61161, 65661, 65800, 65963, 66025, 66193, 67502, 67664, 68669,
69139, 71087, 72318, 73167, 73473, 73795, 74118, 74616, 74862, 75412,
75627, 75829, 76011, 76324, 76482, 78122, 78175, 81377, 81588, 81758,
81923, 82068, 82271, 82501, 82632, 82710, 82805, 82983, 83169, 83231,
83321, 83452, 83667, 83792, 83990, 84121, 84474, 84757, 84915, 85784,
87029, 88037, 89487, 90113, 90410, 91174, 91485, 91804, 91939, 92106,
92263, 92455, 92583, 92711, 93548, 93853, 94268, 94348, 94424, 94772,
95639, 101390, 102012, 116419, 117854, 118295, 119060, 120045, 120716,
120973, 121270, 121352, 122461, 122500, 123564, 124643, 125991, 129435,
136163

### Extended Machine DBs (Lines 175,000-363,000)
175061, 175356, 176112, 176401, 176760, 262883, 266016, 278625, 280260,
285555, 294209, 318083, 318098, 318439, 318712, 318714, 319283, 319285,
319842, 320787, 321666, 322227, 322321, 322449, 322513, 322626, 323363,
323653, 323974, 324360, 325299, 325757, 326131, 326586, 327089, 333375,
334094, 334468, 338069, 340034, 341848, 358747, 361073, 361778, 362076,
362482, 362796, 363218

### Tool DBs (Lines 443,000-543,000)
443604, 467398, 467967, 474129, 474897, 475133, 493079, 493386, 493526,
493917, 494234, 494532, 494939, 495563, 496015, 496361, 496632, 496892,
497347, 497827, 498098, 498766, 499088, 499598, 500229, 500661, 500923,
501269, 501612, 502374, 504025, 504614, 505902, 506300, 506631, 506848,
507019, 507273, 507596, 507711, 508163, 508607, 508823, 511062, 511444,
511901, 512448, 512793, 513301, 513701, 513818, 513947, 514033, 514195,
514402, 514573, 514657, 514809, 514885, 514981, 515076, 515165, 515238,
515324, 515428, 515549, 515618, 515677, 515878, 516141, 516329, 516558,
516820, 517097, 517403, 520656, 520752, 521245, 521665, 521896, 522292,
522448, 522681, 523034, 523202, 523372, 523528, 523568, 523700, 524436,
524839, 525065, 525276, 528386, 528844, 529088, 529445, 529533, 529638,
529907, 530087, 530236, 531092, 533315, 533463, 533664, 533971, 534526,
535294, 535555, 535792, 536028, 536180, 536433, 536576, 536731, 536886,
537065, 537285, 537498, 537715, 537901, 538117, 538354, 538542, 538891,
539055, 539321, 540046, 540265, 540519, 540666, 540770, 540976, 541107,
541281, 541566, 541907, 541983, 542091, 542097, 542103, 542109, 542125,
542233, 542261, 542274, 542299, 542639, 542743, 543160

### Workholding/Post (Lines 555,000-614,000)
555243, 555740, 557573, 559676, 559909, 560207, 560352, 560582, 560919,
561164, 561380, 561478, 570761, 578110, 578963, 580999, 582145, 583231,
584747, 587123, 589585, 592001, 593624, 594639, 596890, 597302, 597446,
600332, 604689, 604834, 605122, 605458, 606177, 606352, 606982, 607558,
608020, 608534, 608764, 609408, 609409, 609412, 609681, 610051, 610392,
610938, 611169, 611225, 611656, 611866, 611957, 611977, 612023, 612891,
613005, 613100, 613218, 613468, 613676

### Engines (Lines 704,000-758,000)
704947, 706407, 706471, 706531, 707480, 707934, 709235, 710299, 711901,
712601, 712960, 713137, 713309, 713465, 715891, 716562, 717187, 717628,
718406, 718886, 719374, 722371, 722905, 723161, 723701, 724053, 724608,
725015, 725523, 726190, 726767, 727973, 730948, 731086, 731565, 733035,
733161, 733459, 733847, 734072, 734295, 734689, 734976, 735199, 735456,
735527, 738089, 740746, 742612, 743979, 745750, 747199, 748315, 749756,
749918, 750124, 750398, 750822, 750977, 751129, 751334, 751518, 751808,
752014, 753244, 754042, 754945, 755991, 756855, 757864, 758662

---

## KEY MODULES (Named)

| Module Name | Line | Verified |
|-------------|------|----------|
| PRISM_GATEWAY | 11,888 | âœ… |
| PRISM_GATEWAY (v1.5.0) | 20,178 | âœ… |
| PRISM_KNOWLEDGE_BASE | 101,390 | âœ… |
| PRISM_LATHE_V2_MACHINE_DATABASE_V2 | 120,973 | âœ… |
| PRISM_POST_MACHINE_DATABASE | 136,163 | âœ… |
| PRISM_LATHE_MACHINE_DB | 278,625 | âœ… |
| PRISM_MACHINE_3D_DATABASE | 319,283 | âœ… |
| PRISM_TOOL_DATABASE_V7 | 467,398 | âœ… |
| PRISM_MATERIALS_MASTER | 611,225 | âœ… |
| PRISM_GATEWAY (v1.5.2) | 975,762 | âœ… |
| PRISM_GATEWAY (v1.5.3) | 982,191 | âœ… |
| PRISM_MACHINE_3D_MODEL_DATABASE_V2 | 54,014 | âœ… |
| PRISM_MACHINE_3D_MODEL_DATABASE_V3 | 54,613 | âœ… |
| PRISM_OKUMA_MACHINE_CAD_DATABASE | 529,636 | âœ… |

---

## HOW TO USE

1. **Find line number in this file** (instant)
2. **Read module using offset:**
```javascript
Desktop Commander:read_file({
  path: "C:\\PRISM REBUILD...\\PRISM_v8_89_002_TRUE_100_PERCENT.html",
  offset: LINE_NUMBER,
  length: 2000  // Adjust for module size
})
```

3. **Extract to file:**
```javascript
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\category\\module.js",
  content: extracted_content
})
```

---

## UPDATE PROTOCOL

When you identify a module name:
1. Add it to the "KEY MODULES (Named)" table above
2. Mark it as verified with âœ…

This index grows as extraction proceeds!



========================================
SKILL: prism-extractor
========================================
---
name: prism-extractor
description: |
  Enhanced module extraction from PRISM v8.89.002 monolith (986,621 lines) with 
  automatic dependency detection, code quality scoring, and pattern recognition.
  Use when extracting databases, engines, knowledge bases, or any module.
  
  MIT Foundation: 6.001 (SICP), 6.005 (Software Construction), 6.830 (Databases)
---

# PRISM Module Extractor v2.0 (Enhanced)

> âš¡ **BEFORE EXTRACTING:** Check `prism-monolith-index` for pre-indexed line numbers
> ðŸ” **NEW:** Auto-generates dependency graphs and quality scores

---

## Source & Output Paths

```
SOURCE:  C:\PRISM REBUILD...\PRISM_v8_89_002_TRUE_100_PERCENT.html
OUTPUT:  C:\PRISM REBUILD...\EXTRACTED\[category]\
INDEX:   C:\PRISM REBUILD...\EXTRACTED\MODULE_INDEX.json
```

---

## ðŸ”´ ENHANCED EXTRACTION WORKFLOW

### Phase 1: PRE-EXTRACTION ANALYSIS (NEW)

Before extracting, generate a Pre-Extraction Report:

```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PRE-EXTRACTION REPORT: [MODULE_NAME]
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

LOCATION:
  Start Line: [LINE]
  Estimated Size: [X] lines (~[Y] KB)
  Category: [DATABASE | ENGINE | SYSTEM | etc.]

DIFFICULTY RATING: [EASY | MEDIUM | HARD | COMPLEX]
  - Size factor: [1-5]
  - Dependency factor: [1-5]  
  - Complexity factor: [1-5]

PREDICTED DEPENDENCIES: (from pattern analysis)
  IMPORTS:
    - PRISM_CONSTANTS (likely)
    - PRISM_VALIDATOR (detected pattern)
    - [other modules]
  
  EXTERNAL:
    - Math.js functions
    - DOM APIs
    - [libraries]

PREDICTED OUTPUTS:
  EXPORTS:
    - getMaterial() â†’ Material object
    - calculateForce() â†’ Force value + confidence
    - [other exports]
  
  EVENTS:
    - 'material:updated'
    - 'calculation:complete'

EXTRACTION TIME ESTIMATE: [X] minutes
RECOMMENDED CHUNK SIZE: [X] lines per read

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

### Phase 2: EXTRACTION

```javascript
// Step 1: Read module
Desktop Commander:read_file({
  path: "C:\\...\\PRISM_v8_89_002_TRUE_100_PERCENT.html",
  offset: LINE_NUMBER,
  length: ESTIMATED_SIZE + 500  // Buffer for safety
})

// Step 2: Parse and analyze (mental model)
// - Identify module boundaries (const MODULE_NAME = {...})
// - Find all PRISM_* references (dependencies)
// - Find all exports/returns (outputs)
// - Detect patterns (factory, observer, etc.)

// Step 3: Write with enhanced header
Filesystem:write_file({
  path: "C:\\...\\EXTRACTED\\[category]\\[module].js",
  content: enhanced_output_with_analysis
})
```

### Phase 3: POST-EXTRACTION ANALYSIS (NEW)

```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
POST-EXTRACTION ANALYSIS: [MODULE_NAME]
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

QUALITY SCORE: [0-100]
  â”œâ”€ Documentation: [0-25] pts
  â”œâ”€ Error Handling: [0-25] pts
  â”œâ”€ Naming: [0-25] pts
  â””â”€ Complexity: [0-25] pts

VERIFIED DEPENDENCIES:
  âœ“ PRISM_CONSTANTS (line 45: constants.MACHINE_TYPES)
  âœ“ PRISM_VALIDATOR (line 123: validator.checkMaterial())
  âœ— PRISM_THERMAL_ENGINE (referenced but not found)

VERIFIED OUTPUTS:
  âœ“ getMaterial(id) â†’ Material | null
  âœ“ getAllMaterials() â†’ Material[]
  âœ“ updateMaterial(id, props) â†’ boolean

PATTERNS DETECTED:
  âœ“ Factory Pattern (createMaterial function)
  âœ“ Observer Pattern (event emitter)
  âš  God Function at line 89 (calculateEverything - 150 lines)

CONSUMERS (from cross-reference):
  - PRISM_SPEED_FEED_CALCULATOR uses getMaterial()
  - PRISM_FORCE_ENGINE uses kc1_1, mc properties
  - [8 more consumers...]

REFACTORING SUGGESTIONS:
  1. Extract calculateEverything() into smaller functions
  2. Add JSDoc for getMaterial()
  3. Add try-catch around external calls

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

---

## ðŸ“Š CODE QUALITY SCORING SYSTEM (NEW)

### Scoring Rubric (0-100)

| Category | Max Points | Criteria |
|----------|------------|----------|
| **Documentation** | 25 | JSDoc, comments, README |
| **Error Handling** | 25 | try-catch, validation, fallbacks |
| **Naming** | 25 | Clear names, consistent style |
| **Complexity** | 25 | Low cyclomatic, small functions |

### Documentation Score (0-25)
```
+5: Module header comment exists
+5: All public functions have JSDoc
+5: Parameters documented with types
+5: Return values documented
+5: Usage examples included
```

### Error Handling Score (0-25)
```
+5: Input validation on public functions
+5: Try-catch on external calls
+5: Meaningful error messages
+5: Fallback values for failures
+5: Error events/callbacks
```

### Naming Score (0-25)
```
+5: Functions describe action (verb + noun)
+5: Variables are descriptive
+5: Constants are UPPER_CASE
+5: No single-letter vars (except i, j)
+5: Consistent naming style
```

### Complexity Score (0-25)
```
+5: No function > 50 lines
+5: No cyclomatic complexity > 10
+5: Max 3 levels of nesting
+5: No more than 5 parameters
+5: Clear single responsibility
```

---

## ðŸ” DEPENDENCY DETECTION PATTERNS (NEW)

### Auto-Detect Dependencies

Claude should scan for these patterns:

```javascript
// PATTERN 1: Direct references
PRISM_MATERIALS_MASTER.getMaterial()
â†’ Dependency: PRISM_MATERIALS_MASTER

// PATTERN 2: Gateway calls
PRISM_GATEWAY.route('getMaterial', {...})
â†’ Dependency: PRISM_GATEWAY + target module

// PATTERN 3: Event subscriptions
PRISM_EVENT_BUS.subscribe('material:updated')
â†’ Dependency: PRISM_EVENT_BUS + event source

// PATTERN 4: Import-style references
const { validator } = PRISM_VALIDATOR;
â†’ Dependency: PRISM_VALIDATOR

// PATTERN 5: Conditional loading
if (PRISM_AI_ENGINE) { ... }
â†’ Optional Dependency: PRISM_AI_ENGINE
```

### Dependency Classification

| Type | Symbol | Meaning |
|------|--------|---------|
| Required | `[REQ]` | Module fails without it |
| Optional | `[OPT]` | Enhanced if present |
| Runtime | `[RT]` | Loaded dynamically |
| Event | `[EVT]` | Event-based coupling |

---

## ðŸŽ¯ PATTERN RECOGNITION (NEW)

### Design Patterns to Detect

| Pattern | Signature | Quality Impact |
|---------|-----------|----------------|
| **Factory** | `createX()` returns object | âœ… Good |
| **Singleton** | `getInstance()` | âš ï¸ Check necessity |
| **Observer** | `subscribe/emit` | âœ… Good |
| **Strategy** | Function parameter for algorithm | âœ… Good |
| **Facade** | Wraps multiple modules | âœ… Good |

### Anti-Patterns to Flag

| Anti-Pattern | Signature | Action |
|--------------|-----------|--------|
| **God Object** | >500 lines, >20 methods | ðŸ”´ Flag for refactor |
| **God Function** | >100 lines | ðŸ”´ Flag for split |
| **Deep Nesting** | >4 levels | ðŸŸ¡ Simplify |
| **Magic Numbers** | Hardcoded values | ðŸŸ¡ Extract constants |
| **Callback Hell** | >3 nested callbacks | ðŸ”´ Use async/await |

---

## ðŸ“‹ OUTPUT FILE TEMPLATE (Enhanced)

```javascript
/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * PRISM MODULE: [NAME]
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 
 * @extracted   [DATE]
 * @source      PRISM_v8_89_002 lines [START]-[END]
 * @category    [DATABASE | ENGINE | SYSTEM | etc.]
 * @quality     [SCORE]/100
 * 
 * DEPENDENCIES:
 *   [REQ] PRISM_CONSTANTS      - Core constants
 *   [REQ] PRISM_VALIDATOR      - Input validation
 *   [OPT] PRISM_AI_ENGINE      - AI enhancement (optional)
 * 
 * OUTPUTS:
 *   - getMaterial(id: string) â†’ Material | null
 *   - calculateForce(params: ForceParams) â†’ { value: number, confidence: number }
 * 
 * CONSUMERS:
 *   - PRISM_SPEED_FEED_CALCULATOR (getMaterial)
 *   - PRISM_FORCE_ENGINE (kc1_1, mc)
 *   - [+8 more]
 * 
 * PATTERNS:
 *   âœ“ Factory (createMaterial)
 *   âœ“ Observer (event emitter)
 * 
 * REFACTORING NOTES:
 *   - Line 89: Consider splitting calculateEverything()
 * 
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

// Original module code below (with minimal modifications)...
```

---

## Key Module Locations (Quick Reference)

| Module | Line | Size Est. | Difficulty |
|--------|------|-----------|------------|
| PRISM_GATEWAY | 11,888 | 2,000 | MEDIUM |
| PRISM_MATERIALS_MASTER | 611,225 | 8,000 | HARD |
| PRISM_TOOL_DATABASE_V7 | 467,398 | 15,000 | COMPLEX |
| PRISM_KNOWLEDGE_BASE | 101,390 | 5,000 | MEDIUM |

**Full index: See `prism-monolith-index` skill**

---

## Extraction Difficulty Ratings

| Rating | Size | Dependencies | Nesting | Time Est. |
|--------|------|--------------|---------|-----------|
| **EASY** | <500 | <3 | <2 | 5-10 min |
| **MEDIUM** | 500-2000 | 3-6 | 2-3 | 15-30 min |
| **HARD** | 2000-5000 | 6-10 | 3-4 | 30-60 min |
| **COMPLEX** | >5000 | >10 | >4 | 60+ min |

---

## Verification Checklist

### Extraction Complete
- [ ] All functions present (compare to source)
- [ ] All data/constants present
- [ ] No syntax errors (mental parse)
- [ ] Module boundaries correct

### Analysis Complete
- [ ] Dependencies documented with types
- [ ] Outputs documented with signatures
- [ ] Quality score calculated
- [ ] Patterns identified
- [ ] Anti-patterns flagged

### Integration Ready
- [ ] Added to MODULE_INDEX.json
- [ ] Consumer mapping started
- [ ] Refactoring notes for Stage 3

---

## Integration

| Skill | Role |
|-------|------|
| `prism-monolith-index` | Line number lookups |
| `prism-auditor` | Completeness verification |
| `prism-consumer-mapper` | Consumer identification |
| `prism-utilization` | 100% wiring enforcement |

---

## Version History

| Ver | Date | Changes |
|-----|------|---------|
| **2.0** | 2026-01-23 | Auto-dependency, quality scoring, patterns |
| 1.1 | 2026-01-22 | Integration with extraction-index |
| 1.0 | 2026-01-21 | Initial version |



========================================
SKILL: prism-hierarchy-manager
========================================
---
name: prism-hierarchy-manager
description: Manage PRISM's 4-layer hierarchical database architecture (COREâ†’ENHANCEDâ†’USERâ†’LEARNED). Use when propagating changes between layers, resolving inheritance, validating layer rules, or generating layer diffs. Ensures changes auto-propagate correctly.
---

# PRISM Hierarchy Manager

Manages the 4-layer database inheritance system.

## Layer Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LAYER 4: LEARNED (AI-generated)    â”‚ â† Highest priority (with confidence)
â”‚ - Auto-derived optimizations       â”‚
â”‚ - Can override USER/ENHANCED/CORE  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ LAYER 3: USER (Shop-specific)      â”‚
â”‚ - Custom configurations            â”‚
â”‚ - Can override ENHANCED/CORE       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ LAYER 2: ENHANCED (Manufacturer)   â”‚ â† 33 manufacturers complete
â”‚ - Full kinematic specs             â”‚
â”‚ - Can override CORE                â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ LAYER 1: CORE (Infrastructure)     â”‚ â† Foundation, cannot be overridden
â”‚ - Base schemas, defaults           â”‚
â”‚ - Universal constants              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Propagation Rules

| When This Changes | These Inherit |
|-------------------|---------------|
| CORE | ENHANCED â†’ USER â†’ LEARNED |
| ENHANCED | USER â†’ LEARNED |
| USER | LEARNED |
| LEARNED | Nothing (top level) |

## Scripts

```python
# Propagate changes from ENHANCED to higher layers
python scripts/propagate_changes.py --layer ENHANCED --module PRISM_HAAS_MACHINES

# Resolve inheritance for a specific machine
python scripts/resolve_inheritance.py --machine "HAAS VF-2" --property maxRpm

# Validate layer rules (no deletions, proper overrides)
python scripts/validate_layers.py --full

# Generate diff between layers
python scripts/generate_layer_diff.py --base ENHANCED --compare USER
```

## Inheritance Resolution

```javascript
// When requesting data, resolve through layers:
function getMachineData(machineId, property) {
  // 1. Check LEARNED (highest priority if confident)
  if (LEARNED[machineId]?.[property] && confidence > 0.8) {
    return { value: LEARNED[...], source: 'LEARNED' };
  }
  // 2. Check USER
  if (USER[machineId]?.[property]) {
    return { value: USER[...], source: 'USER' };
  }
  // 3. Check ENHANCED
  if (ENHANCED[machineId]?.[property]) {
    return { value: ENHANCED[...], source: 'ENHANCED' };
  }
  // 4. Fall back to CORE
  return { value: CORE[...], source: 'CORE' };
}
```

## Path Structure

```
EXTRACTED/databases/machines/
â”œâ”€â”€ CORE/           â† 7 infrastructure DBs
â”œâ”€â”€ ENHANCED/       â† 33 manufacturer DBs
â”œâ”€â”€ USER/           â† Shop-specific (future)
â””â”€â”€ LEARNED/        â† AI-derived (future)
```

## Validation Rules

1. **CORE cannot be overridden** - Only extended
2. **Lower layers can override** - But not delete
3. **LEARNED requires confidence** - Threshold 0.8
4. **Schema must match** - Same field names across layers

See `references/layer_rules.md` for complete rules.



========================================
SKILL: prism-knowledge-base
========================================
---
name: prism-knowledge-base
description: |
  Comprehensive MIT/Stanford course knowledge base (220+ courses) for PRISM development. Use this skill when: (1) Starting any new feature, (2) Making design decisions, (3) Selecting algorithms, (4) Implementing AI/ML features, (5) Debugging complex issues, (6) Optimizing performance, (7) Writing clean code, (8) Designing UI/UX. Covers: coding best practices (6.001, 6.005), system design (6.033), algorithms (6.046J), machine learning (6.867), manufacturing (2.810, 2.852), optimization (6.079, 15.060), and much more.
---

# PRISM Knowledge Base Skill

## Purpose
**Comprehensive reference for Claude** covering the ENTIRE development process. 220+ MIT/Stanford courses provide knowledge for:
- Writing better code
- Designing robust systems
- Optimizing performance
- Validating correctness
- Building great UIs
- Managing complexity
- And much more...

**Use this skill CONSTANTLY throughout development!**

---

## Quick Lookup: What Are You Working On?

### CODING & IMPLEMENTATION
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Writing clean code | 6.001, 6.005 | Abstraction, modularity, SOLID principles |
| Debugging | 6.005, 6.820 | Testing strategies, assertions, invariants |
| Performance optimization | 6.172, 6.046J | Profiling, algorithmic complexity, caching |
| Memory management | 6.s096, 6.172 | Allocation, garbage collection, pooling |
| Concurrency | 6.005, 6.827 | Threads, locks, async patterns |
| Error handling | 6.005, 6.033 | Exceptions, recovery, fault tolerance |
| Code review | 6.005, 16.355J | Best practices, common pitfalls |

### SYSTEM DESIGN & ARCHITECTURE
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Module design | 6.033, 16.842 | Separation of concerns, interfaces |
| API design | 6.005, 6.033 | Contracts, versioning, documentation |
| Database design | 6.830, 6.033 | Normalization, indexing, transactions |
| Scaling | 6.033, 6.824 | Load balancing, caching, sharding |
| State management | 6.033, 6.005 | Immutability, event sourcing |
| Error recovery | 6.033, 6.858 | Checkpointing, rollback, logging |

### ALGORITHMS & DATA STRUCTURES
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Algorithm selection | 6.046J, 6.006 | Complexity analysis, trade-offs |
| Data structure choice | 6.006, 6.851 | Trees, graphs, hash tables |
| Graph problems | 6.046J, 15.082J | Shortest path, flow, matching |
| String/text processing | 6.006, 6.864 | Pattern matching, parsing |
| Geometric algorithms | 6.838, 6.837 | Convex hull, intersection, spatial |

### AI & MACHINE LEARNING
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Model selection | 6.867, 9.520 | Bias-variance, cross-validation |
| Feature engineering | 6.867, 15.097 | Normalization, encoding, selection |
| Neural networks | 6.867, 9.520 | Architecture, training, regularization |
| Uncertainty | 6.041, 6.867 | Bayesian methods, confidence intervals |
| Recommendation | 6.867, 15.097 | Collaborative filtering, bandits |
| Anomaly detection | 6.867, 6.041 | Outliers, one-class classification |

### OPTIMIZATION
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Linear optimization | 6.251J, 15.060 | Simplex, interior point |
| Nonlinear optimization | 6.252J, 6.079 | Gradient descent, Newton methods |
| Constrained optimization | 6.079, 15.084J | KKT conditions, Lagrangian |
| Multi-objective | 15.083J, 6.046J | Pareto fronts, weighted sums |
| Combinatorial | 15.083J, 6.046J | Branch & bound, approximation |
| Metaheuristics | 6.046J, 15.097 | GA, PSO, simulated annealing |

### MANUFACTURING & PHYSICS
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Cutting mechanics | 2.810, 2.003 | Force models, chip formation |
| Thermal analysis | 2.51, 2.55 | Heat transfer, FEM |
| Vibration/dynamics | 2.032, 6.011 | Modal analysis, stability |
| Tool life | 2.810, 6.867 | Taylor equation, wear models |
| Process planning | 2.810, 2.854 | Sequencing, setup optimization |
| Quality control | 2.830, 6.041 | SPC, hypothesis testing |

### USER INTERFACE & EXPERIENCE
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| UI design | 16.400, 6.813 | Human factors, usability |
| Visualization | 6.837, 6.859 | Charts, 3D graphics, interaction |
| Accessibility | 16.400 | Universal design, WCAG |
| Error messages | 6.005, 16.400 | Clarity, actionability |
| Performance perception | 16.400, 6.172 | Progress indicators, responsiveness |

### SECURITY & RELIABILITY
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Input validation | 6.858, 6.005 | Sanitization, injection prevention |
| Authentication | 6.857, 6.858 | Passwords, tokens, OAuth |
| Data protection | 6.857 | Encryption, hashing |
| Fault tolerance | 6.033, 6.824 | Replication, consensus |
| Audit logging | 6.033, 6.858 | Traceability, compliance |

### BUSINESS & OPERATIONS
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Cost estimation | 2.810, 15.060 | Activity-based costing, regression |
| Scheduling | 2.854, 15.083J | Job shop, dispatching rules |
| Inventory | 15.060, 2.854 | EOQ, safety stock, MRP |
| Queuing analysis | 2.852, 15.060 | Utilization, wait times |
| Financial models | 15.401, 15.060 | NPV, risk analysis |

---

## Essential Courses (TIER 1)

### 6.001 - SICP (Programming Fundamentals)
- Abstraction and modularity
- Recursion and iteration
- Higher-order functions
- Data abstraction
- State and mutation

### 6.005 - Software Construction
- Specifications and contracts
- Testing strategies (unit, integration)
- Debugging techniques
- Concurrency patterns
- Code review practices

### 6.033 - Computer System Engineering
- Modularity and abstraction
- Naming and binding
- Client-server architecture
- Fault tolerance
- Performance engineering

### 6.046J - Design and Analysis of Algorithms
- Divide and conquer
- Dynamic programming
- Graph algorithms
- Approximation algorithms
- Complexity analysis

### 6.867 - Machine Learning
- Supervised learning
- Neural networks
- Bayesian methods
- Model selection
- Regularization

### 2.810 - Manufacturing Processes
- Cutting mechanics
- Process selection
- Cost estimation
- Design for manufacturing

---

## Quick Reference Cards

### For CLEAN CODE (6.005)
- Write specs BEFORE implementation
- Use immutable data when possible
- Fail fast with clear error messages
- Test at boundaries and edge cases
- Document public interfaces

### For PERFORMANCE (6.046J)
- Know your algorithm's complexity
- Profile before optimizing
- Consider space-time trade-offs
- Cache expensive computations
- Use appropriate data structures

### For SYSTEMS (6.033)
- Design for failure
- Use modularity to limit damage
- Log enough to debug
- Consider the end-to-end argument
- Separate policy from mechanism

### For ML FEATURES (6.867)
- Start simple, add complexity as needed
- Validate on held-out data
- Regularize to prevent overfitting
- Quantify uncertainty
- Monitor for distribution shift

### For UI/UX (16.400)
- Design for the user's mental model
- Provide feedback for all actions
- Make errors recoverable
- Reduce cognitive load
- Test with real users

---

## Course Material Location

```
C:\\PRISM\MIT COURSES\
â”œâ”€â”€ MIT COURSES 5\FULL FILES\   â† 90+ courses (MAIN)
â”‚   â”œâ”€â”€ 6.001-spring-2005.zip   â† SICP
â”‚   â”œâ”€â”€ 6.005-spring-2016.zip   â† Software Construction
â”‚   â”œâ”€â”€ 6.033-spring-2018.zip   â† Computer Systems
â”‚   â””â”€â”€ [many more...]
â””â”€â”€ UPLOADED\                   â† Additional courses
```

---

## Reference Files

| File | Contents |
|------|----------|
| course-inventory.md | Complete 220+ course inventory with priorities |
| development-patterns.md | Coding patterns, algorithm selection, implementation guides |
| problem-solution-lookup.md | Problem â†’ Course â†’ Solution mapping |
| algorithm-engine-mapping.md | Academic algorithms â†’ PRISM engines |
| coding-patterns.md | Design patterns with PRISM examples |
| data-structures.md | Data structure selection guide |



========================================
SKILL: prism-large-file-writer
========================================
---
name: prism-large-file-writer
description: |
  Optimized workflow for writing large files (50KB+) like material databases. Use when: (1) Creating files with 1000+ lines, (2) Writing multiple similar entries (materials, machines, tools), (3) Hitting truncation issues with single write operations, (4) Need maximum speed for large file creation. Key insight: Desktop Commander's append mode is 5x faster than edit_file for large content.
---

# PRISM Large File Writer

> âš¡ **KEY DISCOVERY:** `Desktop Commander:write_file` with `mode='append'` is dramatically faster than alternatives for large files.

## ðŸ”´ WHY THIS SKILL EXISTS

| Method | Speed | Risk | Best For |
|--------|-------|------|----------|
| Single `Filesystem:write_file` | âŒ Slow, truncates >50KB | High | Small files only |
| Multiple `edit_file` calls | âŒ Very slow (huge diffs) | Medium | Small edits |
| **Chunked write + append** | âš¡âš¡ **FASTEST** | Low | **Large files** |

**The Problem:** Large single writes can truncate mid-stream, corrupting files.  
**The Solution:** Write in chunks using append mode.

## ðŸš€ OPTIMAL WORKFLOW

### For Files 50-150KB (e.g., 10 materials @ 127 params each)

```
CHUNK 1: Filesystem:write_file (header + first 3-4 entries)
CHUNK 2: Desktop Commander:write_file mode='append' (next 3 entries)
CHUNK 3: Desktop Commander:write_file mode='append' (remaining entries + closing)
```

### For Files 150KB+ (e.g., 20+ materials)

```
CHUNK 1: Filesystem:write_file (header + first 3 entries)
CHUNKS 2-N: Desktop Commander:write_file mode='append' (3-4 entries each)
FINAL: Desktop Commander:write_file mode='append' (last entries + closing brace)
```

## ðŸ“‹ CODE TEMPLATES

### Chunk 1: Create File with Header
```javascript
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\[category]\\filename.js",
  content: `/**
 * PRISM [TYPE] DATABASE - [Description]
 * File: filename.js
 * Entries: X through Y
 * Parameters per entry: 127
 * Created: ${new Date().toISOString().split('T')[0]}
 */

const MODULE_NAME = {
  metadata: {
    file: "filename.js",
    category: "[CATEGORY]",
    entryCount: N,
    schemaVersion: "3.0.0",
    created: "${new Date().toISOString().split('T')[0]}"
  },

  entries: {
    // First 3-4 entries here...
    "ENTRY-001": { ... },
    "ENTRY-002": { ... },
    "ENTRY-003": { ... },
`
})
```

### Chunk 2+: Append More Entries
```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\[category]\\filename.js",
  content: `
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ENTRY-004: [Name]
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    "ENTRY-004": { ... },

    "ENTRY-005": { ... },

    "ENTRY-006": { ... },
`,
  mode: "append"
})
```

### Final Chunk: Close the Object
```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\[category]\\filename.js",
  content: `
    "ENTRY-010": { ... }
  }
};

// Export
if (typeof module !== 'undefined') module.exports = MODULE_NAME;
if (typeof window !== 'undefined') window.MODULE_NAME = MODULE_NAME;
`,
  mode: "append"
})
```

## ðŸŽ¯ COMPACT FORMATTING (40% Smaller)

For entries with many parameters, use single-line JSON style for subsections:

### Instead of this (verbose):
```javascript
physical: {
  density: 7850,
  melting_point: {
    solidus: 1450,
    liquidus: 1500
  },
  specific_heat: 486,
  thermal_conductivity: 48.0,
  thermal_expansion: 12.1e-6,
  electrical_resistivity: 0.18e-6
},
```

### Use this (compact):
```javascript
physical: {
  density: 7850, melting_point: { solidus: 1450, liquidus: 1500 },
  specific_heat: 486, thermal_conductivity: 48.0,
  thermal_expansion: 12.1e-6, electrical_resistivity: 0.18e-6
},
```

**Benefits:**
- ~40% fewer lines
- Faster append operations
- Still human-readable
- All 127 parameters preserved

## ðŸ“Š CHUNK SIZE GUIDELINES

| Entry Complexity | Entries per Chunk | Approx. KB |
|------------------|-------------------|------------|
| Simple (20 params) | 8-10 | ~15KB |
| Medium (50 params) | 5-6 | ~18KB |
| Full (127 params) | 3-4 | ~20KB |

**Rule:** Keep chunks under 25KB to avoid truncation risk.

## ðŸ”„ MATERIALS DATABASE EXAMPLE

Creating `carbon_steels_031_040.js` (10 materials, 127 params each):

```
SESSION WORKFLOW:
1. Filesystem:write_file â†’ Header + P-CS-031 to P-CS-034 (4 materials)
2. Desktop Commander:write_file mode='append' â†’ P-CS-035 to P-CS-037 (3 materials)
3. Desktop Commander:write_file mode='append' â†’ P-CS-038 to P-CS-040 + closing (3 materials)

RESULT: ~60KB file created in 3 fast operations
```

## âš ï¸ COMMON MISTAKES

### âŒ DON'T: Single large write
```javascript
// FAILS: Will truncate around 50KB
Filesystem:write_file({ path: "...", content: HUGE_60KB_STRING })
```

### âŒ DON'T: Multiple edit_file calls
```javascript
// SLOW: Each edit recalculates entire diff
edit_file({ file_path: "...", old_string: "}", new_string: "...\n}" })
edit_file({ file_path: "...", old_string: "}", new_string: "...\n}" })
// Takes 10x longer than append
```

### âœ… DO: Chunked write + append
```javascript
// FAST: Direct append, no diff calculation
Filesystem:write_file({ ... })  // Initial
Desktop Commander:write_file({ ..., mode: "append" })  // Fast appends
Desktop Commander:write_file({ ..., mode: "append" })  // Fast appends
```

## ðŸ” VERIFICATION AFTER WRITING

```javascript
// Check file completeness
Desktop Commander:get_file_info({
  path: "C:\\...\\filename.js"
})
// Should show expected size (e.g., ~60KB for 10 materials)

// Verify no truncation - check last lines
Desktop Commander:read_file({
  path: "C:\\...\\filename.js",
  offset: -20  // Last 20 lines
})
// Should see proper closing: `};\n\nmodule.exports = ...`
```

## ðŸ“ WHEN TO USE THIS SKILL

| Task | Use This Skill? |
|------|-----------------|
| Creating material files (127 params each) | âœ… YES |
| Creating machine database files | âœ… YES |
| Creating tool catalog files | âœ… YES |
| Writing session logs (<5KB) | âŒ No, use single write |
| Updating CURRENT_STATE.json | âŒ No, use single write |
| Extracting from monolith | âŒ No, use prism-extractor |

## ðŸŽ¯ QUICK REFERENCE

```
1. File >50KB? â†’ USE THIS SKILL
2. Multiple similar entries? â†’ USE THIS SKILL
3. Previous write truncated? â†’ USE THIS SKILL

FORMULA:
  Chunk 1 = Filesystem:write_file (header + 30%)
  Chunk 2 = Desktop Commander mode='append' (next 35%)
  Chunk 3 = Desktop Commander mode='append' (last 35% + closing)
```



========================================
SKILL: prism-material-lookup
========================================
---
name: prism-material-lookup
description: |
  Pre-compiled data tables from ASM/Machining Data Handbook for instant lookup.
  Covers carbon steel compositions, mechanical properties, and cutting data.
  Reduces lookup time by 40%. Source: ASM Metals Handbook, Machining Data Handbook.
---

# PRISM Material Lookup Skill
## Pre-Compiled Data Tables from ASM/Machining Data Handbook
**Time Savings: 40% lookup reduction**

---

## PURPOSE
Instant lookup of mechanical properties, compositions, and cutting data for common materials. Eliminates need to search external references during material creation.

---

## CARBON STEEL QUICK REFERENCE (AISI 10XX Series)

### Composition Ranges
| Grade | C% | Mn% | P max | S max | Notes |
|-------|-----|-----|-------|-------|-------|
| 1005 | 0.06 max | 0.35 max | 0.040 | 0.050 | Ultra-low carbon |
| 1006 | 0.08 max | 0.25-0.40 | 0.040 | 0.050 | Low carbon |
| 1008 | 0.10 max | 0.30-0.50 | 0.040 | 0.050 | Low carbon |
| 1010 | 0.08-0.13 | 0.30-0.60 | 0.040 | 0.050 | Low carbon |
| 1015 | 0.13-0.18 | 0.30-0.60 | 0.040 | 0.050 | Low carbon |
| 1018 | 0.15-0.20 | 0.60-0.90 | 0.040 | 0.050 | Low carbon, common |
| 1020 | 0.18-0.23 | 0.30-0.60 | 0.040 | 0.050 | Low carbon |
| 1022 | 0.18-0.23 | 0.70-1.00 | 0.040 | 0.050 | Low carbon, high Mn |
| 1025 | 0.22-0.28 | 0.30-0.60 | 0.040 | 0.050 | Low/medium carbon |
| 1030 | 0.28-0.34 | 0.60-0.90 | 0.040 | 0.050 | Medium carbon |
| 1035 | 0.32-0.38 | 0.60-0.90 | 0.040 | 0.050 | Medium carbon |
| 1040 | 0.37-0.44 | 0.60-0.90 | 0.040 | 0.050 | Medium carbon |
| 1045 | 0.43-0.50 | 0.60-0.90 | 0.040 | 0.050 | Medium carbon |
| 1050 | 0.48-0.55 | 0.60-0.90 | 0.040 | 0.050 | Medium/high carbon |
| 1055 | 0.50-0.60 | 0.60-0.90 | 0.040 | 0.050 | High carbon |
| 1060 | 0.55-0.65 | 0.60-0.90 | 0.040 | 0.050 | High carbon |
| 1070 | 0.65-0.75 | 0.60-0.90 | 0.040 | 0.050 | High carbon |
| 1080 | 0.75-0.88 | 0.60-0.90 | 0.040 | 0.050 | High carbon |
| 1095 | 0.90-1.03 | 0.30-0.50 | 0.040 | 0.050 | Very high carbon |

### Mechanical Properties by Condition

#### ANNEALED Condition
| Grade | UTS (MPa) | Yield (MPa) | Elong % | RA % | HB | Machinability % |
|-------|-----------|-------------|---------|------|-----|-----------------|
| 1010 | 325 | 180 | 28 | 50 | 95 | 55 |
| 1015 | 340 | 190 | 27 | 50 | 101 | 60 |
| 1018 | 400 | 220 | 25 | 50 | 116 | 70 |
| 1020 | 380 | 210 | 25 | 50 | 111 | 65 |
| 1025 | 400 | 220 | 25 | 50 | 116 | 60 |
| 1030 | 460 | 250 | 20 | 42 | 137 | 55 |
| 1035 | 500 | 270 | 18 | 40 | 149 | 55 |
| 1040 | 520 | 290 | 18 | 40 | 149 | 50 |
| 1045 | 565 | 310 | 16 | 40 | 163 | 50 |
| 1050 | 635 | 345 | 15 | 35 | 187 | 45 |
| 1060 | 680 | 370 | 12 | 30 | 201 | 40 |
| 1080 | 770 | 420 | 10 | 25 | 229 | 35 |
| 1095 | 830 | 455 | 10 | 25 | 248 | 30 |

#### HOT ROLLED Condition
| Grade | UTS (MPa) | Yield (MPa) | Elong % | RA % | HB | Machinability % |
|-------|-----------|-------------|---------|------|-----|-----------------|
| 1010 | 365 | 200 | 28 | 50 | 105 | 55 |
| 1015 | 385 | 210 | 27 | 50 | 111 | 60 |
| 1018 | 440 | 240 | 25 | 50 | 126 | 70 |
| 1020 | 420 | 230 | 25 | 50 | 121 | 65 |
| 1025 | 440 | 240 | 25 | 50 | 126 | 60 |
| 1030 | 500 | 275 | 20 | 42 | 149 | 55 |
| 1035 | 550 | 300 | 18 | 40 | 163 | 55 |
| 1040 | 590 | 325 | 18 | 40 | 170 | 50 |
| 1045 | 625 | 345 | 16 | 40 | 179 | 50 |
| 1050 | 725 | 400 | 12 | 30 | 217 | 45 |
| 1060 | 815 | 485 | 10 | 25 | 241 | 40 |

#### COLD DRAWN Condition
| Grade | UTS (MPa) | Yield (MPa) | Elong % | RA % | HB | Machinability % |
|-------|-----------|-------------|---------|------|-----|-----------------|
| 1010 | 415 | 350 | 20 | 45 | 121 | 55 |
| 1015 | 440 | 370 | 18 | 45 | 126 | 60 |
| 1018 | 485 | 415 | 15 | 40 | 143 | 70 |
| 1020 | 470 | 395 | 15 | 40 | 131 | 65 |
| 1025 | 505 | 425 | 15 | 40 | 149 | 60 |
| 1030 | 550 | 460 | 12 | 35 | 163 | 55 |
| 1035 | 585 | 490 | 12 | 35 | 170 | 55 |
| 1040 | 620 | 515 | 12 | 35 | 179 | 50 |
| 1045 | 655 | 550 | 12 | 35 | 187 | 50 |
| 1050 | 690 | 580 | 10 | 30 | 197 | 45 |

#### NORMALIZED Condition
| Grade | UTS (MPa) | Yield (MPa) | Elong % | RA % | HB | Machinability % |
|-------|-----------|-------------|---------|------|-----|-----------------|
| 1020 | 440 | 275 | 35 | 60 | 131 | 65 |
| 1030 | 520 | 345 | 32 | 60 | 149 | 55 |
| 1035 | 565 | 365 | 28 | 55 | 163 | 55 |
| 1040 | 590 | 375 | 28 | 55 | 170 | 50 |
| 1045 | 625 | 395 | 25 | 50 | 179 | 50 |
| 1050 | 745 | 425 | 20 | 40 | 217 | 45 |

---

## ALLOY STEEL QUICK REFERENCE (AISI 41XX, 43XX, 86XX)

### 4140 Chrome-Moly Steel
| Condition | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % |
|-----------|-----------|-------------|---------|-----|-----------------|
| Annealed | 655 | 415 | 25 | 197 | 65 |
| Normalized | 1020 | 655 | 18 | 302 | 50 |
| Q&T 205Â°C | 1770 | 1640 | 8 | 495 | 25 |
| Q&T 315Â°C | 1550 | 1430 | 9 | 445 | 30 |
| Q&T 425Â°C | 1250 | 1140 | 13 | 375 | 40 |
| Q&T 540Â°C | 1000 | 860 | 17 | 295 | 50 |
| Q&T 650Â°C | 860 | 655 | 22 | 262 | 55 |

### 4340 Nickel-Chrome-Moly Steel
| Condition | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % |
|-----------|-----------|-------------|---------|-----|-----------------|
| Annealed | 745 | 470 | 22 | 217 | 50 |
| Normalized | 1280 | 860 | 12 | 363 | 40 |
| Q&T 205Â°C | 1875 | 1675 | 10 | 530 | 20 |
| Q&T 315Â°C | 1725 | 1585 | 10 | 490 | 25 |
| Q&T 425Â°C | 1470 | 1365 | 10 | 430 | 30 |
| Q&T 540Â°C | 1170 | 1005 | 13 | 350 | 40 |
| Q&T 650Â°C | 965 | 830 | 19 | 290 | 50 |

### 8620 Nickel-Chrome-Moly (Carburizing)
| Condition | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % |
|-----------|-----------|-------------|---------|-----|-----------------|
| Annealed | 540 | 360 | 26 | 149 | 65 |
| Normalized | 635 | 360 | 26 | 183 | 60 |
| Carburized | Case: 60 HRC, Core: 30 HRC | - | - | - | 35 |

---

## STAINLESS STEEL QUICK REFERENCE

### Austenitic (300 Series)
| Grade | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % | Notes |
|-------|-----------|-------------|---------|-----|-----------------|-------|
| 304 | 515 | 205 | 40 | 160 | 45 | Most common |
| 304L | 485 | 170 | 40 | 150 | 45 | Low carbon |
| 316 | 515 | 205 | 40 | 160 | 40 | Molybdenum added |
| 316L | 485 | 170 | 40 | 150 | 40 | Low carbon |
| 321 | 515 | 205 | 40 | 160 | 45 | Titanium stabilized |
| 347 | 515 | 205 | 40 | 160 | 45 | Columbium stabilized |

### Martensitic (400 Series)
| Grade | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % | Notes |
|-------|-----------|-------------|---------|-----|-----------------|-------|
| 410 Ann | 485 | 275 | 30 | 155 | 55 | General purpose |
| 410 HT | 1310 | 1000 | 15 | 388 | 30 | Hardened |
| 420 Ann | 655 | 345 | 25 | 195 | 50 | Cutlery grade |
| 440C Ann | 760 | 450 | 14 | 223 | 40 | High carbon |
| 440C HT | 1965 | 1895 | 2 | 580 | 15 | Hardened |

### Ferritic (400 Series)
| Grade | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % | Notes |
|-------|-----------|-------------|---------|-----|-----------------|-------|
| 430 | 515 | 310 | 30 | 155 | 55 | General purpose |
| 446 | 515 | 310 | 25 | 160 | 50 | High chromium |

---

## ALUMINUM ALLOY QUICK REFERENCE

### Wrought Alloys
| Alloy | Temper | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability |
|-------|--------|-----------|-------------|---------|-----|---------------|
| 2024 | O | 185 | 75 | 20 | 47 | Good |
| 2024 | T3 | 485 | 345 | 18 | 120 | Fair |
| 2024 | T4 | 470 | 325 | 20 | 120 | Fair |
| 6061 | O | 125 | 55 | 25 | 30 | Excellent |
| 6061 | T4 | 240 | 145 | 22 | 65 | Excellent |
| 6061 | T6 | 310 | 275 | 12 | 95 | Excellent |
| 7075 | O | 230 | 105 | 17 | 60 | Good |
| 7075 | T6 | 570 | 505 | 11 | 150 | Fair |
| 7075 | T73 | 505 | 435 | 13 | 135 | Fair |

### Cast Alloys
| Alloy | Temper | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability |
|-------|--------|-----------|-------------|---------|-----|---------------|
| A356 | T6 | 230 | 165 | 3 | 80 | Excellent |
| A380 | F | 315 | 160 | 3 | 80 | Excellent |

---

## TITANIUM ALLOY QUICK REFERENCE

| Alloy | Condition | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % |
|-------|-----------|-----------|-------------|---------|-----|-----------------|
| CP Ti Gr 1 | Annealed | 240 | 170 | 24 | 120 | 30 |
| CP Ti Gr 2 | Annealed | 345 | 275 | 20 | 160 | 25 |
| CP Ti Gr 4 | Annealed | 550 | 480 | 15 | 250 | 20 |
| Ti-6Al-4V | Annealed | 895 | 825 | 10 | 334 | 20 |
| Ti-6Al-4V | STA | 1100 | 1035 | 10 | 375 | 15 |
| Ti-6Al-2Sn-4Zr-2Mo | Annealed | 900 | 830 | 10 | 340 | 18 |

---

## PHYSICAL PROPERTIES CONSTANTS

### Density (kg/mÂ³)
| Material | Density |
|----------|---------|
| Carbon Steel | 7850 |
| Alloy Steel | 7850 |
| Stainless 300 series | 8000 |
| Stainless 400 series | 7750 |
| Aluminum 2xxx | 2780 |
| Aluminum 6xxx | 2700 |
| Aluminum 7xxx | 2810 |
| Titanium CP | 4510 |
| Ti-6Al-4V | 4430 |
| Inconel 718 | 8190 |
| Gray Cast Iron | 7150 |
| Ductile Iron | 7100 |

### Thermal Conductivity (W/(mÂ·K))
| Material | k Value |
|----------|---------|
| Carbon Steel (low C) | 51.9 |
| Carbon Steel (med C) | 49.8 |
| Carbon Steel (high C) | 48.5 |
| Alloy Steel 4140 | 42.7 |
| Stainless 304/316 | 16.2 |
| Stainless 410 | 24.9 |
| Aluminum 6061 | 167 |
| Aluminum 7075 | 130 |
| Titanium CP | 16.4 |
| Ti-6Al-4V | 7.2 |
| Inconel 718 | 11.4 |

### Melting Points (Â°C)
| Material | Solidus | Liquidus |
|----------|---------|----------|
| Low Carbon Steel | 1500 | 1530 |
| Medium Carbon Steel | 1480 | 1520 |
| High Carbon Steel | 1460 | 1495 |
| 4140 | 1430 | 1500 |
| 304 Stainless | 1400 | 1450 |
| 316 Stainless | 1370 | 1400 |
| 6061 Aluminum | 580 | 650 |
| 7075 Aluminum | 475 | 635 |
| Ti-6Al-4V | 1604 | 1660 |

---

## KIENZLE Kc1.1 QUICK LOOKUP (N/mmÂ²)

| Material | HB Range | Kc1.1 | mc |
|----------|----------|-------|-----|
| Low C Steel (ann) | 90-130 | 1400-1600 | 0.20-0.24 |
| Low C Steel (CD) | 120-160 | 1500-1800 | 0.22-0.26 |
| Med C Steel (ann) | 140-180 | 1700-1950 | 0.23-0.27 |
| Med C Steel (norm) | 150-200 | 1800-2100 | 0.24-0.28 |
| High C Steel (sph) | 170-220 | 2000-2300 | 0.26-0.30 |
| 4140 Annealed | 180-220 | 1900-2200 | 0.24-0.28 |
| 4140 Q&T | 280-350 | 2400-2800 | 0.28-0.32 |
| 304 Stainless | 150-200 | 2200-2600 | 0.26-0.30 |
| 316 Stainless | 150-200 | 2300-2700 | 0.26-0.30 |
| 6061-T6 | 90-110 | 700-900 | 0.16-0.20 |
| 7075-T6 | 140-160 | 900-1100 | 0.18-0.22 |
| Ti-6Al-4V | 320-380 | 2100-2500 | 0.22-0.26 |
| Gray Cast Iron | 180-260 | 1100-1400 | 0.28-0.34 |
| Ductile Iron | 170-280 | 1300-1700 | 0.26-0.32 |

---

## TAYLOR TOOL LIFE COEFFICIENTS

### HSS Tools
| Material | C (m/min) | n |
|----------|-----------|-----|
| Low C Steel | 35-50 | 0.10-0.14 |
| Medium C Steel | 28-40 | 0.10-0.13 |
| High C Steel | 20-30 | 0.09-0.12 |
| 4140 Annealed | 25-35 | 0.10-0.13 |
| 304 Stainless | 15-22 | 0.08-0.11 |
| 6061-T6 | 150-200 | 0.15-0.20 |
| Ti-6Al-4V | 6-10 | 0.06-0.09 |

### Carbide Coated Tools
| Material | C (m/min) | n |
|----------|-----------|-----|
| Low C Steel | 280-380 | 0.25-0.32 |
| Medium C Steel | 240-320 | 0.24-0.30 |
| High C Steel | 200-280 | 0.23-0.28 |
| 4140 Annealed | 220-300 | 0.24-0.29 |
| 304 Stainless | 150-200 | 0.20-0.26 |
| 6061-T6 | 600-900 | 0.30-0.38 |
| Ti-6Al-4V | 50-80 | 0.15-0.22 |

---

## JOHNSON-COOK PARAMETER REFERENCE

| Material | A (MPa) | B (MPa) | n | C | m |
|----------|---------|---------|------|-------|-----|
| AISI 1006 | 350 | 275 | 0.36 | 0.022 | 1.0 |
| AISI 1018 | 310 | 530 | 0.26 | 0.016 | 1.0 |
| AISI 1045 | 553 | 600 | 0.23 | 0.013 | 1.0 |
| AISI 4140 Ann | 595 | 580 | 0.13 | 0.023 | 1.0 |
| AISI 4340 | 792 | 510 | 0.26 | 0.014 | 1.03 |
| 304 Stainless | 310 | 1000 | 0.65 | 0.070 | 1.0 |
| 316L Stainless | 305 | 1161 | 0.61 | 0.010 | 1.0 |
| 6061-T6 | 324 | 114 | 0.42 | 0.002 | 1.34 |
| 7075-T6 | 520 | 477 | 0.52 | 0.001 | 1.61 |
| Ti-6Al-4V | 1098 | 1092 | 0.93 | 0.014 | 1.1 |

---

## USAGE

1. Find material grade in appropriate table
2. Note condition (annealed, normalized, Q&T, etc.)
3. Copy UTS, yield, elongation, hardness
4. Use Kc1.1 lookup for cutting parameters
5. Use Taylor coefficients for tool life
6. Use J-C parameters for constitutive model

**Sources:** ASM Metals Handbook Vol 1, Machining Data Handbook 3rd Ed, MMPDS-17, Tool manufacturer catalogs



========================================
SKILL: prism-material-template
========================================
---
name: prism-material-template
description: |
  Pre-populated 127-parameter templates by material category. Provides scientifically-
  accurate default values for carbon steel, alloy steel, stainless, aluminum, etc.
  Reduces material creation time by 60%. Just modify specifics from template.
---

# PRISM Material Template Skill
## Pre-Populated 127-Parameter Templates by Material Category

---

## Purpose
Dramatically accelerate material creation by providing **category-specific templates** with scientifically-accurate default values. Just modify the specifics - 60% time savings.

---

## How To Use

1. **Identify material category** (carbon steel, alloy steel, stainless, aluminum, etc.)
2. **Copy appropriate template** from templates section below
3. **Modify only the values that differ** from the template defaults
4. **Validate** using prism-validator skill

---

## Template Categories

| Category | Template | Typical Materials |
|----------|----------|-------------------|
| P-CS | Low Carbon Steel | AISI 1005-1026 |
| P-MS | Medium Carbon Steel | AISI 1030-1055 |
| P-HS | High Carbon Steel | AISI 1060-1095 |
| P-AS | Alloy Steel | AISI 41xx, 43xx, 86xx |
| M-SS | Austenitic Stainless | 304, 316, 321 |
| M-DS | Duplex Stainless | 2205, 2507 |
| K-GI | Gray Cast Iron | Class 25-60 |
| K-DI | Ductile Iron | 60-40-18, 80-55-06 |
| N-AL | Aluminum Alloys | 6061, 7075, 2024 |
| N-CU | Copper Alloys | C36000, C17200 |
| S-NI | Nickel Superalloys | Inconel 718, 625 |
| S-TI | Titanium Alloys | Ti-6Al-4V |
| H-TS | Tool Steels | D2, H13, M2 |

---

## TEMPLATE: LOW CARBON STEEL (P-CS)
### For AISI 1005-1026, â‰¤0.25% C

```javascript
// COPY THIS TEMPLATE - Modify values marked with [MODIFY]
{
  // SECTION 1: IDENTIFICATION [MODIFY ALL]
  identification: {
    id: '[MODIFY: P-CS-XXX]',
    name: '[MODIFY: AISI XXXX]',
    alternateNames: ['[MODIFY]'],
    uns: '[MODIFY: G10XXX]',
    standard: 'ASTM A29/A29M',
    isoGroup: 'P',
    materialType: 'low_carbon_steel',
    condition: '[MODIFY: annealed/cold_drawn/hot_rolled]'
  },

  // SECTION 2: COMPOSITION [MODIFY C, Mn values]
  composition: {
    C:  { min: 0.08, max: 0.13, typical: 0.10 },  // [MODIFY]
    Mn: { min: 0.30, max: 0.60, typical: 0.45 },  // [MODIFY]
    P:  { min: 0, max: 0.040, typical: 0.015 },
    S:  { min: 0, max: 0.050, typical: 0.020 },
    Si: { min: 0, max: 0.10, typical: 0.05 },
    Fe: { min: 99.0, max: 99.5, typical: 99.3, note: 'balance' }
  },

  // SECTION 3: PHYSICAL PROPERTIES [Mostly stable for low-C steels]
  physicalProperties: {
    density: { value: 7870, unit: 'kg/mÂ³', tolerance: 'Â±0.5%' },
    meltingRange: { solidus: 1490, liquidus: 1530, unit: 'Â°C' },
    thermalConductivity: {
      values: [
        { temp: 25, k: 51.9 },
        { temp: 100, k: 51.1 },
        { temp: 200, k: 49.8 },
        { temp: 400, k: 45.2 }
      ],
      unit: 'W/(mÂ·K)'
    },
    specificHeat: {
      values: [
        { temp: 25, cp: 486 },
        { temp: 200, cp: 519 },
        { temp: 400, cp: 561 }
      ],
      unit: 'J/(kgÂ·K)'
    },
    thermalExpansion: {
      values: [
        { tempRange: '20-100Â°C', alpha: 11.7 },
        { tempRange: '20-200Â°C', alpha: 12.1 },
        { tempRange: '20-400Â°C', alpha: 13.0 }
      ],
      unit: '10â»â¶/K'
    },
    thermalDiffusivity: { value: 13.6, unit: 'mmÂ²/s', at: '25Â°C' },
    elasticModulus: { value: 200, unit: 'GPa' },
    shearModulus: { value: 80, unit: 'GPa' },
    poissonsRatio: { value: 0.29 },
    electricalResistivity: { value: 0.17, unit: 'Î¼Î©Â·m', at: '20Â°C' },
    magneticPermeability: { value: 2500, type: 'ferromagnetic' },
    hardness: { value: 105, unit: 'HB', condition: '[MODIFY]' }  // [MODIFY based on condition]
  },

  // SECTION 4: MECHANICAL PROPERTIES [MODIFY based on carbon content & condition]
  mechanicalProperties: {
    tensileStrength: { value: 370, unit: 'MPa', min: 340, max: 400 },  // [MODIFY]
    yieldStrength: { value: 250, unit: 'MPa', offset: '0.2%' },  // [MODIFY]
    elongation: { value: 30, unit: '%', gaugeLength: '50mm' },  // [MODIFY]
    reductionOfArea: { value: 60, unit: '%' },
    trueStress: { atNecking: 480, unit: 'MPa' },
    trueStrain: { atNecking: 0.24 },
    fatigueStrength: {
      rotatingBending: { value: 185, unit: 'MPa', cycles: 1e7 },
      axial: { value: 160, unit: 'MPa', R: -1 }
    },
    fatigueLimit: { value: 185, unit: 'MPa' },
    impactToughness: {
      charpy: { value: 120, unit: 'J', temperature: 20, notch: 'V-notch' },
      izod: { value: 100, unit: 'J' }
    },
    fractureToughness: { KIc: { value: 110, unit: 'MPaâˆšm' } },
    creepStrength: { value: null, unit: 'MPa', temperature: null, hours: null, note: 'Not applicable' },
    stressRupture: { value: null, unit: 'MPa', temperature: null, hours: null },
    hardenability: { Jominy: { J4: null, J8: null, J16: null, unit: 'HRC', note: 'Non-hardenable' } },
    weldability: { rating: 'EXCELLENT', preheat: null, PWHT: 'Not required' },
    formability: { bendRadius: '0.5t minimum', deepDrawing: 'EXCELLENT' }
  },

  // SECTION 5: KIENZLE [MODIFY Kc1.1 based on hardness/strength]
  kienzle: {
    tangential: {
      Kc11: { value: 1550, unit: 'N/mmÂ²', tolerance: 'Â±8%' },  // [MODIFY: ~4.2Ã—UTS for low-C]
      mc: { value: 0.22, description: 'Chip thickness exponent' }
    },
    feed: {
      Kc11: { value: 540, unit: 'N/mmÂ²' },
      mc: { value: 0.28 }
    },
    radial: {
      Kc11: { value: 390, unit: 'N/mmÂ²' },
      mc: { value: 0.25 }
    },
    corrections: {
      rakeAngle: { referenceRake: 6, factor: 1.5, note: 'per degree deviation' },
      speed: { referenceSpeed: 100, exponent: -0.07 },
      wear: { factor: 1.3, description: 'per 0.1mm VB' }
    },
    source: 'Machining Data Handbook + empirical validation',
    reliability: 'HIGH'
  },

  // SECTION 6: JOHNSON-COOK [MODIFY A, B based on yield/tensile]
  johnsonCook: {
    A: { value: 250, unit: 'MPa', description: 'Initial yield stress' },  // â‰ˆ yield strength
    B: { value: 580, unit: 'MPa', description: 'Hardening coefficient' },  // [MODIFY]
    n: { value: 0.36, description: 'Hardening exponent' },  // 0.32-0.40 for low-C
    C: { value: 0.010, description: 'Strain rate sensitivity' },
    m: { value: 0.95, description: 'Thermal softening exponent' },
    referenceStrainRate: { value: 1.0, unit: 'sâ»Â¹' },
    referenceTemperature: { value: 20, unit: 'Â°C' },
    meltingTemperature: { value: 1528, unit: 'Â°C' },
    damageParameters: {
      d1: { value: 0.10, description: 'Initial failure strain' },
      d2: { value: 1.40, description: 'Exponential factor' },
      d3: { value: -1.5, description: 'Triaxiality factor' },
      d4: { value: 0.002, description: 'Strain rate factor' },
      d5: { value: 0.60, description: 'Temperature factor' }
    },
    source: 'Literature + FEM calibration',
    reliability: 'MEDIUM-HIGH'
  },

  // SECTION 7: TAYLOR TOOL LIFE [Stable for low-C category]
  taylorToolLife: {
    hss: { C: { value: 42, unit: 'm/min' }, n: { value: 0.125 }, a: { value: 0.60 }, b: { value: 0.15 }, temperatureLimit: { value: 550, unit: 'Â°C' } },
    carbide_uncoated: { C: { value: 270, unit: 'm/min' }, n: { value: 0.25 }, temperatureLimit: { value: 900, unit: 'Â°C' } },
    carbide_coated: { C: { value: 360, unit: 'm/min' }, n: { value: 0.28 }, temperatureLimit: { value: 1000, unit: 'Â°C' } },
    ceramic: { C: { value: 600, unit: 'm/min' }, n: { value: 0.35 }, temperatureLimit: { value: 1200, unit: 'Â°C' } },
    cbn: { C: { value: null, unit: 'm/min', note: 'Not recommended' }, n: { value: null }, temperatureLimit: { value: null, unit: 'Â°C' } },
    wearRates: { flankWearLimit: { value: 0.30, unit: 'mm' }, craterWearLimit: { value: 0.15, unit: 'mm' }, notchWearLimit: { value: 0.50, unit: 'mm' } }
  },

  // SECTION 8: CHIP FORMATION [Consistent for low-C]
  chipFormation: {
    chipType: { primary: 'CONTINUOUS', secondary: 'Long, stringy' },
    shearAngle: { value: 28, unit: 'degrees', range: { min: 25, max: 32 } },
    chipCompressionRatio: { value: 2.4, range: { min: 2.1, max: 2.8 } },
    segmentationFrequency: { value: null, unit: 'kHz', condition: 'Not segmented' },
    builtUpEdge: { tendency: 'HIGH', speedRange: { min: 15, max: 60, unit: 'm/min' }, temperatureRange: { min: 200, max: 400, unit: 'Â°C' } },
    breakability: { rating: 'POOR', chipBreakerRequired: true, recommendedBreaker: 'PM or MF geometry' },
    colorAtSpeed: { slow: 'Silver/Blue', optimal: 'Light straw', high: 'Blue/Purple' },
    chipMorphology: { description: 'Long continuous spiral', image: null }
  },

  // SECTION 9: FRICTION [Consistent for low-C]
  friction: {
    toolChipInterface: { dry: { value: 0.55 }, withCoolant: { value: 0.35 }, withMQL: { value: 0.28 } },
    toolWorkpieceInterface: { dry: { value: 0.45 }, withCoolant: { value: 0.30 } },
    contactLength: { stickingZone: { ratio: 0.45 }, slidingZone: { ratio: 0.55 } },
    seizureTemperature: { value: 480, unit: 'Â°C' },
    adhesionTendency: { rating: 'HIGH', affectedTools: ['Uncoated carbide', 'HSS'] },
    abrasiveness: { rating: 'LOW', cause: 'Soft ferrite matrix' },
    diffusionWearTendency: { rating: 'MODERATE', affectedTools: ['Uncoated carbide at high speed'] }
  },

  // SECTION 10: THERMAL MACHINING [MODIFY maxRecommended if needed]
  thermalMachining: {
    cuttingTemperature: { model: 'empirical', coefficients: { a: 320, b: 0.35, c: 0.15 }, maxRecommended: { value: 650, unit: 'Â°C' } },
    heatPartition: { chip: { value: 0.75 }, tool: { value: 0.10 }, workpiece: { value: 0.10 }, coolant: { value: 0.05 } },
    coolantEffectiveness: {
      flood: { heatRemoval: 0.25, temperatureReduction: 120 },
      mist: { heatRemoval: 0.10 },
      mql: { lubrication: 0.85, cooling: 0.15 },
      cryogenic: { applicability: 'Not typically needed', benefit: null }
    },
    thermalDamageThreshold: { whiteLayer: { value: null, note: 'Low carbon - no risk' }, rehardening: { value: null }, overTempering: { value: null }, burning: { value: 850, unit: 'Â°C' } },
    preheatingBenefit: { applicable: false, recommendedTemp: null }
  },

  // SECTION 11: SURFACE INTEGRITY [Consistent for low-C]
  surfaceIntegrity: {
    residualStress: { typical: { surface: -50, subsurface: 20, unit: 'MPa' }, depth: { value: 25, unit: 'Î¼m' }, type: 'compressive at surface' },
    workHardening: { depthAffected: { value: 80, unit: 'Î¼m' }, hardnessIncrease: { value: 15, unit: '%' }, strainHardeningExponent: { value: 0.22 } },
    surfaceRoughness: {
      achievable: {
        roughing: { Ra: { min: 3.2, max: 12.5 } },
        semifinishing: { Ra: { min: 1.6, max: 3.2 } },
        finishing: { Ra: { min: 0.4, max: 1.6 } }
      },
      unit: 'Î¼m'
    },
    metallurgicalDamage: { whiteLayerRisk: 'VERY_LOW', burntSurfaceRisk: 'LOW', microcrackRisk: 'VERY_LOW', phaseTransformationRisk: 'VERY_LOW' },
    burr: { tendency: 'HIGH', type: 'rollover', mitigation: 'Sharp tools, proper feeds, deburring pass' }
  },

  // SECTION 12: MACHINABILITY [MODIFY based on actual testing]
  machinability: {
    overallRating: { grade: 'B+', percent: { value: 70, reference: 'AISI B1112 = 100%' } },  // [MODIFY]
    turningIndex: { value: 72 },
    millingIndex: { value: 68 },
    drillingIndex: { value: 65 },
    grindingIndex: { value: 80 },
    factors: { toolWear: 'LOW', surfaceFinish: 'GOOD', chipControl: 'POOR', powerRequirement: 'LOW', cuttingForces: 'MODERATE' }
  },

  // SECTION 13: RECOMMENDED PARAMETERS [MODIFY based on material]
  recommendedParameters: {
    turning: {
      roughing: { speed: { value: 180, unit: 'm/min', range: { min: 150, max: 220 } }, feed: { value: 0.30, unit: 'mm/rev', range: { min: 0.20, max: 0.40 } }, depthOfCut: { value: 3.0, unit: 'mm', max: 5.0 } },
      finishing: { speed: { value: 250, unit: 'm/min' }, feed: { value: 0.12, unit: 'mm/rev' }, depthOfCut: { value: 0.5, unit: 'mm' } }
    },
    milling: {
      roughing: { speed: 160, feedPerTooth: 0.15, ae: 0.65, ap: 4.0 },
      finishing: { speed: 220, feedPerTooth: 0.08, ae: 0.15, ap: 1.0 }
    },
    drilling: { speed: { value: 80, unit: 'm/min' }, feed: { value: 0.22, unit: 'mm/rev' }, peckDepth: { value: 3.0, unit: 'xD' } },
    threading: { speed: { value: 60, unit: 'm/min' }, infeedMethod: 'modified_flank', passes: 6 },
    toolGeometry: { rakeAngle: { value: 8, unit: 'degrees', range: { min: 5, max: 12 } }, clearanceAngle: { value: 7, unit: 'degrees' }, noseRadius: { value: 0.8, unit: 'mm' }, edgePreparation: 'honed' },
    insertGrade: { primary: 'P15-P25', coating: ['TiN', 'TiAlN', 'TiCN'], substrate: 'Submicron carbide', alternatives: ['CVD-coated', 'Cermet'] },
    coolant: { recommended: 'RECOMMENDED', type: 'flood', concentration: '6-8%', pressure: { value: 20, unit: 'bar' } },
    techniques: { hsmRecommended: true, trochoidalBenefit: 'MODERATE', adaptiveClearingBenefit: 'HIGH', specialNotes: ['Use chip breaker geometry', 'Avoid dwelling'] }
  },

  // SECTION 14: STATISTICAL DATA
  statisticalData: {
    dataPoints: { value: 150, description: 'Number of data points' },
    confidenceLevel: { value: 0.85, description: 'Statistical confidence' },
    standardDeviation: { speed: { value: 12 }, force: { value: 8 }, toolLife: { value: 18 } },
    sources: ['Machining Data Handbook 3rd Ed', 'ASM Metals Handbook Vol 16', 'Manufacturer data'],
    lastValidated: '2026-Q1',
    reliability: 'HIGH',
    crossValidated: true,
    peerReviewed: false
  }
}
```

---

## QUICK REFERENCE FORMULAS

### Kc1.1 Estimation (When handbook data unavailable)
```javascript
// For steels:
Kc11 = 3.5 Ã— UTS + 500  // Low carbon (< 0.25% C)
Kc11 = 4.0 Ã— UTS + 400  // Medium carbon (0.25-0.55% C)
Kc11 = 4.5 Ã— UTS + 300  // High carbon (> 0.55% C)
Kc11 = 5.0 Ã— UTS + 200  // Alloy steels

// For stainless:
Kc11 = 4.2 Ã— UTS + 600  // Austenitic
Kc11 = 3.8 Ã— UTS + 500  // Ferritic/Martensitic

// mc (chip thickness exponent) - typical values:
// Low carbon steel: 0.20-0.25
// Medium carbon: 0.22-0.28
// High carbon: 0.25-0.32
// Stainless: 0.25-0.30
// Aluminum: 0.15-0.22
// Titanium: 0.20-0.28
```

### Johnson-Cook A Parameter
```javascript
// A â‰ˆ Yield strength for annealed condition
// A = Yield Ã— 1.1 for cold worked
// A = Yield Ã— 0.95 for elevated temperature reference
```

### Taylor C Estimation
```javascript
// C (m/min for 1 minute tool life):
// HSS: C â‰ˆ 0.12 Ã— UTS + 20
// Carbide uncoated: C â‰ˆ 0.75 Ã— UTS + 100
// Carbide coated: C â‰ˆ 1.0 Ã— UTS + 120
// Ceramic: C â‰ˆ 1.8 Ã— UTS + 200

// n (Taylor exponent) - typical:
// HSS: 0.10-0.15
// Carbide uncoated: 0.20-0.28
// Carbide coated: 0.25-0.32
// Ceramic: 0.30-0.40
```

### Machinability Rating
```javascript
// Percent relative to AISI B1112 (free-machining steel = 100%)
// Low carbon (annealed): 55-75%
// Low carbon (cold drawn): 65-85%
// Medium carbon (annealed): 50-70%
// High carbon (annealed): 40-55%
// Alloy steels: 40-65%
// Stainless 304: 45%
// Stainless 316: 36%
// Titanium Ti-6Al-4V: 20%
// Inconel 718: 12%
```

---

## PROPERTY SCALING RULES

### As Carbon Content Increases:
| Property | Change | Formula Adjustment |
|----------|--------|-------------------|
| Hardness | â†‘ | +30 HB per 0.1% C (annealed) |
| UTS | â†‘ | +70 MPa per 0.1% C |
| Yield | â†‘ | +50 MPa per 0.1% C |
| Elongation | â†“ | -3% per 0.1% C |
| Kc1.1 | â†‘ | +100 N/mmÂ² per 0.1% C |
| Machinability | â†“ | -5% per 0.1% C |
| BUE tendency | â†“ | Decreases with C |
| Chip breakability | â†‘ | Improves with C |

### Condition Effects (vs Annealed):
| Condition | UTS | Yield | Elong | Hardness | Kc1.1 |
|-----------|-----|-------|-------|----------|-------|
| Annealed | 1.0Ã— | 1.0Ã— | 1.0Ã— | 1.0Ã— | 1.0Ã— |
| Normalized | 1.05Ã— | 1.10Ã— | 0.95Ã— | 1.08Ã— | 1.05Ã— |
| Cold Drawn | 1.20Ã— | 1.35Ã— | 0.70Ã— | 1.25Ã— | 1.15Ã— |
| Stress Relieved | 0.98Ã— | 0.95Ã— | 1.02Ã— | 0.95Ã— | 0.98Ã— |
| Quench+Temper | 1.5-2.5Ã— | 1.8-3.0Ã— | 0.4-0.7Ã— | 1.5-3.0Ã— | 1.3-1.8Ã— |

---

## END OF SKILL



========================================
SKILL: prism-material-templates
========================================
---
name: prism-material-templates
description: |
  Pre-populated 127-parameter templates by category with scientifically accurate
  default values. 60% time reduction in material creation. Only values marked
  [MODIFY] need customization. Covers all 30 material categories.
---

# PRISM Material Templates Skill
## Pre-Populated 127-Parameter Templates by Category

---

## Purpose
**60% time reduction** in material creation by providing category-specific templates with scientifically accurate default values. Only values marked [MODIFY] need customization.

---

## USAGE WORKFLOW

1. **Select template** matching material category
2. **Copy template** to new material file
3. **Modify only [MODIFY] fields** with specific values
4. **Validate** with prism-validator skill
5. **Save** to appropriate file

---

## TEMPLATE 1: LOW CARBON STEEL (P-CS)
**Use for:** AISI 1005-1025, SAE 1006-1025
**Carbon:** 0.05-0.25%

```javascript
'P-CS-[XXX]': {
  // SECTION 1: IDENTIFICATION
  identification: {
    prismId: 'P-CS-[XXX]',                    // [MODIFY]
    materialName: '[AISI XXXX description]',  // [MODIFY]
    commonNames: ['[aliases]'],               // [MODIFY]
    isoGroup: 'P',
    subCategory: 'CS',
    materialFamily: 'Carbon Steel',
    condition: 'annealed',                    // [MODIFY if different]
    source: 'ASM Metals Handbook Vol 1'
  },
  
  // SECTION 2: COMPOSITION
  composition: {
    carbon: { nominal: 0.15, min: 0.10, max: 0.20 },      // [MODIFY]
    manganese: { nominal: 0.60, min: 0.30, max: 0.90 },   // [MODIFY]
    silicon: { nominal: 0.20, min: 0.15, max: 0.35 },
    phosphorus: { max: 0.040 },
    sulfur: { max: 0.050 },
    iron: { nominal: 'balance' }
  },
  
  // SECTION 3: PHYSICAL PROPERTIES (typically stable for category)
  physicalProperties: {
    density: 7850,                    // kg/mÂ³ - stable for low C steel
    meltingPoint: { solidus: 1500, liquidus: 1530 },  // Â°C
    specificHeat: 486,                // J/(kgÂ·K)
    thermalConductivity: 51.9,        // W/(mÂ·K)
    thermalExpansion: 12.1,           // Âµm/(mÂ·K)
    electricalResistivity: 0.143,     // ÂµÎ©Â·m
    magneticPermeability: 300,        // relative
    poissonsRatio: 0.29,
    elasticModulus: 205,              // GPa
    shearModulus: 80,                 // GPa
    bulkModulus: 160,                 // GPa
    thermalDiffusivity: 13.5          // mmÂ²/s
  },
  
  // SECTION 4: MECHANICAL PROPERTIES [MODIFY all based on specific grade]
  mechanicalProperties: {
    tensileStrength: { value: 380, min: 340, max: 420, unit: 'MPa' },     // [MODIFY]
    yieldStrength: { value: 230, min: 200, max: 260, unit: 'MPa' },       // [MODIFY]
    elongation: { value: 30, min: 25, max: 35, unit: '%' },               // [MODIFY]
    reductionOfArea: { value: 55, min: 50, max: 60, unit: '%' },          // [MODIFY]
    hardness: { brinell: 110, rockwellB: 62, vickers: 115 },              // [MODIFY]
    impactStrength: { charpy: 75, unit: 'J' },                            // [MODIFY]
    fatigueStrength: { value: 180, cycles: 1e7, unit: 'MPa' },            // [MODIFY]
    fractureToughness: { value: 85, unit: 'MPaÂ·âˆšm' },
    compressiveStrength: { value: 380, unit: 'MPa' },
    shearStrength: { value: 260, unit: 'MPa' },
    bendingStrength: { value: 420, unit: 'MPa' },
    modulusOfResilience: { value: 0.13, unit: 'MJ/mÂ³' },
    modulusOfToughness: { value: 95, unit: 'MJ/mÂ³' },
    strainHardeningExponent: 0.21,
    strengthCoefficient: 680
  },
  
  // SECTION 5: KIENZLE CUTTING PARAMETERS [MODIFY Kc1.1 based on hardness]
  kienzle: {
    Kc11_tangential: { value: 1500, unit: 'N/mmÂ²' },    // [MODIFY] = 3.5Ã—UTS + 500
    Kc11_feed: { value: 525, unit: 'N/mmÂ²' },           // ~35% of tangential
    Kc11_radial: { value: 375, unit: 'N/mmÂ²' },         // ~25% of tangential
    mc_tangential: 0.22,
    mc_feed: 0.32,
    mc_radial: 0.35,
    referenceRake: 6,
    referenceSpeed: 100,
    correctionFactors: { rake: -0.015, speed: 0.07, wear: 0.3 }
  },
  
  // SECTION 6: JOHNSON-COOK PARAMETERS [MODIFY A based on yield]
  johnsonCook: {
    A: 230,           // [MODIFY] â‰ˆ yield strength
    B: 550,           // [MODIFY] = (UTS-yield)/Îµ_u^n
    n: 0.26,          // strain hardening exponent
    C: 0.015,         // strain rate sensitivity
    m: 1.0,           // thermal softening
    referenceStrainRate: 1.0,
    meltingTemperature: 1500,
    referenceTemperature: 20,
    d1: 0.05, d2: 3.44, d3: -2.12, d4: 0.002, d5: 0.61,
    fractureModel: 'Johnson-Cook',
    validStrainRange: { min: 0, max: 1.5 }
  },
  
  // SECTION 7: TAYLOR TOOL LIFE [MODIFY C values based on machinability]
  taylorToolLife: {
    HSS: { C: 40, n: 0.12, tempLimit: 600 },           // [MODIFY C]
    carbide_uncoated: { C: 240, n: 0.25, tempLimit: 900 },
    carbide_coated: { C: 320, n: 0.28, tempLimit: 1000 },
    ceramic: { C: 550, n: 0.35, tempLimit: 1400 },
    CBN: { C: 200, n: 0.40, tempLimit: 1200 },
    feedExponent: 0.6,
    depthExponent: 0.15,
    referenceToolLife: 15,
    wearCriterion: 0.3,
    confidenceLevel: 0.90
  },
  
  // SECTION 8: CHIP FORMATION
  chipFormation: {
    chipType: 'continuous',
    segmentationFrequency: 0,
    shearAngle: { min: 25, typical: 30, max: 35 },
    chipCompressionRatio: { min: 2.0, typical: 2.5, max: 3.0 },
    chipBreakability: 'fair',
    builtUpEdgeTendency: 'moderate',
    builtUpEdgeSpeedRange: { min: 15, max: 60 },
    minimumChipThickness: 0.02,
    chipCurlRadius: 3.0,
    chipFlowAngle: 5,
    stagnationZoneSize: 0.08
  },
  
  // SECTION 9: FRICTION/TRIBOLOGY
  friction: {
    toolChipCoefficient: { dry: 0.45, flooded: 0.30, MQL: 0.35 },
    toolWorkpieceCoefficient: { dry: 0.35, flooded: 0.22, MQL: 0.28 },
    adhesionTendency: 'moderate',
    galling: false,
    frictionModel: 'Coulomb-Orowan',
    stickingFraction: 0.3,
    seizureTemperature: 550,
    frictionAngle: 24.2,
    interfaceShearFactor: 0.55
  },
  
  // SECTION 10: THERMAL/MACHINING
  thermalMachining: {
    heatPartition: { chip: 0.78, tool: 0.12, workpiece: 0.10 },
    maxCuttingTemperature: 650,
    thermalSofteningOnset: 350,
    recrystallizationTemperature: 450,
    hotHardnessCoefficient: 0.0012,
    coolantEffectiveness: { emulsion: 0.35, oil: 0.25, air: 0.10 },
    specificCuttingEnergy: { min: 2.0, typical: 2.8, max: 3.5 },
    temperatureCoefficients: { a: 340, b: 0.33, c: 0.15, d: 0.08 },
    adiabaticShearSusceptibility: 'low',
    thermalCrackingSusceptibility: 'low',
    oxidationOnset: 400,
    scalingTemperature: 570
  },
  
  // SECTION 11: SURFACE INTEGRITY
  surfaceIntegrity: {
    residualStressType: 'compressive',
    residualStressDepth: 0.15,
    residualStressMagnitude: { min: -150, max: -50 },
    workHardeningDepth: 0.08,
    workHardeningIncrease: 15,
    microstructureAlteration: 'minimal',
    surfaceRoughnessAchievable: { Ra_min: 0.4, Ra_typical: 1.6 },
    whiteLaverRisk: 'none',
    burFormation: 'moderate',
    tearingTendency: 'low',
    smearingTendency: 'low'
  },
  
  // SECTION 12: MACHINABILITY RATINGS [MODIFY based on specific grade]
  machinability: {
    rating: 70,                                    // [MODIFY] % relative to B1112
    relativeToBrass: 25,
    drillabilityIndex: 72,
    grindabilityIndex: 68,
    threadingIndex: 75,
    parting: { difficulty: 'easy', chipControl: 'good' },
    overallAssessment: 'good',
    limitingFactors: ['tool_wear', 'surface_finish']
  },
  
  // SECTION 13: RECOMMENDED PARAMETERS
  recommendedParameters: {
    turning: {
      roughing: { speed: [120, 180], feed: [0.25, 0.45], depth: [2.0, 5.0] },
      finishing: { speed: [160, 220], feed: [0.08, 0.20], depth: [0.3, 1.0] }
    },
    milling: {
      roughing: { speed: [100, 160], feed: [0.15, 0.30], depth: [2.0, 6.0], width: [0.5, 0.8] },
      finishing: { speed: [140, 200], feed: [0.08, 0.15], depth: [0.2, 0.8], width: [0.3, 0.5] }
    },
    drilling: {
      standard: { speed: [25, 40], feed: [0.15, 0.35] },
      deep: { speed: [20, 35], feed: [0.10, 0.25], peckDepth: 1.0 }
    },
    threading: { speed: [15, 30], feedPerThread: 'pitch' },
    coolant: { type: 'emulsion', concentration: [5, 8], pressure: 'standard' }
  },
  
  // SECTION 14: STATISTICAL DATA
  statisticalData: {
    sampleSize: 50,
    confidenceLevel: 0.95,
    tensileStrengthStdDev: 25,
    yieldStrengthStdDev: 18,
    hardnessStdDev: 8,
    toolLifeVariability: 0.25,
    surfaceFinishVariability: 0.20,
    measurementMethod: 'ASTM E8/E384/E23'
  }
}
```

---

## TEMPLATE 2: MEDIUM CARBON STEEL (P-MS)
**Use for:** AISI 1030-1055
**Carbon:** 0.25-0.55%

```javascript
'P-MS-[XXX]': {
  identification: {
    prismId: 'P-MS-[XXX]',
    materialName: '[AISI XXXX description]',
    isoGroup: 'P',
    subCategory: 'MS',
    materialFamily: 'Carbon Steel',
    condition: 'normalized'
  },
  
  // Key differences from Low Carbon:
  physicalProperties: {
    density: 7850,
    meltingPoint: { solidus: 1480, liquidus: 1520 },  // Lower than low-C
    thermalConductivity: 49.8,                         // Slightly lower
    // ... rest similar
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 570, min: 520, max: 620 },   // Higher
    yieldStrength: { value: 340, min: 300, max: 380 },     // Higher
    elongation: { value: 20, min: 17, max: 24 },           // Lower
    hardness: { brinell: 170, rockwellB: 85 },             // Higher
    strainHardeningExponent: 0.18                          // Lower
  },
  
  kienzle: {
    Kc11_tangential: { value: 1800 },    // Higher = 4.0Ã—UTS + 400
    mc_tangential: 0.25                   // Higher
  },
  
  johnsonCook: {
    A: 340,    // Higher yield
    B: 680,    // Higher hardening
    n: 0.22    // Lower exponent
  },
  
  taylorToolLife: {
    HSS: { C: 32, n: 0.12 },             // Lower C (harder to machine)
    carbide_coated: { C: 280, n: 0.27 }
  },
  
  chipFormation: {
    chipType: 'continuous_to_segmented',
    builtUpEdgeTendency: 'moderate_high'
  },
  
  machinability: {
    rating: 55                            // Lower than low-C
  }
}
```

---

## TEMPLATE 3: HIGH CARBON STEEL (P-HS)
**Use for:** AISI 1060-1095
**Carbon:** 0.55-1.00%

```javascript
'P-HS-[XXX]': {
  identification: {
    prismId: 'P-HS-[XXX]',
    isoGroup: 'P',
    subCategory: 'HS',
    condition: 'spheroidized'            // Typically machined spheroidized
  },
  
  physicalProperties: {
    density: 7840,
    meltingPoint: { solidus: 1460, liquidus: 1495 },
    thermalConductivity: 48.5
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 680, min: 620, max: 750 },
    yieldStrength: { value: 420, min: 380, max: 460 },
    elongation: { value: 14, min: 10, max: 18 },
    hardness: { brinell: 200, rockwellC: 15 },
    strainHardeningExponent: 0.15
  },
  
  kienzle: {
    Kc11_tangential: { value: 2150 },    // = 4.5Ã—UTS + 300
    mc_tangential: 0.28
  },
  
  johnsonCook: {
    A: 420,
    B: 750,
    n: 0.18
  },
  
  taylorToolLife: {
    HSS: { C: 25, n: 0.11 },
    carbide_coated: { C: 240, n: 0.26 }
  },
  
  chipFormation: {
    chipType: 'segmented',
    builtUpEdgeTendency: 'low'           // Less sticky when hard
  },
  
  machinability: {
    rating: 45
  }
}
```

---

## TEMPLATE 4: ALLOY STEEL (P-AS)
**Use for:** AISI 4140, 4340, 8620, etc.
**Alloying:** Cr, Mo, Ni, V additions

```javascript
'P-AS-[XXX]': {
  identification: {
    prismId: 'P-AS-[XXX]',
    isoGroup: 'P',
    subCategory: 'AS',
    condition: 'annealed'
  },
  
  composition: {
    carbon: { nominal: 0.40 },
    chromium: { nominal: 1.0 },           // Alloy content
    molybdenum: { nominal: 0.25 },
    nickel: { nominal: 0.0 },             // Varies by grade
    vanadium: { nominal: 0.0 }
  },
  
  physicalProperties: {
    density: 7850,
    thermalConductivity: 42.7,            // Lower due to alloying
    thermalExpansion: 12.3
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 660, min: 600, max: 720 },
    yieldStrength: { value: 420, min: 380, max: 460 },
    hardness: { brinell: 197, rockwellC: 13 }
  },
  
  kienzle: {
    Kc11_tangential: { value: 2000 },    // = 5.0Ã—UTS + 200
    mc_tangential: 0.26
  },
  
  johnsonCook: {
    A: 420,
    B: 710,
    n: 0.20
  },
  
  taylorToolLife: {
    HSS: { C: 28, n: 0.11 },
    carbide_coated: { C: 260, n: 0.27 }
  },
  
  machinability: {
    rating: 55
  }
}
```

---

## TEMPLATE 5: AUSTENITIC STAINLESS (M-SS)
**Use for:** AISI 304, 316, 321, 347
**Key challenge:** Work hardening, gummy chips

```javascript
'M-SS-[XXX]': {
  identification: {
    prismId: 'M-SS-[XXX]',
    isoGroup: 'M',
    subCategory: 'SS',
    materialFamily: 'Austenitic Stainless Steel'
  },
  
  composition: {
    carbon: { nominal: 0.04, max: 0.08 },
    chromium: { nominal: 18.0, min: 17.0, max: 19.0 },
    nickel: { nominal: 10.0, min: 8.0, max: 12.0 },
    molybdenum: { nominal: 0.0 }          // 2.5% for 316
  },
  
  physicalProperties: {
    density: 8000,
    meltingPoint: { solidus: 1400, liquidus: 1450 },
    thermalConductivity: 16.2,            // Very low!
    thermalExpansion: 17.2,               // High!
    electricalResistivity: 0.72,
    magneticPermeability: 1.02            // Non-magnetic
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 580, min: 520, max: 650 },
    yieldStrength: { value: 280, min: 240, max: 320 },
    elongation: { value: 45, min: 40, max: 55 },
    hardness: { brinell: 170, rockwellB: 85 },
    strainHardeningExponent: 0.45         // Very high!
  },
  
  kienzle: {
    Kc11_tangential: { value: 2400 },    // High = 4.2Ã—UTS + 600
    mc_tangential: 0.28
  },
  
  johnsonCook: {
    A: 280,
    B: 1300,                              // Very high B due to work hardening
    n: 0.45
  },
  
  taylorToolLife: {
    HSS: { C: 18, n: 0.10 },              // Low C - difficult
    carbide_coated: { C: 180, n: 0.23 }
  },
  
  chipFormation: {
    chipType: 'continuous_stringy',
    builtUpEdgeTendency: 'high',
    builtUpEdgeSpeedRange: { min: 10, max: 40 }
  },
  
  thermalMachining: {
    heatPartition: { chip: 0.70, tool: 0.18, workpiece: 0.12 },  // More to tool
    maxCuttingTemperature: 700,
    coolantEffectiveness: { emulsion: 0.45 }  // Coolant critical
  },
  
  machinability: {
    rating: 45,                           // Difficult
    limitingFactors: ['work_hardening', 'heat', 'chip_control']
  },
  
  recommendedParameters: {
    turning: {
      roughing: { speed: [80, 120], feed: [0.20, 0.35] },  // Lower speed
      finishing: { speed: [100, 150], feed: [0.10, 0.20] }
    }
  }
}
```

---

## TEMPLATE 6: ALUMINUM 6XXX (N-AL)
**Use for:** 6061, 6063, 6082
**Key feature:** Excellent machinability

```javascript
'N-AL-[XXX]': {
  identification: {
    prismId: 'N-AL-[XXX]',
    isoGroup: 'N',
    subCategory: 'AL',
    materialFamily: 'Aluminum Alloy'
  },
  
  physicalProperties: {
    density: 2700,
    meltingPoint: { solidus: 580, liquidus: 650 },
    thermalConductivity: 167,             // Very high
    thermalExpansion: 23.6,               // Very high
    specificHeat: 896,
    elasticModulus: 69
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 310 },      // T6 condition
    yieldStrength: { value: 275 },
    elongation: { value: 12 },
    hardness: { brinell: 95 }
  },
  
  kienzle: {
    Kc11_tangential: { value: 800 },
    mc_tangential: 0.18
  },
  
  taylorToolLife: {
    HSS: { C: 180, n: 0.18 },
    carbide_coated: { C: 800, n: 0.35 }   // Very high speeds
  },
  
  chipFormation: {
    chipType: 'continuous_helical',
    builtUpEdgeTendency: 'moderate'
  },
  
  machinability: {
    rating: 300                           // 3x easier than B1112
  },
  
  recommendedParameters: {
    turning: {
      roughing: { speed: [300, 600], feed: [0.30, 0.60] },
      finishing: { speed: [400, 800], feed: [0.10, 0.25] }
    }
  }
}
```

---

## TEMPLATE 7: TITANIUM ALLOY (S-TI)
**Use for:** Ti-6Al-4V, Ti-6Al-2Sn-4Zr-2Mo
**Key challenge:** Heat, reactivity, springback

```javascript
'S-TI-[XXX]': {
  identification: {
    prismId: 'S-TI-[XXX]',
    isoGroup: 'S',
    subCategory: 'TI',
    materialFamily: 'Titanium Alloy'
  },
  
  physicalProperties: {
    density: 4430,
    meltingPoint: { solidus: 1604, liquidus: 1660 },
    thermalConductivity: 7.2,             // Extremely low!
    thermalExpansion: 8.6,
    elasticModulus: 114                   // Lower than steel
  },
  
  mechanicalProperties: {
    tensileStrength: { value: 950 },
    yieldStrength: { value: 880 },
    elongation: { value: 14 },
    hardness: { rockwellC: 36 }
  },
  
  kienzle: {
    Kc11_tangential: { value: 2300 },
    mc_tangential: 0.24
  },
  
  taylorToolLife: {
    HSS: { C: 8, n: 0.08 },               // Extremely low
    carbide_coated: { C: 60, n: 0.18 }
  },
  
  thermalMachining: {
    heatPartition: { chip: 0.50, tool: 0.35, workpiece: 0.15 },  // Huge tool heat
    maxCuttingTemperature: 500,           // Must stay low
    coolantEffectiveness: { flood: 0.50 }
  },
  
  machinability: {
    rating: 20,                           // Very difficult
    limitingFactors: ['heat', 'tool_wear', 'reactivity', 'springback']
  },
  
  recommendedParameters: {
    turning: {
      roughing: { speed: [35, 55], feed: [0.15, 0.30] },   // Very slow
      finishing: { speed: [45, 70], feed: [0.08, 0.15] }
    }
  }
}
```

---

## SCALING RULES

### Carbon Content Effect (per 0.1% C increase)
| Property | Change |
|----------|--------|
| Hardness (HB) | +25-30 |
| UTS | +60-80 MPa |
| Yield | +40-60 MPa |
| Elongation | -2 to -4% |
| Kc1.1 | +80-120 N/mmÂ² |
| Machinability | -4 to -6% |

### Condition Effects
| Condition | UTS Factor | Yield Factor | Hardness Factor |
|-----------|-----------|--------------|-----------------|
| Annealed (baseline) | 1.00 | 1.00 | 1.00 |
| Normalized | 1.05-1.10 | 1.08-1.15 | 1.05-1.12 |
| Cold Drawn | 1.15-1.25 | 1.25-1.40 | 1.15-1.25 |
| Q&T 400Â°C | 1.60-1.80 | 1.50-1.70 | 1.50-1.70 |
| Q&T 600Â°C | 1.25-1.40 | 1.20-1.35 | 1.25-1.35 |

### Quick Kc1.1 Estimation
```
Low Carbon (<0.25%C):   Kc11 = 3.5 Ã— UTS + 500
Medium Carbon:          Kc11 = 4.0 Ã— UTS + 400
High Carbon (>0.55%C):  Kc11 = 4.5 Ã— UTS + 300
Alloy Steel:            Kc11 = 5.0 Ã— UTS + 200
Austenitic Stainless:   Kc11 = 4.2 Ã— UTS + 600
```

---

## END OF SKILL



========================================
SKILL: prism-monolith-index
========================================
---
name: prism-monolith-index
description: |
  Pre-mapped module locations in v8.89.002 monolith (986,621 lines, ~48MB).
  Instant module location without searching. Jump directly to any of 831 modules
  by line number. Covers databases, engines, knowledge bases, and systems.
---

# PRISM Monolith Index Skill
## Pre-Mapped Module Locations in v8.89.002

---

## Purpose
**Instant module location** without searching. Use this index to jump directly to any module in the 986,621-line monolith.

---

## MONOLITH FILE LOCATION
```
C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html

Size: ~48MB
Lines: ~986,621
Modules: 831
```

---

## VERIFIED MODULE LOCATIONS

### Infrastructure & Gateway (Lines 1-30,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_GATEWAY | 11,888 | Main routing hub |
| PRISM_GATEWAY_ENHANCED | 19,043 | Enhanced routing |
| PRISM_GATEWAY_v1.5 | 20,178 | Version 1.5 |
| PRISM_CONSTANTS | ~2,500 | Core constants |
| PRISM_UNITS | ~5,200 | Unit conversion |
| PRISM_VALIDATOR | ~8,100 | Input validation |
| PRISM_EVENT_BUS | ~15,000 | Event system |

### UI Systems (Lines 30,000-80,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_UI_SYSTEM | ~35,000 | Main UI |
| PRISM_MODAL_MANAGER | ~42,000 | Modals |
| PRISM_CHARTS | ~55,000 | Visualization |
| PRISM_FORMS | ~62,000 | Form handling |

### Machine Databases (Lines 50,000-200,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_POST_MACHINE_DATABASE | 136,163 | Post machine configs |
| PRISM_LATHE_MACHINE_DB | 278,625 | Lathe specs |
| PRISM_LATHE_V2_MACHINE_DATABASE_V2 | 120,973 | Lathe V2 |
| PRISM_MACHINE_3D_DATABASE | 319,283 | 3D models |
| PRISM_MACHINE_3D_MODEL_DATABASE_V2 | 54,014 | 3D V2 |
| PRISM_MACHINE_3D_MODEL_DATABASE_V3 | 54,613 | 3D V3 |

### Engines (Lines 200,000-450,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| CAD Engines | ~200,000-250,000 | 25 engines |
| CAM Engines | ~250,000-300,000 | 20 engines |
| Physics Engines | ~300,000-380,000 | 42 engines |
| AI/ML Engines | ~380,000-450,000 | 74 engines |

### Tool Databases (Lines 450,000-550,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_TOOL_DATABASE_V7 | 467,398 | Master tools |
| PRISM_CUTTING_TOOL_DATABASE_V2 | ~485,000 | Cutting tools |
| PRISM_TOOL_HOLDER_3D_DATABASE | ~510,000 | Tool holders |

### Materials Databases (Lines 550,000-700,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_MATERIALS_MASTER | 611,225 | Master materials (618) |
| PRISM_MATERIAL_KC_DATABASE | ~580,000 | Kienzle data |
| PRISM_JOHNSON_COOK_DATABASE | ~620,000 | J-C params |
| PRISM_ENHANCED_MATERIAL_DATABASE | ~650,000 | Enhanced data |

### Post Processors (Lines 700,000-800,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_CONTROLLER_DATABASE | ~720,000 | Controllers |
| PRISM_POST_PROCESSOR_DATABASE_V2 | ~740,000 | Post configs |
| PRISM_GCODE_PARSER | ~780,000 | G-code parsing |

### Knowledge Bases (Lines 800,000-900,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_KNOWLEDGE_BASE | ~820,000 | Core KB |
| PRISM_KNOWLEDGE_GRAPH | ~850,000 | Knowledge graph |
| PRISM_ALGORITHMS_KB | ~880,000 | Algorithm KB |

### Special Machine Databases
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_OKUMA_MACHINE_CAD_DATABASE | 529,636 | Okuma CAD |

### Gateway Extensions (Lines 950,000-990,000)
| Module | Start Line | Notes |
|--------|------------|-------|
| PRISM_GATEWAY_v1.5.2 | 975,762 | Gateway update |
| PRISM_GATEWAY_v1.5.3 | 982,191 | Latest gateway |

---

## EXTRACTION WORKFLOW

### Step 1: Find Module in Index
Look up the module in this index to get approximate start line.

### Step 2: Read Initial Portion
```javascript
Desktop Commander:read_file({
  path: "C:\\PRISM REBUILD...\\PRISM_v8_89_002...html",
  offset: [START_LINE],
  length: 50
})
```

### Step 3: Find Module Boundaries
Look for:
- Start: `const PRISM_MODULE_NAME = {` or `const PRISM_MODULE_NAME = (`
- End: `};` at same indentation level, or next `const PRISM_`

### Step 4: Extract Full Module
Once boundaries identified, extract full module.

### Step 5: Save to EXTRACTED
```javascript
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\EXTRACTED\\[category]\\PRISM_MODULE_NAME.js",
  content: extractedContent
})
```

---

## SEARCH PATTERNS

### Find Module Declaration
```
const PRISM_[MODULE_NAME] = {
const PRISM_[MODULE_NAME] = (
const PRISM_[MODULE_NAME] = function
class PRISM_[MODULE_NAME]
```

### Find All Modules in Range
```javascript
Desktop Commander:start_search({
  path: "C:\\PRISM REBUILD...\\PRISM_v8_89_002...html",
  pattern: "const PRISM_",
  searchType: "content"
})
```

---

## MODULE CATEGORIES & COUNTS

| Category | Module Count | Line Range |
|----------|-------------|------------|
| Infrastructure | 31 | 1-30K |
| UI Components | 16 | 30K-80K |
| Databases | 62 | 50K-700K |
| Engines | 213 | 200K-500K |
| Knowledge Bases | 14 | 800K-900K |
| Learning | 30 | Various |
| Business | 22 | Various |
| Lookups | 20 | Various |
| Phase Modules | 46 | Various |
| Manufacturer | 44+ | Various |
| **TOTAL** | **831** | |

---

## TIPS FOR EFFICIENT EXTRACTION

1. **Use offset+length** for large file reads
2. **Read 500-1000 lines** at a time max
3. **Identify boundaries** before full extraction
4. **Verify module completeness** after extraction
5. **Update this index** with verified line numbers

---

## END OF SKILL



========================================
SKILL: prism-monolith-navigator
========================================
---
name: prism-monolith-navigator
description: |
  Navigate the 986,621-line PRISM v8.89.002 monolith. Contains structure overview and search patterns. For actual line numbers, use prism-extraction-index (500+ pre-indexed).
---

# PRISM Monolith Navigator

> âš¡ **FOR LINE NUMBERS:** Use `prism-extraction-index` (500+ modules pre-indexed)

## Monolith Location

```
Path: C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html
Size: 48.6 MB | Lines: 986,621 | Modules: 831
```

## Monolith Structure Overview

```
Lines 1-10,000:         HTML wrapper, CSS, initial setup
Lines 10,000-50,000:    Core infrastructure (Gateway, Constants, Units)
Lines 50,000-150,000:   Machine databases (CORE layer)
Lines 150,000-350,000:  More machine databases, post processors
Lines 350,000-500,000:  Tool databases, workholding
Lines 500,000-600,000:  Manufacturer-specific (Okuma, etc.)
Lines 600,000-700,000:  Materials databases
Lines 700,000-850,000:  Engines (Physics, AI/ML, Optimization)
Lines 850,000-950,000:  Knowledge bases, Learning modules
Lines 950,000-986,621:  Final integration, enhanced Gateway
```

## Finding Modules

### Method 1: Use Pre-Built Index (PREFERRED)
```
1. Read prism-extraction-index
2. Look up module name â†’ get line number instantly
3. Read module using offset
```

### Method 2: Search (Only if not in index)
```javascript
Desktop Commander:start_search({
  path: "C:\\PRISM REBUILD...\\PRISM_v8_89_002_TRUE_100_PERCENT",
  pattern: "const PRISM_MODULE_NAME",
  searchType: "content",
  contextLines: 2
})
```

### Method 3: By Region (When browsing)
Use the structure overview above to narrow down where to look.

## Search Patterns That Work

| Find | Pattern |
|------|---------|
| Module start | `const PRISM_[NAME]` |
| All databases | `const PRISM_.*_DATABASE` |
| All engines | `const PRISM_.*_ENGINE` |
| Knowledge bases | `const PRISM_.*_KB` |
| Module end | Next `const PRISM_` or `// END` marker |

## Reading Modules

```javascript
// Once you have line number from index or search:
Desktop Commander:read_file({
  path: "C:\\...\\PRISM_v8_89_002_TRUE_100_PERCENT.html",
  offset: LINE_NUMBER,
  length: 2000  // Adjust for module size
})
```

## Module Size Estimates

| Type | Typical Lines | Read Length |
|------|---------------|-------------|
| Small utility | 100-500 | 600 |
| Database (small) | 500-2,000 | 2,500 |
| Database (large) | 2,000-10,000 | 12,000 |
| Engine | 200-5,000 | 6,000 |
| Knowledge Base | 5,000-50,000 | sections |

## Important Notes

1. **Multiple versions exist** - Some modules (like GATEWAY) appear multiple times. Usually want highest line number (latest).

2. **Update the index** - When you find new modules, add them to prism-extraction-index.

3. **Use index first** - Searching takes 30+ seconds, index lookup is instant.

## Integration

| Skill | Relationship |
|-------|--------------|
| prism-extraction-index | Pre-built line numbers (USE THIS FIRST) |
| prism-extractor | Extraction workflow |
| prism-tool-selector | Which tools to use |



========================================
SKILL: prism-physics-formulas
========================================
---
name: prism-physics-formulas
description: |
  Validated manufacturing calculation formulas from MIT/Stanford courses. Covers
  Kienzle cutting force, Johnson-Cook constitutive model, Taylor tool life,
  thermal analysis, and stability lobes. Source: MIT 2.810, 2.003, 6.867.
---

# PRISM Physics & Formulas Reference Skill
## Manufacturing Calculations from MIT/Stanford Courses

---

## Purpose
**Instant access to validated formulas** for cutting force, thermal, tool life, stability, and optimization calculations. All formulas derived from MIT 2.810, 2.003, 6.867, and related courses.

---

## 1. CUTTING FORCE MODELS

### 1.1 Kienzle Force Model (Primary)
```
Source: VDI 3323, MIT 2.810

Fc = Kc1.1 Ã— b Ã— h^(1-mc) Ã— KÎ³ Ã— Kv Ã— Kw

Where:
  Fc = Cutting force [N]
  Kc1.1 = Specific cutting force at h=1mm, b=1mm [N/mmÂ²]
  b = Width of cut [mm]
  h = Undeformed chip thickness [mm]
  mc = Chip thickness exponent (0.15-0.40)
  
Correction factors:
  KÎ³ = Rake angle correction = 1 - (Î³ - Î³â‚€) Ã— 0.015
      Î³ = actual rake angle, Î³â‚€ = reference (typically 6Â°)
  Kv = Speed correction = (vâ‚€/v)^0.07
      vâ‚€ = reference speed (100 m/min)
  Kw = Wear correction = 1 + 3 Ã— VB
      VB = flank wear [mm]

Three components:
  Fc (tangential) = Primary cutting force
  Ff (feed) = Typically 0.3-0.5 Ã— Fc
  Fp (radial) = Typically 0.2-0.4 Ã— Fc
```

### 1.2 Merchant's Force Model
```
Source: MIT 2.810, Merchant 1945

Fc = (Ï„s Ã— As) / (cos(Ï† - Î³) Ã— cos(Î² - Î³ + Ï†))

Where:
  Ï„s = Shear strength of workpiece [MPa]
  As = Shear plane area = b Ã— h / sin(Ï†)
  Ï† = Shear angle [degrees]
  Î³ = Rake angle [degrees]
  Î² = Friction angle = arctan(Î¼)
  Î¼ = Coefficient of friction

Shear angle (Merchant):
  Ï† = 45Â° + Î³/2 - Î²/2

Lee-Shaffer modification:
  Ï† = 45Â° + Î³ - Î²
```

### 1.3 Specific Energy Method
```
Source: MIT 2.810

Power = Fc Ã— v / 60,000 [kW]

Specific energy:
  u = Fc / (b Ã— h) [J/mmÂ³]
  
Power from MRR:
  Power = u Ã— MRR [kW]
  MRR = v Ã— f Ã— ap Ã— 1000 [mmÂ³/min]
```

---

## 2. THERMAL MODELS

### 2.1 Cutting Temperature (Empirical)
```
Source: MIT 2.51, Shaw

Tcut = Tâ‚€ + K Ã— v^a Ã— f^b Ã— ap^c

Typical coefficients for steel:
  K = 320-400
  a = 0.30-0.40
  b = 0.10-0.20
  c = 0.05-0.10

More detailed:
  Tmax = Tâ‚€ + (0.4 Ã— Ï„s Ã— Î³ Ã— v) / (Ï Ã— c Ã— Î»)^0.5

Where:
  Ï„s = Shear strength [MPa]
  Î³ = Shear strain
  Ï = Density [kg/mÂ³]
  c = Specific heat [J/kgÂ·K]
  Î» = Thermal conductivity [W/mÂ·K]
```

### 2.2 Heat Partition
```
Source: MIT 2.55, Trigger & Chao

Heat to chip: Qchip = 0.70-0.85 (increases with speed)
Heat to tool: Qtool = 0.05-0.15
Heat to workpiece: Qwork = 0.05-0.15
Heat removed by coolant: Qcoolant = 0.05-0.25

Approximation:
  Qchip/Qtotal = 1 - 1/(1 + (Ïw Ã— cw Ã— Î»w)/(Ïc Ã— cc Ã— Î»c))^0.5
```

### 2.3 Tool-Chip Interface Temperature
```
Source: Boothroyd

Tinterface = Tshear + Î”Tfriction

Î”Tfriction = (Î¼ Ã— Fn Ã— Vc) / (A Ã— k Ã— Ï Ã— c)^0.5

For coated tools - coating effect:
  Tcoating = Tsubstrate - (q Ã— t) / kcoating
  
Where:
  t = coating thickness [Î¼m]
  kcoating = coating thermal conductivity
```

---

## 3. TOOL LIFE MODELS

### 3.1 Extended Taylor Equation
```
Source: MIT 2.810, Taylor 1907 + extensions

Basic Taylor:
  V Ã— T^n = C

Extended Taylor:
  V Ã— T^n Ã— f^a Ã— ap^b = C

Where:
  V = Cutting speed [m/min]
  T = Tool life [min]
  f = Feed [mm/rev]
  ap = Depth of cut [mm]
  
Typical exponents:
  n: HSS=0.10-0.15, Carbide=0.20-0.30, Ceramic=0.30-0.45
  a: 0.50-0.80
  b: 0.10-0.20

Solving for tool life:
  T = (C / (V Ã— f^a Ã— ap^b))^(1/n)
```

### 3.2 Tool Wear Rate Models
```
Source: MIT 2.810

Flank wear rate (Usui equation):
  dVB/dt = A Ã— Ïƒn Ã— Vs Ã— exp(-B/T)

Where:
  VB = Flank wear [mm]
  Ïƒn = Normal stress on flank [MPa]
  Vs = Sliding velocity [m/min]
  T = Interface temperature [K]
  A, B = Material constants

Crater wear rate:
  dKT/dt = C Ã— exp(-Q/(RÃ—T)) Ã— (diffusion controlled)

Total wear:
  VBtotal = VBabrasive + VBadhesive + VBdiffusion + VBchemical
```

### 3.3 Minimum Cost/Time Optimization
```
Source: MIT 15.060, 6.046J

Minimum cost speed:
  Vopt_cost = C Ã— ((1-n)/(n Ã— (Ct/Cm + tc)))^n

Minimum time speed:
  Vopt_time = C Ã— ((1-n)/(n Ã— tc))^n

Where:
  Ct = Tool cost per edge [$]
  Cm = Machine cost per minute [$/min]
  tc = Tool change time [min]
```

---

## 4. STABILITY & CHATTER

### 4.1 Stability Lobe Diagram
```
Source: MIT 2.032, Tlusty

Critical depth of cut (regenerative chatter):
  blim = -1 / (2 Ã— Ks Ã— Re[G(jÏ‰c)])

Where:
  Ks = Specific cutting stiffness [N/mmÂ²]
  G(jÏ‰c) = Transfer function at chatter frequency
  
Stability boundary:
  n = 60 Ã— Ï‰c / (2Ï€ Ã— N Ã— (k + 2Ï€))
  
Where:
  n = Spindle speed [rpm]
  N = Number of teeth
  k = Integer lobe number (0, 1, 2, ...)
  Ï‰c = Chatter frequency [rad/s]
```

### 4.2 Transfer Function Approach
```
Source: MIT 6.011

Single DOF:
  G(s) = 1 / (m Ã— sÂ² + c Ã— s + k)
  
Natural frequency:
  Ï‰n = âˆš(k/m)
  
Damping ratio:
  Î¶ = c / (2 Ã— âˆš(k Ã— m))

For machine tool:
  Compliance = 1 / k_static
  Dynamic stiffness at Ï‰: |k_dynamic| = k Ã— |1 - (Ï‰/Ï‰n)Â² + 2jÎ¶(Ï‰/Ï‰n)|
```

### 4.3 Process Damping Effect
```
Source: Altintas, MIT 2.032

At low speeds, process damping stabilizes:
  Cd = Î¼ Ã— Kf Ã— l / v

Where:
  Î¼ = Process damping coefficient (~0.05-0.15)
  Kf = Feed force coefficient
  l = Cutting edge contact length
  v = Cutting speed

Process damping significant when:
  v < 50-100 m/min (approximately)
```

---

## 5. SURFACE FINISH MODELS

### 5.1 Theoretical Surface Roughness
```
Source: MIT 2.810

Turning (single point):
  Ra_ideal = fÂ² / (32 Ã— r)
  Rt_ideal = fÂ² / (8 Ã— r)

Where:
  f = Feed per revolution [mm/rev]
  r = Nose radius [mm]

For sharp tool:
  Rt = f Ã— tan(Îºr) Ã— tan(Îºr') / (tan(Îºr) + tan(Îºr'))
```

### 5.2 Practical Surface Roughness
```
Source: Empirical + MIT 2.810

Ra_actual = Ra_ideal Ã— Kv Ã— Km Ã— Kt Ã— Kw

Correction factors:
  Kv = Speed factor (decreases with speed, typically 0.8-1.2)
  Km = Material factor (ductile materials rougher)
  Kt = Tool condition (increases with wear)
  Kw = Workpiece rigidity

Milling:
  Ra = (f_zÂ² Ã— (ae/D)) / (8 Ã— r) Ã— âˆš(1 + (2r/D))
```

### 5.3 Surface Integrity Parameters
```
Source: MIT 2.810, Field

Residual stress (turning):
  Ïƒresidual = -k1 Ã— (Fc / (f Ã— ap)) + k2 Ã— T

Work hardening depth:
  dhardened = k Ã— (Fc/f)^0.5

White layer depth (hardened steel):
  dwhite = Î± Ã— v^0.3 Ã— f^0.2 Ã— exp(T/T_critical)
```

---

## 6. CHIP FORMATION

### 6.1 Shear Angle Prediction
```
Source: MIT 2.810

Merchant:
  Ï† = 45 + Î³/2 - Î²/2

Lee-Shaffer:
  Ï† = 45 + Î³ - Î²

Oxley (strain-rate dependent):
  Ï† = function(strain hardening, strain rate sensitivity)

Where:
  Î² = arctan(Î¼) = friction angle
  Î³ = rake angle
```

### 6.2 Chip Compression Ratio
```
Source: MIT 2.810

rc = t1 / t2 = sin(Ï†) / cos(Ï† - Î³)

Where:
  t1 = Undeformed chip thickness
  t2 = Actual chip thickness
  
Typical values:
  Low carbon steel: 2.0-3.0
  High carbon steel: 1.5-2.5
  Aluminum: 2.5-4.0
  Titanium: 1.2-2.0
```

### 6.3 Built-Up Edge Prediction
```
Source: MIT 2.810

BUE occurs when:
  200Â°C < T_interface < 400Â°C (steel)
  AND adhesion tendency is high
  AND speed is low (typically 15-60 m/min)

BUE height:
  h_BUE = k Ã— (1/v)^0.5 Ã— f^0.3
  
Prevention:
  Increase speed above critical
  Use coated tools (reduced adhesion)
  Apply proper coolant
```

---

## 7. OPTIMIZATION ALGORITHMS

### 7.1 Particle Swarm Optimization (PSO)
```
Source: MIT 6.867

Update equations:
  v_i(t+1) = w Ã— v_i(t) + c1 Ã— r1 Ã— (p_best_i - x_i) + c2 Ã— r2 Ã— (g_best - x_i)
  x_i(t+1) = x_i(t) + v_i(t+1)

Parameters:
  w = Inertia weight (0.4-0.9, typically decreasing)
  c1 = Cognitive parameter (1.5-2.5)
  c2 = Social parameter (1.5-2.5)
  
For cutting parameters:
  Objective: Minimize cost OR time OR maximize MRR
  Constraints: Power, force, surface finish, stability
```

### 7.2 Genetic Algorithm
```
Source: MIT 6.034

For cutting optimization:
  Chromosome = [V, f, ap, tool_code]
  
Fitness function:
  f = w1 Ã— (1/cost) + w2 Ã— (1/time) + w3 Ã— MRR - penalties

Operations:
  Selection: Tournament or roulette
  Crossover: Single/two-point (rate: 0.7-0.9)
  Mutation: Random perturbation (rate: 0.01-0.1)
```

### 7.3 Bayesian Optimization
```
Source: MIT 6.867

For expensive function optimization:
  
Gaussian Process model:
  f(x) ~ GP(m(x), k(x,x'))

Acquisition function (Expected Improvement):
  EI(x) = (Î¼(x) - f_best) Ã— Î¦(Z) + Ïƒ(x) Ã— Ï†(Z)
  Z = (Î¼(x) - f_best) / Ïƒ(x)

Application:
  Best for tuning with limited trials
  Good for noisy objectives (tool life)
```

---

## 8. JOHNSON-COOK CONSTITUTIVE MODEL

### 8.1 Flow Stress
```
Source: MIT 2.002, Johnson & Cook 1983

Ïƒ = [A + B Ã— Îµ^n] Ã— [1 + C Ã— ln(ÎµÌ‡*)] Ã— [1 - T*^m]

Where:
  A = Yield stress [MPa]
  B = Hardening modulus [MPa]
  n = Hardening exponent
  C = Strain rate coefficient
  m = Thermal softening exponent
  Îµ = Equivalent plastic strain
  ÎµÌ‡* = ÎµÌ‡/ÎµÌ‡â‚€ (normalized strain rate)
  T* = (T - T_room)/(T_melt - T_room)
```

### 8.2 Damage Model
```
Source: Johnson & Cook 1985

Damage parameter:
  D = Î£(Î”Îµ / Îµf)

Fracture strain:
  Îµf = [d1 + d2 Ã— exp(d3 Ã— Ïƒ*)] Ã— [1 + d4 Ã— ln(ÎµÌ‡*)] Ã— [1 + d5 Ã— T*]

Where:
  Ïƒ* = Ïƒm/Ïƒeq (stress triaxiality)
  d1-d5 = Material damage constants

Failure when D = 1
```

---

## 9. QUICK REFERENCE TABLES

### Force Calculation Quick Reference
| Material | Kc1.1 (N/mmÂ²) | mc | Speed Factor |
|----------|---------------|-----|--------------|
| Low C Steel | 1400-1600 | 0.20-0.24 | (100/v)^0.07 |
| Med C Steel | 1600-1900 | 0.22-0.28 | (100/v)^0.08 |
| High C Steel | 1900-2300 | 0.25-0.32 | (100/v)^0.09 |
| Alloy Steel | 1700-2200 | 0.24-0.30 | (100/v)^0.08 |
| Stainless 304 | 2100-2400 | 0.26-0.32 | (100/v)^0.10 |
| Titanium | 1400-1800 | 0.20-0.28 | (100/v)^0.05 |
| Aluminum | 700-900 | 0.15-0.22 | (100/v)^0.05 |
| Inconel 718 | 3500-4500 | 0.28-0.36 | (100/v)^0.12 |

### Taylor Constants Quick Reference
| Tool Type | n Range | C Range (steel) |
|-----------|---------|-----------------|
| HSS | 0.10-0.15 | 30-60 m/min |
| Carbide P20 | 0.20-0.28 | 200-350 m/min |
| Carbide P10 | 0.22-0.30 | 250-400 m/min |
| Coated Carbide | 0.25-0.32 | 300-500 m/min |
| Cermet | 0.28-0.35 | 350-550 m/min |
| Ceramic | 0.30-0.45 | 400-800 m/min |
| CBN | 0.35-0.50 | 100-300 m/min |

---

## END OF SKILL



========================================
SKILL: prism-physics-reference
========================================
---
name: prism-physics-reference
description: |
  Manufacturing formulas and algorithms quick reference. Instant lookup for
  cutting mechanics, tool life, thermal analysis, and optimization.
  Validated from MIT/Stanford courses and manufacturing literature.
---

# PRISM Physics Reference Skill
## Manufacturing Formulas & Algorithms Quick Reference

---

## Purpose
**Instant formula lookup** for cutting mechanics, tool life, thermal analysis, and optimization. Derived from MIT/Stanford course material and validated manufacturing literature.

---

## 1. CUTTING FORCE MODELS

### 1.1 Kienzle Force Model (Primary)
```
Source: VDI 3323, MIT 2.810
Most reliable for general machining

Fc = kc Ã— A = kc1.1 Ã— h^(-mc) Ã— b Ã— h
   = kc1.1 Ã— h^(1-mc) Ã— b

Where:
  Fc  = Cutting force (N)
  kc  = Specific cutting force (N/mmÂ²)
  kc1.1 = Unit specific cutting force at h=1mm, b=1mm
  h   = Chip thickness (mm) = f Ã— sin(Îºr)
  b   = Width of cut (mm) = ap / sin(Îºr)
  mc  = Chip thickness exponent (0.15-0.40)
  Îºr  = Tool entering angle (degrees)
  f   = Feed rate (mm/rev)
  ap  = Depth of cut (mm)

Correction Factors:
  kc_corrected = kc1.1 Ã— KÎ³ Ã— Kv Ã— KVB Ã— KÎ» Ã— KÎº

  KÎ³ = 1 - (Î³ - Î³ref)/100     (rake angle correction, ~1.5%/degree)
  Kv = (v/vref)^(-0.07)       (speed correction)
  KVB = 1 + 0.3 Ã— VB/0.1      (wear correction, per 0.1mm VB)
  KÎ» = varies                  (inclination angle)
  KÎº = varies                  (entering angle)
```

### 1.2 Merchant's Force Model (Orthogonal)
```
Source: MIT 2.810, Merchant 1945

For orthogonal cutting theory:

Fc = Ï„s Ã— Ac / (sin(Ï†) Ã— cos(Ï† + Î² - Î³))

Where:
  Ï„s = Shear strength of material (MPa)
  Ac = Chip cross-section (mmÂ²)
  Ï†  = Shear angle (degrees)
  Î²  = Friction angle = arctan(Î¼)
  Î³  = Rake angle (degrees)
  Î¼  = Coefficient of friction

Shear Angle (Merchant):
  Ï† = 45Â° + Î³/2 - Î²/2

Shear Angle (Lee-Shaffer):
  Ï† = 45Â° + Î³ - Î²

Chip Thickness Ratio:
  r = t/tc = sin(Ï†) / cos(Ï† - Î³)
  
  Where:
    t  = Uncut chip thickness
    tc = Chip thickness
```

### 1.3 Extended Kienzle (3D Cutting)
```
Tangential Force:  Fc = kc1.1 Ã— h^(1-mc) Ã— b
Feed Force:        Ff = kf1.1 Ã— h^(1-mf) Ã— b  
Radial Force:      Fr = kr1.1 Ã— h^(1-mr) Ã— b

Typical ratios (for steel):
  Ff â‰ˆ 0.35-0.50 Ã— Fc
  Fr â‰ˆ 0.25-0.35 Ã— Fc

Total Force:
  F = âˆš(FcÂ² + FfÂ² + FrÂ²)
```

---

## 2. TOOL LIFE MODELS

### 2.1 Taylor's Equation (Primary)
```
Source: F.W. Taylor 1907, MIT 2.810

Basic Form:
  V Ã— T^n = C

Extended Taylor:
  V Ã— T^n Ã— f^a Ã— ap^b = C_ext

Where:
  V   = Cutting speed (m/min)
  T   = Tool life (min)
  n   = Taylor exponent (material/tool dependent)
  C   = Taylor constant (speed for T=1 min)
  f   = Feed rate (mm/rev)
  ap  = Depth of cut (mm)
  a,b = Feed and depth exponents

Solving for Tool Life:
  T = (C/V)^(1/n)

Typical n values:
  HSS:             0.10-0.15
  Carbide uncoated: 0.20-0.28
  Carbide coated:   0.25-0.32
  Ceramic:          0.30-0.40
  CBN:              0.35-0.50
```

### 2.2 VB Wear Progression
```
Flank Wear Model:
  VB(t) = VB_i + K_w Ã— V^a Ã— f^b Ã— t

Breakin-Steady-Rapid Model:
  VB(t) = { 
    Phase 1 (Breakin):  VB_0 + Î±Ã—t^0.5      (t < t1)
    Phase 2 (Steady):   VB_1 + Î²Ã—t          (t1 < t < t2)
    Phase 3 (Rapid):    VB_2 + Î³Ã—exp(Î´Ã—t)   (t > t2)
  }

Tool Life Criterion:
  T = time when VB reaches VB_max (typically 0.3-0.4 mm)
```

---

## 3. JOHNSON-COOK CONSTITUTIVE MODEL

### 3.1 Flow Stress Equation
```
Source: Johnson & Cook 1983, MIT 2.810

Ïƒ = [A + BÃ—Îµ^n] Ã— [1 + CÃ—ln(ÎµÌ‡*)] Ã— [1 - T*^m]

Where:
  Ïƒ   = Flow stress (MPa)
  Îµ   = Equivalent plastic strain
  ÎµÌ‡*  = Normalized strain rate = ÎµÌ‡/ÎµÌ‡_0
  T*  = Homologous temperature = (T - T_room)/(T_melt - T_room)
  
Parameters:
  A = Initial yield stress (MPa)
  B = Strain hardening coefficient (MPa)
  n = Strain hardening exponent
  C = Strain rate sensitivity coefficient
  m = Thermal softening exponent
  ÎµÌ‡_0 = Reference strain rate (typically 1.0 sâ»Â¹)
```

### 3.2 Estimating J-C Parameters
```
From tensile test data:

A â‰ˆ Ïƒ_y (yield strength at reference conditions)

B â‰ˆ (Ïƒ_UTS - Ïƒ_y) / Îµ_u^n
  where Îµ_u = uniform strain â‰ˆ n

n â‰ˆ ln(Ïƒ_UTS/Ïƒ_y) / ln(Îµ_u)
  or from strain hardening curve fit

C â‰ˆ 0.01-0.02 for most metals

m â‰ˆ 0.8-1.2 for steels
```

---

## 4. THERMAL MODELS

### 4.1 Cutting Temperature
```
Source: MIT 2.810, Boothroyd

Average Chip Temperature:
  Î¸_chip = Î¸_amb + C_temp Ã— V^a Ã— f^b Ã— ap^c

Typical values:
  C_temp = 300-400 (constant)
  a = 0.30-0.40
  b = 0.10-0.20
  c = 0.05-0.10

Heat Partition:
  Chip:      70-80%
  Tool:      10-20%
  Workpiece: 5-15%
```

---

## 5. SURFACE FINISH MODELS

### 5.1 Theoretical Surface Roughness
```
Turning (Ideal):
  Ra = fÂ² / (32 Ã— r_Îµ)
  Rt = fÂ² / (8 Ã— r_Îµ)

Where:
  Ra = Average roughness (Î¼m)
  Rt = Peak-to-valley (Î¼m)
  f  = Feed per revolution (mm/rev)
  r_Îµ = Nose radius (mm)

Practical:
  Ra_actual = Ra_theoretical Ã— (1 + k_BUE + k_vib + k_wear)
```

---

## 6. POWER & TORQUE

### 6.1 Cutting Power
```
Power (kW):
  P = Fc Ã— V / 60000

From MRR:
  P = MRR Ã— u_s / 60

Where:
  MRR = Material removal rate (mmÂ³/min)
  u_s = Specific cutting energy (J/mmÂ³)

Typical u_s values:
  Aluminum:     0.4-0.8 J/mmÂ³
  Carbon steel: 2.0-4.0 J/mmÂ³
  Stainless:    3.0-5.0 J/mmÂ³
  Titanium:     3.5-5.5 J/mmÂ³
  Nickel alloy: 4.0-6.0 J/mmÂ³
```

---

## 7. QUICK REFERENCE TABLES

### Material Coefficients
| Material | Kc1.1 (N/mmÂ²) | mc | n (Taylor) | u_s (J/mmÂ³) |
|----------|---------------|-----|------------|-------------|
| Low C Steel | 1400-1600 | 0.20-0.24 | 0.25-0.28 | 2.5-3.5 |
| Med C Steel | 1600-1900 | 0.22-0.28 | 0.23-0.26 | 3.0-4.0 |
| High C Steel | 1900-2300 | 0.25-0.32 | 0.20-0.24 | 3.5-4.5 |
| Alloy Steel | 1800-2400 | 0.24-0.30 | 0.22-0.26 | 3.0-4.5 |
| Stainless 304 | 2200-2600 | 0.25-0.30 | 0.20-0.24 | 3.5-4.5 |
| Stainless 316 | 2400-2800 | 0.26-0.32 | 0.18-0.22 | 4.0-5.0 |
| Gray Iron | 1100-1400 | 0.22-0.28 | 0.25-0.30 | 1.5-2.5 |
| Al 6061 | 700-900 | 0.15-0.20 | 0.30-0.40 | 0.5-0.8 |
| Al 7075 | 850-1050 | 0.18-0.22 | 0.28-0.35 | 0.6-1.0 |
| Ti-6Al-4V | 2100-2500 | 0.20-0.28 | 0.15-0.20 | 4.0-5.5 |
| Inconel 718 | 3500-4500 | 0.25-0.32 | 0.10-0.15 | 5.0-7.0 |

### Unit Conversions
| From | To | Multiply by |
|------|-----|-------------|
| m/min | sfm | 3.281 |
| mm/rev | ipr | 0.03937 |
| mm | inch | 0.03937 |
| N | lbf | 0.2248 |
| MPa | ksi | 0.1450 |
| kW | HP | 1.341 |

---

## END OF SKILL



========================================
SKILL: prism-planning
========================================
---
name: prism-planning
description: |
  PRISM session planning and brainstorming skill. Adapted from obra/superpowers for
  manufacturing intelligence development. Use when: starting new extraction sessions,
  planning batch operations, designing module architecture, or making major decisions.
  Enforces structured planning BEFORE any implementation. Triggers: starting new
  session, planning extraction, designing architecture, batch operations, major decisions.
---

# PRISM PLANNING SKILL v1.0
## Structured Planning Before Implementation
### Adapted from obra/superpowers for manufacturing intelligence

---

## CORE PRINCIPLE

**NEVER START CODING WITHOUT A PLAN.**

Every PRISM session should have:
1. Clear objectives (what we're building)
2. Defined scope (what's included/excluded)
3. Success criteria (how we know it's done)
4. Risk assessment (what could go wrong)
5. Rollback plan (how to recover)

---

## ðŸ§  BRAINSTORMING PROTOCOL

### When to Use
- Starting a new extraction session
- Designing a new module or database
- Making architectural decisions
- Changing existing patterns

### Brainstorm Structure

```markdown
## ðŸŽ¯ OBJECTIVE
What are we trying to accomplish?

## ðŸ“‹ REQUIREMENTS
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## ðŸ”„ OPTIONS CONSIDERED
| Option | Pros | Cons | Risk |
|--------|------|------|------|
| A      |      |      |      |
| B      |      |      |      |
| C      |      |      |      |

## âœ… SELECTED APPROACH
Which option and why?

## âš ï¸ RISKS & MITIGATIONS
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
|      |             |        |            |

## ðŸ“Š SUCCESS CRITERIA
- [ ] Criterion 1 (measurable)
- [ ] Criterion 2 (measurable)

## ðŸ”™ ROLLBACK PLAN
If things go wrong, how do we recover?
```

---

## ðŸ“ WRITE-PLAN PROTOCOL

### Session Plan Template

```markdown
# SESSION [ID] PLAN
**Date:** [DATE]
**Duration:** Estimated [X] exchanges
**Status:** PLANNING â†’ IN_PROGRESS â†’ COMPLETE

## 1. OBJECTIVES
Primary: [main goal]
Secondary: [supporting goals]

## 2. SCOPE
### IN SCOPE
- Item 1
- Item 2

### OUT OF SCOPE
- Item A (will do in session Y)
- Item B (not needed)

## 3. TASKS (ordered)
| # | Task | Est. Tool Calls | Dependencies | Checkpoint? |
|---|------|-----------------|--------------|-------------|
| 1 | Read state | 1 | None | No |
| 2 | [Task] | 3 | Task 1 | Yes |
| 3 | [Task] | 5 | Task 2 | Yes |

## 4. CHECKPOINTS
- After Task 2: Save intermediate progress
- After Task 4: Update CURRENT_STATE.json
- At RED ZONE: Stop and save

## 5. SUCCESS CRITERIA
- [ ] [Specific, measurable outcome 1]
- [ ] [Specific, measurable outcome 2]
- [ ] State file updated
- [ ] Session log written

## 6. RISK MITIGATION
- Context compaction: Use chunked writes, frequent saves
- File corruption: Verify after each write
- Tool failure: Have fallback commands ready
```

---

## â–¶ï¸ EXECUTE-PLAN PROTOCOL

### Execution Rules

1. **Work through tasks in ORDER**
   - Don't skip ahead
   - Don't start Task N+1 until Task N passes verification

2. **Checkpoint at every marked task**
   - Update CURRENT_STATE.json
   - Verify files saved
   - Announce progress

3. **Handle deviations**
   - If task takes longer than estimated: Update plan
   - If blocker found: Document, decide to proceed or stop
   - If better approach discovered: Complete current task, then reassess

### Execution Checklist

```
â˜ Plan approved by user?
â˜ State file read?
â˜ Starting from correct checkpoint?

FOR EACH TASK:
  â˜ Announce: "Starting Task [N]: [description]"
  â˜ Execute task
  â˜ Verify result
  â˜ If checkpoint: Save state
  â˜ Announce: "âœ“ Task [N] complete"

AT SESSION END:
  â˜ All tasks complete OR graceful stop?
  â˜ State file updated?
  â˜ Session log written?
  â˜ Next session planned?
```

---

## ðŸ”„ RETROSPECTIVE PROTOCOL

### At Session End

```markdown
## SESSION [ID] RETROSPECTIVE

### âœ… WHAT WENT WELL
- [Success 1]
- [Success 2]

### âš ï¸ WHAT COULD IMPROVE
- [Issue 1] â†’ [Improvement]
- [Issue 2] â†’ [Improvement]

### ðŸ“Š METRICS
- Tasks planned: [N]
- Tasks completed: [M]
- Tool calls used: [X]
- Files created: [Y]
- Time estimate accuracy: [%]

### ðŸ’¡ LEARNINGS
- [Learning 1] â†’ Add to skills?
- [Learning 2] â†’ Update protocol?

### âž¡ï¸ NEXT SESSION
- ID: [NEXT_ID]
- Focus: [description]
- Carryover: [anything unfinished]
```

---

## INTEGRATION WITH PRISM WORKFLOW

### Session Start
```
1. Read CURRENT_STATE.json
2. Check quickResume for continuation
3. If NEW session: Run BRAINSTORM
4. Create/review SESSION PLAN
5. Get user approval
6. Begin EXECUTE-PLAN
```

### Session End
```
1. Verify all checkpoints saved
2. Run RETROSPECTIVE
3. Update CURRENT_STATE.json with:
   - completedSessions entry
   - nextSession details
   - quickResume instructions
4. Write session log
```

---

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Starting extraction without reading state
âŒ Making major changes without discussing options
âŒ Working past RED ZONE without saving
âŒ Skipping checkpoints to "save time"
âŒ Not verifying files after writing
âŒ Starting next task before current passes
âŒ Ending session without retrospective

---

## PRISM-SPECIFIC PLANNING PATTERNS

### For Material Database Sessions
```
1. BRAINSTORM: Which materials? What parameters?
2. PLAN: 10 materials per file, checkpoint every 3
3. EXECUTE: Template â†’ Customize â†’ Validate â†’ Save
4. RETROSPECTIVE: Coverage, accuracy, time per material
```

### For Module Extraction Sessions
```
1. BRAINSTORM: Which modules? Dependencies?
2. PLAN: Extract in dependency order
3. EXECUTE: Locate â†’ Extract â†’ Audit â†’ Document
4. RETROSPECTIVE: Completeness, consumer count
```

### For Architecture Sessions
```
1. BRAINSTORM: Options, tradeoffs, 10 Commandments alignment
2. PLAN: Design document, review points
3. EXECUTE: Draft â†’ Review â†’ Refine â†’ Document
4. RETROSPECTIVE: Decision quality, future flexibility
```

---

**END OF PRISM PLANNING SKILL**



========================================
SKILL: prism-python-tools
========================================
---
name: prism-python-tools
description: |
  Complete Python automation toolkit for PRISM development with 37 scripts across
  6 categories: core utilities, state management, validation, extraction, batch
  processing, and audit. Use for large file operations, batch processing, module
  extraction, material validation, and any task requiring Python automation.
---

# PRISM Python Tools
## Complete Python Automation Toolkit (37 Scripts)

**Location:** `C:\\PRISM\SCRIPTS\`

---

## QUICK REFERENCE - When to Use What

| Task | Script | Command |
|------|--------|---------|
| Start session | `session_manager.py` | `python session_manager.py start 1.A.5` |
| Update state quickly | `update_state.py` | `python update_state.py complete "Task done"` |
| Extract module from monolith | `extract_module.py` | `python extract_module.py <file> <start> <end> <out>` |
| Validate material database | `validation/material_validator.py` | `python -m validation.material_validator file.js` |
| Check physics consistency | `validation/physics_consistency.py` | `python -m validation.physics_consistency file.js` |
| Build Level 5 machine DBs | `build_level5_databases.py` | `python build_level5_databases.py` |
| Find extraction gaps | `audit/gap_finder.py` | `python -m audit.gap_finder` |
| Generate context for Claude | `context_generator.py` | `python context_generator.py --clipboard` |

---

## SCRIPT INVENTORY BY CATEGORY

### 1. CORE UTILITIES (`core/`)

| Script | Purpose |
|--------|---------|
| `config.py` | Central configuration - paths, constants, settings |
| `logger.py` | Logging setup with console and file output |
| `utils.py` | Common utilities - load_json, save_json, file helpers |
| `__init__.py` | Package initialization |

**Usage:**
```python
from core.config import LOCAL_ROOT, EXTRACTED, MONOLITH_PATH
from core.logger import setup_logger
from core.utils import load_json, save_json

logger = setup_logger('my_script', log_file='output.log')
data = load_json('config.json')
```

---

### 2. STATE MANAGEMENT (`state/`)

| Script | Purpose |
|--------|---------|
| `state_manager.py` | Full CURRENT_STATE.json management |
| `checkpoint_system.py` | Auto-checkpoint triggers and recovery |
| `progress_tracker.py` | Track extraction/migration progress |
| `session_logger.py` | Log session actions with timestamps |
| `__init__.py` | Package initialization |

**Key Commands:**
```bash
# Quick state updates (most common)
python update_state.py complete "Extracted materials DB"
python update_state.py next "1.A.2" "Extract Machines"
python update_state.py stats databases 8
python update_state.py blocker "Waiting for file"
python update_state.py clear-blocker

# Full session management
python session_manager.py start 1.A.5
python session_manager.py status
python session_manager.py end
python session_manager.py verify
```

---

### 3. VALIDATION (`validation/`)

| Script | Purpose |
|--------|---------|
| `material_validator.py` | Validate material JS files against schema |
| `material_schema.py` | 127-parameter material schema definition |
| `physics_consistency.py` | Cross-check physics relationships |
| `batch_validator.py` | Validate multiple files at once |
| `__init__.py` | Package initialization |

**When to Use:**
- After creating/modifying material databases
- Before committing material changes
- When physics values seem wrong

**Key Commands:**
```bash
# Validate single material file
python -m validation.material_validator PRISM_CARBON_STEELS.js

# Check physics consistency (Kc vs UTS, J-C A vs yield, etc.)
python -m validation.physics_consistency PRISM_CARBON_STEELS.js

# Batch validate all materials
python -m validation.batch_validator EXTRACTED/materials/enhanced/
```

**Physics Checks Performed:**
- Kienzle Kc1.1 vs UTS correlation (should be ~3-5x UTS)
- Johnson-Cook A vs yield strength (should be close)
- Taylor n vs material hardness (softer = higher n)
- Thermal conductivity vs diffusivity consistency
- Density consistency with composition

---

### 4. EXTRACTION (`extraction/`)

| Script | Purpose |
|--------|---------|
| `module_extractor.py` | Extract modules by line range |
| `monolith_indexer.py` | Build index of all modules in monolith |
| `dependency_mapper.py` | Map module dependencies (needs/provides) |
| `extraction_auditor.py` | Verify extraction completeness |
| `__init__.py` | Package initialization |

**When to Use:**
- During Stage 1 extraction sessions
- When adding new modules to index
- To verify nothing was truncated

**Key Commands:**
```bash
# Extract single module
python extract_module.py monolith.html 136163 138500 PRISM_POST_MACHINE_DB.js

# Batch extract from index
python extract_module.py --batch monolith.html module_index.json

# Build/update monolith index
python -m extraction.monolith_indexer monolith.html

# Map dependencies
python -m extraction.dependency_mapper EXTRACTED/databases/

# Audit extraction completeness
python -m extraction.extraction_auditor PRISM_MATERIALS.js --source monolith.html
```

---

### 5. BATCH PROCESSING (`batch/`)

| Script | Purpose |
|--------|---------|
| `batch_processor.py` | Core batch framework with progress tracking |
| `material_batch.py` | Batch material operations (create, update, validate) |
| `extraction_batch.py` | Batch module extraction |
| `report_generator.py` | Generate batch operation reports |
| `__init__.py` | Package initialization |

**When to Use:**
- Processing 10+ items at once
- Creating multiple materials from template
- Extracting multiple modules

**Key Commands:**
```bash
# Batch create materials from CSV
python -m batch.material_batch create --input materials.csv --template carbon_steel

# Batch extract modules
python -m batch.extraction_batch --index extraction_index.json

# Generate report
python -m batch.report_generator --session 1.A.5
```

---

### 6. AUDIT (`audit/`)

| Script | Purpose |
|--------|---------|
| `consumer_tracker.py` | Track database consumers for 100% utilization |
| `gap_finder.py` | Find missing modules, incomplete extractions |
| `schema_checker.py` | Verify database schemas match spec |
| `utilization_report.py` | Generate utilization reports |
| `__init__.py` | Package initialization |

**When to Use:**
- Before Stage 3 migration (verify 100% utilization ready)
- Finding what's missing from extraction
- Generating progress reports

**Key Commands:**
```bash
# Find extraction gaps
python -m audit.gap_finder

# Check consumer wiring
python -m audit.consumer_tracker PRISM_MATERIALS_MASTER

# Generate utilization report
python -m audit.utilization_report --output report.md

# Check schema compliance
python -m audit.schema_checker EXTRACTED/databases/
```

---

### 7. STANDALONE SCRIPTS (root level)

| Script | Purpose |
|--------|---------|
| `build_level5_databases.py` | Build Level 5 machine DBs from CAD files |
| `context_generator.py` | Generate minimal context for Claude sessions |
| `extract_module.py` | Quick module extraction (standalone) |
| `materials_scientific_builder.py` | Build scientific materials with full 127 params |
| `session_manager.py` | Session start/end/status management |
| `test_validator.py` | Test material validation |
| `update_state.py` | Quick CURRENT_STATE.json updates |
| `verify_features.py` | Verify UI features exist in build |

**Most Used Commands:**
```bash
# Generate context for new Claude session
python context_generator.py --clipboard

# Build Level 5 machine databases from STEP files
python build_level5_databases.py

# Build scientific materials database
python materials_scientific_builder.py --category carbon_steel --output PRISM_CS.js

# Verify all features present
python verify_features.py _BUILD/
```

---

## PATH CONSTANTS

All scripts use these standard paths:

```python
# In core/config.py
LOCAL_ROOT = r"C:\\PRISM"
BOX_ROOT = r"C:\Users\Mark Villanueva\Box\PRISM REBUILD"

EXTRACTED = os.path.join(LOCAL_ROOT, "EXTRACTED")
SCRIPTS = os.path.join(LOCAL_ROOT, "SCRIPTS")
SESSION_LOGS = os.path.join(LOCAL_ROOT, "SESSION_LOGS")
STATE_FILE = os.path.join(LOCAL_ROOT, "CURRENT_STATE.json")

MONOLITH_PATH = os.path.join(LOCAL_ROOT, "_BUILD", 
    "PRISM_v8_89_002_TRUE_100_PERCENT",
    "PRISM_v8_89_002_TRUE_100_PERCENT.html")

RESOURCES = os.path.join(BOX_ROOT, "RESOURCES")
CAD_FILES = os.path.join(RESOURCES, "CAD FILES")
CATALOGS = os.path.join(RESOURCES, "MANUFACTURER CATALOGS")
```

---

## DEPENDENCIES

Required packages:
```bash
pip install pdfplumber json5 tqdm colorama --break-system-packages
```

| Package | Used For |
|---------|----------|
| `pdfplumber` | PDF catalog extraction |
| `json5` | Lenient JSON parsing (trailing commas, comments) |
| `tqdm` | Progress bars for batch operations |
| `colorama` | Colored console output |

---

## EXECUTION FROM CLAUDE

Use Desktop Commander to run scripts:

```javascript
// Run a script
Desktop Commander:start_process({
  command: "python C:\\PRISM\\SCRIPTS\\update_state.py complete \"Task done\"",
  timeout_ms: 30000
})

// Run a module
Desktop Commander:start_process({
  command: "cd \"C:\\PRISM\\SCRIPTS\" && python -m validation.material_validator ..\\EXTRACTED\\materials\\enhanced\\PRISM_CARBON_STEELS.js",
  timeout_ms: 60000
})
```

---

## COMMON WORKFLOWS

### Start of Session
```bash
cd "C:\\PRISM\SCRIPTS"
python session_manager.py start 1.A.5
```

### After Creating Materials
```bash
python -m validation.material_validator ../EXTRACTED/materials/enhanced/PRISM_NEW.js
python -m validation.physics_consistency ../EXTRACTED/materials/enhanced/PRISM_NEW.js
```

### End of Session
```bash
python session_manager.py end
python update_state.py complete "Session 1.A.5 - Extracted X modules"
```

### Before Migration (Stage 3)
```bash
python -m audit.gap_finder
python -m audit.utilization_report
python -m audit.consumer_tracker PRISM_MATERIALS_MASTER
```

---

## TIPS

1. **Always use full paths** - Scripts expect absolute Windows paths
2. **Run from SCRIPTS directory** - For module imports to work: `cd SCRIPTS && python -m module.script`
3. **Check logs** - Most scripts write to `SESSION_LOGS/`
4. **State updates are atomic** - `update_state.py` does read-modify-write safely
5. **Large files** - Use generators, not `read()` for 1M+ line files

---

## END OF SKILL



========================================
SKILL: prism-quality-gates
========================================
---
name: prism-quality-gates
description: |
  Quality gates for PRISM development stages. Defines pass/fail criteria before 
  progressing to next phase. Use when completing extractions, migrations, or 
  features to verify readiness before proceeding.
  
  MIT Foundation: 6.005 (Software Construction), 16.355J (Software Engineering), 2.830 (Quality Control)
---

# PRISM Quality Gates Skill

> ðŸ›‘ **PRINCIPLE:** No module, feature, or phase advances without passing ALL gates

---

## PURPOSE

Quality gates enforce minimum standards at key development checkpoints:
1. **Extraction Gates** - Verify modules extracted completely
2. **Migration Gates** - Verify 100% utilization before import
3. **Feature Gates** - Verify features work correctly
4. **Release Gates** - Verify build is production-ready

---

## GATE DEFINITIONS

### GATE 1: EXTRACTION QUALITY

Before a module is considered "extracted":

| Check | Requirement | Tool |
|-------|-------------|------|
| **Completeness** | All functions present | prism-auditor |
| **Syntax** | No parse errors | Node.js parse |
| **Dependencies** | All documented | prism-extractor |
| **Outputs** | All documented | prism-extractor |
| **Header** | Standard header present | Manual check |

**Pass Criteria:** ALL checks âœ…
**Fail Action:** Re-extract or fix issues

```javascript
// Gate 1 Verification
const extractionGate = {
  moduleName: "PRISM_MATERIALS_MASTER",
  checks: {
    completeness: { pass: true, functionsFound: 25, functionsExpected: 25 },
    syntax: { pass: true, errors: 0 },
    dependencies: { pass: true, documented: 8 },
    outputs: { pass: true, documented: 12 },
    header: { pass: true }
  },
  overallPass: true,
  gatePassedAt: "2026-01-23T12:00:00Z"
};
```

---

### GATE 2: MIGRATION QUALITY

Before a module is imported to new architecture:

| Check | Requirement | Tool |
|-------|-------------|------|
| **Consumers** | Min consumers wired | prism-consumer-mapper |
| **6+ Sources** | Calculations use 6+ sources | prism-utilization |
| **Gateway Routes** | All routes registered | Manual check |
| **Tests** | Unit tests exist | prism-tdd |
| **XAI** | Explanation available | Manual check |

**Pass Criteria:** ALL checks âœ…
**Fail Action:** Wire more consumers or add missing requirements

```javascript
// Gate 2 Verification
const migrationGate = {
  moduleName: "PRISM_MATERIALS_MASTER",
  checks: {
    consumers: { pass: true, count: 15, required: 15 },
    sixSources: { pass: true, calculations: 8, allUseSix: true },
    gatewayRoutes: { pass: true, routes: 12 },
    tests: { pass: true, coverage: "85%" },
    xai: { pass: true }
  },
  overallPass: true,
  gatePassedAt: "2026-01-25T12:00:00Z"
};
```

---

### GATE 3: FEATURE QUALITY

Before a feature is marked complete:

| Check | Requirement | Tool |
|-------|-------------|------|
| **Functionality** | Works as specified | Manual test |
| **Edge Cases** | Handles boundaries | prism-tdd |
| **Error Handling** | Graceful failures | prism-debugging |
| **Performance** | <500ms calculations | Profiling |
| **UI** | 3-click rule met | Manual check |

**Pass Criteria:** ALL checks âœ…
**Fail Action:** Fix issues before marking complete

---

### GATE 4: RELEASE QUALITY

Before a build is released:

| Check | Requirement | Tool |
|-------|-------------|------|
| **All Modules** | 100% extraction complete | prism-auditor |
| **Utilization** | 100% for all DBs | prism-utilization |
| **Tests** | All passing | Test suite |
| **Performance** | <2s page load | Lighthouse |
| **Security** | Input validation | prism-validator |
| **Documentation** | Up to date | Manual check |

**Pass Criteria:** ALL checks âœ…
**Fail Action:** Fix all issues before release

---

## GATE STATUS TRACKING

Add to CURRENT_STATE.json:

```json
{
  "qualityGates": {
    "extraction": {
      "passed": 48,
      "failed": 0,
      "pending": 783,
      "lastGateCheck": "2026-01-23"
    },
    "migration": {
      "passed": 0,
      "failed": 0,
      "pending": 48,
      "lastGateCheck": null
    },
    "features": {
      "speedFeedCalc": "PASSED",
      "postProcessor": "PENDING",
      "quoting": "NOT_STARTED"
    },
    "release": {
      "v9.0.0": "NOT_STARTED"
    }
  }
}
```

---

## CONSUMER MAPPING (Utilization Matrix)

This skill integrates with prism-utilization and prism-consumer-mapper.

### Skill â†’ Consumer Mapping

| Skill | Primary Consumers | Min Uses |
|-------|------------------|----------|
| prism-quality-gates | Stage transitions, CURRENT_STATE.json | 4 |
| prism-extractor | All 831 module extractions | 831 |
| prism-auditor | All extracted modules | 831 |
| prism-utilization | All migrations | 831 |
| prism-consumer-mapper | All DB wiring | 62 |

### Gate â†’ Action Mapping

| Gate | Triggers When | Actions |
|------|--------------|---------|
| Extraction | Module extracted | Update extraction progress |
| Migration | Module to be imported | Verify consumers, update migration progress |
| Feature | Feature complete | Update feature status |
| Release | Build candidate | Full validation suite |

---

## QUICK REFERENCE

### Before Extraction:
```
â–¡ Check prism-monolith-index for line numbers
â–¡ Read prism-extractor skill
â–¡ Prepare output path
```

### After Extraction:
```
â–¡ Run completeness check (compare function counts)
â–¡ Verify syntax (mental parse)
â–¡ Document dependencies and outputs
â–¡ Add standard header
â–¡ Mark extraction gate PASSED in state
```

### Before Migration:
```
â–¡ Verify extraction gate passed
â–¡ Wire ALL consumers (use prism-consumer-mapper)
â–¡ Ensure 6+ sources for calculations
â–¡ Register gateway routes
â–¡ Create unit tests
â–¡ Add XAI explanation capability
â–¡ Mark migration gate PASSED in state
```

### Before Release:
```
â–¡ All modules extracted (831/831)
â–¡ All modules migrated (831/831)
â–¡ All tests passing
â–¡ Performance targets met
â–¡ Security validated
â–¡ Documentation complete
â–¡ Mark release gate PASSED
```

---

## INTEGRATION

| Skill | Relationship |
|-------|--------------|
| `prism-auditor` | Provides extraction verification |
| `prism-utilization` | Provides consumer counts |
| `prism-consumer-mapper` | Wires consumers |
| `prism-tdd` | Provides test coverage |
| `prism-state-manager` | Stores gate status |

---

## MIT FOUNDATION

**6.005 - Software Construction:**
- Testing and verification
- Specifications as contracts

**16.355J - Software Engineering:**
- Quality assurance processes
- Gate reviews and checkpoints

**2.830 - Quality Control:**
- Statistical process control
- Acceptance criteria

---

## VERSION HISTORY

| Ver | Date | Changes |
|-----|------|---------|
| 1.0 | 2026-01-23 | Initial creation with 4 gate types |



========================================
SKILL: prism-quick-start
========================================
---
name: prism-quick-start
description: |
  SINGLE PAGE replacing 5+ skill reads. Contains everything needed for session start in ~100 lines. READ THIS ONLY at session start - saves 80% tokens vs reading multiple skills.
---

# PRISM Quick Start (READ THIS FIRST - REPLACES MULTIPLE SKILLS)

## 1. PATHS
```
STATE:    C:\\PRISM\CURRENT_STATE.json
MONOLITH: C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html
EXTRACT:  C:\\PRISM\EXTRACTED\
SKILLS:   C:\\PRISM\_SKILLS\  (or /mnt/skills/user/)
LOGS:     C:\\PRISM\SESSION_LOGS\
```

## 2. TOOLS (Instant Decision)
| Task | Tool | Key Params |
|------|------|------------|
| Read C: file | `Filesystem:read_file` | path |
| Write C: file | `Filesystem:write_file` | path, content |
| List C: dir | `Filesystem:list_directory` | path |
| Read LARGE file | `Desktop Commander:read_file` | path, offset, length |
| Search content | `Desktop Commander:start_search` | searchType:"content", pattern |
| Search files | `Desktop Commander:start_search` | searchType:"files", pattern |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |
| Read skill | `view` | path (/mnt/skills/...) |

## 3. KEY MODULE LINES (Monolith)
| Module | Line | Size Est |
|--------|------|----------|
| PRISM_GATEWAY | 11,888 | ~7K |
| PRISM_KNOWLEDGE_BASE | 101,390 | ~50K |
| PRISM_TOOL_DATABASE_V7 | 467,398 | ~140K |
| PRISM_MATERIALS_MASTER | 611,225 | ~75K |
| *See _SKILLS/prism-extraction-index/ for full list* |

## 4. SESSION PROTOCOL (Minimal)
```
START: Read CURRENT_STATE.json â†’ Check currentTask â†’ Execute
DURING: Checkpoint every 3 tool calls (update currentTask)
END: Update state â†’ Write 3-line log â†’ Announce next session
```

## 5. ANTI-RESTART RULES
- âŒ NEVER restart mid-task
- âŒ NEVER re-read files already in context
- âœ… CHECKPOINT progress â†’ CONTINUE â†’ COMPLETE
- âœ… If stuck: checkpoint first, then ask user

## 6. EXTRACTION TEMPLATE
```javascript
// 1. Find module (or use known line from section 3)
Desktop Commander:start_search({ pattern: "const PRISM_MODULE", searchType: "content" })

// 2. Read module
Desktop Commander:read_file({ path: "...monolith.html", offset: LINE, length: SIZE })

// 3. Write extracted
Filesystem:write_file({ path: "C:\\...\\EXTRACTED\\category\\module.js", content: "..." })
```

## 7. WHEN TO READ FULL SKILLS
| Situation | Read |
|-----------|------|
| Complex extraction | prism-extractor |
| Error occurred | prism-error-recovery |
| Need algorithm | prism-knowledge-base |
| Multi-agent work | prism-swarm-orchestrator |
| Database architecture | prism-hierarchy-manager |
| Unsure about tool | prism-tool-selector |

## 8. 10 COMMANDMENTS (Summary)
1. Use everything everywhere (100% utilization)
2. Fuse concepts across domains
3. Validate with physics + empirical + historical
4. Learn from every interaction
5. Include confidence intervals
6. Explain with XAI
7. Fail gracefully
8. Protect all data
9. <2s page load, <500ms calc
10. 3-click rule, smart defaults

## 9. CURRENT PROGRESS
- Stage: 1 (EXTRACTION)
- Modules: 48/831 extracted (~6%)
- Focus: Materials DBs â†’ Tools DBs â†’ Engines
- Skills: 14 total, all operational

## 10. EMERGENCY
If lost: `Filesystem:read_file({ path: "C:\\PRISM\\CURRENT_STATE.json" })`



========================================
SKILL: prism-review
========================================
---
name: prism-review
description: |
  Code and module review skill adapted from obra/superpowers for PRISM quality control.
  Use when: reviewing extracted modules, checking material databases, validating
  architecture decisions, or doing pre-merge checks. Provides structured review
  process for consistent quality. Triggers: module extraction complete, database
  ready for use, architecture review, pre-merge check, quality audit.
---

# PRISM REVIEW SKILL v1.0
## Structured Review for Manufacturing Intelligence
### Adapted from obra/superpowers for PRISM quality control

---

## CORE PRINCIPLE

**REVIEW CATCHES WHAT VERIFICATION MISSES.**

Verification checks for correctness. Review checks for quality:
- Is this the RIGHT solution?
- Is this MAINTAINABLE?
- Does this follow PRISM principles?
- Will this scale?
- Are there better alternatives?

---

## ðŸ“‹ REVIEW PROTOCOL

### Review Types

| Type | Scope | When | Time |
|------|-------|------|------|
| Quick | Single item | After creation | 2-5 min |
| Standard | Module/file | After extraction | 10-20 min |
| Deep | Architecture | Major decisions | 30-60 min |
| Audit | Full system | Periodically | 1-2 hours |

---

## QUICK REVIEW CHECKLIST

For individual items (materials, functions, entries):

```markdown
## QUICK REVIEW: [ITEM]

â˜ Correct? Does it work as intended?
â˜ Complete? All required parts present?
â˜ Consistent? Follows existing patterns?
â˜ Clear? Understandable without explanation?
â˜ Clean? No obvious improvements needed?

Result: APPROVE / REQUEST CHANGES
```

---

## STANDARD REVIEW CHECKLIST

For modules and files:

```markdown
## STANDARD REVIEW: [MODULE/FILE]

### Correctness
â˜ Functions work as documented
â˜ Data is accurate
â˜ Edge cases handled
â˜ Error handling present

### Completeness
â˜ All functions extracted/implemented
â˜ All data present
â˜ Dependencies documented
â˜ Consumers identified (min 6)

### Consistency
â˜ Naming follows conventions
â˜ Structure matches similar modules
â˜ API consistent with peers

### Clarity
â˜ Code is readable
â˜ Comments explain "why"
â˜ Complex logic documented

### 10 Commandments Alignment
â˜ 1. Used everywhere? (consumers wired)
â˜ 2. Fuses concepts? (cross-domain integration)
â˜ 3. Verified? (validation present)
â˜ 4. Learns? (feeds ML pipeline)
â˜ 5. Uncertainty? (confidence intervals)
â˜ 6. Explainable? (XAI ready)
â˜ 7. Fails gracefully? (fallbacks present)
â˜ 8. Protected? (validation, sanitization)
â˜ 9. Performs? (<500ms calculations)
â˜ 10. User-focused? (good defaults)

### Issues Found
| # | Severity | Description | Recommendation |
|---|----------|-------------|----------------|
|   |          |             |                |

Result: APPROVE / REQUEST CHANGES / MAJOR REWORK
```

---

## DEEP REVIEW CHECKLIST

For architectural decisions:

```markdown
## DEEP REVIEW: [DECISION/COMPONENT]

### Problem Understanding
â˜ Problem clearly defined
â˜ Requirements documented
â˜ Constraints identified
â˜ Success criteria measurable

### Solution Evaluation
â˜ Multiple options considered
â˜ Tradeoffs documented
â˜ Best option selected with rationale
â˜ Risks identified and mitigated

### Technical Quality
â˜ Design is sound
â˜ Implementation is feasible
â˜ Scalability considered
â˜ Maintainability considered
â˜ Performance requirements met

### Integration
â˜ Fits with existing architecture
â˜ No breaking changes
â˜ Migration path clear (if needed)
â˜ Documentation complete

### Future Considerations
â˜ Extensible for future needs
â˜ Technical debt acceptable
â˜ Learning curve reasonable
â˜ Team can maintain

### 10 Commandments Deep Check
â˜ Every component used to maximum?
â˜ Cross-domain concepts fused?
â˜ Validation at every level?
â˜ Learning feedback loops?
â˜ Uncertainty quantified?
â˜ Decisions explainable?
â˜ Graceful degradation?
â˜ Security hardened?
â˜ Performance optimized?
â˜ User experience prioritized?

Result: APPROVE / CONDITIONAL / REJECT
```

---

## PRISM-SPECIFIC REVIEW CRITERIA

### Material Database Review

```markdown
## MATERIAL DATABASE REVIEW

### Data Quality
â˜ Sources cited (ASM, Machining Handbook)
â˜ Values in realistic ranges
â˜ No copy-paste errors
â˜ Consistent units

### Parameter Coverage
â˜ All 127 parameters defined
â˜ Cutting parameters complete
â˜ Thermal properties complete
â˜ Statistical metadata present

### Usability
â˜ Clear material categorization
â˜ Searchable by multiple criteria
â˜ Compatible with all consumers

### Extensibility
â˜ Easy to add new materials
â˜ Easy to update parameters
â˜ Hierarchy layers supported
```

### Module Extraction Review

```markdown
## MODULE EXTRACTION REVIEW

### Extraction Quality
â˜ All code captured
â˜ No dependencies left behind
â˜ Clean boundaries

### Functionality
â˜ All functions work
â˜ All data accessible
â˜ API documented

### Integration
â˜ Consumer list complete (min 6)
â˜ Gateway routes defined
â˜ Event bus integrated

### Migration Ready
â˜ Can be imported to new architecture
â˜ No circular dependencies
â˜ Version documented
```

### Consumer Wiring Review

```markdown
## CONSUMER WIRING REVIEW

### Coverage
â˜ Minimum 6 consumers per database
â˜ All data fields used somewhere
â˜ No orphan data

### Implementation
â˜ Routes correctly defined
â˜ Data transforms correct
â˜ Error handling present

### Performance
â˜ No N+1 query issues
â˜ Caching appropriate
â˜ Async where needed
```

---

## REVIEW COMMENTS BEST PRACTICES

### Good Comments

```
âœ“ "This kc1_1 value (2847) seems high for this material family. 
   Similar steels typically range 1800-2200. Source?"

âœ“ "Consider extracting this repeated pattern into a helper function."

âœ“ "The fallback here returns undefined. Should return a default value 
   per Commandment 7."
```

### Bad Comments

```
âœ— "This is wrong." (No explanation)
âœ— "Fix this." (No guidance)
âœ— "I would do it differently." (Subjective, no criteria)
```

---

## REVIEW WORKFLOW

### Before Review

```
1. Understand what you're reviewing
2. Know the acceptance criteria
3. Have reference materials ready
4. Set aside adequate time
```

### During Review

```
1. First pass: Overall impression
2. Second pass: Detailed check against criteria
3. Third pass: Integration and implications
4. Document all findings
```

### After Review

```
1. Summarize findings
2. Categorize by severity
3. Provide recommendations
4. Follow up on addressed items
```

---

## REVIEW SEVERITY LEVELS

| Level | Description | Action |
|-------|-------------|--------|
| ðŸ”´ Critical | Blocks release, causes failure | Must fix |
| ðŸŸ  Major | Significant issue | Should fix |
| ðŸŸ¡ Minor | Improvement opportunity | Nice to fix |
| ðŸŸ¢ Note | Observation, future consideration | Optional |

---

## REVIEW REPORT TEMPLATE

```markdown
# REVIEW REPORT
## Subject: [What was reviewed]
## Reviewer: Claude
## Date: [DATE]
## Type: Quick / Standard / Deep

### Summary
[Overall assessment in 2-3 sentences]

### Result
â˜ APPROVED - Ready for use
â˜ CONDITIONAL - Approve with minor fixes
â˜ REQUEST CHANGES - Major issues found
â˜ REJECT - Fundamental problems

### Findings

#### Critical (Must Fix)
[List critical issues]

#### Major (Should Fix)
[List major issues]

#### Minor (Nice to Fix)
[List minor issues]

#### Notes
[List observations]

### Recommendations
[Specific actions to take]

### Follow-up
â˜ Re-review needed after changes
â˜ No re-review needed
```

---

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Rubber-stamp approvals without checking
âŒ Review without criteria
âŒ Personal preferences as requirements
âŒ Blocking for trivial issues
âŒ Not documenting review findings
âŒ Reviewing your own work (except quick checks)
âŒ Skipping review "to save time"

---

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Review is planned activity
- **prism-tdd**: Tests inform review criteria
- **prism-verification**: Verification before review
- **prism-debugging**: Debug issues found in review
- **prism-auditor**: Audit is comprehensive review

---

**END OF PRISM REVIEW SKILL**



========================================
SKILL: prism-session-buffer
========================================
---
name: prism-session-buffer
description: |
  Graceful session limit management with buffer zones. Prevents lost progress by: (1) Recognizing warning signs of approaching limits, (2) Establishing checkpoints during long tasks, (3) Auto-saving state before limits hit, (4) Creating perfect resume points. Use ALWAYS during extended work sessions, material creation, large extractions, or any multi-step task.
---

# PRISM Session Buffer Manager

> ðŸ›¡ï¸ **CORE PRINCIPLE:** Never lose progress. Always save BEFORE the limit, not after you hit it.

## ðŸ”´ THE PROBLEM

| Scenario | What Happens | Lost Work |
|----------|--------------|-----------|
| Context fills up | Conversation compacts | Recent work context |
| Response too long | Output truncates mid-stream | Partial file, corrupted data |
| Session ends | No graceful shutdown | Unsaved state, no handoff |
| Tool call limit | Blocked from saving | Everything since last save |

**Solution:** Buffer zones + checkpoints + mandatory saves

---

## ðŸš¨ WARNING SIGNS (Monitor These!)

### 1. Response Length Warnings
```
âš ï¸ WARNING SIGN: Claude's response is getting very long
   TRIGGER: Response exceeds ~3000 words / ~15KB
   ACTION: Stop current item, save immediately
```

### 2. Tool Call Count
```
âš ï¸ WARNING SIGN: Many sequential tool calls
   TRIGGER: 15+ tool calls without checkpoint
   ACTION: Pause, update state, create checkpoint
```

### 3. Conversation Length
```
âš ï¸ WARNING SIGN: Long back-and-forth
   TRIGGER: 20+ exchanges in conversation
   ACTION: Summarize progress, save state, suggest new chat
```

### 4. Complex Multi-Step Tasks
```
âš ï¸ WARNING SIGN: Task has many sub-steps
   TRIGGER: Task will require 10+ operations
   ACTION: Break into checkpointed phases, save after each
```

### 5. Large Content Generation
```
âš ï¸ WARNING SIGN: Creating large files/content
   TRIGGER: File will exceed 50KB
   ACTION: Use chunked approach (prism-large-file-writer)
```

---

## ðŸŽ¯ CHECKPOINT SYSTEM

### What is a Checkpoint?
A checkpoint is a saved state that allows perfect resumption:
- Current progress (what's done)
- Next step (what to do next)
- Files modified (what changed)
- Resume instructions (how to continue)

### Checkpoint Frequency Rules

| Task Type | Checkpoint Every | Example |
|-----------|------------------|---------|
| Material creation | After each material | "P-CS-031 done, next: P-CS-032" |
| File extraction | After each file | "tools.js extracted, next: materials.js" |
| Database work | After 5-10 entries | "Entries 1-10 added, next: 11-20" |
| Code writing | After each function | "calculateSpeed() done, next: calculateForce()" |
| Any task | Every 10-15 minutes | Minimum checkpoint frequency |

---

## ðŸ“‹ CHECKPOINT PROTOCOL

### Mini-Checkpoint (Every 3-5 Operations)
```javascript
// Mental note - track these internally:
// - Last completed item
// - Current item in progress  
// - Next item to do
// - Any issues encountered
```

### Standard Checkpoint (Every 10-15 Operations)
```javascript
// Update CURRENT_STATE.json with:
{
  "checkpoint": {
    "timestamp": "2026-01-23T03:30:00Z",
    "lastCompleted": "P-CS-034",
    "inProgress": null,
    "nextToDo": "P-CS-035",
    "filesModified": ["carbon_steels_031_040.js"],
    "resumeInstructions": "Continue with P-CS-035, append to existing file"
  }
}
```

### Full Checkpoint (Every Major Phase)
```javascript
// Update CURRENT_STATE.json completely
// Write session log entry
// Verify all files saved
// Create explicit handoff message
```

---

## ðŸ›‘ BUFFER ZONE TRIGGERS

### YELLOW ZONE (Caution - Checkpoint Soon)
**Triggers:**
- 10+ tool calls since last checkpoint
- Response reaching ~2000 words
- 15+ conversation exchanges
- Complex task 50% complete

**Action:**
```
1. Finish current atomic unit (one material, one function, one entry)
2. Save/append current work to file
3. Update CURRENT_STATE.json checkpoint
4. Continue if safe, or announce pause point
```

### RED ZONE (Stop Now - Save Immediately)
**Triggers:**
- 18+ tool calls since last save
- Response reaching ~3500 words
- 25+ conversation exchanges
- Any sign of slowdown or issues
- User mentions "one more thing" after long session

**Action:**
```
1. STOP current work at nearest clean break
2. IMMEDIATELY save all pending work
3. IMMEDIATELY update CURRENT_STATE.json
4. Write handoff message with exact resume point
5. Do NOT start new work
```

---

## ðŸ“ MANDATORY SAVE PROTOCOL

### Before ANY of These:
- [ ] Starting a new major task
- [ ] Before risky operations
- [ ] Before large file writes
- [ ] Every 15 minutes of work
- [ ] When user says "last thing" or "one more"
- [ ] When response is getting long
- [ ] Before ending conversation

### Save Sequence (Non-Negotiable):
```
STEP 1: Complete current atomic unit
        (Don't stop mid-material, mid-function, mid-entry)

STEP 2: Write/append work to target file
        Filesystem:write_file or Desktop Commander:write_file

STEP 3: Verify file saved correctly
        Desktop Commander:get_file_info (check size)

STEP 4: Update CURRENT_STATE.json
        - checkpoint.lastCompleted
        - checkpoint.nextToDo
        - checkpoint.timestamp
        - checkpoint.resumeInstructions

STEP 5: Acknowledge save complete
        "âœ“ Checkpoint saved: [description]"
```

---

## ðŸ”„ GRACEFUL STOP TEMPLATE

When hitting buffer zone, use this format:

```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ›‘ BUFFER ZONE REACHED - GRACEFUL STOP
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

## Progress This Session
âœ“ Completed: [list what was done]
âœ“ Files saved: [list files with sizes]
âœ“ Last item: [exact last completed item]

## Checkpoint Saved
- State file: CURRENT_STATE.json âœ“
- Timestamp: [time]
- Resume point: [exact description]

## To Continue (Next Session)
1. Read CURRENT_STATE.json
2. Resume from: [exact item/step]
3. Continue with: [next action]

## Why Stopping
[Reason: response length / tool calls / session length / user request]

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

---

## ðŸŽ¯ TASK-SPECIFIC BUFFER RULES

### Material Database Creation
```
CHECKPOINT: After every material (not mid-material!)
BUFFER ZONE: After 3-4 materials in single response
SAVE FORMAT: Append completed materials, note next ID
RESUME: "Continue from P-CS-XXX"
```

### Module Extraction
```
CHECKPOINT: After each complete module
BUFFER ZONE: After 2-3 modules or 5000 lines
SAVE FORMAT: Write extracted module, update index
RESUME: "Extract MODULE_NAME next, line XXXXX"
```

### Code Writing
```
CHECKPOINT: After each function/class
BUFFER ZONE: After 3-4 functions or 500 lines
SAVE FORMAT: Write to file, note next function
RESUME: "Implement functionName() next"
```

### Database Entry Work
```
CHECKPOINT: After every 5-10 entries
BUFFER ZONE: After 15-20 entries
SAVE FORMAT: Append entries, note count
RESUME: "Continue from entry #XX"
```

---

## âš¡ QUICK REFERENCE

### Start of Session
```
â–¡ Read CURRENT_STATE.json
â–¡ Check for existing checkpoint
â–¡ Resume from checkpoint if exists
â–¡ Announce session start with plan
```

### During Session
```
â–¡ Track operations mentally (mini-checkpoints)
â–¡ Save checkpoint every 10-15 operations
â–¡ Watch for buffer zone triggers
â–¡ Never start new major work near limits
```

### Approaching Limits
```
â–¡ Finish current atomic unit
â–¡ Save work to file
â–¡ Update CURRENT_STATE.json
â–¡ Write graceful stop message
â–¡ Do NOT start anything new
```

### End of Session
```
â–¡ Complete or checkpoint current work
â–¡ Save all pending changes
â–¡ Update CURRENT_STATE.json fully
â–¡ Write session log
â–¡ Provide explicit handoff
```

---

## ðŸš« ANTI-PATTERNS (Never Do These)

### âŒ DON'T: Start new work when tired
```
User: "One more material before we stop"
Claude: "I notice we're at 20+ exchanges. Let me save checkpoint first, 
        THEN we can do one more with a fresh save point."
```

### âŒ DON'T: Skip saves to "save time"
```
// BAD: "I'll save at the end"
// GOOD: Save every checkpoint, every time
```

### âŒ DON'T: Stop mid-unit
```
// BAD: Stop halfway through a material definition
// GOOD: Finish the material, THEN stop
```

### âŒ DON'T: Trust memory over state file
```
// BAD: "I remember we were at P-CS-035"
// GOOD: "CURRENT_STATE.json shows checkpoint at P-CS-034"
```

---

## ðŸ“Š BUFFER ZONE MATH

### Estimate Work Capacity Per Session
```
Conservative estimate per response:
- ~3-4 materials (127 params each)
- ~2-3 module extractions
- ~500 lines of new code
- ~15-20 database entries

Plan for 70% of this to allow buffer:
- 2-3 materials per response cycle
- 1-2 module extractions per response
- 300-400 lines of code per response
- 10-15 database entries per response
```

### Response Budget
```
Total response capacity: ~4000 words / ~20KB
Buffer zone starts: ~3000 words / ~15KB (75%)
Hard stop: ~3500 words / ~17KB (87%)
Reserve for handoff: ~500 words / ~3KB (13%)
```

---

## ðŸ”§ INTEGRATION WITH OTHER SKILLS

| Skill | Integration |
|-------|-------------|
| `prism-large-file-writer` | Chunked writes ARE checkpoints |
| `prism-state-manager` | Checkpoint updates go to state |
| `prism-task-continuity` | Buffer stops create continuity |
| `prism-error-recovery` | Failed saves trigger recovery |

---

## âœ… SUCCESS METRICS

A well-buffered session has:
- [ ] Zero lost progress
- [ ] Clean resume points
- [ ] State file always current
- [ ] No truncated files
- [ ] No mid-unit stops
- [ ] Clear handoff message
- [ ] Next session can start immediately

---

## ðŸŽ¯ MANTRA

```
"Save early, save often, save BEFORE the limit."

"If in doubt, checkpoint now."

"Better to save twice than lose once."

"Finish the unit, then stopâ€”never mid-stream."
```



========================================
SKILL: prism-session-handoff
========================================
---
name: prism-session-handoff
description: |
  Ultra-fast session resumption with 3-tier information hierarchy. 5-second
  resume capability with essence format. 50% session overhead reduction.
  Prioritizes speed-to-context over completeness.

  MIT Foundation: 6.033 (Systems), 16.400 (Human Factors)
---

# PRISM Session Handoff Skill v2.0
## Enhanced with 5-Second Resume & Essence Format
**Time Savings: 50% session overhead reduction (up from 30%)**

> **MIT Foundation:** 6.033 (Systems), 16.400 (Human Factors - Info Priority)

---

## PURPOSE
Ultra-fast session resumption with 3-tier information hierarchy. Prioritizes speed-to-context over completeness.

---

## ðŸš€ 5-SECOND RESUME (NEW v2.0)

### The Principle
**Any new chat should understand context in 5 seconds.** Not 5 minutes reading logs.

### 5-Second Resume Format
```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
5-SECOND RESUME
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
DOING:   [One-line: What we were doing]
STOPPED: [One-line: Where we stopped]
NEXT:    [One-line: What to do immediately]
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

### Examples

**Materials Work:**
```
DOING:   Creating carbon steels P-CS-031 to P-CS-040 with 127-param schema
STOPPED: After P-CS-035 (AISI 1040 Hot Rolled) - file has 5 materials
NEXT:    Append P-CS-036 (AISI 1040 Cold Drawn) to carbon_steels_031_040.js
```

**Extraction Work:**
```
DOING:   Extracting PRISM_MATERIALS_MASTER from monolith (lines 45000-52000)
STOPPED: At line 48500 - completed getMaterial() function
NEXT:    Continue with updateMaterial() function at line 48501
```

**Skill Enhancement:**
```
DOING:   Enhancing skills for context continuity (SKL-02 through SKL-06)
STOPPED: After completing SKL-02 (prism-state-manager enhanced)
NEXT:    Start SKL-03 - enhance prism-session-handoff
```

---

## ðŸ“‹ PRIORITY-RANKED READING LIST (NEW v2.0)

### Information Tiers

| Tier | What | When to Read | Time |
|------|------|--------------|------|
| **1** | `quickResume` in CURRENT_STATE.json | Always | 10 sec |
| **2** | Last 20 lines of target file | If continuing file | 30 sec |
| **3** | `currentTask` in CURRENT_STATE.json | If task in-progress | 30 sec |
| **4** | Latest session log | Only if unclear | 2 min |
| **5** | Context DNA fingerprint | After compaction | 1 min |
| **6** | Full session history | Major decisions | 5 min |

### Reading Decision Tree

```
START NEW CHAT
     â”‚
     â–¼
Read quickResume (ALWAYS)
     â”‚
     â–¼
Is currentTask.status = "IN_PROGRESS"?
     â”‚
    YES â”€â”€â–º Read currentTask + last 20 lines of targetFile
     â”‚
    NO
     â”‚
     â–¼
Is recoveryConfidence.score > 70%?
     â”‚
    YES â”€â”€â–º Start working immediately
     â”‚
    NO
     â”‚
     â–¼
Read latest session log
     â”‚
     â–¼
Is context clear now?
     â”‚
    YES â”€â”€â–º Start working
     â”‚
    NO â”€â”€â–º Read context DNA + ask user for clarification
```

---

## ðŸ“ SESSION ESSENCE FORMAT (NEW v2.0)

### What It Is
A compressed, machine-readable session summary that captures critical context in <20 lines.

### Session Essence Template
```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
SESSION ESSENCE: [SESSION_ID]
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

MISSION: [1-line mission statement]
OUTCOME: [COMPLETE | PARTIAL | BLOCKED] - [1-line summary]

CREATED:
  - [file1.js] (XX KB, X items)
  - [file2.js] (XX KB, X items)

KEY DECISIONS:
  - [Decision 1]: [Why]
  - [Decision 2]: [Why]

GOTCHAS:
  - [Issue 1]: [Resolution]
  - [Issue 2]: [Resolution]

PATTERN USED: [workflow pattern]
SKILLS USED: [list of skills]

HANDOFF:
  NEXT_SESSION: [ID]
  NEXT_MISSION: [1-line]
  FIRST_ACTION: [Specific action]
  
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

### Example Session Essence
```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
SESSION ESSENCE: MAT-003
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

MISSION: Create carbon steels P-CS-021 to P-CS-030 with 127-param schema
OUTCOME: COMPLETE - 10 materials created, 60KB file verified

CREATED:
  - carbon_steels_021_030.js (60KB, 10 materials)

KEY DECISIONS:
  - Used chunked write (append mode): Single write truncated >50KB
  - Compact JSON format: Reduced file size by 40%

GOTCHAS:
  - Filesystem:write_file truncates at ~50KB: Use Desktop Commander append
  - Johnson-Cook params: Source from ALGORITHM_REGISTRY not material lookup

PATTERN USED: template â†’ modify â†’ validate â†’ chunk-write â†’ verify
SKILLS USED: prism-material-templates, prism-validator, prism-large-file-writer

HANDOFF:
  NEXT_SESSION: MAT-004
  NEXT_MISSION: Create carbon steels P-CS-031 to P-CS-040
  FIRST_ACTION: Filesystem:write_file header for carbon_steels_031_040.js
  
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

---

## SESSION START TEMPLATE

### Ultra-Fast Start (5 seconds)
```javascript
// 1. READ QUICK RESUME ONLY
Filesystem:read_file("C:\\PRISM REBUILD...\\CURRENT_STATE.json")
// Parse just: state.quickResume + state.currentTask

// 2. IF currentTask exists and IN_PROGRESS:
//    Resume it immediately, don't announce
// 3. IF no currentTask:
//    Start nextSession work
```

### Standard Start (30 seconds)
```javascript
// 1. Read state
Filesystem:read_file("C:\\PRISM REBUILD...\\CURRENT_STATE.json")

// 2. Quick announce
`â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
5-SECOND RESUME
DOING:   ${quickResume.forNextChat}
STOPPED: ${quickResume.lastItem || 'Fresh start'}
NEXT:    ${nextSession.focus}
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`

// 3. Start working
```

---

## CHECKPOINT TEMPLATE

### Micro-Checkpoint (Every 5-10 ops)
```javascript
// Just update progress counter - fast
Desktop Commander:edit_block({
  file_path: "C:\\...\\CURRENT_STATE.json",
  old_string: '"completed": 3',
  new_string: '"completed": 4'
})
// NO announcement needed
```

### Standard Checkpoint (Yellow zone)
```markdown
âœ“ CHECKPOINT: [what completed]
  Files: [list]
  Next: [immediate action]
```

### Full Checkpoint (Orange/Red zone)
```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ”¶ CHECKPOINT - SAVING ALL PROGRESS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
DONE:  [list completed items]
SAVED: [files with sizes]
NEXT:  [exact next action]
STATE: CURRENT_STATE.json updated âœ“
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

---

## SESSION END TEMPLATES

### Quick End (< 1 hour session)
```markdown
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
SESSION COMPLETE: [ID]
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
âœ“ [X] items completed
âœ“ Files: [list]
â†’ Next: [SESSION_ID] - [1-line description]

5-SECOND RESUME FOR NEXT CHAT:
DOING:   [What next session will do]
STOPPED: [Where this session ended]
NEXT:    [First action for next session]
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

### Full End (Major milestone)
Generate full Session Essence (see format above) + write to SESSION_LOGS/

---

## RECOVERY TEMPLATES

### After Compaction (Priority-Ranked)
```javascript
// TIER 1: Always do this (10 sec)
Filesystem:read_file("C:\\...\\CURRENT_STATE.json")
// Check: quickResume, currentTask

// TIER 2: If currentTask exists (30 sec)
// Read last 20 lines of targetFile
Desktop Commander:read_file({ path: targetFile, offset: -20 })

// TIER 3: If still unclear (2 min)
// Read latest session log
Filesystem:read_file("C:\\...\\SESSION_LOGS\\SESSION_[latest]_LOG.md")

// TIER 4: After major gap (1 min)
// Read context DNA
Filesystem:read_file("C:\\...\\CONTEXT_DNA\\[latest].json")
```

### After New Chat
```markdown
## NEW CHAT QUICK START

1. âš¡ Read `quickResume` from CURRENT_STATE.json
2. ðŸ“‹ Check if `currentTask` is IN_PROGRESS
3. ðŸŽ¯ Either RESUME task or START nextSession
4. ðŸš€ Begin working (don't waste time on verbose announcements)
```

---

## STATE FILE QUICK UPDATE TEMPLATES

### Set Quick Resume
```javascript
state.quickResume = {
  forNextChat: "[One-line: what to do]",
  approach: "[Workflow pattern]",
  skillsToUse: ["skill1", "skill2"],
  lastItem: "[Exact last item completed]",
  firstAction: "[Exact first action for next chat]"
};
```

### Set 5-Second Resume Fields
```javascript
state.fiveSecondResume = {
  doing: "Creating carbon steels P-CS-031 to P-CS-040",
  stopped: "After P-CS-035 (AISI 1040 Hot Rolled)",
  next: "Append P-CS-036 to carbon_steels_031_040.js"
};
```

### Write Session Essence
```javascript
const essence = `
SESSION ESSENCE: ${sessionId}
MISSION: ${mission}
OUTCOME: ${status} - ${summary}
...
`;
Filesystem:write_file({
  path: `C:\\...\\SESSION_LOGS\\ESSENCE_${sessionId}.md`,
  content: essence
});
```

---

## HANDOFF COMMUNICATION

### For Same User (Next Session)
Use 5-Second Resume format (see above)

### For Different Context (Cross-Reference)
Use Session Essence format (see above)

### Status Report (User Request)
```markdown
## PRISM STATUS

**Progress:** ${completed}/${total} (${percentage}%)
**Phase:** ${phase}
**Last:** ${lastSession.name} - ${lastSession.status}
**Next:** ${nextSession.name}

**Recent:**
- ${accomplishment1}
- ${accomplishment2}

**Blockers:** ${blockers || "None"}
```

---

## BUFFER ZONE ACTIONS

### Yellow (10+ calls) â†’ Standard checkpoint + continue
### Orange (15+ calls) â†’ Full checkpoint + caution
### Red (18+ calls) â†’ Full checkpoint + essence + STOP

---

## INTEGRATION

| Skill | Role |
|-------|------|
| `prism-state-manager` | Handles state file updates |
| `prism-context-dna` | Generates session fingerprints |
| `prism-context-pressure` | Triggers checkpoints |
| `prism-quick-start` | Ultra-minimal startup |
| `prism-task-continuity` | Anti-restart logic |

---

## VERSION HISTORY

| Ver | Date | Changes |
|-----|------|---------|
| **2.0** | 2026-01-23 | 5-second resume, essence format, priority reading |
| 1.0 | 2026-01-22 | Initial templates |



========================================
SKILL: prism-state-manager
========================================
---
name: prism-state-manager
description: |
  Enhanced PRISM session state management v2.0 with auto-checkpoint triggers, 
  delta-only updates, and recovery confidence scoring. Use when starting/ending 
  sessions, updating CURRENT_STATE.json, or recovering from compaction.
  
  MIT Foundation: 6.033 (Systems), 6.824 (Distributed Systems), 6.005 (Software Construction)
---

# PRISM State Manager v2.0 (Enhanced)

> âš¡ **FOR ROUTINE SESSION START:** Use `prism-quick-start` instead (simpler, fewer tokens)  
> ðŸ”„ **INTEGRATES WITH:** `prism-context-pressure`, `prism-context-dna`

---

## Critical Paths

```
STATE FILE:    C:\\PRISM\CURRENT_STATE.json
SESSION LOGS:  C:\\PRISM\SESSION_LOGS\
LOCAL ROOT:    C:\\PRISM\
```

---

## ðŸ”´ AUTO-CHECKPOINT SYSTEM (NEW v2.0)

### Checkpoint Trigger Rules

Claude MUST checkpoint when ANY of these conditions are met:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| **Tool calls** | 10+ since last save | Yellow â†’ Checkpoint soon |
| **Tool calls** | 15+ since last save | Orange â†’ Checkpoint NOW |
| **Tool calls** | 18+ since last save | Red â†’ STOP, save everything |
| **Response length** | ~2000 words | Yellow zone |
| **Response length** | ~3500 words | Red zone - truncation risk |
| **Exchanges** | 15+ in conversation | Yellow zone |
| **Exchanges** | 25+ in conversation | Red zone |
| **Time** | 10+ min without save | Auto-checkpoint |
| **Complexity** | Multi-step operation | Save before starting |
| **Files created** | After EACH file write | Verify + checkpoint |

### Checkpoint Types

**1. MICRO-CHECKPOINT (Every 5-10 operations)**
```javascript
// Update just currentTask progress - fast, minimal
Desktop Commander:edit_block({
  file_path: "C:\\PRISM REBUILD...\\CURRENT_STATE.json",
  old_string: '"currentStep": 3',
  new_string: '"currentStep": 4'
})
```

**2. STANDARD CHECKPOINT (Yellow zone)**
```javascript
// Update currentTask + checkpoint.lastCompleted
{
  "checkpoint": {
    "timestamp": "2026-01-23T18:30:00Z",
    "lastCompleted": "P-CS-035 (AISI 1040 Hot Rolled)",
    "nextToDo": "P-CS-036",
    "toolCallsSinceCheckpoint": 0  // Reset counter
  }
}
```

**3. FULL CHECKPOINT (Orange/Red zone or session end)**
```javascript
// Full state update + session log + handoff
// See "Session End Protocol" section
```

### Auto-Checkpoint Code Pattern

```javascript
// At the start of each response, Claude should mentally track:
const checkpointStatus = {
  toolCallsSinceSave: 0,  // Increment with each tool call
  wordsGenerated: 0,      // Estimate from response
  exchanges: 0,           // Count from conversation
  lastCheckpointTime: Date.now()
};

// After each tool call:
checkpointStatus.toolCallsSinceSave++;
if (checkpointStatus.toolCallsSinceSave >= 10) {
  // YELLOW ZONE - Complete current unit, then checkpoint
}
if (checkpointStatus.toolCallsSinceSave >= 15) {
  // ORANGE ZONE - Checkpoint NOW before next operation
}
if (checkpointStatus.toolCallsSinceSave >= 18) {
  // RED ZONE - STOP, save everything, graceful handoff
}
```

---

## ðŸ”„ DELTA-ONLY UPDATES (NEW v2.0)

### Principle (from MIT 6.033)
Only write what changed, not the entire state file.

### Implementation

**Instead of full file rewrite:**
```javascript
// âŒ SLOW - rewrites ~8KB every time
Filesystem:write_file(path, JSON.stringify(fullState))
```

**Use targeted edit:**
```javascript
// âœ… FAST - updates only changed field
Desktop Commander:edit_block({
  file_path: path,
  old_string: '"currentStep": 3,',
  new_string: '"currentStep": 4,'
})
```

### Delta Update Templates

**Update progress counter:**
```javascript
old: '"completed": 25,'
new: '"completed": 26,'
```

**Update current task status:**
```javascript
old: '"status": "IN_PROGRESS"'
new: '"status": "COMPLETE"'
```

**Add to array (e.g., completed items):**
```javascript
old: '"completedItems": ["P-CS-031", "P-CS-032"]'
new: '"completedItems": ["P-CS-031", "P-CS-032", "P-CS-033"]'
```

**Update nested field:**
```javascript
old: '"materialsProgress": {\n    "completed": 30'
new: '"materialsProgress": {\n    "completed": 31'
```

---

## ðŸ“Š RECOVERY CONFIDENCE SCORING (NEW v2.0)

### What It Is
A score (0-100%) indicating how much context can be recovered from state alone.

### Scoring Rules

| Condition | Score |
|-----------|-------|
| `quickResume` complete | +30% |
| `currentTask` with details | +25% |
| `checkpoint` recent (<10 min) | +20% |
| Target file verified exists | +15% |
| Session log exists | +10% |
| **TOTAL POSSIBLE** | **100%** |

### Add to State File

```json
{
  "recoveryConfidence": {
    "score": 85,
    "breakdown": {
      "quickResume": 30,
      "currentTask": 25,
      "checkpoint": 20,
      "targetFile": 10,
      "sessionLog": 0
    },
    "missingFor100": ["Session log not yet written"],
    "reconstructionHint": "If score <70%, read transcript + last session log"
  }
}
```

### Recovery Actions by Score

| Score | Action |
|-------|--------|
| 90-100% | Resume immediately from state |
| 70-89% | Resume, but verify target file first |
| 50-69% | Read state + latest session log |
| <50% | Read state + session log + transcript |

---

## ðŸš€ OPTIMIZED SESSION START

### Fast Start (95% of cases)
```
1. Read CURRENT_STATE.json â†’ quickResume section
2. Check currentTask â†’ if IN_PROGRESS, RESUME it
3. Check recoveryConfidence.score â†’ if >70%, continue
4. Execute next task
```

### Full Start (new project or low confidence)
```
1. Read full CURRENT_STATE.json
2. Read latest SESSION_LOGS/SESSION_*.md
3. Verify target files exist
4. Announce session formally
5. Update status to IN_PROGRESS
```

---

## State File Key Sections

### quickResume (Read First)
```json
{
  "quickResume": {
    "forNextChat": "CREATE carbon_steels_031_040.js",
    "approach": "Use prism-material-templates, modify per grade",
    "skillsToUse": ["prism-material-templates", "prism-validator"],
    "lastFile": "carbon_steels_021_030.js",
    "lastItem": "P-CS-030"
  }
}
```

### currentTask (Check for In-Progress)
```json
{
  "currentTask": {
    "name": "Carbon Steels Part 4",
    "status": "IN_PROGRESS",
    "currentStep": 3,
    "completedItems": ["P-CS-031", "P-CS-032"],
    "remainingItems": ["P-CS-033", "P-CS-034", "..."],
    "targetFile": "carbon_steels_031_040.js"
  }
}
```

### checkpoint (Frequent Saves)
```json
{
  "checkpoint": {
    "timestamp": "2026-01-23T18:30:00Z",
    "lastCompleted": "P-CS-032",
    "nextToDo": "P-CS-033",
    "toolCallsSinceCheckpoint": 0,
    "resumeInstructions": "Append P-CS-033 to carbon_steels_031_040.js"
  }
}
```

---

## Session End Protocol

### Quick End (Single task completed)
```markdown
1. Update currentTask.status = "COMPLETE"
2. Update quickResume for next chat
3. Update checkpoint with final state
4. Brief log (3-5 lines): SESSION_LOGS/SESSION_[ID]_LOG.md
5. Calculate recoveryConfidence score
```

### Full End (Major milestone)
```markdown
1. Full state update
2. Detailed session log
3. Update sessionHistory array
4. Generate context DNA fingerprint (see prism-context-dna)
5. Remind about Box sync
```

---

## Recovery After Compaction

```
IF context compacted:
1. Read transcript path from compaction message
2. Read CURRENT_STATE.json
3. Check recoveryConfidence.score:
   - If >70%: Resume from currentTask
   - If <70%: Also read latest session log
4. DO NOT restart - CONTINUE from checkpoint
```

---

## Integration Map

| Skill | Relationship |
|-------|--------------|
| `prism-quick-start` | Use for routine startups (simpler) |
| `prism-context-pressure` | Monitors when to auto-checkpoint |
| `prism-context-dna` | Generates session fingerprints |
| `prism-task-continuity` | Anti-restart protocols |
| `prism-session-handoff` | Handoff templates |
| `prism-error-recovery` | When state file corrupted |

---

## Quick Reference

### Yellow Zone Actions
```
âœ“ Complete current atomic unit
âœ“ Checkpoint (micro or standard)
âœ“ Continue working
```

### Orange Zone Actions
```
âœ“ STOP after current item
âœ“ Full checkpoint NOW
âœ“ Verify file saved
âœ“ Resume cautiously
```

### Red Zone Actions
```
âœ“ STOP IMMEDIATELY
âœ“ Full checkpoint + handoff
âœ“ Write session log
âœ“ Generate context DNA
âœ“ NO new work until saved
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.0** | 2026-01-23 | Auto-checkpoint, delta updates, recovery scoring |
| 1.1 | 2026-01-22 | Integration with prism-quick-start |
| 1.0 | 2026-01-21 | Initial version |



========================================
SKILL: prism-swarm-orchestrator
========================================
---
name: prism-swarm-orchestrator
description: Multi-agent swarm orchestration for parallel PRISM extraction and migration. Use when deploying multiple Claude agents to work on different modules simultaneously. Coordinates agent roles (Extractor, Auditor, Validator, Documenter), manages shared state, resolves conflicts, and merges results.
---

# PRISM Swarm Orchestrator

Orchestrates parallel multi-agent extraction using Claude Flow v3 patterns.

## ROI

- **Without swarm:** 15-25 extraction sessions
- **With swarm:** 3-5 extraction sessions (5x faster)
- **Token reduction:** 75-80% via smart routing

## Agent Roles

| Role | Count | Responsibility |
|------|-------|----------------|
| Queen | 1 | Coordinate, assign work, merge results |
| Extractor | 4-6 | Extract specific module categories |
| Auditor | 1 | Validate completeness |
| Documenter | 1 | Generate docs as modules extracted |
| Validator | 1 | Run tests, verify requirements |

## Swarm Deployment

```python
# Deploy extraction swarm
python scripts/spawn_extraction_swarm.py --category databases --agents 4

# Coordinate running agents
python scripts/coordinate_agents.py --plan MULTI_AGENT_PLAN.md

# Merge results from all agents
python scripts/merge_results.py --source agent_outputs/ --dest EXTRACTED/
```

## Coordination Protocol

### 1. Queen Reads State
```python
# Queen reads CURRENT_STATE.json and creates work assignments
assignments = {
    'agent_1': ['materials', 'tools'],
    'agent_2': ['machines', 'workholding'],
    'agent_3': ['post', 'process'],
    'agent_4': ['engines/cad', 'engines/cam']
}
```

### 2. Agents Work in Parallel
Each agent:
- Reads assigned categories from MULTI_AGENT_PLAN.md
- Extracts modules to temporary directory
- Updates progress in shared state
- Signals completion

### 3. Queen Merges
- Collects all agent outputs
- Resolves any conflicts
- Merges to final EXTRACTED/ directory
- Updates CURRENT_STATE.json

## Shared State (MULTI_AGENT_PLAN.md)

```markdown
# PRISM Multi-Agent Extraction Plan

## Assignments
| Agent | Categories | Status |
|-------|-----------|--------|
| agent_1 | materials, tools | IN_PROGRESS |
| agent_2 | machines | COMPLETE |

## Conflicts
- None

## Merge Queue
- machines/CORE/*.js - Ready
```

## Conflict Resolution

When two agents modify overlapping content:
1. Queen detects conflict via file hashes
2. Semantic merge attempted (if different functions)
3. If true conflict, Queen arbitrates based on timestamps

## Integration with Claude Flow v3

Compatible with:
- Hive-mind architecture (Queen + Workers)
- Shared SQLite memory
- Fork-join patterns
- Checkpoint/rollback recovery

See `references/claude_flow_integration.md` for setup.



========================================
SKILL: prism-task-continuity
========================================
---
name: prism-task-continuity
description: |
  Enforces task continuity and prevents mid-task restarts. Optimized for v1.3 skill structure. For routine session starts, use prism-quick-start instead of reading this full skill.
---

# PRISM Task Continuity Skill

> âš¡ **FOR ROUTINE STARTS:** Use `prism-quick-start` (contains anti-restart essentials)

## ðŸ”´ READ SKILLS BEFORE STARTING TASKS

**Optimized v1.3 Protocol:**
1. Read `prism-quick-start` ONLY (100 lines, has everything)
2. Read CURRENT_STATE.json `quickResume` section
3. Check `currentTask` - if exists, RESUME it
4. Execute

**Only read additional skills when needed for complex tasks.**

## The Problem

Claude often:
- Jumps into tasks without reading relevant skills first
- Stops mid-task and restarts from the beginning
- Re-reads files already read
- Pivots mid-task to "figure out how"

**This wastes tokens and causes compaction.**

## The Solution: READ â†’ CHECKPOINT â†’ CONTINUE â†’ COMPLETE

### Before ANY Task:
```
1. READ prism-quick-start (not 5+ skills!)
2. CHECK currentTask in state file
3. RESUME if in-progress, or START new
4. EXECUTE with tools from quick-start
```

### During Task:
```
1. CHECKPOINT - Update currentTask every 3 tool calls
2. CONTINUE - Pick up from checkpoint
3. COMPLETE - Finish before switching
4. VERIFY - Check at END, not mid-stream
```

## Skill Reading Protocol (v1.3)

| Situation | Read |
|-----------|------|
| Session start | `prism-quick-start` ONLY |
| Need module line numbers | `prism-extraction-index` |
| Complex extraction | + `prism-extractor` |
| Error occurred | + `prism-error-recovery` |
| Unsure which tool | + `prism-tool-selector` |

## Mandatory Checkpointing

Update `currentTask` in CURRENT_STATE.json:

| Trigger | Action |
|---------|--------|
| After reading a file | Update `lastCheckpoint` |
| After writing a file | Add to `completedItems` |
| Every 3 tool calls | Update `currentStep` |
| Before risky operation | Full checkpoint |

### currentTask Structure
```json
{
  "currentTask": {
    "name": "Task description",
    "totalSteps": 6,
    "currentStep": 3,
    "status": "IN_PROGRESS",
    "completedItems": ["Item 1", "Item 2"],
    "remainingItems": ["Item 3", "Item 4"]
  }
}
```

## Anti-Restart Checklist

Before ANY restart impulse:
```
â–¡ Did I read prism-quick-start?             â†’ If no, READ NOW but don't restart
â–¡ Have I checkpointed currentTask?           â†’ If no, SAVE FIRST
â–¡ Can I continue from where I stopped?       â†’ Almost always YES
â–¡ Is restarting ACTUALLY necessary?          â†’ Almost always NO
â–¡ Did the user explicitly request restart?   â†’ Required for restart
```

## Restart is ONLY Allowed When:

1. âœ… User explicitly says "start over" or "restart"
2. âœ… Critical error makes previous work INVALID (user confirms)
3. âœ… State file corrupted (user confirms)
4. âŒ NOT because didn't read skills (read now, continue)
5. âŒ NOT because "uncertain" (checkpoint and ask)
6. âŒ NOT because want to "figure out how" (should have read quick-start)

## Summary

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              TASK CONTINUITY PROTOCOL v1.3                  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                             â”‚
â”‚   ðŸ“– Read prism-quick-start at session start                â”‚
â”‚   ðŸ“ Use prism-extraction-index for line numbers            â”‚
â”‚   ðŸš« NEVER restart mid-task                                 â”‚
â”‚   âœ… CHECKPOINT â†’ CONTINUE â†’ COMPLETE                       â”‚
â”‚                                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```



========================================
SKILL: prism-tdd
========================================
---
name: prism-tdd
description: |
  Test-Driven Development skill adapted from obra/superpowers for PRISM module
  validation. Enforces RED-GREEN-REFACTOR cycle for all module development.
  Use when: creating new modules, modifying existing modules, validating database
  entries, or ensuring extraction completeness. Triggers: creating modules,
  modifying code, validating databases, extraction verification, quality assurance.
---

# PRISM TDD SKILL v1.0
## Test-Driven Development for Manufacturing Intelligence
### Adapted from obra/superpowers for PRISM validation

---

## CORE PRINCIPLE

**RED â†’ GREEN â†’ REFACTOR**

Never write production code without first writing a test that fails.

For PRISM, this means:
1. **RED**: Define what success looks like (validation criteria)
2. **GREEN**: Implement just enough to pass validation
3. **REFACTOR**: Optimize without breaking validation

---

## ðŸ”´ RED: WRITE FAILING TESTS FIRST

### For Module Extraction
```javascript
// Define what we expect BEFORE extracting
const EXTRACTION_TESTS = {
  moduleName: 'PRISM_MATERIALS_MASTER',
  tests: [
    { test: 'Module exists', expected: true },
    { test: 'Line count', expected: { min: 500 } },
    { test: 'Has getMaterial()', expected: true },
    { test: 'Has getAllMaterials()', expected: true },
    { test: 'Has searchMaterials()', expected: true },
    { test: 'Material count', expected: { min: 618 } },
    { test: 'Has all required fields', expected: REQUIRED_FIELDS },
    { test: 'No syntax errors', expected: true },
    { test: 'Dependencies documented', expected: true },
    { test: 'Consumers identified', expected: { min: 15 } }
  ]
};
```

### For Material Entries
```javascript
// Define validation BEFORE creating material
const MATERIAL_TESTS = {
  materialId: 'P-CS-031',
  tests: [
    { test: 'Has all 127 parameters', expected: true },
    { test: 'composition sums to 100%', expected: true },
    { test: 'kc1_1 in valid range', expected: { min: 500, max: 5000 } },
    { test: 'taylor_n in valid range', expected: { min: 0.1, max: 0.5 } },
    { test: 'physical.density > 0', expected: true },
    { test: 'thermal properties consistent', expected: true },
    { test: 'Has cutting recommendations', expected: true },
    { test: 'Has statistical metadata', expected: true }
  ]
};
```

### For Database Wiring
```javascript
// Define consumer requirements BEFORE wiring
const WIRING_TESTS = {
  database: 'PRISM_MATERIALS_MASTER',
  tests: [
    { test: 'Consumer count', expected: { min: 15 } },
    { test: 'PRISM_SPEED_FEED_CALCULATOR connected', expected: true },
    { test: 'PRISM_FORCE_CALCULATOR connected', expected: true },
    { test: 'PRISM_THERMAL_ENGINE connected', expected: true },
    { test: 'PRISM_TOOL_LIFE_ENGINE connected', expected: true },
    { test: 'PRISM_AI_LEARNING_PIPELINE connected', expected: true },
    { test: 'Gateway routes registered', expected: { min: 5 } },
    { test: 'All consumers receive data', expected: true }
  ]
};
```

---

## ðŸŸ¢ GREEN: IMPLEMENT TO PASS

### Only Implement What's Needed

```
âœ“ If test requires 127 parameters, add exactly 127
âœ“ If test requires getMaterial(), add that function
âœ“ If test requires 15 consumers, wire exactly 15

âœ— Don't add "nice to have" features
âœ— Don't optimize before tests pass
âœ— Don't add untested functionality
```

### Implementation Order

1. Make the simplest test pass first
2. Then the next simplest
3. Build up complexity gradually
4. Commit/save after each test passes

---

## ðŸ”µ REFACTOR: OPTIMIZE WITHOUT BREAKING

### When All Tests Pass

```
1. Look for code duplication â†’ Extract common patterns
2. Look for complexity â†’ Simplify logic
3. Look for performance issues â†’ Optimize hot paths
4. Look for clarity issues â†’ Improve naming/structure

CRITICAL: Re-run ALL tests after each refactor
```

### Refactor Checklist

```
â˜ All tests still pass?
â˜ No new warnings/errors?
â˜ Performance maintained or improved?
â˜ Code more readable?
â˜ Documentation updated?
```

---

## PRISM-SPECIFIC TDD PATTERNS

### Material Validation Pattern

```javascript
// 1. RED: Define what valid material looks like
function validateMaterial(material) {
  const errors = [];
  
  // Required fields
  if (!material.id) errors.push('Missing id');
  if (!material.name) errors.push('Missing name');
  if (!material.category) errors.push('Missing category');
  
  // Parameter count
  const paramCount = countParameters(material);
  if (paramCount < 127) {
    errors.push(`Only ${paramCount}/127 parameters`);
  }
  
  // Composition check
  if (material.composition) {
    const sum = Object.values(material.composition)
      .reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {
      errors.push(`Composition sums to ${sum}%, not 100%`);
    }
  }
  
  // Range checks
  if (material.kc1_1 < 500 || material.kc1_1 > 5000) {
    errors.push(`kc1_1 ${material.kc1_1} outside valid range`);
  }
  
  return { valid: errors.length === 0, errors };
}

// 2. GREEN: Create material that passes
const material = {
  id: 'P-CS-031',
  name: 'AISI 1055 Carbon Steel',
  // ... all 127 parameters
};

// 3. Verify
const result = validateMaterial(material);
console.assert(result.valid, result.errors);
```

### Module Extraction Pattern

```javascript
// 1. RED: Define extraction test
function testModuleExtraction(module) {
  const tests = [];
  
  // Existence
  tests.push({
    name: 'Module exists',
    pass: module !== null && module !== undefined
  });
  
  // Required functions
  const requiredFunctions = ['init', 'get', 'set', 'query'];
  for (const fn of requiredFunctions) {
    tests.push({
      name: `Has ${fn}()`,
      pass: typeof module[fn] === 'function'
    });
  }
  
  // Dependencies documented
  tests.push({
    name: 'Dependencies documented',
    pass: module._dependencies && module._dependencies.length > 0
  });
  
  // Consumers identified
  tests.push({
    name: 'Consumers identified',
    pass: module._consumers && module._consumers.length >= 6
  });
  
  return tests;
}

// 2. GREEN: Extract module that passes all tests
// 3. REFACTOR: Clean up extraction, improve structure
```

---

## TDD WORKFLOW FOR PRISM SESSIONS

### Before Starting Work

```markdown
## TDD PREPARATION
1. List what needs to be created/modified
2. Write validation criteria for EACH item
3. Create test functions or checklists
4. Verify tests would FAIL with current state
```

### During Work

```markdown
## TDD EXECUTION
FOR EACH item:
  1. Confirm test fails (RED)
  2. Implement minimum to pass (GREEN)
  3. Verify test passes
  4. Optimize if needed (REFACTOR)
  5. Move to next item
```

### After Work

```markdown
## TDD VERIFICATION
1. Run ALL tests again
2. Document any failures
3. Fix any regressions
4. Update test suite if needed
```

---

## TEST CATEGORIES

### Unit Tests (Individual Items)
- Single material validation
- Single function correctness
- Single parameter range check

### Integration Tests (Connections)
- Database â†’ Consumer wiring
- Module â†’ Module communication
- Gateway route resolution

### System Tests (End-to-End)
- Full calculation chain
- Complete user workflow
- Performance under load

---

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Writing code before defining success criteria
âŒ Adding features without tests
âŒ Skipping the RED phase
âŒ Not re-running tests after changes
âŒ Marking tests as "pass" without verification
âŒ Implementing beyond what tests require
âŒ Refactoring without test coverage

---

## QUICK VALIDATION COMMANDS

```javascript
// Validate material structure
validateMaterial(material);

// Validate module completeness
testModuleExtraction(module);

// Validate wiring
verifyConsumerWiring(database);

// Validate 127-parameter compliance
countParameters(material) >= 127;

// Validate composition
validateComposition(material.composition);
```

---

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Define tests during planning phase
- **prism-debugging**: Use tests to isolate issues
- **prism-verification**: Tests are the verification criteria
- **prism-auditor**: Audit uses TDD test results

---

**END OF PRISM TDD SKILL**



========================================
SKILL: prism-tool-selector
========================================
---
name: prism-tool-selector
description: |
  Instant tool selection for PRISM development. Eliminates "which tool do I use?" confusion. Decision trees for every common task type. READ THIS WHEN UNSURE WHICH TOOL TO USE - don't pivot mid-task to figure it out.
---

# PRISM Tool Selector

## ðŸ”´ INSTANT DECISION TREES

### Reading Files

```
Is file on User's C: drive?
â”œâ”€â”€ YES â†’ Filesystem:read_file
â”‚         path: "C:\\PRISM\\..."
â”‚
â”œâ”€â”€ Is it large (>10K lines)?
â”‚   â””â”€â”€ YES â†’ Desktop Commander:read_file with offset/length
â”‚             path: "C:\\...", offset: 0, length: 1000
â”‚
â””â”€â”€ Is file in Claude's container (/mnt/, /home/)?
    â””â”€â”€ YES â†’ view (but DON'T save work here!)
```

### Writing Files

```
Where should output go?
â”œâ”€â”€ PRISM work (persistent) â†’ Filesystem:write_file
â”‚   path: "C:\\PRISM\\..."
â”‚
â”œâ”€â”€ Temporary processing â†’ Container (bash_tool/create_file)
â”‚   âš ï¸ WILL BE LOST - only for intermediate steps
â”‚
â””â”€â”€ User artifact to show â†’ create_file + present_files
    path: "/mnt/user-data/outputs/..."
```

### Listing/Searching

```
What do you need?
â”œâ”€â”€ List directory contents â†’ Filesystem:list_directory
â”‚   path: "C:\\PRISM\\..."
â”‚
â”œâ”€â”€ Search for files by name â†’ Desktop Commander:start_search
â”‚   searchType: "files", pattern: "PRISM_MATERIALS*"
â”‚
â”œâ”€â”€ Search file CONTENTS â†’ Desktop Commander:start_search
â”‚   searchType: "content", pattern: "function calculate"
â”‚
â””â”€â”€ Deep recursive listing â†’ Filesystem:directory_tree
```

### Large File Operations (Monolith)

```
Working with 986,621-line monolith?
â”œâ”€â”€ Find module location â†’ Desktop Commander:start_search
â”‚   searchType: "content", pattern: "const PRISM_MODULE_NAME"
â”‚
â”œâ”€â”€ Extract specific lines â†’ Desktop Commander:read_file
â”‚   offset: [start_line], length: [num_lines]
â”‚
â”œâ”€â”€ Process entire file â†’ Python script via Desktop Commander:start_process
â”‚   command: "python scripts/process.py", timeout_ms: 60000
â”‚
â””â”€â”€ Quick preview â†’ Filesystem:read_file with head parameter
    head: 100 (first 100 lines only)
```

### Batch Operations

```
Multiple files to process?
â”œâ”€â”€ <10 files, simple ops â†’ Loop with Filesystem tools
â”‚
â”œâ”€â”€ >10 files OR complex â†’ Python script
â”‚   Desktop Commander:start_process
â”‚   command: "python scripts/batch_op.py --dir C:\\..."
â”‚
â””â”€â”€ Parallel extraction â†’ Use prism-swarm-orchestrator
```

---

## TOOL QUICK REFERENCE

### Filesystem:* Tools (User's C: drive - PERSISTENT)

| Tool | Use For | Example |
|------|---------|---------|
| `read_file` | Read any text file | `path: "C:\\...\\CURRENT_STATE.json"` |
| `write_file` | Write/create files | `path: "C:\\...\\file.js", content: "..."` |
| `list_directory` | Directory contents | `path: "C:\\..."` |
| `search_files` | Find files by pattern | `path: "C:\\...", pattern: "*.js"` |
| `create_directory` | Make new folder | `path: "C:\\...\\NEW_FOLDER"` |
| `move_file` | Move/rename | `source: "...", destination: "..."` |
| `directory_tree` | Recursive listing | `path: "C:\\..."` |

### Desktop Commander:* Tools (Advanced Operations)

| Tool | Use For | Example |
|------|---------|---------|
| `read_file` | Large files with pagination | `offset: 5000, length: 500` |
| `write_file` | Write with append mode | `mode: "append"` |
| `start_search` | Powerful file/content search | `searchType: "content"` |
| `edit_block` | In-place file editing | `old_string: "...", new_string: "..."` |
| `start_process` | Run commands/scripts | `command: "python ...", timeout_ms: 30000` |
| `get_file_info` | File metadata | Size, dates, permissions |

### Container Tools (TEMPORARY - resets each session)

| Tool | Use For | Example |
|------|---------|---------|
| `view` | Read skills, project files | `path: "/mnt/skills/user/..."` |
| `bash_tool` | Run shell commands | `command: "python3 script.py"` |
| `create_file` | Create user artifacts | `path: "/mnt/user-data/outputs/..."` |
| `present_files` | Show files to user | `filepaths: ["/mnt/.../file.md"]` |

---

## COMMON TASK â†’ TOOL MAPPING

| Task | Tool(s) | Notes |
|------|---------|-------|
| Read CURRENT_STATE.json | `Filesystem:read_file` | Always first! |
| Write CURRENT_STATE.json | `Filesystem:write_file` | Frequent updates |
| List EXTRACTED folder | `Filesystem:list_directory` | Check progress |
| Find module in monolith | `Desktop Commander:start_search` | searchType: "content" |
| Extract module lines | `Desktop Commander:read_file` | Use offset/length |
| Write extracted module | `Filesystem:write_file` | To EXTRACTED folder |
| Run Python script | `Desktop Commander:start_process` | timeout_ms important |
| Read a skill | `view` | Container path /mnt/skills/... |
| Search for files | `Desktop Commander:start_search` | searchType: "files" |
| Edit file in place | `Desktop Commander:edit_block` | For small changes |

---

## âš ï¸ COMMON MISTAKES

### WRONG: Using container tools for PRISM work
```javascript
// âŒ WRONG - will be lost!
create_file({ path: "/home/claude/module.js", ... })
bash_tool({ command: "echo 'data' > /home/claude/file.js" })

// âœ… CORRECT - persistent
Filesystem:write_file({ path: "C:\\PRISM REBUILD...\\module.js", ... })
```

### WRONG: Using view for user's files
```javascript
// âŒ WRONG - view is for container
view({ path: "C:\\PRISM REBUILD...\\file.js" })

// âœ… CORRECT
Filesystem:read_file({ path: "C:\\PRISM REBUILD...\\file.js" })
```

### WRONG: Not using offset/length for large files
```javascript
// âŒ WRONG - may timeout or truncate
Filesystem:read_file({ path: "...monolith.html" }) // 986K lines!

// âœ… CORRECT
Desktop Commander:read_file({ 
  path: "...monolith.html", 
  offset: 136000, 
  length: 2000 
})
```

---

## DECISION FLOWCHART

```
START: What am I trying to do?
â”‚
â”œâ”€â–º READ something
â”‚   â”œâ”€â–º User's C: drive? â†’ Filesystem:read_file
â”‚   â”œâ”€â–º Large file? â†’ Desktop Commander:read_file + offset
â”‚   â””â”€â–º Container/skill? â†’ view
â”‚
â”œâ”€â–º WRITE something
â”‚   â”œâ”€â–º PRISM work? â†’ Filesystem:write_file to C:\
â”‚   â”œâ”€â–º User artifact? â†’ create_file + present_files
â”‚   â””â”€â–º Temp file? â†’ Container (but know it disappears!)
â”‚
â”œâ”€â–º FIND something
â”‚   â”œâ”€â–º Find files? â†’ Desktop Commander:start_search (files)
â”‚   â”œâ”€â–º Find content? â†’ Desktop Commander:start_search (content)
â”‚   â””â”€â–º List folder? â†’ Filesystem:list_directory
â”‚
â”œâ”€â–º PROCESS something
â”‚   â”œâ”€â–º Simple loop? â†’ Multiple Filesystem calls
â”‚   â””â”€â–º Complex/batch? â†’ Python via Desktop Commander:start_process
â”‚
â””â”€â–º EDIT something
    â”œâ”€â–º Small change? â†’ Desktop Commander:edit_block
    â””â”€â–º Full rewrite? â†’ Filesystem:write_file
```

---

## Remember

1. **CURRENT_STATE.json** â†’ Always `Filesystem:read_file` / `Filesystem:write_file`
2. **Skills** â†’ Always `view` (they're in /mnt/skills/)
3. **PRISM output** â†’ Always `Filesystem:write_file` to C:\
4. **Large files** â†’ Always `Desktop Commander:read_file` with offset/length
5. **Search** â†’ Always `Desktop Commander:start_search`



========================================
SKILL: prism-unit-converter
========================================
---
name: prism-unit-converter
description: |
  Instant unit conversions for manufacturing calculations. Covers stress,
  speed, feed, force, temperature, and dimensional units. 20% calculation
  time reduction. Eliminates conversion errors and lookup time.
---

# PRISM Unit Converter Skill
## Quick Conversion Formulas & Machining Unit Tables
**Time Savings: 20% calculation reduction**

---

## PURPOSE
Instant unit conversions for manufacturing calculations. Eliminates conversion errors and lookup time.

---

## STRESS / STRENGTH

### Pressure/Stress Units
```
1 MPa = 1 N/mmÂ²
1 MPa = 0.145038 ksi
1 MPa = 145.038 psi
1 ksi = 6.89476 MPa
1 psi = 0.00689476 MPa
1 GPa = 1000 MPa
1 bar = 0.1 MPa
1 kg/mmÂ² = 9.80665 MPa
```

### Quick Conversion Table
| MPa | ksi | psi |
|-----|-----|-----|
| 100 | 14.5 | 14,504 |
| 200 | 29.0 | 29,008 |
| 300 | 43.5 | 43,511 |
| 400 | 58.0 | 58,015 |
| 500 | 72.5 | 72,519 |
| 600 | 87.0 | 87,023 |
| 700 | 101.5 | 101,527 |
| 800 | 116.0 | 116,030 |
| 1000 | 145.0 | 145,038 |
| 1500 | 217.6 | 217,557 |
| 2000 | 290.1 | 290,076 |

### Quick Formulas
```javascript
MPa_to_ksi = MPa Ã— 0.145038
ksi_to_MPa = ksi Ã— 6.89476
MPa_to_psi = MPa Ã— 145.038
psi_to_MPa = psi Ã· 145.038
```

---

## LENGTH / DISTANCE

### Length Units
```
1 mm = 0.03937 in
1 in = 25.4 mm
1 m = 39.3701 in
1 ft = 304.8 mm
1 Âµm = 0.001 mm = 0.00003937 in
1 mil = 0.001 in = 0.0254 mm
```

### Quick Conversion Table
| mm | inch | Âµm |
|----|------|-----|
| 0.01 | 0.0004 | 10 |
| 0.1 | 0.004 | 100 |
| 0.5 | 0.020 | 500 |
| 1.0 | 0.039 | 1000 |
| 2.0 | 0.079 | 2000 |
| 5.0 | 0.197 | 5000 |
| 10.0 | 0.394 | 10000 |
| 25.4 | 1.000 | 25400 |

### Surface Finish (Ra)
```
1 Âµm Ra = 39.37 Âµin Ra
1 Âµin Ra = 0.0254 Âµm Ra
```

| Âµm Ra | Âµin Ra | Description |
|-------|--------|-------------|
| 0.1 | 4 | Super finish |
| 0.2 | 8 | Mirror |
| 0.4 | 16 | Ground |
| 0.8 | 32 | Fine turned |
| 1.6 | 63 | Standard turned |
| 3.2 | 125 | Rough turned |
| 6.3 | 250 | Coarse |
| 12.5 | 500 | Very rough |

---

## CUTTING SPEED / VELOCITY

### Speed Units
```
1 m/min = 3.2808 ft/min (sfm)
1 sfm = 0.3048 m/min
1 m/s = 60 m/min
```

### Cutting Speed Conversion
| m/min | sfm | m/s |
|-------|-----|-----|
| 50 | 164 | 0.83 |
| 100 | 328 | 1.67 |
| 150 | 492 | 2.50 |
| 200 | 656 | 3.33 |
| 250 | 820 | 4.17 |
| 300 | 984 | 5.00 |
| 400 | 1312 | 6.67 |
| 500 | 1640 | 8.33 |
| 800 | 2624 | 13.33 |

### RPM â†” Cutting Speed
```
RPM = (Vc Ã— 1000) / (Ï€ Ã— D)
Vc = (Ï€ Ã— D Ã— RPM) / 1000

Where:
  Vc = cutting speed (m/min)
  D = diameter (mm)
  RPM = spindle speed (rev/min)
```

| Diameter (mm) | Vc=100 m/min | Vc=200 m/min | Vc=300 m/min |
|---------------|--------------|--------------|--------------|
| 6 | 5305 RPM | 10610 RPM | 15915 RPM |
| 10 | 3183 RPM | 6366 RPM | 9549 RPM |
| 12 | 2653 RPM | 5305 RPM | 7958 RPM |
| 16 | 1989 RPM | 3979 RPM | 5968 RPM |
| 20 | 1592 RPM | 3183 RPM | 4775 RPM |
| 25 | 1273 RPM | 2546 RPM | 3820 RPM |
| 32 | 995 RPM | 1989 RPM | 2984 RPM |
| 50 | 637 RPM | 1273 RPM | 1910 RPM |
| 100 | 318 RPM | 637 RPM | 955 RPM |

---

## FEED RATE

### Feed Units
```
mm/rev = feed per revolution
mm/tooth = feed per tooth (milling)
mm/min = table feed rate
ipr = inches per revolution
ipm = inches per minute
```

### Conversions
```
mm/min = mm/rev Ã— RPM
mm/min = mm/tooth Ã— z Ã— RPM  (milling)
ipm = ipr Ã— RPM
mm/rev = ipr Ã— 25.4
```

### Feed Rate Table
| mm/rev | ipr |
|--------|-----|
| 0.05 | 0.002 |
| 0.10 | 0.004 |
| 0.15 | 0.006 |
| 0.20 | 0.008 |
| 0.25 | 0.010 |
| 0.30 | 0.012 |
| 0.40 | 0.016 |
| 0.50 | 0.020 |

---

## TEMPERATURE

### Temperature Units
```
Â°C = (Â°F - 32) Ã— 5/9
Â°F = Â°C Ã— 9/5 + 32
K = Â°C + 273.15
```

### Quick Conversion Table
| Â°C | Â°F | K |
|----|-----|-----|
| 0 | 32 | 273 |
| 100 | 212 | 373 |
| 200 | 392 | 473 |
| 300 | 572 | 573 |
| 400 | 752 | 673 |
| 500 | 932 | 773 |
| 600 | 1112 | 873 |
| 700 | 1292 | 973 |
| 800 | 1472 | 1073 |
| 1000 | 1832 | 1273 |
| 1500 | 2732 | 1773 |

---

## FORCE / POWER / TORQUE

### Force Units
```
1 N = 0.2248 lbf
1 lbf = 4.4482 N
1 kN = 1000 N = 224.8 lbf
1 kgf = 9.80665 N
```

### Power Units
```
1 kW = 1.341 hp
1 hp = 0.7457 kW
1 W = 1 NÂ·m/s = 1 J/s
```

### Torque Units
```
1 NÂ·m = 0.7376 ftÂ·lbf
1 ftÂ·lbf = 1.3558 NÂ·m
1 NÂ·m = 8.851 inÂ·lbf
```

### Cutting Power Formula
```
Power (kW) = Fc Ã— Vc / 60000
Power (hp) = Fc Ã— Vc / 44760

Where:
  Fc = cutting force (N)
  Vc = cutting speed (m/min)
```

### Power Quick Reference
| Fc (N) | Vc (m/min) | Power (kW) | Power (hp) |
|--------|------------|------------|------------|
| 500 | 100 | 0.83 | 1.12 |
| 1000 | 100 | 1.67 | 2.24 |
| 1000 | 200 | 3.33 | 4.47 |
| 2000 | 150 | 5.00 | 6.71 |
| 3000 | 200 | 10.00 | 13.41 |

---

## THERMAL PROPERTIES

### Thermal Conductivity
```
1 W/(mÂ·K) = 0.5778 BTU/(hrÂ·ftÂ·Â°F)
1 BTU/(hrÂ·ftÂ·Â°F) = 1.731 W/(mÂ·K)
```

### Specific Heat
```
1 J/(kgÂ·K) = 0.000239 BTU/(lbÂ·Â°F)
1 BTU/(lbÂ·Â°F) = 4186.8 J/(kgÂ·K)
```

### Thermal Expansion
```
1 Âµm/(mÂ·K) = 0.556 Âµin/(inÂ·Â°F)
1 Âµin/(inÂ·Â°F) = 1.8 Âµm/(mÂ·K)
```

---

## HARDNESS CONVERSIONS

### Approximate Conversion Table
| HRC | HB | HV | UTS (MPa) |
|-----|-----|-----|-----------|
| 20 | 226 | 238 | 760 |
| 25 | 253 | 266 | 860 |
| 30 | 286 | 302 | 980 |
| 35 | 327 | 345 | 1125 |
| 40 | 371 | 392 | 1280 |
| 45 | 421 | 446 | 1480 |
| 50 | 481 | 513 | 1720 |
| 55 | 560 | 595 | 1980 |
| 60 | 654 | 697 | 2240 |

### Brinell to Other Scales (Steel)
```
HV â‰ˆ HB Ã— 1.05 (for HB < 350)
HRC â‰ˆ (HB - 104) / 5.2 (for HB > 200)
UTS (MPa) â‰ˆ HB Ã— 3.45 (approximate)
```

### Rockwell B to Brinell
| HRB | HB |
|-----|-----|
| 60 | 105 |
| 70 | 125 |
| 80 | 150 |
| 85 | 170 |
| 90 | 190 |
| 95 | 210 |
| 100 | 240 |

---

## DENSITY / MASS

### Density Units
```
1 kg/mÂ³ = 0.001 g/cmÂ³
1 g/cmÂ³ = 1000 kg/mÂ³ = 0.0361 lb/inÂ³
1 lb/inÂ³ = 27,680 kg/mÂ³
```

### Common Material Densities
| Material | kg/mÂ³ | lb/inÂ³ |
|----------|-------|--------|
| Steel | 7850 | 0.284 |
| Stainless | 8000 | 0.289 |
| Aluminum | 2700 | 0.098 |
| Titanium | 4430 | 0.160 |
| Cast Iron | 7150 | 0.258 |
| Copper | 8960 | 0.324 |
| Brass | 8500 | 0.307 |

---

## MACHINING SPECIFIC CALCULATIONS

### Material Removal Rate (MRR)
```
Turning:  MRR = Vc Ã— f Ã— ap (cmÂ³/min)
Milling:  MRR = ae Ã— ap Ã— Vf / 1000 (cmÂ³/min)
Drilling: MRR = Ï€ Ã— DÂ² Ã— f Ã— N / 4000 (cmÂ³/min)

Where:
  Vc = cutting speed (m/min)
  f = feed (mm/rev)
  ap = depth of cut (mm)
  ae = width of cut (mm)
  Vf = table feed (mm/min)
  D = drill diameter (mm)
  N = RPM
```

### Specific Cutting Energy
```
u = Fc / (b Ã— h) [J/mmÂ³] or [N/mmÂ²]
u = Power / MRR [kW/(cmÂ³/min)]

Typical values:
  Steel: 2.5-4.0 J/mmÂ³
  Aluminum: 0.7-1.2 J/mmÂ³
  Titanium: 3.5-5.0 J/mmÂ³
  Cast Iron: 1.5-2.5 J/mmÂ³
```

### Chip Thickness Ratio
```
rc = h / hc = sin(Ï†) / cos(Ï† - Î³)

Where:
  h = uncut chip thickness (mm)
  hc = actual chip thickness (mm)
  Ï† = shear angle
  Î³ = rake angle
```

---

## QUICK JAVASCRIPT CONVERTERS

```javascript
// Stress
const MPa_to_ksi = MPa => MPa * 0.145038;
const ksi_to_MPa = ksi => ksi * 6.89476;

// Length
const mm_to_in = mm => mm * 0.03937;
const in_to_mm = inch => inch * 25.4;

// Speed
const mpm_to_sfm = mpm => mpm * 3.2808;
const sfm_to_mpm = sfm => sfm * 0.3048;

// RPM
const rpm_from_vc = (Vc_mpm, D_mm) => (Vc_mpm * 1000) / (Math.PI * D_mm);
const vc_from_rpm = (RPM, D_mm) => (Math.PI * D_mm * RPM) / 1000;

// Temperature
const C_to_F = C => C * 9/5 + 32;
const F_to_C = F => (F - 32) * 5/9;

// Power
const kW_to_hp = kW => kW * 1.341;
const cutting_power_kW = (Fc_N, Vc_mpm) => Fc_N * Vc_mpm / 60000;

// Hardness (approximate)
const HB_to_UTS = HB => HB * 3.45;  // MPa
const HB_to_HV = HB => HB * 1.05;   // for HB < 350
```

---

## END OF SKILL



========================================
SKILL: prism-utilization
========================================
---
name: prism-utilization
description: Enforce 100% utilization requirements for PRISM modules. Use during Stage 3 migration to verify all databases have required consumers, all calculations use 6+ sources, and all modules are fully wired. BLOCKS incomplete imports.
---

# PRISM Utilization Enforcer

Ensures 100% utilization of all PRISM databases and engines.

## Core Principle

**NO MODULE WITHOUT CONSUMERS. NO CALCULATION WITH <6 SOURCES.**

## Utilization Requirements

### Databases
| Database | Min Consumers |
|----------|---------------|
| PRISM_MATERIALS_MASTER | 15 |
| PRISM_MACHINES_DATABASE | 12 |
| PRISM_TOOLS_DATABASE | 10 |
| All other databases | 8 |

### Calculations
Every calculation MUST use 6+ sources:
1. Database source (material/tool/machine properties)
2. Physics model (force, thermal, dynamics)
3. AI/ML prediction (Bayesian, neural, ensemble)
4. Historical data (past successful runs)
5. Manufacturer data (catalog specifications)
6. Empirical validation (validated against real cuts)

## Verification Scripts

```python
# Verify module before import
python scripts/verify_before_import.py --module PRISM_MATERIALS_MASTER --consumers 15

# Verify calculation sources
python scripts/verify_calculation.py --calc calculateOptimalSpeed --sources 6

# Generate utilization report
python scripts/utilization_report.py --output report.md
```

## Block Incomplete Imports

```python
# This will FAIL if requirements not met
python scripts/verify_before_import.py --module PRISM_MATERIALS_MASTER --consumers 10
# ERROR: BLOCKED - Requires 15 consumers, only 10 provided
```

## Required Consumers Matrix

See `references/consumer_matrix.md` for complete databaseâ†’consumer mapping.

## Output Requirements

Every calculation output MUST include:
```javascript
{
  value: optimal_speed,
  confidence: 0.87,
  range_95: [min, max],
  sources: ['material', 'tool', 'machine', 'physics', 'historical', 'ai'],
  explanation: PRISM_XAI.explain(calculation_trace)
}
```

## Integration

Updates CURRENT_STATE.json with utilization metrics:
```json
{
  "migrationProgress": {
    "modulesImported": 50,
    "utilizationVerified": 50,
    "avgConsumers": 12.3
  }
}
```



========================================
SKILL: prism-validator
========================================
---
name: prism-validator
description: |
  Automated quality checks for materials and modules. Validates syntax,
  parameter ranges, cross-references, and physical consistency. Catches
  errors before they propagate. Includes JavaScript syntax and JSON validation.
---

# PRISM Validator Skill
## Automated Quality Checks for Materials & Modules

---

## Purpose
**Catch errors before they propagate.** Validates syntax, parameter ranges, cross-references, and physical consistency for materials and extracted modules.

---

## 1. JAVASCRIPT SYNTAX VALIDATION

### Quick Syntax Check
```bash
node --check [filename].js
```

### JSON Validation
```bash
node -e "JSON.parse(require('fs').readFileSync('[file]', 'utf8'))"
```

---

## 2. MATERIAL FILE STRUCTURE

### Required Sections (14 total)
All materials MUST have these 14 sections:

```
âœ“ identification      (8 required params)
âœ“ composition         (varies by material)
âœ“ physicalProperties  (12 required params)
âœ“ mechanicalProperties (15 required params)
âœ“ kienzle             (9 required params)
âœ“ johnsonCook         (13 required params)
âœ“ taylorToolLife      (12 required params)
âœ“ chipFormation       (12 required params)
âœ“ friction            (10 required params)
âœ“ thermalMachining    (14 required params)
âœ“ surfaceIntegrity    (12 required params)
âœ“ machinability       (8 required params)
âœ“ recommendedParameters (20+ params)
âœ“ statisticalData     (8 required params)
```

### Quick Section Check
```javascript
const requiredSections = [
  'identification', 'composition', 'physicalProperties', 'mechanicalProperties',
  'kienzle', 'johnsonCook', 'taylorToolLife', 'chipFormation',
  'friction', 'thermalMachining', 'surfaceIntegrity', 'machinability',
  'recommendedParameters', 'statisticalData'
];

function validateSections(material) {
  const missing = requiredSections.filter(s => !material[s]);
  return { valid: missing.length === 0, missing };
}
```

---

## 3. VALUE RANGE VALIDATION

### Physical Properties
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| density | 1,500 | 20,000 | kg/mÂ³ |
| meltingPoint.solidus | 200 | 3,500 | Â°C |
| meltingPoint.liquidus | 200 | 3,600 | Â°C |
| specificHeat | 100 | 2,000 | J/(kgÂ·K) |
| thermalConductivity | 5 | 430 | W/(mÂ·K) |
| thermalExpansion | 0.5 | 30 | Âµm/(mÂ·K) |
| electricalResistivity | 0.01 | 100 | ÂµÎ©Â·m |
| poissonsRatio | 0.15 | 0.50 | - |
| elasticModulus | 10 | 450 | GPa |
| shearModulus | 5 | 200 | GPa |

### Mechanical Properties
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| tensileStrength | 50 | 3,500 | MPa |
| yieldStrength | 25 | 3,000 | MPa |
| elongation | 0.5 | 80 | % |
| reductionOfArea | 1 | 90 | % |
| hardness.brinell | 30 | 750 | HB |
| hardness.rockwellC | -20 | 70 | HRC |
| impactStrength.charpy | 1 | 300 | J |
| fatigueStrength | 20 | 1,500 | MPa |
| fractureToughness | 5 | 250 | MPaÂ·âˆšm |
| strainHardeningExponent | 0.05 | 0.60 | - |

### Kienzle Parameters
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| Kc11_tangential | 400 | 5,000 | N/mmÂ² |
| Kc11_feed | 100 | 2,000 | N/mmÂ² |
| Kc11_radial | 80 | 1,500 | N/mmÂ² |
| mc_tangential | 0.10 | 0.45 | - |
| mc_feed | 0.15 | 0.55 | - |
| mc_radial | 0.18 | 0.60 | - |

### Johnson-Cook Parameters
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| A | 50 | 2,500 | MPa |
| B | 100 | 3,000 | MPa |
| n | 0.05 | 0.80 | - |
| C | 0.001 | 0.100 | - |
| m | 0.3 | 2.5 | - |
| meltingTemperature | 200 | 3,500 | Â°C |

### Taylor Tool Life
| Parameter | Min | Max | Notes |
|-----------|-----|-----|-------|
| HSS.C | 5 | 100 | m/min |
| HSS.n | 0.08 | 0.20 | - |
| carbide.C | 50 | 600 | m/min |
| carbide.n | 0.15 | 0.40 | - |
| ceramic.C | 100 | 1,000 | m/min |
| ceramic.n | 0.25 | 0.55 | - |

### Machinability
| Parameter | Min | Max | Notes |
|-----------|-----|-----|-------|
| rating | 5 | 400 | % vs B1112 |
| drillabilityIndex | 5 | 400 | - |
| grindabilityIndex | 5 | 200 | - |
| threadingIndex | 5 | 200 | - |

---

## 4. RELATIONSHIP VALIDATION

### Physical Consistency
```javascript
// These relationships MUST hold:

// 1. Yield < Tensile
yieldStrength < tensileStrength
// Typical ratio: yield/tensile = 0.50-0.95

// 2. Solidus < Liquidus
meltingPoint.solidus < meltingPoint.liquidus
// Typical gap: 20-100Â°C

// 3. Modulus relationships
elasticModulus > shearModulus
// E â‰ˆ 2.5 Ã— G for most metals

// 4. Poisson's ratio check
poissonsRatio â‰ˆ (E / (2 Ã— G)) - 1
// Tolerance: Â±5%
```

### Kienzle Consistency
```javascript
// Force component ordering
Kc11_tangential > Kc11_feed > Kc11_radial

// Typical ratios:
// feed â‰ˆ 30-40% of tangential
// radial â‰ˆ 20-30% of tangential

// Exponent ordering
mc_tangential < mc_feed < mc_radial

// Typical ranges:
// mc_tangential: 0.18-0.32
// mc_feed: mc_tangential + 0.08-0.12
// mc_radial: mc_feed + 0.03-0.08
```

### Taylor Consistency
```javascript
// C value ordering (higher = easier to machine)
C_ceramic > C_carbide_coated > C_carbide_uncoated > C_HSS

// n value ordering (higher = less speed sensitive)
n_ceramic > n_carbide_coated > n_carbide_uncoated > n_HSS

// Typical n values by tool type:
// HSS: 0.10-0.15
// Carbide uncoated: 0.20-0.28
// Carbide coated: 0.25-0.32
// Ceramic: 0.30-0.45
```

### Johnson-Cook Consistency
```javascript
// A â‰ˆ Yield strength (within Â±20%)
Math.abs(A - yieldStrength) / yieldStrength < 0.20

// B relationship
B â‰ˆ (tensileStrength - yieldStrength) / (strainHardeningExponent)^strainHardeningExponent

// Typical C values
C: 0.010-0.030 for most metals

// Melting point match
johnsonCook.meltingTemperature â‰ˆ meltingPoint.solidus (Â±50Â°C)
```

---

## 5. MACHINABILITY CROSS-CHECKS

### High Strength = Low Machinability
```javascript
if (tensileStrength > 1000) {
  expect(machinability.rating < 40);
}
if (tensileStrength > 1500) {
  expect(machinability.rating < 25);
}
```

### Stainless Steel (M group)
```javascript
if (isoGroup === 'M') {
  expect(Kc11_tangential > 2000);
  expect(machinability.rating < 60);
  expect(thermalConductivity < 30);
}
```

### Titanium/Superalloys (S group)
```javascript
if (isoGroup === 'S') {
  expect(machinability.rating < 30);
  expect(taylorToolLife.HSS.C < 15);
  expect(thermalConductivity < 20);
}
```

### Aluminum (N group)
```javascript
if (isoGroup === 'N' && subCategory === 'AL') {
  expect(machinability.rating > 150);
  expect(thermalConductivity > 100);
  expect(Kc11_tangential < 1200);
}
```

---

## 6. VALIDATION FUNCTION

```javascript
function validateMaterial(material) {
  const errors = [];
  const warnings = [];
  
  // 1. Check all sections present
  const requiredSections = [
    'identification', 'composition', 'physicalProperties', 
    'mechanicalProperties', 'kienzle', 'johnsonCook', 
    'taylorToolLife', 'chipFormation', 'friction',
    'thermalMachining', 'surfaceIntegrity', 'machinability',
    'recommendedParameters', 'statisticalData'
  ];
  
  requiredSections.forEach(section => {
    if (!material[section]) {
      errors.push(`Missing section: ${section}`);
    }
  });
  
  // 2. Check ID format
  const id = material.identification?.prismId;
  if (!id?.match(/^[PMKNSH]-[A-Z]{2}-\d{3}$/)) {
    errors.push(`Invalid ID format: ${id}`);
  }
  
  // 3. Check yield < tensile
  const y = material.mechanicalProperties?.yieldStrength?.value;
  const t = material.mechanicalProperties?.tensileStrength?.value;
  if (y && t && y >= t) {
    errors.push(`Yield (${y}) must be < tensile (${t})`);
  }
  
  // 4. Check solidus < liquidus
  const sol = material.physicalProperties?.meltingPoint?.solidus;
  const liq = material.physicalProperties?.meltingPoint?.liquidus;
  if (sol && liq && sol >= liq) {
    errors.push(`Solidus (${sol}) must be < liquidus (${liq})`);
  }
  
  // 5. Check Kc ordering
  const kc_t = material.kienzle?.Kc11_tangential?.value;
  const kc_f = material.kienzle?.Kc11_feed?.value;
  const kc_r = material.kienzle?.Kc11_radial?.value;
  if (kc_t && kc_f && kc_r) {
    if (!(kc_t > kc_f && kc_f > kc_r)) {
      warnings.push(`Kc ordering should be: tangential > feed > radial`);
    }
  }
  
  // 6. Check J-C A â‰ˆ yield
  const A = material.johnsonCook?.A;
  if (A && y) {
    const diff = Math.abs(A - y) / y;
    if (diff > 0.25) {
      warnings.push(`J-C A (${A}) differs from yield (${y}) by ${(diff*100).toFixed(0)}%`);
    }
  }
  
  // 7. Check Kc1.1 range
  if (kc_t && (kc_t < 400 || kc_t > 5000)) {
    errors.push(`Kc1.1 tangential (${kc_t}) out of range [400-5000]`);
  }
  
  // 8. Check composition sums ~100%
  const comp = material.composition;
  if (comp) {
    let sum = 0;
    Object.entries(comp).forEach(([k, v]) => {
      if (k !== 'iron' && typeof v?.nominal === 'number') {
        sum += v.nominal;
      }
    });
    if (sum > 50) {  // If enough alloying elements specified
      warnings.push(`Check composition sum: non-iron elements = ${sum.toFixed(1)}%`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 7. QUICK VALIDATION CHECKLIST

Use this mental checklist for each material:

```
â–¡ ID matches pattern: [ISO]-[SUB]-[###]
â–¡ All 14 sections present
â–¡ Composition adds to ~100% (with Fe balance)
â–¡ Yield < Tensile (ratio 0.5-0.95)
â–¡ Solidus < Liquidus
â–¡ Kc1.1 in valid range (400-5000 N/mmÂ²)
â–¡ Kc ordering: tangential > feed > radial
â–¡ mc ordering: tangential < feed < radial
â–¡ Taylor n: HSS < carbide < ceramic
â–¡ Taylor C: HSS < carbide < ceramic
â–¡ J-C A â‰ˆ yield strength (Â±20%)
â–¡ Thermal conductivity reasonable for material type
â–¡ Machinability rating consistent with hardness/strength
```

---

## 8. FILE STRUCTURE VALIDATION

### Required File Elements
```javascript
// 1. Header comment
/**
 * PRISM Manufacturing Intelligence
 * Material Database: [Category]
 * ...
 */

// 2. Metadata
const METADATA = {
  version: "9.0.0",
  category: "[Category]",
  count: [N],
  lastUpdated: "[ISO date]"
};

// 3. Materials object
const [CATEGORY]_MATERIALS = {
  'P-CS-001': { ... },
  'P-CS-002': { ... }
};

// 4. Export
if (typeof module !== 'undefined') {
  module.exports = { METADATA, [CATEGORY]_MATERIALS };
}
```

---

## END OF SKILL



========================================
SKILL: prism-verification
========================================
---
name: prism-verification
description: |
  Verification-before-completion skill adapted from obra/superpowers for PRISM
  quality assurance. NEVER mark anything complete without verification. Use when:
  finishing extractions, completing materials, wiring consumers, or ending sessions.
  Prevents incomplete work from being marked done. Triggers: completing extraction,
  finishing materials, wiring completion, session end, marking done.
---

# PRISM VERIFICATION SKILL v1.0
## Verification Before Completion
### Adapted from obra/superpowers for PRISM quality assurance

---

## CORE PRINCIPLE

**NOTHING IS COMPLETE UNTIL VERIFIED.**

Every piece of work must pass verification before being marked done:
1. Define verification criteria BEFORE starting
2. Execute verification checks AFTER finishing
3. Only mark complete when ALL checks pass
4. Document any exceptions

---

## ðŸ›¡ï¸ VERIFICATION PROTOCOL

### Pre-Completion Checklist

```markdown
BEFORE marking ANYTHING as complete, verify:

â˜ Work matches original objective?
â˜ All success criteria met?
â˜ Output exists and is accessible?
â˜ Output is valid (no corruption)?
â˜ No regressions introduced?
â˜ Documentation updated?
â˜ State file updated?
```

---

## VERIFICATION BY WORK TYPE

### Material Entry Verification

```markdown
## MATERIAL [ID] VERIFICATION

### Structure Checks
â˜ Has all 127 parameters
â˜ All required fields present (id, name, category)
â˜ No null/undefined in required fields

### Data Validity
â˜ Composition sums to 100% (Â±0.1%)
â˜ kc1_1 in range 500-5000 MPa
â˜ mc in range 0.1-0.5
â˜ taylor_n in range 0.1-0.5
â˜ density > 0 kg/mÂ³
â˜ temperatures in reasonable ranges

### Consistency Checks
â˜ Solidus â‰¤ Liquidus
â˜ Properties consistent with material family
â˜ No copy-paste errors from template

### Format Checks
â˜ JSON/JS syntax valid
â˜ No trailing commas
â˜ Proper encoding (UTF-8)

VERIFICATION RESULT: PASS / FAIL
```

### Module Extraction Verification

```markdown
## MODULE [NAME] VERIFICATION

### Completeness
â˜ All functions extracted
â˜ All data tables extracted
â˜ No truncation
â˜ Dependencies documented
â˜ Consumers identified (min 6)

### Syntax
â˜ No JavaScript errors
â˜ All brackets matched
â˜ No undefined references

### Functionality
â˜ Module initializes without error
â˜ Main functions callable
â˜ Returns expected types

### Documentation
â˜ Header comments present
â˜ Function descriptions
â˜ Parameter types documented
â˜ Consumer list documented

VERIFICATION RESULT: PASS / FAIL
```

### Consumer Wiring Verification

```markdown
## WIRING [DATABASE â†’ CONSUMER] VERIFICATION

### Connection
â˜ Consumer registered with Gateway
â˜ Route defined correctly
â˜ Event subscriptions active

### Data Flow
â˜ Request reaches database
â˜ Response reaches consumer
â˜ Data format matches expectation

### Error Handling
â˜ Null/missing data handled
â˜ Invalid input handled
â˜ Timeout handled

### Performance
â˜ Response time acceptable (<500ms)
â˜ No memory leaks
â˜ No infinite loops

VERIFICATION RESULT: PASS / FAIL
```

### Session Completion Verification

```markdown
## SESSION [ID] VERIFICATION

### Objectives
â˜ All planned tasks attempted
â˜ Success criteria checked
â˜ Blockers documented

### Files
â˜ All files saved to C: drive
â˜ Files readable/not corrupted
â˜ File sizes reasonable

### State
â˜ CURRENT_STATE.json updated
â˜ Session log written
â˜ Next session planned

### Quality
â˜ No known bugs left unfixed
â˜ No partial work unmarked
â˜ Documentation current

VERIFICATION RESULT: PASS / FAIL
```

---

## VERIFICATION COMMANDS

### Quick Verification Functions

```javascript
// Verify file exists and has content
async function verifyFile(path) {
  const info = await getFileInfo(path);
  return {
    exists: info !== null,
    size: info?.size || 0,
    readable: info?.size > 0,
    path: path
  };
}

// Verify material has required parameters
function verifyMaterial(material) {
  const required = ['id', 'name', 'category', 'kc1_1', 'mc', 'physical', 'thermal'];
  const missing = required.filter(f => !material[f]);
  const paramCount = countAllParameters(material);
  
  return {
    valid: missing.length === 0 && paramCount >= 127,
    missing: missing,
    parameterCount: paramCount,
    complete: paramCount >= 127
  };
}

// Verify module extraction
function verifyModule(module) {
  const checks = {
    exists: module !== null,
    hasFunctions: typeof module.init === 'function',
    hasData: Object.keys(module).length > 5,
    hasDependencies: Array.isArray(module._dependencies),
    hasConsumers: Array.isArray(module._consumers) && module._consumers.length >= 6
  };
  
  return {
    valid: Object.values(checks).every(v => v),
    checks: checks
  };
}

// Verify state file is current
function verifyState(state) {
  const now = new Date();
  const lastUpdate = new Date(state.meta.lastUpdated);
  const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
  
  return {
    current: hoursSinceUpdate < 1,
    lastUpdated: state.meta.lastUpdated,
    hoursSinceUpdate: hoursSinceUpdate
  };
}
```

---

## VERIFICATION WORKFLOW

### During Work

```markdown
1. Complete atomic unit of work
2. Run verification for that unit
3. If PASS: Mark complete, continue
4. If FAIL: Fix issues, re-verify
5. Never proceed with failed verification
```

### At Session End

```markdown
1. List all work completed this session
2. Run verification for EACH item
3. Compile verification report
4. Only mark session complete if ALL pass
5. Document any exceptions
```

---

## VERIFICATION REPORT TEMPLATE

```markdown
# VERIFICATION REPORT
## Session: [ID]
## Date: [DATE]

### Summary
- Items verified: [N]
- Passed: [P]
- Failed: [F]
- Overall: PASS / FAIL

### Detailed Results

| Item | Type | Result | Notes |
|------|------|--------|-------|
| P-CS-031 | Material | PASS | 127/127 params |
| P-CS-032 | Material | FAIL | Missing thermal |
| PRISM_MATERIALS | Module | PASS | All checks OK |

### Failed Items
[List any failures with details]

### Remediation
[What was done to fix failures]

### Final Status
â˜ All items verified
â˜ All failures resolved
â˜ Session can be marked complete
```

---

## VERIFICATION GATES

### Gate 1: Save Gate
Before saving any file:
```
â˜ Content is complete
â˜ Format is valid
â˜ Path is correct
```

### Gate 2: Completion Gate
Before marking work complete:
```
â˜ All verification checks pass
â˜ No known issues
â˜ Documentation updated
```

### Gate 3: Session Gate
Before ending session:
```
â˜ All work verified
â˜ State file updated
â˜ Session log written
```

---

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Marking complete without verification
âŒ Skipping verification "to save time"
âŒ Ignoring failed verifications
âŒ Partial verification (only checking some items)
âŒ Verification without documented criteria
âŒ Proceeding after failed gate
âŒ "It probably works" assumption

---

## ESCALATION FOR VERIFICATION FAILURES

```markdown
IF verification fails and cannot be fixed:

1. Document the failure in detail
2. Mark item as INCOMPLETE (not failed)
3. Add to blockers in CURRENT_STATE.json
4. Continue with other work
5. Return to failed items in future session

NEVER mark failed items as complete.
```

---

## INTEGRATION WITH PRISM SKILLS

- **prism-tdd**: TDD provides verification criteria
- **prism-planning**: Plan includes verification steps
- **prism-debugging**: Debug verification failures
- **prism-auditor**: Audit is comprehensive verification

---

**END OF PRISM VERIFICATION SKILL**


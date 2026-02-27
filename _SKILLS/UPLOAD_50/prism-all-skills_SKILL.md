---
name: prism-all-skills
description: |
  Complete PRISM skill package with 99 skills, 64 agents, 22 formulas.
---

========================================
SKILL: prism-algorithm-selector
========================================
# PRISM Algorithm Selector Skill
## Problem â†’ Algorithm â†’ PRISM Engine Mapping
**MIT Foundation:** 6.046J (Algorithms), 15.083J (Optimization), 6.867 (ML)

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

name: prism-auditor
description: Audit PRISM modules for completeness before migration. Use when verifying extracted modules have all functions, data, dependencies documented. Checks extraction quality, identifies gaps, validates against source monolith.
name: prism-category-defaults
description: |
  Default parameter values for material categories. Provides baseline values when 
  specific material data is unavailable. DEPRECATED - merged into prism-material-templates.
  
  Status: DEPRECATED (Use prism-material-templates instead)
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

## Consumers (Historical)

These modules previously used category-defaults:
- PRISM_MATERIALS_MASTER â†’ Now uses prism-material-templates
- PRISM_SPEED_FEED_CALCULATOR â†’ Direct material lookups
- PRISM_COST_ESTIMATOR â†’ Uses material database

**Status:** DEPRECATED | **Replaced By:** prism-material-templates | **Version:** 1.0 (Final)



========================================
SKILL: prism-coding-patterns
========================================
# PRISM Coding Patterns Skill
## MIT-Based Best Practices for PRISM Development
**MIT Foundation:** 6.001 (SICP), 6.005 (Software Construction), 6.046J (Algorithms)

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

## END OF SKILL

**Impact:** Consistent, maintainable, MIT-quality code
**MIT Foundation:** 6.001 SICP, 6.005 Software Construction, 6.046J Algorithms



========================================
SKILL: prism-consumer-mapper
========================================
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
# PRISM Context DNA Skill
## Compressed Context Fingerprints for Session Continuity
**MIT Foundation:** 6.033 (Systems), 6.824 (Distributed), 6.005 (Software Construction)

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
      "state": "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json",
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

## END OF SKILL

**Impact:** 90% context recovery vs ~40% without DNA
**MIT Foundation:** 6.033 state management, 6.824 replication, 6.005 immutability



========================================
SKILL: prism-context-pressure
========================================
# PRISM Context Pressure Skill
## Real-Time Context Limit Monitoring & Auto-Protection
**MIT Foundation:** 6.172 (Performance), 6.033 (Fault Tolerance), 2.852 (Queuing)

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

name: prism-debugging
description: |
  Systematic debugging skill adapted from obra/superpowers for PRISM troubleshooting.
  Use when: module extraction fails, calculations produce wrong results, wiring
  doesn't connect, or any unexpected behavior occurs. Enforces methodical diagnosis
  over random trial-and-error. Triggers: extraction failure, calculation errors,
  wiring issues, unexpected behavior, validation failures.
## CORE PRINCIPLE

**DIAGNOSE BEFORE YOU FIX.**

Never make random changes hoping they'll work. Instead:
1. Understand the symptom completely
2. Form a hypothesis about the cause
3. Test the hypothesis
4. Apply targeted fix
5. Verify the fix didn't break anything else

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

**END OF PRISM DEBUGGING SKILL**



========================================
SKILL: prism-dependency-graph
========================================
# PRISM Dependency Graph Skill
## Pre-Mapped Module Relationships from Monolith Analysis
**Time Savings: 50% wiring time reduction**

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

name: prism-derivation-helpers
description: |
  Helper functions for deriving material properties from base data.
  DEPRECATED - merged into prism-physics-formulas.
  
  Status: DEPRECATED (Use prism-physics-formulas instead)
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

## Derivations Now In prism-physics-formulas

| Derivation | Formula Section |
|------------|-----------------|
| Kienzle kc1.1 | Cutting Force Models |
| Taylor tool life | Tool Life Equations |
| Johnson-Cook | Constitutive Models |
| Thermal conductivity | Material Properties |
| Yield strength | Mechanical Properties |

**Status:** DEPRECATED | **Replaced By:** prism-physics-formulas | **Version:** 1.0 (Final)



========================================
SKILL: prism-development
========================================
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
| `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\` | PRIMARY WORK | âœ… Persistent |
| `/home/claude/` or container | NEVER USE | âŒ Resets every session |
| Box folder | RESOURCES reference | âœ… Persistent |

## Path Quick Reference

```
LOCAL (Primary):
  Root:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
  State:     [ROOT]\CURRENT_STATE.json
  Extracted: [ROOT]\EXTRACTED\[category]\
  Logs:      [ROOT]\SESSION_LOGS\

BOX (Reference Only):
  Root:      C:\Users\Mark Villanueva\Box\PRISM REBUILD\
  Resources: [BOX]\RESOURCES\
```

## Session Start Protocol (MANDATORY)

1. **Read State File**: `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json`
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
view("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json")

// List extracted modules
view("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\EXTRACTED\\")

// Read session log
view("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\SESSION_LOGS\\")
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
# PRISM Error Recovery

## ðŸ”´ FIRST RULE: DON'T PANIC, DON'T RESTART

When something breaks:
1. **CHECKPOINT** current progress immediately
2. **DIAGNOSE** what actually went wrong
3. **RECOVER** using the patterns below
4. **CONTINUE** from where you were

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

## Remember

- **Errors are normal** - They happen during development
- **Most errors are recoverable** - Don't panic
- **Checkpoint frequently** - So recovery is easy
- **Don't restart unnecessarily** - Fix and continue
- **Log issues** - Helps future sessions



========================================
SKILL: prism-expert-cad-expert
========================================
# PRISM Expert: CAD Expert
## AI Domain Expert Skill for CAD Modeling & Design

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

name: prism-expert-cam-programmer
description: |
  AI Expert for CAM Programming & Toolpath decisions. Covers roughing strategies
  (adaptive, pocketing), finishing strategies (contour, pencil), drilling cycles,
  operation sequencing, tool selection, and cutting parameter calculation.
## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `cam_programmer` |
| **Name** | Senior CAM Programmer |
| **Domain** | CAM Programming & Toolpaths |
| **Confidence** | 1.0 (Expert Level) |
| **Source** | PRISM_PHASE8_EXPERTS (Lines 589868-589996) |

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

**Version:** Created 2026-01-23 | Source: PRISM v8.89.002 Lines 589868-589996



========================================
SKILL: prism-expert-master-machinist
========================================
# PRISM Expert: Master Machinist (40+ Years)
## Practical Machining & Shop Floor Expertise

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

## Source Reference
- **Module:** PRISM_PHASE8_EXPERTS.MasterMachinist
- **Monolith Lines:** 589998-590132
- **Extracted:** January 2026

name: prism-expert-materials-scientist
description: |
  Materials Scientist AI Expert (Dr. level) specializing in metallurgy, material selection, heat treatment recommendations, and machinability assessment. Covers steel grades, aluminum alloys, and specialty materials.
## Expert Profile

```javascript
{
  id: 'materials_scientist',
  name: 'Dr. Materials Scientist',
  domain: 'Materials Science & Metallurgy',
  confidence: 1.0
}
```

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

*Materials Scientist Expert - Metallurgy, selection, and heat treatment guidance*



========================================
SKILL: prism-expert-mathematics
========================================
# PRISM Expert: Mathematics Savant
## AI Domain Expert Skill for Applied Mathematics & Computation

## Knowledge Base

### Matrix Operations
- Determinant calculation (recursive cofactor expansion)
- Matrix inverse (Gaussian elimination with augmented matrix)
- Eigenvalues (Power iteration for dominant eigenvalue)

### Numerical Methods
- Integration (Simpson's rule, n=1000 intervals)
- Curve fitting (Linear regression with RÂ² calculation)
- Optimization (Gradient descent, lr=0.01, 1000 iterations)

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

## MIT Course References
- **18.06** - Linear Algebra
- **18.03** - Differential Equations
- **6.046J** - Introduction to Algorithms
- **18.085** - Computational Science & Engineering



========================================
SKILL: prism-expert-mechanical-engineer
========================================
# PRISM Expert: Mechanical Engineer
## AI Domain Expert Skill for Mechanical Design & Analysis

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

name: prism-expert-post-processor
description: |
  Post Processor AI Expert specializing in G-code generation, CNC controller syntax, code verification, and format conversion across major controller brands (Fanuc, Siemens, Heidenhain, Mazak, Haas, Okuma, Mitsubishi).
## Expert Profile

```javascript
{
  id: 'post_processor',
  name: 'Post Processor Specialist',
  domain: 'G-code & Machine Controllers',
  confidence: 1.0
}
```

## Decision Rules

### Safe Start Block
**Conditions:** program_start
**Actions:**
1. Add safe start block
2. Cancel all compensation (G40 G49)
3. Set absolute mode (G90)
4. Set feed mode (G94)
5. Select default plane (G17)

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

*Post Processor Expert - Multi-controller G-code generation and verification*



========================================
SKILL: prism-expert-quality-control
========================================
# PRISM Expert: Quality Control Manager
## AI Domain Expert Skill for Quality Assurance & Inspection

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

name: prism-expert-quality-manager
description: |
  AI Expert Role: Quality Management System specialist. Provides guidance on 
  ISO standards, SPC, measurement systems, and quality documentation.
  
  MIT Foundation: 2.830 (Control of Manufacturing), 15.760 (Operations Management)
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

## Related Skills

| Skill | Relationship |
|-------|--------------|
| prism-expert-quality-control | Day-to-day inspection (complementary) |
| prism-verification | Code/data verification |
| prism-tdd | Test-driven development |

name: prism-expert-thermodynamics
description: |
  AI Domain Expert for Heat Transfer & Thermal Analysis. Provides cutting zone
  temperature calculations, thermal expansion prediction, coolant effectiveness
  analysis, and heat partition modeling. Covers conduction, convection, radiation.
## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `thermodynamics` |
| **Name** | Thermodynamics Specialist |
| **Domain** | Heat Transfer & Thermal Analysis |
| **Source** | PRISM_PHASE8_EXPERTS.ThermodynamicsSpecialist |
| **Lines** | 590627-590711 |
| **Confidence** | 1.0 |

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

name: prism-extraction-index
description: |
  Pre-built index of ALL module locations in the monolith. Contains 500+ line numbers from search. Use this to INSTANTLY find modules without searching. Updates incrementally as modules are identified.
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

## UPDATE PROTOCOL

When you identify a module name:
1. Add it to the "KEY MODULES (Named)" table above
2. Mark it as verified with âœ…

This index grows as extraction proceeds!



========================================
SKILL: prism-extractor
========================================
# PRISM Module Extractor v2.0 (Enhanced)

> âš¡ **BEFORE EXTRACTING:** Check `prism-monolith-index` for pre-indexed line numbers
> ðŸ” **NEW:** Auto-generates dependency graphs and quality scores

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

## Extraction Difficulty Ratings

| Rating | Size | Dependencies | Nesting | Time Est. |
|--------|------|--------------|---------|-----------|
| **EASY** | <500 | <3 | <2 | 5-10 min |
| **MEDIUM** | 500-2000 | 3-6 | 2-3 | 15-30 min |
| **HARD** | 2000-5000 | 6-10 | 3-4 | 30-60 min |
| **COMPLEX** | >5000 | >10 | >4 | 60+ min |

## Integration

| Skill | Role |
|-------|------|
| `prism-monolith-index` | Line number lookups |
| `prism-auditor` | Completeness verification |
| `prism-consumer-mapper` | Consumer identification |
| `prism-utilization` | 100% wiring enforcement |

name: prism-hierarchy-manager
description: Manage PRISM's 4-layer hierarchical database architecture (COREâ†’ENHANCEDâ†’USERâ†’LEARNED). Use when propagating changes between layers, resolving inheritance, validating layer rules, or generating layer diffs. Ensures changes auto-propagate correctly.
name: prism-knowledge-base
description: |
  Comprehensive MIT/Stanford course knowledge base (220+ courses) for PRISM development. Use this skill when: (1) Starting any new feature, (2) Making design decisions, (3) Selecting algorithms, (4) Implementing AI/ML features, (5) Debugging complex issues, (6) Optimizing performance, (7) Writing clean code, (8) Designing UI/UX. Covers: coding best practices (6.001, 6.005), system design (6.033), algorithms (6.046J), machine learning (6.867), manufacturing (2.810, 2.852), optimization (6.079, 15.060), and much more.
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
# PRISM Material Lookup Skill
## Pre-Compiled Data Tables from ASM/Machining Data Handbook
**Time Savings: 40% lookup reduction**

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

## TITANIUM ALLOY QUICK REFERENCE

| Alloy | Condition | UTS (MPa) | Yield (MPa) | Elong % | HB | Machinability % |
|-------|-----------|-----------|-------------|---------|-----|-----------------|
| CP Ti Gr 1 | Annealed | 240 | 170 | 24 | 120 | 30 |
| CP Ti Gr 2 | Annealed | 345 | 275 | 20 | 160 | 25 |
| CP Ti Gr 4 | Annealed | 550 | 480 | 15 | 250 | 20 |
| Ti-6Al-4V | Annealed | 895 | 825 | 10 | 334 | 20 |
| Ti-6Al-4V | STA | 1100 | 1035 | 10 | 375 | 15 |
| Ti-6Al-2Sn-4Zr-2Mo | Annealed | 900 | 830 | 10 | 340 | 18 |

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

name: prism-material-template
description: |
  Pre-populated 127-parameter templates by material category. Provides scientifically-
  accurate default values for carbon steel, alloy steel, stainless, aluminum, etc.
  Reduces material creation time by 60%. Just modify specifics from template.
## Purpose
Dramatically accelerate material creation by providing **category-specific templates** with scientifically-accurate default values. Just modify the specifics - 60% time savings.

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

## END OF SKILL



========================================
SKILL: prism-material-templates
========================================
# PRISM Material Templates Skill
## Pre-Populated 127-Parameter Templates by Category

## USAGE WORKFLOW

1. **Select template** matching material category
2. **Copy template** to new material file
3. **Modify only [MODIFY] fields** with specific values
4. **Validate** with prism-validator skill
5. **Save** to appropriate file

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

name: prism-monolith-index
description: |
  Pre-mapped module locations in v8.89.002 monolith (986,621 lines, ~48MB).
  Instant module location without searching. Jump directly to any of 831 modules
  by line number. Covers databases, engines, knowledge bases, and systems.
## Purpose
**Instant module location** without searching. Use this index to jump directly to any module in the 986,621-line monolith.

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

## TIPS FOR EFFICIENT EXTRACTION

1. **Use offset+length** for large file reads
2. **Read 500-1000 lines** at a time max
3. **Identify boundaries** before full extraction
4. **Verify module completeness** after extraction
5. **Update this index** with verified line numbers

name: prism-monolith-navigator
description: |
  Navigate the 986,621-line PRISM v8.89.002 monolith. Contains structure overview and search patterns. For actual line numbers, use prism-extraction-index (500+ pre-indexed).
name: prism-physics-formulas
description: |
  Validated manufacturing calculation formulas from MIT/Stanford courses. Covers
  Kienzle cutting force, Johnson-Cook constitutive model, Taylor tool life,
  thermal analysis, and stability lobes. Source: MIT 2.810, 2.003, 6.867.
## Purpose
**Instant access to validated formulas** for cutting force, thermal, tool life, stability, and optimization calculations. All formulas derived from MIT 2.810, 2.003, 6.867, and related courses.

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

## END OF SKILL



========================================
SKILL: prism-physics-reference
========================================
# PRISM Physics Reference Skill
## Manufacturing Formulas & Algorithms Quick Reference

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

name: prism-planning
description: |
  PRISM session planning and brainstorming skill. Adapted from obra/superpowers for
  manufacturing intelligence development. Use when: starting new extraction sessions,
  planning batch operations, designing module architecture, or making major decisions.
  Enforces structured planning BEFORE any implementation. Triggers: starting new
  session, planning extraction, designing architecture, batch operations, major decisions.
## CORE PRINCIPLE

**NEVER START CODING WITHOUT A PLAN.**

Every PRISM session should have:
1. Clear objectives (what we're building)
2. Defined scope (what's included/excluded)
3. Success criteria (how we know it's done)
4. Risk assessment (what could go wrong)
5. Rollback plan (how to recover)

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

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Starting extraction without reading state
âŒ Making major changes without discussing options
âŒ Working past RED ZONE without saving
âŒ Skipping checkpoints to "save time"
âŒ Not verifying files after writing
âŒ Starting next task before current passes
âŒ Ending session without retrospective

**END OF PRISM PLANNING SKILL**



========================================
SKILL: prism-python-tools
========================================
# PRISM Python Tools
## Complete Python Automation Toolkit (37 Scripts)

**Location:** `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SCRIPTS\`

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

## COMMON WORKFLOWS

### Start of Session
```bash
cd "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SCRIPTS"
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

## END OF SKILL



========================================
SKILL: prism-quality-gates
========================================
# PRISM Quality Gates Skill

> ðŸ›‘ **PRINCIPLE:** No module, feature, or phase advances without passing ALL gates

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

name: prism-quick-start
description: |
  SINGLE PAGE replacing 5+ skill reads. Contains everything needed for session start in ~100 lines. READ THIS ONLY at session start - saves 80% tokens vs reading multiple skills.
name: prism-review
description: |
  Code and module review skill adapted from obra/superpowers for PRISM quality control.
  Use when: reviewing extracted modules, checking material databases, validating
  architecture decisions, or doing pre-merge checks. Provides structured review
  process for consistent quality. Triggers: module extraction complete, database
  ready for use, architecture review, pre-merge check, quality audit.
## CORE PRINCIPLE

**REVIEW CATCHES WHAT VERIFICATION MISSES.**

Verification checks for correctness. Review checks for quality:
- Is this the RIGHT solution?
- Is this MAINTAINABLE?
- Does this follow PRISM principles?
- Will this scale?
- Are there better alternatives?

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

## REVIEW SEVERITY LEVELS

| Level | Description | Action |
|-------|-------------|--------|
| ðŸ”´ Critical | Blocks release, causes failure | Must fix |
| ðŸŸ  Major | Significant issue | Should fix |
| ðŸŸ¡ Minor | Improvement opportunity | Nice to fix |
| ðŸŸ¢ Note | Observation, future consideration | Optional |

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Rubber-stamp approvals without checking
âŒ Review without criteria
âŒ Personal preferences as requirements
âŒ Blocking for trivial issues
âŒ Not documenting review findings
âŒ Reviewing your own work (except quick checks)
âŒ Skipping review "to save time"

**END OF PRISM REVIEW SKILL**



========================================
SKILL: prism-session-buffer
========================================
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

## âœ… SUCCESS METRICS

A well-buffered session has:
- [ ] Zero lost progress
- [ ] Clean resume points
- [ ] State file always current
- [ ] No truncated files
- [ ] No mid-unit stops
- [ ] Clear handoff message
- [ ] Next session can start immediately

name: prism-session-handoff
description: |
  Ultra-fast session resumption with 3-tier information hierarchy. 5-second
  resume capability with essence format. 50% session overhead reduction.
  Prioritizes speed-to-context over completeness.

  MIT Foundation: 6.033 (Systems), 16.400 (Human Factors)
## PURPOSE
Ultra-fast session resumption with 3-tier information hierarchy. Prioritizes speed-to-context over completeness.

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

## BUFFER ZONE ACTIONS

### Yellow (10+ calls) â†’ Standard checkpoint + continue
### Orange (15+ calls) â†’ Full checkpoint + caution
### Red (18+ calls) â†’ Full checkpoint + essence + STOP

## VERSION HISTORY

| Ver | Date | Changes |
|-----|------|---------|
| **2.0** | 2026-01-23 | 5-second resume, essence format, priority reading |
| 1.0 | 2026-01-22 | Initial templates |



========================================
SKILL: prism-state-manager
========================================
# PRISM State Manager v2.0 (Enhanced)

> âš¡ **FOR ROUTINE SESSION START:** Use `prism-quick-start` instead (simpler, fewer tokens)  
> ðŸ”„ **INTEGRATES WITH:** `prism-context-pressure`, `prism-context-dna`

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

name: prism-swarm-orchestrator
description: Multi-agent swarm orchestration for parallel PRISM extraction and migration. Use when deploying multiple Claude agents to work on different modules simultaneously. Coordinates agent roles (Extractor, Auditor, Validator, Documenter), manages shared state, resolves conflicts, and merges results.
name: prism-task-continuity
description: |
  Enforces task continuity and prevents mid-task restarts. Optimized for v1.3 skill structure. For routine session starts, use prism-quick-start instead of reading this full skill.
name: prism-tdd
description: |
  Test-Driven Development skill adapted from obra/superpowers for PRISM module
  validation. Enforces RED-GREEN-REFACTOR cycle for all module development.
  Use when: creating new modules, modifying existing modules, validating database
  entries, or ensuring extraction completeness. Triggers: creating modules,
  modifying code, validating databases, extraction verification, quality assurance.
## CORE PRINCIPLE

**RED â†’ GREEN â†’ REFACTOR**

Never write production code without first writing a test that fails.

For PRISM, this means:
1. **RED**: Define what success looks like (validation criteria)
2. **GREEN**: Implement just enough to pass validation
3. **REFACTOR**: Optimize without breaking validation

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

**END OF PRISM TDD SKILL**



========================================
SKILL: prism-tool-selector
========================================
# PRISM Tool Selector

## ðŸ”´ INSTANT DECISION TREES

### Reading Files

```
Is file on User's C: drive?
â”œâ”€â”€ YES â†’ Filesystem:read_file
â”‚         path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
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
â”‚   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
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
â”‚   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
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

name: prism-unit-converter
description: |
  Instant unit conversions for manufacturing calculations. Covers stress,
  speed, feed, force, temperature, and dimensional units. 20% calculation
  time reduction. Eliminates conversion errors and lookup time.
## PURPOSE
Instant unit conversions for manufacturing calculations. Eliminates conversion errors and lookup time.

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

## END OF SKILL



========================================
SKILL: prism-utilization
========================================
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
# PRISM Validator Skill
## Automated Quality Checks for Materials & Modules

## 1. JAVASCRIPT SYNTAX VALIDATION

### Quick Syntax Check
```bash
node --check [filename].js
```

### JSON Validation
```bash
node -e "JSON.parse(require('fs').readFileSync('[file]', 'utf8'))"
```

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

## END OF SKILL



========================================
SKILL: prism-verification
========================================
# PRISM VERIFICATION SKILL v1.0
## Verification Before Completion
### Adapted from obra/superpowers for PRISM quality assurance

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

## ANTI-PATTERNS (DON'T DO THIS)

âŒ Marking complete without verification
âŒ Skipping verification "to save time"
âŒ Ignoring failed verifications
âŒ Partial verification (only checking some items)
âŒ Verification without documented criteria
âŒ Proceeding after failed gate
âŒ "It probably works" assumption

## INTEGRATION WITH PRISM SKILLS

- **prism-tdd**: TDD provides verification criteria
- **prism-planning**: Plan includes verification steps
- **prism-debugging**: Debug verification failures
- **prism-auditor**: Audit is comprehensive verification

---

**END OF PRISM VERIFICATION SKILL**

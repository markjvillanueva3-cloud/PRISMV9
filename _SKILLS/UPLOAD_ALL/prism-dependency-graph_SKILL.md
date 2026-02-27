---
name: prism-dependency-graph
description: |
  Module dependency management. Topological sorting and cycle detection.
---

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
  ├── PRISM_POWER_CALCULATOR (cutting force)
  ├── PRISM_TOOL_LIFE_ENGINE (force impact)
  ├── PRISM_CHATTER_PREDICTION (force excitation)
  ├── PRISM_DEFLECTION_ENGINE (force loading)
  ├── PRISM_THERMAL_ENGINE (heat generation)
  └── PRISM_SURFACE_FINISH_ENGINE (force effects)
```

### PRISM_TAYLOR_TOOL_LIFE Engine
```
INPUTS REQUIRED:
  - From PRISM_MATERIALS_MASTER: taylor_C, taylor_n per tool type
  - From PRISM_TOOLS_DATABASE: tool_type, coating, grade
  - From Process: cutting_speed, feed, depth

OUTPUTS TO:
  ├── PRISM_COST_ESTIMATOR (tool cost/part)
  ├── PRISM_CYCLE_TIME_PREDICTOR (tool change time)
  ├── PRISM_SCHEDULING_ENGINE (tool availability)
  ├── PRISM_INVENTORY_ENGINE (consumption rate)
  └── PRISM_QUOTING_ENGINE (tooling cost)
```

### PRISM_JOHNSON_COOK Engine
```
INPUTS REQUIRED:
  - From PRISM_MATERIALS_MASTER: A, B, n, C, m parameters
  - From Process: strain, strain_rate, temperature

OUTPUTS TO:
  ├── PRISM_CHIP_FORMATION_ENGINE (flow stress)
  ├── PRISM_THERMAL_ENGINE (deformation heat)
  ├── PRISM_FORCE_CALCULATOR (material resistance)
  └── PRISM_FEM_ENGINE (constitutive model)
```

### PRISM_CHATTER_PREDICTION Engine
```
INPUTS REQUIRED:
  - From PRISM_MACHINES_DATABASE: spindle_stiffness, natural_freq
  - From PRISM_TOOLS_DATABASE: tool_stiffness, overhang
  - From PRISM_MATERIALS_MASTER: damping, modulus
  - From PRISM_KIENZLE_FORCE: cutting_force

OUTPUTS TO:
  ├── PRISM_SPEED_FEED_CALCULATOR (stability limits)
  ├── PRISM_TOOLPATH_ENGINE (stable parameters)
  ├── PRISM_SURFACE_FINISH_ENGINE (vibration effects)
  └── PRISM_XAI_ENGINE (stability explanation)
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
  PRISM_CONSTANTS → PRISM_UNITS → PRISM_VALIDATOR → PRISM_GATEWAY

PHASE 2: Core Databases
  PRISM_MATERIALS_MASTER (15 consumers)
  PRISM_MACHINES_DATABASE (12 consumers)
  PRISM_TOOLS_DATABASE (10 consumers)

PHASE 3: Physics Engines
  PRISM_KIENZLE_FORCE → PRISM_TAYLOR → PRISM_JOHNSON_COOK
  → PRISM_THERMAL → PRISM_CHATTER → PRISM_SURFACE_FINISH

PHASE 4: AI/ML Engines
  PRISM_BAYESIAN → PRISM_NEURAL → PRISM_PSO → PRISM_ACO

PHASE 5: Products
  Speed/Feed Calculator (uses 20+ modules)
  Post Processor Generator (uses 15+ modules)
  Quoting Engine (uses 18+ modules)
```

---

## END OF SKILL

---
name: prism-dependency-graph
description: |
  Pre-mapped module relationships from monolith analysis. Database→consumer and
  engine→consumer mappings for 100% utilization. Reduces wiring time by 50%.
  Includes PRISM_MATERIALS_MASTER (15 consumers), PRISM_MACHINES_DATABASE (12), etc.
---

# PRISM Dependency Graph Skill
## Pre-Mapped Module Relationships from Monolith Analysis
**Time Savings: 50% wiring time reduction**

---

## PURPOSE
Pre-mapped database→consumer and engine→consumer relationships to accelerate Stage 3 migration with 100% utilization.

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
  ├── PRISM_SPEED_FEED_CALCULATOR
  │     uses: base_speed, machinability, hardness, kc1_1
  │
  ├── PRISM_FORCE_CALCULATOR
  │     uses: kc1_1, mc, yield_strength, hardness
  │
  ├── PRISM_THERMAL_ENGINE
  │     uses: conductivity, specific_heat, melting_point, density
  │
  ├── PRISM_TOOL_LIFE_ENGINE
  │     uses: taylor_n, taylor_C, abrasiveness, hardness
  │
  ├── PRISM_SURFACE_FINISH_ENGINE
  │     uses: elasticity, built_up_edge_tendency, hardness
  │
  ├── PRISM_CHATTER_PREDICTION
  │     uses: damping_ratio, elastic_modulus, density
  │
  ├── PRISM_CHIP_FORMATION_ENGINE
  │     uses: strain_hardening, chip_type, ductility
  │
  ├── PRISM_COOLANT_SELECTOR
  │     uses: reactivity, coolant_compatibility, thermal_conductivity
  │
  ├── PRISM_COATING_OPTIMIZER
  │     uses: chemical_affinity, temperature_limit, abrasiveness
  │
  ├── PRISM_COST_ESTIMATOR
  │     uses: material_cost, density, machinability
  │
  ├── PRISM_CYCLE_TIME_PREDICTOR
  │     uses: ALL cutting parameters
  │
  ├── PRISM_QUOTING_ENGINE
  │     uses: material_cost, machinability, density
  │
  ├── PRISM_AI_LEARNING_PIPELINE
  │     uses: ALL fields (training data)
  │
  ├── PRISM_BAYESIAN_OPTIMIZER
  │     uses: uncertainty parameters, historical data
  │
  └── PRISM_XAI_ENGINE
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
  ├── PRISM_SPEED_FEED_CALCULATOR
  │     uses: rpm_max, feed_max, power
  │
  ├── PRISM_COLLISION_ENGINE
  │     uses: work_envelope, axis_limits, kinematics
  │
  ├── PRISM_POST_PROCESSOR_GENERATOR
  │     uses: controller, capabilities, options
  │
  ├── PRISM_CHATTER_PREDICTION
  │     uses: spindle_stiffness, natural_freq
  │
  ├── PRISM_CYCLE_TIME_PREDICTOR
  │     uses: rapid_rates, accel_decel, capabilities
  │
  ├── PRISM_COST_ESTIMATOR
  │     uses: hourly_rate, efficiency
  │
  ├── PRISM_SCHEDULING_ENGINE
  │     uses: availability, capabilities
  │
  ├── PRISM_QUOTING_ENGINE
  │     uses: hourly_rate, setup_time
  │
  ├── PRISM_CAPABILITY_MATCHER
  │     uses: ALL capability fields
  │
  ├── PRISM_3D_VISUALIZATION
  │     uses: kinematics, geometry
  │
  ├── PRISM_AI_LEARNING_PIPELINE
  │     uses: ALL fields
  │
  └── PRISM_XAI_ENGINE
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
  ├── PRISM_SPEED_FEED_CALCULATOR
  │     uses: geometry, coating, grade
  │
  ├── PRISM_FORCE_CALCULATOR
  │     uses: rake_angle, edge_radius
  │
  ├── PRISM_TOOL_LIFE_ENGINE
  │     uses: substrate, coating, geometry
  │
  ├── PRISM_DEFLECTION_ENGINE
  │     uses: length, diameter, material
  │
  ├── PRISM_COLLISION_ENGINE
  │     uses: 3D_model, holder_assembly
  │
  ├── PRISM_COST_ESTIMATOR
  │     uses: tool_cost, expected_life
  │
  ├── PRISM_INVENTORY_ENGINE
  │     uses: stock_level, reorder_point
  │
  ├── PRISM_TOOLPATH_ENGINE
  │     uses: cutting_geometry, chip_load
  │
  ├── PRISM_AI_LEARNING_PIPELINE
  │     uses: ALL fields
  │
  └── PRISM_XAI_ENGINE
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

---

## AI/ML ENGINE DEPENDENCIES

### PRISM_BAYESIAN_OPTIMIZER
```
INPUTS REQUIRED:
  - From ALL databases: historical data with outcomes
  - From User: objective function, constraints
  - From Process: current parameters, feedback

OUTPUTS TO:
  ├── PRISM_SPEED_FEED_CALCULATOR (optimized params)
  ├── PRISM_TOOLPATH_ENGINE (path optimization)
  ├── PRISM_SCHEDULING_ENGINE (sequence optimization)
  └── PRISM_LEARNING_PIPELINE (exploration data)
```

### PRISM_NEURAL_NETWORK Engine
```
INPUTS REQUIRED:
  - Training data from PRISM_ML_TRAINING_PATTERNS_DATABASE
  - Features from multiple databases
  - Labels from historical outcomes

OUTPUTS TO:
  ├── PRISM_TOOL_LIFE_PREDICTOR (wear prediction)
  ├── PRISM_SURFACE_FINISH_PREDICTOR (Ra prediction)
  ├── PRISM_CYCLE_TIME_PREDICTOR (time estimation)
  └── PRISM_ANOMALY_DETECTOR (process monitoring)
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

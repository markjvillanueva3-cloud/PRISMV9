---
name: prism-code-master
version: 1.0.0
description: |
  UNIFIED code and architecture reference for PRISM v9.0 development.
  Consolidates 6 existing skills into one comprehensive resource:
  - prism-coding-patterns (586 lines) - MIT patterns, code standards
  - prism-algorithm-selector (370 lines) - Problem→Algorithm mapping
  - prism-dependency-graph (417 lines) - Module relationships
  - prism-large-file-writer (228 lines) - Chunked write patterns
  - prism-tool-selector (215 lines) - Tool decision trees
  - prism-unit-converter (410 lines) - Unit conversions
  
  Use this INSTEAD of loading individual code/architecture skills.
  NOTE: prism-api-contracts (6,114 lines) kept separate as comprehensive reference.
  
  MIT Foundation: 6.001 (SICP), 6.005 (Software Construction), 6.046J (Algorithms)
triggers:
  - "coding pattern"
  - "algorithm"
  - "dependency"
  - "large file"
  - "tool selection"
  - "unit conversion"
  - "architecture"
---

# PRISM CODE MASTER
## Unified Code & Architecture Reference
### Version 1.0 | Consolidates 6 Skills | SP.6

---

## TABLE OF CONTENTS

1. [Tool Selection](#1-tool-selection)
2. [Coding Patterns](#2-coding-patterns)
3. [Algorithm Selection](#3-algorithm-selection)
4. [Dependency Graph](#4-dependency-graph)
5. [Large File Writing](#5-large-file-writing)
6. [Unit Conversions](#6-unit-conversions)
7. [Quick Reference](#7-quick-reference)

---

# 1. TOOL SELECTION

## 1.1 Decision Tree: Reading Files

```
Is file on User's C: drive?
├── YES, small (<10K lines) → Filesystem:read_file
│   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
│
├── YES, large (>10K lines) → Desktop Commander:read_file
│   path: "C:\\...", offset: [start], length: [count]
│
└── In Claude's container (/mnt/, /home/) → view tool
    ⚠️ DON'T save PRISM work here - resets every session!
```

## 1.2 Decision Tree: Writing Files

```
Where should output go?
├── PRISM work (persistent) → Filesystem:write_file
│   path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\..."
│
├── Large file (>50KB) → Chunked approach (see Section 5)
│   Filesystem:write_file (first chunk)
│   Desktop Commander:write_file mode='append' (rest)
│
└── User artifact → create_file + present_files
    path: "/mnt/user-data/outputs/..."
```

## 1.3 Decision Tree: Searching

```
What do you need?
├── List directory → Filesystem:list_directory
├── Search file NAMES → Desktop Commander:start_search searchType:"files"
├── Search file CONTENTS → Desktop Commander:start_search searchType:"content"
└── Deep recursive tree → Filesystem:directory_tree
```

## 1.4 Tool Quick Reference

| Task | Tool | Key Parameters |
|------|------|----------------|
| Read C: file | `Filesystem:read_file` | path, head/tail |
| Write C: file | `Filesystem:write_file` | path, content |
| Read large file | `Desktop Commander:read_file` | path, offset, length |
| Append to file | `Desktop Commander:write_file` | path, content, mode:"append" |
| List directory | `Filesystem:list_directory` | path |
| Search files | `Desktop Commander:start_search` | path, pattern, searchType |
| File info | `Desktop Commander:get_file_info` | path |
| Run script | `Desktop Commander:start_process` | command, timeout_ms |

---

# 2. CODING PATTERNS

## 2.1 MIT Pattern Summary

| Pattern | Principle | PRISM Application |
|---------|-----------|-------------------|
| **Abstraction Barriers** | Interface vs implementation | All DBs expose get/set/query |
| **Higher-Order Functions** | Functions that take/return functions | Validator/calculator factories |
| **Data Abstraction** | Define by operations, not structure | Entity types have defined ops |
| **Wishful Thinking** | Write ideal code first, implement helpers | Design flow → implement parts |
| **Specifications** | Requires/modifies/effects contracts | JSDoc on all public functions |
| **Defensive Programming** | Validate early, fail fast | Input validation at every entry |
| **Immutability** | No hidden mutation | Return new objects, don't mutate |

## 2.2 Abstraction Barrier Example

```javascript
// ❌ BAD: Exposing internal structure
const hardness = MATERIALS_ARRAY[5].properties.mechanical.hardness.value;

// ✅ GOOD: Abstraction barrier
const material = PRISM_MATERIALS.get('P-CS-005');
const hardness = PRISM_MATERIALS.getProperty(material, 'hardness');
```

## 2.3 Function Specification Template

```javascript
/**
 * Calculate Kienzle cutting force coefficient.
 * 
 * @requires material !== null && material.kienzle.kc1_1 > 0
 * @requires chipThickness > 0 && chipThickness <= 10
 * @modifies nothing
 * @effects Returns specific cutting force in N/mm²
 * 
 * @example calculateKc(material, 0.1) => 2450
 */
function calculateKc(material, chipThickness) {
  // Validate @requires
  if (!material?.kienzle?.kc1_1) throw new InvalidParameterError('kc1_1 required');
  if (chipThickness <= 0 || chipThickness > 10) throw new InvalidParameterError('invalid thickness');
  
  const { kc1_1, mc } = material.kienzle;
  return kc1_1 * Math.pow(chipThickness, -mc);
}
```

## 2.4 Error Handling Pattern

```javascript
function calculateWithFallback(material, tool, machine) {
  try {
    return fullAICalculation(material, tool, machine);  // Primary
  } catch (aiError) {
    try {
      return physicsOnlyCalculation(material, tool, machine);  // Fallback 1
    } catch (physicsError) {
      try {
        return handbookLookup(material, tool);  // Fallback 2
      } catch (handbookError) {
        return {  // Fallback 3: Conservative defaults
          value: getConservativeDefault(material),
          confidence: 0.3,
          warning: 'Using conservative defaults - verify before use'
        };
      }
    }
  }
}
```

## 2.5 Naming Conventions

```
MODULES:     PRISM_[CATEGORY]_[NAME]     → PRISM_MATERIALS_MASTER
FUNCTIONS:   verbNoun()                  → getMaterial(), calculateForce()
CONSTANTS:   UPPER_SNAKE_CASE            → MAX_RPM, DEFAULT_CONFIDENCE
VARIABLES:   camelCase                   → materialId, toolDiameter
PRIVATE:     _prefixedCamelCase          → _internalCache, _validate()
EVENTS:      entity:action               → material:created, tool:updated
ROUTES:      /entity/action/:param       → /materials/get/:id
```

## 2.6 Code Quality Checklist

```
□ Has JSDoc with @requires, @modifies, @effects
□ Validates all inputs (type, range, format)
□ Uses immutable patterns (no hidden mutation)
□ Has clear abstraction barriers
□ Includes error handling with graceful degradation
□ Follows PRISM naming conventions
□ Documents dependencies and consumers
```

---

# 3. ALGORITHM SELECTION

## 3.1 Quick Lookup by Problem Type

### Optimization Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Minimize cost with constraints | Simplex / Interior Point | PRISM_CONSTRAINED_OPTIMIZER |
| Multi-objective (cost + time) | NSGA-II | PRISM_NSGA2 |
| Sequence operations | Ant Colony / Genetic | PRISM_ACO_SEQUENCER |
| Parameter tuning | Bayesian Optimization | PRISM_BAYESIAN_SYSTEM |
| Global search | Simulated Annealing | PRISM_SIMULATED_ANNEALING |

### Prediction Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Predict numeric value | XGBoost / Random Forest | PRISM_XGBOOST_ENGINE |
| Classify categories | SVM / Logistic | PRISM_SVM_ENGINE |
| Time series forecast | LSTM | PRISM_LSTM_ENGINE |
| Uncertainty quantification | Monte Carlo | PRISM_MONTE_CARLO_ENGINE |

### Manufacturing Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Cutting force | Kienzle Model | PRISM_KIENZLE_FORCE |
| Tool life | Taylor Equation | PRISM_TAYLOR_TOOL_LIFE |
| Chatter prediction | Stability Lobes | PRISM_STABILITY_LOBES |
| Material flow stress | Johnson-Cook | PRISM_JOHNSON_COOK_ENGINE |
| Heat distribution | FEM / Fourier | PRISM_HEAT_TRANSFER_ENGINE |

### Geometry/CAD Problems
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Collision detection | GJK / A* | PRISM_COLLISION_ENGINE |
| Toolpath optimization | Dijkstra / A* | PRISM_TOOLPATH_OPTIMIZER |
| Feature recognition | Pattern Matching | PRISM_COMPLETE_FEATURE_ENGINE |

### Signal Processing
| Problem | Algorithm | PRISM Engine |
|---------|-----------|--------------|
| Frequency analysis | FFT | PRISM_FFT_PREDICTIVE_CHATTER |
| Vibration detection | Wavelet Transform | PRISM_WAVELET_CHATTER |
| Noise filtering | Kalman Filter | PRISM_KALMAN_FILTER |

## 3.2 Algorithm Selection Decision Tree

```
Is your problem about...
├── Finding optimal values? → OPTIMIZATION
│   ├── Single objective? → Linear/Nonlinear Programming
│   ├── Multiple objectives? → NSGA-II, MOEA/D
│   └── Discrete choices? → GA, ACO, SA
│
├── Making predictions? → MACHINE LEARNING
│   ├── Continuous output? → Regression (XGBoost, RF)
│   ├── Categorical output? → Classification (SVM)
│   └── Sequential data? → RNN/LSTM
│
├── Manufacturing physics? → PHYSICS ENGINES
│   ├── Cutting forces? → Kienzle/Merchant
│   ├── Tool wear? → Taylor
│   └── Vibration? → Stability Analysis
│
└── Scheduling? → SCHEDULING ENGINES
    ├── Job sequencing? → ACO/GA
    └── Resource allocation? → LP/Assignment
```

## 3.3 Algorithm Complexity Reference

| Algorithm | Time | Space | Best For |
|-----------|------|-------|----------|
| Simplex | O(2^n) worst | O(n²) | LP, fast |
| NSGA-II | O(MN²) | O(N) | 2-3 objectives |
| Genetic Algorithm | O(g×n×f) | O(n) | Global search |
| XGBoost | O(n×d×log n) | O(n) | Tabular data |
| FFT | O(n log n) | O(n) | Frequency |
| Dijkstra | O((V+E) log V) | O(V) | Shortest path |

---

# 4. DEPENDENCY GRAPH

## 4.1 Core Infrastructure

```
PRISM_GATEWAY (Central Router)
└── CONSUMED BY: ALL modules (500+ routes)

PRISM_CONSTANTS
└── CONSUMED BY: ~50+ modules (units, validation, calculations)

PRISM_UNITS
└── CONSUMED BY: ~30+ modules (all calculations, display)
```

## 4.2 PRISM_MATERIALS_MASTER (15+ Consumers)

```
FIELDS: base_speed, machinability, hardness, kc1_1, mc, yield_strength,
        conductivity, specific_heat, melting_point, taylor_n, taylor_C,
        abrasiveness, elasticity, damping_ratio, ALL 127 parameters

CONSUMERS:
├── PRISM_SPEED_FEED_CALCULATOR   → base_speed, machinability, hardness, kc1_1
├── PRISM_FORCE_CALCULATOR        → kc1_1, mc, yield_strength, hardness
├── PRISM_THERMAL_ENGINE          → conductivity, specific_heat, melting_point
├── PRISM_TOOL_LIFE_ENGINE        → taylor_n, taylor_C, abrasiveness
├── PRISM_SURFACE_FINISH_ENGINE   → elasticity, built_up_edge_tendency
├── PRISM_CHATTER_PREDICTION      → damping_ratio, elastic_modulus, density
├── PRISM_CHIP_FORMATION_ENGINE   → strain_hardening, chip_type
├── PRISM_COOLANT_SELECTOR        → reactivity, coolant_compatibility
├── PRISM_COATING_OPTIMIZER       → chemical_affinity, temperature_limit
├── PRISM_COST_ESTIMATOR          → material_cost, density, machinability
├── PRISM_CYCLE_TIME_PREDICTOR    → ALL cutting parameters
├── PRISM_QUOTING_ENGINE          → material_cost, machinability
├── PRISM_AI_LEARNING_PIPELINE    → ALL fields (training)
├── PRISM_BAYESIAN_OPTIMIZER      → uncertainty parameters
└── PRISM_XAI_ENGINE              → ALL fields (explanations)
```

## 4.3 PRISM_MACHINES_DATABASE (12+ Consumers)

```
FIELDS: rpm_max, feed_max, power, torque, work_envelope, axis_limits,
        controller, capabilities, spindle_stiffness, rapid_rates

CONSUMERS:
├── PRISM_SPEED_FEED_CALCULATOR   → rpm_max, feed_max, power
├── PRISM_COLLISION_ENGINE        → work_envelope, axis_limits
├── PRISM_POST_PROCESSOR_GENERATOR → controller, capabilities
├── PRISM_CHATTER_PREDICTION      → spindle_stiffness, natural_freq
├── PRISM_CYCLE_TIME_PREDICTOR    → rapid_rates, accel_decel
├── PRISM_COST_ESTIMATOR          → hourly_rate, efficiency
└── ... (6 more)
```

## 4.4 PRISM_TOOLS_DATABASE (10+ Consumers)

```
FIELDS: diameter, flutes, helix, coating, material, geometry,
        max_rpm, recommended_speeds, wear_characteristics

CONSUMERS:
├── PRISM_SPEED_FEED_CALCULATOR   → recommended_speeds, geometry
├── PRISM_FORCE_CALCULATOR        → geometry, diameter, flutes
├── PRISM_TOOL_LIFE_ENGINE        → coating, material, wear_characteristics
├── PRISM_DEFLECTION_ENGINE       → diameter, material, length
└── ... (6 more)
```

## 4.5 Utilization Rule

```
╔═══════════════════════════════════════════════════════════════════╗
║  COMMANDMENT 1: IF IT EXISTS, USE IT EVERYWHERE                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  Every database field must have minimum consumers:                ║
║  • Materials: 15+ consumers                                       ║
║  • Machines: 12+ consumers                                        ║
║  • Tools: 10+ consumers                                           ║
║  • NO orphan data allowed                                         ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

# 5. LARGE FILE WRITING

## 5.1 Why Chunked Writing?

| Method | Speed | Risk | Best For |
|--------|-------|------|----------|
| Single Filesystem:write_file | ❌ Truncates >50KB | High | Small files |
| Multiple edit_file calls | ❌ Very slow | Medium | Small edits |
| **Chunked write + append** | ⚡ **FASTEST** | Low | **Large files** |

## 5.2 Optimal Workflow

```
FILE SIZE: 50-150KB
═══════════════════
CHUNK 1: Filesystem:write_file (header + first 30%)
CHUNK 2: Desktop Commander:write_file mode='append' (next 35%)
CHUNK 3: Desktop Commander:write_file mode='append' (last 35% + closing)

FILE SIZE: 150KB+
═══════════════════
CHUNK 1: Filesystem:write_file (header + first 3-4 entries)
CHUNKS 2-N: Desktop Commander:write_file mode='append' (3-4 entries each)
FINAL: Desktop Commander:write_file mode='append' (closing)
```

## 5.3 Chunk Size Guidelines

| Entry Complexity | Entries/Chunk | Approx KB |
|------------------|---------------|-----------|
| Simple (20 params) | 8-10 | ~15KB |
| Medium (50 params) | 5-6 | ~18KB |
| Full (127 params) | 3-4 | ~20KB |

**Rule:** Keep chunks under 25KB to avoid truncation.

## 5.4 Template: First Chunk

```javascript
Filesystem:write_file({
  path: "C:\\PRISM REBUILD...\\file.js",
  content: `/**
 * PRISM [TYPE] DATABASE
 * Created: ${new Date().toISOString().split('T')[0]}
 */
const MODULE = {
  metadata: { file: "file.js", count: N },
  entries: {
    "ENTRY-001": { ... },
    "ENTRY-002": { ... },
`
})
```

## 5.5 Template: Append Chunks

```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\file.js",
  content: `
    "ENTRY-003": { ... },
    "ENTRY-004": { ... },
`,
  mode: "append"
})
```

## 5.6 Template: Final Chunk

```javascript
Desktop Commander:write_file({
  path: "C:\\PRISM REBUILD...\\file.js",
  content: `
    "ENTRY-010": { ... }
  }
};
module.exports = MODULE;
`,
  mode: "append"
})
```

## 5.7 Verification

```javascript
// Check file size
Desktop Commander:get_file_info({ path: "..." })

// Check last lines (no truncation)
Desktop Commander:read_file({ path: "...", offset: -20 })
// Should see: `};\n\nmodule.exports = ...`
```

---

# 6. UNIT CONVERSIONS

## 6.1 Length

| From | To | Formula |
|------|-----|---------|
| mm | inch | ÷ 25.4 |
| inch | mm | × 25.4 |
| m | ft | × 3.28084 |
| ft | m | ÷ 3.28084 |

## 6.2 Speed (Cutting)

| From | To | Formula |
|------|-----|---------|
| m/min | ft/min | × 3.28084 |
| ft/min | m/min | ÷ 3.28084 |
| m/min | mm/s | × 16.667 |

## 6.3 Feed

| From | To | Formula |
|------|-----|---------|
| mm/rev | inch/rev | ÷ 25.4 |
| mm/min | inch/min | ÷ 25.4 |
| mm/tooth | inch/tooth | ÷ 25.4 |

## 6.4 Force

| From | To | Formula |
|------|-----|---------|
| N | lbf | ÷ 4.44822 |
| kN | lbf | × 224.809 |
| N/mm² | psi | × 145.038 |
| MPa | ksi | × 0.145038 |

## 6.5 Power

| From | To | Formula |
|------|-----|---------|
| kW | HP | × 1.34102 |
| HP | kW | × 0.7457 |
| W | ft·lbf/s | × 0.7376 |

## 6.6 Temperature

| From | To | Formula |
|------|-----|---------|
| °C | °F | (×9/5) + 32 |
| °F | °C | (−32) × 5/9 |
| °C | K | + 273.15 |

## 6.7 Pressure/Stress

| From | To | Formula |
|------|-----|---------|
| MPa | psi | × 145.038 |
| GPa | ksi | × 145.038 |
| bar | psi | × 14.5038 |

## 6.8 RPM ↔ Surface Speed

```javascript
// Surface speed from RPM
Vc = (π × D × N) / 1000  // m/min (D in mm, N in RPM)

// RPM from surface speed
N = (1000 × Vc) / (π × D)  // RPM (Vc in m/min, D in mm)

// Imperial
SFM = (π × D × N) / 12    // ft/min (D in inches)
N = (12 × SFM) / (π × D)  // RPM
```

## 6.9 Quick Conversion Function

```javascript
const PRISM_UNITS = {
  convert(value, from, to) {
    const conversions = {
      'mm_inch': v => v / 25.4,
      'inch_mm': v => v * 25.4,
      'm/min_ft/min': v => v * 3.28084,
      'kW_HP': v => v * 1.34102,
      'N_lbf': v => v / 4.44822,
      'MPa_psi': v => v * 145.038,
      'C_F': v => (v * 9/5) + 32
    };
    const key = `${from}_${to}`;
    if (!conversions[key]) throw new Error(`Unknown conversion: ${key}`);
    return conversions[key](value);
  }
};
```

---

# 7. QUICK REFERENCE

## 7.1 Tool Selection Summary

| Task | Tool |
|------|------|
| Read C: file | `Filesystem:read_file` |
| Write C: file | `Filesystem:write_file` |
| Read LARGE file | `Desktop Commander:read_file` (offset/length) |
| Append to file | `Desktop Commander:write_file` (mode:"append") |
| Search content | `Desktop Commander:start_search` (searchType:"content") |
| List directory | `Filesystem:list_directory` |

## 7.2 Pattern Summary

| Pattern | Key Principle |
|---------|---------------|
| Abstraction | Hide implementation behind interface |
| Defensive | Validate early, fail fast |
| Immutability | Return new objects, don't mutate |
| Fallback | Primary → Secondary → Defaults |

## 7.3 Algorithm Summary

| Problem Type | Go-To Algorithm |
|--------------|-----------------|
| Optimization | NSGA-II (multi), Simplex (single) |
| Prediction | XGBoost (tabular), LSTM (sequence) |
| Manufacturing | Kienzle (force), Taylor (tool life) |
| Scheduling | ACO, Genetic Algorithm |

## 7.4 File Writing Summary

```
<50KB  → Single Filesystem:write_file
50KB+  → Chunked: write_file + append + append
```

---

## SOURCE SKILLS CONSOLIDATED

| Skill | Original Lines | Key Content |
|-------|----------------|-------------|
| prism-coding-patterns | 586 | MIT patterns, specifications |
| prism-algorithm-selector | 370 | Problem→Algorithm mapping |
| prism-dependency-graph | 417 | Module relationships |
| prism-large-file-writer | 228 | Chunked writing |
| prism-tool-selector | 215 | Tool decision trees |
| prism-unit-converter | 410 | Unit conversions |
| **Total Source** | **2,226** | |
| **Consolidated** | **~900** | **60% efficiency** |

**Kept Separate:** prism-api-contracts (6,114 lines) - Comprehensive API reference

---

## MIT FOUNDATION

| Course | Topics |
|--------|--------|
| 6.001 (SICP) | Abstraction, higher-order functions |
| 6.005 | Specifications, testing, defensive programming |
| 6.046J | Algorithm design and analysis |
| 15.083J | Optimization methods |
| 6.867 | Machine learning algorithms |

---

**END OF PRISM CODE MASTER SKILL**

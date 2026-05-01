---
name: prism-monolith-navigator
description: |
  Search strategies and techniques for finding specific functionality
  in the v8.89 monolith (986,621 lines, 831 modules).
  Use when: Need to find specific code, understand patterns, locate features.
  Provides: Search strategies, pattern recognition, cross-reference techniques,
  pre-answered common queries, navigation shortcuts.
  Key principle: Know how to find before you search.
  Part of SP.2 Monolith Navigation.
---

# PRISM-MONOLITH-NAVIGATOR
## Finding Code Fast in the v8.89 Monolith
### Version 1.0 | Monolith Navigation | ~25KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill provides **efficient search strategies** for finding specific functionality in the v8.89 monolith. The monolith is too large for brute-force searching.

**The Problem:**
- 986,621 lines of code
- 831 modules across 12 categories
- Inconsistent naming conventions
- Code spread across multiple files
- 25+ years of accumulated patterns

**This Skill Provides:**
- Search strategies by query type
- Pattern recognition techniques
- Cross-reference methods
- Pre-answered common queries
- Navigation shortcuts

## 1.2 The Navigator Mindset

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE NAVIGATOR MINDSET                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ❌ WRONG APPROACH:                                                                     │
│  grep "keyword" *                                                                       │
│  "Let me search everything"                                                             │
│  "I'll know it when I see it"                                                           │
│  Random browsing through files                                                          │
│                                                                                         │
│  ✅ RIGHT APPROACH:                                                                     │
│  1. What CATEGORY does this belong to?                                                  │
│  2. What PATTERN would this follow?                                                     │
│  3. What would it be NAMED?                                                             │
│  4. What would CALL or USE it?                                                          │
│  5. THEN search with targeted queries                                                   │
│                                                                                         │
│  KEY INSIGHT:                                                                           │
│  ────────────                                                                           │
│  Strategic searching is 10x faster than brute force.                                    │
│  Know the codebase patterns before you search.                                          │
│  Use the index (SP.2.1) to narrow scope first.                                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 The Navigation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           NAVIGATION FLOW                                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  QUERY: "Where is the cutting force calculation?"                                       │
│                                                                                         │
│  STEP 1: CATEGORIZE                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Q: What category?                                                               │   │
│  │ A: ALGORITHMS (calculations, physics)                                           │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                             │
│                                           ▼                                             │
│  STEP 2: PATTERN                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Q: What naming pattern?                                                         │   │
│  │ A: *_engine.js, *_calc.js, *_force*.js                                          │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                             │
│                                           ▼                                             │
│  STEP 3: CONSULT INDEX                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Q: What does prism-monolith-index say?                                          │   │
│  │ A: cutting_force_engine.js in /src/algorithms/forces/                           │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                             │
│                                           ▼                                             │
│  STEP 4: VERIFY                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Navigate to file, confirm content matches expectation                           │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.4 When to Use This Skill

**Explicit Triggers:**
- "find", "search", "locate", "where is"
- "how to find", "looking for"
- "navigate", "browse"
- "which file", "what module"

**Contextual Triggers:**
- When you know WHAT you want but not WHERE it is
- Before extraction (need to find the code first)
- When exploring unfamiliar areas
- When tracing call chains

## 1.5 Prerequisites

- Familiarity with prism-monolith-index (SP.2.1)
- Understanding of the 12 module categories
- Access to monolith codebase

## 1.6 Position in Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SP.2 MONOLITH NAVIGATION                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SP.2.1              SP.2.2              SP.2.3                                         │
│  ┌────────┐         ┌────────┐         ┌────────┐                                       │
│  │ INDEX  │────────▶│EXTRACT │         │NAVIGATE│                                       │
│  │        │         │        │         │        │                                       │
│  └────────┘         └────────┘         └────────┘                                       │
│  Where is it?       How to safely           ▲                                           │
│  (reference)        extract?                │                                           │
│       │                                     │                                           │
│       └─────────────────────────────────────┘                                           │
│                   THIS SKILL: How to FIND things                                        │
│                   (Use BEFORE extraction, or for exploration)                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: SEARCH STRATEGIES

## 2.1 Strategy Selection Matrix

| What You're Looking For | Best Strategy | Example |
|-------------------------|---------------|---------|
| Specific function | Name-based search | "Kienzle calculation" |
| Data/values | Data pattern search | "Material hardness values" |
| Feature/capability | Functional search | "Chatter prediction" |
| Caller/consumer | Reverse search | "What uses cutting_force_engine?" |
| Related code | Cluster search | "All optimization code" |
| Unknown location | Progressive narrowing | "Something that does X" |

## 2.2 Strategy 1: Name-Based Search

**Use when:** You know (or can guess) the function/file name

### Naming Conventions in v8.89

| Type | Pattern | Examples |
|------|---------|----------|
| Engine | `*_engine.js` | `cutting_force_engine.js`, `tool_life_engine.js` |
| Calculator | `*_calc.js`, `*_calculator.js` | `power_calc.js`, `deflection_calc.js` |
| Database | `*_database.js`, `*_db.js` | `materials_database.js`, `machine_db.js` |
| Model | `*_model.js` | `kienzle_model.js`, `thermal_model.js` |
| Utility | `*_utils.js`, `*_helpers.js` | `math_utils.js`, `string_helpers.js` |
| Properties | `*_properties.js`, `*_props.js` | `material_properties.js` |
| Constants | `*_constants.js`, `*_coefficients.js` | `taylor_constants.js` |

### Search Commands

```bash
# Find by exact name
find /monolith -name "cutting_force_engine.js"

# Find by pattern
find /monolith -name "*force*.js"

# Find containing keyword in name
find /monolith -name "*.js" | grep -i "kienzle"
```

## 2.3 Strategy 2: Content Search

**Use when:** You know what the code DOES or contains

### Search by Function Signature

```bash
# Find function definition
grep -rn "function calculateCuttingForce" /monolith/src/

# Find export
grep -rn "export.*cutting" /monolith/src/

# Find class definition
grep -rn "class.*Optimizer" /monolith/src/
```

### Search by Formula/Constant

```bash
# Find Kienzle formula (kc = kc1.1 * h^-mc)
grep -rn "kc1" /monolith/src/
grep -rn "\^.*mc" /monolith/src/

# Find Taylor equation (VT^n = C)
grep -rn "taylor" /monolith/src/ -i
grep -rn "toolLife" /monolith/src/
```

### Search by Comment/Documentation

```bash
# Find by comment keyword
grep -rn "//.*cutting force" /monolith/src/ -i
grep -rn "/*.*Kienzle" /monolith/src/ -i

# Find TODO/FIXME
grep -rn "TODO.*force" /monolith/src/
```

## 2.4 Strategy 3: Reverse Search (Who Uses This?)

**Use when:** You found something and need to know its consumers

### Find All Imports

```bash
# Find who imports a module
grep -rn "import.*from.*cutting_force" /monolith/src/
grep -rn "require.*cutting_force" /monolith/src/

# Find who calls a function
grep -rn "calculateCuttingForce(" /monolith/src/
grep -rn "getCuttingForce" /monolith/src/
```

### Build Dependency Chain

```
cutting_force_engine.js
    ↑ imported by
├── power_torque_engine.js
├── tool_life_engine.js
├── optimization_engine.js
└── (grep results show more...)
```

## 2.5 Strategy 4: Cluster Search (Find Related Code)

**Use when:** You need everything related to a topic

### By Directory

```bash
# List all files in category directory
ls -la /monolith/src/algorithms/forces/
ls -la /monolith/src/data/materials/
```

### By Keyword Cluster

```bash
# Find all force-related files
find /monolith -name "*.js" | xargs grep -l "force" | sort -u

# Find all optimization-related
find /monolith -name "*.js" | xargs grep -l "optim" | sort -u
```

### By Import Cluster

```bash
# Find all files that import from same module
grep -rn "from.*algorithms/forces" /monolith/src/ | cut -d: -f1 | sort -u
```

## 2.6 Strategy 5: Progressive Narrowing

**Use when:** You're not sure where to start

### Step 1: Category First

```
Q: "Where is the chatter prediction?"
→ Category: ALGORITHMS (it's a calculation)
→ Subcategory: vibration, stability, dynamics
```

### Step 2: Index Lookup

```
Check prism-monolith-index Section 3: ALGORITHMS
→ Found: chatter_prediction.js in /src/algorithms/vibration/
```

### Step 3: Verify and Explore

```bash
# Confirm file exists
ls -la /monolith/src/algorithms/vibration/

# See what else is there
ls -la /monolith/src/algorithms/vibration/*.js
```

### Step 4: Deep Dive

```bash
# Look at file structure
head -100 /monolith/src/algorithms/vibration/chatter_prediction.js

# Find main exports
grep "export" /monolith/src/algorithms/vibration/chatter_prediction.js
```

## 2.7 Search Strategy Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SEARCH STRATEGY QUICK REFERENCE                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  "I know the name"          → find -name "*keyword*"                                    │
│  "I know what it does"      → grep -rn "function_signature"                             │
│  "I know what uses it"      → grep -rn "import.*module_name"                            │
│  "I need everything about"  → grep -l "keyword" + ls directory                          │
│  "I have no idea"           → Category → Index → Narrow → Verify                        │
│                                                                                         │
│  ALWAYS START WITH:                                                                     │
│  1. What category? (MATERIALS, MACHINES, TOOLS, ALGORITHMS, etc.)                       │
│  2. Check prism-monolith-index first!                                                   │
│  3. Then use targeted search commands                                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 3: PATTERN RECOGNITION

## 3.1 Overview

The v8.89 monolith follows recognizable patterns. Knowing these patterns lets you predict where code is and how it's structured.

## 3.2 Code Organization Patterns

### Pattern: Module Structure

Most modules follow this structure:

```javascript
// 1. Imports at top
import { dependency } from './dependency';

// 2. Constants and configuration
const CONFIG = { ... };

// 3. Helper functions (private)
function helperFunction() { ... }

// 4. Main class or function
export class MainClass {
  constructor() { ... }
  
  // Public methods
  calculate() { ... }
  
  // Private methods  
  _internalCalc() { ... }
}

// 5. Alternative: Function exports
export function mainFunction() { ... }

// 6. Default export (sometimes)
export default MainClass;
```

### Pattern: Engine Modules

Calculation engines follow this pattern:

```javascript
// *_engine.js

// Standard inputs
interface EngineInput {
  material: Material;
  tool: Tool;
  conditions: CuttingConditions;
}

// Standard outputs
interface EngineOutput {
  result: number;
  confidence: number;
  warnings: string[];
}

// Main calculation
export function calculate(input: EngineInput): EngineOutput {
  // 1. Validate inputs
  // 2. Get coefficients/data
  // 3. Apply formula
  // 4. Apply corrections
  // 5. Return result with metadata
}
```

### Pattern: Database Modules

Database modules follow this pattern:

```javascript
// *_database.js

// Data storage
const DATABASE = {
  items: [ ... ],
  index: { ... }
};

// Lookup functions
export function getById(id) { ... }
export function getByName(name) { ... }
export function search(query) { ... }
export function getAll() { ... }

// Sometimes: CRUD operations
export function add(item) { ... }
export function update(id, item) { ... }
```

## 3.3 Naming Patterns

### Function Naming

| Pattern | Meaning | Examples |
|---------|---------|----------|
| `get*` | Retrieve data | `getMaterial()`, `getToolLife()` |
| `calculate*` | Compute value | `calculateForce()`, `calculatePower()` |
| `is*` / `has*` | Boolean check | `isValid()`, `hasData()` |
| `validate*` | Validation | `validateInput()`, `validateRange()` |
| `convert*` | Transformation | `convertUnits()`, `convertFormat()` |
| `apply*` | Modification | `applyCorrection()`, `applyFilter()` |
| `_*` | Private/internal | `_helperCalc()`, `_validate()` |

### Variable Naming

| Pattern | Meaning | Examples |
|---------|---------|----------|
| `*_db` / `*_database` | Data collection | `materials_db`, `tool_database` |
| `*_config` | Configuration | `app_config`, `calc_config` |
| `*_map` / `*_index` | Lookup table | `material_map`, `id_index` |
| `*_list` / `*_array` | Collection | `tool_list`, `error_array` |
| `DEFAULT_*` | Default value | `DEFAULT_SPEED`, `DEFAULT_FEED` |
| `MAX_*` / `MIN_*` | Limits | `MAX_RPM`, `MIN_DOC` |

## 3.4 Directory Patterns

### Standard Directory Structure

```
/monolith/src/
├── algorithms/           ← Calculations
│   ├── forces/          ← Force calculations
│   ├── power/           ← Power calculations
│   ├── toollife/        ← Tool life predictions
│   ├── surface/         ← Surface finish
│   ├── vibration/       ← Chatter/stability
│   ├── thermal/         ← Heat calculations
│   └── deflection/      ← Deflection calcs
├── data/                 ← Databases
│   ├── materials/       ← Material data
│   │   ├── steels/      ← By material type
│   │   ├── aluminum/
│   │   └── props/       ← Properties
│   ├── machines/        ← Machine data
│   │   ├── haas/        ← By manufacturer
│   │   ├── dmg/
│   │   └── specs/       ← Specifications
│   └── tools/           ← Tool data
│       ├── sandvik/     ← By manufacturer
│       └── props/       ← Properties
├── optimization/         ← Optimization engines
├── simulation/           ← Simulation/verification
├── knowledge/            ← Rules and heuristics
├── cam/                  ← CAM/toolpath
├── utils/                ← Utilities
├── ui/                   ← User interface
└── core/                 ← Framework
```

## 3.5 Code Signature Patterns

### How to Recognize Module Types by Code

**Algorithm/Engine:**
```javascript
// Look for: formulas, coefficients, calculations
const kc = kc11 * Math.pow(h, -mc);  // Kienzle formula
const T = C / Math.pow(V, n);         // Taylor equation
```

**Database:**
```javascript
// Look for: large data arrays, lookup functions
const MATERIALS = [
  { id: 'AISI_4140', name: '4140 Steel', ... },
  ...
];
export function getMaterial(id) { return MATERIALS.find(...); }
```

**Utility:**
```javascript
// Look for: generic helpers, no domain logic
export function clamp(val, min, max) { ... }
export function roundTo(val, decimals) { ... }
```

**Rules/Knowledge:**
```javascript
// Look for: conditions, recommendations, warnings
if (speed > maxSpeed) {
  warnings.push('Speed exceeds recommended maximum');
}
const recommendation = rules.find(r => r.matches(conditions));
```

## 3.6 Pattern Recognition Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PATTERN RECOGNITION QUICK REFERENCE                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BY FILE NAME:                                                                          │
│  *_engine.js     → Calculation engine (algorithms)                                      │
│  *_database.js   → Data storage (databases)                                             │
│  *_utils.js      → Helper functions (utilities)                                         │
│  *_model.js      → Physics/math model (algorithms)                                      │
│  *_rules.js      → Business logic (knowledge)                                           │
│                                                                                         │
│  BY DIRECTORY:                                                                          │
│  /algorithms/    → Calculations, physics, predictions                                   │
│  /data/          → Databases, material/machine/tool data                                │
│  /optimization/  → Speed/feed optimization, cost analysis                               │
│  /knowledge/     → Rules, heuristics, recommendations                                   │
│  /utils/         → Generic helpers                                                      │
│                                                                                         │
│  BY CODE CONTENT:                                                                       │
│  Math.pow, coefficients  → Algorithm/formula                                            │
│  Large arrays, .find()   → Database                                                     │
│  if/else, warnings       → Rules/knowledge                                              │
│  Generic operations      → Utility                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 4: CROSS-REFERENCE TECHNIQUES

## 4.1 Overview

Cross-referencing helps you understand how code connects. Use these techniques to trace relationships and understand the bigger picture.

## 4.2 Import/Export Tracing

### Find What a Module Exports

```bash
# List all exports from a file
grep -E "^export" /monolith/src/algorithms/forces/cutting_force_engine.js

# Result:
# export function calculateCuttingForce(...)
# export function getCuttingForceCoefficients(...)
# export const FORCE_CONSTANTS = ...
```

### Find What Imports a Module

```bash
# Find all files importing a specific module
grep -rn "from.*cutting_force_engine" /monolith/src/
grep -rn "require.*cutting_force_engine" /monolith/src/

# Result:
# power_torque_engine.js:3: import { calculateCuttingForce } from './cutting_force_engine'
# tool_life_engine.js:5: import { getCuttingForceCoefficients } from '../forces/cutting_force_engine'
# ...
```

### Build Import Tree

```
cutting_force_engine.js
├── IMPORTS FROM:
│   ├── materials_database.js
│   ├── kienzle_coefficients.js
│   └── math_utils.js
│
└── IMPORTED BY:
    ├── power_torque_engine.js
    ├── tool_life_engine.js
    ├── optimization_engine.js
    └── ...
```

## 4.3 Function Call Tracing

### Find Function Callers

```bash
# Find all calls to a specific function
grep -rn "calculateCuttingForce(" /monolith/src/

# With context (2 lines before/after)
grep -rn -B2 -A2 "calculateCuttingForce(" /monolith/src/
```

### Find Function Definition

```bash
# Find where function is defined
grep -rn "function calculateCuttingForce" /monolith/src/
grep -rn "const calculateCuttingForce" /monolith/src/
```

### Build Call Chain

```
User request: "Calculate speed/feed"
    │
    ▼
optimization_engine.js: optimizeSpeedFeed()
    │
    ├──▶ cutting_force_engine.js: calculateCuttingForce()
    │       │
    │       └──▶ kienzle_coefficients.js: getCoefficients()
    │
    ├──▶ tool_life_engine.js: predictToolLife()
    │       │
    │       └──▶ taylor_constants.js: getTaylorConstants()
    │
    └──▶ constraint_engine.js: checkConstraints()
            │
            └──▶ machine_database.js: getMachineLimits()
```

## 4.4 Data Flow Tracing

### Find Where Data Originates

```bash
# Find data source
grep -rn "materials\s*=" /monolith/src/data/
grep -rn "MATERIALS\s*=" /monolith/src/data/

# Find data loading
grep -rn "loadMaterials" /monolith/src/
grep -rn "fetchMaterials" /monolith/src/
```

### Find Where Data Is Used

```bash
# Find data consumers
grep -rn "getMaterial(" /monolith/src/
grep -rn "materials\[" /monolith/src/
grep -rn "material\." /monolith/src/
```

### Data Flow Diagram

```
materials_database.js (SOURCE)
    │
    │ getMaterial(id)
    ▼
cutting_force_engine.js
    │
    │ material.kienzle.kc11
    ▼
Force calculation result
    │
    │ Fc (Newtons)
    ▼
power_torque_engine.js
    │
    │ Power = Fc * Vc
    ▼
Power calculation result
```

## 4.5 Configuration Tracing

### Find Configuration Usage

```bash
# Find config references
grep -rn "config\." /monolith/src/
grep -rn "CONFIG\." /monolith/src/
grep -rn "getConfig" /monolith/src/

# Find where config is defined
grep -rn "const config\s*=" /monolith/src/
```

### Configuration Dependencies

```
config.js (MASTER)
    │
    ├── algorithms/config.js (ALGORITHM DEFAULTS)
    │       │
    │       ├── forces/config.js (FORCE CALC DEFAULTS)
    │       └── toollife/config.js (TOOL LIFE DEFAULTS)
    │
    └── data/config.js (DATA DEFAULTS)
            │
            ├── materials/config.js
            └── machines/config.js
```

## 4.6 Error/Warning Tracing

### Find Error Sources

```bash
# Find error throws
grep -rn "throw.*Error" /monolith/src/
grep -rn "throw new" /monolith/src/

# Find warning generation
grep -rn "warnings.push" /monolith/src/
grep -rn "addWarning" /monolith/src/
```

### Find Error Handlers

```bash
# Find try/catch blocks
grep -rn "catch\s*(" /monolith/src/
grep -rn "\.catch(" /monolith/src/
```

## 4.7 Cross-Reference Commands Cheat Sheet

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           CROSS-REFERENCE COMMANDS                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  IMPORTS & EXPORTS                                                                      │
│  ─────────────────                                                                      │
│  grep -E "^export" file.js              # What does file export?                        │
│  grep -rn "from.*modulename" src/       # Who imports module?                           │
│  grep -rn "import.*{func}" src/         # Who imports specific function?               │
│                                                                                         │
│  FUNCTION CALLS                                                                         │
│  ─────────────────                                                                      │
│  grep -rn "functionName(" src/          # Who calls function?                           │
│  grep -rn "function funcName" src/      # Where is function defined?                    │
│  grep -rn -B2 -A2 "funcName(" src/      # Calls with context                           │
│                                                                                         │
│  DATA FLOW                                                                              │
│  ─────────────────                                                                      │
│  grep -rn "dataName\s*=" src/           # Where is data defined?                        │
│  grep -rn "getData(" src/               # Where is data retrieved?                      │
│  grep -rn "data\." src/                 # Where is data used?                           │
│                                                                                         │
│  CONFIGURATION                                                                          │
│  ─────────────────                                                                      │
│  grep -rn "config\." src/               # Config usage                                  │
│  grep -rn "const.*CONFIG" src/          # Config definitions                            │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 5: QUICK NAVIGATION & COMMON QUERIES

## 5.1 Pre-Answered Common Queries

### Materials Questions

| Question | Answer |
|----------|--------|
| "Where are material properties?" | `/src/data/materials/` |
| "Where is Kienzle data?" | `/src/data/materials/props/kienzle_coefficients.js` |
| "Where is machinability index?" | `/src/data/materials/props/machinability_index.js` |
| "Where are steel grades?" | `/src/data/materials/steels/` |
| "Where is aluminum data?" | `/src/data/materials/aluminum/` |
| "Where is titanium data?" | `/src/data/materials/titanium/` |

### Machines Questions

| Question | Answer |
|----------|--------|
| "Where are machine specs?" | `/src/data/machines/` |
| "Where is Haas data?" | `/src/data/machines/haas/` |
| "Where is DMG Mori data?" | `/src/data/machines/dmg/` |
| "Where are spindle specs?" | `/src/data/machines/specs/spindle_specs.js` |
| "Where are axis limits?" | `/src/data/machines/specs/axis_limits.js` |

### Tools Questions

| Question | Answer |
|----------|--------|
| "Where is tool data?" | `/src/data/tools/` |
| "Where is Sandvik data?" | `/src/data/tools/sandvik/` |
| "Where are insert grades?" | `/src/data/tools/props/insert_grades.js` |
| "Where is tool life data?" | `/src/data/tools/props/tool_life_data.js` |

### Algorithms Questions

| Question | Answer |
|----------|--------|
| "Where is cutting force calc?" | `/src/algorithms/forces/cutting_force_engine.js` |
| "Where is tool life prediction?" | `/src/algorithms/toollife/tool_life_engine.js` |
| "Where is chatter prediction?" | `/src/algorithms/vibration/chatter_prediction.js` |
| "Where is surface finish calc?" | `/src/algorithms/surface/surface_finish_engine.js` |
| "Where is power calculation?" | `/src/algorithms/power/power_torque_engine.js` |
| "Where is deflection calc?" | `/src/algorithms/deflection/deflection_calc.js` |
| "Where is thermal model?" | `/src/algorithms/thermal/thermal_model.js` |

### Optimization Questions

| Question | Answer |
|----------|--------|
| "Where is speed/feed optimization?" | `/src/optimization/speed_feed_optimizer.js` |
| "Where is cost optimization?" | `/src/optimization/cost_optimizer.js` |
| "Where is tool selection?" | `/src/optimization/tool_selector.js` |

## 5.2 Navigation Shortcuts

### By Task

| Task | Go To |
|------|-------|
| Add a new material | `/src/data/materials/[category]/` + update index |
| Add a new machine | `/src/data/machines/[manufacturer]/` |
| Modify force calculation | `/src/algorithms/forces/cutting_force_engine.js` |
| Add machining rule | `/src/knowledge/rules/machining_rules.js` |
| Fix unit conversion | `/src/utils/unit_converter.js` |

### By Error Message

| Error Contains | Look In |
|----------------|---------|
| "Material not found" | `/src/data/materials/materials_database.js` |
| "Invalid tool" | `/src/data/tools/tool_database.js` |
| "Machine limit exceeded" | `/src/data/machines/machine_capabilities.js` |
| "Calculation error" | `/src/algorithms/` (check specific engine) |
| "Constraint violated" | `/src/optimization/constraint_engine.js` |

## 5.3 Quick Lookup Commands

```bash
# Find all files in a category
ls /monolith/src/algorithms/forces/

# Count lines in a module
wc -l /monolith/src/algorithms/forces/*.js

# Find largest files (potential complexity)
find /monolith/src -name "*.js" -exec wc -l {} \; | sort -rn | head -20

# Find most imported modules
grep -rh "from.*'" /monolith/src | sed "s/.*from '//" | sed "s/'.*//" | sort | uniq -c | sort -rn | head -20

# Find all TODO/FIXME comments
grep -rn "TODO\|FIXME" /monolith/src/
```

## 5.4 Quick Navigation Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           NAVIGATION DECISION TREE                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  START: What are you looking for?                                                       │
│         │                                                                               │
│         ├── Data/Properties ────────────▶ /src/data/                                    │
│         │   ├── Materials? ──────────────▶ /src/data/materials/                         │
│         │   ├── Machines? ───────────────▶ /src/data/machines/                          │
│         │   └── Tools? ──────────────────▶ /src/data/tools/                             │
│         │                                                                               │
│         ├── Calculation/Formula ────────▶ /src/algorithms/                              │
│         │   ├── Forces? ─────────────────▶ /src/algorithms/forces/                      │
│         │   ├── Tool life? ──────────────▶ /src/algorithms/toollife/                    │
│         │   ├── Surface? ────────────────▶ /src/algorithms/surface/                     │
│         │   ├── Vibration? ──────────────▶ /src/algorithms/vibration/                   │
│         │   └── Thermal? ────────────────▶ /src/algorithms/thermal/                     │
│         │                                                                               │
│         ├── Optimization ───────────────▶ /src/optimization/                            │
│         │                                                                               │
│         ├── Rules/Knowledge ────────────▶ /src/knowledge/                               │
│         │                                                                               │
│         └── Utilities ──────────────────▶ /src/utils/                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 6: INTEGRATION

## 6.1 Skill Metadata

```yaml
skill_id: prism-monolith-navigator
version: 1.0.0
category: monolith-navigation
priority: MEDIUM

triggers:
  keywords:
    - "find", "search", "locate", "where is"
    - "how to find", "looking for"
    - "navigate", "browse"
    - "which file", "what module"
  contexts:
    - When you know WHAT but not WHERE
    - Before extraction work
    - When exploring unfamiliar code
    - When tracing call chains

activation_rule: |
  IF (need to find code in monolith)
  THEN activate prism-monolith-navigator
  AND use appropriate search strategy

outputs:
  - File location
  - Search commands
  - Navigation path

related_skills:
  - prism-monolith-index (reference data)
  - prism-monolith-extractor (after finding, extract)
```

## 6.2 SP.2 Integration

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SP.2 COMPLETE WORKFLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                     │
│  │  SP.2.1 INDEX   │───▶│ SP.2.3 NAVIGATE │───▶│ SP.2.2 EXTRACT  │                     │
│  │                 │    │                 │    │                 │                     │
│  │  "Where is      │    │  "How do I      │    │  "How do I      │                     │
│  │   everything?"  │    │   find it?"     │    │   safely get    │                     │
│  │                 │    │                 │    │   it out?"      │                     │
│  │  • Categories   │    │  • Strategies   │    │  • TIVE Protocol│                     │
│  │  • Module list  │    │  • Patterns     │    │  • Validation   │                     │
│  │  • Dependencies │    │  • Commands     │    │  • Rollback     │                     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                     │
│                                                                                         │
│  TYPICAL WORKFLOW:                                                                      │
│  1. Consult INDEX for category and known modules                                        │
│  2. Use NAVIGATOR to find specific code                                                 │
│  3. Use EXTRACTOR to safely pull code out                                               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-MONOLITH-NAVIGATOR QUICK REFERENCE                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  🔍 BEFORE SEARCHING: Categorize → Pattern → Index → Search 🔍                          │
│                                                                                         │
│  SEARCH STRATEGIES                                                                      │
│  ─────────────────                                                                      │
│  Name-based:    find -name "*keyword*"                                                  │
│  Content:       grep -rn "pattern" src/                                                 │
│  Reverse:       grep -rn "import.*module" src/                                          │
│  Cluster:       ls directory/ + grep -l "keyword"                                       │
│  Progressive:   Category → Index → Narrow → Verify                                      │
│                                                                                         │
│  NAMING PATTERNS                                                                        │
│  ─────────────────                                                                      │
│  *_engine.js   = Calculation engine                                                     │
│  *_database.js = Data storage                                                           │
│  *_utils.js    = Helper functions                                                       │
│  *_model.js    = Physics/math model                                                     │
│                                                                                         │
│  DIRECTORY MAP                                                                          │
│  ─────────────────                                                                      │
│  /algorithms/  = Calculations     /optimization/ = Optimization                         │
│  /data/        = Databases        /knowledge/    = Rules                                │
│  /utils/       = Utilities        /cam/          = Toolpath                             │
│                                                                                         │
│  CROSS-REFERENCE                                                                        │
│  ─────────────────                                                                      │
│  Who imports?   grep -rn "from.*module" src/                                            │
│  Who calls?     grep -rn "funcName(" src/                                               │
│  Where defined? grep -rn "function funcName" src/                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# DOCUMENT END

**Skill:** prism-monolith-navigator
**Version:** 1.0
**Total Sections:** 6
**Part of:** SP.2 Monolith Navigation (SP.2.3 of 3 - FINAL)
**Created:** Session SP.2.3
**Status:** COMPLETE

**Key Features:**
- 5 search strategies (Name, Content, Reverse, Cluster, Progressive)
- Pattern recognition for code organization, naming, directories
- Cross-reference techniques for import/export, function calls, data flow
- Pre-answered common queries (materials, machines, tools, algorithms)
- Quick navigation shortcuts and decision tree
- Integration with SP.2.1 (Index) and SP.2.2 (Extractor)

**SP.2 MONOLITH NAVIGATION: COMPLETE**
- SP.2.1 prism-monolith-index (74KB) - WHERE everything is
- SP.2.2 prism-monolith-extractor (75KB) - HOW to safely extract
- SP.2.3 prism-monolith-navigator (this skill) - HOW to find things

---

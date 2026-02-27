---
name: prism-monolith-navigator-sp
description: |
  Superpowers integration for monolith navigation.
---

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

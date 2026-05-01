---
name: prism-sp-planning
description: |
  PRISM-specific task planning: F-PSI-001 resource optimization, EXTRACT/WIRE/VALIDATE
  task types for monolith decomposition, and PRISM codebase navigation.
  Use when: plan PRISM tasks, break down extraction/wiring work, optimize resource selection.
  Part of SP.1 Core Development Workflow.
---

# PRISM-SP-PLANNING
## PRISM-Specific Task Planning
### Version 2.0 | Trimmed for PRISM-Only Content

---

# SECTION 1: F-PSI-001 COMBINATION ENGINE INTEGRATION

## 1.1 Overview

The key differentiator of PRISM planning is **resource optimization via F-PSI-001**.
Before decomposing any task, select the optimal combination of PRISM's 691 catalogued
resources (skills, agents, formulas, coefficients, hooks) using the Combination Engine.

## 1.2 F-PSI-001 Resource Selection

**Purpose:** Select optimal resources via F-PSI-001 Combination Engine

**Formula:**
```
PSI(T,R) = SUM( Cap(ri,T) * w_i ) + SUM( Syn(ri,rj) ) - SUM( Cost(ri) )

Where:
  T     = Task requirements from brainstorm
  R     = Available resource set (691 catalogued)
  Cap   = Capability score from CAPABILITY_MATRIX.json (fuzzy matching)
  Syn   = Synergy bonus from SYNERGY_MATRIX.json (pairwise interactions)
  Cost  = Resource loading cost
  R*    = Optimal resource selection with Lagrangian proof certificate
```

**Integration Steps:**
1. Load RESOURCE_REGISTRY.json (691 catalogued resources)
2. Load CAPABILITY_MATRIX.json (fuzzy matching scores)
3. Load SYNERGY_MATRIX.json (pairwise interactions)
4. Execute F-PSI-001: compute PSI(T,R) for candidate sets
5. Receive optimal resource set R* with proof certificate

**Input/Output:**
```
INPUT:
  - Task requirements from brainstorm (deliverables, complexity)
  - Available resources: 99 skills, 64 agents, 22 formulas, 32+ coefficients, 147 hooks

OUTPUT:
  - Optimal resource selection R* (skills + agents + formulas)
  - Capability coverage score (target >= 0.80)
  - Synergy bonus calculation
  - Optimality proof (Lagrangian certificate)
```

## 1.3 Resource Selection by PRISM Task Type

| Task Type | Recommended Resources |
|-----------|----------------------|
| Material work | prism-material-schema, prism-material-physics, materials_scientist agent |
| Code creation | prism-code-master, prism-coding-patterns, coder agent |
| Extraction | prism-monolith-extractor, monolith_navigator agent |
| Physics calc | F-PHYS-001/002/003, physics_validator agent |
| Planning | F-PLAN-001 through F-PLAN-005, estimator agent |
| Coordination | prism-combination-engine, combination_optimizer agent |
| Threading | prism-thread, thread_calculator agent |
| Safety checks | prism-safety, safety_validator agent |
| Toolpath | prism-toolpath, strategy_selector agent |

## 1.4 Coverage Verification

After F-PSI-001 selects resources:
- [ ] Coverage score >= 0.80
- [ ] Synergy effects calculated (positive synergy preferred)
- [ ] No critical capability gaps
- [ ] Resources documented for execution phase handoff

---

# SECTION 2: PRISM TASK TYPES

PRISM work falls into five task types. Three are PRISM-specific and documented in
detail below: EXTRACT, WIRE, and VALIDATE. The generic CREATE and MODIFY types
follow standard Claude Code patterns and need no special guidance.

## 2.1 Task Type: EXTRACT

**Use When:** Pulling code/data from the PRISM monolith (PRISM_v8_89_002.html or similar)

**Template:**
```
TASK T[N]: Extract [module name] from monolith
  Type:     extract
  Source:   [Monolith path] lines [start]-[end]
  Target:   [Output path]
  Size:     ~[X] lines, ~[Y]KB
  Depends:  [dependencies]

  Extraction Notes:
  - Start marker: [how to find start, e.g. "// === KIENZLE FORCE ENGINE ==="]
  - End marker: [how to find end]
  - Dependencies to include: [inline helpers, constants]
  - Dependencies to leave: [material lookups, global state -- wire separately]

  Post-Extraction Modifications:
  - [Change 1: update imports for standalone use]
  - [Change 2: add exports]
  - [Change 3: remove hardcoded data, replace with imports]

  Verification:
  [ ] All code from lines [X]-[Y] captured
  [ ] Imports updated for standalone use
  [ ] Exports added
  [ ] No syntax errors in extracted file
  [ ] No remaining monolith dependencies (global state, inline data)
```

**Example -- Extract Kienzle Engine:**
```
TASK T12: Extract KIENZLE_FORCE_ENGINE from monolith
  Type:     extract
  Source:   C:\...\PRISM_v8_89_002.html lines 45230-45890
  Target:   C:\PRISM REBUILD...\EXTRACTED\engines\physics\KIENZLE_FORCE_ENGINE.js
  Size:     ~660 lines, ~35KB
  Depends:  none

  Description:
  Extract Kienzle cutting force calculation engine. Core physics engine used by
  speed/feed calculator and tool life predictor.

  Extraction Notes:
  - Start marker: "// === KIENZLE FORCE ENGINE ==="
  - End marker: "// === END KIENZLE FORCE ENGINE ==="
  - Dependencies to include: unit conversion helpers (inline)
  - Dependencies to leave: material lookups (will wire separately)

  Post-Extraction Modifications:
  - Add: import { getMaterial } from '../materials/MATERIAL_INDEX.js';
  - Add: export { calculateKienzleForce, calculateSpecificForce };
  - Remove: inline material data (use import instead)

  Verification:
  [ ] File created at target path
  [ ] All functions present: calculateKienzleForce, calculateSpecificForce, etc.
  [ ] Material lookup converted to import
  [ ] No hardcoded material data remaining
```

### Monolith Navigation Guidance

The PRISM monolith is a single large HTML file containing all engines, databases,
and UI. Key navigation patterns:

```
FINDING CODE IN THE MONOLITH:
  - Engines are delimited by "// === [ENGINE NAME] ===" markers
  - Material databases appear as large object literals or arrays
  - UI components are in <script> tags with section comments
  - Use line number ranges from prism-monolith-index skill

COMMON EXTRACTION PITFALLS:
  - HTML entities in extracted JS (&amp; &lt; etc.) -- must decode
  - Global variable references (window.PRISM.*) -- must localize
  - Inline CSS/HTML mixed with JS logic -- must separate
  - Event listener registrations -- leave behind, rewire later
  - Shared utility functions used by multiple engines -- extract to utils/
```

---

## 2.2 Task Type: WIRE

**Use When:** Connecting an extracted database/engine to its consumers

**Template:**
```
TASK T[N]: Wire [source] to [consumer]
  Type:     wire
  Source:   [Database/engine path]
  Consumer: [Consumer module path]
  Change:   ~[X] lines in consumer
  Depends:  [source task], [consumer task]

  Wiring Pattern:
    // Add import
    import { [functions/data] } from '[source path]';

    // Replace usage
    // OLD: const data = hardcodedData[id];
    // NEW: const data = getFromSource(id);

  Verification:
  [ ] Import added to consumer
  [ ] Old data source removed/commented
  [ ] Consumer uses new source
  [ ] Consumer still functions correctly
```

**PRISM Wiring Patterns:**

```
PATTERN 1: Material Database -> Calculator Engine
  Source:   MATERIAL_INDEX.js (exports getMaterial, getAllMaterials)
  Consumer: SPEED_FEED_CALCULATOR.js
  Wire:     import { getMaterial } from '../materials/MATERIAL_INDEX.js';
            Replace inline material lookups with getMaterial('STEEL_1045')

PATTERN 2: Physics Engine -> Product Module
  Source:   KIENZLE_FORCE_ENGINE.js (exports calculateKienzleForce)
  Consumer: SPEED_FEED_CALCULATOR.js, TOOL_LIFE_PREDICTOR.js
  Wire:     import { calculateKienzleForce } from '../engines/physics/KIENZLE_FORCE_ENGINE.js';
            Replace inline force calculations with engine calls

PATTERN 3: Machine Database -> Validation Layer
  Source:   MACHINE_INDEX.js (exports getMachine, getMachineCapabilities)
  Consumer: PARAMETER_VALIDATOR.js
  Wire:     import { getMachineCapabilities } from '../machines/MACHINE_INDEX.js';
            Replace hardcoded machine limits with dynamic lookup

PATTERN 4: Tool Database -> Recommendation Engine
  Source:   TOOL_INDEX.js (exports getTool, searchTools)
  Consumer: TOOL_RECOMMENDER.js
  Wire:     import { searchTools } from '../tools/TOOL_INDEX.js';
            Replace static tool lists with database queries

PATTERN 5: Registry -> Dispatcher
  Source:   Any PRISM registry (material, machine, tool, alarm, formula)
  Consumer: Corresponding dispatcher action
  Wire:     Ensure dispatcher action handler calls registry.get/search methods
            Verify response shape matches dispatcher contract
```

---

## 2.3 Task Type: VALIDATE

**Use When:** Verifying PRISM extraction/wiring work is complete and correct

**Template:**
```
TASK T[N]: Validate [component/feature]
  Type:     validate
  Target:   [What to validate]
  Depends:  [all tasks being validated]

  Validation Checks:
  [ ] [Check 1: Existence] - File(s) exist at expected paths
  [ ] [Check 2: Size] - Files are expected sizes
  [ ] [Check 3: Content] - Key content present (kc1_1 values, function signatures)
  [ ] [Check 4: Integration] - Wiring complete (imports resolve, exports match)
  [ ] [Check 5: Function] - Component works as expected

  Evidence to Capture:
  - File listing showing paths and sizes
  - Sample content verification (spot-check key values)
  - Integration test result (consumer can call source)

  If Validation Fails:
  - Document which check failed
  - Identify root cause
  - Create fix task before proceeding
```

**PRISM-Specific Validation Checks:**

```
FOR MATERIAL FILES:
  [ ] All required sections present (identification, physical, mechanical,
      cutting/Kienzle, Johnson-Cook, tooling, Taylor, metadata)
  [ ] kc1_1 value is physically reasonable (500-3500 N/mm2)
  [ ] Density matches known range for material category
  [ ] Kienzle exponent mc is in range 0.15-0.45
  [ ] Johnson-Cook parameters are non-negative
  [ ] Taylor coefficients have valid speed range

FOR EXTRACTED ENGINES:
  [ ] No monolith dependencies remain (no window.PRISM.*, no inline data)
  [ ] All functions have proper imports
  [ ] ENGINE_CONFIG object present with name, version, inputs, outputs
  [ ] Confidence calculation function present
  [ ] No HTML artifacts from monolith extraction

FOR WIRED CONSUMERS:
  [ ] Import paths resolve correctly (relative paths match directory structure)
  [ ] Old inline data removed (no duplicate data sources)
  [ ] Consumer can call source and get valid response
  [ ] Error handling present for missing/invalid data from source
```

---

# SECTION 3: PRISM CODE OUTLINE PATTERNS

These outlines are specific to PRISM's architecture. Use them when planning
create tasks for PRISM material files, engine modules, or registry entries.

## 3.1 Material Database Entry Outline

```javascript
// =======================================================================
// PRISM Material: [MATERIAL NAME]
// Category: [category]
// =======================================================================

const [MATERIAL_ID] = {
  // -------------------------------------------------------------------
  // IDENTIFICATION (5 fields)
  // -------------------------------------------------------------------
  id: "[MATERIAL_ID]",
  name: "[Full Material Name]",
  category: "[category]",
  subcategory: "[subcategory]",
  alternateNames: ["[alias1]", "[alias2]"],

  // -------------------------------------------------------------------
  // PHYSICAL PROPERTIES (15 fields)
  // -------------------------------------------------------------------
  physical: {
    density: 0,                    // kg/m3
    meltingPoint: 0,               // C
    thermalConductivity: 0,        // W/(m*K)
    specificHeat: 0,               // J/(kg*K)
    thermalExpansion: 0,           // um/(m*K)
    elasticModulus: 0,             // GPa
    poissonsRatio: 0,              // dimensionless
    // ... remaining physical properties
  },

  // -------------------------------------------------------------------
  // MECHANICAL PROPERTIES (20 fields)
  // -------------------------------------------------------------------
  mechanical: {
    tensileStrength: { min: 0, typ: 0, max: 0, unit: "MPa" },
    yieldStrength: { min: 0, typ: 0, max: 0, unit: "MPa" },
    elongation: { min: 0, typ: 0, max: 0, unit: "%" },
    hardness: {
      brinell: { min: 0, typ: 0, max: 0 },
      rockwellC: { min: null, typ: null, max: null },
      vickers: { min: 0, typ: 0, max: 0 }
    },
    // ... remaining mechanical properties
  },

  // -------------------------------------------------------------------
  // CUTTING PARAMETERS - KIENZLE (25 fields)
  // -------------------------------------------------------------------
  cutting: {
    machinability: 0,              // % relative to reference
    kc1_1: 0,                      // N/mm2 - specific cutting force
    mc: 0,                         // Kienzle exponent

    byOperation: {
      turning: {
        kc1_1: 0, mc: 0,
        speedRange: { min: 0, max: 0, unit: "m/min" },
        feedRange: { min: 0, max: 0, unit: "mm/rev" }
      },
      milling: {
        kc1_1: 0, mc: 0,
        speedRange: { min: 0, max: 0, unit: "m/min" },
        feedRange: { min: 0, max: 0, unit: "mm/tooth" }
      },
      drilling: {
        kc1_1: 0, mc: 0,
        speedRange: { min: 0, max: 0, unit: "m/min" },
        feedRange: { min: 0, max: 0, unit: "mm/rev" }
      }
    }
  },

  // -------------------------------------------------------------------
  // JOHNSON-COOK PARAMETERS (12 fields)
  // -------------------------------------------------------------------
  johnsonCook: {
    A: 0,                          // MPa - yield stress
    B: 0,                          // MPa - hardening modulus
    n: 0,                          // strain hardening exponent
    C: 0,                          // strain rate coefficient
    m: 0,                          // thermal softening exponent
    refStrainRate: 0,              // 1/s
    meltTemp: 0,                   // C
    refTemp: 0                     // C
  },

  // -------------------------------------------------------------------
  // TOOL RECOMMENDATIONS (30 fields)
  // -------------------------------------------------------------------
  tooling: {
    recommendedGrades: ["[grade1]", "[grade2]"],
    recommendedCoatings: ["[coating1]", "[coating2]"],
    recommendedGeometry: {
      rakeAngle: { min: 0, max: 0, unit: "deg" },
      reliefAngle: { min: 0, max: 0, unit: "deg" },
      noseRadius: { min: 0, max: 0, unit: "mm" }
    },
    avoidMaterials: ["[material1]"],
    coolantRecommendation: "[type]"
  },

  // -------------------------------------------------------------------
  // TAYLOR TOOL LIFE (10 fields)
  // -------------------------------------------------------------------
  taylorCoefficients: {
    C: 0,                          // Taylor constant
    n: 0,                          // Taylor exponent
    validRange: {
      speedMin: 0,
      speedMax: 0,
      unit: "m/min"
    }
  },

  // -------------------------------------------------------------------
  // METADATA (10 fields)
  // -------------------------------------------------------------------
  meta: {
    sources: [
      { name: "[source]", year: 0, confidence: 0 }
    ],
    lastUpdated: "[ISO date]",
    version: "1.0.0",
    reviewStatus: "draft",
    overallConfidence: 0
  }
};

export default [MATERIAL_ID];
```

## 3.2 Engine Module Outline

```javascript
// =======================================================================
// PRISM Engine: [ENGINE NAME]
// Category: [Physics | AI/ML | Optimization | etc.]
// =======================================================================

// IMPORTS
import { /* material lookup */ } from '../materials/MATERIAL_INDEX.js';
import { /* machine specs */ } from '../machines/MACHINE_INDEX.js';
import { /* utilities */ } from '../utils/[utility].js';

// ENGINE CONFIGURATION
const ENGINE_CONFIG = {
  name: "[ENGINE NAME]",
  version: "9.0.0",
  category: "[category]",

  // Input requirements
  requiredInputs: ["[input1]", "[input2]"],
  optionalInputs: ["[input3]"],

  // Output specification
  outputs: ["[output1]", "[output2]"],

  // Performance targets
  maxCalculationTime: 500,         // ms
  cacheable: true
};

// CORE CALCULATION
/**
 * Main calculation function
 * @param {Object} inputs - Calculation inputs
 * @returns {Object} Calculation results with confidence
 */
function calculate(inputs) {
  // Step 1: Validate inputs
  const validated = validateInputs(inputs);

  // Step 2: Fetch required data (material, machine)
  // Step 3: Core calculation ([algorithm name])
  // Step 4: Apply corrections (temperature, tool wear)
  // Step 5: Calculate confidence

  return {
    result: /* calculated value */,
    confidence: 0,
    warnings: [],
    meta: {
      calculatedAt: new Date().toISOString(),
      engine: ENGINE_CONFIG.name,
      version: ENGINE_CONFIG.version
    }
  };
}

function validateInputs(inputs) {
  // Check required inputs present, ranges, types
}

function calculateConfidence(factors) {
  // Implement confidence model
}

// EXPORTS
export { calculate, validateInputs, ENGINE_CONFIG };
export default { calculate, config: ENGINE_CONFIG };
```

---

# SECTION 4: COMPLETE PRISM EXAMPLES

## 4.1 Example: Planning a Materials Database Task

**Context:**
- Approved design: Create 3 new material files for carbon steels
- Scope: STEEL_1045, STEEL_1050, STEEL_1055 with 127 parameters each
- Approach: Use template, batch create, wire to index

```
==========================================================================
               PLAN: Carbon Steel Materials (1045, 1050, 1055)
==========================================================================

OVERVIEW:
  Total Tasks:     8
  Estimated Time:  28 minutes
  Checkpoints:     2
  Critical Path:   T1 -> T2 -> T3,T4,T5 -> T6 -> T7 -> T8

RESOURCES (via F-PSI-001):
  Skills:  prism-material-schema, prism-material-physics
  Agents:  materials_scientist
  Formulas: F-PHYS-001 (Kienzle), F-PHYS-003 (Johnson-Cook)
  Coverage: 0.92 | Synergy: +0.15

DEPENDENCY MAP:
  T1 (verify dir) --> T2 (verify template)
                           |
                      +----+----+
                      v    v    v
                     T3   T4   T5  (material files - parallel)
                      |    |    |
                      +----+----+
                           v
                     T6 (update index)
                           v
                     T7 (wire consumers)
                           v
                     T8 (validate)

==========================================================================
                               TASK LIST
==========================================================================

TASK T1: Verify materials directory exists
  Type:     validate
  Path:     C:\PRISM REBUILD...\EXTRACTED\materials\enhanced\
  Time:     2 minutes
  Depends:  none
  Verification:
  [ ] Directory exists at path
  [ ] Directory is writable

TASK T2: Verify material template available
  Type:     validate
  Path:     prism-material-template skill
  Time:     2 minutes
  Depends:  T1
  Verification:
  [ ] Template skill accessible
  [ ] 127-parameter structure confirmed

TASK T3: Create STEEL_1045_MATERIAL.js
  Type:     create
  Path:     C:\PRISM REBUILD...\EXTRACTED\materials\enhanced\STEEL_1045_MATERIAL.js
  Size:     ~200 lines, ~14KB
  Time:     4 minutes
  Depends:  T2
  Code Outline:
  const STEEL_1045 = {
    id: "STEEL_1045",
    name: "AISI 1045 Medium Carbon Steel",
    physical: { density: 7850, ... },           // 15 fields
    mechanical: { tensileStrength: {...}, ... }, // 20 fields
    cutting: { kc1_1: 1820, mc: 0.26, ... },    // 25 fields
    johnsonCook: { A: 553, B: 600, ... },        // 12 fields
    tooling: { recommendedGrades: [...], ... },  // 30 fields
    taylorCoefficients: { C: 250, n: 0.25 },     // 10 fields
    meta: { sources: [...], ... }                // 10 fields
  };
  export default STEEL_1045;
  Verification:
  [ ] File exists at path
  [ ] All 7 sections present
  [ ] kc1_1 = 1820 (verified from handbook)
  [ ] Density = 7850 kg/m3

TASK T4: Create STEEL_1050_MATERIAL.js
  Type:     create
  Path:     C:\PRISM REBUILD...\EXTRACTED\materials\enhanced\STEEL_1050_MATERIAL.js
  Size:     ~200 lines, ~14KB
  Time:     4 minutes
  Depends:  T2
  Key differences from T3: kc1_1: 1880, tensileStrength.typ: 690 MPa
  Verification:
  [ ] Values differ from 1045 appropriately
  [ ] kc1_1 = 1880 (higher carbon = higher force)

TASK T5: Create STEEL_1055_MATERIAL.js
  Type:     create
  Path:     C:\PRISM REBUILD...\EXTRACTED\materials\enhanced\STEEL_1055_MATERIAL.js
  Size:     ~200 lines, ~14KB
  Time:     4 minutes
  Depends:  T2
  Key differences from T3: kc1_1: 1920, tensileStrength.typ: 720 MPa
  Verification:
  [ ] Progressive increase in kc1_1 (1820 -> 1880 -> 1920)

=== CHECKPOINT 1 after T5 ===
Completed: T1, T2, T3, T4, T5
Verify:
[ ] STEEL_1045_MATERIAL.js exists, ~14KB
[ ] STEEL_1050_MATERIAL.js exists, ~14KB
[ ] STEEL_1055_MATERIAL.js exists, ~14KB
[ ] All have 127 parameters
Save: Update CURRENT_STATE.json with progress
==============================

TASK T6: Update MATERIAL_INDEX.js
  Type:     modify
  Path:     C:\PRISM REBUILD...\EXTRACTED\materials\MATERIAL_INDEX.js
  Change:   +6 lines
  Time:     3 minutes
  Depends:  T3, T4, T5
  Current State:
    import STEEL_1040 from './enhanced/STEEL_1040_MATERIAL.js';
    export { STEEL_1040, ... };
  Target State:
    import STEEL_1040 from './enhanced/STEEL_1040_MATERIAL.js';
    import STEEL_1045 from './enhanced/STEEL_1045_MATERIAL.js';
    import STEEL_1050 from './enhanced/STEEL_1050_MATERIAL.js';
    import STEEL_1055 from './enhanced/STEEL_1055_MATERIAL.js';
    export { STEEL_1040, STEEL_1045, STEEL_1050, STEEL_1055, ... };
  Verification:
  [ ] All 3 imports added in alphabetical order
  [ ] All 3 exports added
  [ ] No syntax errors

TASK T7: Wire materials to speed/feed calculator
  Type:     wire
  Source:   MATERIAL_INDEX.js
  Consumer: C:\PRISM REBUILD...\products\speed-feed\SPEED_FEED_CALCULATOR.js
  Change:   ~5 lines
  Time:     3 minutes
  Depends:  T6
  Wiring:
    // Verify import exists
    import { getMaterial } from '../materials/MATERIAL_INDEX.js';
    // New materials automatically available via getMaterial('STEEL_1045')
  Verification:
  [ ] Calculator can resolve STEEL_1045, STEEL_1050, STEEL_1055
  [ ] Material selector includes new materials

TASK T8: Validate complete integration
  Type:     validate
  Target:   All 3 materials + index + wiring
  Time:     3 minutes
  Depends:  T7
  Validation Checks:
  [ ] All 3 files exist with correct sizes
  [ ] All files have 127 parameters
  [ ] Index exports all 3 materials
  [ ] Calculator can use each material
  [ ] kc1_1 values form logical progression (1820, 1880, 1920)

=== CHECKPOINT 2 (FINAL) after T8 ===
All tasks T1-T8 complete.
Update CURRENT_STATE.json - mark task COMPLETE.
==========================================
```

---

## 4.2 Example: Planning an Engine Extraction

**Context:**
- Approved design: Extract Kienzle force engine from monolith
- Scope: Lines 45230-45890, convert to standalone module
- Approach: Extract, modify imports, wire to consumers

```
==========================================================================
               PLAN: Extract KIENZLE_FORCE_ENGINE
==========================================================================

OVERVIEW:
  Total Tasks:     6
  Estimated Time:  24 minutes
  Checkpoints:     2
  Critical Path:   T1 -> T2 -> T3 -> T4 -> T5 -> T6

RESOURCES (via F-PSI-001):
  Skills:  prism-monolith-extractor, prism-coding-patterns
  Agents:  monolith_navigator, coder
  Formulas: F-PHYS-001 (Kienzle - for validation)
  Coverage: 0.88 | Synergy: +0.12

==========================================================================
                               TASK LIST
==========================================================================

TASK T1: Locate engine in monolith
  Type:     validate
  Source:   C:\...\PRISM_v8_89_002.html
  Time:     3 minutes
  Depends:  none
  Search For:
  - Start: "// === KIENZLE FORCE ENGINE ==="
  - End: "// === END KIENZLE FORCE ENGINE ==="
  - Expected: ~660 lines
  Verification:
  [ ] Start line confirmed: 45230
  [ ] End line confirmed: 45890
  [ ] Size matches expectation

TASK T2: Create target directory
  Type:     create
  Path:     C:\PRISM REBUILD...\EXTRACTED\engines\physics\
  Time:     1 minute
  Depends:  T1
  Verification:
  [ ] Directory created/exists

TASK T3: Extract raw engine code
  Type:     extract
  Source:   Monolith lines 45230-45890
  Target:   C:\PRISM REBUILD...\EXTRACTED\engines\physics\KIENZLE_FORCE_ENGINE.js
  Size:     ~660 lines, ~35KB
  Time:     5 minutes
  Depends:  T2
  Extraction Notes:
  - Include: All functions within boundaries
  - Include: Inline constants and helpers
  - Exclude: Material data (will import)
  - Exclude: Global state references
  Verification:
  [ ] File created at target
  [ ] ~660 lines captured
  [ ] No HTML artifacts

=== CHECKPOINT 1 after T3 ===
Verify:
[ ] Engine file exists at path
[ ] ~35KB, ~660 lines
[ ] Contains calculateKienzleForce function
Save: Update CURRENT_STATE.json
==============================

TASK T4: Modify for standalone use
  Type:     modify
  Path:     C:\PRISM REBUILD...\EXTRACTED\engines\physics\KIENZLE_FORCE_ENGINE.js
  Change:   +15 lines imports, +5 lines exports, -50 lines inline data
  Time:     5 minutes
  Depends:  T3
  Modifications:
  1. Add at top:
     import { getMaterial } from '../../materials/MATERIAL_INDEX.js';
     import { getUnitConverter } from '../../utils/UNIT_CONVERTER.js';
  2. Remove: Inline material lookup table (~50 lines)
  3. Replace: Direct material access with getMaterial() calls
  4. Add at bottom:
     export { calculateKienzleForce, calculateSpecificForce, ENGINE_CONFIG };
     export default { calculate: calculateKienzleForce, config: ENGINE_CONFIG };
  Verification:
  [ ] Imports added
  [ ] No hardcoded material data
  [ ] Exports present
  [ ] No syntax errors

TASK T5: Wire to consumers
  Type:     wire
  Source:   KIENZLE_FORCE_ENGINE.js
  Consumers: SPEED_FEED_CALCULATOR.js, TOOL_LIFE_PREDICTOR.js
  Change:   ~10 lines per consumer
  Time:     5 minutes
  Depends:  T4
  Wiring:
  Consumer 1 - SPEED_FEED_CALCULATOR.js:
    import { calculateKienzleForce } from '../engines/physics/KIENZLE_FORCE_ENGINE.js';
    // Replace inline force calculation with imported function
  Consumer 2 - TOOL_LIFE_PREDICTOR.js:
    import { calculateSpecificForce } from '../engines/physics/KIENZLE_FORCE_ENGINE.js';
    // Replace inline specific force with imported function
  Verification:
  [ ] Both consumers updated
  [ ] Old inline code removed/commented
  [ ] Both consumers use imported engine

TASK T6: Validate extraction complete
  Type:     validate
  Target:   Engine + consumers
  Time:     3 minutes
  Depends:  T5
  Validation Checks:
  [ ] Engine file standalone (~620 lines after trimming)
  [ ] No monolith dependencies remain
  [ ] Imports resolve correctly
  [ ] Exports match consumer expectations
  [ ] Both consumers wired

=== CHECKPOINT 2 (FINAL) ===
All tasks complete.
Update CURRENT_STATE.json - mark extraction COMPLETE.
==============================
```

---

# SECTION 5: SKILL INTEGRATION WITH PRISM ECOSYSTEM

## 5.1 Input from prism-sp-brainstorm

This skill receives approved designs from the brainstorm phase:

```
From prism-sp-brainstorm:
  +-- Approved Scope (Chunk 1)
  |     What will be created/changed, what is excluded, estimated size
  +-- Approved Approach (Chunk 2)
  |     Technical strategy, key decisions, trade-offs
  +-- Approved Details (Chunk 3)
  |     File paths, structure/schema, implementation order
  +-- Alternatives Considered
        Options evaluated, why chosen approach selected
```

## 5.2 Output to prism-sp-execution

```
To prism-sp-execution:
  +-- Task List (ordered by dependencies, 2-5 min tasks, full paths, code outlines)
  +-- Checkpoint Schedule (every 3-5 tasks, verification steps, save instructions)
  +-- Dependency Map (blockers, critical path, parallel opportunities)
  +-- Resource Assignments (from F-PSI-001: which skills/agents/formulas per task)
  +-- Time Estimates (per-task with buffers, total with contingency)
```

## 5.3 PRISM Skills to Reference During Planning

| Situation | Reference Skill | Why |
|-----------|-----------------|-----|
| Material file tasks | prism-material-template | Get 127-parameter structure |
| Code creation tasks | prism-coding-patterns | Get standard patterns |
| Extraction tasks | prism-monolith-index | Get line numbers |
| Physics calculations | prism-physics-formulas | Get formula structures |
| Time estimation | prism-manufacturing-tables | Get complexity data |

## 5.4 PRISM Registry/Dispatcher Integration

When planning tasks that touch PRISM registries or dispatchers, ensure:

```
REGISTRIES (data layer):
  - material registry:  data/registries/materials/
  - machine registry:   data/registries/machines/
  - tool registry:      data/registries/tools/
  - alarm registry:     data/registries/alarms/
  - formula registry:   data/registries/formulas/

DISPATCHERS (action layer):
  - prism_data:         material_get, material_search, machine_get, tool_search, etc.
  - prism_calc:         cutting_force, tool_life, speed_feed, surface_finish, etc.
  - prism_safety:       check_toolpath_collision, validate_coolant_flow, etc.
  - prism_thread:       calculate_tap_drill, calculate_thread_mill_params, etc.
  - prism_toolpath:     strategy_select, params_calculate, etc.

TASK PLANNING RULES FOR REGISTRIES:
  1. EXTRACT tasks pull data from monolith INTO registry format
  2. WIRE tasks connect registries TO dispatcher action handlers
  3. VALIDATE tasks confirm dispatcher can serve data from registry
  4. Always plan in order: EXTRACT -> WIRE -> VALIDATE
```

## 5.5 State File Updates

When planning completes, update CURRENT_STATE.json:

```json
{
  "currentTask": {
    "id": "[task ID]",
    "name": "[task name]",
    "status": "PLANNED",
    "phase": "ready-for-execution",
    "plan": {
      "totalTasks": 8,
      "estimatedTime": "28 minutes",
      "checkpoints": 2,
      "criticalPath": ["T1", "T2", "T3", "T5", "T6", "T7"],
      "resources": {
        "skills": ["prism-material-schema"],
        "agents": ["materials_scientist"],
        "formulas": ["F-PHYS-001"],
        "coverageScore": 0.92
      }
    }
  },
  "nextStep": {
    "action": "Execute plan",
    "skill": "prism-sp-execution",
    "startWith": "T1"
  }
}
```

---

**END OF SKILL DOCUMENT**

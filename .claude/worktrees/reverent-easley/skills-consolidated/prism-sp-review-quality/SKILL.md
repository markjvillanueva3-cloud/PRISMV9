---
name: prism-sp-review-quality
description: |
  PRISM-specific code quality gate. Focuses on manufacturing-domain quality:
  10 Commandments framework, safety-critical code paths, physics validation,
  PRISM naming conventions, and dispatcher/registry integration patterns.
  Generic code style, SOLID, and formatting are handled by Claude Code LSP.
  Requires APPROVED spec review from prism-sp-review-spec.
  Part of SP.1 Core Development Workflow (SP.1.5).
---

# PRISM-SP-REVIEW-QUALITY
## Manufacturing-Domain Quality Gate
### Version 2.0 (Trimmed) | SP.1.5

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

Reviews code quality specific to PRISM's manufacturing domain AFTER spec compliance is confirmed. Answers: **"Did we build it RIGHT for manufacturing?"**

**What this skill checks (PRISM-specific):**
- 10 Commandments alignment (PRISM quality gates)
- Manufacturing safety-critical code paths
- Physics validation and sanity limits
- PRISM naming conventions (dispatchers, engines, registries)
- PRISM type contracts (Measurement, Range, DataSource)

**NOT checked here (handled by Claude Code LSP):**
- Generic formatting, SOLID, Halstead/McCabe, language-level linting

## 1.2 Two-Tier Findings

| Category | Severity | Examples |
|----------|----------|----------|
| **ISSUE** | Blocking, must fix | No physics validation, missing safety limits, no fallbacks |
| **RECOMMENDATION** | Non-blocking | Missing uncertainty, could add XAI, naming improvement |

## 1.3 Process Overview

```
Spec review APPROVED -> NAMING -> TYPES -> SAFETY -> 10 CMDS -> VERDICT
```

---

# SECTION 2: PRISM NAMING CONVENTIONS

## 2.1 Dispatcher & Engine Naming

```javascript
// DISPATCHER: prism-{domain}.js  |  Actions: snake_case
//   prism-calc.js   -> cutting_force, tool_life, speed_feed
//   prism-data.js   -> material_get, material_search, tool_recommend
//   prism-safety.js -> check_toolpath_collision, validate_rapid_moves

// ENGINE: {domain}-{function}-engine.js
//   cutting-force-engine.js  -> exports calculateCuttingForce
//   tool-life-engine.js      -> exports predictToolLife

// REGISTRY: {domain}-registry.json
//   material-registry.json   -> .get(id), .search(query), .list()
```

### Action Naming Patterns

```javascript
// prism_calc:  verb_noun       -> cutting_force, tool_life, speed_feed
// prism_data:  entity_verb     -> material_get, machine_search, alarm_decode
// prism_safety: verb_entity    -> check_spindle_torque, predict_tool_breakage

// BAD: 'doCalc', 'getMaterialData' (camelCase), 'process' (too generic)
```

## 2.2 Manufacturing Functions & Constants

```javascript
// Functions: camelCase, verb prefix, domain-specific
calculateCuttingForce(material, params)
validateToolGeometry(tool)
checkSpindleTorque(speed, load)
isValidSpindleSpeed(rpm)       // "is" for booleans
hasKienzleCoefficients(mat)    // "has" for presence

// Constants: UPPER_SNAKE_CASE with units comment
const MAX_SPINDLE_SPEED = 15000;          // RPM
const DEFAULT_FEED_RATE = 0.1;            // mm/rev
const SAFETY_FACTOR_INTERMITTENT = 1.15;  // per ISO 3685
const MAX_CUTTING_FORCE_SANITY = 100000;  // N (100kN limit)

// Files: kebab-case, domain-descriptive
// cutting-force-engine.js, material-registry.json, spindle-thermal-model.js
```

---

# SECTION 3: PRISM TYPE CONTRACTS

## 3.1 Required Types

All manufacturing calculations MUST use these types from prism-api-contracts.

```typescript
interface Measurement {
  value: number;
  unit: string;           // 'N', 'mm', 'RPM', 'mm/rev', 'MPa'
  uncertainty?: number;   // +/- uncertainty
  confidence?: number;    // 0-1
}

interface Range<T = number> {
  min: T; max: T; typical?: T; optimal?: T;
}

interface DataSource {
  name: string;
  type: 'database' | 'physics' | 'ml' | 'historical' | 'user';
  weight: number;         // 0-1
  confidence: number;     // 0-1
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: {
    requestId: string; timestamp: string; duration: number;
    version: string; sources?: DataSource[];
  };
}
```

## 3.2 Manufacturing API Pattern

```javascript
// GOOD: Full PRISM pattern -- types, validation, physics checks, wrapper
function calculateCuttingForce(material, feedRate, depthOfCut) {
  // 1. Input validation with manufacturing bounds
  if (!material?.kienzleCoefficients)
    throw createError('INVALID_PARAMETER', 'Material missing Kienzle coefficients');
  if (feedRate.value <= 0 || feedRate.value > 10)
    throw createError('INVALID_PARAMETER',
      `Feed rate ${feedRate.value} ${feedRate.unit} outside range (0-10 mm/rev)`);

  // 2. Physics calculation
  const chipThickness = feedRate.value * Math.sin(leadAngle);
  const Kc = material.kienzleCoefficients.Kc11 * Math.pow(chipThickness, -material.mc);
  const force = Kc * depthOfCut.value * chipThickness;

  // 3. Output validation -- physics sanity
  if (isNaN(force) || !isFinite(force) || force < 0)
    throw createError('CALCULATION_FAILED', 'Invalid physics result');
  if (force > MAX_CUTTING_FORCE_SANITY)
    throw createError('CALCULATION_FAILED', `${force}N exceeds ${MAX_CUTTING_FORCE_SANITY}N limit`);

  // 4. Return with PRISM wrapper, Measurement types, DataSource tracking
  return {
    success: true,
    data: {
      force: { value: force, unit: 'N', uncertainty: force * 0.05, confidence: 0.95 },
      chipThickness: { value: chipThickness, unit: 'mm' },
    },
    metadata: {
      requestId: generateUUID(), timestamp: new Date().toISOString(),
      duration: Date.now() - startTime, version: '1.0.0',
      sources: [
        { name: 'kienzle-model', type: 'physics', weight: 0.7, confidence: 0.95 },
        { name: 'material-db', type: 'database', weight: 0.3, confidence: 1.0 }
      ]
    }
  };
}

// BAD: Raw numbers, no types, no validation, no wrapper
function calcForce(mat, f, d) { return mat.kc * f * d; }
```

---

# SECTION 4: MANUFACTURING SAFETY CHECKS

## 4.1 Physics Sanity Limits

All physics calculations MUST validate outputs against these ranges.

```javascript
const PHYSICS_SANITY_LIMITS = {
  cutting_force:    { min: 0, max: 100000, unit: 'N' },
  spindle_speed:    { min: 0, max: 100000, unit: 'RPM' },
  feed_rate:        { min: 0, max: 100,    unit: 'mm/rev' },
  depth_of_cut:     { min: 0, max: 100,    unit: 'mm' },
  temperature:      { min: -50, max: 2000, unit: 'C' },
  surface_roughness:{ min: 0, max: 100,    unit: 'um' },
  tool_life:        { min: 0, max: 10000,  unit: 'min' },
  power:            { min: 0, max: 500,    unit: 'kW' },
  torque:           { min: 0, max: 50000,  unit: 'Nm' },
  chip_thickness:   { min: 0.001, max: 50, unit: 'mm' },
};

function validatePhysicsOutput(name, value, unit) {
  const limits = PHYSICS_SANITY_LIMITS[name];
  if (!limits) return;
  if (isNaN(value) || !isFinite(value))
    throw createError('PHYSICS_INVALID', `${name} produced NaN/Infinity`);
  if (value < limits.min || value > limits.max)
    throw createError('PHYSICS_OUT_OF_RANGE',
      `${name}=${value}${unit} outside [${limits.min}-${limits.max}${limits.unit}]`);
}
```

## 4.2 Safety-Critical Actions

The prism_safety dispatcher actions are ALL safety-critical and MUST have:
1. Input validation with physical bounds
2. Output validation with sanity limits
3. Fallback behavior (never return unsafe values silently)
4. Error messages with units and limits

```
Safety-critical actions: check_toolpath_collision, validate_rapid_moves,
check_fixture_clearance, detect_near_miss, check_spindle_torque,
check_spindle_power, validate_spindle_speed, predict_tool_breakage,
calculate_tool_stress, check_chip_load_limits, calculate_clamp_force_required,
validate_workholding_setup, check_pullout_resistance
```

## 4.3 Material Property Validation

```javascript
// Validate material coefficients exist AND are physically reasonable
function getKienzleCoefficients(material) {
  if (!material?.kienzleCoefficients)
    throw createError('MISSING_COEFFICIENTS',
      `Material ${material?.id} lacks Kienzle coefficients (Kc11, mc)`);
  const { Kc11, mc } = material.kienzleCoefficients;
  if (Kc11 < 100 || Kc11 > 10000) // typical 500-5000 N/mm2 for metals
    throw createError('SUSPICIOUS_COEFFICIENT', `Kc11=${Kc11} outside [100-10000]`);
  if (mc < 0 || mc > 1)
    throw createError('SUSPICIOUS_COEFFICIENT', `mc=${mc} outside [0-1]`);
  return { Kc11, mc };
}
```

## 4.4 Safety Check Template

```markdown
| Calculation | Input Bounds? | Output Sanity? | Fails Safely? | Units in Errors? |
|-------------|--------------|----------------|---------------|-----------------|
| [name] | YES/NO | YES/NO | YES/NO | YES/NO |

Missing physics validation = ISSUE (safety-critical)
Missing sanity limits = ISSUE (safety-critical)
Missing units in errors = RECOMMENDATION
```

---

# SECTION 5: THE 10 COMMANDMENTS

## 5.1 Severity Classification

| # | Commandment | Severity | Rationale |
|---|-------------|----------|-----------|
| 1 | Use Everywhere | **ISSUE** | Orphaned code is waste -- 6+ consumers required |
| 2 | Fuse | REC | Cross-domain data fusion ideal but not always applicable |
| 3 | Verify Triple | **ISSUE** | Data integrity non-negotiable in manufacturing |
| 4 | Learn | REC | ML pipeline integration for continuous improvement |
| 5 | Uncertainty | REC | Scientific best practice for manufacturing |
| 6 | Explain | REC | XAI readiness for operator trust |
| 7 | Graceful | **ISSUE** | System stability critical for machine control |
| 8 | Protect | **ISSUE** | Input sanitization prevents unsafe operations |
| 9 | Perform | REC | <500ms for calculations |
| 10 | User Obsess | REC | Good defaults for operators |

**Blocking (#1, #3, #7, #8):** System won't be reliable without these.

## 5.2 Commandment Checks

**#1 USE EVERYWHERE (ISSUE):** 6+ consumers required.
Typical consumers: dispatchers, engines, CLI, API, tests, benchmarks, UI.

**#2 FUSE (REC):** Combine database + physics + ML + historical + user sources.
Track via DataSource[] in response metadata.

**#3 VERIFY TRIPLE (ISSUE):** Three-layer validation required.
- Input: parameter bounds, types, units
- Process: intermediate sanity checks
- Output: physics sanity limits
Missing any layer = ISSUE.

**#4 LEARN (REC):** Structured logging for ML ingestion, outcome tracking.

**#5 UNCERTAINTY (REC):** Measurement type with uncertainty field, confidence levels.

**#6 EXPLAIN (REC):** Traceable calculation steps, sources cited, answer "why this result?"

**#7 GRACEFUL (ISSUE):** Handle missing data, invalid input, calculation errors, service failures.
Must have fallbacks. Silent wrong answers are unacceptable in manufacturing.

**#8 PROTECT (ISSUE):** Input sanitization, numeric bounds checking, physical limits enforced.

**#9 PERFORM (REC):** <500ms target for calculations.

**#10 USER OBSESS (REC):** Sensible defaults, helpful error messages with units/limits.

## 5.3 Summary Template

```markdown
| # | Commandment | Severity | Status | Finding |
|---|-------------|----------|--------|---------|
| 1 | Use Everywhere | ISSUE | PASS/ISSUE | [consumers: N] |
| 2 | Fuse | REC | PASS/REC | [sources: N] |
| 3 | Verify Triple | ISSUE | PASS/ISSUE | [layers: N/3] |
| 4 | Learn | REC | PASS/REC | |
| 5 | Uncertainty | REC | PASS/REC | |
| 6 | Explain | REC | PASS/REC | |
| 7 | Graceful | ISSUE | PASS/ISSUE | [fallbacks] |
| 8 | Protect | ISSUE | PASS/ISSUE | [bounds] |
| 9 | Perform | REC | PASS/REC | [<500ms] |
| 10 | User Obsess | REC | PASS/REC | [defaults] |

ISSUES: [N]  |  RECOMMENDATIONS: [N]
```

---

# SECTION 6: VERDICT & CLASSIFICATION

## 6.1 Decision Logic

```
Any ISSUE found -> QUALITY FAILED (fix all, re-review)
Only RECs       -> QUALITY APPROVED (proceed to SP.1.6/SP.1.7)
```

## 6.2 Finding Classification

```
Missing physics validation / sanity limits?    -> ISSUE
Safety-critical path without error handling?   -> ISSUE
Violates Commandment #1, #3, #7, or #8?       -> ISSUE
Missing PRISM type contracts on physics values?-> ISSUE
Dispatcher naming non-compliant?               -> ISSUE
None of the above?                             -> RECOMMENDATION
```

## 6.3 Verdict Template

```markdown
## QUALITY REVIEW VERDICT: [APPROVED / FAILED]

| Phase | Issues | Recs |
|-------|--------|------|
| PRISM Naming | [N] | [N] |
| Type Contracts | [N] | [N] |
| Manufacturing Safety | [N] | [N] |
| 10 Commandments | [N] | [N] |
| **TOTAL** | **[N]** | **[N]** |

APPROVED -> SP.1.6 (debug) or SP.1.7 (verify)
FAILED -> Fix issues, re-review
```

## 6.4 Handoff

```json
{
  "from": "prism-sp-review-quality",
  "status": "QUALITY_APPROVED | QUALITY_FAILED",
  "issues": 0, "recommendations": 4,
  "deliverable": "[path]",
  "next": "prism-sp-verification | prism-sp-debugging | fix-then-re-review"
}
```

---

# SECTION 7: EXAMPLES

## 7.1 Cutting Force Engine -- APPROVED

```
Naming:  PASS - prism-calc dispatcher conventions
Types:   PASS - Measurement, APIResponse<T>, DataSource[]
Safety:  PASS - physics sanity limits on all outputs
10 Cmds: PASS #1(8 consumers), #3(triple), #7(fallbacks), #8(bounds)
         REC #4(learning hooks), #6(XAI)
VERDICT: APPROVED -- 0 Issues, 2 Recommendations
```

## 7.2 Material Lookup -- FAILED

```
Naming:  PASS
Types:   PASS
Safety:  ISSUE - getMaterial() no input validation; no DB fallback
10 Cmds: ISSUE #3(missing input layer), ISSUE #7(crash on DB failure)
VERDICT: FAILED -- 3 Issues
Fix: (1) input validation, (2) error handling with fallback
```

---

# SECTION 8: QUICK REFERENCE

```
PRISM-SP-REVIEW-QUALITY

PREREQ: Spec review APPROVED
PHASES: NAMING -> TYPES -> SAFETY -> 10 CMDS -> VERDICT
VERDICT: 0 Issues = APPROVED | 1+ Issues = FAILED

BLOCKING COMMANDMENTS: #1 Use Everywhere, #3 Verify Triple,
                       #7 Graceful, #8 Protect

PHYSICS SANITY LIMITS:
  cutting_force: 0-100kN    spindle_speed: 0-100kRPM
  feed_rate: 0-100mm/rev    depth_of_cut: 0-100mm
  temperature: -50-2000C    surface_roughness: 0-100um
  tool_life: 0-10000min     power: 0-500kW    torque: 0-50kNm
```

---

**Skill:** prism-sp-review-quality v2.0 (trimmed) | SP.1.5

---

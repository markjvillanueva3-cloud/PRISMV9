# PRISM ARCHITECTURE - CRITICAL ANALYSIS & IMPROVEMENTS
## Scrutinizing Current Design | v16.0 Proposal

---

## CURRENT STATE ISSUES

### ISSUE #1: CONSTANTS ARE NOT DATA

**Current:** Constants lumped with databases as "DB-CONST-*"

**Problem:**
- Constants are IMMUTABLE REFERENCE VALUES (pi = 3.14159, c = 299792458 m/s)
- Databases are MUTABLE DATA STORES (material properties can be updated)
- Mixing them conflates fundamentally different concepts
- Constants should be FOUNDATIONAL - available to ALL layers without explicit wiring

**What Constants Really Are:**
- PHYSICAL: Speed of light, Planck's constant, gravitational constant
- MATHEMATICAL: pi, e, golden ratio, trigonometric identities
- ENGINEERING: Standard tolerances, safety factors, unit conversions
- MANUFACTURING: ISO standards, grade definitions, hardness scales
- PRISM: Quality thresholds (Omega >= 0.70, S >= 0.70), buffer zones

**Fix:** Constants should be a FOUNDATIONAL LAYER that ALL other layers inherit automatically.

---

### ISSUE #2: 245 ENGINES PER FORMULA IS BULK WIRING, NOT PRECISION

**Current:** Formula->Engine connections = 120,248 (avg 245.4 per formula)

**Problem:**
- The Kienzle formula (F-CUT-001) doesn't need 245 engines
- It probably needs: KIENZLE_ENGINE, FORCE_CALCULATOR, maybe 3-5 others
- 245 connections per formula = NOISE, not SIGNAL
- Makes runtime resolution expensive and confusing

**Real precision should be:**
- F-CUT-001 (Kienzle) -> 5-8 engines that actually implement/use it
- Not 245 connections each!

**Fix:** Need EXPLICIT, CURATED mappings. Target: 5-15 engines/formula MAX.

---

### ISSUE #3: MISSING TYPE/SCHEMA LAYER

**Current:** No formal type definitions between layers

**Problem:**
- What's the INPUT schema for F-CUT-001? (kc1.1, mc, h, b, ...)
- What's the OUTPUT schema? (Fc in Newtons)
- How do we validate data flows correctly?

**Example of what's missing:**
```typescript
interface KienzleInput {
  kc1_1: number;  // Specific cutting force [N/mm2]
  mc: number;     // Kienzle exponent [-]
  h: number;      // Uncut chip thickness [mm]
  b: number;      // Width of cut [mm]
}

interface KienzleOutput {
  Fc: number;     // Cutting force [N]
  Pc: number;     // Cutting power [kW]
}
```

**Fix:** Add TYPES/SCHEMAS layer defining input/output contracts for every component.

---

### ISSUE #4: MISSING INTERFACE/CONTRACT LAYER

**Current:** Wiring shows "A connects to B" but not HOW

**Problem:**
- What methods does ENGINE-KIENZLE expose?
- What events does it emit?
- What errors can it throw?
- What are the performance guarantees?

**Fix:** Add explicit API contracts for every engine.

---

### ISSUE #5: NO VALIDATION LAYER

**Current:** Validation is implicit/missing

**Problem - SAFETY CRITICAL:**
- Spindle speed must be > 0 and < machine max
- Feed rate must be within tool capability  
- Depth of cut must not exceed tool strength
- These are LIFE-SAFETY constraints!

**Fix:** Add VALIDATORS layer between every layer transition.

---

### ISSUE #6: FLAT CATEGORY STRUCTURE

**Current:** 27 formula categories at same level (CUTTING, THERMAL, AI_ML, ...)

**Problem:**
- "CUTTING" is a domain category
- "AI_ML" is a methodology category
- "PRISM_META" is a system category
- These are NOT the same type of thing!

**Better structure:**
```
FORMULAS/
  DOMAIN/
    CUTTING/
      FORCE/ (Kienzle, Merchant, Oxley)
      POWER/
      MRR/
    THERMAL/
    VIBRATION/
  METHODOLOGY/
    PHYSICS_BASED/
    EMPIRICAL/
    AI_ML/
    HYBRID/
  SYSTEM/
    QUALITY/
    ECONOMICS/
    META/
```

**Fix:** Implement hierarchical categorization within each layer.

---

### ISSUE #7: MISSING TRANSFORMER LAYER

**Current:** Data flows between layers but no explicit transformation

**Problem:**
- Database stores material in format A
- Formula expects input in format B
- Who converts A -> B? When? With what precision?

**Example:**
- Database: { hardness_brinell: 200, units: "HB" }
- Formula needs: { hardness_vickers: ???, units: "HV" }

**Fix:** Add TRANSFORMERS that explicitly handle data conversion.

---

### ISSUE #8: MISSING CROSS-CUTTING CONCERNS

**Current:** No explicit handling of:
- LOGGING
- METRICS
- CACHING
- EVENTS
- ERRORS
- AUTH
- AUDIT

**For SAFETY-CRITICAL manufacturing:**
- Every calculation should be LOGGED
- Every parameter should be TRACEABLE
- Every decision should be AUDITABLE
- Failure should NEVER be silent

**Fix:** Add cross-cutting infrastructure.

---

### ISSUE #9: NO VERSIONING STRATEGY

**Current:** Resources have versions but no compatibility strategy

**Problem:**
- Formula F-CUT-001 v1.0 changes to v2.0
- What happens to engines that depend on v1.0?
- How do we migrate without breaking things?

**Fix:** Implement semantic versioning with compatibility matrix.

---

### ISSUE #10: 666K CONNECTIONS = PERFORMANCE CONCERN

**Current:** 666,657 connections in a single JSON file

**Problem:**
- Loading 23MB JSON on every request
- Traversing 666K edges for resolution
- Most connections never used in single operation

**Fix:** Partition by product, lazy loading, caching, indexes.

---

## PROPOSED IMPROVED ARCHITECTURE (v16.0)

```
FOUNDATION (Always available, implicit inheritance):
  CONSTANTS     Physical, mathematical, engineering, PRISM thresholds
  TYPES         TypeScript interfaces, JSON schemas
  VALIDATORS    Input/output validation rules

LAYER -1: DATABASES (Hierarchical within each domain)
  MATERIALS/
    P_STEELS/
      CARBON/
      ALLOY/
      TOOL/
    M_STAINLESS/
    K_CAST/
    N_NONFERROUS/
    S_SUPERALLOY/
    H_HARDENED/
    X_SPECIALTY/
  MACHINES/
    BY_TYPE/
      MILL_3AXIS/
      MILL_5AXIS/
      LATHE/
      TURNING_CENTER/
      SWISS/
      MULTITASK/
    BY_MANUFACTURER/
      DMG_MORI/
      MAZAK/
      HAAS/
      ...
  TOOLS/
    BY_TYPE/
      ENDMILL/
      INSERT/
      DRILL/
      TAP/
    BY_OPERATION/
      ROUGHING/
      FINISHING/
      THREADING/
  CONTROLLERS/
    BY_FAMILY/
      FANUC/
      SIEMENS/
      HAAS/
      ...
  ALARMS/
  GCODES/
  WORKHOLDING/
  CATALOGS/
  KNOWLEDGE/

LAYER 0: TRANSFORMERS
  Database format -> Formula input conversions
  Unit conversions
  Schema mappings

LAYER 1: FORMULAS (Hierarchical categories)
  DOMAIN/
    CUTTING/
      FORCE/ (F-CUT-001 to F-CUT-010)
      POWER/ (F-CUT-011 to F-CUT-015)
      MRR/   (F-CUT-016 to F-CUT-020)
    THERMAL/
      GENERATION/
      DISTRIBUTION/
      MANAGEMENT/
    VIBRATION/
      CHATTER/
      STABILITY/
      FRF/
    WEAR/
      TAYLOR/
      USUI/
      ABRASIVE/
    SURFACE/
      ROUGHNESS/
      STRESS/
      INTEGRITY/
  METHODOLOGY/
    PHYSICS_BASED/
    EMPIRICAL/
    AI_ML/
    HYBRID/
  SYSTEM/
    QUALITY/
    ECONOMICS/
    META/

LAYER 2: INTERFACES
  API contracts for each engine
  Method signatures
  Event definitions
  Error specifications

LAYER 3: ENGINES (PRECISE wiring - 5-15 connections each)
  PHYSICS/
    FORCE_CALCULATION/
    THERMAL_MODELING/
    VIBRATION_ANALYSIS/
    WEAR_PREDICTION/
  AI_ML/
    OPTIMIZATION/
    PREDICTION/
    LEARNING/
  CAM/
    TOOLPATH/
    FEEDS_SPEEDS/
    STRATEGIES/
  CAD/
    GEOMETRY/
    FEATURES/
    ANALYSIS/

LAYER 4: ORCHESTRATORS
  Workflow coordination
  Multi-engine composition
  Decision trees

LAYER 5: SKILLS
  High-level capabilities
  User-facing operations

LAYER 6: SERVICES
  Business logic
  Use cases
  Domain services

LAYER 7: PRODUCTS
  SPEED_FEED_CALCULATOR
  POST_PROCESSOR
  SHOP_MANAGER
  AUTO_CNC_PROGRAMMER

CROSS-CUTTING (Aspects applied via decorators/middleware):
  @Logged       - Structured logging
  @Cached       - Performance caching
  @Validated    - Input/output validation
  @Audited      - Safety-critical audit trail
  @Metered      - Performance metrics
  @Versioned    - Compatibility management
  @Authorized   - Access control
```

---

## PRECISION WIRING TARGETS

Instead of 245 engines/formula, target PRECISE connections:

| Formula Type | Target Connections | Example |
|--------------|-------------------|---------|
| FORCE formulas | 5-8 engines | Kienzle -> ForceEngine, PowerEngine, SafetyEngine |
| THERMAL formulas | 4-6 engines | HeatGen -> ThermalEngine, CoolantEngine |
| WEAR formulas | 5-7 engines | Taylor -> WearEngine, ToolLifeEngine |
| AI/ML formulas | 8-12 engines | Neural -> PredictionEngine, OptEngine |
| META formulas | 10-15 engines | Omega -> QualityEngine, all validators |

**Result:** ~5,000-8,000 total F->E connections instead of 120,248

---

## CONSTANTS FOUNDATION

```typescript
// PRISM_CONSTANTS - Foundation Layer (always available)
export const CONSTANTS = {
  // Physical
  SPEED_OF_LIGHT: 299792458,        // m/s
  PLANCK: 6.62607015e-34,           // J*s
  BOLTZMANN: 1.380649e-23,          // J/K
  
  // Mathematical
  PI: Math.PI,
  E: Math.E,
  GOLDEN_RATIO: 1.618033988749895,
  
  // Engineering
  GRAVITY: 9.80665,                 // m/s2
  ATM: 101325,                      // Pa
  
  // Manufacturing
  ISO_TOLERANCE_GRADES: {...},
  HARDNESS_CONVERSION: {...},
  SURFACE_FINISH_GRADES: {...},
  
  // PRISM Thresholds
  OMEGA_MIN: 0.70,                  // Quality threshold
  SAFETY_MIN: 0.70,                 // Hard block
  REASONING_MIN: 0.60,
  CODE_MIN: 0.70,
  PROCESS_MIN: 0.60,
  
  // Buffer Zones
  BUFFER_GREEN: 8,
  BUFFER_YELLOW: 14,
  BUFFER_RED: 18,
  BUFFER_BLACK: 19,
};
```

---

## IMPLEMENTATION PRIORITY

**Phase 1 - Critical (Safety):**
1. Extract CONSTANTS to foundational layer
2. Add VALIDATORS at layer boundaries
3. Implement TYPES/SCHEMAS for all data flows
4. Reduce wiring precision to 5-15/formula

**Phase 2 - Important (Quality):**
5. Add INTERFACES/CONTRACTS
6. Implement hierarchical categorization
7. Add TRANSFORMERS
8. Implement versioning

**Phase 3 - Performance:**
9. Partition wiring by product
10. Implement lazy loading
11. Add caching layer
12. Build query indexes

**Phase 4 - Operations:**
13. Structured logging
14. Metrics collection
15. Audit trail
16. Error handling framework

---

## DECISION: WORTH THE EFFORT?

**YES, because:**

1. **Safety-Critical:** PRISM controls CNC machines. Sloppy architecture = potential injury.

2. **Maintainability:** 666K bulk connections are unmaintainable. Precise wiring is auditable.

3. **Performance:** 23MB JSON load vs lazy-loaded partitioned data = real difference.

4. **Correctness:** Types + Validators + Contracts = provably correct data flow.

5. **Debugging:** When something fails, hierarchical + precise = findable root cause.

**The current architecture works but is FRAGILE. The improved architecture is ROBUST.**

---

## NEXT STEPS

1. Create CONSTANTS foundation layer
2. Build TYPE definitions for all formulas
3. Create PRECISE wiring (5-15/formula) replacing bulk wiring
4. Add VALIDATORS at boundaries
5. Implement hierarchical categorization
6. Test with real calculations

---

**Analysis Date:** 2026-02-01
**Conclusion:** Current architecture functional but needs refinement for production-grade safety-critical system.

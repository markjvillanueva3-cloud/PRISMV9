# CAMX ROADMAP v22 — Content Quality Fixes
## Conflicting Data | Missing Wiring Specs | Missing Code Review | Missing Step-by-Step

---

## CRITICAL FINDING 1: Conflicting Physics Constants

9 files implement Kienzle force computation with DIFFERENT kc1.1 values:

| Engine | ISO P (Steel) | ISO M (Stainless) | SOURCE |
|---|---|---|---|
| physics/constants.ts | 1800 | 2100 | **CANONICAL (Sandvik validated)** |
| PrintToProgramPipelineEngine | **2000** | **2400** | WRONG — 11-14% high |
| SpeedFeedOrchestratorEngine | 1800 | 2100 | Correct (matches canonical) |
| KienzleForceModelEngine | 2100 (4140) | — | Alloy-specific (correct for 4140) |
| PostPhysicsFoundationEngine | (imports canonical) | — | Correct |
| OptimalStrategySelectionEngine | (own DB) | — | May differ |
| StrategyBenchmarkEngine | (own DB) | — | May differ |
| PipelineSafetyOrchestratorEngine | (own DB) | — | May differ |

### FIX: Single Source of Truth for Physics Constants

```
U-CONST1: Eliminate ALL inline physics constant databases

RULE: Every engine that needs kc1.1, mc, Taylor C/n, or ANY physics constant
MUST import from src/physics/constants.ts — the ONE canonical source.

STEPS:
  1. In PrintToProgramPipelineEngine.ts:
     DELETE lines 399-407 (inline KIENZLE_DB with wrong values)
     REPLACE with: import { CANONICAL_KIENZLE } from "../physics/constants.js"

  2. In SpeedFeedOrchestratorEngine.ts:
     Lines 363-500 contain an inline MATERIAL_DB with kc1.1 values.
     These HAPPEN to match canonical for ISO groups but have ADDITIONAL
     alloy-specific entries. KEEP alloy-specific entries but VALIDATE
     they don't contradict canonical ISO group values.

  3. In OptimalStrategySelectionEngine.ts:
     CHECK if it has its own kc1.1 values. If yes → replace with canonical import.

  4. In StrategyBenchmarkEngine.ts:
     Same check and fix.

  5. In PipelineSafetyOrchestratorEngine.ts:
     Same check and fix.

  6. Create a UNIT TEST that verifies:
     "For ISO P steel, Kienzle kc1.1 is 1800 ±50 in EVERY engine that uses it"
     This test runs against ALL 9 engines. If ANY disagrees → test FAILS.

EXIT: ONE source of truth. Zero conflicting constants. Regression test prevents drift.
```

### Duplicate Calculation Prevention

```
U-CONST2: Prevent force being computed multiple times in the same pipeline run

PROBLEM: A part going through PrintToProgram → SpeedFeedOrchestrator →
PostPhysicsFoundation → PipelineSafety computes Fc FOUR TIMES.
Each computation may use slightly different inputs (different DOC, different
corrections) producing DIFFERENT force values. Which one is "real"?

FIX:
  1. Force is computed ONCE by the primary physics engine (KienzleForceModelEngine
     or the pipeline's own calculation)
  2. The result is STORED in a PhysicsResult object that travels through the pipeline
  3. Downstream engines READ the stored force, they don't RECOMPUTE it
  4. If a downstream engine needs to ADJUST force (e.g., for wear correction):
     adjusted_Fc = stored_Fc × wear_factor — clearly labeled as adjustment
  5. The output includes: original_Fc, adjustments[], final_Fc

PATTERN:
  Stage 8 (S/F Computation): Compute Fc using canonical Kienzle → store in result
  Stage 9 (Physics Validation): READ stored Fc, check against limits — DO NOT recompute
  Stage 10 (Collision/Safety): READ stored Fc for power/deflection checks — DO NOT recompute
  Stage 11 (Post-Processing): READ stored Fc for per-block S/F variation — DO NOT recompute

  IF Post-Processing needs to adjust Fc for wear progression:
    adjusted_Fc = result.Fc × (1 + 0.5 × VB/VB_max)
    Store as: { original_Fc: 2847, wear_factor: 1.08, adjusted_Fc: 3074 }

EXIT: Force computed ONCE per operation. Adjustments are explicit and traceable.
```

---

## CRITICAL FINDING 2: Per-Machine Roadmaps Lack Wiring Specifics

Current state: "Wire CollisionEngine into pipeline" — WHICH FILE? WHERE? HOW?

### FIX: Every Wiring Unit Must Follow This Template

```
WIRING UNIT TEMPLATE (mandatory for every unit that connects engines):

### U-XX: Wire [EngineName] into [PipelineName]

/smart: [model/effort]
FILES TO EDIT:
  - src/engines/[PipelineEngine].ts (line ~NNN, method: [methodName])

FILES TO READ FIRST:
  - src/engines/[EngineToWire].ts (understand its compute method signature)
  - src/engines/[PipelineEngine].ts (understand where to insert)

WIRING STEPS:
  1. ADD lazy-load at top of file:
     ```typescript
     let _engineName: any;
     function getEngineName() {
       if (_engineName === undefined) {
         try { _engineName = require("./EngineName.js").engineNameInstance; }
         catch { _engineName = null; }
       }
       return _engineName;
     }
     ```
  2. FIND: [exact method name or comment where to insert]
  3. INSERT: try/catch call to engine:
     ```typescript
     const eng = getEngineName();
     if (eng) {
       try {
         const result = eng.compute({ ... });
         // USE result: [describe what to do with result]
       } catch { /* fallback: [describe fallback behavior] */ }
     }
     ```
  4. FALLBACK: If engine unavailable → [describe exactly what happens]
  5. ADD to output: [describe what appears in pipeline output from this engine]

DISPATCHER WIRING (if new actions needed):
  - File: src/tools/dispatchers/[dispatcher].ts
  - Add to ACTIONS z.enum: "[action_name]"
  - Add case handler with lazy-load
  - Schema: src/schemas/[schema].ts

INDEX EXPORT:
  - File: src/engines/index.ts
  - Add: export { engineNameInstance, EngineName, type ...} from "./EngineName.js"
  - Check for duplicate type names → alias if needed

/prism-review AFTER this unit (all 3 agents)
BUILD: npx tsc --noEmit → 0 errors
TEST: npx vitest run [related test file] → 0 failures
```

---

## CRITICAL FINDING 3: Code Review Not in Per-Machine Milestones

Current state: 0 mentions of /prism-review in milling, 5-axis, or mill-turn roadmaps.

### FIX: Append to EVERY Per-Machine Roadmap

```
Add to the END of every per-machine roadmap file:

---

## CODE REVIEW PROTOCOL (applies to EVERY milestone)

See H:/prism/CAMX-CODE-REVIEW-PROTOCOL.md for full details.

AFTER EVERY UNIT that produces code:
  1. npx tsc --noEmit → 0 errors
  2. /prism-review (3 parallel agents: physics, wiring, test)
  3. npx vitest run [affected files] → 0 failures
  4. IF ANY fail → FIX before next unit

AT END OF EVERY SESSION:
  1. npx tsc --noEmit → verify build
  2. /prism-review → verify quality
  3. npx vitest run → verify no regressions
  4. git diff --stat → review changes
  5. /compact with review status

AT END OF EVERY MILESTONE:
  1. Run FULL test suite: npx vitest run
  2. Run /prism-review on ALL files changed in this milestone
  3. Verify WIRING CHECKLIST (see template above) for every wired engine
  4. Update golden snapshots if output format changed
```

---

## CRITICAL FINDING 4: Units Lack Step-by-Step Session Instructions

Many units say WHAT to do but not HOW to do it in a session.

### FIX: Every Unit Must Include Session Context

```
Add to every unit description:

SESSION INSTRUCTIONS:
  1. /smart: [model/effort/role for this unit]
  2. Read these files FIRST: [list of 2-4 specific files with paths]
  3. STEPS: [numbered list of specific actions]
  4. VERIFY: [what to check after building]
  5. TEST: [specific test to create or run]
  6. /prism-review
  7. /compact if end of session

This means the EXECUTOR (whether human or Claude) knows EXACTLY:
  - What context to load
  - What files to read
  - What to build/edit
  - How to verify
  - What to test
  - When to review
```

---

## CRITICAL FINDING 5: "Built but not used" Prevention

The roadmap must include VERIFICATION that built things are actually USED.

### FIX: Add Utilization Verification Units

```
At the END of each per-machine phase (4-10), add a verification unit:

U-VERIFY: Utilization Check for [Machine Type] Pipeline
  1. List every engine lazy-loaded in this pipeline → verify each is CALLED
  2. For each called engine → verify the RESULT is used (not computed and discarded)
  3. For each result → verify it appears in the OUTPUT (decision_log, physics, etc.)
  4. grep for "require(" in the pipeline file → count imports
  5. For each import → grep for actual call sites → if import but no call → FIX
  6. Run pipeline with a test part → inspect output:
     - Are all wired engines mentioned in decision_log?
     - Are physics values consistent (force computed once, not 4 times)?
     - Are tribal tips present?
     - Are playbook rules checked?
     - Is cost breakdown present?
  7. Compare output WITH wired engines vs WITHOUT → document the VALUE each engine adds

This PROVES the wiring is real, not just import statements.
```

---

## APPLY THESE FIXES TO EVERY ROADMAP FILE

The following files need the code review protocol and wiring template appended:

1. H:/prism/MILLING-COMPREHENSIVE-ROADMAP.md
2. H:/prism/FIVE-AXIS-COMPREHENSIVE-ROADMAP.md
3. H:/prism/MILL-TURN-COMPREHENSIVE-ROADMAP.md
4. H:/prism/GRINDING-COMPREHENSIVE-ROADMAP.md
5. H:/prism/WIRE-EDM-COMPREHENSIVE-ROADMAP.md
6. H:/prism/LASER-COMPREHENSIVE-ROADMAP.md
7. H:/prism/WATERJET-COMPREHENSIVE-ROADMAP.md
8. H:/prism/LATHE-COMPREHENSIVE-ROADMAP.md

Each file gets:
- Code review protocol reference at end of every milestone section
- Wiring template reference for every "wire X" unit
- Utilization verification unit at the end of each phase
- Constant consistency requirement (import from canonical source only)
- Duplicate calculation prevention (compute once, pass result forward)

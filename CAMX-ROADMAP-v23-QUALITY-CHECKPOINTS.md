# CAMX ROADMAP v23 — Domain-Specific Quality Checkpoints
## Replace generic "build + test" gates with REAL verification that code does what it's supposed to do

---

## THE PROBLEM WITH GENERIC QUALITY GATES

Current gates say: `/prism-review + build + test`
This verifies: "code compiles and tests pass"
This does NOT verify: "the collision detection actually catches collisions"

A gate that only checks compilation is USELESS for quality.
We need gates that CHECK THE OUTPUT with the RIGHT EXPERT ROLE.

---

## QUALITY CHECKPOINT PROTOCOL (replaces all generic gates)

Every quality checkpoint must follow this structure:

```
QUALITY CHECKPOINT after [units]:
  ROLE: /smart [appropriate expert role for what was built]

  FUNCTIONAL VERIFICATION (does it do what it's supposed to?):
    1. Create a test scenario that exercises the built functionality
    2. Run it through the system
    3. Verify the OUTPUT is correct (not just that it runs)
    4. Verify edge cases are handled
    5. Verify the output would be USEFUL to a real machinist

  WIRING VERIFICATION (is it connected and used?):
    1. Show the import line in the pipeline file
    2. Show the call site (where the engine method is invoked)
    3. Show where the result is used in the output
    4. Show the fallback behavior if engine unavailable
    5. IF NOT WIRED → wire it NOW, don't defer

  PHYSICS VERIFICATION (for physics-related units):
    1. Compute expected result analytically (by hand or known formula)
    2. Compare engine output to analytical result
    3. Must be within ±5% for force, ±10% for tool life, ±15% for Ra
    4. If outside bounds → FIX the formula, don't skip

  CONFLICT CHECK:
    1. Does this engine use constants from src/physics/constants.ts?
    2. Does any other engine compute the same thing differently?
    3. Is this result computed only ONCE in the pipeline?

  /prism-review with [specific role]:
    physics-reviewer for force/thermal/wear computations
    wiring-review-agent for dispatcher/schema connections
    test-review-agent for test quality (no keyword-only, no || true)

  /compact → new session → /roadmap-quality-check
```

---

## EXAMPLE CHECKPOINTS BY MILESTONE TYPE

### After Collision Avoidance Units (MS0):
```
QUALITY CHECKPOINT:
  ROLE: /smart CNC machine operator + safety engineer

  FUNCTIONAL:
    1. Create a part where tool holder WILL hit vise jaw at X=50 Y=30
    2. Run collision check → MUST detect collision, report exact XYZ location
    3. Create a SAFE part → MUST pass with "collision-free certified"
    4. Verify collision zones are machine-specific:
       - VMC: spindle head + holder vs fixture
       - Lathe: turret swing arc vs chuck jaw
       - 5-axis: head tilt vs table at extreme AB angle
    5. Verify collision report includes fix suggestion ("retract Z by 15mm" or "use shorter holder")

  WIRING:
    1. Show: CollisionPreventionEngine imported in pipeline (lazy-load line)
    2. Show: .checkFullToolpath() call site with stock+fixture+machine params
    3. Show: result used as GATE (program BLOCKED if collision detected)
    4. Show: fallback = WARNING only (not silent pass)
    5. IF NOT WIRED → wire it NOW in this session
```

### After Tool Selection Units (MS2):
```
QUALITY CHECKPOINT:
  ROLE: /smart tooling engineer + cost analyst

  FUNCTIONAL:
    1. Give it a 4140 steel pocket → does it select carbide endmill (not HSS)?
    2. Give it titanium → does it select AlCrN coating (not TiAlN)?
    3. Give it aluminum → does it select DLC or uncoated (not AlTiN)?
    4. Does it check user crib FIRST before recommending purchase?
    5. Does ToolROI show 3 price points with breakeven calculation?
    6. Does magazine optimization minimize tool changes?

  WIRING:
    1. Show: SmartToolSelectorEngine called (not synthetic tool generation)
    2. Show: ToolROIEngine called with result in output
    3. Show: InventoryAwareToolSelector called before catalog search
    4. Show: ToolMagazineOptimizationEngine called after tool list finalized
    5. IF ANY NOT WIRED → wire them NOW

  PHYSICS:
    1. For the selected tool, verify:
       - Kienzle force uses kc1.1 from canonical source (1800 for ISO P, not 2000)
       - Taylor life uses C/n from canonical source
       - Deflection uses correct tool diameter and stickout
```

### After S/F Computation Units (MS7 or equivalent):
```
QUALITY CHECKPOINT:
  ROLE: /smart cutting science engineer + Sandvik application specialist

  FUNCTIONAL:
    1. For 4140 steel + 12mm 4-flute carbide endmill:
       Verify Vc is 150-250 m/min (Sandvik range for ISO P)
       Verify fz is 0.08-0.20 mm/tooth
       Verify RPM = 1000×Vc/(π×D) calculated correctly
       Verify F (mm/min) = fz × z × RPM calculated correctly
    2. For Ti-6Al-4V:
       Verify Vc is 35-80 m/min (much lower than steel)
       Verify different tool coating selected (AlCrN not TiAlN)
    3. For 6061 Al:
       Verify Vc is 300-600 m/min (much higher than steel)
       Verify DLC coating or uncoated
    4. Per-block S/F variation:
       Verify F CHANGES between blocks (not constant per tool)
       Verify F REDUCES at corners (chip thinning compensation)

  WIRING:
    1. Show: UltimateSpeedFeedEngine or SpeedFeedOrchestratorEngine called
    2. Show: constants from src/physics/constants.ts (not inline DB)
    3. Show: result feeds into G-code generation (F values in output)
    4. Show: per-block optimization via AutoSpeedFeedEngine or PostProcessorPipeline

  PHYSICS (compare to published data):
    1. Sandvik Coromant catalog for CNMG 120408 in 4140:
       Vc should be 200-280 m/min → PRISM within ±15%?
    2. Kennametal catalog for same:
       Should be within ±15% of their recommendation too
    3. If PRISM is >15% off → check which constant is wrong

  CONFLICT CHECK:
    1. Is force computed by PrintToProgram (inline) AND SpeedFeedOrchestrator (separate)?
    2. If yes → are they using the SAME kc1.1 value?
    3. Is the force result passed forward or recomputed downstream?
```

### After Strategy Selection Units:
```
QUALITY CHECKPOINT:
  ROLE: /smart CAM programming expert + process planner

  FUNCTIONAL:
    1. Give it a simple rectangular pocket in aluminum:
       → Should it pick adaptive clearing or simple zigzag?
       → On a Haas VF-2 (80-block look-ahead): zigzag may be BETTER
       → On a Makino a51nx: adaptive is fine
       → Verify machine capability influences strategy choice
    2. Give it a thin-wall pocket in titanium:
       → Must pick trochoidal or low-engagement strategy
       → Must NOT pick conventional zigzag (wall will deflect)
    3. Verify ≥3 strategies evaluated with physics scoring
    4. Verify tribal tips consulted (relevant tips in justification)
    5. Verify cost comparison present (simple vs advanced options)

  WIRING:
    1. Show: OptimalStrategySelectionEngine called
    2. Show: ToolpathStrategyRegistry queried (752 strategies, not 28-entry private DB)
    3. Show: MachiningPlaybookEngine checked (296 rules)
    4. Show: result includes justification[] with alternatives
```

### After G-code Generation Units:
```
QUALITY CHECKPOINT:
  ROLE: /smart CNC programmer + machine operator (for target controller)

  FUNCTIONAL:
    1. Load the generated G-code in a G-code viewer/simulator
    2. Verify: safe start block correct for THIS controller
    3. Verify: tool changes in correct sequence
    4. Verify: coordinates match part dimensions from input
    5. Verify: canned cycles use correct syntax for THIS controller
       (G83 for Fanuc, CYCLE83 for Siemens, CYCL DEF 200 for Heidenhain)
    6. Verify: program ends safely (G28, M05, M09, M30)
    7. Could a machinist ACTUALLY load this on a machine and cut a part?

  COORDINATE ACCURACY:
    1. Parse G-code, extract all X/Y/Z values
    2. Compare to input feature dimensions
    3. Every coordinate within ±0.01mm of intended position

  WIRING:
    1. Show: PostProcessorPipelineEngine (POST-ULT) ran as final pass
    2. Show: ControllerDialectEngine selected correct dialect
    3. Show: per-block F variation present (not constant F per tool)
```

### After Testing Units:
```
QUALITY CHECKPOINT:
  ROLE: /smart QA engineer + manufacturing domain expert

  FUNCTIONAL:
    1. Run the test suite → all pass?
    2. For EACH test: does it validate CORRECTNESS or just EXISTENCE?
       - BAD: p.includes("G71") → only checks keyword present
       - GOOD: G71 U value matches calculated DOC from Kienzle force
    3. Are there negative tests? (bad input → graceful error?)
    4. Are there cross-material tests? (same part in 3+ materials → different output?)
    5. Are there cross-controller tests? (same program in 3+ dialects → different syntax?)

  TEST QUALITY:
    1. grep for "|| true" → MUST be ZERO
    2. grep for ".includes(" → each one justified (structural check OK, coordinate check NOT OK)
    3. Every test value traceable to real data source (drawing, catalog, handbook)
```

---

## HOW MANY CHECKPOINTS ARE NEEDED

Instead of 174 generic gates, we need ~50 DOMAIN-SPECIFIC checkpoints:

| Phase | Checkpoints | Expert Role |
|---|---|---|
| Phase 0 (foundation) | 8 | Pipeline architect + safety engineer |
| Phase 1 (knowledge wiring) | 5 | Knowledge engineer + machinist |
| Phase 2 (business logic) | 3 | Process planner + cost analyst |
| Phase 3 (Level 3 decisions) | 4 | CAM programmer + cutting scientist |
| Per machine type (×8) | 4 each = 32 | Machine-specific CNC programmer |
| **Total** | **~52** | |

FEWER but BETTER checkpoints. Each one verifies the OUTPUT is correct,
not just that the code compiles.

---

## THE KEY RULE

```
AFTER BUILDING ANYTHING:
  1. SWITCH to the appropriate expert ROLE
  2. ASK: "Would a real machinist accept this output?"
  3. TEST: with a real scenario, not just compilation
  4. VERIFY WIRING: show import → call → result used
  5. WIRE NOW if not wired — don't defer to later phase
  6. CHECK CONSTANTS: match canonical source
  7. CHECK DUPLICATES: computed once, not multiple times

  ONLY THEN: /prism-review + /compact + new session
```

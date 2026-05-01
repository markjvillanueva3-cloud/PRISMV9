# CAMX ROADMAP v18 AMENDMENTS
## Fixes for ALL gaps found by Physics, Wiring, and Test Review Agents
## Applied to CAMX-FINAL-ROADMAP-v17.md

---

## AMENDMENT 1: Add 6 Missing Engines to Phase 1 (Wiring Review Finding)

Add to Phase 1 after U18 (Decision Architecture):

### U19: Wire AdaptiveToolpathRouterEngine (35 algorithms) into OptimalStrategySelection
```
/smart: OPUS/MAX | Role: toolpath architecture
FILES TO READ FIRST:
  - src/engines/AdaptiveToolpathRouterEngine.ts (35 algos, 30 priority rules)
  - src/engines/OptimalStrategySelectionEngine.ts (E1087)
  - src/engines/AlgorithmSelectorEngine.ts

STEPS:
  1. OptimalStrategySelection (E1087) currently has 28 strategies in STRATEGY_DB
  2. AdaptiveToolpathRouter has 35 algorithms in ALGORITHM_REGISTRY
  3. These OVERLAP but are NOT connected
  4. Wire: OptimalStrategySelection calls AdaptiveToolpathRouter.route()
     to get the specific algorithm + parameters for the selected strategy
  5. The flow becomes: OptimalStrategy picks strategy → AdaptiveRouter
     picks specific algorithm within that strategy → Router generates
     toolpath segment parameters
  6. Also wire AlgorithmSelectorEngine (used by FeatureToZoneEngine for
     per-zone algorithm selection)

EXIT CRITERIA:
  ✓ OptimalStrategy → AdaptiveRouter chain works
  ✓ 35 algorithms reachable through the chain
  ✓ Per-zone algorithm selection works for complex features
  ✓ vitest passes
  ✓ /prism-review passes
```

### U20: Wire ProductionToolpathEngine into milling pipeline
```
/smart: OPUS/HIGH | Role: toolpath generation
FILES TO READ FIRST:
  - src/engines/ProductionToolpathEngine.ts (polygon offset HSM)

STEPS:
  1. ProductionToolpathEngine generates production-ready polygon-offset
     HSM toolpaths with G-code, cost estimate, and chatter-safe RPM
  2. Wire into PrintToProgramPipeline: for pocket features when strategy
     is "production_hsm" or machine has HSM capability
  3. Wire into UnifiedCAMPipeline: already partially connected but verify
  4. Create vitest

EXIT CRITERIA:
  ✓ ProductionToolpath called for HSM-capable pockets
  ✓ G-code output includes polygon-offset paths
```

### U21: Wire WorkCoordinateEngine + ProgramStructureEngine into ALL pipelines
```
/smart: OPUS/HIGH | Role: CNC programming
FILES TO READ FIRST:
  - src/engines/WorkCoordinateEngine.ts (G54-G59 assignment)
  - src/engines/ProgramStructureEngine.ts (subprograms, tool groups)

STEPS:
  1. Every program needs WCS assignment (currently hardcoded G54)
  2. Wire WorkCoordinateEngine: for single-setup → G54.
     Multi-setup → auto-assign G54-G59. Tombstone → G54.1 Pn.
  3. Wire ProgramStructureEngine: organize program into logical blocks,
     add subprogram calls (M98/CALL) for repeated patterns,
     add safety blocks per controller
  4. Create vitest: multi-setup part → G54 + G55 assigned correctly

EXIT CRITERIA:
  ✓ WCS auto-assigned per setup count
  ✓ Subprograms used for repeated patterns
  ✓ Program structure includes header/safety/body/footer per controller
```

### U22: Wire BackplotEngine as verification gate
```
/smart: OPUS/HIGH | Role: verification
FILES TO READ FIRST:
  - src/engines/BackplotEngine.ts
  - src/engines/CNCSimulationPipelineEngine.ts

STEPS:
  1. BackplotEngine is faster than full CNC simulation
  2. Wire as FIRST verification gate: backplot generated G-code,
     verify toolpath covers all features, no air cuts, no gouges
  3. If backplot fails → reject G-code before simulation
  4. Output backplot data for visualization (coordinates, tool paths)
  5. CNCSimulationPipeline remains as SECOND (deeper) verification gate

EXIT CRITERIA:
  ✓ Backplot runs before simulation
  ✓ Backplot data in output for visualization
  ✓ Backplot failure blocks output
```

---

## AMENDMENT 2: Fix ALL Bracket Placeholders (Wiring Review Finding)

Replace lines 323-329 in CAMX-FINAL-ROADMAP-v17.md:

### Decision Architecture U-DA1: Wire DecisionTreeEngine
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/engines/DecisionTreeEngine.ts (7 structured trees)
  - src/engines/PipelineDecisionOrchestratorEngine.ts (E1080)

STEPS:
  1. PipelineDecisionOrchestrator.decide() currently scores candidates
  2. ADD: before final selection, trace through DecisionTreeEngine
     for the matching category (tool_select → tool decision tree,
     strategy_select → strategy decision tree, etc.)
  3. DecisionTree returns reasoning[] — step-by-step logic path
  4. Include reasoning[] in the decision output justification
  5. This gives EVERY decision a traceable logic path, not just a score

EXIT CRITERIA:
  ✓ reasoning[] appears in decision output
  ✓ Reasoning has ≥3 steps for complex decisions
```

### Decision Architecture U-DA2: Wire InferenceChainEngine
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/engines/InferenceChainEngine.ts (multi-step reasoning)

STEPS:
  1. For complex decisions (multi-setup planning, process routing):
     Call InferenceChain.analyzeAndRecommend() with full context
  2. Chain produces intermediate conclusions leading to final recommendation
  3. Add to PipelineDecisionOrchestrator for complex decision categories

EXIT CRITERIA:
  ✓ Multi-step reasoning for complex decisions
  ✓ Intermediate conclusions visible in output
```

### [Continue for U-DA3 through U-DA8 — XAI, 17 optimization engines, 6 prediction engines, simulation gate, convex optimization, fuzzy logic]

### Knowledge Wiring U-KW1: Manufacturer S/F data
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/data/guhring-iscar-speed-feed-data.ts
  - src/data/helical-speed-feed-data.ts
  - src/data/osg-speed-feed-data.ts
  - src/data/manufacturer-speed-feed-data.ts
  - src/engines/UltimateSpeedFeedEngine.ts

STEPS:
  1. UltimateSpeedFeedEngine has inline ISO-group speed tables
  2. We have 2,423 lines of manufacturer-SPECIFIC speed/feed data
  3. When a tool's manufacturer is known (e.g., Sandvik CNMG 120408):
     Look up brand-specific Vc/fz instead of generic ISO table
  4. Lazy-load manufacturer data files
  5. Fallback to ISO tables when brand unknown

EXIT CRITERIA:
  ✓ Known-brand tools get brand-specific S/F
  ✓ Unknown brands get ISO table (no regression)
  ✓ vitest: Sandvik 4140 → specific Vc, generic 4140 → ISO Vc
```

### [Continue for U-KW2 through U-KW6 — KB functions, controller knowledge, academy courses, hyperMILL materials, POST-ULT pipeline with SPECIFIC insertion points per pipeline]

---

## AMENDMENT 3: Add POST-ULT Wiring Specifics (Wiring Review Finding)

Replace vague U08 with specific per-pipeline wiring:

### U08a: Wire POST-ULT into PrintToProgramPipelineEngine
```
STEPS:
  1. FIND: the point in generateProgram() where program_text is assembled
     (after all operations have G-code, before output)
  2. INSERT: lazy-load PostPhysicsFoundationEngine
  3. CALL: postPhysics.resolve({
       gcode: program_text,
       material: materialCallout,
       tools: selectedTools,
       machine: machineProfile,
       controller: controllerType
     })
  4. CHAIN: result through LineByLineAdaptiveEngine.optimize()
     → MotionControllerInjectionEngine.inject()
     → PostVerificationSafetyEngine.verify()
     → PostOutputGenerationEngine.format()
  5. REPLACE: program_text with chain output
  6. FALLBACK: if any engine unavailable, keep original program_text
```

### U08b: Wire POST-ULT into TurningPrintToProgramEngine
```
STEPS:
  1. FIND: end of generateGCode() where program_text is joined
  2. Same chain as U08a but with turning-specific context:
     - G18 plane (not G17)
     - CSS awareness (G96/G97 handled by LineByLine)
     - Threading sections marked as DO-NOT-OPTIMIZE (G76 parameters are sacred)
  3. LineByLineAdaptive must NOT modify F values inside G76 threading blocks
  4. FALLBACK: keep original if unavailable
```

### U08c-U08i: Same for remaining 7 pipelines (5-Axis, Mill-Turn, Grinding, Wire EDM, Sinker EDM, Laser, Waterjet)
Each with process-specific considerations (G93 for 5-axis, EDM power settings, laser power commands, etc.)

---

## AMENDMENT 4: Add Test Infrastructure Phase (Test Review Finding)

### Add Phase 0-C: Test Infrastructure Hardening (BEFORE any building)

### U-TEST1: Audit and fix ALL `|| true` and keyword-only assertions
```
/smart: OPUS/HIGH | Role: test quality engineer
STEPS:
  1. grep -rn "|| true" tests/ src/__tests__/ → list every always-pass assertion
  2. grep -rn "\.includes(" tests/ src/__tests__/ → list every keyword-only check
  3. For EACH || true: replace with actual parametric check or remove
  4. For EACH .includes(): determine if it should be:
     a. Coordinate check (parse G-code, extract X/Y/Z values, compare to input dims)
     b. Parameter check (extract S/F values, compare to physics computation)
     c. Structural check (verify block ordering, P/Q matching) — these CAN stay as includes
  5. Create a test utility: parseGCode(text) → { blocks[], tools[], coordinates[], params[] }
     This utility makes parametric assertions EASY for all future tests

EXIT CRITERIA:
  ✓ ZERO || true in any test file
  ✓ ≥50% of .includes() upgraded to parametric checks
  ✓ parseGCode() utility created and tested
```

### U-TEST2: Define 14-stage pipeline validation matrix
```
/smart: OPUS/MAX | Role: pipeline architect + test engineer
STEPS:
  1. Create src/__tests__/helpers/pipeline-stage-validator.ts
  2. Define 14 stages with input/output types and validation functions:
     Stage 1: OCR → dims (accuracy ±0.1mm)
     Stage 2: Feature Recognition → feature list (types correct)
     Stage 3: Material Resolution → ISO + properties (kc1.1 ±5% of Sandvik)
     Stage 4: Machine Selection → machine + justification (capability match)
     Stage 5: Strategy Selection → strategy + alternatives (≥3 scored)
     Stage 6: Tool Selection → tool list (exists in catalog, grade matches ISO)
     Stage 7: S/F Calculation → Vc,fz,ap,ae (±15% of manufacturer data)
     Stage 8: Toolpath Generation → move sequence (no gouge, covers geometry)
     Stage 9: Physics Validation → force,power,Ra (force < machine capacity)
     Stage 10: Collision Check → pass/fail (0 collisions)
     Stage 11: Post-Processing → G-code (valid syntax per controller)
     Stage 12: Simulation → verified (stock removed correctly)
     Stage 13: Cycle Time → estimate (±20% of manual calculation)
     Stage 14: Documentation → setup sheet (complete tool list + offsets)
  3. Each stage validator can be called independently
  4. Pipeline test harness chains all 14 validators

EXIT CRITERIA:
  ✓ 14-stage validator created
  ✓ Each stage has typed input/output + validation function
  ✓ Pipeline harness chains all stages
```

### U-TEST3: Create cross-material S/F range tables
```
/smart: OPUS/MAX | Role: manufacturing domain expert
STEPS:
  1. Create src/__tests__/fixtures/material-sf-ranges.ts
  2. Define expected Vc/fz/ap ranges PER ISO group + specific alloys:
     ISO_P_1045:     { Vc_min: 180, Vc_max: 280, fz_min: 0.15, fz_max: 0.30 }
     ISO_P_4140_28:  { Vc_min: 150, Vc_max: 240, fz_min: 0.12, fz_max: 0.25 }
     ISO_P_4140_42:  { Vc_min: 80,  Vc_max: 150, fz_min: 0.08, fz_max: 0.18 }
     ISO_M_303:      { Vc_min: 120, Vc_max: 200, fz_min: 0.10, fz_max: 0.22 }
     ISO_M_316L:     { Vc_min: 100, Vc_max: 170, fz_min: 0.08, fz_max: 0.20 }
     ISO_K_gray:     { Vc_min: 150, Vc_max: 300, fz_min: 0.15, fz_max: 0.30 }
     ISO_N_6061:     { Vc_min: 300, Vc_max: 600, fz_min: 0.15, fz_max: 0.35 }
     ISO_N_7075:     { Vc_min: 250, Vc_max: 500, fz_min: 0.12, fz_max: 0.30 }
     ISO_S_Ti6Al4V:  { Vc_min: 35,  Vc_max: 80,  fz_min: 0.06, fz_max: 0.15 }
     ISO_S_IN718:    { Vc_min: 15,  Vc_max: 45,  fz_min: 0.04, fz_max: 0.12 }
     ISO_H_D2_62:    { Vc_min: 50,  Vc_max: 120, fz_min: 0.04, fz_max: 0.10 }
  3. Source: Sandvik Coromant General Turning catalog + Kennametal NOVO
  4. Every cross-material test asserts output falls within these ranges

EXIT CRITERIA:
  ✓ Range table covers all 6 ISO groups + 15+ specific alloys
  ✓ Ranges traceable to published manufacturer data
  ✓ Test helper: assertSFInRange(result, material) function created
```

### U-TEST4: Create controller dialect assertion library
```
/smart: OPUS/HIGH | Role: CNC controller specialist
STEPS:
  1. Create src/__tests__/helpers/controller-assertions.ts
  2. Per-controller assertion helpers:
     assertFanucPeckDrill(gcode, {depth, peck, retract, feed})
       → verifies "G83 Z{depth} Q{peck*1000} R{retract} F{feed}"
     assertSiemensCycle83(gcode, {depth, peck, retract, feed})
       → verifies "CYCLE83({retract},{rfp},{sdis},{depth},,,{feed},,,)"
     assertHeidenhainCycl200(gcode, {depth, peck, feed})
       → verifies "CYCL DEF 200 DRILLING\nQ200={retract} Q201={depth} Q206={feed*1000}"
     assertHaasPeckDrill(gcode, {depth, peck, retract, feed})
       → verifies "G83 Z{depth} Q{peck} R{retract} F{feed}" (Haas Q in mm, not microns)
     assertMazakPeckDrill(gcode, {depth, peck, retract, feed})
       → verifies Mazak-specific syntax
  3. Similar helpers for: tool change, safe start, HSM mode, cutter comp,
     threading cycle, probing cycle — per controller family

EXIT CRITERIA:
  ✓ Assertion library covers 6 controller families
  ✓ 10+ operation types per controller
  ✓ Used by all subsequent cross-controller tests
```

### U-TEST5: Create negative/error input test battery
```
/smart: OPUS/HIGH | Role: QA engineer
STEPS:
  1. Create src/__tests__/negative-input-battery.test.ts
  2. 50+ negative test cases:
     MATERIAL:
       - Unrecognized material name → graceful fallback with warning
       - Empty material → error with clear message
       - Hardness outside valid range (0 HRC, 100 HRC) → clamped with warning
     DIMENSIONS:
       - Negative dimensions → rejected with error
       - Zero-length features → rejected
       - Bore diameter > OD → rejected (physics impossible)
       - Pocket deeper than stock thickness → rejected
     MACHINE:
       - RPM exceeds machine max → clamped with warning
       - Power exceeds capacity → auto-reduced with warning
       - Travel exceeds envelope → rejected
     TOOL:
       - Tool diameter > pocket width → rejected
       - Tool too short for feature depth → rejected with tool recommendation
       - No suitable tool in catalog → clear error with recommendation
     TOLERANCE:
       - Tolerance tighter than machine capability → warning with Cpk prediction
       - Tolerance = 0 → rejected
     FEATURES:
       - Empty feature list → error
       - Conflicting features (pocket inside a hole) → warning
       - Unsupported feature type → graceful skip with warning
  3. Every test verifies the error/warning is CLEAR and ACTIONABLE

EXIT CRITERIA:
  ✓ 50+ negative tests all pass
  ✓ Every error message is actionable (not just "invalid input")
  ✓ No crashes — all failures are graceful
```

### U-TEST6: Create parameter sanity guard
```
/smart: OPUS/HIGH | Role: manufacturing domain expert
STEPS:
  1. Create src/__tests__/helpers/parameter-sanity.ts
  2. Define physically impossible parameter ranges:
     feed_per_rev_max_mm: 5.0 (anything above snaps the tool)
     Vc_steel_max_m_min: 500 (anything above is unrealistic for steel)
     Vc_aluminum_max_m_min: 3000 (PCD absolute max)
     ap_max_factor: 3.0 (ap > 3×D is physically impossible)
     ae_max_factor: 1.0 (ae > D is impossible)
     G83_Q_max_mm: 50 (Q5000 = 5 meters is obviously wrong)
     G71_U_max_mm: 10 (DOC > 10mm in turning = unrealistic for most ops)
  3. Test that NO pipeline output EVER produces values outside these ranges
  4. This catches bugs like the 5-axis G83 Q5000 peck depth

EXIT CRITERIA:
  ✓ Sanity guard catches Q5000 and similar bugs
  ✓ Applied to all 9 pipeline outputs
  ✓ Zero violations in any test
```

---

## AMENDMENT 5: Add Process-Specific Physics (Physics Review)

Add to Phase 3 (Level 3 decisions):

### U-PHYS1: Thread milling force model
```
Thread milling has DIFFERENT force components than standard milling:
  - Radial force from helical path
  - Axial force from thread pitch engagement
  - Variable engagement angle around the helix
Wire into ThreadingPipelineEngine and TurningPrintToProgramEngine
```

### U-PHYS2: Helical interpolation force model
```
During helical bore milling (G2/G3 with Z):
  - Effective diameter changes along helix
  - Chip thickness varies with helix angle
Wire into PrintToProgramPipeline for helical entry strategy
```

### U-PHYS3: Plunge milling force model
```
Plunge milling forces are primarily AXIAL (not radial):
  - Different from peripheral milling physics
  - Spindle thrust capacity is the limit, not torque
Wire into PrintToProgramPipeline for deep cavity roughing option
```

### U-PHYS4: Hard milling dynamics — process damping
```
At low cutting speeds in hard materials (ISO H):
  - Process damping STABILIZES the cut (opposite of normal chatter behavior)
  - Optimal speed may be BELOW the stability lobe minimum
  - This is why HSM works in hardened steel at specific speed ranges
Wire into ChatterStabilityLobeEngine + OptimalStrategySelection for ISO H
```

---

## AMENDMENT 6: Specify WEDM Routing Fix Lines (Wiring Review Finding)

Replace vague P1/U09 with specific:

```
STEPS:
  1. In QuoteToShipOrchestratorEngine.ts:
     Line ~200: Replace 'EDMProgramAssemblerEngine' with 'EDMQualityOrchestratorEngine'
     Line ~1492: Same replacement
     The EDMQualityOrchestratorEngine.run_pipeline() is the 20-stage entry point
  2. In MultiProcessCAMBridgeEngine.ts:
     Lines 53-57: Replace wire_edm inline handler with lazy-load of EDMQualityOrchestratorEngine
     Lines 176-180: Same for sinker_edm handler
  3. The 20 stages are:
     Drawing → Feasibility → Material/Machine/Wire → Start Holes → Setup
     → Toolpath → Multi-Pass → Parameters → Flushing → Wire/Slug
     → Corner/Taper → Monitoring → Surface Integrity → Post-Process
     → G-Code → Cost → Documentation → Quality → Learning
  4. For SINKER EDM: same orchestrator but uses sinker-specific stages
     (electrode design → orbiting → jump cycle instead of wire-specific stages)
```

---

## AMENDMENT 7: Golden Snapshots During Development (Test Review Finding)

Add to EVERY phase (5-11) that produces correct pipeline output:

```
RULE: When a pipeline generates correct output for a new machine type/part:
  1. Save the generated G-code as a golden snapshot:
     tests/golden-snapshots/{machine-type}/{part-name}.gcode
  2. Save the input that produced it:
     tests/golden-snapshots/{machine-type}/{part-name}.input.json
  3. Create a vitest that loads the input, runs the pipeline,
     and compares output to the golden snapshot
  4. Any future change that alters the output will FAIL this test
     → developer must review and update snapshot if change is intentional
```

---

## UPDATED UNIT COUNT

| Phase | v17 Units | v18 Additions | v18 Total |
|---|---|---|---|
| Phase 0-A: Print Reading | 6 | 0 | 6 |
| Phase 0-B: Bug Fixes | 7 | 0 | 7 |
| **Phase 0-C: Test Infrastructure** | **0** | **6** | **6** |
| Phase 1: Knowledge + Decisions | 18 | 4 (new engine wiring) | 22 |
| Phase 2: Business Logic | 5 | 0 | 5 |
| Phase 3: Level 3 Decisions | 12 | 4 (process physics) | 16 |
| Phases 4-10: Per-Machine | ~600 | 0 | ~600 |
| Phase 11: Testing | 15 | golden snapshots throughout | 15 |
| Phase 12: Final Wiring | 6 | 0 | 6 |
| **TOTAL** | **~950** | **~14** | **~964** |

---

## SCRUTINY RESOLUTION CHECKLIST

| Finding | Amendment | Status |
|---|---|---|
| 6 engines missing from roadmap | Amendment 1: U19-U22 | FIXED |
| Bracket placeholders in .md | Amendment 2: Expanded with step-by-step | FIXED |
| POST-ULT wiring too vague | Amendment 3: Per-pipeline specifics | FIXED |
| `|| true` anti-patterns | Amendment 4: U-TEST1 | FIXED |
| No negative/error tests | Amendment 4: U-TEST5 | FIXED |
| No pipeline stage validation | Amendment 4: U-TEST2 | FIXED |
| No cross-material ranges | Amendment 4: U-TEST3 | FIXED |
| No controller dialect assertions | Amendment 4: U-TEST4 | FIXED |
| No parameter sanity guard | Amendment 4: U-TEST6 | FIXED |
| Golden snapshots deferred too late | Amendment 7: During development | FIXED |
| Process-specific physics missing | Amendment 5: U-PHYS1-4 | FIXED |
| WEDM routing lines unspecified | Amendment 6: Exact lines given | FIXED |
| Test agent domain knowledge | U-TEST6 parameter sanity guard | FIXED |

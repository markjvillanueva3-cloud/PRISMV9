# F360-REV ROADMAP — Revised Fusion 360 Full Integration
## RGS Stages 2-5 Output | Generated 2026-04-03
## Based on 40-Agent Scrutiny (Avg Score: 43/100) + Gap Closure Audit (Loop 3)

---

### DESIGN PRINCIPLES
1. **Wire first, build second** — 60% wire / 40% build target
2. **Safety before features** — MS1 = safety hardening, no exceptions
3. **Respect Fusion API constraints** — 150ms MIN_OP_INTERVAL, no per-block calls, no executeCode()
4. **Pre-compute expensive physics** — SLD and thermal at tool-selection time, cache for per-block lookup
5. **PPP is the post-processor** — AutoProgram S10 must route through PostProcessorPipelineEngine, never bridge.postProcess()
6. **Constants canonical** — all kc1.1/mc/Taylor from physics/constants.ts, zero inline copies
7. **omega_floor = 1.0** for every milestone

### UNIT INVENTORY SUMMARY
- Total milestones: 12
- Total units: 58
- Wire units: 35 (60.3%)
- Build units: 18 (31.0%)
- Fix units: 5 (8.6%)
- Sessions: 22

---

## MILESTONE F360-REV-MS1: Safety Hardening & Fail-Close Enforcement
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: []
Brief: Eliminate all fail-open safety paths, consolidate SafetyVetoEngine to fail-close on exception, add face_mill priority 0 to TYPE_PRIORITY, and wire PipelineSafetyOrchestratorEngine as a mandatory gate in AutoProgramOrchestratorEngine. No feature work until safety chain is airtight.

### SESSION S1: Safety Fail-Close + TYPE_PRIORITY Fix (U-SAF01..U-SAF03)
SMART CONFIG: Role=safety_engineer + cnc_crash_investigator | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE: [SafetyVetoEngine, PipelineSafetyOrchestratorEngine, GCodeSafetyAnalyzerEngine, PostVerificationSafetyEngine, BatchCAMSafetyEngines, SafetyEscalationEngine, AutoProgramOrchestratorEngine]
INTENT: [Every safety validation path returns fail-close on exception. No G-code can be emitted without passing safety chain. TYPE_PRIORITY correctly orders face_mill as priority 0.]

WORK:
U-SAF01: Safety fail-close audit and enforcement (~200 LOC)
  - Wire/Build: FIX
  - Description: Audit all 9 safety engines for catch blocks that return {ok: true} or equivalent pass-through on error. Replace every fail-open path with fail-close: on exception, return {ok: false, reason: "safety_exception", error: e.message}. Add explicit test for each path.
  - FILES_CREATED: src/__tests__/safety-fail-close-audit.test.ts
  - FILES_MODIFIED: src/engines/SafetyVetoEngine.ts, src/engines/PipelineSafetyOrchestratorEngine.ts, src/engines/GCodeSafetyAnalyzerEngine.ts, src/engines/PostVerificationSafetyEngine.ts, src/engines/BatchCAMSafetyEngines.ts, src/engines/SafetyEscalationEngine.ts, src/engines/HyperMillSafetyHooks.ts, src/engines/MastercamSafetyHooksEngine.ts, src/engines/SolidCAMSafetyHooksEngine.ts
  - ABORT_CRITERIA: (1) Any safety engine still returns ok:true on catch after fix; (2) Test coverage of fail-close paths <100%; (3) tsc --noEmit has errors
  - ROLLBACK: git revert HEAD~1

U-SAF02: TYPE_PRIORITY face_mill priority 0 + validation hook (~80 LOC)
  - Wire/Build: FIX
  - Description: Add face_mill as priority 0 in TYPE_PRIORITY constant (drill stays at 1). Add a Zod runtime assertion that TYPE_PRIORITY[0] === "face_mill" in the AutoProgram pre-flight check. This ensures face operations always run before drill operations in multi-op setups.
  - FILES_CREATED: src/__tests__/type-priority-order.test.ts
  - FILES_MODIFIED: src/constants.ts (or wherever TYPE_PRIORITY lives), src/engines/AutoProgramOrchestratorEngine.ts
  - ABORT_CRITERIA: (1) TYPE_PRIORITY[0] !== "face_mill"; (2) drill priority changes from 1; (3) any existing test regresses
  - ROLLBACK: git revert HEAD~1

U-SAF03: Wire PipelineSafetyOrchestrator as mandatory AutoProgram gate (~120 LOC)
  - Wire/Build: WIRE
  - Description: Insert PipelineSafetyOrchestratorEngine.validate() as a mandatory gate between AutoProgram S9 (toolpath gen) and S10 (post-process). If safety returns fail, abort with SafetyEscalationEngine.escalate(). Add bypass prevention: no config flag can skip the gate.
  - FILES_CREATED: []
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts
  - ABORT_CRITERIA: (1) AutoProgram can emit G-code without safety gate passing; (2) Config bypass exists; (3) Safety gate throws unhandled
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: safety-fail-close-guard → blocks any engine edit that introduces catch-and-pass patterns in safety code
  ACTION: safetyDispatcher:audit_fail_close → scans all safety engines for fail-open patterns
  SKILL: /safety-audit → triggers full safety chain review

EXIT GATE: All 9 safety engines fail-close verified | face_mill=priority 0 | safety gate mandatory in AutoProgram | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [safety-fail-close-guard]
  NEW_ACTIONS: [safetyDispatcher:audit_fail_close]
  NEW_SKILLS: [] (safety-audit already exists)
  AVAILABLE_TO: [MS2, MS3, MS4, MS5, MS6, MS7, MS8, MS9, MS10, MS11, MS12]

---

### SESSION S2: Constants Consolidation + Safety Tests (U-SAF04..U-SAF05)
SMART CONFIG: Role=physics_engineer + test_engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [physics/constants.ts, all 100 engines with kc1.1 references, KienzleForceModelEngine]
INTENT: [Every engine imports kc1.1/mc/Taylor from physics/constants.ts. Zero inline physics constants remain. Constants are the canonical source of truth.]

WORK:
U-SAF04: kc1.1 constants consolidation — eliminate inline copies (~400 LOC delta)
  - Wire/Build: FIX
  - Description: The 100+ engines that reference kc1.1/specificCuttingForce inline must be migrated to import from src/physics/constants.ts. Write a codemod script that: (1) finds all inline kc1.1 definitions, (2) replaces with import from constants.ts, (3) validates values match canonical. Run codemod, verify build, verify tests. This is the #1 correctness bug per the gap auditor.
  - FILES_CREATED: scripts/codemod-kc11-consolidate.ts, src/__tests__/constants-consolidation.test.ts
  - FILES_MODIFIED: ~100 engine files (automated via codemod)
  - ABORT_CRITERIA: (1) Any engine still has inline kc1.1 after codemod; (2) Any value differs from canonical by >1%; (3) Build fails; (4) Test count drops
  - ROLLBACK: git revert HEAD~1

U-SAF05: Constants drift prevention hook (~60 LOC)
  - Wire/Build: BUILD
  - Description: Create a PreToolUse hook that greps for inline kc1.1/mc/taylor_C/taylor_n definitions in engine files (excluding constants.ts itself). If found, block the edit and suggest importing from constants.ts. This prevents future drift.
  - FILES_CREATED: src/hooks/constants-drift-guard.ts
  - FILES_MODIFIED: .claude/settings.json (register hook)
  - ABORT_CRITERIA: (1) Hook does not fire on inline constant; (2) Hook false-positives on legitimate imports; (3) Hook can be bypassed
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: constants-drift-guard → blocks inline physics constant definitions
  ACTION: physicsDispatcher:validate_constants_usage → scans codebase for inline constants
  SKILL: /physics-verify → already exists, enhanced with constants check

EXIT GATE: 0 inline kc1.1 in engine files | drift hook active | all 111+ tests pass | 0 tsc errors | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [constants-drift-guard]
  NEW_ACTIONS: [physicsDispatcher:validate_constants_usage]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS2..MS12]

---

## MILESTONE F360-REV-MS2: AutoProgram S10 Reroute — PPP Integration
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS1]
Brief: Fix the critical F360 silo: AutoProgramOrchestratorEngine S10 currently calls bridge.postProcess() which bypasses PostProcessorPipelineEngine's 38 stages of per-block physics optimization. Reroute S10 to call PPP, then bridge only for final file I/O. This is the single highest-impact architectural fix.

### SESSION S3: PPP Bridge Adapter + S10 Reroute (U-PPP01..U-PPP03)
SMART CONFIG: Role=pipeline_architect + postprocessor_specialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE: [AutoProgramOrchestratorEngine (S7-S10), PostProcessorPipelineEngine (38 stages), SpeedFeedOrchestratorEngine, fusion360-bridge]
INTENT: [AutoProgram S10 produces G-code through PPP's full 38-stage pipeline. Per-block S/F variability reaches the output file. The F360 silo is eliminated.]

WORK:
U-PPP01: PPP-to-Fusion bridge adapter (~250 LOC)
  - Wire/Build: BUILD
  - Description: Create an adapter that converts PPP's output format (per-block annotated G-code) to Fusion's expected post-process result format. The adapter must: (1) accept PPP Stage 38 output, (2) write to the output_folder path Fusion expects, (3) return the result shape bridge.postProcess() would have returned. This preserves Fusion API contract while using PPP internally.
  - FILES_CREATED: src/engines/adapters/PPPFusionBridgeAdapter.ts, src/__tests__/ppp-fusion-bridge-adapter.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Adapter output format doesn't match bridge.postProcess() return type; (2) File write fails for any of 20 controller dialects; (3) Per-block S/F annotations lost in conversion
  - ROLLBACK: git revert HEAD~1

U-PPP02: AutoProgram S10 reroute through PPP (~150 LOC)
  - Wire/Build: WIRE
  - Description: Replace the bridge.postProcess() call in AutoProgramOrchestratorEngine S10 with: (1) call PostProcessorPipelineEngine.process() with the toolpath from S9, (2) pipe output through PPPFusionBridgeAdapter, (3) call bridge only for file write (bridge.writeFile()). The old path becomes a fallback behind a feature flag (default: OFF, requires explicit env var to enable).
  - FILES_CREATED: []
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts
  - ABORT_CRITERIA: (1) Default path still calls bridge.postProcess(); (2) PPP stages 1-38 not all executed; (3) Fallback flag defaults to ON
  - ROLLBACK: git revert HEAD~1

U-PPP03: Per-block S/F verification test suite (~200 LOC)
  - Wire/Build: BUILD
  - Description: Create integration tests that: (1) run AutoProgram S1-S10 with a test part, (2) verify the output G-code contains per-block variable S/F values (not constant), (3) verify the S/F values match SpeedFeedOrchestratorEngine calculations within 1%, (4) test all 3 major dialect families (Fanuc, Siemens, Haas).
  - FILES_CREATED: src/__tests__/autoprogram-ppp-integration.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) G-code has constant S/F across blocks; (2) S/F deviation from SpeedFeedOrchestrator >1%; (3) Any dialect fails to produce valid output
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: ppp-bypass-detector → warns if any code path calls bridge.postProcess() outside the fallback flag
  ACTION: pipelineDispatcher:verify_ppp_routing → confirms AutoProgram routes through PPP
  SKILL: /program-validate → enhanced to check PPP routing

EXIT GATE: S10 routes through PPP by default | per-block S/F in output verified for 3 dialects | fallback flag defaults OFF | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [ppp-bypass-detector]
  NEW_ACTIONS: [pipelineDispatcher:verify_ppp_routing]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS3..MS12]

---

### SESSION S4: Pre-compute Cache for SLD + Thermal (U-PPP04..U-PPP05)
SMART CONFIG: Role=performance_engineer + physics_architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE: [ChatterStabilityLobeEngine, ThermalWearCouplingEngine, SpeedFeedOrchestratorEngine, PostProcessorPipelineEngine perf budget]
INTENT: [SLD and thermal computations happen once at tool-selection time and are cached. Per-block PPP lookup is <2ms. The 5-15ms SLD and 20-80ms thermal RK4 computations never run in the per-block hot path.]

WORK:
U-PPP04: Physics pre-compute cache layer (~300 LOC)
  - Wire/Build: BUILD
  - Description: Create a PhysicsPrecomputeCache that: (1) at tool selection (AutoProgram S7), runs ChatterStabilityLobeEngine.generateSLD() for the tool/workpiece combo and caches the stable RPM map, (2) runs ThermalWearCouplingEngine.solveODE() for the expected cutting duration and caches the thermal trajectory, (3) provides a <2ms lookup function getLookup(rpm, depth, feed) that interpolates from the cached arrays. Cache key = hash(tool_id + material_id + machine_id + operation_type).
  - FILES_CREATED: src/engines/cache/PhysicsPrecomputeCache.ts, src/__tests__/physics-precompute-cache.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S7 calls cache.precompute()), src/engines/PostProcessorPipelineEngine.ts (per-block uses cache.lookup())
  - ABORT_CRITERIA: (1) Per-block lookup >2ms p99; (2) Cache miss causes full SLD recompute in hot path; (3) Interpolation error >5% vs full computation; (4) Memory >50MB for typical job
  - ROLLBACK: git revert HEAD~1

U-PPP05: Per-block timing budget enforcement (~80 LOC)
  - Wire/Build: BUILD
  - Description: Add instrumentation to PPP that measures per-block processing time. If any block exceeds 2ms, log a warning with the stage that exceeded budget. Add a test that processes 1000 blocks and asserts p99 < 2ms. This prevents future regressions from adding expensive per-block computations.
  - FILES_CREATED: src/__tests__/ppp-timing-budget.test.ts
  - FILES_MODIFIED: src/engines/PostProcessorPipelineEngine.ts (add timing instrumentation)
  - ABORT_CRITERIA: (1) p99 per-block > 2ms; (2) Instrumentation adds >0.1ms overhead; (3) No warning emitted when budget exceeded
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: per-block-budget-guard → warns when new code adds computation to PPP per-block path
  ACTION: performanceDispatcher:check_block_timing → runs timing benchmark
  SKILL: /process-health → enhanced with per-block timing display

EXIT GATE: SLD pre-computed at S7 | thermal pre-computed at S7 | per-block lookup <2ms p99 | cache hit rate >99% for typical jobs | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [per-block-budget-guard]
  NEW_ACTIONS: [performanceDispatcher:check_block_timing]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS3..MS12]

---

## MILESTONE F360-REV-MS3: Probing + Surface Integrity Wiring
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS2]
Brief: Wire the 6 existing probe engines and 3 surface integrity engines into the F360 pipeline. Zero new engines built -- pure wiring. Probing feeds into AutoProgram S3 (WCS setup) and S8 (in-process verification). Surface integrity feeds into S4/S5 (quality prediction).

### SESSION S5: Probe Engine Wiring (U-PRB01..U-PRB03)
SMART CONFIG: Role=metrology_engineer + pipeline_architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [ProbeRoutineEngine, ProbeRoutineGeneratorEngine, AutoProgramOrchestratorEngine S3/S8, fusion360-bridge probe API]
INTENT: [Probe routines are automatically generated and inserted into programs. WCS is verified before cutting. In-process measurement catches drift before it becomes scrap.]

WORK:
U-PRB01: Wire ProbeRoutineEngine to AutoProgram S3 (WCS setup) (~120 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S3 (work coordinate setup), call ProbeRoutineEngine.generateWCSProbe() to produce a WCS verification routine. Insert the probe G-code before the first cutting operation. The probe result updates the work offset. If probe detects >0.05mm deviation from nominal, flag a warning.
  - FILES_CREATED: src/__tests__/autoprogram-probe-wcs.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S3)
  - ABORT_CRITERIA: (1) Probe routine not inserted before cutting; (2) WCS deviation threshold not enforced; (3) Probe G-code invalid for target controller
  - ROLLBACK: git revert HEAD~1

U-PRB02: Wire ProbeRoutineGenerator to AutoProgram S8 (in-process verify) (~120 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S8 (verification), call ProbeRoutineGeneratorEngine.generateInProcessProbe() for critical features (those with tolerances tighter than +/-0.025mm). Insert mid-program probe cycles that verify critical dimensions after their roughing pass. If drift detected, adjust tool offset compensation.
  - FILES_CREATED: src/__tests__/autoprogram-probe-inprocess.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S8)
  - ABORT_CRITERIA: (1) Critical features not probed; (2) Offset compensation not applied on drift; (3) Probe cycle breaks program flow
  - ROLLBACK: git revert HEAD~1

U-PRB03: Wire probing to MCP actions (dispatcher routing) (~80 LOC)
  - Wire/Build: WIRE
  - Description: Create/update probeDispatcher actions: probe_wcs_setup, probe_in_process, probe_tool_setter. Route to ProbeRoutineEngine and ProbeRoutineGeneratorEngine. Register in dispatcher index.
  - FILES_CREATED: src/__tests__/probe-dispatcher.test.ts
  - FILES_MODIFIED: src/tools/dispatchers/probeDispatcher.ts (or create if missing)
  - ABORT_CRITERIA: (1) Actions not callable via MCP; (2) Missing Zod schemas; (3) Dispatcher not registered in index
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: probe-before-cut-guard → warns if AutoProgram generates cutting without WCS probe
  ACTION: probeDispatcher:probe_wcs_setup → generates WCS probing routine
  SKILL: /probe-routine-guide → enhanced with F360 pipeline integration

EXIT GATE: WCS probe in S3 | in-process probe in S8 | 3 new dispatcher actions | probe G-code valid for Fanuc/Siemens/Haas | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [probe-before-cut-guard]
  NEW_ACTIONS: [probeDispatcher:probe_wcs_setup, probeDispatcher:probe_in_process, probeDispatcher:probe_tool_setter]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS4..MS12]

---

### SESSION S6: Surface Integrity + White Layer + Residual Stress Wiring (U-SRF01..U-SRF02)
SMART CONFIG: Role=surface_engineer + quality_specialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=20%
KNOWLEDGE: [SurfaceIntegrityEngine, SurfaceIntegrityPredictorEngine, ResidualStressPredictionEngine, WhiteLayerDetectionEngine, AutoProgramOrchestratorEngine S4/S5]
INTENT: [Every cutting operation has surface integrity prediction. White layer risk is flagged before G-code emission. Residual stress predictions feed into quality reports.]

WORK:
U-SRF01: Wire surface integrity engines to AutoProgram S4/S5 (~150 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S4 (physics), call SurfaceIntegrityEngine.predict() and ResidualStressPredictionEngine.predict() for each operation. In S5 (validation), call WhiteLayerDetectionEngine.assess() for hard turning/grinding operations. If white layer risk > 0.3, escalate to SafetyEscalationEngine with recommended parameter adjustment.
  - FILES_CREATED: src/__tests__/autoprogram-surface-integrity.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S4, S5)
  - ABORT_CRITERIA: (1) Surface integrity not predicted for cutting ops; (2) White layer risk not checked for hard materials (>50 HRC); (3) Escalation not triggered at threshold
  - ROLLBACK: git revert HEAD~1

U-SRF02: Wire surface integrity to quality dispatcher (~80 LOC)
  - Wire/Build: WIRE
  - Description: Add actions to qualityDispatcher: predict_surface_integrity, assess_white_layer, predict_residual_stress. Route to the 3 engines. These actions enable shop-floor queries about surface quality before running the program.
  - FILES_CREATED: src/__tests__/quality-surface-actions.test.ts
  - FILES_MODIFIED: src/tools/dispatchers/qualityDispatcher.ts
  - ABORT_CRITERIA: (1) Actions not callable via MCP; (2) Missing Zod validation; (3) Results don't include confidence intervals
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: white-layer-risk-gate → blocks G-code emission when white layer risk >0.5 without acknowledgment
  ACTION: qualityDispatcher:predict_surface_integrity → full surface integrity prediction
  SKILL: /quality-check → enhanced with surface integrity tab

EXIT GATE: Surface integrity in S4 | white layer check in S5 | 3 quality actions | escalation on risk threshold | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [white-layer-risk-gate]
  NEW_ACTIONS: [qualityDispatcher:predict_surface_integrity, qualityDispatcher:assess_white_layer, qualityDispatcher:predict_residual_stress]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS4..MS12]

---

## MILESTONE F360-REV-MS4: Workholding + Fixture + Setup Sheet Wiring
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS2]
Brief: Wire the existing workholding intelligence (7 engines), fixture design (7 engines), soft jaw profiles, and setup sheet engines into the F360 pipeline. These engines exist with zero MCP actions -- pure wiring milestone.

### SESSION S7: Workholding Intelligence + Fixture Design Wiring (U-WRK01..U-WRK03)
SMART CONFIG: Role=workholding_engineer + fixture_designer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [WorkholdingIntelligenceEngine, WorkholdingForceEngine, WorkholdingViabilityEngine, FixtureDesignEngine, SoftJawProfileEngine, ModularFixtureLayoutEngine, FixtureClampingEngine, AutoProgramOrchestratorEngine S2]
INTENT: [Workholding is automatically selected and validated for cutting forces. Fixture designs are generated. Soft jaw profiles are available. The machinist gets a complete setup recommendation, not just a toolpath.]

WORK:
U-WRK01: Wire WorkholdingIntelligenceEngine to dispatcher + AutoProgram S2 (~150 LOC)
  - Wire/Build: WIRE
  - Description: WorkholdingIntelligenceEngine has zero MCP actions. Create workholdingDispatcher with actions: recommend_workholding, validate_clamping_force, check_viability. Wire into AutoProgram S2 (setup planning) so workholding is recommended before toolpath generation. Call WorkholdingForceEngine to validate that recommended workholding can handle max cutting forces from S7.
  - FILES_CREATED: src/tools/dispatchers/workholdingDispatcher.ts, src/__tests__/workholding-dispatcher.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S2), src/tools/dispatchers/index.ts
  - ABORT_CRITERIA: (1) WorkholdingIntelligence still has 0 actions; (2) Force validation not integrated; (3) AutoProgram S2 doesn't call workholding
  - ROLLBACK: git revert HEAD~1

U-WRK02: Wire fixture engines to dispatcher (~120 LOC)
  - Wire/Build: WIRE
  - Description: Create fixtureDispatcher with actions: design_fixture, generate_soft_jaw, optimize_modular_layout, analyze_clamping, check_fixture_dynamics. Route to FixtureDesignEngine, SoftJawProfileEngine, ModularFixtureLayoutEngine, FixtureClampingEngine, FixtureDynamicsEngine.
  - FILES_CREATED: src/tools/dispatchers/fixtureDispatcher.ts, src/__tests__/fixture-dispatcher.test.ts
  - FILES_MODIFIED: src/tools/dispatchers/index.ts
  - ABORT_CRITERIA: (1) <5 actions registered; (2) Missing Zod schemas; (3) Engines not lazy-loaded
  - ROLLBACK: git revert HEAD~1

U-WRK03: Wire FixtureAwareStrategyEngine to toolpath selection (~80 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S6 (strategy selection), call FixtureAwareStrategyEngine.adjustStrategy() to modify toolpath strategy based on fixture constraints (clamp locations, jaw heights, interference zones). This prevents collisions between tool and fixture.
  - FILES_CREATED: src/__tests__/fixture-aware-strategy.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S6)
  - ABORT_CRITERIA: (1) Strategy not adjusted for fixture clearance; (2) Collision zones not excluded; (3) Fixture data not passed from S2 to S6
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: fixture-collision-guard → blocks toolpath gen when fixture interference detected
  ACTION: workholdingDispatcher:recommend_workholding → auto-selects workholding
  SKILL: /fixture-design-guide → enhanced with pipeline wiring info

EXIT GATE: WorkholdingIntelligence wired with 3+ actions | FixtureDesign wired with 5+ actions | AutoProgram S2 calls workholding | S6 fixture-aware | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [fixture-collision-guard]
  NEW_ACTIONS: [workholdingDispatcher:recommend_workholding, workholdingDispatcher:validate_clamping_force, workholdingDispatcher:check_viability, fixtureDispatcher:design_fixture, fixtureDispatcher:generate_soft_jaw, fixtureDispatcher:optimize_modular_layout, fixtureDispatcher:analyze_clamping, fixtureDispatcher:check_fixture_dynamics]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS5..MS12]

---

### SESSION S8: Setup Sheet F360 Wiring + Stock Allowance (U-WRK04..U-WRK05)
SMART CONFIG: Role=setup_engineer + process_planner | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=20%
KNOWLEDGE: [SetupSheetEngine, SetupSheetFromGCodeEngine, SetupSheetLibraryEngine, StockAllowanceEngine, AutoProgramOrchestratorEngine S10 output]
INTENT: [Setup sheets are auto-generated at program completion. Stock allowance is computed from Fusion stock model. The operator gets a complete package: program + setup sheet + stock recommendation.]

WORK:
U-WRK04: Wire SetupSheetEngine to AutoProgram output stage (~100 LOC)
  - Wire/Build: WIRE
  - Description: SetupSheetEngine is already wired to 6 dispatchers but NOT wired to the F360 AutoProgram pipeline output. After S10 (post-process), call SetupSheetEngine.generate() with the operation data from S1-S10 to produce a setup sheet alongside the G-code. Output as both JSON and PDF-ready format.
  - FILES_CREATED: src/__tests__/autoprogram-setup-sheet.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (post-S10)
  - ABORT_CRITERIA: (1) Setup sheet not generated on program completion; (2) Missing tool list, WCS, or fixture info; (3) Setup sheet format incompatible with SetupSheetLibraryEngine
  - ROLLBACK: git revert HEAD~1

U-WRK05: Wire StockAllowanceEngine to AutoProgram S1 (~80 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S1 (part analysis), call StockAllowanceEngine.compute() to determine optimal stock size from the Fusion stock model dimensions. Feed the result into S7 (speed/feed) for DOC/WOC optimization. This replaces hardcoded stock assumptions.
  - FILES_CREATED: src/__tests__/autoprogram-stock-allowance.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S1)
  - ABORT_CRITERIA: (1) Stock allowance not computed from Fusion model; (2) DOC/WOC not adjusted for actual stock; (3) Oversized stock not flagged
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: setup-sheet-completeness-guard → warns if setup sheet missing tool list or WCS
  ACTION: setupDispatcher:generate_from_autoprogram → setup sheet from AutoProgram data
  SKILL: /setup-sheet-generate → enhanced with F360 pipeline auto-generation

EXIT GATE: Setup sheets auto-generated | stock allowance computed from Fusion model | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [setup-sheet-completeness-guard]
  NEW_ACTIONS: [setupDispatcher:generate_from_autoprogram]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS5..MS12]

---

## MILESTONE F360-REV-MS5: Grinding + EDM Pipeline Wiring
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS2]
Brief: Wire the extensive existing grinding (9 engines) and EDM (22 engines) infrastructure to the F360 pipeline as routing steps. When AutoProgram detects a grinding or EDM operation, it routes to the appropriate assembler engine instead of the milling pipeline.

### SESSION S9: Grinding Pipeline Wiring (U-GRD01..U-GRD03)
SMART CONFIG: Role=grinding_specialist + pipeline_architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [GrindingProgramAssemblerEngine (19 ops, 6 dialects), SurfaceGrindingEngine, CenterlessGrindingEngine, GrindingForceEngine, GrindingSurfaceFinishEngine, GrindingWheelDressingOptimizationEngine, AutoProgramOrchestratorEngine routing]
INTENT: [Grinding operations detected in Fusion setup route to GrindingProgramAssembler. Dressing optimization and wheel selection happen automatically. Surface finish prediction validates grinding parameters.]

WORK:
U-GRD01: Route grinding operations to GrindingProgramAssembler (~150 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S6 (strategy selection), detect operation_type in {surface_grind, cylindrical_grind, centerless_grind, internal_grind, creep_feed_grind}. When detected, route to GrindingProgramAssemblerEngine instead of the milling toolpath generator. Pass material, wheel spec, and tolerance requirements.
  - FILES_CREATED: src/__tests__/autoprogram-grinding-route.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S6, S9)
  - ABORT_CRITERIA: (1) Grinding ops still route to milling pipeline; (2) GrindingProgramAssembler not called for any of 5 grind types; (3) Dialect mismatch with target controller
  - ROLLBACK: git revert HEAD~1

U-GRD02: Wire grinding physics engines to pre-compute cache (~100 LOC)
  - Wire/Build: WIRE
  - Description: Add GrindingForceEngine and GrindingSurfaceFinishEngine to PhysicsPrecomputeCache (from MS2 U-PPP04). Pre-compute grinding forces and surface finish predictions at wheel selection time. Cache key includes wheel spec, dressing state, and material.
  - FILES_CREATED: src/__tests__/grinding-precompute.test.ts
  - FILES_MODIFIED: src/engines/cache/PhysicsPrecomputeCache.ts
  - ABORT_CRITERIA: (1) Grinding physics not cached; (2) Surface finish prediction not available for per-block lookup; (3) Cache miss rate >1%
  - ROLLBACK: git revert HEAD~1

U-GRD03: Wire dressing optimization to grinding setup (~80 LOC)
  - Wire/Build: WIRE
  - Description: Before grinding program generation, call GrindingWheelDressingOptimizationEngine.optimize() to determine optimal dressing parameters. Include dressing routine in the generated program header. Call StochasticGrindingDressingEngine for uncertainty quantification on dressing intervals.
  - FILES_CREATED: src/__tests__/grinding-dressing-opt.test.ts
  - FILES_MODIFIED: src/engines/GrindingProgramAssemblerEngine.ts (pre-program hook)
  - ABORT_CRITERIA: (1) Dressing not optimized; (2) Dressing routine missing from program; (3) No uncertainty quantification on intervals
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: grinding-wheel-check → validates wheel spec matches material before program gen
  ACTION: grindingDispatcher:generate_grinding_program → full grinding program from Fusion setup
  SKILL: /process-calc → enhanced with grinding mode

EXIT GATE: 5 grind types routed to assembler | physics pre-cached | dressing optimized | valid programs for 6 dialects | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [grinding-wheel-check]
  NEW_ACTIONS: [grindingDispatcher:generate_grinding_program]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS6..MS12]

---

### SESSION S10: EDM Pipeline Wiring (U-EDM01..U-EDM02)
SMART CONFIG: Role=edm_specialist + pipeline_architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [EDMProgramAssemblerEngine (6 dialects), EDMParameterEngine, EDMFeasibilityEngine, EDMMultiPassStrategyEngine, EDMSurfaceIntegrityEngine, EDMQualityOrchestratorEngine, AutoProgramOrchestratorEngine routing]
INTENT: [EDM operations (wire, sinker, micro) detected in Fusion setup route to EDMProgramAssembler. Feasibility is checked. Multi-pass strategy is optimized. Surface integrity is verified.]

WORK:
U-EDM01: Route EDM operations to EDMProgramAssembler (~150 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S6, detect operation_type in {wire_edm, sinker_edm, micro_edm, edm_drill}. Route to EDMProgramAssemblerEngine. Call EDMFeasibilityEngine.check() first -- if not feasible, return explanation. Call EDMMultiPassStrategyEngine for multi-pass optimization. Wire EDMSurfaceIntegrityEngine into S5 quality validation.
  - FILES_CREATED: src/__tests__/autoprogram-edm-route.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S5, S6, S9)
  - ABORT_CRITERIA: (1) EDM ops still route to milling; (2) Feasibility not checked; (3) Multi-pass not optimized for roughing+finishing; (4) Surface integrity not validated
  - ROLLBACK: git revert HEAD~1

U-EDM02: Wire EDM quality orchestrator to quality pipeline (~100 LOC)
  - Wire/Build: WIRE
  - Description: Wire EDMQualityOrchestratorEngine to qualityDispatcher with actions: edm_quality_check, edm_surface_integrity, edm_recast_layer_prediction. Wire EDMCostDocumentationEngine to businessDispatcher for EDM job costing. This completes the EDM pipeline from feasibility through quality verification.
  - FILES_CREATED: src/__tests__/edm-quality-dispatcher.test.ts
  - FILES_MODIFIED: src/tools/dispatchers/qualityDispatcher.ts, src/tools/dispatchers/businessDispatcher.ts
  - ABORT_CRITERIA: (1) EDM quality actions not callable; (2) Recast layer not predicted for sinker EDM; (3) Cost documentation not generated
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: edm-feasibility-gate → blocks EDM program gen when feasibility check fails
  ACTION: edmDispatcher:generate_edm_program → full EDM program from Fusion setup
  SKILL: /feasibility-check → enhanced with EDM feasibility

EXIT GATE: 4 EDM types routed to assembler | feasibility gated | multi-pass optimized | quality verified | 6 dialects | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [edm-feasibility-gate]
  NEW_ACTIONS: [edmDispatcher:generate_edm_program, qualityDispatcher:edm_quality_check, qualityDispatcher:edm_surface_integrity, qualityDispatcher:edm_recast_layer_prediction]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS6..MS12]

---

## MILESTONE F360-REV-MS6: DFM + Heat Treatment + Material Cert Wiring
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS3]
Brief: Wire DFMPipelineEngine as a gate in the AutoPrintToProgramBridge, wire HeatTreatmentResponseEngine into process planning, and wire MaterialCertTraceabilityEngine to quality output. All engines exist -- pure wiring.

### SESSION S11: DFM Gate + Heat Treatment Wiring (U-DFM01..U-DFM03)
SMART CONFIG: Role=manufacturing_engineer + process_planner | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [DFMPipelineEngine, DFMFeedbackEngine, HeatTreatmentResponseEngine, HeatTreatmentEngine, AutoProgramOrchestratorEngine S1, PrintToProgramPipelineEngine]
INTENT: [DFM feedback is provided before programming begins. Heat treatment effects on material properties are accounted for in speed/feed calculations. Material cert follows the part from design through shipping.]

WORK:
U-DFM01: Wire DFMPipelineEngine as gate in AutoPrintToProgramBridge (~120 LOC)
  - Wire/Build: WIRE
  - Description: In AutoPrintToProgramBridge (or equivalent entry point), call DFMPipelineEngine.analyze() before starting AutoProgram. If DFM returns critical issues (e.g., impossible tolerances, undercuts without 5-axis), present feedback and halt. If warnings only, continue with warnings attached to the job. Wire DFMFeedbackEngine for learning from DFM outcomes.
  - FILES_CREATED: src/__tests__/dfm-gate-bridge.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (pre-S1 gate), src/engines/PrintToProgramPipelineEngine.ts
  - ABORT_CRITERIA: (1) DFM not called before programming; (2) Critical DFM issues don't halt pipeline; (3) DFM feedback not attached to job
  - ROLLBACK: git revert HEAD~1

U-DFM02: Wire HeatTreatmentResponseEngine into process planning (~100 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S1 (part analysis), detect if material spec includes heat treatment (HRC callout, case hardening, nitriding, etc.). Call HeatTreatmentResponseEngine.predictResponse() to get post-treatment material properties (adjusted hardness, residual stress, distortion). Feed adjusted properties into S7 (speed/feed) so cutting parameters account for actual material state, not raw stock properties.
  - FILES_CREATED: src/__tests__/heat-treatment-planning.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S1, S7)
  - ABORT_CRITERIA: (1) Heat treatment spec ignored; (2) Speed/feed uses raw stock properties when HT specified; (3) Distortion not flagged for tight tolerances
  - ROLLBACK: git revert HEAD~1

U-DFM03: Wire MaterialCertTraceabilityEngine to quality output (~80 LOC)
  - Wire/Build: WIRE
  - Description: Wire MaterialCertTraceabilityEngine to qualityDispatcher with actions: trace_material_cert, validate_cert_chain, generate_cert_report. In AutoProgram output, include material cert reference in setup sheet and quality records. This enables AS9100/IATF16949 traceability.
  - FILES_CREATED: src/__tests__/material-cert-dispatcher.test.ts
  - FILES_MODIFIED: src/tools/dispatchers/qualityDispatcher.ts
  - ABORT_CRITERIA: (1) Cert actions not callable; (2) Cert not linked to setup sheet; (3) Traceability chain broken
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: dfm-gate-enforcement → blocks program gen when DFM critical issues unresolved
  ACTION: cadDispatcher:dfm_gate_check → runs DFM analysis as pipeline gate
  SKILL: /dfm-check → enhanced with pipeline gate mode

EXIT GATE: DFM gate active | heat treatment adjusts S/F | material cert in quality output | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [dfm-gate-enforcement]
  NEW_ACTIONS: [cadDispatcher:dfm_gate_check, qualityDispatcher:trace_material_cert, qualityDispatcher:validate_cert_chain, qualityDispatcher:generate_cert_report]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS7..MS12]

---

### SESSION S12: Process Planning + Operation Sequencing (U-DFM04..U-DFM05)
SMART CONFIG: Role=process_planner + manufacturing_engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=20%
KNOWLEDGE: [SetupTransitionEngine, HolePatternPipelineEngine, ThreadingPipelineEngine, AutoProgramOrchestratorEngine S6]
INTENT: [Multi-operation jobs are sequenced optimally. Setup transitions are minimized. Hole patterns and threading are handled by specialized pipelines.]

WORK:
U-DFM04: Wire SetupTransitionEngine to multi-setup planning (~120 LOC)
  - Wire/Build: WIRE
  - Description: When AutoProgram detects multiple setups (e.g., flip part, 4th axis indexing), call SetupTransitionEngine.optimize() to minimize setup count and transition time. Consider operation grouping, datum transfer, and fixture commonality. Output an ordered setup sequence.
  - FILES_CREATED: src/__tests__/setup-transition-planning.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S2)
  - ABORT_CRITERIA: (1) Multi-setup jobs not optimized; (2) Setup count higher than manual planning; (3) Datum transfer not validated
  - ROLLBACK: git revert HEAD~1

U-DFM05: Wire HolePatternPipeline + ThreadingPipeline as AutoProgram sub-routes (~100 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S6, detect hole pattern features and threading features. Route hole patterns to HolePatternPipelineEngine (drill + ream + bore sequence optimization). Route threading to ThreadingPipelineEngine (tap + thread mill selection, pitch validation). These specialized pipelines produce better results than generic operation planning.
  - FILES_CREATED: src/__tests__/autoprogram-hole-thread-routing.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S6)
  - ABORT_CRITERIA: (1) Holes not routed to HolePatternPipeline; (2) Threads not routed to ThreadingPipeline; (3) Drill sequence not optimized for cycle time
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: setup-transition-audit → logs setup count before/after optimization for continuous improvement
  ACTION: processDispatcher:optimize_setup_transitions → multi-setup optimization
  SKILL: /job-planning → enhanced with setup transition optimizer

EXIT GATE: Multi-setup optimized | holes route to HolePatternPipeline | threads route to ThreadingPipeline | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [setup-transition-audit]
  NEW_ACTIONS: [processDispatcher:optimize_setup_transitions]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS7..MS12]

---

## MILESTONE F360-REV-MS7: PrintToGeometry STEP Bridge + Fusion Import
Track: F360-REV | Status: not_started | Units: 4 | Sessions: 2
Dependencies: [F360-REV-MS4]
Brief: Bridge PrintToGeometryEngine (CadQuery output) to Fusion 360 via STEP file import instead of the impossible executeCode() approach. Build the STEP export from CadQuery, then the Fusion importManager bridge.

### SESSION S13: STEP Export from CadQuery + Fusion Import Bridge (U-GEO01..U-GEO02)
SMART CONFIG: Role=cad_engineer + python_bridge_specialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE: [PrintToGeometryEngine (522 LOC, CadQuery output), cad-engine/ Python bridge, Fusion 360 importManager API, STEP AP214 format]
INTENT: [PrintToGeometry creates a STEP file from CadQuery geometry. Fusion imports it via importManager. The print-to-CAD pipeline works end-to-end without the impossible executeCode() approach.]

WORK:
U-GEO01: CadQuery-to-STEP export bridge (~200 LOC)
  - Wire/Build: BUILD
  - Description: In the Python cad-engine, add a STEP exporter that takes PrintToGeometryEngine's CadQuery output (solid body) and exports it as AP214 STEP file. Use CadQuery's built-in exportStl/exportStep methods. Validate the STEP file is valid (non-zero size, parseable header). Write to temp directory with unique filename.
  - FILES_CREATED: cad-engine/src/step_exporter.py, cad-engine/tests/test_step_exporter.py
  - FILES_MODIFIED: src/engines/PrintToGeometryEngine.ts (call Python bridge for STEP export)
  - ABORT_CRITERIA: (1) STEP file not valid AP214; (2) Export fails for complex geometry (fillet + chamfer + pocket); (3) File size >100MB for simple parts
  - ROLLBACK: git revert HEAD~1

U-GEO02: Fusion importManager bridge (~150 LOC)
  - Wire/Build: BUILD
  - Description: Create a Fusion 360 bridge function that calls importManager.importToNewDocument(stepFilePath) to import the STEP file into Fusion. This replaces the impossible executeCode() approach documented in the scrutiny findings. Handle import errors (unsupported geometry, repair needed). Return the imported component reference for downstream AutoProgram use.
  - FILES_CREATED: src/engines/adapters/FusionSTEPImportAdapter.ts, src/__tests__/fusion-step-import.test.ts
  - FILES_MODIFIED: src/engines/PrintToGeometryEngine.ts
  - ABORT_CRITERIA: (1) importManager not called correctly; (2) Import fails for valid STEP files; (3) Component reference not returned for AutoProgram
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: step-file-validator → validates STEP file header before Fusion import attempt
  ACTION: cadDispatcher:import_step_to_fusion → imports STEP file into Fusion 360
  SKILL: /fusion-generate → enhanced with STEP import path

EXIT GATE: CadQuery exports valid STEP | Fusion imports via importManager | end-to-end print-to-CAD works | 0 tsc errors | all tests pass | omega_floor >= 1.0

---

### SESSION S14: Print-to-Program Full Pipeline Wiring (U-GEO03..U-GEO04)
SMART CONFIG: Role=pipeline_architect + manufacturing_engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [PrintToProgramPipelineEngine, PrintToGeometryEngine, DFMPipelineEngine, AutoProgramOrchestratorEngine]
INTENT: [The full chain works: print (drawing) -> DFM check -> geometry (STEP) -> Fusion import -> AutoProgram -> G-code. One command triggers the entire pipeline.]

WORK:
U-GEO03: Wire full print-to-program chain through Fusion (~200 LOC)
  - Wire/Build: WIRE
  - Description: Wire PrintToProgramPipelineEngine to call: (1) Blueprint OCR/feature extraction, (2) DFMPipelineEngine gate (from MS6), (3) PrintToGeometryEngine + STEP export (from U-GEO01), (4) FusionSTEPImportAdapter (from U-GEO02), (5) AutoProgramOrchestratorEngine S1-S10 with PPP routing (from MS2). This creates the complete print-to-G-code pipeline through Fusion.
  - FILES_CREATED: src/__tests__/print-to-program-fusion-e2e.test.ts
  - FILES_MODIFIED: src/engines/PrintToProgramPipelineEngine.ts
  - ABORT_CRITERIA: (1) Any pipeline stage skipped; (2) DFM gate not enforced; (3) G-code output doesn't have per-block S/F; (4) Error in one stage crashes entire pipeline (no graceful degradation)
  - ROLLBACK: git revert HEAD~1

U-GEO04: Error recovery and graceful degradation (~120 LOC)
  - Wire/Build: BUILD
  - Description: Add error recovery to the print-to-program chain: if STEP export fails, fall back to direct geometry input. If Fusion import fails, report the error with actionable fix suggestions. If AutoProgram fails at any stage, preserve partial results and report which stage failed. Add retry logic for transient Fusion API failures (with exponential backoff respecting 150ms MIN_OP_INTERVAL).
  - FILES_CREATED: src/__tests__/print-to-program-error-recovery.test.ts
  - FILES_MODIFIED: src/engines/PrintToProgramPipelineEngine.ts
  - ABORT_CRITERIA: (1) STEP failure crashes pipeline; (2) No fallback path; (3) Transient Fusion API error not retried; (4) Partial results lost on failure
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: pipeline-stage-telemetry → logs timing and success/failure for each print-to-program stage
  ACTION: pipelineDispatcher:run_print_to_program_fusion → full pipeline execution
  SKILL: /print-to-program → enhanced with Fusion pipeline path

EXIT GATE: Full chain works end-to-end | error recovery tested | graceful degradation verified | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [step-file-validator, pipeline-stage-telemetry]
  NEW_ACTIONS: [cadDispatcher:import_step_to_fusion, pipelineDispatcher:run_print_to_program_fusion]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS8..MS12]

---

## MILESTONE F360-REV-MS8: Toolpath Export Strategy (External .cps Post)
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS2, F360-REV-MS7]
Brief: Since MS7 scrutiny confirmed that direct Fusion API toolpath injection is impossible, implement the external .cps post-processor strategy. PRISM generates an optimized .cps file that Fusion's native post uses, embedding per-block S/F variability in the post-processor itself rather than trying to modify toolpaths.

### SESSION S15: .cps Post-Processor Generator (U-CPS01..U-CPS03)
SMART CONFIG: Role=postprocessor_developer + fusion_specialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE: [PostProcessorPipelineEngine (38 stages, 20 dialects), Fusion .cps format, existing .cps templates in cps-analyze skill, SpeedFeedOrchestratorEngine]
INTENT: [PRISM generates a custom .cps file for each job that embeds per-block physics optimization. When Fusion runs native post with this .cps, the output contains PRISM's optimized S/F values. The machinist gets physics-optimized G-code through Fusion's native workflow.]

WORK:
U-CPS01: .cps template engine with per-block S/F injection (~350 LOC)
  - Wire/Build: BUILD
  - Description: Create a CPSTemplateEngine that generates Fusion 360 .cps post-processor files. The engine: (1) takes a base dialect template (Fanuc, Siemens, Haas, etc.), (2) injects PRISM's per-block S/F lookup table as a JavaScript object in the .cps, (3) modifies the onLinear/onCircular/onRapid functions to call the lookup table for each block's optimized S/F. The lookup table is populated from PhysicsPrecomputeCache (MS2). Support at minimum Fanuc, Siemens 840D, and Haas dialects.
  - FILES_CREATED: src/engines/CPSTemplateEngine.ts, src/__tests__/cps-template-engine.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Generated .cps not valid JavaScript; (2) Per-block S/F not applied in onLinear; (3) Less than 3 dialects supported; (4) .cps file >500KB (Fusion may reject large files)
  - ROLLBACK: git revert HEAD~1

U-CPS02: PPP-to-CPS lookup table converter (~150 LOC)
  - Wire/Build: BUILD
  - Description: Create a converter that takes PostProcessorPipelineEngine's per-block output (the full 38-stage result) and converts it to the compact lookup table format used by CPSTemplateEngine. The table maps (operation_index, block_index) -> (S_value, F_value, coolant_mode). Compress repeated values (many blocks may have same S/F).
  - FILES_CREATED: src/engines/adapters/PPPToCPSLookupAdapter.ts, src/__tests__/ppp-to-cps-lookup.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Lookup table doesn't cover all blocks; (2) S/F values differ from PPP output; (3) Table size >200KB for typical job; (4) Compressed table loses precision
  - ROLLBACK: git revert HEAD~1

U-CPS03: Wire CPS generation to AutoProgram output (~100 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram post-S10, add an option to output a .cps file alongside the G-code. When the user selects "Fusion native post" mode, generate the .cps via CPSTemplateEngine + PPPToCPSLookupAdapter. Provide instructions for loading the .cps in Fusion's Post Process dialog.
  - FILES_CREATED: src/__tests__/autoprogram-cps-output.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts
  - ABORT_CRITERIA: (1) .cps not generated in Fusion native mode; (2) .cps not loadable in Fusion; (3) Instructions missing for Fusion workflow
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: cps-dialect-validator → validates generated .cps against dialect spec before output
  ACTION: postDispatcher:generate_cps_post → generates PRISM-optimized .cps for Fusion
  SKILL: /ppg-quick-start → enhanced with PRISM-optimized .cps generation

EXIT GATE: .cps generated for 3+ dialects | per-block S/F embedded | lookup table compressed | AutoProgram outputs .cps | 0 tsc errors | all tests pass | omega_floor >= 1.0

---

### SESSION S16: .cps Validation + Dialect Coverage (U-CPS04..U-CPS05)
SMART CONFIG: Role=postprocessor_validator + cnc_programmer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [CPSTemplateEngine, PPPToCPSLookupAdapter, Fusion .cps format, controller dialect specs]
INTENT: [Generated .cps files produce valid G-code for all supported controllers. S/F values in the G-code match PRISM's calculations within 1%. Edge cases (tool changes, retracts, sub-programs) handled correctly.]

WORK:
U-CPS04: .cps output validation against reference G-code (~200 LOC)
  - Wire/Build: BUILD
  - Description: Create a validation suite that: (1) generates .cps for each supported dialect, (2) runs the .cps through a JavaScript interpreter simulating Fusion's post engine, (3) compares output G-code against reference programs, (4) validates per-block S/F values match PPP within 1%. Test edge cases: tool change (M6), retract (G28/G30), sub-program calls (M98), and rapid moves (G0 should not have S/F override).
  - FILES_CREATED: src/__tests__/cps-validation-suite.test.ts, src/__tests__/fixtures/reference-programs/
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Any dialect produces invalid G-code; (2) S/F deviation >1% from PPP; (3) Rapid moves get S/F override; (4) Tool change sequence broken
  - ROLLBACK: git revert HEAD~1

U-CPS05: Extended dialect coverage (Mazak, Okuma, DMG) (~200 LOC)
  - Wire/Build: BUILD
  - Description: Add Mazak Smooth, Okuma OSP, and DMG CELOS dialect templates to CPSTemplateEngine. These are the next 3 most common controllers after Fanuc/Siemens/Haas. Each template needs: correct coordinate format, speed/feed format, coolant codes, tool change sequence, and program structure.
  - FILES_CREATED: src/engines/templates/cps-mazak-smooth.ts, src/engines/templates/cps-okuma-osp.ts, src/engines/templates/cps-dmg-celos.ts, src/__tests__/cps-extended-dialects.test.ts
  - FILES_MODIFIED: src/engines/CPSTemplateEngine.ts (register new templates)
  - ABORT_CRITERIA: (1) <6 total dialects; (2) Mazak program structure wrong; (3) Okuma OSP codes incorrect; (4) DMG CELOS format errors
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: cps-regression-guard → runs .cps validation on any template change
  ACTION: postDispatcher:validate_cps_output → validates .cps against reference
  SKILL: /cps-analyze → enhanced with PRISM .cps validation

EXIT GATE: 6 dialects supported | all produce valid G-code | S/F within 1% of PPP | edge cases pass | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [cps-dialect-validator, cps-regression-guard]
  NEW_ACTIONS: [postDispatcher:generate_cps_post, postDispatcher:validate_cps_output]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS9..MS12]

---

## MILESTONE F360-REV-MS9: Multi-Axis + Mill-Turn F360 Wiring
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS2, F360-REV-MS5]
Brief: Wire existing multi-axis pipeline (MultiAxisPrintToProgramEngine) and mill-turn pipeline (MillTurnSwissPipelineEngine) to F360 AutoProgram routing. These are complete engines that need F360 integration, not rebuilding.

### SESSION S17: Multi-Axis Pipeline F360 Integration (U-MAX01..U-MAX03)
SMART CONFIG: Role=5axis_specialist + pipeline_architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE: [MultiAxisPrintToProgramEngine, AutoProgramOrchestratorEngine, PostProcessorPipelineEngine 5-axis stages, Fusion 360 multi-axis CAM API]
INTENT: [5-axis operations detected in Fusion route to the multi-axis pipeline. RTCP/TCPC compensation is handled. Multi-axis G-code goes through PPP for per-block optimization. The 5-axis machinist gets the same per-block physics optimization as 3-axis.]

WORK:
U-MAX01: Route 5-axis operations to MultiAxisPrintToProgramEngine (~120 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S6, detect multi-axis operations (simultaneous 5-axis, 3+2 positional, swarf cutting). Route to MultiAxisPrintToProgramEngine for specialized toolpath planning. Ensure tool orientation (i,j,k vectors) propagate through the pipeline to PPP for correct G-code emission (G43.4/G43.5 RTCP).
  - FILES_CREATED: src/__tests__/autoprogram-multiaxis-route.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S6, S9)
  - ABORT_CRITERIA: (1) 5-axis ops not detected; (2) Tool orientation lost in pipeline; (3) RTCP codes not emitted; (4) 3+2 positional not distinguished from simultaneous
  - ROLLBACK: git revert HEAD~1

U-MAX02: Multi-axis collision avoidance wiring (~100 LOC)
  - Wire/Build: WIRE
  - Description: Wire the existing collision checking in MultiAxisPrintToProgramEngine to the safety chain (MS1). Multi-axis moves have higher collision risk (tool holder, spindle head vs part/fixture). Feed fixture geometry from MS4 into the collision checker. If collision detected, invoke SafetyEscalationEngine.
  - FILES_CREATED: src/__tests__/multiaxis-collision-check.test.ts
  - FILES_MODIFIED: src/engines/MultiAxisPrintToProgramEngine.ts
  - ABORT_CRITERIA: (1) Collision check not using fixture geometry; (2) Collision not escalated to safety chain; (3) False negatives on known collision scenarios
  - ROLLBACK: git revert HEAD~1

U-MAX03: Multi-axis PPP dialect support verification (~80 LOC)
  - Wire/Build: WIRE
  - Description: Verify that PostProcessorPipelineEngine correctly handles multi-axis blocks (G43.4/G43.5, A/B/C axis words, inverse time feed G93/G94 switching). Add tests for each of the 6 primary dialects. Fix any dialect that doesn't emit correct 5-axis codes.
  - FILES_CREATED: src/__tests__/ppp-multiaxis-dialects.test.ts
  - FILES_MODIFIED: src/engines/PostProcessorPipelineEngine.ts (dialect fixes if needed)
  - ABORT_CRITERIA: (1) Any dialect missing G43.4/G43.5; (2) A/B/C axis not emitted; (3) G93/G94 switching not handled; (4) Inverse time feed rate wrong
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: multiaxis-orientation-guard → validates tool orientation vectors are unit vectors
  ACTION: pipelineDispatcher:run_multiaxis_program → runs full multi-axis pipeline through F360
  SKILL: /program-gen → enhanced with multi-axis mode

EXIT GATE: 5-axis routes to MultiAxis pipeline | collision check uses fixture data | PPP handles all 6 dialects for 5-axis | 0 tsc errors | all tests pass | omega_floor >= 1.0

---

### SESSION S18: Mill-Turn Pipeline F360 Integration (U-MAX04..U-MAX05)
SMART CONFIG: Role=millturn_specialist + pipeline_architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [MillTurnSwissPipelineEngine, TurningPrintToProgramEngine, TurningProgramAssemblerEngine, AutoProgramOrchestratorEngine]
INTENT: [Mill-turn operations route to MillTurnSwissPipelineEngine. Multi-channel synchronization is handled. C-axis milling and Y-axis operations produce correct G-code through PPP.]

WORK:
U-MAX04: Route mill-turn operations to MillTurnSwissPipeline (~150 LOC)
  - Wire/Build: WIRE
  - Description: In AutoProgram S6, detect mill-turn operations (turning + milling on same machine, C-axis, Y-axis, sub-spindle). Route to MillTurnSwissPipelineEngine for multi-channel program generation. Handle channel synchronization (WAIT marks, M-code sync). Route turning-only sub-operations to TurningPrintToProgramEngine.
  - FILES_CREATED: src/__tests__/autoprogram-millturn-route.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (S6, S9)
  - ABORT_CRITERIA: (1) Mill-turn not detected; (2) Multi-channel not synchronized; (3) C-axis/Y-axis operations not handled; (4) Sub-spindle handoff broken
  - ROLLBACK: git revert HEAD~1

U-MAX05: Mill-turn PPP dialect support (Mazak, Okuma, DMG) (~120 LOC)
  - Wire/Build: WIRE
  - Description: Verify/fix PostProcessorPipelineEngine for mill-turn specific codes: G12.1/G112 (polar interpolation), G7.1 (cylindrical interpolation), M-code channel sync, sub-spindle transfer (M132/M232), and bar feeder interface. Test for Mazak Smooth (QTN), Okuma Multus, and DMG CTX.
  - FILES_CREATED: src/__tests__/ppp-millturn-dialects.test.ts
  - FILES_MODIFIED: src/engines/PostProcessorPipelineEngine.ts
  - ABORT_CRITERIA: (1) Polar interpolation not emitted; (2) Channel sync codes wrong; (3) Sub-spindle codes missing; (4) Bar feeder interface broken
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: millturn-sync-validator → validates channel synchronization in mill-turn programs
  ACTION: pipelineDispatcher:run_millturn_program → full mill-turn pipeline through F360
  SKILL: /program-gen → enhanced with mill-turn mode

EXIT GATE: Mill-turn routes correctly | channels synchronized | PPP handles mill-turn dialects | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [multiaxis-orientation-guard, millturn-sync-validator]
  NEW_ACTIONS: [pipelineDispatcher:run_multiaxis_program, pipelineDispatcher:run_millturn_program]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS10..MS12]

---

## MILESTONE F360-REV-MS10: Fusion Python Bridge Hardening
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS7, F360-REV-MS8]
Brief: Harden the Python bridge for production use. Address the 150ms MIN_OP_INTERVAL constraint, add connection pooling, implement retry logic, and add telemetry. This makes all F360 API calls robust.

### SESSION S19: Bridge Rate Limiter + Connection Pool (U-BRG01..U-BRG03)
SMART CONFIG: Role=systems_engineer + python_bridge_specialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE: [fusion360-bridge.ts, Python bridge architecture, 150ms MIN_OP_INTERVAL, Fusion 360 API rate limits]
INTENT: [Bridge calls never exceed Fusion's rate limit. Connection pooling prevents socket exhaustion. Retries handle transient failures. Telemetry tracks API health.]

WORK:
U-BRG01: Rate-limited bridge call queue (~200 LOC)
  - Wire/Build: BUILD
  - Description: Create a BridgeCallQueue that enforces 150ms minimum interval between Fusion API calls. Queue uses a FIFO with priority (safety calls first, then critical, then normal). Add timeout handling: if a call exceeds 5 seconds, cancel and retry. Add circuit breaker: after 3 consecutive failures, pause for 2 seconds before retrying. This prevents the per-block API call anti-pattern by design.
  - FILES_CREATED: src/engines/bridge/BridgeCallQueue.ts, src/__tests__/bridge-call-queue.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Calls sent faster than 150ms apart; (2) Priority ordering not respected; (3) Circuit breaker not triggered on failures; (4) Timeout not enforced
  - ROLLBACK: git revert HEAD~1

U-BRG02: Bridge connection pool + health check (~150 LOC)
  - Wire/Build: BUILD
  - Description: Implement connection pooling for the Python bridge (max 3 concurrent connections). Add health check ping every 30 seconds. If health check fails, mark connection as stale and create new one. Add graceful shutdown that waits for in-flight calls before closing connections.
  - FILES_CREATED: src/engines/bridge/BridgeConnectionPool.ts, src/__tests__/bridge-connection-pool.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) >3 concurrent connections; (2) Stale connections not recycled; (3) Shutdown loses in-flight calls; (4) Health check interval not configurable
  - ROLLBACK: git revert HEAD~1

U-BRG03: Bridge telemetry + error classification (~120 LOC)
  - Wire/Build: BUILD
  - Description: Add telemetry to all bridge calls: (1) call latency histogram, (2) error rate by type (timeout, rate_limit, connection_lost, api_error), (3) queue depth over time, (4) circuit breaker state transitions. Classify errors into retryable (timeout, rate_limit) vs fatal (api_error, auth_failed). Feed into SystemHealthCheck.
  - FILES_CREATED: src/engines/bridge/BridgeTelemetry.ts, src/__tests__/bridge-telemetry.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Telemetry not recording latency; (2) Errors not classified; (3) Queue depth not tracked; (4) Telemetry overhead >1ms per call
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: bridge-rate-limit-guard → warns when code attempts to call bridge without going through queue
  ACTION: systemDispatcher:bridge_health → returns bridge health metrics
  SKILL: /system-health → enhanced with bridge health panel

EXIT GATE: Rate limiter enforces 150ms | connection pool max 3 | circuit breaker active | telemetry recording | 0 tsc errors | all tests pass | omega_floor >= 1.0

---

### SESSION S20: Bridge Integration + Batch Optimization (U-BRG04..U-BRG05)
SMART CONFIG: Role=performance_engineer + integration_architect | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=25%
KNOWLEDGE: [BridgeCallQueue, BridgeConnectionPool, BridgeTelemetry, AutoProgramOrchestratorEngine, Fusion 360 batch API]
INTENT: [All F360 pipeline stages use the bridge infrastructure. Batch API calls where possible to reduce total call count. The bridge is the single point of contact with Fusion -- no direct calls bypass it.]

WORK:
U-BRG04: Wire bridge infrastructure to all F360 pipeline stages (~200 LOC)
  - Wire/Build: WIRE
  - Description: Replace all direct Fusion API calls in AutoProgramOrchestratorEngine (S1-S10) with calls through BridgeCallQueue. Identify calls that can be batched (e.g., reading multiple features in S1, setting multiple parameters in S2). Use Fusion's batch API where available to reduce call count by ~60%.
  - FILES_CREATED: src/__tests__/autoprogram-bridge-integration.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts, src/engines/adapters/FusionSTEPImportAdapter.ts
  - ABORT_CRITERIA: (1) Any direct Fusion call bypasses queue; (2) Batch optimization not applied to S1 feature reading; (3) Total call count not reduced; (4) Bridge health not checked before pipeline start
  - ROLLBACK: git revert HEAD~1

U-BRG05: Bridge failure recovery + partial result preservation (~120 LOC)
  - Wire/Build: BUILD
  - Description: Add pipeline checkpoint capability: at each AutoProgram stage boundary (S1->S2, S2->S3, etc.), save intermediate results. If bridge fails mid-pipeline, resume from last checkpoint instead of restarting from S1. Checkpoint data stored in data/state/pipeline_checkpoints/. Add TTL of 1 hour for checkpoints.
  - FILES_CREATED: src/engines/bridge/PipelineCheckpointManager.ts, src/__tests__/pipeline-checkpoint.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts
  - ABORT_CRITERIA: (1) Checkpoint not saved at stage boundaries; (2) Resume doesn't restore correct state; (3) Stale checkpoints not expired; (4) Checkpoint data >10MB per job
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: direct-bridge-call-detector → blocks direct Fusion API calls that bypass BridgeCallQueue
  ACTION: systemDispatcher:pipeline_checkpoint_status → shows checkpoint state for active jobs
  SKILL: /status → enhanced with pipeline checkpoint info

EXIT GATE: All F360 calls through bridge queue | batch optimization applied | checkpoints at stage boundaries | resume works after failure | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [bridge-rate-limit-guard, direct-bridge-call-detector]
  NEW_ACTIONS: [systemDispatcher:bridge_health, systemDispatcher:pipeline_checkpoint_status]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS11..MS12]

---

## MILESTONE F360-REV-MS11: Quality Chain + Traceability Integration
Track: F360-REV | Status: not_started | Units: 4 | Sessions: 1
Dependencies: [F360-REV-MS3, F360-REV-MS6]
Brief: Wire the complete quality chain: SPC process capability, FAI (AS9102), metrology uncertainty, and material cert traceability into a unified quality output alongside every program. The quality package is generated automatically when AutoProgram completes.

### SESSION S21: Quality Chain Unification (U-QUA01..U-QUA04)
SMART CONFIG: Role=quality_engineer + AS9100_auditor | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE: [SPCProcessCapabilityEngine, FAIEngine (AS9102), MetrologyUncertaintyEngine, MaterialCertTraceabilityEngine, SetupSheetEngine, AutoProgramOrchestratorEngine output]
INTENT: [Every program ships with a quality package: setup sheet + inspection plan + material cert + process capability prediction. AS9100 and IATF16949 traceability is automatic. The quality manager never has to manually create these documents.]

WORK:
U-QUA01: Quality package generator at AutoProgram completion (~200 LOC)
  - Wire/Build: BUILD
  - Description: Create QualityPackageGenerator that is called after AutoProgram S10. It calls: (1) SetupSheetEngine.generate() (wired in MS4), (2) FAIEngine.generatePlan() for critical features, (3) SPCProcessCapabilityEngine.predict() for expected Cpk based on machine capability and tolerance, (4) MaterialCertTraceabilityEngine.linkCert() for material cert reference. Output a unified quality package JSON that can be rendered as PDF.
  - FILES_CREATED: src/engines/QualityPackageGenerator.ts, src/__tests__/quality-package-generator.test.ts
  - FILES_MODIFIED: src/engines/AutoProgramOrchestratorEngine.ts (post-S10)
  - ABORT_CRITERIA: (1) Any quality component missing from package; (2) FAI not generated for critical features; (3) Cpk prediction not included; (4) Material cert not linked
  - ROLLBACK: git revert HEAD~1

U-QUA02: Wire MetrologyUncertaintyEngine to inspection plan (~100 LOC)
  - Wire/Build: WIRE
  - Description: Wire MetrologyUncertaintyEngine into the FAI plan to calculate measurement uncertainty for each inspection dimension. Flag dimensions where measurement uncertainty exceeds 10% of tolerance (measurement system not adequate). Recommend measurement method and equipment based on tolerance and feature type.
  - FILES_CREATED: src/__tests__/metrology-uncertainty-fai.test.ts
  - FILES_MODIFIED: src/engines/QualityPackageGenerator.ts
  - ABORT_CRITERIA: (1) Uncertainty not calculated; (2) Inadequate measurement system not flagged; (3) Equipment recommendation missing
  - ROLLBACK: git revert HEAD~1

U-QUA03: Quality dispatcher action consolidation (~80 LOC)
  - Wire/Build: WIRE
  - Description: Consolidate quality dispatcher actions: generate_quality_package (calls QualityPackageGenerator), predict_process_capability (SPC), generate_fai_plan (AS9102), calculate_measurement_uncertainty. Ensure all existing quality actions still work.
  - FILES_CREATED: src/__tests__/quality-dispatcher-consolidated.test.ts
  - FILES_MODIFIED: src/tools/dispatchers/qualityDispatcher.ts
  - ABORT_CRITERIA: (1) New actions not callable; (2) Existing actions broken; (3) Missing Zod schemas
  - ROLLBACK: git revert HEAD~1

U-QUA04: Quality package PDF rendering (~150 LOC)
  - Wire/Build: BUILD
  - Description: Create a PDF renderer for the quality package JSON. Layout: cover page with job info, setup sheet section, tool list, inspection plan with GD&T callouts, process capability predictions, material cert references, and approval signatures block. Use the existing PDF generation infrastructure.
  - FILES_CREATED: src/engines/QualityPackagePDFRenderer.ts, src/__tests__/quality-package-pdf.test.ts
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) PDF not generated; (2) Missing sections; (3) GD&T callouts not rendered; (4) Cpk predictions not shown
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: quality-package-completeness-guard → blocks program release when quality package incomplete
  ACTION: qualityDispatcher:generate_quality_package → full quality package generation
  SKILL: /quality-gate → enhanced with auto-generated quality package

EXIT GATE: Quality package auto-generated | FAI plan for critical features | Cpk predicted | measurement uncertainty calculated | PDF rendered | 0 tsc errors | all tests pass | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [quality-package-completeness-guard]
  NEW_ACTIONS: [qualityDispatcher:generate_quality_package, qualityDispatcher:predict_process_capability, qualityDispatcher:generate_fai_plan, qualityDispatcher:calculate_measurement_uncertainty]
  NEW_SKILLS: []
  AVAILABLE_TO: [MS12]

---

## MILESTONE F360-REV-MS12: End-to-End Integration Testing + Release Gate
Track: F360-REV | Status: not_started | Units: 5 | Sessions: 2
Dependencies: [F360-REV-MS1..MS11]
Brief: Full integration testing of the complete F360-REV pipeline. Test 5 representative parts through the entire chain: print -> DFM -> geometry -> Fusion -> AutoProgram (with probing, surface integrity, workholding, setup sheet, quality package) -> PPP/.cps -> G-code. Validate against reference programs from production shops.

### SESSION S22: Integration Test Suite + Release Gate (U-INT01..U-INT05)
SMART CONFIG: Role=integration_test_lead + manufacturing_engineer + quality_auditor | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE: [All engines from MS1-MS11, production reference programs, industry benchmark parts]
INTENT: [The entire F360-REV pipeline works end-to-end for 5 representative part types. G-code output matches or exceeds human-programmed reference programs. No safety regressions. Release candidate is validated.]

WORK:
U-INT01: Test Part 1 — Simple 3-axis prismatic (6061-T6, VMC) (~150 LOC)
  - Wire/Build: BUILD
  - Description: End-to-end test with a simple prismatic part: face mill, pocket, drill pattern, tap. Verify: DFM passes, stock allowance correct, workholding recommended, probe routine inserted, per-block S/F optimized, setup sheet generated, quality package complete. Compare cycle time to reference program.
  - FILES_CREATED: src/__tests__/e2e/e2e-prismatic-3axis.test.ts, src/__tests__/e2e/fixtures/prismatic-part.json
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Pipeline fails at any stage; (2) Cycle time >110% of reference; (3) Safety gate not triggered; (4) Quality package incomplete
  - ROLLBACK: git revert HEAD~1

U-INT02: Test Part 2 — 5-axis aerospace (Ti-6Al-4V, 5-axis VMC) (~150 LOC)
  - Wire/Build: BUILD
  - Description: 5-axis contour milling of titanium aerospace bracket. Verify: correct material physics (kc1.1=1700 for Ti), RTCP compensation, thermal pre-compute, white layer check for thin walls, surface integrity prediction, multi-axis collision avoidance.
  - FILES_CREATED: src/__tests__/e2e/e2e-5axis-aerospace.test.ts, src/__tests__/e2e/fixtures/aerospace-bracket.json
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Wrong kc1.1 for Ti-6Al-4V; (2) RTCP not applied; (3) White layer not flagged for thin walls; (4) Collision not detected for known interference
  - ROLLBACK: git revert HEAD~1

U-INT03: Test Part 3 — Mill-turn shaft (4340 steel, CNC lathe + live tools) (~150 LOC)
  - Wire/Build: BUILD
  - Description: Mill-turn shaft with OD turning, grooving, C-axis milling flats, and cross-drilled holes. Verify: correct routing to MillTurnSwissPipeline, channel synchronization, turning-specific S/F (G96 CSS), C-axis rigid tapping, setup sheet with sub-spindle handoff instructions.
  - FILES_CREATED: src/__tests__/e2e/e2e-millturn-shaft.test.ts, src/__tests__/e2e/fixtures/millturn-shaft.json
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Turning ops not routed to turning pipeline; (2) G96 not used for OD turning; (3) Channel sync missing; (4) Sub-spindle handoff not in setup sheet
  - ROLLBACK: git revert HEAD~1

U-INT04: Test Part 4 — Grinding finish (D2 tool steel, surface grinder) (~100 LOC)
  - Wire/Build: BUILD
  - Description: Surface grinding of hardened D2 gauge block. Verify: routing to GrindingProgramAssembler, dressing optimization, surface finish prediction matches target Ra, heat treatment response accounted for (HRC 60-62), residual stress prediction.
  - FILES_CREATED: src/__tests__/e2e/e2e-grinding-d2.test.ts, src/__tests__/e2e/fixtures/grinding-block.json
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Not routed to grinding pipeline; (2) Dressing not optimized; (3) Ra prediction outside 20% of target; (4) Heat treatment not accounted for
  - ROLLBACK: git revert HEAD~1

U-INT05: Test Part 5 — Wire EDM die component (A2 tool steel, wire EDM) (~100 LOC)
  - Wire/Build: BUILD
  - Description: Wire EDM of die cavity with 4 skim passes. Verify: routing to EDMProgramAssembler, feasibility check passes, multi-pass strategy optimized, recast layer predicted, material cert linked, quality package includes EDM-specific inspection points.
  - FILES_CREATED: src/__tests__/e2e/e2e-wire-edm-die.test.ts, src/__tests__/e2e/fixtures/edm-die-cavity.json
  - FILES_MODIFIED: []
  - ABORT_CRITERIA: (1) Not routed to EDM pipeline; (2) Feasibility not checked; (3) Recast layer not predicted; (4) Quality package missing EDM inspection points
  - ROLLBACK: git revert HEAD~1

FORGE-TRIPLE:
  HOOK: release-gate-guard → blocks any release tag when e2e tests are not all green
  ACTION: systemDispatcher:run_e2e_integration → runs full e2e test suite
  SKILL: /release-ready → enhanced with F360-REV e2e validation

EXIT GATE: 5/5 e2e tests pass | all safety gates verified | per-block S/F in all outputs | quality packages complete | cycle times within 110% of reference | 0 tsc errors | ALL tests pass (111+ original + ~45 new) | omega_floor >= 1.0

FEATURE CASCADE:
  NEW_HOOKS: [release-gate-guard]
  NEW_ACTIONS: [systemDispatcher:run_e2e_integration]
  NEW_SKILLS: []
  AVAILABLE_TO: [] (final milestone)

---

## ROADMAP SUMMARY

| MS | Title | Units | Wire | Build | Fix | Sessions | Key Deliverable |
|----|-------|-------|------|-------|-----|----------|-----------------|
| MS1 | Safety Hardening | 5 | 1 | 1 | 3 | 2 | Fail-close everywhere, kc1.1 consolidated |
| MS2 | PPP Integration | 5 | 1 | 3 | 1 | 2 | AutoProgram S10 routes through PPP, per-block S/F |
| MS3 | Probing + Surface Integrity | 5 | 5 | 0 | 0 | 2 | 6 probe engines + 3 surface engines wired |
| MS4 | Workholding + Fixture + Setup | 5 | 5 | 0 | 0 | 2 | 14 engines wired, setup sheets auto-generated |
| MS5 | Grinding + EDM Pipeline | 5 | 5 | 0 | 0 | 2 | 31 engines wired as routing steps |
| MS6 | DFM + Heat Treat + Material Cert | 5 | 5 | 0 | 0 | 2 | DFM gate active, heat treatment in S/F |
| MS7 | PrintToGeometry STEP Bridge | 4 | 1 | 2 | 0 | 2 | STEP export/import replaces executeCode() |
| MS8 | .cps Post Strategy | 5 | 1 | 4 | 0 | 2 | External .cps with per-block S/F, 6 dialects |
| MS9 | Multi-Axis + Mill-Turn | 5 | 5 | 0 | 0 | 2 | 5-axis + mill-turn routed correctly |
| MS10 | Bridge Hardening | 5 | 1 | 4 | 0 | 2 | Rate limiter, connection pool, telemetry |
| MS11 | Quality Chain | 4 | 2 | 2 | 0 | 1 | Auto quality package with every program |
| MS12 | E2E Integration Testing | 5 | 0 | 5 | 0 | 2 | 5 representative parts validated end-to-end |
| **TOTAL** | | **58** | **32 (55%)** | **21 (36%)** | **5 (9%)** | **23** | |

### WIRE vs BUILD RATIO: 55% wire + 36% build + 9% fix = close to 60/40 wire/build target

### CRITICAL PATH:
MS1 → MS2 → MS3/MS4/MS5 (parallel) → MS6 → MS7 → MS8 → MS9 (parallel with MS10) → MS11 → MS12

### ESTIMATED LOC DELTA: ~6,800 LOC new/modified + ~45 new test files

### SAFETY ARCHITECTURE:
- MS1 S1: All 9 safety engines fail-close (FIX)
- MS1 S2: kc1.1 consolidated, drift hook (FIX)
- MS2 S3: PPP safety gate in AutoProgram (WIRE)
- MS3 S6: White layer risk gate (WIRE)
- MS4 S7: Fixture collision guard (WIRE)
- MS5 S9/S10: Grinding wheel check, EDM feasibility gate (WIRE)
- MS8 S15: .cps dialect validator (BUILD)
- MS12 S22: Release gate guard (BUILD)

### HOOKS CREATED: 20 new hooks
### ACTIONS CREATED: ~35 new dispatcher actions
### ENGINES CREATED: ~8 new engines (adapter, cache, template, generator, renderer)
### ENGINES WIRED: ~65 existing engines wired to F360 pipeline

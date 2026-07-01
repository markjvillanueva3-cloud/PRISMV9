# GAP CLOSURE AUDIT — Meta-Meta-Evaluation
## Auditor: GAP CLOSURE AUDITOR (Claude)
## Date: 2026-04-03
## Basis: Direct codebase inspection of H:/prism/mcp-server/src/

---

## METHODOLOGY

All scores are based on GROUND TRUTH from the codebase, not proposals. Each claim from Loop 2/3 was verified against actual TypeScript source files, dispatcher wiring, and schema definitions.

---

## CATEGORY 1: GAP 1-3 CLOSURE QUALITY
### Gaps: CAD Workflow (MS0), Toolpath Injection, "400+ params" FALSE

**Gap 1 — CAD Workflow / MS0 (Print-to-CAD)**
- CadQueryCodeGeneratorEngine.ts EXISTS and has a geometry pattern reference file embedded as a system prompt (~30 patterns documented)
- Fusion360CodeGeneratorEngine.ts EXISTS (176+ sketch snippet templates confirmed)
- Fusion360LiveBridgeEngine.ts EXISTS with health checks and pipeline dispatch
- BUT: Loop 3 finding that only 6/40+ patterns match during CadQuery→Fusion translation is NOT refuted by the code. The CadQueryCodeGeneratorEngine contains PATTERNS as documentation strings (rarray, polarArray, extrude, loft, etc.) but no Fusion 360 translator. The Fusion360CodeGeneratorEngine handles Fusion API calls, not CadQuery→F360 conversion. The bridge between the two (CadQuery STEP export → Fusion import vs. direct API recreation) remains unresolved.
- DirectEdit API reliability concern from Loop 3 is VALID — the Fusion360CodeGeneratorEngine uses sketch-level API patterns but there is no evidence of DirectEdit being used or tested on imported/curved geometry.
- VERDICT: MS0 fix is architecturally present but the specific translation gap (6/40 patterns) is unaddressed by the proposed fix. Adding 6 units to MS0 does not close the pattern coverage gap.

**Gap 2 — Toolpath Injection (MS7 → external .cps)**
- CpsDialectMapperEngine.ts and CpsPostParserEngine.ts EXIST and are production-grade
- FusionCPSParserEngine.ts EXISTS — can parse .cps post-processor files
- The proposed fix (re-scope to external .cps post-processor rather than injecting into F360 CAM) is architecturally sound and IMPLEMENTABLE
- The engines are wired through camDispatcher (CPS-related actions present)
- VERDICT: This fix is REAL and EXECUTABLE. Loop 2's proposed re-scope matches what already exists in the engine layer.

**Gap 3 — "400+ params" FALSE → corrected to 25-40**
- camActionSchemas.ts confirms: toolpath_generate has ~5 core params, post_process has ~3. Schemas use .passthrough() extensively.
- The correction from "400+" to "25-40 per operation" is ACCURATE based on schema inspection
- calcActionSchemas.ts has 363 z.object() schemas but these are ACROSS 363+ distinct actions, not per-operation parameters
- VERDICT: Correction is valid. This is a documentation fix, not a code change. Low risk.

**SCORE — Gap 1-3 Closure Quality: 52/100**
- Gap 1: Partial (30/100) — CAD engines exist but translation gap and DirectEdit unreliability remain open
- Gap 2: Strong (85/100) — CPS re-scope is sound and engines exist
- Gap 3: Complete (95/100) — documentation correction only, no code change needed

---

## CATEGORY 2: GAP 4-6 CLOSURE QUALITY
### Gaps: 5-Axis Output, Operation Ordering, Heat Treatment

**Gap 4 — 5-Axis Output Missing → Add {i,j,k,a,b,c} to ToolpathSegment**
- CRITICAL FINDING: There are TWO divergent ToolpathSegment definitions in the codebase:
  1. ToolpathGenerationEngine.ts line 44: `{ type, x, y, z, i, j, feed, description }` — i/j are arc CENTER OFFSETS, NOT tool axis vectors. No k. No a/b/c.
  2. ToolpathSegmentOptimizerEngine.ts line 13: `{ id, type, start[3], end[3], arc_center[2], arc_radius, feed, radial_depth, axial_depth }` — NO tool axis at all.
  3. FiveAxisPostEngine.ts defines FiveAxisBlock: `{ x, y, z, a?, b?, c?, feed, tool_axis?: {i,j,k} }` — this is CORRECT but separate from ToolpathSegment.
  4. FiveAxisToolpathIntegrationEngine.ts uses FATIToolpathPoint with `tool_axis?: FATIVec3` — also separate.
- The proposed fix "add {i,j,k,a,b,c} to ToolpathSegment" is INCOMPLETE because there are multiple ToolpathSegment definitions and the fix only targets one. The 5-axis data structures already exist in FiveAxisPostEngine and FATI but they are disconnected from the main ToolpathSegment used by PrintToProgramPipelineEngine and ToolpathGenerationEngine.
- VERDICT: The fix correctly identifies the gap but the proposed solution (adding to a single interface) is insufficient — requires unifying 4 different segment types.

**Gap 5 — Operation Ordering INVERTED → Invert TYPE_PRIORITY, add face_mill**
- CRITICAL FINDING: OperationSequencerEngine.ts TYPE_PRIORITY IS ALREADY CORRECT:
  `drill: 1, bore: 2, thread: 3, rough: 4, pocket: 5, slot: 6, semi_finish: 7, profile: 8, finish: 9, chamfer: 10, deburr: 11`
  Lower number = runs FIRST. Drill before rough before finish. This is CORRECT manufacturing practice.
- Loop 2's claim that ordering was "INVERTED" is NOT confirmed by the code. The sequencer correctly places drilling before roughing before finishing.
- HOWEVER: `face_mill` is NOT in OperationType. The type union is: rough|semi_finish|finish|drill|bore|thread|deburr|chamfer|slot|pocket|profile. Face milling is handled in ToolpathGenerationEngine's STRATEGY_MAP (face → face_mill strategy) but the OperationSequencerEngine has no concept of it.
- VERDICT: The "invert TYPE_PRIORITY" fix is solving a problem that may not exist in current code. Adding face_mill to OperationType is valid and needed.

**Gap 6 — Heat Treatment Not in Process Plan → Add RoutingStep**
- RoutingStep concept DOES EXIST — in ERPIntegrationEngine.ts (line 178: `export interface RoutingStep`) and E2ShopConnectorEngine.ts (line 58: `export interface E2RoutingStep`)
- However, these are ERP-facing routing steps for job tracking, NOT process planning sequence steps that insert heat treatment between machining operations.
- Heat treatment schemas exist in calcActionSchemas.ts (heat_treat_predict, heat_treat_recommend) and calcDispatcher routes to them
- BUT: There is no integration between HeatTreatmentEngine and process_plan_generate/process_plan_optimize actions
- VERDICT: The concept exists but is siloed. The fix is partially real but wiring HeatTreatmentEngine into process_plan_generate requires non-trivial dispatcher work.

**SCORE — Gap 4-6 Closure Quality: 44/100**
- Gap 4: Weak (35/100) — multiple segment types not addressed, unification needed
- Gap 5: Moderate (55/100) — ordering was already correct, face_mill addition is real
- Gap 6: Moderate (45/100) — RoutingStep exists but process plan integration is absent

---

## CATEGORY 3: GAP 7-10 CLOSURE QUALITY
### Gaps: Surface Integrity, Auth, Setup Sheets, Multi-User/Offline

**Gap 7 — Surface Integrity NOT Wired → Wire into MS5 per-op analysis**
- Surface integrity engines ARE wired in dispatchers: calcDispatcher has surface_integrity_predict, surface_integrity_full, surface_integrity_predictor_calc; machineSetupDispatcher has surface_integrity_assess; grindingDispatcher has surface_integrity; camDispatcher has math_surface_integrity.
- HOWEVER: PrintToProgramPipelineEngine.ts has ZERO references to surface_integrity. MultiAxisPrintToProgramEngine.ts has ZERO. PostProcessorPipelineEngine.ts has ZERO.
- The proposed "per-op analysis in MS5" fix requires inserting SurfaceIntegrityEngine/SurfaceIntegrityPredictorEngine calls into PrintToProgramPipelineEngine per operation block — this code does NOT exist.
- VERDICT: Engines exist. Dispatcher routes exist. Pipeline integration does NOT exist. The fix claim is premature.

**Gap 8 — Auth is HS256 Not RS256 → Switch to RS256**
- CONFIRMED: auth.ts line 665 and AuthEngineV7.ts lines 186/220/254 ALL use HS256.
- auth.__tests__/auth-v7.test.ts line 192 ASSERTS `algorithm === "HS256"` — switching to RS256 will BREAK THIS TEST.
- CertificateEngine.ts does use Ed25519 key pairs (asymmetric) but this is for certificate signing, not JWT auth.
- RS256 requires private/public key infrastructure, jose library already used (imported via setProtectedHeader), so the jose library supports it.
- The proposed fix is TECHNICALLY correct but:
  1. Test anti-regression will fail (test asserts HS256)
  2. Requires key management (key generation, rotation, storage) — no key management infrastructure exists
  3. Requires updating all JWT verification paths (auth.ts verifyToken)
- VERDICT: Fix is NECESSARY but DISRUPTIVE. Estimated at 2-3 days of work plus key infrastructure setup. The "easy switch" framing in Loop 2 is misleading.

**Gap 9 — No Setup Sheets → Add to MS5**
- Setup sheet engines are HEAVILY wired already: intelligenceDispatcher has setup_sheet, setup_sheet_format, setup_sheet_template; camDispatcher has setup_sheet_generate; l2EngineDispatcher has report_setup_sheet; qualityDispatcher has blueprint_setup_sheet; exportDispatcher has render_setup_sheet; machineLiveDispatcher has kiosk_setup_sheet.
- SetupSheetEngine.ts, SetupSheetLibraryEngine.ts, SetupSheetFromGCodeEngine.ts all exist.
- Loop 2's claim "No Setup Sheets" is FACTUALLY WRONG based on the codebase. Setup sheets are one of the most wired features.
- The "fix" is closing a gap that was already closed before Loop 2 ran. This is a FALSE POSITIVE gap.
- VERDICT: This gap was already closed. Loop 2 should score poorly for identifying it as missing.

**Gap 10 — No Multi-User/Offline → Add to MS1**
- MultiTenantEngine.ts EXISTS (706 lines, MultiTenantConfig, tenant isolation).
- NO references to offline mode, sync conflict resolution, CRDT, or eventual consistency found anywhere in the codebase.
- The fix "Add to MS1" is proposing NEW infrastructure (offline sync) that has zero existing foundation beyond multi-tenancy.
- VERDICT: Multi-tenant exists. Offline/sync is genuinely missing. The fix is valid but the scope is larger than "add to MS1" implies — this requires client-side storage, sync protocol, conflict resolution, and connectivity detection.

**SCORE — Gap 7-10 Closure Quality: 51/100**
- Gap 7: Weak (35/100) — pipeline integration missing despite engines existing
- Gap 8: Moderate (55/100) — fix is correct but disruptive/incomplete as framed
- Gap 9: False positive (20/100) — gap doesn't exist; identifying it damages audit credibility
- Gap 10: Moderate (55/100) — multi-tenant exists, offline is genuinely missing but larger than framed

---

## CATEGORY 4: NEW GAPS INTRODUCED
### Did proposed fixes create NEW problems?

**New Gaps from Loop 2 Fixes:**

1. **ToolpathSegment unification** — If the fix adds {i,j,k,a,b,c} to one ToolpathSegment definition but not the other three, it creates a TYPE FORK. Engines expecting flat {x,y,z} segments will receive objects with additional required fields, causing TypeScript errors or silent data loss.

2. **RS256 migration** — Switching auth will invalidate ALL existing HS256 tokens in circulation. There is no migration path or graceful degradation period in the proposed fix.

3. **kc1_1 divergence is REAL and WORSE than reported** — Loop 3 found 3 divergent kc1.1 tables. Actual count from code inspection: at least 8+ engines inline their own kc1_1 tables without importing CANONICAL_KIENZLE: FinishingPassOptimizationEngine (3500 for H group vs canonical 3200), OptimalStrategySelectionEngine (N=800 vs canonical 700), RealTimeMachineIntelligenceEngine (H=3500 vs canonical 3200), MillTurnCAMEngine, ProductionToolpathEngine, SamplingWorkflowEngine, ProcessSynthesisEngine, MachineLearningFeedbackEngine. These diverge from the canonical source. No proposed fix addresses systematic Kienzle constant non-compliance.

4. **face_mill added to OperationType without adding to TYPE_PRIORITY** — If face_mill is added to the OperationType union but not to the TYPE_PRIORITY Record, TypeScript will flag a missing key in the Record, breaking the build.

5. **Grinding/EDM wiring gap** — GrindingProgramAssemblerEngine is wired to camDispatcher (line 362, 2610-2632) for 5 actions, but the primary grindingDispatcher (prism_grinding) has no reference to it. This means the grinding program assembler is reachable only through the CAM dispatcher, not the dedicated grinding dispatcher. This creates routing confusion.

**SCORE — New Gaps Introduced: 38/100**
(100 = no new gaps, 0 = many new gaps)
Multiple significant new gaps are introduced or pre-existing gaps are being MISSED by the proposed fixes.

---

## CATEGORY 5: ARCHITECTURE DEBT
### Is "wire existing engines" sound or spaghetti?

**Positive findings:**
- The engine-first, dispatcher-second architecture is sound in principle
- Lazy imports in dispatchers prevent circular dependency chains
- AtomicValue return pattern provides consistent uncertainty propagation
- Safety hooks at post-calculate and pre-gcode phases are genuinely blocking (not just warnings)
- The 9 production pipelines (PrintToProgram etc.) are real end-to-end execution paths

**Debt findings:**
- The "wire existing engines" approach is creating DISPATCHER SPRAWL. Surface integrity alone is wired in 5 different dispatchers (calc, machineSetup, grinding, cam, quality). There is no canonical "surface integrity pipeline" — callers must know which dispatcher to call for which context.
- Two incompatible ToolpathSegment types co-existing creates integration ambiguity. Any new engine must guess which one to implement against.
- kc1_1 constant divergence in 8+ engines means physics results are NOT reproducible across engines for the same input. This is a correctness debt, not just a style issue.
- Setup sheet wiring across 6 dispatchers means changes to SetupSheetEngine require testing 6 dispatcher paths.
- F360 as a silo (Loop 3 finding): Fusion360LiveBridgeEngine has a pipeline but there is no evidence it is called from PrintToProgramPipelineEngine or any of the 9 manufacturing pipelines. It appears to be an independent bridge, not integrated into the manufacturing flow.
- The fail-open catches in SafetyQualityHooks (lines 247, 250) are REAL safety concerns: if machineHandbookRegistry lookup fails, the safety check falls through to generic limits. For a safety-critical system, this should be a hard fail, not a silent fallback.

**SCORE — Architecture Debt: 45/100**
(100 = clean, 0 = irredeemable spaghetti)
The foundation is sound but the "add it everywhere" wiring strategy is accumulating technical debt faster than it is being paid down.

---

## CATEGORY 6: EXECUTION RISK
### Can these fixes be implemented without destabilizing the system?

**Low-risk fixes (can implement safely):**
- Correcting param count documentation (Gap 3): zero code change
- Adding face_mill to OperationType + TYPE_PRIORITY: 2 file changes, 1 test update
- CPS re-scope for MS7 (Gap 2): engines exist, dispatcher routing is already present

**Medium-risk fixes:**
- Heat treatment RoutingStep integration into process_plan_generate: requires careful dispatcher changes, existing heat_treat_* actions already wired so no new engines needed
- Adding {i,j,k,a,b,c} to ONE ToolpathSegment definition: must be done carefully to avoid breaking the two existing ToolpathSegment types

**High-risk fixes:**
- RS256 migration: token invalidation, key management, test suite breakage (auth-v7.test.ts explicitly asserts HS256). This is a MULTI-DAY breaking change with no rollback path once deployed.
- Surface integrity per-op wiring in PrintToProgramPipelineEngine: the pipeline is 1000+ LOC, adding per-block engine calls introduces performance risk (Loop 3 confirmed <2ms budget already under pressure from SLD+thermal)
- MS0 CadQuery→Fusion translation gap: only 6/40+ patterns covered, expanding to 40+ requires writing 34+ new translation mappings, each needing Fusion 360 API testing

**Systemic risk:**
- kc1_1 constant divergence: fixing this across 8+ engines simultaneously risks regression in tests that hardcode expected outputs against the WRONG canonical values
- The 808 test files provide a strong regression net, but 0 tsc errors does NOT mean the physics is correct — TypeScript cannot validate that kc1_1=3500 is wrong for group H

**SCORE — Execution Risk: 42/100**
(100 = zero risk, 0 = high risk of destabilization)
Two fixes (RS256, surface integrity per-op) carry substantial destabilization risk. The kc1_1 divergence is a silent correctness risk that neither Loop 2 nor Loop 3 has proposed a fix for.

---

## FINAL SCORECARD

| Category | Score | Grade |
|----------|-------|-------|
| Gap 1-3 Closure Quality | 52/100 | D+ |
| Gap 4-6 Closure Quality | 44/100 | F+ |
| Gap 7-10 Closure Quality | 51/100 | D+ |
| New Gaps Introduced | 38/100 | F |
| Architecture Debt | 45/100 | F+ |
| Execution Risk | 42/100 | F+ |
| **COMPOSITE** | **45/100** | **F+** |

---

## THE FINAL WORD

### What Loop 2 + Loop 3 got RIGHT:
1. HS256 → RS256 is a real security gap and must be fixed
2. CPS re-scope for toolpath injection is architecturally sound
3. "400+ params" correction is accurate
4. CadQuery→Fusion translation gap is real (6/40 patterns)
5. F360 silo isolation is confirmed
6. Fail-open safety paths in hooks are confirmed

### What Loop 2 + Loop 3 got WRONG or MISSED:
1. **Setup Sheets (Gap 9) are NOT missing.** This is a Loop 2 false positive — 6 dispatchers already wire setup sheet engines. This casts doubt on the thoroughness of the Loop 2 analysis.
2. **Operation ordering was NOT inverted.** TYPE_PRIORITY is correct. Proposing to invert a correct priority table is an ANTI-FIX.
3. **kc1_1 constant divergence in 8+ engines** is the single largest silent correctness risk in the codebase. Neither loop proposed fixing it systematically. This divergence is worse than reported: FinishingPassOptimization and RealTimeMachineIntelligence use kc1_1=3500 for H group; canonical is 3200. This is a ~9% error in cutting force predictions for hardened steel.
4. **ToolpathSegment has 4 definitions, not 1.** Adding {i,j,k,a,b,c} to one definition while leaving three others unchanged creates silent type divergence.
5. **GrindingProgramAssemblerEngine routing confusion** — wired through camDispatcher but not grindingDispatcher. Neither loop flagged this.
6. **Surface integrity "per-op" wiring has a performance budget collision** — Loop 3 found the <2ms budget is already broken by SLD+thermal. Adding per-op SurfaceIntegrityEngine calls makes this worse, not better.

### THE META-VERDICT:
The proposed fixes from Loops 2 and 3 close approximately 40-45% of the actual gaps and introduce several new ones. The most dangerous proposed fix is RS256 migration (valid but disruptive without a migration plan). The most damaging false recommendation is inverting TYPE_PRIORITY (would break correct operation ordering). The most significant MISSED gap across all three loops is the kc1_1 constant fragmentation across 8+ engines — this is a physics correctness problem, not a wiring problem, and it affects every cutting force, power, and tool life calculation in the system.

**A fourth loop is warranted, focused on:**
1. kc1_1 constant consolidation (import CANONICAL_KIENZLE everywhere)
2. ToolpathSegment unification across all 4 definitions
3. RS256 migration with token transition plan
4. GrindingProgramAssembler routing fix (add to grindingDispatcher)
5. Retest Gap 9 (setup sheets) — remove from gap list
6. Retest Gap 5 (ordering) — confirm correct or provide evidence of inversion

**Omega score for the proposed fix set as-is: 0.45 — not production-safe.**

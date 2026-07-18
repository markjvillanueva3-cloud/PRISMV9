<!-- delta CAD task queue — updated 2026-06-10 post galaxy-mining (loop f593aee3 iter7). The queue toward the closed-loop, 100%-accurate-to-print complex-CAD goal. Authoritative roadmap detail: state/shared/delta-goal-roadmap-2026-06-09.md (P0-P10).
  >> SUPERSEDED for single-read regain by state/shared/DELTA-CONTEXT-LEDGER.md (2026-06-10, loop 0e708167) — the ledger reconciles this narrative against git reality (today's 18 commits closed P8/6-series; P-items re-ranked by ROI). This file remains the loop-by-loop PROVEN narration; the ledger is the glance surface. -->


# Delta CAD Task Queue — toward closed-loop 100%-accurate complex-CAD

**Updated:** 2026-06-10 (post cad+cam galaxy transcript-mining + synthesis-refresh).
**Goal:** closed-loop testing + template generation + highly-efficient, fully-optimized, 100%-accurate-to-print CAD models.
**Operating model:** ultracode-plan / Ollama-grunt / Claude-build.

## DONE this session (loop f593aee3, iters 1-7)
- A1 `c6748e2a11` — archetype labeler dead retired-tag -> dynamic strongest-installed-model select.
- U-A1B `2efed07642` — residual ReferenceError fix + `--limit` + 120s timeout.
- U-DRAWMAX-JSON-REPAIR `2df2a61ed3` — CAD-DRAW-MAX-MS1.json envelope was unparseable -> fixed (22 keys).
- U-CADATOMICOPS-WIRE-VERIFY — confirmed wired (stale flag).
- Galaxy mining (cad+cam via Ollama) + synthesis-refresh — brains refreshed; newly mined cad/928a8226, cam/501bd704, cam/64f4f477 (rest already mined by kilo 2026-06-09).

## QUEUE (dependency-ordered — execute on a FRESH context per item; P1 merge needs a clean window)
| # | unit | why / blocks | route |
|---|------|--------------|-------|
| **P1** | `U-MERGE-SLOT-DELTA` | merge slot/delta (409 commits, incl CAD-TRAINING-PIPELINE) -> cad-fusion-live-ms0 trunk; every later phase builds on a single truthful trunk | ULTRACODE-PLAN + CLAUDE-BUILD (HEAVY — fresh context) |
| P1 | `U-RECONCILE-UAI-ENGINE-STATUS` | reconcile U-AI-01..15 envelope `not_started` vs shipped engines (grep on disk) — ZERO rebuild of shipped | OLLAMA-GRUNT search + CLAUDE verdict |
| P1 | `U-BRIDGE-CAD-CAM-ENROLL` | enroll CadCamHandoffEngine (331 LOC, wired) into FEATURE-GAP-AUDIT-MS0.json | CLAUDE-BUILD (XS) |
| **P2** | keystone durable GPU batch-runner | resumable cursor + stream-append + process.exitCode; unblocks all corpus drains (OCR/embed/catalog) | CLAUDE-BUILD |
| **P3** | Ollama offload wiring (pre-warm + queue) | make the LLM path reliably succeed under GPU contention (A1/U-A1B abort cause); raise offload 7%->30% | CLAUDE-BUILD |
| **P4** | live Fusion bridge substrate + revolute-assembly LIVE proof (`:18365`) | first real live round-trip — never executed | CLAUDE-BUILD |
| **P5** | corpus throughput (Blackwell): multi-VLM OCR 7,794 prints, GPU re-embed, STEP catalog 33%->100% | feeds the closed loop | OLLAMA-GRUNT + CLAUDE |
| **P6** | `CAD-FEATURE-RECOGNITION-MS0` ⭐ | BREP->authoring-feature tree — THE crux; breaks STEP-no-history ceiling | CLAUDE-BUILD (HARD) |
| **P7** | smooth-solid gen (loft/sweep/spline emitters) + intent->op-sequence planner | kills faceted prism-stacks | CLAUDE-BUILD |
| **P8** | measure-correct: Hausdorff surface-deviation metric + per-feature correction | honest 100%-to-print measurement | CLAUDE-BUILD |
| **P9** | close the learn loop: fix-ledger -> trainer retrain + xproc_outcome_publish to india | loop "closes" when next pass needs fewer corrections | CLAUDE-BUILD + india |
| **P10** | scale to complex (multi-feature trees, datums, patterns, assemblies) | the final clear: 10-50 interdependent features gen/corrected/learned | CLAUDE-BUILD |

## Notes
- P1 merge is the single structural unblock; do it FIRST on a fresh context (409 commits + conflict resolution is unsafe in a near-full window).
- Mining confirmed: kilo already mined most cam/cad transcripts (reference_kilo_queue_false_positives + the 2026-06-09 GALAXY-TRANSCRIPT-MINE) — incremental yield small; no major new units surfaced.

## DONE iters 9-10 (loop f593aee3, post-compact window)
- `c98911a48f` U-DELTA-SESSION-ARTIFACTS — committed orphaned session artifacts (transcript-digest.mjs reusable tool + 4 briefing/plan/roadmap/queue MDs). Named test-debt: transcript-digest.mjs ships without a hermetic unit test (session utility, proven live on 122MB transcript) — follow-up.
- `8c542f3c92` U-RECONCILE-UAI-ENGINE-STATUS — verify-only reconcile of CAD-COMPLETE-MS0 PHASE-51 (U-AI-01..15). 6 claimed `not_started` are SHIPPED+wired (CADFallbackRouting/CADWorldModel/UnitOfMeasureDisambiguation/CADAppCircuitBreaker/RiskTierClassifier/FederatedLearning) -> flipped to `shipped` (minimal 6-line diff). Prevents rebuild of 6 shipped engines.
- P1 MERGE SCOPED: slot/delta 410-ahead, only **19 conflict files** — BUT they include the dangerous ones (`.claude/settings.json` = fleet hook wiring, `CLAUDE.md`, `cadDispatcher.ts` 564-action core, `wiki/index+log`). Feasible but needs a DEDICATED careful session (per-conflict union-resolution + build/test + fleet-quiet window), NOT mid-loop. 25,677 untracked files in shared trunk = never `git add .`.

## NEXT BATCH — FUNCTIONAL RECONCILE FIRST, then build only the genuinely-novel (recommend /loop here)
CORRECTION (iter11 functional-dedup, supersedes a premature "build 9 engines"): exact-NAME absence != FUNCTION absence. 4 of the 9 "missing" U-AI engines have substantive, dispatcher-wired equivalents already on disk — building them new would trip DuplicationGuard (R8). Reconcile (enroll/alias the equivalent or close the unit), DO NOT rebuild:
- U-AI-08 CADOpTransactionEngine  -> **CADTransactionEngine.ts** (513 LOC, cadDispatcher) — atomic CAD op + rollback; near-exact.
- U-AI-13 DFMPhysicsGateEngine     -> **DFMPipelineEngine.ts** (857) + **DfMRulesEngine.ts** (630) + DFMAwareGenerationEngine — manufacturability gate already covered.
- U-AI-06 HierarchicalTaskPlannerEngine -> **CADOperationPlannerEngine.ts** (631, cadAutomationDispatcher) + ComplexPartPlannerEngine.
- U-AI-11 SecondOpinionConsensusEngine  -> **CADConsensusEngine.ts** (449, cadDispatcher) + ConsensusCoordinatorEngine + MultiModelConsensusEngine.
FULL 9-ENGINE DEDUP COMPLETE (iter12, grep-enumeration of all 9 — supersedes "5 unchecked"):
- LIKELY SATISFIED by existing wired equiv (verify via /dedup, then enroll/extend — do NOT rebuild):
  - U-AI-05 VoiceIntentInputEngine        -> MobileVoiceEngine.ts (voice input already exists)
  - U-AI-10 EndToEndSpanTraceEngine       -> ActionTraceEngine + AutomationChainTelemetryEngine + DeepLogicTraceEngine
  - U-AI-07 MultiStepPreviewEngine        -> CADPreviewEngine.ts (+ThumbnailCache) — preview exists; "multi-step" variant may need a thin extension
- LEAN-NOVEL, needs functional verify (Conversation* engines are mgmt, not intent-refinement):
  - U-AI-04 MultiTurnIntentRefinementEngine -> ConversationalMemory/Budget/StaleDetector/Trimmer exist but none do intent-REFINEMENT; likely a real (small) build
- GENUINELY NOVEL — zero equivalent on disk (real build):
  - U-AI-14 PerCustomerOmegaTargetEngine   -> NO hits. per-customer omega-target is unbuilt (overlaps ShopConfigurationEngine concept only)
- NET: of 9 "not_started", ~7 are satisfiable by existing wired engines (4 confirmed iter11 + 3 likely iter12); only ~1-2 are genuine new builds (U-AI-14 definite, U-AI-04 maybe). Remaining build scope SHRANK 9 -> ~2.
- STEP 1 (fresh window, ultracode ON): fire a Workflow that runs `duplicationGuardEngine.checkBeforeCreating` on each of the 9 (subagent contexts, returns compact verdict), enrolls the ~7 satisfied, then builds ONLY U-AI-14 (+maybe U-AI-04) whole through per-file 2-arm + 3-of-3 gates.
- AFTER reconcile: P6 CAD-FEATURE-RECOGNITION-MS0 (the crux) on a clean full window; P1 merge as a coordinated session.

## PROVEN — complex-part closed-loop generate->validate (loop2, 2026-06-10) [[reference_delta_complex_part_generation_proven_2026_06_10]]
Ran the REAL closed loop from H:/prism-slot-delta (tooling lives there, NOT trunk — gated on P1 merge):
- cad-generate-stepped-trilobe-cli.mjs -> 3-lobe 2-section electrode: 43,115 entities / 1,332 faces / 18 bodies / 2.57MB valid AP242 STEP. Multi-prism emitter (NOT periodic B-spline). Spark-gap baked.
- cad-analyze-step.mjs -> axial length 1.00100 == spec 1.001 EXACT; peak R 0.14210 == spec(O0.2872 - spark) EXACT.
- VERDICT: dimensionally 100% + topologically valid + units correct. HONEST boundary: FACETED (72-pt lobe profiles, no analytic curved surfaces) not smooth NURBS = unbuilt P7. "turbine/blisk" literal target NOT yet probed (BliskCADEngine exists, unprobed).
- NEXT (serial, no fan-out): (1) probe BliskCADEngine -> does it emit a valid blisk STEP? faceted or smooth? (2) P7 smooth-surface emitter to clear the faceted boundary. Run all from H:/prism-slot-delta until P1 merge.

## PROVEN + DEFECT — turbine blisk (loop3, 2026-06-10) [[reference_blisk_6series_airfoil_defect_2026_06_10]]
Probed the LITERAL turbine/blisk target (built dist, node, no fan-out) + USED OLLAMA (qwen2.5-coder explained the engine, ~5859 tok saved -> operator Ollama directive satisfied).
- PROVEN: BliskCADEngine.generate(turbine, NACA 0006) -> 53 CAD ops (revolve disk->bore->loft blade splines->circular-pattern 30 blades->fillets), 5 hub-tip sections, vol 400973.6mm3, mass 3.284kg Inconel718, 0 warnings. Feature/op-sequence representation (feeds Fusion/CAM bridge), NOT faceted -> higher-value than the trilobe STEP.
- DEFECT (repro): listProfiles() advertises NACA 65-010/65-012 (6-series) but parseDesignation() only handles 4/5-digit -> generate() THROWS AirfoilParseError on the 6-series (which is BliskBladeSpec's OWN documented example + the standard turbine airfoil family). validate() returns valid:true for it (validate/generate inconsistency).
- NEXT UNIT **U-BLISK-6SERIES-PARSE** (fresh ctx + scrutiny gate): extend BladeProfileLibraryEngine.parseDesignation for 6-series (complete fix, real thickness dist -- no silent %-only fallback) + validate() reject unparseable profiles (fail-loud). Both real-reference-value testable. THEN feed the 53-op recipe through cad_draw_any_part/Fusion bridge to emit + validate a blisk STEP vs a resource reference.

## PROVEN — closed-loop generate->validate->MEASURE cycle (loop4, 2026-06-10) [[reference_delta_closed_loop_measure_proven_2026_06_10]]
Full closed-loop MEASURE cycle demonstrated headless w/ geometrically-correct numbers (no Fusion, no fan-out):
- GENERATE: trilobe baseline + +0.010in perturbed (CLI, 43115 entities each).
- VALIDATE: CADGeometryComparisonEngine.extractMetrics -> vol 0.0755in3, surf 1.25in2, 1332 faces/18 solids, bbox exact-to-spec, 28ms.
- MEASURE: compare(base,base)=ALL 0 (self-consistent); compare(base,perturbed)=Volume 7.40% / BBox 3.65% (==radius ratio EXACT) / Topology 0. The training signal works + is accurate.
- REMAINING for literal turbine/blisk-vs-reference: (a) real reference model, (b) blisk feature-ops->STEP needs LIVE Fusion bridge (cad-fusion-live-ms0), (c) the RETRAIN step (propose-correction->regen->re-measure->0), (d) U-BLISK-6SERIES-PARSE. (a)(b)(c) = multi-session + env-dependent (live app); (c)(d) = autonomous-buildable through scrutiny gates when throttle clears.

## PROVEN -- closed-loop CORRECTION converges (loop5, 2026-06-10) [[reference_delta_closed_loop_correction_converged_2026_06_10]]
The correction loop (repeatedly named "remaining") BUILT + RUN + CONVERGED headless: wrong trilobe (dia +0.010in, +3.652%box deviation) -> match reference measured geometry in 2 iters to -0.178%% (<0.3%0l); dia hidden from loop. generate->measure->correct->regen->re-measure ALL proven. Honest residual -0.178% = lobe/spark-gap nonlinearity (real loop, not faked 100%). Remaining literal: blisk-STEP via live Fusion + real reference model (env-dependent). Buildable next: U-CLOSED-LOOP-CORRECT-HARNESS (committed harness + tests + multi-param correction).

## PROVEN -- closed-loop training ON THE TURBINE BLISK (loop6, 2026-06-10) [[reference_delta_blisk_closed_loop_converged_2026_06_10]]
Closed the gate gap "closed-loop only on trilobe, not turbine/blisk". KEY: BliskCADEngine.generate() returns volumeEstimate_mm3 HEADLESS = valid closed-loop signal (no STEP/Fusion for TRAINING). Wrong blisk (diskThickness 25, vol +22.623
## PROVEN -- closed-loop training ON THE TURBINE BLISK (loop6, 2026-06-10) [[reference_delta_blisk_closed_loop_converged_2026_06_10]]
Closed the gate gap "closed-loop only on trilobe, not turbine/blisk". KEY: BliskCADEngine.generate() returns volumeEstimate_mm3 HEADLESS = valid closed-loop signal (no STEP/Fusion needed for TRAINING). Wrong blisk (diskThickness 25, vol +22.623%) -> secant-correct -> reference vol 400973.6mm3 in 1 iter to -0.0000% (diskThickness 20.00000 exact). Closed loop now proven on trilobe (bbox) AND turbine blisk (volume). REMAINS (env-dependent, NOT the training loop): blisk STEP-export via live Fusion + real reference model.

## PROVEN -- real turbine/blisk reference characterized + "100% accurate" gap quantified (loop7, 2026-06-10) [[reference_delta_real_blisk_reference_characterized_2026_06_10]]
CORRECTS the false "no reference exists" claim. Deep Glob found resources/CAD FILES/blisk.stp (4.9MB) + Impeller turbine.stp (3MB) + assembly of jet.STEP (44MB). extractMetrics (headless) characterized them:
- blisk.stp: 451.5M mm3, bbox 1207x1207x310mm (~1.2m blisk), 223 faces, 328 B_SPLINE_SURFACE (NURBS-smooth).
- Impeller turbine.stp: 64.3M mm3, 405 B_SPLINE_SURFACE.
PROVES: (a) validate-vs-real-reference WORKS headless on genuine NURBS parts; (b) EXACT gap = real refs are NURBS-smooth (328/405 B-spline), PRISM headless emit is FACETED (PLANE-only, 0 B-spline) -> need Fusion kernel (loft ops->NURBS) OR headless NURBS emitter (P7). Scalar-volume convergence provable headless but != shape-match. The real frontier = faceted-vs-NURBS generation fidelity, NOT "no reference".

## PROVEN -- closed loop converges generated blisk to REAL blisk.stp volume (loop8, 2026-06-10)
extractMetrics(blisk.stp).volume = 451,549,096 mm3 (REAL reference). BliskCADEngine @ scale 1.0 = 400,974 mm3. Analytic uniform-scale s=(Vref/Vbase)^(1/3)=10.40391 -> generated vol 451,549,096 -> deviation 0.0000% in 1 iter. Closed loop now closes vs the REAL resources/ part (not a self-copy).
HONEST: volume-match != shape-match. The scale-10.4 blisk matches blisk.stp's VOLUME exactly but NOT its shape (engine's default 30xNACA0006 blades != blisk.stp's specific NURBS blades; bbox/aspect differ; faceted vs NURBS). Full "100% accurate shape" still needs: (a) reverse-engineer blisk.stp's params (bladeCount/profile/proportions) from geometry, (b) NURBS emit (P7/Fusion kernel), (c) full-geometry compare(volume+bbox+surface+topology). Those are the hard gated build (scrutiny gate throttled). Scalar-volume vs real-ref = DONE.

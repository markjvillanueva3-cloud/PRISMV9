# MILL-WIZARD-SYNERGY-MS0 — master high-ROI synergy plan

> **Author:** claude-ea0ff1a5 (slot **kilo**, 2026-05-28)
> **Trigger:** operator three-part directive — *"do another full assessment with parallel agents, check H:/PRISM/extracted + H:/PRISM/extracted_modules for dormant features, engines and algorithms. once we have everything, think of high roi engines and algorithms we could build to fully synergize all of mill wizard nodes then synergize to quoting system, erp system, post processor, cad/cam and speed feed calculator domains, databases will also need to wire to the mill wizard node"* + architectural reframe — *"original idea was generate all programs through hypercad, mastercam or fusion (inject our own tool path algorithms if possible and beneficial), our own repositioning algorithms and variable repositioning with an optimized mix of rapid and feed movements for smooth transitions, then use its simulation for collision avoidance and part accuracy before ever running"* + simulation/collision callout.
> **Method:** 4 parallel agents over CAM-extracted-dormant / mill-wizard-surface / quoting-ERP-synergy-gap / post-CAM-SFC-synergy-gap. Folded with prior session artifacts (CAM-PIPELINE-AUDIT, CAM-vs-CAD gap diff, deep assessment, scorer baseline).

---

## 1. Architectural anchor

**PRISM is the AUGMENTATION + VERIFICATION layer over host CAMs.** PRISM drives hyperCAD-S / Mastercam X8 / Fusion 360 via bridge engines → injects its own toolpath / repositioning / lead-IO / machine-capability-aware param algorithms WHERE BENEFICIAL → reads back the host CAM's own simulation result → only emits if sim passes. The Mill Wizard is the operator-facing entry point for this loop on mill jobs.

**Verification before run.** Host CAM's simulation is the canonical collision-avoidance + part-accuracy ground truth. PRISM verifies twice: cheap pre-flight (BVH spatial-index + envelope guard + interrupted-cut check) BEFORE invoking host sim; expensive post-sim verification (G-code analysis + outcome ledger) AFTER.

---

## 2. The Mill Wizard surface (Agent B)

**49 dispatcher actions** across 11 categories (print-to-program, strategy, toolpath, physics, AI/AGI, L2 aggregators, part-classification, tribal). Entry points:

- `MillMasterOrchestratorFacadeEngine.ts` — facade for 7 request types
- `MillingPrintToProgramEngine.ts` — core P2P pipeline (intake → strategy → toolpath → G-code) — **`generateGcode()` is a STUB returning `{ok: false, stub: true}` (U-EFF25)**
- `MillingEndToEndOrchestrationEngine.ts` — full workflow automation
- `MillingAGIMasterEngine.ts` — 8 reasoning modes + `MillTribalKnowledgeEngine`

Route: `POST /api/v1/milling/wizard-submit` → calls the orchestrator + falls back to `prism_cam:print_to_program_full`.

**Currently wired:** SFC (partial: `mill_quick_speed_feed` only), physics canonical constants, tribal knowledge, AGI reasoning, partial CAM (fallback only).

**NOT wired (the synergy gaps):** quoting, ERP, post-processor (direct), full CAM bridges, shop-floor live state, databases.

---

## 3. The 4 cross-domain synergy gaps (Agents C + D)

### 3.1 Quoting + ERP + Scheduling + Shop-Floor (Agent C)
- **All 9 ERP engines** dormant to mill wizard
- **All 5 quoting engines** (incl `QuoteEstimatorEngine` — the canonical hub wired only to `prism_business`) dormant
- **All 8 scheduling engines** shared (lathe/wedm use them) but mill wizard isolated
- **All 8 ShopFloor engines** dormant to mill wizard
- **5 critical P0/P1 missing edges** (workorder query / shop-floor quote sync / scheduler constraint export / quote-basis fetch / shop-floor schedule query)

### 3.2 Post-processor + CAD/CAM bridges + Speed-Feed (Agent D)
- `mill_generate_gcode` → `ppDispatcher.pp_generate()` (echo's 801 actions) — ❌ **STUB**
- `mill_quick_speed_feed` → `calcDispatcher.sfc_calculate()` (oscar's 1130+ actions) — ❌ uses local physics, misses 67 integration points
- `mill_strategy_recommend` → `CAMStrategyRecommenderEngine` + `CAMFixtureSelectionEngine` — ❌ mill-only neural recommendation
- `InterruptedCutAvoidanceEngine` (shipped earlier this session) → `millDispatcher` — ❌ wired to productDispatcher only
- **Total dormant capacity:** ~4,100 actions inaccessible to mill wizard

---

## 4. The CAM dormant inventory (Agent A) — top 10

| Rank | File | Path | Size | Status | High-ROI reason |
|---|---|---|---|---|---|
| **1** | `PRISM_FEATURE_INTERACTION_ENGINE.js` | `extracted_modules/COMPLETE/` | 32.6K | **NO TS PEER** | MIT 16.410+2.008 feature-precedence (bore-before-thread, pocket-before-chamfer). Extends interrupted-cut at the FEATURE level. Synergizes with `InterruptedCutAvoidanceEngine` for two-level avoidance (feature precedence + toolpath shock-load). |
| **2** | `PRISM_5AXIS_BLISK_CAM_ENGINE.js` | `extracted_modules/complete_extraction/` | — | NO TS PEER | Aerospace blisk sequence generator. `BliskCADEngine.ts` is geometry-only. |
| **3** | `PRISM_CROSSCAM_STRATEGY_MAP.js` | `extracted_modules/complete_extraction/` | — | NO TS PEER | **Cross-system strategy equivalence (Fusion ↔ Mastercam ↔ hyperMILL ↔ NX).** Directly enables the operator's "inject across CAMs" architecture. |
| **4** | `PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE.js` | `extracted_modules/complete_extraction/` | — | NO TS PEER | Weighted multi-factor strategy scorer (feature/geometry/tolerance/finish). `ToolpathStrategyRouterEngine.ts` routes but does NOT score. |
| **5** | `PRISM_GRAPH_TOOLPATH.js` | `extracted_modules/complete_extraction/` | — | NO TS PEER, **patent claim** | GNN-based toolpath graph. Synergizes with PRISM's NN-GRAPH-MS0 infrastructure. |
| 6 | `PRISM_ADVANCED_5AXIS_STRATEGIES.js` | `extracted_modules/complete_extraction/` | — | NO TS PEER | Swarf/flank/barrel cutter catalog. |
| 7 | `PRISM_CUTTING_TOOL_EXPANSION_V3.js` | `extracted_modules/ULTRA/` | 2.6 MB | NO TS PEER | Ball/end/drill geometry catalog at unprecedented scale. |
| 8 | `PRISM_TOOLPATH_GCODE_BRIDGE.js` | `extracted_modules/complete_extraction/` | — | NO TS PEER | Lightweight toolpath → G-code (skip full PP for simple cases). |
| 9 | `PRISM_HYPERMILL_FIXTURE_DATABASE.js` | `extracted_modules/databases/` | — | data-port | hyperMILL vise/tower catalog. Feeds `HyperMillFixtureArtifactGeneratorEngine` (currently data-starved). |
| 10 | `PRISM_BATCH_STEP_IMPORT_ENGINE.js` | `extracted_modules/ULTRA/` | 2.3 MB | NO TS PEER | Batch STEP import for multi-part assemblies. |

Plus **simulation/collision dormant set** (from prior turn): `PRISM_BVH_ENGINE.js` (248.5K — single biggest collision-acceleration win), `PRISM_PROBABILISTIC_COLLISION.js`, `PRISM_HYPERMILL_SIMULATION_ENGINE.js`, `PRISM_HYPERVIEW_SIMULATION_CENTER.js`.

Plus **3 patent-claim files** (GRAPH_TOOLPATH + SWARM_TOOLPATH + HYBRID_TOOLPATH_SYNTHESIZER) — **operator IP review required before porting**.

---

## 5. The master high-ROI unit list (15 units, prioritized)

Folding architectural anchor + 3 cross-domain gaps + dormant inventory + variable-repositioning + simulation/collision into a single ranked list.

### P0 — Critical-path (ship first; each unblocks downstream)

| # | Unit | LOC | Composes | Why P0 |
|---|---|---:|---|---|
| **1** | **`U-MILL-PRINT-TO-PROGRAM-DESTUB`** | ~150 | `MillingPrintToProgramEngine.generateGcode()` → `ppDispatcher.pp_generate()` | The single biggest blocker. Mill wizard currently emits NO real G-code. One edge wire turns the wizard from non-functional to functional. |
| **2** | **`U-MILL-INTERRUPTED-CUT-WIRE`** | ~50 | `millDispatcher` adds `mill_interrupted_cut_analyze` calling the InterruptedCutAvoidanceEngine I shipped earlier this session | Quick win — engine + tests + dispatcher contract already exist; just add one wiring entry on mill side. |
| **3** | **`U-ADAPTIVE-PIPELINE-ORCH`** | ~700 | Outer orchestrator wiring all 10 stages (PROGRAM_INTAKE → MACHINE_SELECT → STOCK_SIZE → WORKHOLDING → OP_SEQUENCE → SIMULATE+COLLISION → TOOL_HOLDER → MACHINE_CAPABILITY_USE → POST_EMIT → SETUP_SHEET → CLOSED_LOOP_FEEDBACK) | The binding glue. Per CAM-ADAPTIVE-PIPELINE-DEEP-ASSESSMENT: this single unit converts "we have all the pieces" into "closed-loop self-training is on." |
| **4** | **`U-VARIABLE-REPOSITIONING-ENGINE`** | ~400 | `MachineCapabilityIntelligenceEngine` (axis accel + jerk + lookahead) + `SpindleTorqueCurveEngine` + `RapidRepositionOptEngine` + `EntryExitStrategyEngine` + jerk-limited S-curve (Lambrechts & Boerlage 2005) | Operator-named gap. Smooth G0+G1 blend, machine-aware peak-accel cap, controller-specific G64/G05.1 lookahead enable. |
| **5** | **`U-FEATURE-INTERACTION-PRECEDENCE-PORT`** | ~500 | Port `PRISM_FEATURE_INTERACTION_ENGINE.js` → `FeatureInteractionPrecedenceEngine.ts` | Dormant #1. MIT precedence constraints. Extends the just-shipped InterruptedCut to the FEATURE level (bore-before-thread, pocket-before-chamfer, face-before-drill). |
| **6** | **`U-CROSSCAM-STRATEGY-MAP-PORT`** | ~400 | Port `PRISM_CROSSCAM_STRATEGY_MAP.js` → `CrossCAMStrategyEquivalenceEngine.ts` | Dormant #3. Strategy equivalence Fusion ↔ Mastercam ↔ hyperMILL ↔ NX — the data layer that makes the operator's "inject across CAMs" architecture mechanically possible. |
| **7** | **`U-MILL-WIZARD-QUOTING-WIRE`** | ~150 | `millDispatcher` adds `mill_quote` action → `QuoteEstimatorEngine.estimate()` + `ShopFloorQuoteEngine.updateQuote()` post-hook | Closes Agent C P0 gap #2 — quote round-trip. |
| **8** | **`U-MILL-WIZARD-ERP-WIRE`** | ~150 | `millDispatcher` adds `mill_query_erp_workorders` + post-hook to `ERPCostFeedbackEngine` | Closes Agent C P0 gap #1 — ERP workorder visibility + cost-variance feedback. |
| **9** | **`U-HOST-SIM-RESULT-READER`** | ~300 | New `HostSimResultReaderEngine.ts` parsing hyperMILL Simulation Center / Mastercam Verify / Fusion sim outputs into a unified `SimResult{passes, collisions[], partAccuracy_mm, gougeRegions[]}` | The "use host CAM's sim before running" architectural primitive. |

### P1 — Ship after P0 (extends or sharpens)

| # | Unit | LOC | Why P1 |
|---|---|---:|---|
| **10** | **`U-BVH-PORT`** | ~600 | Port `PRISM_BVH_ENGINE.js` (248.5K) → `BVHCollisionAccelStructureEngine.ts`. Pre-flight spatial-index acceleration BEFORE invoking host sim (cheap → expensive ordering). |
| **11** | **`U-UNIFIED-TOOLPATH-DECISION-PORT`** | ~400 | Port `PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE.js` (dormant #4) — weighted multi-factor strategy scorer. |
| **12** | **`U-MASTERCAM-VBSCRIPT-DRIVE`** | ~500 | Mastercam X8 PRISM bridge — VBScript + C-Hook + ATP NetHook. Closes F2 (95+ JM Die mcx-8 programs currently with zero PRISM bridge). |
| **13** | **`U-MILL-WIZARD-SCHEDULER-EXPORT`** | ~150 | `mill_export_scheduling_constraints` → `JobShopSchedulingEngine.registerMillConstraints()`. Closes Agent C P1 gap. |
| **14** | **`U-MILL-WIZARD-CAM-STRATEGY-ALIGN`** | ~200 | `mill_strategy_cam_align` → `CAMStrategyRecommenderEngine` + `CAMFixtureSelectionEngine`. Aligns mill strategy with host CAM library. |

### P2 — Specialized / patent-pending / parallel

| # | Unit | Notes |
|---|---|---|
| **15** | **`U-GRAPH-TOOLPATH-PORT`** | Dormant #5, **patent claim** — requires operator IP review before port. |
| **16** | **`U-F3D-EXTRACT-BATCH-RUN`** | Operator-actionable, zero PRISM deps. Run `extract-f3d-feature-trees.py` on the 1640 .f3d Fusion corpus. |
| **17** | **`U-CAM-AUDIT-PEER-REVIEW`** | Fire reviewer A + reviewer B on the CAM-PIPELINE-AUDIT per delta's FAIL→patch→re-publish pattern. |
| **18** | **`U-ADAPTIVE-PIPELINE-WET-RUN`** | Drive ONE JM Die program through the orchestrator end-to-end (depends on #3 shipping first). |
| **19** | **`U-PROBABILISTIC-COLLISION-PORT`** | Tolerance-band-aware Monte-Carlo collision. |
| **20** | **`U-HYPERMILL-SIMULATION-CENTER-PORT`** | Bridge for HyperMILL's Simulation Center result reader (data into Host-Sim-Result-Reader). |
| **21** | **`U-5AXIS-BLISK-CAM-PORT`** | Dormant #2 — aerospace blisk vertical. |
| **22** | **`U-ADVANCED-5AXIS-STRATEGIES-PORT`** | Dormant #6 — swarf/flank/barrel catalog. |
| **23** | **`U-CUTTING-TOOL-EXPANSION-V3-PORT`** | Dormant #7 (2.6 MB catalog). |
| **24** | **`U-TOOLPATH-GCODE-BRIDGE-PORT`** | Dormant #8 — lightweight toolpath → G-code. |
| **25** | **`U-HYPERMILL-FIXTURE-DATABASE-PORT`** | Dormant #9 — vise/tower ANSI dimensions. |
| **26** | **`U-BATCH-STEP-IMPORT-PORT`** | Dormant #10 (2.3 MB). |

---

## 6. The dependency graph (minimum 7-unit critical path)

```
                            U-MILL-PRINT-TO-PROGRAM-DESTUB ★(1)
                                     │
                  ┌──────────────────┼──────────────────────┐
                  ↓                  ↓                      ↓
       U-MILL-INTERRUPTED          U-MILL-WIZARD          U-ADAPTIVE-PIPELINE-ORCH (3)
       -CUT-WIRE (2)               -QUOTING-WIRE (7)            │
                                                                ↓
                                                       U-VARIABLE-REPOSITIONING (4)
                                                                │
                                  ┌─────────────────────────────┼─────────────────────────┐
                                  ↓                             ↓                         ↓
                       U-FEATURE-INTERACTION                U-CROSSCAM-STRATEGY        U-HOST-SIM-RESULT
                       -PRECEDENCE-PORT (5)                 -MAP-PORT (6)              -READER (9)
                                                                                          │
                                                                                          ↓
                                                                                    U-MILL-WIZARD
                                                                                    -ERP-WIRE (8)
```

**Min path to operator's closed-loop self-training:** units 1 → 3 → 4 → 9. ~1550 LOC across 4 engines. All compose existing engines; no new physics.

---

## 7. What this means for the operator architecturally

After P0 ships (9 units):
- **Mill wizard becomes the operator-facing entry point** for the full adaptive pipeline.
- **Host CAM does the toolpath generation**; PRISM injects (interrupted-cut remediation, variable repositioning, feature-interaction precedence) WHERE BENEFICIAL.
- **Host CAM's sim does the runtime verification**; PRISM cross-checks with cheap BVH pre-flight + post-sim G-code analysis.
- **Quoting + ERP + Shop-Floor close the loop** — every mill job feeds outcome ledger → bandit posteriors → next-job priors.
- **Cross-CAM equivalence** lets PRISM teach a job once and reuse the strategy across hyperCAD / Mastercam / Fusion.

After P1+P2 ship (17 additional units):
- Mastercam X8's 95+ JM Die programs become PRISM-drivable.
- BVH-accelerated collision check makes the inject+verify loop fast enough for real-time operator use.
- The Fusion 1640-file corpus becomes training data.
- Specialized 5-axis (blisk, swarf, flank, barrel) ports cover aerospace verticals.
- The full self-training loop closes per-CAM per-machine per-material.

---

## 8. Honest caveats

- **Static scan, not runtime probe.** This plan is built on file-on-disk inventory + import-graph analysis. Live runtime integration of each named engine is unverified (delta's MISC-305 pattern). The CAM-TEST-PLAYBOOK Tier 2 wet-run is the gate.
- **Patent-claim files (3) require IP review.** Operator must clear `PRISM_GRAPH_TOOLPATH.js`, `PRISM_SWARM_TOOLPATH.js`, `PRISM_HYBRID_TOOLPATH_SYNTHESIZER.js` before port.
- **Mill wizard's `MillingPrintToProgramEngine` stub may have a justification.** Agent D classified it as stub (U-EFF25); the destub may require coordinating with the unit's original owner — check chat-bus before refactor.
- **Variable repositioning is controller-specific.** Fanuc G64 vs Siemens G05.1 vs Heidenhain M3 have different look-ahead semantics. The engine emits controller-specific blocks; cross-machine testing required.
- **Host-Sim-Result-Reader is bridge-kind-dependent.** Each of hyperMILL Simulation Center / Mastercam Verify / Fusion sim has its own result format. The reader must handle all three.

---

## 9. Cross-refs

- `state/shared/specs/CAM-PIPELINE-AUDIT-2026-05-28.md` — F1-F7 findings (scorer-backed)
- `state/shared/specs/cam-pipeline-coverage-LATEST.{json,md}` — re-runnable baseline
- `state/shared/specs/CAM-TEST-PLAYBOOK-2026-05-28.md` — Tier 1-4 live-drive (3 platforms)
- `state/shared/specs/CAD-TO-CAM-HANDOFF-CONTRACT-2026-05-28.md` — delta → kilo schema
- `state/shared/specs/CAM-ADAPTIVE-PIPELINE-DEEP-ASSESSMENT-2026-05-28.md` — prior deep assessment
- `state/shared/specs/CAM-VS-CAD-GAP-DIFF-2026-05-28.md` — G1-G13 gap diff
- `state/shared/specs/CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md` — initial MS0 spec
- `mcp-server/src/engines/InterruptedCutAvoidanceEngine.ts` — first MS0 unit shipped (this session)
- `scripts/cam-pipeline-coverage-scorer.mjs` — re-runnable scorer (250 LOC)
- `scripts/extract-f3d-feature-trees.py` — 1640 .f3d corpus extractor

---

**End of plan.** Awaiting operator triage on whether to ship the 9-unit P0 critical path inline next /loop, or break into smaller batches. The architectural reframe + the 4-agent gap analysis + the dormant inventory all converge on the same minimum-viable set: **destub `mill_generate_gcode`, wire InterruptedCut to mill, ship the orchestrator, build variable repositioning, port FeatureInteraction + CrossCAMStrategy + build HostSimResultReader, wire mill→quoting + mill→ERP.** Everything else is sharpening.

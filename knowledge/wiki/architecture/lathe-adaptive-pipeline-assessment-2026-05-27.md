---
title: Lathe Adaptive Pipeline — Closed-Loop Self-Training Assessment + Design Blueprint
date: 2026-05-27
slot: whiskey
type: architecture-assessment
status: assessment-and-design
related:
  - lathe-wizard-pipeline (iter143 ship)
  - reference_whiskey_lathe_complete_asset_map_2026_05_27
  - reference_whiskey_lathe_session_close_iter143_2026_05_27
  - reference_whiskey_lathe_soul_designation_2026_05_27
  - feedback_psn_definition
---

# Lathe Adaptive Pipeline — Closed-Loop Self-Training Assessment + Design Blueprint

Operator directive (2026-05-27, slot:whiskey, `Pictures/last.md`):

> Do deep assessment + deep dive using /system-viz + master-index + system-graph into engines/wiki/algorithms/tribal/resources/existing programs. Assess whether we have enough to develop a self-training, self-improving pipeline for closed-loop learning. Then devise a variable, adaptive pipeline for every lathe-turnable part that decides: **machine ← shop-inventory + current-availability + ERP** · **stock size + cut-length + parts-per-bar** · **optimal-efficient op sequence (avoid interrupted cuts, chip evac, chip-thickness via PRISM SFC)** · **optimal toolpath ← optimal tool + holder (suggest high-ROI upgrades by price point)** · **full machine-capability use (brand, build quality, way/spindle/turret types, tool-holder connection, g-forces, stability, kinematics, work envelope, max RPM/feed/rapid, controller capabilities, parameter optimizations)** · **post-processor → optimized cost-efficient accurate safe G-code**.

---

## TL;DR

**Verdict: YES — we have enough to build the closed-loop adaptive pipeline.** All 4 self-training pillars exist. 5 of the 6 operator decisions are HAVE/PARTIAL. 1 raw-stock-inventory engine is the only truly MISSING engine. The bulk of remaining work is **integration wiring**, not new engines.

| Pillar | Status | Path |
|--------|--------|------|
| Self-training cron | ✅ HAVE | `LatheLoRACadenceEngine` (drift-triggered, auto-promote gate) |
| Actuals → corpus feedback | ✅ HAVE | `LatheActualFeedbackTuningEngine` (exp-smoothing on Taylor C, kc_scale, scrap, cycle) |
| Tool ROI ranking | ✅ HAVE | `ToolROIEngine` (Taylor payback, 3 price tiers, 95K catalog) |
| Bar stock cut-planning | ✅ HAVE | `BarStockCutPlanEngine` (FFD bin-pack, partsPerBar, cost-per-mm optimization) |
| Stock OD/form selection | ✅ HAVE | `StockSizeOptimizerEngine` (catalog-aware, machining allowance + saw kerf + chuck grip + cutoff + nesting — 3 wired actions) |
| ERP work-orders | ✅ HAVE | `ERPIntegrationEngine` + `ERPWorkOrderEngine` (businessDispatcher `_erpWorkOrder`) |
| Live machine status | ✅ HAVE | `MTConnectLiveStatusEngine` (ASME MTC1.4, execution + spindle_load + alarms) |
| Job scheduling | ✅ HAVE | `LatheJobSchedulingEngine` (EDD+CR) + `ShopFloorScheduleEngine` (availableHoursToday + nextAvailableSlot) |
| Raw stock inventory | ❌ MISSING | parallel to `ERPToolInventoryEngine` — no `BarStockInventoryEngine` |
| Wizard ↔ outcome bus | ⚠ PARTIAL | `OutcomeCaptureBusEngine`/`OutcomeTraceEngine` exist; not wired to `LatheActualFeedbackTuningEngine` |
| StockEvolution ↔ CutPlan | ⚠ PARTIAL | `LatheStockEvolutionEngine` exists; remnant-tracking ↔ `BarStockCutPlanEngine` not integrated |

---

## 1. Inventory state (verified 2026-05-27)

### 1a. Lathe wizard pipeline (slot/whiskey worktree, iter143 ship)
- 7 engines at `H:/prism-slot-whiskey/scripts/lib/lathe-*.mjs`
- 85 hermetic tests pass; E2E composition smoke proves amateur→improved program
- Full inventory: [[reference_whiskey_lathe_session_close_iter143_2026_05_27]]
- Cross-cutting asset map: [[reference_whiskey_lathe_complete_asset_map_2026_05_27]]

### 1b. Main-tree engine surface
- 238 lathe-specific engines under `H:/prism/mcp-server/src/engines/` (Lathe*/Turning*/Threading*/HardTurning*/Diamond*)
- 4 lathe-dedicated dispatchers: `turningDispatcher.ts` (373 actions), `turningProgramDispatcher.ts` (14), `threadDispatcher.ts` (17), `threadingPipelineDispatcher.ts` (3)
- Lathe actions in cross-domain dispatchers: `prism_cam:lathe_*`, `prism_calc:turning_force`/`diamond_turning_forces`
- Galaxy sentinel: `mcp-server/src/engines/lathe/CLAUDE.md` (P1 Galactic Center, R7-flagged for refine)

### 1c. JM Die corpus (training substrate)
- **118 customers** verified at `H:/PRISM/JM DIE/CNC LATHE/<customer>/`
- **14,475 A/B program pairs** scanned (iter202)
- **50+ post-processors** in `JM DIE/POST PROCESSORS/` (Doosan/Fanuc/Haas-26-variants/Mazak-17-variants/Mitsubishi/Okuma/Siemens/Heidenhain/Hurco/Tormach)
- **Fleet:** 7 Okuma lathes (LTH-01..LTH-07) defined in `src/data/jm-die-profile.ts` — **100% Okuma** (CSS/G50/G76 conventions apply fleet-wide)
- v2.0.0 upgrader output verified for all 118 customers under `<customer>/PRISM_UPGRADED/<Machine>/`
- ⚠ Caveat (iter261 retraction): v2.0.0 is currently pure annotation pass-through across all 5 sampled customers — not yet machining-improving. The adaptive pipeline below addresses this.

### 1d. Tribal + wiki corpus
- 1,327 wiki entries lathe-keyword-matched under `knowledge/wiki/`
- 14-vendor / 87+ insert-grade tribal corpus at `mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json`
- 432 indexed lathe videos at `lathe-videos-tribal-2026-05-26.json`
- 14 reference memos + 13 standing-doctrine feedback memos under `knowledge/memories/`

### 1e. Cross-domain shop-floor surface (verified by Agent A, 2026-05-27)
- `ERPIntegrationEngine` + `ERPWorkOrderEngine` wired into `businessDispatcher.ts` as `_erpWorkOrder` lazy-load
- `MTConnectLiveStatusEngine` (ASME MTC1.4 standard, real-time `execution`/`spindle_load`/`alarms`)
- `LatheJobSchedulingEngine` (Earliest-Due-Date sort + Critical-Ratio tiebreak)
- `ShopFloorScheduleEngine` exposes `availableHoursToday(machine_id)` + `nextAvailableSlot(machine_id, hours_needed)`
- `ERPToolInventoryEngine` (tooling qty/reorder/erpItemNumber — handles cutting-tool inventory, NOT raw stock)

### 1f. Simulation + collision-avoidance surface (added 2026-05-27 amendment — operator-flagged miss in v1)

**Generic engines (PRISM core):**
- `CollisionDetectionEngine` — math/geometry collision detection
- `CollisionEngine` — generic collision orchestrator
- `SimulationEngine` — generic toolpath simulator
- `InProcessStockModelEngine` — in-process stock model (current workpiece state for collision-against-current-stock checks, not just original)
- `VirtualMachiningDeepLearningEngine` — DL-backed virtual machining (predict toolpath issues from learned patterns)

**Lathe-specific:**
- `LatheCollisionZoneEngine` — zone-based collision (turret/chuck/tailstock/sub-spindle zones)
- `LatheEnvelopeBreachReplayEngine` — replay + classify envelope breaches captured from MTConnect alarms
- `lathe_collision_check` action (turningDispatcher) — runtime turning-collision predicate
- `lathe_swing_check` action — cross-section vs chuck swing diameter check
- `lathe_boring_reach` action — boring-bar reach + interference check

**Generic-safety dispatcher (`prism_safety`):**
- `check_toolpath_collision` · `check_fixture_clearance` · `calculate_safe_approach` · `generate_collision_report` · `validate_tool_clearance` · `check_5axis_head_clearance`
- `collision_prevent_full` · `collision_prevent_certify` · `collision_prevent_zones`

**CAM-bridge collision/safety (the operator-named trio + siblings):**
- **hyperMILL (hyperCAD-adjacent):** `hypermill_collision_check` · `hypermill_safety_audit` · `cam_hypermill_*` safety routes
- **Mastercam:** `mastercam_safety_validate` · `mastercam_safety_validate_all` · `mastercam_safety_rules` _(graph marked L4a/built but also L8/stub — partial coverage warning)_
- **Fusion 360:** `fusion360_safety_*` (via cam-bridge)
- **Sibling CAM bridges:** `nxcam_safety_validate`/`_rules`, `powermill_safety_validate`/`_rules`, `catia_safety_validate`/`_rules`, `solidcam_safety_validate`/`_validate_all`/`_rules`, `worknc_validate_collisions`/`_get_collision_report`

**Toolpath simulation:**
- `prism_cam:toolpath_simulate` · `prism_l2:sim_gcode` · `prism_l2:cam_collision`
- 5-axis dedicated: `five_axis_collision_avoid` (5axis dispatcher)

**Coverage caveat:** the per-CAM safety bridges have known stub-marked entries (per system-viz `L8/stub` flag on `mastercam_safety_validate`). The math/geometry side (`CollisionDetectionEngine` + `LatheCollisionZoneEngine` + `InProcessStockModelEngine`) is production-grade; the CAM-bridges are PARTIAL — they pass calls through to the CAM's native validator but don't yet receive structured collision-report back into the wizard's reasoning loop.

---

## 2. Operator's 6 decisions — assessment per decision

### Decision 1: Machine selection (shop inventory + current availability + ERP)
**Status: ✅ HAVE — wiring complete**

Compose: `ERPWorkOrderEngine.openWorkOrders()` → filter by part_spec capability via `LatheControllerSelectEngine.findCapableMachines(part_spec, fleet)` → rank via `LatheJobSchedulingEngine` (EDD + CR) — gated on `MTConnectLiveStatusEngine.execution !== 'ACTIVE'` for live availability. All 4 engines exist and are wired.

**Caveat:** the wizard pipeline (iter143) does NOT currently call these — Stage 5 generates programs for a fixed `partSpec.machine_id`. Wiring this in is Phase 4 §A below.

### Decision 2: Stock sizing (size + cut-length + parts-per-bar)
**Status: ✅ HAVE (compute) + ❌ MISSING (inventory)**

- ✅ **Compute side:** `StockSizeOptimizerEngine.optimize({ part_dims, material })` returns optimal bar OD/form from catalog, accounting for machining allowance + saw kerf + chuck grip + cutoff + nesting. Wired actions: `stock_size_optimize`, `stock_size_catalog`, `stock_size_nesting`.
- ✅ **Cut-planning side:** `BarStockCutPlanEngine.partsPerBar({ bar_length, part_length, kerf, grip_allowance, cutoff_width })` returns `{count, remnant_mm, utilization_pct}`. `.plan(parts, bars)` does FFD bin-packing across multiple bars by cost-per-mm.
- ❌ **Inventory side:** NO `BarStockInventoryEngine` exists — cannot query "how much 1" 4140HT is in stock" or "which 5160 lot is FIFO-next." Without this, the pipeline cannot validate "machine A is available BUT we don't have the material."

**Gap unit:** `U-LATHE-BARSTOCK-INVENTORY-ENGINE` (next-phase work).

### Decision 3: Operation sequencing (avoid interrupted cuts, chip evac, chip-thickness)
**Status: ✅ HAVE — coverage on each axis**

- **Interrupted-cut detection:** `LatheChipMechanicsEngine` + `LatheCollisionDetectionEngine` (collision is the contiguous-arc proxy)
- **Chip evacuation:** tribal corpus has chip-control (iter59 aluminum chip-breakers, iter91 Haas HP coolant, iter92 MQL); engine surface includes `lathe_chip_predict_type` + `lathe_birdnest_predict`
- **Chip-thickness control:** `prism_cam:lathe_sf_calculate` + `lathe_sf_advise` are the SFC (Speed-Feed Calculator) entry points — handle effective-feed correction for lead angle ≠ 90°
- **Sequence optimization:** `lathe_sequence_optimize` + `lathe_sequence_validate` actions exist in turningDispatcher

**Caveat:** the wizard's Stage 4 REASON engine does NOT currently invoke `lathe_sequence_optimize` — it scores existing programs but doesn't re-sequence operations. Wiring this in is Phase 4 §C below.

### Decision 4: Toolpath optimization (optimal tool + holder + ROI upgrade suggestions)
**Status: ✅ HAVE — full coverage**

- **Tool/holder selection:** wizard pipeline already does this via `lathe-wizard-vendor-lookup.mjs` (7-component scoring: customer-bias, machinability-match, vendor-trust, holder-fit, geometry-match, coating-match, score)
- **ROI ranking:** `ToolROIEngine` does Taylor-payback across the 95K catalog with 3 price tiers (current/mid/premium) — returns cost-per-part + parts-per-tool + payback-period for each upgrade candidate
- **Toolpath generation:** `LatheCAMIntelligenceEngine` + `LatheGeneticAlgorithmEngine` (parameter tuning) feed into `TurningPrintToProgramEngine`

**Caveat:** wizard's Stage 4 doesn't currently call `ToolROIEngine` — it only picks the highest-score tool, not the highest-ROI tool for the production-quantity context. Wiring this in is Phase 4 §B below.

### Decision 5: Machine-capability utilization (brand/way/spindle/turret/g-force/kinematics/envelope/RPM/feed/controller)
**Status: ✅ HAVE — comprehensive**

Per-Okuma-model spec lives in `src/data/jm-die-profile.ts` (LTH-01..LTH-07). Capability data covered by:
- **Controller:** `LatheControllerSelectEngine` (Okuma OSP-P200/P300/U10 dialect router) + `LathePostKnowledgeGraphEngine` (dialect synthesis)
- **Kinematics + envelope + RPM/feed:** `LatheKinematicsEngine` + machine-capability registry
- **Spindle:** `LatheSpindleTorqueEngine` + spindle-power-check actions (G50 max-RPM cap is operator-mandated; iter255 ship)
- **Turret:** turret-layout indexed in jm-die-profile (LTH-01 12-station, LTH-07 multi-turret B-axis)
- **G-forces / stability:** `LatheChatterAnalysisEngine` + `LatheDeflectionOptimizationEngine`
- **Tool-holder connection:** `LatheChuckJawSetupEngine` + connection-type registry (BMT, VDI, BOT)
- **Build-quality / way-type:** machine-capability registry tags + tribal corpus (iter94 Okuma 80% cycle-time case)

### Decision 6: Post-processor → safe G-code
**Status: ✅ HAVE — overwhelming coverage**

- 50+ post-processor `.cps` files in `JM DIE/POST PROCESSORS/`
- 324 fusion-cache lathe-related variants
- 3 PRISM-enhanced lathe posts: `OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps`, `OKUMA_LATHE_LB3000-Ai-Enhanced 2.cps`, `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps`
- Master-post framework: `prism_cam:master_post_process`, dialect-aware
- Safety: G50 cap pre-flight (whiskey ship `jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check`), chuck-jaw force + part-off + sub-spindle handoff verifications

### Decision 7: Simulation + collision avoidance (added 2026-05-27 amendment)
**Status: ✅ HAVE (math) + ⚠ PARTIAL (CAM bridges) + ❌ MISSING (closed-loop wiring back into wizard)**

Three layers stack here, each independently used but not yet composed:

1. **Straight-math layer (HAVE):** `CollisionDetectionEngine`, `LatheCollisionZoneEngine`, `InProcessStockModelEngine` — geometric BVH/AABB sweep + zone-based proximity, evolving in-process stock so checks reflect already-cut volume not just original bar. Wired via `prism_safety:check_toolpath_collision`/`check_fixture_clearance`/`calculate_safe_approach` and `prism_turning:lathe_collision_check`/`lathe_swing_check`/`lathe_boring_reach`.
2. **CAM-internal bridges (PARTIAL):** PRISM dispatches into the native validator of each CAM:
   - **hyperMILL** (lathe + mill-turn) — `hypermill_collision_check` + `hypermill_safety_audit` route into hyperMILL's `LiveAnalysis` + `MachineSimulation`
   - **Mastercam** (lathe + mill) — `mastercam_safety_validate` + `mastercam_safety_validate_all` + `mastercam_safety_rules` route into Mastercam's `VeriCut`/`Simulator`
   - **Fusion 360** — `fusion360_safety_*` route into Fusion's `Machine Simulation` + `Toolpath Verification`
   - Sibling CAM bridges exist for NX/PowerMill/CATIA/SolidCAM/WorkNC (same pattern)
   - **PARTIAL because:** the bridges call out to the CAM, but the structured collision-report comes back as opaque pass-through text. The wizard's Stage 4 (REASON) can't currently parse "hyperMILL found 3 collisions at [points]" into actionable recommendations.
3. **DL-backed virtual machining (PARTIAL):** `VirtualMachiningDeepLearningEngine` — predicts toolpath issues from learned patterns. The training corpus is the 14,475 A/B JM-Die pairs + MTConnect-captured envelope breaches via `LatheEnvelopeBreachReplayEngine`. Quality depends on real shop-floor outcome feedback (Decision-7 closed loop).

**MISSING wiring:**
- CAM-bridge collision-report → `Stage 4 REASON` (so the wizard reacts to "Mastercam found a chuck collision at line 247" by re-planning)
- `LatheEnvelopeBreachReplayEngine` → `VirtualMachiningDeepLearningEngine` retraining (so real envelope breaches become training signal for future toolpath plans)
- `InProcessStockModelEngine` → `BarStockCutPlanEngine` (so the in-process stock state feeds back into remnant-tracking — same gap as Decision 2's `LatheStockEvolutionEngine ↔ BarStockCutPlanEngine` integration)

---

## 3. Closed-loop self-training — 4 pillars + integration gaps

### Pillar 1: Self-training cadence ✅
`LatheLoRACadenceEngine` — drift-triggered (data-drift / performance-drop / scheduled / manual), with `CadenceConfig.auto_promote` gate + `drift_threshold` + `performance_threshold`. `TrainingRun` schema: run_id, version, metrics, model_path, promoted flag.

### Pillar 2: Actuals capture ⚠ PARTIAL
`LatheActualFeedbackTuningEngine` exists and tunes Taylor C, cycle-time multiplier, scrap baseline, Kienzle kc_scale via α=0.25 exp-smoothing. **Gap:** `OutcomeCaptureBusEngine` + `OutcomeTraceEngine` exist but are NOT yet wired to `LatheActualFeedbackTuningEngine.tune(actual_outcome)`. Operator overrides via `OutcomeFeedbackOverrideStoreEngine` are stored but not yet flowing into the retraining corpus.

### Pillar 3: Tool ROI ranking ✅
`ToolROIEngine.payback(current_tool, candidate_tool, production_qty)` returns the cost-curve cross-over point. Already production-grade.

### Pillar 4: Stock optimization ✅
`StockSizeOptimizerEngine` + `BarStockCutPlanEngine` cover the full size→cut-plan chain. **Gap:** `LatheStockEvolutionEngine` (tracks workpiece state during a run) doesn't feed bar-remnant updates back to `BarStockCutPlanEngine` for dynamic re-planning.

---

## 4. Pipeline blueprint — variable + adaptive state machine

```
                    ┌─────────────────────────────────────────┐
                    │  TRIGGER: part_spec (blueprint or RFQ)  │
                    └─────────────────────────────────────────┘
                                       │
                                       ▼
        ╔══════════════════════════════════════════════════════════════╗
        ║  §A — MACHINE SELECTION (composes 4 existing engines)        ║
        ║  capable = LatheControllerSelectEngine.findCapable(spec, fleet) ║
        ║  available = capable.filter(m => MTConnect.execution !== 'ACTIVE') ║
        ║  ranked = LatheJobSchedulingEngine.rank(available, due_date, queue) ║
        ║  selected_machine = ranked[0]                                ║
        ║  IF !selected_machine → escalate to operator                 ║
        ╚══════════════════════════════════════════════════════════════╝
                                       │
                                       ▼
        ╔══════════════════════════════════════════════════════════════╗
        ║  §B — STOCK SELECTION (composes 2 existing + 1 NEW engine)   ║
        ║  optimal = StockSizeOptimizer.optimize(spec, material)       ║
        ║  available_stock = BarStockInventory.query(material, ≥optimal.OD) ║
        ║    ↑↑↑ NEW ENGINE: U-LATHE-BARSTOCK-INVENTORY-ENGINE         ║
        ║  IF available_stock.qty < parts_needed → trigger reorder     ║
        ║  cut_plan = BarStockCutPlan.plan(parts_needed, available_stock) ║
        ║  reserved = BarStockInventory.allocate(cut_plan)             ║
        ╚══════════════════════════════════════════════════════════════╝
                                       │
                                       ▼
        ╔══════════════════════════════════════════════════════════════╗
        ║  §C — OPERATION SEQUENCING (NEW WIRING — existing engines)   ║
        ║  features = TurningFeatureTaxonomy.extract(spec)             ║
        ║  base_seq = LatheCAMIntelligence.proposeSequence(features)   ║
        ║  optimized = lathe_sequence_optimize(base_seq, constraints) ║
        ║  validated = lathe_sequence_validate(optimized)              ║
        ║  IF interrupted_cut_detected → reorder; IF chip_evac_risk → adjust ║
        ╚══════════════════════════════════════════════════════════════╝
                                       │
                                       ▼
        ╔══════════════════════════════════════════════════════════════╗
        ║  §D — TOOL + ROI SELECTION (NEW WIRING — existing engines)   ║
        ║  candidates = LatheWizardVendorLookup.selectInsert(spec)     ║
        ║  ranked = ToolROIEngine.rankByPayback(candidates, prod_qty)  ║
        ║  IF prod_qty < 100 → pick lowest-cost (no payback)           ║
        ║  IF prod_qty ≥ 100 → pick highest-ROI                        ║
        ║  upgrade_suggestions = ToolROIEngine.upgradesByPricePoint(spec) ║
        ╚══════════════════════════════════════════════════════════════╝
                                       │
                                       ▼
        ╔══════════════════════════════════════════════════════════════╗
        ║  §E — TOOLPATH GENERATION (existing)                          ║
        ║  toolpath = LatheCAMIntelligence.generateToolpath(            ║
        ║      sequence, tools, machine_capability)                     ║
        ║  optimized = LatheGeneticAlgorithm.tune(toolpath, objectives) ║
        ║  → cycle_time + cost prediction                               ║
        ╚══════════════════════════════════════════════════════════════╝
                                       │
                                       ▼
        ╔══════════════════════════════════════════════════════════════╗
        ║  §E.5 — SIMULATION + COLLISION GATE (NEW WIRING)              ║
        ║  ── Layer 1: math (HAVE) ──                                  ║
        ║  stock_state = InProcessStockModel.applyOps(stock, ops_so_far)║
        ║  col_math = lathe_collision_check(toolpath, stock_state)     ║
        ║  swing_ok = lathe_swing_check(part, chuck_swing)             ║
        ║  reach_ok = lathe_boring_reach(boring_bar, bore_depth)       ║
        ║  zones_ok = LatheCollisionZone.check(turret, chuck, tailstock)║
        ║                                                              ║
        ║  ── Layer 2: CAM-native (PARTIAL — operator-flagged) ──      ║
        ║  IF machine.cam_bridge === 'hypermill':                      ║
        ║      cam_report = hypermill_collision_check(toolpath)        ║
        ║  ELIF machine.cam_bridge === 'mastercam':                    ║
        ║      cam_report = mastercam_safety_validate_all(toolpath)    ║
        ║  ELIF machine.cam_bridge === 'fusion360':                    ║
        ║      cam_report = fusion360_safety_validate(toolpath)        ║
        ║  ELIF machine.cam_bridge === 'nxcam'/'powermill'/'catia'/    ║
        ║       'solidcam'/'worknc':                                   ║
        ║      cam_report = <cam>_safety_validate(toolpath)            ║
        ║                                                              ║
        ║  ── Layer 3: DL prediction (PARTIAL) ──                      ║
        ║  dl_risk = VirtualMachiningDeepLearning.predict(toolpath)    ║
        ║                                                              ║
        ║  ── Gate ──                                                  ║
        ║  IF col_math.violations || cam_report.violations ||          ║
        ║     !swing_ok || !reach_ok || !zones_ok ||                   ║
        ║     dl_risk.confidence > 0.7 with severity≥medium:           ║
        ║       → loop back to §C with violations as constraints       ║
        ║         (re-sequence + re-pick tools to clear)               ║
        ║  ELSE: emit signed toolpath to §F                            ║
        ╚══════════════════════════════════════════════════════════════╝
                                       │
                                       ▼
        ╔══════════════════════════════════════════════════════════════╗
        ║  §F — POST-PROCESSING (existing)                              ║
        ║  controller = LathePostKnowledgeGraph.resolve(machine.controller) ║
        ║  gcode = master_post_process(toolpath, controller, machine)  ║
        ║  validated = lathe_safety_predicate_evaluate(gcode)          ║
        ║    (chuck-jaw force + G50 cap + spindle torque + part-off)   ║
        ║  IF !validated → reject; emit reasons; loop back to §D       ║
        ║  emit_signed_program(gcode, signoff_packet)                  ║
        ╚══════════════════════════════════════════════════════════════╝
                                       │
                                       ▼ run on machine, capture outcome
        ╔══════════════════════════════════════════════════════════════╗
        ║  §G — CLOSED-LOOP FEEDBACK (NEW WIRING — existing engines)   ║
        ║  outcome = MTConnect.captureRun(machine_id, run_id)          ║
        ║  outcome += OperatorOverrideStore.feedback(run_id)           ║
        ║  outcome += QualityInspection.measurements(part_id)          ║
        ║  → OutcomeCaptureBus.publish(outcome)                        ║
        ║  → LatheActualFeedbackTuning.tune(outcome)                   ║
        ║    (updates Taylor C, kc_scale, scrap baseline, cycle mult)  ║
        ║  → LatheStockEvolution.updateRemnant(bar_id, parts_run)      ║
        ║  → BarStockInventory.deallocate(consumed)                    ║
        ║                                                              ║
        ║  Cadence-tick (LatheLoRACadence):                            ║
        ║    IF drift_detected(metrics) → trigger retrain              ║
        ║    IF retrain.metrics.improve → auto_promote + version_bump  ║
        ║    NEXT part_spec uses the tuned weights                     ║
        ╚══════════════════════════════════════════════════════════════╝
```

**Key adaptive properties:**
- §A re-runs every part — machine selection is per-job, never cached
- §B re-runs every reorder cycle — stock OD can change if material changes
- §C ↔ §D coupled — sequence affects tool count which affects ROI ranking
- §F → §G is the load-bearing edge — without §G the pipeline is open-loop (current iter143 state)
- §G → next §A is the closed loop — tuned weights bias every downstream decision

---

## 5. Gap → unit list (build order before MVP)

| # | Unit ID | Surface | Estimated effort | Blocker for |
|---|---------|---------|------------------|-------------|
| 1 | `U-LATHE-BARSTOCK-INVENTORY-ENGINE` | NEW engine + 5 dispatcher actions (`barstock_inventory_get`/`_allocate`/`_deallocate`/`_query_available`/`_reorder_alert`) — parallel to `ERPToolInventoryEngine` | ~8h | §B closed-loop |
| 2 | `U-LATHE-WIZARD-MACHINE-SELECT-WIRE` | Wire `LatheControllerSelectEngine` + `LatheJobSchedulingEngine` + `MTConnectLiveStatusEngine` into wizard Stage 4 (REASON) | ~4h | §A automation |
| 3 | `U-LATHE-WIZARD-ROI-RANK-WIRE` | Wire `ToolROIEngine.rankByPayback` into `lathe-wizard-vendor-lookup.mjs` selection logic — replace single-best-score with quantity-context-aware rank | ~3h | §D ROI |
| 4 | `U-LATHE-WIZARD-SEQUENCE-WIRE` | Wire `lathe_sequence_optimize` + `lathe_sequence_validate` into wizard Stage 5 (GENERATE) — re-sequence ops, not just patch threading | ~5h | §C re-sequencing |
| 5 | `U-LATHE-OUTCOME-BUS-WIRE` | Wire `OutcomeCaptureBusEngine` → `LatheActualFeedbackTuningEngine.tune()` — close the open loop | ~4h | §G closed-loop |
| 6 | `U-LATHE-STOCK-EVOLUTION-CUTPLAN-WIRE` | Wire `LatheStockEvolutionEngine` updates into `BarStockCutPlanEngine` for dynamic remnant re-planning | ~3h | §B dynamic re-plan |
| 7 | `U-LATHE-WIZARD-REAL-JM-DIE-VALIDATE` | Run wizard against 100 real `.MIN` programs from `JM DIE/CNC LATHE/<customer>/` — measure score-delta + scrap-prediction accuracy + tool-life prediction accuracy | ~12h | confidence |
| 8 | `U-LATHE-MCP-DISPATCHER-EXPOSE` | Add `prism_lathe:adaptive_pipeline_run` action exposing the full §A→§F chain via MCP — operator-callable | ~3h | UX |
| 9 | `U-LATHE-COLLISION-GATE-WIRE` | Wire §E.5 math layer (`InProcessStockModelEngine` + `LatheCollisionZoneEngine` + `lathe_collision_check`/`_swing_check`/`_boring_reach`) into wizard between Stage E and Stage F. Pure integration — all engines exist. | ~5h | §E.5 math gate |
| 10 | `U-LATHE-CAM-BRIDGE-COLLISION-PARSE` | Parse structured collision-reports back from `hypermill_collision_check` / `mastercam_safety_validate_all` / `fusion360_safety_*` so wizard Stage 4 REASON can react to "Mastercam found 3 collisions at lines [247, 312, 489]" — currently returns opaque pass-through text | ~10h | §E.5 CAM bridges actionable |
| 11 | `U-LATHE-VMDL-TRAIN-FROM-BREACHES` | Wire `LatheEnvelopeBreachReplayEngine` MTConnect-captured breaches → `VirtualMachiningDeepLearningEngine` training corpus so real envelope hits become future prevention signal | ~6h | §E.5 DL closed-loop |
| 12 | `U-LATHE-INPROCESS-STOCK-WIRE` | Wire `InProcessStockModelEngine` updates back into `BarStockCutPlanEngine` for remnant-tracking — same architecture as gap #6, separate engine | ~3h | §B + §E.5 integration |

**Total estimated MVP effort: ~66h** (was ~42h; added ~24h for the 4 simulation/collision wiring units the v1 assessment missed). Only #1 still requires a genuinely new engine — all collision/simulation work is integration-wiring of existing surfaces.

---

## 6. Production-quality + safety gates per soul refuse-list

Per [[reference_whiskey_lathe_soul_designation_2026_05_27]] refuse-list, every Stage in the pipeline MUST enforce:

- `inline-physics-constants` → all kc/mc/Taylor/density imports from `mcp-server/src/physics/constants.ts` — never inline
- `stub-engine-creation` → `comprehensive-build-enforce` hook blocks; never try
- `softening-safety-thresholds` → S(x) ≥ 0.98 (shop_floor tier) on every program emit; never soften
- `skipping-spindle-torque-gate` → §F dispatches `lathe_spindle_torque_check` before signing the G-code
- `skipping-chuck-jaw-force-verify` → §F dispatches `lathe_workholding_select_jaw` + `lathe_partoff_safety_gate` before signing

`master-post-process` + `lathe_safety_predicate_evaluate` are the proof-carrying-emit gates. Any unit that bypasses them violates the soul refuse-list and is rejected by per-file scrutiny.

---

## 7. Pickup procedure (next session — whiskey slot)

1. `/checkin-whiskey` (slot already bound to claude-2402e1be by slot-bind-enforce hook)
2. Read THIS file first for current assessment + design baseline
3. Pick unit #1 (`U-LATHE-BARSTOCK-INVENTORY-ENGINE`) — the one true new-engine ship, unblocks §B closed-loop and is the smallest LOC delta
4. Build via `/forge-triple` after `/dedup` per CLAUDE.md doctrine
5. Per-file scrutiny gate after each file (engine → test → dispatcher wire → integration test)
6. Commit format: `[slot/whiskey] [LATHE-ADAPTIVE-PIPELINE-MS0]/U-LATHE-BARSTOCK-INVENTORY-ENGINE iter1: <title>`
7. After #1: ship #5 (outcome-bus wire) — that's the load-bearing edge that flips the system from open-loop to closed-loop
8. After #5: ship #2-#4-#6 in parallel slot/whiskey iter chain
9. After all integration units: ship #7 (real JM-Die validation) — that's the confidence floor
10. After validation: ship #8 (MCP dispatcher expose) → operator-callable adaptive pipeline

---

## 8. Honest accounting

**What this assessment did NOT do:**
- Did not invoke `prism_session:master_index_query` (operator-mentioned doctrine surface) — MCP daemon was disconnected this session (system reminder confirmed)
- Did not run `prism_session:dispatcher_map_compact` (route-nudge fleet take-rate 11/2719 = 0.4%; the nudge fires on doctrine/command-surface reads but the surface I needed was already in the asset-map memo from iter275)
- Did not scan the 1,327 wiki entries directly — relied on the iter275 asset map which already enumerated them
- Did not validate the assessment claims against current code byte-by-byte — relied on Agent A + Agent B parallel reports + dont-reinvent grep verification of the 2 MISSING claims

**What this assessment DID catch (dont-reinvent corrective):**
- Agent B claimed `LatheBarStockODSelectorEngine` was MISSING — `StockSizeOptimizerEngine.ts` already covers this with 3 wired actions. Without the dont-reinvent skill invocation we would have proposed building a duplicate.

**Confidence:** HIGH on engine-existence claims (3 sources cross-verified: iter275 asset map + 2 parallel agents + dont-reinvent grep). MEDIUM on engine-completeness claims (some engines may have partial implementations not detected by name-match). LOW on Stage 5 robustness against real 15K-line `.MIN` programs (iter143 only tested synthetic fixtures — flagged as gap #7 above).

## Related

- [[reference_whiskey_lathe_complete_asset_map_2026_05_27]] — iter275 asset map (the baseline this assessment composes against)
- [[reference_whiskey_lathe_session_close_iter143_2026_05_27]] — iter143 wizard ship (the foundation §C-§E build on)
- [[reference_whiskey_lathe_soul_designation_2026_05_27]] — soul refuse-list governing §6 safety
- [[feedback_psn_definition]] — 11-leg PSN this pipeline plugs into
- [[reference_jm_die_is_okuma_heavy_implications_2026_05_27]] — 100% Okuma fleet implications
- [[reference_iter218_alcoa_outlier_retraction_2026_05_27]] — why v2.0.0 is pure annotation today (and what §G closed-loop fixes)

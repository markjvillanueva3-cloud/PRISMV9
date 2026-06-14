# POST-BRIDGE-SYNERGY-MS0 — Comprehensive Scope

**Slot:** echo · **Date:** 2026-05-26 · **Operator directive thread:**
1. "/yolo-mode" — continue building
2. "thousands of engines and extracted data and extracted modules from the monolith in the prism folder so scope those too"
3. "we built a bridge into fusion to utilize all our advance prism stuff since the post size started to get too big to use in fusion, so build around that. going to need the same feature for mastercam and hypermill"
4. "bridging databases nodes, mill, lathe and wire wizard nodes and speed feed calculator node so they all synergize with post processor features within the apps and for the post processor generator and master post processor"
5. "I tested v11, sample program is call v11 test … I didn't fill out any tool pocket data since its so tedious"

## Part 1 — Ground truth from `JM DIE/HURCO CNC PROGRAMS/v11 test.hnc`

Live-tested v11 actual output (first 120 lines forensic):

### v11 wins (working as designed)
- **Setup sheet header** (lines 13-29) — 11 ops with T-number / diameter / per-op cycle time / total 18.8 min / WCS — first-piece operator brief ready
- **Tool list** (lines 4-11) — T-number, dia, taper, ZMIN, tool type per tool
- **Safe start block** (G40 G80 G49 G20 G90 G17) + M16 (buffer on) + M59
- **PRISM analysis blocks** per op — strategy name, est time, chip thinning, dynamic depth, axial DOC ratio, feed-factor breakdown
- **Sister tool injection** (line 68: `T19 → T39 life=45min`) — tool-life tracking
- **G05.3 P35 ADAPTIVE ROUGH SMOOTHING** + UltiMotion variables (#1, #4, #5 cutting/entry/exit) injected
- **Prove-out mode banner** (line 71: `Speed 80%, Feed 50% - disable after first good part`) — safety

### v11 P0 bugs (live evidence)
- **Line 70: `(PRISM: Calculation error holderFactor is not defined - using Fusion defaults)`** — runtime exception caught + emitted as comment, falls back to Fusion defaults. This is exactly the silent-failure class that R12 demands we surface. The `holderFactor` variable is referenced but never assigned because the operator did NOT fill out tool pocket data (the iter12-agent-3-confirmed tedium).
- **No pocket data in the output** — descriptors (lines 4-11) carry only what Fusion knows, not what PRISM's `UserToolLibraryEngine.magazine_position` already has on file.
- **Default-mode is prove-out** — meaning even the "live test" wasn't full-speed; we don't yet know whether v11 runs cleanly at production speed/feed.
- **Constant feed F289.5 per block** — adaptive feed modulation per agent-2 report is BUILT but never invoked; v11 emits the Fusion-computed feed unchanged for each block.

## Part 2 — Capability inventory (5-agent synthesis)

### What's already wired into Hurco v11 (5 engines)
`AutoSpeedFeed`, `MachineStrategyConstraint`, `GCodeRuntimePredictor`, `GCodeBidirectionalOptimizer`, `PRISMSelfAwareness`. Plus Kienzle (resolveKienzle) + Taylor (scalar) via direct constant imports.

### What's BUILT and READY but NOT wired (~50+ engines + ~110 cataloged extracted modules + 23 databases)

**Tier-A — bug-fix + immediate ROI (≤2 days each, fixes shipped v11 bug + zero-touch operator UX)**

| # | Capability | Source | Wires what |
|---|-----------|--------|------------|
| A1 | **`holderFactor` undefined fix** | `ToolAssemblyEngine` + `ToolHolderRegistryEngine` | Eliminates line-70 silent runtime error |
| A2 | **Auto-pocket from UserToolLibrary** | `UserTool.magazine_position` field | Eliminates v10/v11 tool-pocket tedium completely |
| A3 | **Auto-magazine integrity gate** | `ToolMagazineIntegrityEngine` | Pre-emit gate: refuse-emit on wrong_pocket/missing_tool/offset_drift |
| A4 | **Sister-tool auto-resolve** | `ToolMagazineOptimizationEngine.sister_tool_enabled` + remaining-life lookup | Already partially working (line 68); expand to all tools |
| A5 | **Coolant sequence validator** | `PPCoolantSequenceValidatorEngine` | M7/M8/M9 typo prevention; spindle-at-speed gate |
| A6 | **Collision hazard scanner** | `CollisionHazardDetectorEngine` (pattern-rejects bad rapids) | Catches "G0 into stock" class |
| A7 | **HSM dwell-at-corner** | `HSMDwellAtCornerEngine` | Burr reduction |
| A8 | **Surface finish Ra predictor** | `BrammertzEngine` + `SurfaceFinishPredictionEngine` | Setup sheet line "will hit Ra 0.8 ±0.2" |
| A9 | **Tribal cited-tip injector** | iter13's 63 cited tips per controller (mazak 38 / siemens 14 / okuma 6 / fanuc 3 / haas 1 / hurco 1) | Comment-inject "Per Sandvik tip #42" justifications |
| A10 | **Probe macro injector** | `ProbeRoutineGeneratorEngine` + `UnifiedProbingDialectEngine` | Auto-inject WCS + tool-setter blocks |

**Tier-B — engine pool currently in PRISM but unwired to Hurco post (~MED effort each)**

| # | Capability | Engine path |
|---|-----------|-------------|
| B1 | Chatter SLD RPM rewrite | `ChatterStabilityLobeEngine`, `MDOFStabilityEngine`, `ChatterNeuralClassifier` (7 actions, zero post wiring) |
| B2 | Adaptive feed modulation | `AdaptiveFeedModulationEngine`, `EngagementAdaptiveFeedEngine`, `AdaptiveOverrideEngine` |
| B3 | Tool deflection (Timoshenko) | `BoringBarDeflectionEngine`, `DeflectionOverlayEngine` (L/D-derate fz) |
| B4 | Coating selection kc1.1 modifier | `CoatingSelectionEngine` (25K) + adapter |
| B5 | Wear physics | `AdvancedWearPhysicsEngine`, `ArchardAdhesiveWearEngine`, `AdaptiveWearEngine` |
| B6 | Gilbert economic speed | `GilbertEconomicSpeedEngine` (3 actions) |
| B7 | Machine-aware SF + Smart Defaults | `MachineAwareSpeedFeedEngine`, smart-defaults bundle (7 actions) |
| B8 | **SFC 9-axis orchestrator** | `sfc_nine_axis_run` — built, not routed; replaces flat autoSpeedFeed |
| B9 | Heat-treat aware SF | `HeatTreatmentAwareSpeedFeedEngine` |
| B10 | Anisotropic material model | `AnisotropicMaterialModelEngine` |
| B11 | Material physics bridges | `HyperMillMaterialPhysicsBridge`, `MastercamMaterialPhysicsBridge`, `Fusion*MaterialBridge`, `BatchCAMMaterialBridgeEngines` |
| B12 | Chip thinning compensation | `ChipThinningCompensationEngine` (calc:chip_thinning) |
| B13 | RTAC + Adaptive Physics Bridge | `AdaptiveControlEngine`, `AdaptiveFeedControlEngine` (7 RTAC actions) |
| B14 | Digital twin EKF sync | `DigitalTwinEngine`, `DigitalTwinSyncEngine`, `DigitalTwinFormulasEngine` |
| B15 | In-process stock model | `InProcessStockModelEngine`, `IntegratedVerificationEngine` (voxel verify) |
| B16 | Full collision certify | `CollisionPreventionEngine` + `SweptVolumeEngine` + `ToolAssemblyModelEngine` |
| B17 | Per-controller LoRA fine-tune | `master_post_fine_tune_*` (12 actions) |
| B18 | Cross-CAM ontology translate | `cam_ontology_translate` |
| B19 | Knowledge graph query | `prism_knowledge:kg_query` |
| B20 | Outcome / closed-loop | `xproc_outcome_publish` + predLog + LoRA retrain |

**Tier-C — `extracted_modules/` (1,788 modules classified, 1,259 WIRE_CANDIDATE, 208 DATABASE, 134 PARTIAL_OVERLAP, 111 DUP_KEEP, 57 STUB, 19 META — ~70% unwired)**

Sub-tier C1 — directly post-relevant (top 20 from agent-5):

| # | Module | Path | Size | Why P0 |
|---|--------|------|-----:|--------|
| C1 | **PRISM_VERIFIED_POST_DATABASE_V2** | `GIANT/` | 114K | Verified per-controller post template table |
| C2 | **PRISM_CONTROLLER_DATABASE** | `priority_extraction/` | 19.5K | G/M/macro per controller — dialect verifier source |
| C3 | **PRISM_POST_PROCESSOR_GENERATOR** | `GIANT/` | — | Novel post-bring-up generator |
| C4 | **PRISM_TAYLOR_COMPLETE** + `TAYLOR_ADVANCED` | `ULTRA/` + `physics_engines/` | 91K + 2K | Full Taylor C/n per material-tool |
| C5 | **PRISM_CUTTING_THERMAL_ENGINE** | `physics_engines/` | **101K** | Komanduri/Jaeger heat partition |
| C6 | **PRISM_CHATTER_PREDICTION_ENGINE** | `priority_extraction/` | 15.3K | Closes stability_rpm_rewrite gap |
| C7 | **PRISM_MACHINE_KINEMATICS_ENGINE** | `priority_extraction/` | 13.4K | DH params + rotary chain (5-axis post) |
| C8 | **PRISM_CUTTING_TOOL_DATABASE_V2** + `STEEL_ENDMILL_DB_V2` + `CUTTING_TOOL_EXPANSION_V3` + `MANUFACTURER_CATALOG_DB` | various | 54.6K + 33K + 59K + 73K | ~220K tool catalog absorption |
| C9 | **PRISM_TOOL_HOLDER_INTERFACES_COMPLETE** | `databases/` | 19.6K | HSK/CAT/BT/Capto specs (fixes A1 holderFactor) |
| C10 | **PRISM_JOHNSON_COOK_DATABASE** | `priority_extraction/` | 7.7K | Plasticity params |
| C11 | **PRISM_HYBRID_TOOLPATH_SYNTHESIZER** | `priority_extraction/` | 62K | Cross-strategy toolpath fusion |
| C12 | **PRISM_FIXTURE_DATABASE** + `HYPERMILL_FIXTURE_DATABASE` | `ULTRA/` + `databases/` | 63K + 3.4K | Fixture catalog |
| C13 | **PRISM_THERMAL_COMPENSATION** | `priority_extraction/` | 6.8K | Spindle/axis thermal growth tables |
| C14 | **PRISM_AIRCUT_ELIMINATION_ENGINE** | `COMPLETE/` | — | Aircut removal (`post_optimize_rapids`) |
| C15 | **PRISM_CYCLE_TIME_PREDICTION_ENGINE** | `COMPLETE/` | — | Accel/jerk-aware timing |
| C16 | **PRISM_COLLISION_MOTION** | `MEGA/` | 53.5K | Motion-aware collision (5-axis) |
| C17 | **PRISM_EKF / EKF_ENGINE** | `ULTRA/` | 101K + 115K | Thermal+wear digital twin |
| C18 | **PRISM_EXPANDED_POST_PROCESSORS** + `FUSION_POST_DATABASE` | `priority_extraction/` + `databases/` | 7.5K + 8K | Vendor post coverage |
| C19 | **{FANUC,HAAS,SIEMENS,MAZAK,MITSUBISHI,OKUMA,HEIDENHAIN}_ALARMS_MASTER** | sister `extracted/controllers/alarms/` | 28K-58K each | Per-controller alarm decode |
| C20 | **PRISM_ROUGHING_LOGIC** + `ROUGHING_MACHINE_CONFIGS_V2` | `ULTRA/` + `databases/` | 74K + 7K | Per-machine roughing defaults |

Sub-tier C2 — database catalog (23 DBs, only 2 wired so far via juliett 2026-05-25/26):

23 databases enumerated by agent-5: `VERIFIED_POST_DB_V2` (114K, NONE), `MANUFACTURER_CATALOG` (73K, NONE), `FIXTURE_DB` (63K, NONE), `CUTTING_TOOL_DB_V2` (54.6K, partial), `STEEL_ENDMILL_DB_V2` (33K, partial), `CONTROLLER_DB` (19.5K, partial), `TOOL_HOLDER_INTERFACES_COMPLETE` (19.6K, partial), `FUSION_POST_DB` (8K, NONE), `JOHNSON_COOK_DB` (7.7K, partial), `ROUGHING_MACHINE_CONFIGS_V2` (7K, NONE), `THERMAL_COMPENSATION` (6.8K, NONE), `TOLERANCE_ANALYSIS_ENHANCED` (6K, partial), **`SURFACE_FINISH_DB` (5.5K, WIRED juliett)**, `TOOL_GENERATOR` (5.4K, partial), `MASTER_DB` (4.8K, unclear), `MACRO_DATABASE_SCHEMA` (4.4K, NONE), `HYPERMILL_FIXTURE_DB` (3.4K, NONE), `SURFACE_FINISH_LOOKUP` (2.7K, partial), `MACHINING_PROCESS_DB` (2.6K, NONE), **`STOCK_POSITIONS_DB` (2.2K, WIRED juliett)**, `THREADING_LOOKUP` (1.8K, partial), `CONSOLIDATED_MATERIALS` (1.7K, partial), `MATERIAL_ALIASES` (534B, partial).

At juliett's current wire-cadence (~1/week), full DB wiring is years out. **POST-BRIDGE-SYNERGY-MS0 should absorb this entire DB shelf as a single phase.**

### Part 3 — Bridge architecture (the operator's anchor insight)

Already exist in PRISM (all 4 in-host runners, total 2341 lines):

| In-host runner | Transport | Status | Add-In resource dir |
|----------------|-----------|--------|---------------------|
| **Fusion 360** | JSON-RPC 2.0 / WebSocket | **LIVE** | `resources/fusion360/prism-test-runner/index.js` ✓ |
| **hyperMILL** | XML-RPC | Engine 508 LOC | **MISSING** — needs `resources/hypermill/prism-bridge/` |
| **Mastercam** | (C# Add-In / stdio pipe) | Engine 470 LOC | **MISSING** — needs `resources/mastercam/prism-bridge/` |
| **Inventor HSM** | (Inventor API) | Engine 472 LOC | **MISSING** — needs `resources/inventor-hsm/prism-bridge/` |
| Unification | 253-line `CAMInHostResultsBridgeEngine` — common 7-family assertion contract |

The post file shouldn't carry intelligence. It should be a thin emitter that delegates to PRISM via the bridge. v11's 19,265-line .cps grew because we inlined intelligence that the bridge should serve.

### Synergy node wiring (operator's 4 named nodes)

```
DB node   ──┐
Wizard node ┤
SFC node   ─┼──→  CAMInHostBridge  ──→  Fusion / Mastercam / hyperMILL / Inventor HSM
PostGen    ─┤
           ─┘
         (same bridge serves: in-CAM-app live use AND post-processor generation)
```

Each node exposes ONE contract; bridge fan-outs to consumers. Today every consumer reaches into engines directly — N×M coupling.

## Part 4 — Full milestone scope: `POST-BRIDGE-SYNERGY-MS0`

Enumerate ALL identified units (comprehensive-build enforcement). Phased for dependency.

### Phase 0 — v11 bug-fix + tedium-kill (operator-blocking, ≤3 days total)

| Unit | Deps | Blocks |
|------|------|--------|
| **U-V11-HOLDERFACTOR-FIX** — wire `ToolAssemblyEngine`+`ToolHolderRegistry` so `holderFactor` resolves; eliminates line-70 silent runtime error | A1 + C9 | All future v11 emits |
| **U-V11-AUTO-POCKET-FROM-LIBRARY** — read `UserTool.magazine_position` at emit; skip manual prompt entirely when library has the data | A2 | Operator UX |
| **U-V11-MAGAZINE-INTEGRITY-GATE** — pre-emit `ToolMagazineIntegrityEngine` check; refuse-emit on offset drift / wrong-pocket / missing-tool / insufficient-life | A3 | A2 |
| **U-V11-PROVE-OUT-FLAG-EXPLICIT** — make prove-out opt-in not default; emit at 100% when operator says "production ready" | (none) | Production speed v11 |
| **U-V11-WINMAX-COMMENT-RESTORE** — regression from v8.9 (agent-1 finding) | (none) | v8.9 backcompat |
| **U-V11-AGGRESSIVENESS-RENAME-SHIM** — `prismAggressivenessLevel` ⇆ `prismOptimizationMode` compat (agent-1 finding) | (none) | v8.9 backcompat |

### Phase 1 — Bridge parity (build the 3 missing Add-Ins)

| Unit | Deps | Blocks |
|------|------|--------|
| **U-MASTERCAM-ADDIN-RESOURCES** — `resources/mastercam/prism-bridge/` C# Add-In; mirror Fusion JS contract; wire to `MastercamInHostRunnerEngine` | (none) | Mastercam intelligence-offload |
| **U-HYPERMILL-ADDIN-RESOURCES** — `resources/hypermill/prism-bridge/` AC automation; wire to `HyperMillInHostRunnerEngine` | (none) | hyperMILL intelligence-offload |
| **U-INVENTOR-ADDIN-RESOURCES** — `resources/inventor-hsm/prism-bridge/` Inventor API; wire to `InventorHSMInHostRunnerEngine` | (none) | Inventor HSM intelligence-offload |
| **U-BRIDGE-CONTRACT-VERIFY** — cross-host parity tests; same scenario → structurally-equivalent results across all 4 hosts | all of above | Confidence guarantee |

### Phase 2 — Synergy node wiring (operator's 4 nodes)

| Unit | Deps | Blocks |
|------|------|--------|
| **U-DB-NODE-BRIDGE** — single `prism_bridge:db_query` contract; consumes all 23 databases via uniform schema | C2 catalog | Replaces N×M direct catalog reads |
| **U-DB-NODE-ABSORB-21** — wire the 21 currently-unwired databases from C2 catalog (juliett's wire cadence absorbed in one milestone) | U-DB-NODE-BRIDGE | Closes the years-out cadence |
| **U-WIZARD-NODE-BRIDGE** — mill / lathe / wire wizards expose `wizard_run(domain, intent, context)`; master post calls in for strategy decisions | (none) | Strategy-rule duplication |
| **U-SFC-NODE-BRIDGE** — `sfc_nine_axis_run` becomes ONLY SF surface; Hurco/Okuma/Haas/Fanuc/Mastercam all route through | B8 | Kills 5+ duplicate SF code paths |
| **U-POST-GEN-BRIDGE** — `PPG` engines + `MasterPostProcessor` consume same bridge as in-host runners; single contract, two clients | Phase 1 complete | Post-generation parity |

### Phase 3 — Extracted-modules absorption (the 1,259 WIRE_CANDIDATE shelf)

| Unit | Deps | Blocks |
|------|------|--------|
| **U-EXTRACT-VERIFIED-POST-DB** — absorb `PRISM_VERIFIED_POST_DATABASE_V2` (114K, C1) | U-DB-NODE-BRIDGE | Per-controller post template lookups |
| **U-EXTRACT-CONTROLLER-DB** — absorb `PRISM_CONTROLLER_DATABASE` (C2) | U-DB-NODE-BRIDGE | Dialect translator + cross-controller alignment |
| **U-EXTRACT-POST-GENERATOR** — absorb `PRISM_POST_PROCESSOR_GENERATOR` (C3) | U-EXTRACT-CONTROLLER-DB | Novel controller bring-up |
| **U-EXTRACT-TAYLOR-COMPLETE** — absorb `TAYLOR_COMPLETE` (91K, C4) + `TAYLOR_ADVANCED` | (none) | Tool-life accuracy across system |
| **U-EXTRACT-CUTTING-THERMAL** — absorb `CUTTING_THERMAL_ENGINE` (101K, C5) | (none) | Thermal-comp + dwell + burn-risk |
| **U-EXTRACT-CHATTER-PREDICT** — absorb `CHATTER_PREDICTION_ENGINE` (15.3K, C6) | (none) | Stability_rpm_rewrite |
| **U-EXTRACT-KINEMATICS** — absorb `MACHINE_KINEMATICS_ENGINE` (13.4K, C7) | (none) | 5-axis RTCP/G68.2/G43.4 |
| **U-EXTRACT-TOOL-CATALOG-220K** — absorb `CUTTING_TOOL_DB_V2 + STEEL_ENDMILL_DB_V2 + EXPANSION_V3 + MANUFACTURER_CATALOG_DB` (~220K, C8) | U-DB-NODE-BRIDGE | Tool catalog depth |
| **U-EXTRACT-HOLDER-INTERFACES** — absorb `TOOL_HOLDER_INTERFACES_COMPLETE` (19.6K, C9) | (none) | Resolves A1 / U-V11-HOLDERFACTOR-FIX |
| **U-EXTRACT-JOHNSON-COOK-DB** — absorb `JOHNSON_COOK_DATABASE` (C10) | (none) | Force/temp accuracy upgrade |
| **U-EXTRACT-HYBRID-TOOLPATH** — absorb `HYBRID_TOOLPATH_SYNTHESIZER` (62K, C11) | (none) | Adaptive/HSM/trochoidal fusion |
| **U-EXTRACT-FIXTURE-DBs** — absorb `FIXTURE_DATABASE` (63K) + `HYPERMILL_FIXTURE_DATABASE` (3.4K) (C12) | U-DB-NODE-BRIDGE | Fixture-aware emission |
| **U-EXTRACT-THERMAL-COMP** — absorb `THERMAL_COMPENSATION` (6.8K, C13) | U-EXTRACT-CUTTING-THERMAL | Spindle/axis growth tables |
| **U-EXTRACT-AIRCUT-ELIM** — absorb `AIRCUT_ELIMINATION_ENGINE` (C14) | (none) | post_optimize_rapids |
| **U-EXTRACT-CYCLE-TIME** — absorb `CYCLE_TIME_PREDICTION_ENGINE` (C15) | (none) | Accel/jerk-aware timing |
| **U-EXTRACT-COLLISION-MOTION** — absorb `COLLISION_MOTION` (53.5K, C16) | (none) | 5-axis collision |
| **U-EXTRACT-EKF-DIGITAL-TWIN** — absorb `EKF + EKF_ENGINE` (216K, C17) | (none) | Thermal+wear closed-loop |
| **U-EXTRACT-EXPANDED-POSTS** — absorb `EXPANDED_POST_PROCESSORS` + `FUSION_POST_DATABASE` (C18) | U-EXTRACT-VERIFIED-POST-DB | Vendor post variant coverage |
| **U-EXTRACT-ALARMS-MASTER** — absorb 7 `*_ALARMS_MASTER` (28K-58K each, C19) from sister `extracted/` | (none) | alarm_decode coverage gap |
| **U-EXTRACT-ROUGHING-LOGIC** — absorb `ROUGHING_LOGIC` (74K) + `ROUGHING_MACHINE_CONFIGS_V2` (7K, C20) | (none) | Roughing strategy emission |
| **U-EXTRACT-SEMANTIC-MATCHER** — meta unit: replace lexical Jaccard matcher with semantic-similarity matcher to detect WIRE_CANDIDATEs that are real duplicates of existing engines under different names (agent-5 gap-diagnosis #1) | (none) | Accurate classification of remaining 1,239 WIRE_CANDIDATEs |
| **U-EXTRACT-NOT-FOUND-CHASE** — chase the per-bucket EXTRACTION_SUMMARY `NOT_FOUND` rows (databases=14, physics=11) — these are real abandoned features (agent-5 gap #2) | (none) | True extraction completeness |
| **U-EXTRACT-MATERIAL-AGGREGATORS** — re-route P_STEELS_complete (157K), M_STAINLESS_complete (62K), tool_steels_hardness_conditions (31K), carbon_alloy_steel_conditions (30K), stainless_steels_001_050 ×4 from heuristic-misrouted `ai_ml` to `prism_data` (agent-5 gap #4) | (none) | Material catalog completeness |

### Phase 4 — Engine pool wiring (the Tier-B 20 items)

| Unit | Source |
|------|--------|
| U-WIRE-CHATTER-SLD | B1 |
| U-WIRE-ADAPTIVE-FEED-MOD | B2 |
| U-WIRE-TOOL-DEFLECTION | B3 |
| U-WIRE-COATING-KC11-MODIFIER | B4 |
| U-WIRE-WEAR-PHYSICS | B5 |
| U-WIRE-GILBERT-ECON | B6 |
| U-WIRE-MACHINE-AWARE-SF | B7 |
| U-WIRE-SFC-9AXIS-AS-ONLY-SF | B8 |
| U-WIRE-HEAT-TREAT-SF | B9 |
| U-WIRE-ANISOTROPIC-MAT | B10 |
| U-WIRE-MATERIAL-PHYSICS-BRIDGES | B11 |
| U-WIRE-CHIP-THINNING-COMP | B12 |
| U-WIRE-RTAC + ADAPTIVE-PHYSICS-BRIDGE | B13 |
| U-WIRE-DIGITAL-TWIN-EKF | B14 |
| U-WIRE-INPROCESS-STOCK-VOXEL | B15 |
| U-WIRE-COLLISION-CERTIFY | B16 |
| U-WIRE-PER-CONTROLLER-LORA | B17 |
| U-WIRE-CROSS-CAM-ONTOLOGY | B18 |
| U-WIRE-KG-QUERY | B19 |
| U-WIRE-OUTCOME-CLOSED-LOOP | B20 |

### Phase 5 — Closed-loop self-learning (the operator's earlier question)

| Unit | Deps | Outcome |
|------|------|---------|
| **U-OUTCOME-CAPTURE-ADDINS** — every CAM host Add-In streams emit-result outcomes back via the bridge | Phase 1 + B20 | Real outcome data flows to PRISM |
| **U-OUTCOME-TO-PREDLOG-PAIR** — outcomes pair with original emit's prediction in predLog | U-OUTCOME-CAPTURE-ADDINS | Score adjustment ground truth |
| **U-PER-CONTROLLER-LORA-AUTO-RETRAIN** — scheduled retrain when outcome batch hits threshold | B17 + U-OUTCOME-TO-PREDLOG-PAIR | Compounding accuracy |
| **U-A/B-SHADOW-PROMOTE** — new post version → `cam_serve_deploy_shadow` (already exists, unused) → A/B vs baseline → promote on win | (none — engine exists) | Safe rollout |
| **U-DRIFT-DETECT-ALERT** — outcome distribution shift on a tip → flag for re-extraction or override | U-PER-CONTROLLER-LORA-AUTO-RETRAIN | Quality maintenance |

## Part 5 — Total scope: 51 units across 6 phases

| Phase | Units | Focus |
|-------|------:|-------|
| 0 — v11 bug-fix + tedium kill | 6 | Operator-blocking; ships v11.x today |
| 1 — Bridge parity (3 Add-Ins) | 4 | Mastercam / hyperMILL / Inventor HSM Add-In resource dirs |
| 2 — Synergy nodes (DB / wizard / SFC / postgen) | 5 | Operator's 4-node directive |
| 3 — Extracted-modules absorption | 23 | The 1,788-module shelf (~220K tool catalog + 23 DBs + 7 alarm masters + …) |
| 4 — Engine pool wiring (Tier-B) | 20 | 20 built-but-unwired engines |
| 5 — Closed-loop self-learning | 5 | The earlier-asked closed-loop system |
| **Total** | **63 units** | (51 unique + ~12 shared dependencies counted once) |

## Part 6 — Recommendation + immediate next move

**Start with Phase 0 immediately** — 6 units fix v11's live-test bug + kill the tool-pocket tedium. These are small, atomic, and unblock everything downstream. None require the bridge or new engines.

**Then Phase 1 in parallel** — 3 missing Add-In resource dirs are independent of Phase 0; can ship via separate slots (foxtrot/mike/lima or similar).

**Phase 2-3 are the big payoff** — single milestone absorbs 23 DBs + 1,000+ extracted modules + wires the synergy contracts. This is multi-week work, best owned by a dedicated slot (proposed: echo continues, or split across echo/charlie/papa).

**Phase 4 is operator-driven** — each Tier-B engine wiring is a small unit but operator should rank by perceived sales value (which capabilities do customers ask about?).

**Phase 5 closes the loop** — depends on Phase 1 (Add-Ins are where outcome data originates). Real closed-loop self-learning ships at the end of this chain, not at the start. Building it earlier would be premature without outcome data flowing.

**Ship-readiness gate (operator question "do you have confidence in writing posts now?"):** Phase 0 + Phase 4 partial (U-WIRE-SFC-9AXIS, U-WIRE-CHATTER-SLD, U-WIRE-COATING) = ~9 units. That's the minimum bar to confidently emit non-shop-tested posts. Phase 5 (closed-loop) is what eventually makes posts self-improving without operator review.

**Cron status**: `142b76f4` cancelled at iter20. This scope replaces the prior loop. Operator green-lights → start as fresh `/loop POST-BRIDGE-SYNERGY-MS0`.

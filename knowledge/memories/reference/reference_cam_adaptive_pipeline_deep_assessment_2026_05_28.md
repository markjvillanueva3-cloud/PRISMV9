---
name: reference-cam-adaptive-pipeline-deep-assessment-2026-05-28
description: CAM adaptive-pipeline deep assessment — verdict YES (more than enough engine surface) but missing the outer orchestrator. 90+ engines mapped across the operator's 7-step adaptive-pipeline contract (machine-select → stock-size → workholding → op-order → tool/holder → machine-capability → post-emit). PrintToProgramOrchestratorEngine named by domain-pipeline-ms0 doctrine still missing on disk. PrintToProgramPipelineEngine (2791 LOC, 5 stages) is the closest neighbor.
type: reference
slot: kilo
source: prism-memory
synced: 2026-06-09T14:54:09.045Z
aliases: reference_cam_adaptive_pipeline_deep_assessment_2026_05_28
---


# Deep assessment — adaptive-pipeline readiness for closed-loop self-training

**Operator ask (2026-05-28):** *"do another deep assessment and deep dive into engines, wiki, algorithms, tribal knowledge, resources, existing programs … assess if we have enough to develop a self training, self improving pipeline for closed loop learning. then we need to devise a variable, adaptive pipeline … decides what machine + stock size + first-op workholding (Kurt vise parallels, MiteeBite/toe-clamp/vacuum/magnet ROI, soft-jaw generation) + op order (interrupted-cut avoidance, chip-thickness, SFC) + optimal tools/holders + machine capabilities (brand, way type, motion, spindle, taper interface CAT40/BigPlus/BT/HSK/Capto, G-forces, kinematics, work envelope, max RPM/feed/rapid, controller features, parameter optimizations) + post-processor emit (optimized, cost-efficient, accurate, safe)."*

## Verdict

**YES — far more than enough engine surface.** 90+ engines map directly to the operator's 7-step adaptive-pipeline. The bottleneck is **orchestration + runtime verification**, not engine count.

The single missing piece: **`PrintToProgramOrchestratorEngine`** — named by `domain-pipeline-ms0` doctrine as the highest-leverage missing engine. Glob returns 0 hits. The existing `PrintToProgramPipelineEngine.ts` (2791 LOC, 5 stages: Drawing Intake → Feature Extract → Process Planning → Program Generation → Validation) is the closest neighbor and already chains 12 helper engines via direct import, but stops short of ERP-machine-availability driving and the workholding-decision layer.

## Engine inventory by stage (counts, flagships)

| Stage | Engine count | Flagship |
|---|---:|---|
| Machine selection (ERP + capability + scheduling + shop-floor + quoting) | **42** | `MachineCapabilityIntelligenceEngine` (1203 LOC) — provenance-tagged spindle/axis/envelope/torque-curve from handbook + spindle-corrections + torque-curves + MachineRegistry, per-field confidence; tracks `taper_type`, `drive_type`, `bearing_type`, `drawbar_force`, `gear_ranges`, `torque_curve` |
| Stock size | **17** | `StockSizeOptimizerEngine` (392 LOC) |
| Workholding | **24** (10 wh + 11 fixture + 3 clamping) | `WorkholdingIntelligenceEngine` (499 LOC) — 9 fixture types (vise / 3jaw / 4jaw / collet / fixture_plate / vacuum / magnetic / soft_jaws / custom), clamp force / contact area / friction / deflection / soft_jaw_design output. `WorkholdingRetrofitAdvisorEngine` is the ROI-upgrade advisor the operator named. Vendor catalogs: prism-kurt-vise-database node, Kurt US Catalog 2022 PDFs, MiteeBite recognized in `WorkholdingViabilityEngine` + `MachiningPlaybookEngine` (4474 LOC) |
| Operation order | **12** sequence + 1 air-cut + 1 interrupted-cut + 4 chip algorithms + SFC stack | `CAMOperationSequencePlannerEngine`, `InterruptedCutAvoidanceEngine` (shipped 2026-05-28), `ChipThinningCompensation`, `SpeedFeedNineAxisOrchestratorEngine` (2851 LOC) |
| Tool + holder | **4 holder + 24 tool catalogs (.ts) + 14 extracted .json (41192 deduped tools)** | `HolderOperationMatchEngine` + `SmartToolSelectorEngine` + `CoatingSelectionEngine` |
| Taper interface (CAT40/BigPlus/BT/HSK/Capto) | core | `MachineCapabilityIntelligenceEngine.taper_type: ProvenanceField<string>` — handbook-sourced, confidence-graded |
| Way type / build quality / G-forces | distributed | `MachineRegistry`, `MachineHandbookRegistryEngine`, `MachineStrategyConstraintEngine`, `MillingMachineIntelligenceEngine`, `MillComprehensiveNeuralEngine`, `MastercamControllerCatalogEngine`, `LatheKinematicsDeepLearningEngine`, `PPMachineVectorEncoderEngine` |
| Spindle | **15** | `SpindleTorqueCurveEngine`, `AdaptiveSpindleControlEngine`, `PPSpindleSpeedSafetyEngine` |
| Kinematics | **9** | `MachineKinematicsEngine`, `MillKinematicsCollisionEngine`, `PostProcessorMachineKinematicsEngine` (5-axis post) |
| Parameter optimization | **9** | `CAMParameterOptimizerEngine`, `BanditParameterOptimizerEngine` (multi-armed bandit, prior-aware), `HyperMillCycleParameterPipeline` |
| Post-emit + safety | **61 + 18 master-post + 12 lathe + 15 safety + 9 CAM→Post bridges + ~190 codegen** | `PostProcessorPipelineEngine` (218 KB) + `HurcoV11MillMasterPostEngine` (91.9K flagship) + echo's iter51 (conformal PI bands) + iter52 (Mahalanobis OOD-gate refuse-hallucinated-emit) |
| Closed-loop learning | 4 inner-loop engines | `TemplateApplicabilityClassifierEngine` + `SelfLearningLoopOrchestratorEngine` (7-state FSM) + `OutcomeFeedbackWireEngine` + `ToolpathTipRetrieverEngine` (all kilo, 2026-05-26..28) |
| ERP integration | **9** | `ERPWorkOrderEngine`, `ERPIntegrationEngine`, `MultiERPConnectorEngine`, `ERPCostFeedbackEngine` |
| Shop-floor | **8** | `ShopFloorCheckInEngine`, `ShopFloorScheduleEngine`, `ShopFloorQuoteEngine` |

## Existing program corpus (training data)

| Source | Count | Notes |
|---|---:|---|
| Mastercam X8 `.mcx-8` | 95+ | JM Die customer programs |
| hyperMILL `.hmc` | 31+ | OKUMA + HAAS-HURCO + training |
| Esprit `.esp` | 28 | WIRE EDM / TOMEK |
| Fusion 360 | extracting | operator-confirmed "still extracting" — A6 gap |
| Hurco NC | numerous | HURCO CNC PROGRAMS |
| Okuma MIN | numerous | CNC OKUMA MULTUS + OKUMA/ |
| PRISM-modified .cps | 17 | Hurco VM30i v11 (794.7K flagship) |
| Tribal corpus | 224 toolpaths × 1020 tips × 219 video transcripts | per-entry wiki MD |

## The missing orchestrator — 7-step composition contract

| Step | Composes |
|---|---|
| 1 | `ERPWorkOrderEngine.getActiveLoad()` + `ShopFloorScheduleEngine.getAvailability()` + `MachineSelectionEngine.rank()` + `MachineCapabilityIntelligenceEngine.profile(machineId)` |
| 2 | `StockSizeOptimizerEngine.select(material, part_bbox, allowance)` |
| 3 | `WorkholdingIntelligenceEngine.fixture_recommend(...)` returning clamp positions + force + contact area + soft_jaw_design + ROI alternatives |
| 4 | `IntelligentSequencingEngine.sequence(...)` + `InterruptedCutAvoidanceEngine.detect({mode: sequence})` + `AirCutDetectionEngine.detect(gcode)` (post-emit verify) |
| 5 | `SmartToolSelectorEngine` + `HolderOperationMatchEngine` + `SpeedFeedNineAxisOrchestratorEngine` + `ChipThinningCompensation` |
| 6 | `MachineCapabilityIntelligenceEngine.profile` + `MachineEnvelopeGuardEngine.gate` + `CAMParameterOptimizerEngine` + `BanditParameterOptimizerEngine.tune(history)` |
| 7 | `PostProcessorPipelineEngine.emit` + `PPSpindleSpeedSafetyEngine` + `GCodeSafetyAnalyzerEngine` + `mahalanobis-ood-gate.mjs` + `conformal-pi-emit.mjs` |
| feedback | `SelfLearningLoopOrchestratorEngine.observe(run_id)` → `OutcomeFeedbackWireEngine.update` → corpus delta + bandit posterior update |

## Highest-leverage next ships (in order)

1. **`U-ADAPTIVE-PIPELINE-ORCH`** — ~600-800 LOC compose-only orchestrator. The single binding glue.
2. **`U-ADAPTIVE-PIPELINE-WET-RUN`** — drive ONE real JM Die program end-to-end. Wet-run failure list becomes next /loop's work order.
3. **`U-CAM-COVERAGE-SCORER`** — re-runnable scorer (mirrors delta's `cad-pipeline-coverage-scorer.mjs`). Closes the static-vs-runtime caveat with falsifiable numbers.

Plus A2-A6 from spec §6 (ERP-machine-pick, soft-jaw-gen-verify, tool-holder-ROI-advisor, build-quality-grade, Fusion-extract pipeline) and G1-G13 from prior `CAM-VS-CAD-GAP-DIFF-2026-05-28.md`.

## Closed-loop readiness scorecard

Every adaptive-pipeline stage has built + wired status. Most stages partial wet-run. **The OUTER orchestrator is the only ❌ across all 4 columns** (built / wired / wet-run / closed-loop). Once shipped, closed-loop self-training is ON.

## Cross-refs

- Full spec: `state/shared/specs/CAM-ADAPTIVE-PIPELINE-DEEP-ASSESSMENT-2026-05-28.md` + .html
- Prior CAM gap diff: `state/shared/specs/CAM-VS-CAD-GAP-DIFF-2026-05-28.md`
- Delta CAD audit pattern: `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md`
- [[reference_oscar_sfc_domain_map_2026_05_27]] — SFC domain
- [[reference_echo_post_processor_domain_map_2026_05_27]] — PP domain
- [[reference_cam_corpus_locations]] — JM Die paths
- [[reference_cam_self_teaching_pipeline_ms0]] — first MS0 spec
- [[feedback_ai_training_first_before_revenue]] — supporting doctrine

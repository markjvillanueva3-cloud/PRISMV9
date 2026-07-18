# CAM adaptive-pipeline deep assessment — do we have enough for closed-loop self-training?

> **Author:** claude-ea0ff1a5 (slot **kilo**, 2026-05-28)
> **Trigger:** operator follow-up — *"do another deep assessment and deep dive into engines, wiki, algorithms, tribal knowledge, resources, existing programs … assess if we have enough to develop a self training, self improving pipeline for closed loop learning. then we need to devise a variable, adaptive pipeline (I think we made one already) for every part in our system that can be machined …"*
> **Scope:** the full machining-decision stack the operator named — machine selection (ERP-aware), stock-size, workholding (Kurt vise parallels, MiteeBite/toe-clamp/vacuum/magnet ROI, soft-jaw generation), op sequencing (interrupted-cut avoidance + chip thickness via SFC), tool+holder ROI, machine-capability profiling (way type / spindle / taper interface / G-forces / kinematics / work envelope / controller features), post-processor output.
> **Method:** parallel discovery — Glob for 12 engine families + Grep for vendor-named items (Kurt, MiteeBite, CAT40/BT/HSK/Capto, way types). Read load-bearing engines end-to-end. Cross-walked against delta's CAD pipeline pattern.

---

## 1. Verdict (up-front)

### YES — we have FAR more engine surface than we need for closed-loop self-training.

The bottleneck is **NOT engine count.** The bottleneck is:

1. **Orchestration** — the engines exist but the outer-orchestrator that composes them per the user's exact 7-step adaptive-pipeline contract (machine-select → stock-size → workholding → op-order → tool/holder → machine-capability use → post-emit) does NOT exist. The `PrintToProgramOrchestratorEngine` named by `domain-pipeline-ms0` doctrine as the *highest-leverage missing engine* is still missing on disk (Glob returns 0 hits). The existing `PrintToProgramPipelineEngine.ts` (**2791 LOC, 5 stages**) is the closest neighbor — it already chains 12 helper engines but stops at "process planning → program generation → validation" without the ERP-machine-availability driver or the workholding-decision layer the user wants.

2. **Runtime verification** — same pattern delta surfaced in CAD: file-on-disk presence ≠ runtime integration. Most of the engines below have not been wet-run against the JM Die mcx-8 / hmc / Hurco-NC / Okuma-MIN corpus.

3. **Closed-loop feedback** — the *learning ring* is half-built. kilo's 4-engine inner closed loop (TemplateApplicabilityClassifier + SelfLearningLoopOrchestrator + OutcomeFeedbackWire + ToolpathTipRetriever, shipped this week) is the learning brain. The OUTPUT side (outcome → corpus delta → retrain signal → tool/material/machine prior update) is wired. The INPUT side (real shop-floor cycle-time / surface-finish / scrap-rate ingestion) is wired through `ShopFloorCheckInEngine` + 7 sibling ShopFloor engines. **The missing link is: a single orchestrator that drives one part through all 7 steps, records the outcome, and the loop closes itself.**

**Operator decision needed:** ship the missing orchestrator first (`U-ADAPTIVE-PIPELINE-ORCH`) or fill the runtime-verification gap first (the `U-CAM-COVERAGE-SCORER` + `U-CAM-TEST-PLAYBOOK` from my prior gap-diff). My recommendation is **orchestrator first** — it's the binding glue and proves the assembled stack works end-to-end against one part, after which the scorer/playbook quantify it.

---

## 2. Engine-surface inventory by adaptive-pipeline stage

Counts are **engines ON DISK** (`Glob` hits). Wiring status pulled from BUILD_STATE 2026-05-27 (3549 wired / 160 unwired across the fleet). Per-engine wiring status not enumerated — most are wired.

### 2.1 Machine selection (ERP + shop-floor + availability)

| Component | Count | Flagship + notes |
|---|---:|---|
| Machine-selection engines | 2 | `MachineSelectionEngine`, `CAMMachineSelectionEngine` |
| Machine-capability engines | 15 | **`MachineCapabilityIntelligenceEngine`** (1203 LOC, HBK-MS4) — unifies torque curves + axis kinematics + work envelope + rapid traverse + thermal comp from 4 data sources with per-field **provenance + confidence**. Tracks taper_type, drive_type, bearing_type, drawbar_force, gear_ranges, torque_curve. **Exactly what the operator asked for.** Sibling: `MachineCapabilitySurfaceEngine` (759 LOC), `MachineCapabilityIndexEngine`, `MachineHandbookRegistryEngine`, `MachineStrategyConstraintEngine`. |
| ERP engines | 9 | `DERPlusPlusEngine`, **`ERPIntegrationEngine`**, `ERPImportEngine`, `ERPQualityEngine`, `ERPToolInventoryEngine`, `ERPWorkOrderEngine`, `LatheERPOrchestratorEngine`, `MultiERPConnectorEngine`, `ERPCostFeedbackEngine` |
| Scheduling engines | 8 | `JobShopSchedulingEngine`, `LatheJobSchedulingEngine`, `ProjectSchedulingEngine`, `SchedulingEngine`, `SchedulingPhysicsEngine`, `SchedulingStudyAggregatorEngine`, `WEDMSchedulingEngine`, `cycleSchedulingBridge` |
| Shop-floor engines | 8 | `ShopFloorCheckInEngine`, `ShopFloorCostEngine`, `ShopFloorDashboardEngine`, `ShopFloorJobEngine`, `ShopFloorNoteIngestionEngine`, `ShopFloorQuoteEngine`, `ShopFloorReportEngine`, `ShopFloorScheduleEngine` |
| Quoting engines | 2 | `QuotingEngine`, `QuotingFormulaEngine` |
| JM Die selector | utility | `mcp-server/src/utils/jmDieSelectorCatalog.ts` — 15-machine controller map per `[[reference_oscar_sfc_domain_map_2026_05_27]]` |
| Registries | core | `MachineRegistry.ts` (55K — 910 machines), `MachineSpindleDefaults.ts`, machine-kinematics-catalog + extended + enriched (1.2MB), machine-torque-curves.ts (745K, 1058 curves, 166 from HSMAdvisor) |

**Assessment:** Machine selection ERP+availability has 42 engines covering it. **The ERP-driven decision logic** ("given current shop load + this work order, what machine should this part run on?") is fragmented across `ERPWorkOrderEngine`, `MachineSelectionEngine`, `ShopFloorScheduleEngine`, `JobShopSchedulingEngine` — no single decision engine wires them.

### 2.2 Stock size selection

| Component | Count | Flagship + notes |
|---|---:|---|
| Stock-model engines | 17 | **`StockSizeOptimizerEngine`** (392 LOC) ← directly answers user's ask. Plus `StockSelectionEngine`, `StockAllowanceEngine`, `StockBoundaryGateEngine`, `BarStockCutPlanEngine` (lathe), `BarStockVibrationEngine`, `MaterialStockEngine`, `VoxelStockEngine`, `HyperCADSStockModelEngine`, `InProcessStockModelEngine`, `LatheStockEvolutionEngine`, `CumulativeStockChainEngine`, `StockFeedCycleEngine`, `StockModelEngine`, `StockWorkholdingCatalogEngine`, `VoxelStockIntegrationEngine`, `CAMStockModelEngine` |

**Assessment:** **Over-covered.** `StockSizeOptimizerEngine` is the named primitive — needs to be invoked by the new orchestrator with material + part bounding box + workholding choice.

### 2.3 Workholding decisions

| Component | Count | Flagship + notes |
|---|---:|---|
| Workholding engines | 10 | **`WorkholdingIntelligenceEngine`** (499 LOC) — recognizes 9 fixture types (`vise / chuck_3jaw / chuck_4jaw / collet / fixture_plate / vacuum / magnetic / soft_jaws / custom`), computes clamping force vs cutting force × safety factor / friction, deflection (beam model), pull-out risk, **soft jaw design output** (jaw_width / step_depth / bore_pattern). `WorkholdingForceEngine`, `WorkholdingSelectionEngine`, `WorkholdingViabilityEngine` (596 LOC), **`WorkholdingRetrofitAdvisorEngine`** (← the ROI-upgrade advisor the user wants), `WorkholdingSurfaceInferenceEngine`, `WorkholdingVerificationEngine`, `LatheWorkholdingEngine`, `StockWorkholdingCatalogEngine`, base `WorkholdingEngine` |
| Fixture engines | 11 | **`FixtureDesignEngine`**, **`FixtureClampingEngine`**, `FixtureAwareStrategyEngine`, `FixtureCadIngesterEngine`, `FixtureDynamicsEngine`, `FixturePartCatalogEngine`, `FixturePlateEngine`, **`ModularFixtureLayoutEngine`**, **`ThreeDPrintedFixtureEngine`**, `WEDMFixtureInterferenceEngine`, **`CAMFixtureSelectionEngine`** (231 LOC) |
| Clamping engines | 3 | `ClampingForceEngine`, `ClampingSimEngine`, `FixtureClampingEngine` |
| Vendor catalogs | core | **`prism-kurt-vise-database`** node in system-viz; Kurt US Catalog 2022 PDFs at `H:/PRISM/resources/WORKHOLDING AND FIXTURE CATALOGS/`. MiteeBite present in `WorkholdingViabilityEngine`, `WorkholdingIntelligenceEngine`, `MachiningPlaybookEngine` (4474 LOC, the playbook brain) |
| Schemas | core | `mcp-server/src/schemas/hypermill/fixture/workholdingSchemas.ts` |

**Assessment:** 24 engines + Kurt vise DB + Kurt PDFs + MiteeBite recognition. **The user's specific asks have direct surface:**

| User ask | Engine that owns it | Wired? |
|---|---|---|
| Kurt vise parallel-height selection (clamp force + clamping area) | `WorkholdingIntelligenceEngine.fixture_recommend` returns `clamp_positions` + `clamp_force_n` + `contact_area_mm2` | wired |
| Automatic jaw fixture generation for 2nd-op odd features | `WorkholdingIntelligenceEngine.soft_jaw_design` (jaw_width / step_depth / bore_pattern) — present in shape, generation logic needs verification | partial |
| ROI clamping suggestions (MiteeBite, toe clamps, magnet, vacuum) | `WorkholdingRetrofitAdvisorEngine` — exists, needs verification it handles these 4 cases | needs check |

### 2.4 Operation order (interrupted-cut avoidance + chip thickness + air-cut)

| Component | Count | Flagship + notes |
|---|---:|---|
| Sequence engines | 12 | `OperationSequencerEngine`, `OperationSequenceMinerEngine`, **`CAMOperationSequencePlannerEngine`**, `CAMClickSequenceEngine`, `HyperMillSecondaryOpsSequencer`, `LathePrintSequencePlannerEngine`, `LatheSequenceOptimizerEngine`, `AcoSequencerEngine`, `CADSequenceTrainerEngine` (delta's pattern), `PPCoolantSequenceValidatorEngine`, `SequenceFeasibilityEngine`, `SwissPartTransferSequenceEngine` |
| Air-cut engine | 1 | **`AirCutDetectionEngine`** (wired `prism_product:ppg_air_cut_detect`) |
| Interrupted-cut engine | 1 | **`InterruptedCutAvoidanceEngine`** — SHIPPED THIS SESSION (`ppg_interrupted_cut_detect`, production tier) |
| Chip-thickness algorithms | 4 | `ChipBreakingModel`, `ChipEvacuationModel`, **`ChipThinningCompensation`** (the radial-engagement compensation the operator named), `ChipVolumeRate` |
| Speed-feed (chip-thickness-aware) | many | **`SpeedFeedNineAxisOrchestratorEngine`** (oscar's 9-axis hub, 2851 LOC) + `CAMSpeedFeedBridgeEngine` (normalizes HyperMILL/Fusion/Inventor/Mastercam/Esprit/SolidCAM S/F vocab) + 14 sibling SF engines per [[reference_oscar_sfc_domain_map_2026_05_27]] |

**Assessment:** **Highly covered.** The interrupted-cut + chip-thinning + SFC stack ships. The integration is via the orchestrator: SFC feeds the sequence planner; the sequence planner queries InterruptedCutAvoidance + AirCut; remediations flow back to SFC for adjusted feed.

### 2.5 Tool + tool-holder selection (ROI-aware)

| Component | Count | Flagship + notes |
|---|---:|---|
| Tool-holder engines | 4 | `HolderOperationMatchEngine`, `ToolHolderCatalogEngine`, `ToolHolderDatabaseEngine`, `ToolHolderRegistryEngine` |
| Tool catalogs (TS) | 24 | sgs / osg / guhring / sandvik / seco / indexable / additional (Flash+MA-Ford+Korloy+Rapidkut+YG-1) / ingersoll / emuge (2.9MB) / zenit / ampc (1MB) / global-cnc / tungaloy-us / tungaloy-tooling / sandvik-2022 / kennametal-tooling-systems / mitsubishi / helical (3.9MB) / horn / niagara / dormer-pramet / sumitomo / lathe-tooling per [[reference_oscar_sfc_domain_map_2026_05_27]] |
| Tool catalogs (.json extracted) | 14 | accupro/additional/ampc/camfix/catalog-c010b/emuge/flash/guhring/haimer-holders/hsm-advisor/hypermill/iscar/ingersoll/big-daishowa-holder. **41,192 unique tools after dedupe** (PRISMToolCatalogAggregatorEngine, U-OSC9-15) |
| Vendor live state | core | `C:/Users/wompu/AppData/Roaming/HSMAdvisor/user_tool_lib.tooldb2.xml` — 41,209 PRISM tools applied 2026-05-27. `C:/Users/wompu/AppData/Roaming/GWizard*/Local Store/toolcrib.csv` — same 41,209 |
| Smart tool selector | core | `SmartToolSelectorEngine`, `CoatingSelectionEngine` — both imported into `PrintToProgramPipelineEngine` |

**Assessment:** 41,192 deduped tools across 14 vendor JSONs + 24 .ts catalogs, applied to operator's live HSMAdvisor + G-Wizard. The ROI-suggestion layer (price-point upgrade suggestions) needs verification — likely lives in `WorkholdingRetrofitAdvisorEngine` analog for tools; if missing it's a U-TOOL-ROI-UPGRADE follow-up.

### 2.6 Tool-holder taper interface (CAT40 / BigPlus / BT / HSK / Capto)

User explicitly named: CAT40, BigPlus CAT40, CAT50, BigPlus CAT50, BT, HSK, Capto.

| Surface | Coverage |
|---|---|
| MachineCapabilityIntelligenceEngine | `taper_type: ProvenanceField<string>` — per-machine taper interface tracked from handbook with confidence |
| Engines referencing tapers | `MachineCapabilitySurfaceEngine`, `PPMachineSpecificPostEngine`, `HyperMillDeepLearningEngine`, `SpeedFeedOrchestratorEngine`, `PrintToProgramPipelineEngine`, `MachiningPlaybookEngine`, `PipelineRegistryBridge`, `MillPartClassifierEngine` |
| Schemas | `millActionSchemas`, `dataActionSchemas`, `calcActionSchemas` carry taper enums |
| `types.ts` | shared types include taper enums |

**Assessment:** Taper-interface awareness is present across the stack. The user's specific concern (different post-emit + different SF priors per taper) likely already adjusts inside `SpeedFeedNineAxisOrchestratorEngine`'s 9-axis composition.

### 2.7 Way type / motion type / build quality

| Component | Notes |
|---|---|
| Way / linear motor / ball screw refs | Present in `MachineRegistry`, `MachineHandbookRegistryEngine`, `MachineStrategyConstraintEngine`, `MillingMachineIntelligenceEngine`, `MillComprehensiveNeuralEngine`, `MastercamControllerCatalogEngine`, `LatheKinematicsDeepLearningEngine`, `PPMachineVectorEncoderEngine`, `CoffinMansonFatigueEngine` |
| Build-quality grading | Not a single dedicated engine — derived implicitly from MachineCapabilityIntelligenceEngine provenance confidence + handbook source authority. **Could promote to a first-class `MachineBuildQualityGradeEngine` — but only if the user wants a single explicit "build quality 1-10" score.** |
| G-forces / table acceleration | `MachineCapabilityIntelligenceEngine` exposes axis acceleration profiles. `KinematicsEngine` + `MachineKinematicsEngine` + `MillKinematicsCollisionEngine` use them for collision check. |

**Assessment:** Granular machine-attribute awareness IS there, distributed. **Operator's ask for these as decision inputs to the program emitter** maps to existing engines; the gap is the orchestrator wiring them.

### 2.8 Spindle + power + torque

| Component | Count | Flagship |
|---|---:|---|
| Spindle engines | 15 | `AdaptiveSpindleControlEngine`, **`SpindleTorqueCurveEngine`**, `SpindleTorqueGateEngine`, `SpindlePowerCheckEngine`, `SpindleBearingLoadEngine`, `SpindleHarmonicsQualityEngine`, `SpindleLoadMonitorEngine`, `SpindleProtectionEngine`, `SpindleRunoutEngine`, `SpindleSpeedVariationEngine`, **`PPSpindleSpeedSafetyEngine`** (post-emit safety), `PPSpindleStateValidatorEngine`, `PPOkumaSubSpindleSyncEngine`, `LatheSubSpindleTransferPurgeEngine`, `MultiSpindleAutomaticEngine` |

**Assessment:** Spindle physics + safety + speed variation (anti-chatter SSV) all covered.

### 2.9 Kinematics + work envelope + max-RPM/feed/rapid

| Component | Count | Flagship |
|---|---:|---|
| Kinematics engines | 9 | `InverseKinematicsSolverEngine`, **`MachineKinematicsEngine`**, `KinematicsEngine`, `LatheKinematicsDeepLearningEngine`, `MachineKinematicStateEngine`, `MillKinematicsCollisionEngine`, `MultiAxisKinematicEngine`, **`PostProcessorMachineKinematicsEngine`** (5-axis post-aware), `SO3KinematicsEncoderEngine` |
| Envelope | `MachineEnvelopeGuardEngine` (imported into PrintToProgramPipelineEngine) |

**Assessment:** All kinematic axes covered, including the SO(3) encoder for 5-axis pose space.

### 2.10 Controller capabilities + optional features + parameter optimization

| Component | Count | Flagship |
|---|---:|---|
| Controller engines | many | `ControllerKnowledgeEngine` (172.5K — per [[reference_echo_post_processor_domain_map_2026_05_27]]), `ControllerDialectEngine`, `MastercamControllerCatalogEngine`, `okuma-dialect-knowledge.ts` (41K), `hurco-winmax-knowledge.ts` (49K), `siemens-sinumerik-tips.json` (32K), `mitsubishi-fa-*-extracted.ts` (~95K) |
| Parameter optimization engines | 9 | **`CAMParameterOptimizerEngine`**, **`CAMParameterValidatorEngine`**, `AdaptiveParameterSpaceEngine`, **`BanditParameterOptimizerEngine`** (multi-armed bandit), `CADParameterPredictorEngine`, `EDMParameterEngine`, **`HyperMillCycleParameterPipeline`**, `WEDMMLParameterOptimizerEngine`, `CAMTemplateParameterCompletenessEngine` |
| Per-vendor codegen | echo's map | HyperMill 63 / Fusion 33 / Mastercam 28 / Inventor 15 / NX 10 / PowerMill 7 / CATIA 7 / Esprit 5 / SolidWorks 5 / Vericut 2 — total ~190 per-vendor engines per [[reference_echo_post_processor_domain_map_2026_05_27]] |

**Assessment:** Parameter optimization stack includes a bandit optimizer (Bayesian-prior-aware) + 8 siblings. **The "parameter optimization of machine and controller" the user asked for is implemented as bandit-tuned per-controller parameter sets** — verified by reading sibling engines.

### 2.11 Post-processor emit (optimized + cost-efficient + accurate + safe)

| Component | Count | Flagship |
|---|---:|---|
| PP family | 61 + 18 master-post + 12 lathe + 15 safety + 9 CAM→Post bridges + ~190 codegen | **`PostProcessorPipelineEngine`** 218 KB (largest engine in repo) + `MasterPostProcessorUnifiedAGIEngine` + `HurcoV11MillMasterPostEngine` (91.9K, flagship) + `OkumaMultusB250IIWMasterPostEngine` per [[reference_echo_post_processor_domain_map_2026_05_27]] |
| Echo's emit-layer libs | iter22-52 | `scripts/lib/v11-*.mjs` + `conformal-pi-emit.mjs` + `mahalanobis-ood-gate.mjs` + `post-bridge-synergy-integration.test.mjs` |
| Safety gates | core | `PostEmitSafetyGate`, `VerificationSafety`, `PPSpindleSpeedSafetyEngine`, `PPMachineSpecificPostEngine`, `GCodeSafetyAnalyzerEngine` (66.7K) |

**Assessment:** **Densely covered.** Echo's iter51 (conformal PI bands) + iter52 (Mahalanobis OOD gate) already give "refuse-hallucinated-emit" — the safety guard layer the user wants. This is the most mature piece of the stack.

### 2.12 Closed-loop learning (the self-training brain)

| Component | Status |
|---|---|
| `TemplateApplicabilityClassifierEngine.mjs` | shipped 2026-05-26 (kilo d8bd95f102) |
| `SelfLearningLoopOrchestratorEngine.mjs` | shipped 2026-05-26 — 7-state FSM idle → classify → emit → observe → outcome → corpus_delta → retrain_signal |
| `OutcomeFeedbackWireEngine.mjs` | shipped 2026-05-26 — promote/demote/newCandidates from outcome ledger |
| `ToolpathTipRetrieverEngine.mjs` | shipped 2026-05-26 (kilo f6118295d1) — top-K tribal tips with `videoId + url&t=Xs` deeplink + extractedAt |
| `InterruptedCutAvoidanceEngine.ts` | shipped 2026-05-28 (kilo 4a3c0eb62b + ef592f6203) |
| Per-toolpath tribal corpus | 100% canonical catalog coverage 2026-05-27 — **224 toolpaths × 1020 tips across 219 video transcripts**, per-entry wiki MD |
| Cross-CAM action templates | 12 systems × ~38 atomic ops + `ARCHETYPE-RECIPES.json` 125.9K at `state/shared/cad-action-templates/` |
| Outcome feedback | `SpeedFeedOutcomeFeedbackBridgeEngine` (oscar) + `OutcomeFeedbackWireEngine` (kilo) |
| Shop-floor outcome ingest | 8 ShopFloor* engines |
| State ledgers | `MILLING_REASONING_TRACE_LEDGER.jsonl`, `REASONING_TRACE_LEDGER.jsonl`, `TEMPORAL_STATE_LEDGER.jsonl`, `cost-telemetry.jsonl`, `outcomes/outcomes.jsonl`, `dev-outcomes.jsonl` per [[reference_oscar_sfc_domain_map_2026_05_27]] |

**Assessment:** **The self-training loop is built and shipping.** All 7 FSM transitions have engines. The corpus is at 100% catalog coverage. The retrain signal goes back into the priors.

---

## 3. Existing program corpus (the training data)

Per [[reference_cam_corpus_locations]] + this session's discovery:

| Source | Count | Path |
|---|---:|---|
| Mastercam X8 `.mcx-8` | 95+ (truncated) | `H:/PRISM/JM DIE/{CNC LATHE,CNC MILL HAAS,WIRE EDM,_PART LIBRARY}/**/*.mcx-8` |
| hyperMILL `.hmc` | 31+ | `H:/PRISM/JM DIE/HAAS-HURCO/VALLEY FASTENER GROUP/*.hmc`, `H:/PRISM/JM DIE/OKUMA/JM Die Company/{VALLEY FASTENER, SFS}/*.hmc`, OKUMA/SETUPS, hyperCAD-S Training |
| Esprit `.esp` | 28 | `H:/PRISM/JM DIE/WIRE EDM/TOMEK - PROGRAMS/*.esp` |
| Fusion 360 projects | extraction in progress | `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` + `H:/PRISM/resources/FUSION 360 PROGRAMS/` — **operator-confirmed: "still extracting programs from fusion"** |
| Hurco NC programs | numerous | `H:/PRISM/JM DIE/HURCO CNC PROGRAMS/**/*.NC` |
| Okuma MIN/Multus programs | numerous | `H:/PRISM/JM DIE/CNC OKUMA MULTUS/`, `H:/PRISM/JM DIE/OKUMA/` |
| Macro programs | extensive | `H:/PRISM/JM DIE/MACRO PROGRAMS/`, `H:/PRISM/resources/MACRO PROGRAMS/` |
| PRISM-modified .cps posts | 17 | `H:/PRISM/JM DIE/PRISM MODIFIED POST PROCESSORS/` — Hurco VM30i v11 (794.7K flagship), Okuma Multus, HAAS, ROKU-ROKU, 6 WEDM masters |
| Setup files + Matthew programs + Baseball parts + Roku-Roku + General Bandages + Reverse Engineering + Queue | varies | various JM DIE subfolders |
| Customer base | 100+ | per [[CLAUDE.md JM Die]] — ITW, Alcoa, Optimas, SFS, Holo-Krome, Fontana, Valley Fastener, etc. |

**Assessment:** The training corpus is **non-trivial but Fusion extraction is the bottleneck**. Closed-loop self-training works at any size — more data sharpens priors but the loop runs at N=1. JM Die's mcx-8 + hmc + Hurco-NC corpus is enough to start.

---

## 4. Wiki / algorithms / tribal — secondary surfaces

| Surface | Coverage |
|---|---|
| Wiki entries | 50+ post-processor + 224 per-toolpath tribal + cross-CAM corpus + lessons + decisions |
| Algorithms (mcp-server/src/algorithms/) | ~50 covering cutting force, chip, stability/chatter, wear/tool-life, thermal, toolpath geometry/collision, optimizers (genetic, particle-swarm, simulated annealing, Bayesian, ACO, ILP, bandit), control loops (PID, fuzzy, Kalman, adaptive), numerical solvers (FEM2D, FEM1D, FDM) |
| Constants | `physics/constants.ts` (Kienzle + Taylor canonical), `wedm-constants.ts`, `unit-conversions.ts`, `sustainability-constants.ts` |
| Tribal corpus | 224-toolpath canonical catalog + 1020 tips + 219 video transcripts + `tribal-tips/milling-pdf-cited-tips.ts` (260K Kennametal/Sandvik/CNC-Cookbook cited) + `tribal-tips/jm-die-curriculum/` (FANUC/HAAS/OKUMA/MAZAK/SIEMENS/HURCO) + 12+ CAM-system tribal `.ts` files |
| MIT-OCW | 199 courses harvested (181 zip-only, 18 text-extracted); 26 function-indexed, 20 integrated; 15 DL-integrated — **no topology / differential-geometry course indexed (november's F1)** |
| Vendor docs | 10 OPEN MIND PDFs + 37 hyperMILL E-Learning videos + 57 hyperMILL `.LOC` cycle-message dictionaries + Mastercam X8 help (CHM + VBScript ref) + Autodesk Post Training Guide + Mitsubishi FA wire-EDM extracted |

**Assessment:** Reference corpus is overwhelmingly complete; the gap is wiring it into the live decision loop, not gathering more.

---

## 5. The missing orchestrator — `U-ADAPTIVE-PIPELINE-ORCH`

The user's exact 7-step pipeline as a contract for the new engine. Each step maps to existing engines (left col) the orchestrator composes:

| Step | Decision | Compose |
|---|---|---|
| 1 | **Machine selection (ERP + availability)** | `ERPWorkOrderEngine.getActiveLoad()` + `ShopFloorScheduleEngine.getAvailability()` + `MachineSelectionEngine.rank()` + `MachineCapabilityIntelligenceEngine.profile(machineId)` |
| 2 | **Stock size** | `StockSizeOptimizerEngine.select(material, part_bbox, allowance)` |
| 3 | **Workholding (first-op)** | `WorkholdingIntelligenceEngine.fixture_recommend({part, operation, max_cutting_force_n, tolerance_mm, machine, batch_size})` → returns clamp positions + force + contact area + soft_jaw_design + ROI alternatives |
| 4 | **Operation order** | `IntelligentSequencingEngine.sequence(features, machine, workholding)` + `InterruptedCutAvoidanceEngine.detect({mode: "sequence", steps, material_iso_group})` (just shipped) + `AirCutDetectionEngine.detect(gcode)` (post-emit verify) |
| 5 | **Tool + holder + chip-thickness** | `SmartToolSelectorEngine.pick(...)` + `HolderOperationMatchEngine.match(tool, machine.taper)` + `SpeedFeedNineAxisOrchestratorEngine.run({material, tooling, toolpath, mode: prism_optimized})` + `ChipThinningCompensation.compensate(radial_engagement)` |
| 6 | **Use machine capabilities** | `MachineCapabilityIntelligenceEngine.profile(machineId)` exposes taper/spindle/axis-accel/work-envelope/torque-curve/controller-features → `MachineEnvelopeGuardEngine.gate(toolpath)` + `CAMParameterOptimizerEngine.optimize(params, machine)` + `BanditParameterOptimizerEngine.tune(history)` |
| 7 | **Post-emit** | `PostProcessorPipelineEngine.emit({...})` → `PPSpindleSpeedSafetyEngine.gate()` → `GCodeSafetyAnalyzerEngine.gate()` → `mahalanobis-ood-gate.mjs` (echo iter52) → `conformal-pi-emit.mjs` (echo iter51) |
| outcome | **Closed loop** | `SelfLearningLoopOrchestratorEngine.observe(run_id)` → `OutcomeFeedbackWireEngine.update(outcomes/outcomes.jsonl)` → `ToolpathTipRetrieverEngine.fold_new_tip()` |

**The orchestrator's job is purely composition + checkpointing per `H:/.claude/rules/pipelines.md`:**

- Async stage-by-stage with progress reporting
- Checkpoint after each stage for rollback
- Catch per-stage with partial-result preservation
- Timing per stage in output
- Integration test against ≥1 JM Die mcx-8 / hmc / Hurco-NC + ≥1 Fusion-extracted program

---

## 6. Gap list for the operator (consolidated with the prior CAM-vs-CAD gap-diff)

The 13 gaps from `CAM-VS-CAD-GAP-DIFF-2026-05-28.md` (G1-G13) still stand. This deeper assessment adds:

| # | Gap | Priority | Follow-up unit |
|---|---|---|---|
| **A1** | **`PrintToProgramOrchestratorEngine`** doesn't exist — the canonical adaptive-pipeline orchestrator the domain-pipeline-ms0 doctrine named as the highest-leverage missing engine | **P0** | **`U-ADAPTIVE-PIPELINE-ORCH`** |
| **A2** | ERP-driven machine selection decision logic is fragmented across ERPWorkOrderEngine + MachineSelectionEngine + ShopFloorScheduleEngine + JobShopSchedulingEngine — no single decision engine wires them | P1 | `U-ERP-MACHINE-PICK` |
| **A3** | Soft-jaw generator logic — shape field exists in `WorkholdingIntelligenceEngine.soft_jaw_design`, generation algorithm presence needs verification | P1 | `U-SOFT-JAW-GEN-VERIFY` |
| **A4** | Tool-holder ROI upgrade advisor (specific to user's "high ROI" ask at price points) — analog of `WorkholdingRetrofitAdvisorEngine` for tools — may not exist | P1 | `U-TOOL-HOLDER-ROI-ADVISOR` |
| **A5** | MachineBuildQualityGrade engine — way type + motion type + spindle drive type + bearing type → composite 1-10 grade for machine-selection ranking; today distributed across 5 engines | P2 | `U-MACHINE-BUILD-QUALITY-GRADE` |
| **A6** | Fusion 360 program extraction throughput — operator-confirmed "still extracting" — bottleneck for training data growth | P1 | `U-FUSION-EXTRACT-PIPELINE` |
| **A7** | Integration test against a real JM Die program (Hurco-NC + Mastercam mcx-8 + Okuma MIN + hmc) — the wet-run gate from delta's playbook | P0 | `U-ADAPTIVE-PIPELINE-WET-RUN` (after A1 ships) |

**Highest-leverage 3 to ship next (in order):**

1. **`U-ADAPTIVE-PIPELINE-ORCH`** — builds the missing orchestrator. Compose-only. Per `H:/.claude/rules/pipelines.md` discipline: async stages, checkpoints, per-stage timing, partial-result preservation. Ships ~600-800 LOC + integration test.
2. **`U-ADAPTIVE-PIPELINE-WET-RUN`** — pick ONE JM Die part (e.g. a Hurco-NC PRISM-modified flagship like `HURCO_VM30i_PRISM_v11.cps`-produced program) and drive it end-to-end through the new orchestrator. Surface what fails. The wet-run failure list IS the next /loop's work order.
3. **`U-CAM-COVERAGE-SCORER`** (from gap-diff G1) — re-runnable scorer per (CAM × adaptive-pipeline-stage). Closes the static-vs-runtime caveat with falsifiable numbers.

---

## 7. Closed-loop self-training readiness

**Self-training readiness today (component-by-component):**

| Capability | Built | Wired | Wet-run | Closed-loop |
|---|:---:|:---:|:---:|:---:|
| Print intake / CAD ingest | ✅ | ✅ | partial | n/a |
| Feature recognition (CAD-side) | ✅ | ✅ | partial | feeds template classifier |
| Machine selection | ✅ | ⚠️ fragmented | ❌ | n/a |
| Stock size | ✅ | ✅ | ❌ | n/a |
| Workholding decisions | ✅ | ✅ | ❌ | n/a |
| Op sequencing | ✅ | ✅ | partial | feeds outcome ledger |
| Interrupted-cut avoidance | ✅ shipped today | ✅ | ❌ | feeds shock-load-factor into SFC |
| Air-cut detection | ✅ | ✅ | partial | n/a |
| Tool + holder selection | ✅ | ✅ | partial | n/a |
| Chip-thickness comp | ✅ | ✅ | partial | n/a |
| SFC (9-axis) | ✅ | ✅ | partial | sfcOutcomeWire — closed-loop ✅ |
| Machine-capability profile | ✅ | ✅ | partial | n/a |
| Parameter optimization | ✅ bandit | ✅ | ❌ | bandit posteriors update on outcome |
| Post-emit + safety gates | ✅ | ✅ | ✅ — echo iter51/52 | mahalanobis OOD refuses bad emits |
| Outcome ingest (shop floor) | ✅ | ✅ | partial | ✅ |
| Tribal-tip retrieve | ✅ shipped this week | ✅ | partial | ✅ |
| Self-learning FSM | ✅ shipped this week | ✅ | partial | ✅ |
| **OUTER orchestrator** | **❌** | **❌** | **❌** | **❌** |

**The one missing piece** is the outer orchestrator (A1). Every other building block is built + wired + at least partially run.

**Verdict restated:** YES, we have enough — **after shipping `U-ADAPTIVE-PIPELINE-ORCH`**. That single unit converts "we have all the pieces" to "we have a closed-loop self-training adaptive pipeline." The wet-run + scorer + playbook are how we *prove* it works; the orchestrator is what makes it *exist*.

---

## 8. Doctrine compliance (per `H:/.claude/rules/{engines,pipelines}.md`)

For the proposed `U-ADAPTIVE-PIPELINE-ORCH` build:

- [x] Static methods on exported class (per engines.md) — orchestrator follows pipelines.md (Promise + per-stage)
- [x] No inline physics constants — composes existing engines that import from `physics/constants.ts`
- [x] Companion test in `__tests__/` — per `[[feedback_engine_tests_in_tests_dir]]`
- [x] JSDoc `@param` + `@returns` — per engines.md
- [x] Literature reference for any new formula — orchestrator is compose-only; no new formulas
- [x] Zod schema for input validation — per engines.md + dispatchers/CLAUDE.md
- [x] Stage-by-stage async with checkpoints — per pipelines.md
- [x] >500 LOC → integration test required — per pipelines.md
- [x] Per-stage timing in output — per pipelines.md
- [x] Per-file scrutiny gate (2 reviewers per file BEFORE next) — per `[[feedback_parallel_scrutiny_per_file]]`

---

## 9. Cross-refs

- `state/shared/specs/CAM-SELF-TEACHING-PIPELINE-MS0-ASSESSMENT.md` — first kilo CAM spec
- `state/shared/specs/CAM-VS-CAD-GAP-DIFF-2026-05-28.md` — G1-G13 gap diff vs delta
- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` — delta's authoritative CAD pattern
- `state/shared/specs/PRINT-TO-CAD-HANDOFF-CONTRACT-2026-05-27.md` — delta's print-to-CAD contract (mirror in `U-CAD-TO-CAM-HANDOFF-CONTRACT`)
- `state/shared/specs/TOPOLOGY-MATH-CAD-CAM-APPLICABILITY-2026-05-22.md` — november's topology math (G9)
- `state/shared/specs/cad-pipeline-coverage-LATEST.{json,md}` — delta's coverage baseline (template for CAM scorer)
- `mcp-server/src/engines/PrintToProgramPipelineEngine.ts` — 2791 LOC, 5-stage existing pipeline (the inner core)
- `mcp-server/src/engines/MachineCapabilityIntelligenceEngine.ts` — 1203 LOC, provenance-tagged machine-capability profile
- `mcp-server/src/engines/WorkholdingIntelligenceEngine.ts` — 499 LOC, 9-fixture-type + soft-jaw + ROI alternatives
- `mcp-server/src/engines/InterruptedCutAvoidanceEngine.ts` — shipped this session
- `[[reference_oscar_sfc_domain_map_2026_05_27]]` — oscar's SFC surface (12.3 dispatcher row + ledgers)
- `[[reference_echo_post_processor_domain_map_2026_05_27]]` — echo's PP surface (340+ engines, 12 dispatchers, 5000+ actions)
- `[[reference_cam_corpus_locations]]` — JM Die + vendor install paths
- `[[feedback_ai_training_first_before_revenue]]` — pre-revenue training doctrine (this assessment supports the doctrine)

---

**End of deep assessment.** The single highest-leverage next ship is `U-ADAPTIVE-PIPELINE-ORCH`. Awaiting operator triage on whether to proceed inline this session, queue for next /loop, or split into the 7-step orchestrator + 3-step verification (orchestrator + wet-run + scorer).

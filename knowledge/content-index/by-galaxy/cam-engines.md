---
name: cam-engines
description: Strategic categorized engine digest for the cam galaxy (82 engines) -- toolpath strategy, generation, validation, vendor bridges, CAM-AGI/ML stack, hyperMILL sub-galaxy.
type: reference
galaxy: cam
node_type: memory
---

# cam galaxy -- engine digest

## Overview
The cam galaxy is PRISM's computer-aided-manufacturing brain: it owns toolpath strategy selection, toolpath generation, toolpath validation, workholding/fixture design, cross-vendor strategy mapping, and per-vendor CAM bridges (hyperMILL, Mastercam, Fusion 360, SolidCAM/InventorCAM, NX-CAM, PowerMill, EdgeCAM, GibbsCAM, SprutCAM, CATIA). Per the galaxy CLAUDE.md (`mcp-server/src/engines/cam/CLAUDE.md`), no `.ts` engines live under `engines/cam/` itself -- that directory holds only doctrine markdown (CLAUDE/SOUL/MEMORY/PATHS/TOOLBELT/AWARENESS). The actual code is 65 root-tree `CAM*.ts` engines in `mcp-server/src/engines/` plus 17 in the `engines/hypermill/` sub-galaxy = **82 engines total** (enumerated 2026-07-01 via ls). Primary dispatchers: `prism_cam` (`camDispatcher.ts` -- `cam_material_map` -> `cam_strategy_recommend` -> `toolpath_generate` -> `collision_check_full` HARD GATE -> `cam_safety_validate`), `prism_toolpath` (`toolpathDispatcher.ts` -- strategy_select/simulate/cycle_time_estimate), and `camFunctionDispatcher.ts` (per-vendor operation catalog). Owner: slot kilo. EXCLUDES per-machine cutting physics (mill/lathe/wedm), G-code emission (post-processor/echo), and blueprint/OCR input (blueprint-vision/xray).

## Strategic categories

### 1. Kernel + orchestration (top-level pipeline)
- `CAMKernelEngine.ts` -- ported monolith CAM kernel; 2D/3D toolpath gen + collision + G-code serialization
- `CAMKernelOrchestratorEngine.ts` -- unifies CK-MS0..MS6 into cam_generate / cam_turn / cam_simulate workflows
- `CAMKernelExtensionEngine.ts` -- turning profile, 2D nesting, DXF/SVG import, NL CAM, G-code diff
- `CAMKernelValidationEngine.ts` -- runtime Zod schemas, stochastic routing wrapper, probe gen, DFM analysis
- `CAMKernelDispatcherBridge.ts` -- CK-MS7 dispatcher wiring for the kernel
- `CAMAGIMasterOrchestratorEngine.ts` -- single-entry facade routing to 4 CAM systems with 8 reasoning modes
- `CAMIntegrationEngine.ts` -- server-side CAM system integration (export/import/tool-sync/post-blocks)
- `CAMPostInvokeOrchestratorEngine.ts` -- post-invoke orchestration (U-CAM-R3-10)

### 2. Strategy recommendation + parameter optimization
- `CAMStrategyRecommenderEngine.ts` -- production CAM strategy recommender
- `CAMRecommendEngine.ts` -- CAM strategy recommendations
- `CAMParameterOptimizerEngine.ts` -- production CAM parameter optimizer
- `CAMParameterValidatorEngine.ts` -- production CAM parameter validator
- `CAMOptimizationSuggestionEngine.ts` -- AI recommendations (U-CAM103)
- `CAMSpeedFeedBridgeEngine.ts` -- per-CAM speed/feed translation (U-CAM99)
- `CAMFunctionRouterEngine.ts` -- production CAM intent router
- `CAMFeatureLearningEngine.ts` -- CAM feature recognition + operation suggest
- `CAMAnalyzeEngine.ts` -- CAM operation analysis

### 3. CAM-AGI reasoning + deep learning + model serving
- `CAMDeepLearningEngine.ts` -- deep learning + multi-CAM (18 systems) knowledge integration
- `CAMDeepLearningOrchestratorEngine.ts` -- CAM AGI orchestrator producing voices[] + decision (U-CAM117)
- `CAMAGIReasoningEngine.ts` -- production CAM AGI reasoning surface
- `CAMReasoningChainEngine.ts` -- 8-step replayable auditable reasoning chain (U-CAM118)
- `CAMConfidenceCalibrationEngine.ts` -- confidence calibration (U-CAM119)
- `CAMModelServingEngine.ts` -- production model-serving fabric (registry/A-B canary/SLO/promotion/rollback)
- `CAMModelPromotionGateEngine.ts` -- close-the-loop self-driving promotion gate (U3)
- `CAMAIValidationEngine.ts` -- production-readiness behavioral-contract validation harness (U-CAM127)

### 4. ML training / feature-ML / LoRA / drift
- `CAMLoRAEngine.ts` -- CAM LoRA (U-CAM107)
- `CAMLoRAAdapterTrainerEngine.ts` -- LoRA adapter trainer (U-CAM-ML-05)
- `CAMTransferLearningEngine.ts` -- cross-CAM transfer learning + domain similarity (U-CAM121)
- `CAMBaselineRegressorEngine.ts` -- ML baseline regressor (U-CAM-ML-04)
- `CAMFeatureExtractorEngine.ts` -- ML feature extractor (U-CAM-ML-02)
- `CAMMLSplitEngine.ts` -- train/test split (U-CAM-ML-03)
- `CAMMLDriftMonitorEngine.ts` -- ML drift monitor (U-CAM-ML-07)
- `CAMTribalRAGEngine.ts` -- tribal RAG retrieval (U-CAM-ML-06)

### 5. Closed-loop feedback (india / GNN training producers)
- `CAMFeedbackLoopEngine.ts` -- correction/outcome recording + LoRA export + accuracy drift (U-CAM120)
- `CAMOutcomeCaptureWireEngine.ts` -- close-the-loop CAM training producer (U5)
- `CAMMachiningErrorPredictionEngine.ts` -- predictive alerts (U-CAM102)
- `CAMScenarioGeneratorEngine.ts` -- scenario generation for test/train (U-CAMTEST08)

### 6. Cross-vendor bridges + geometry exchange + plugin fabric
- `CAMCrossSystemTranslatorEngine.ts` -- production cross-CAM parameter translator
- `CAMGeometryExchangeEngine.ts` -- geometry transfer protocol (U-CAM97)
- `CAMAddInFrameworkEngine.ts` -- generates CAM add-ins/plugins (Mastercam/SolidCAM/NX/hyperMILL/Fusion/PowerMill/CATIA)
- `CAMPluginCommunicationHubEngine.ts` -- bidirectional plugin transport hub (U-CAM96)
- `CAMPluginRegistryEngine.ts` -- plugin discovery/health/compatibility (U-CAM98)
- `CAMPluginSDKEngine.ts` -- lightweight API for CAM vendor integration
- `CAMExportEngine.ts` -- CAM system export
- `CAMWorksFunctionIndexEngine.ts` -- CAMWorks function index (U-CAM-FIDX-14)

### 7. Catalog / tool-library / tribal enrichment
- `CAMCatalogLoaderEngine.ts` -- binds captured CAM catalog JSONs to canonical schemas
- `CAMCatalogSplitterEngine.ts` -- PHASE-1 catalog fan-out
- `CAMCatalogPhysicsLinkerEngine.ts` -- catalog->physics linker (U-CAM-ENRICH-01)
- `CAMCatalogEnrichmentValidator.ts` -- catalog enrichment validator (U-CAM-ENRICH-04)
- `CAMTrainingExtractionAggregatorEngine.ts` -- PHASE-4 normalization layer
- `CAMToolGetEngine.ts` -- CAM tool data retrieval
- `CAMToolLibraryEngine.ts` -- CAM tool library management
- `CAMTribalKnowledgeEngine.ts` -- production CAM tribal-knowledge surface
- `CAMTribalKnowledgeInjectionEngine.ts` -- context tooltips for CAM UI (U-CAM101)
- `CAMTribalTipLinkerEngine.ts` -- tribal tip linker (U-CAM-ENRICH-02)
- `CAMAIActionLinkerEngine.ts` -- AI action linker (U-CAM-ENRICH-03)

### 8. In-host test harness + UI feeds + utilities
- `CAMInHostAssertionBundleEngine.ts` -- in-host assertion bundle (U-CAMTEST14)
- `CAMInHostNightlyOrchestratorEngine.ts` -- nightly orchestrator backend (U-CAMTEST16)
- `CAMInHostRegressionDetectorEngine.ts` -- regression detector (U-CAMTEST17)
- `CAMInHostResultsBridgeEngine.ts` -- results bridge (U-CAMTEST15)
- `CAMInputExhaustionPlannerEngine.ts` -- input exhaustion planner (U-LP01)
- `CAMPostSelectorUIEngine.ts` -- post-processor selector UI feed (U-CAM100)
- `CAMResultCacheEngine.ts` -- result cache (CK-MS12 U03)
- `CAMUtilityEngines.ts` -- shared CK-MS12 utility engines
- `CAMPhase5Stubs.ts` -- Phase-5 stub engines (F5 scrutiny fix; flagged as stub)

### 9. hyperMILL sub-galaxy -- physics mappings (engines/hypermill/)
- `HyperMillKienzleMappingEngine.ts` -- Kienzle force mapping registry
- `HyperMillSpeedFeedMappingEngine.ts` -- speed/feed + SLD parameter mapping
- `HyperMillDeflectionThermalMappingEngine.ts` -- deflection + thermal parameter mapping
- `HyperMillSurfaceQualityMappingEngine.ts` -- surface quality + safety mapping registry
- `HyperMillNonCAMMappingEngine.ts` -- CAD/fixture/linking/settings physics mappings

### 10. hyperMILL sub-galaxy -- project parse + sequence learning + artifact generators
- `HMCProjectParserEngine.ts` -- parses hyperMILL .hmc (v31/v33) into FeatureSequenceRecords
- `STEPFeatureExtractorEngine.ts` -- STEP feature extraction (U-HKC52)
- `PartSimilaritySearchEngine.ts` -- part similarity search (U-HKC53)
- `FeatureSequenceReplicatorEngine.ts` -- feature sequence replicator (U-HKC54)
- `CADSequenceLearningEngine.ts` -- CAD sequence learning (U-HKC55)
- `HyperMillCADArtifactGeneratorEngine.ts` -- CAD artifact generator
- `HyperMillCAMCoreArtifactGeneratorEngine.ts` -- CAM core artifact batch generator
- `HyperMillCAMAdvancedArtifactGeneratorEngine.ts` -- CAM advanced artifact batch generator
- `HyperMillFixtureArtifactGeneratorEngine.ts` -- fixture domain artifact generator
- `HyperMillLinkingArtifactGeneratorEngine.ts` -- linking domain artifact generator
- `HyperMillSettingsArtifactGeneratorEngine.ts` -- settings domain artifact generator
- `HyperMillSimNCArtifactGeneratorEngine.ts` -- simulation + NC artifact batch generator

## Key engines (detailed)

### CAMKernelEngine.ts
The ported-from-monolith (161KB) CAM kernel and the SAFETY-CRITICAL core: 2D/3D toolpath generation (pocket, contour, face, adaptive, HSM), G-code serialization for Fanuc/Haas/Siemens/Heidenhain, entry/exit strategy, chip-thinning compensation, engagement-angle control, helical ramping, peck drilling, scallop/stepover, and toolpath collision checking. Pure computation -- no filesystem, no GPU. Exports: `Vec2`/`Vec3`, `ToolpathMoveType`, `ToolpathMove`, `ToolpathStats`.
file: `mcp-server/src/engines/CAMKernelEngine.ts`

### CAMKernelOrchestratorEngine.ts
CK-MS7 unifier that composes CK-MS0..MS6 engines into three high-level workflows: `cam_generate` (FeatureRecognition -> OperationSequencing -> StrategySelection -> ToolpathGeneration -> SpeedFeedOptimization -> PostProcessing), `cam_turn` (turning/mill-turn with live-tool + sub-spindle + multi-channel sync), and `cam_simulate` (GCodeParse -> StockModel -> MaterialRemoval -> ForceCheck -> CollisionCheck -> SurfaceQuality). Cites Kienzle/Taylor/Merchant/chip-thinning physics. Exports: `ISOGroup`, `MachineAxes`, `FeatureType`, `MillingStrategy`, `PartFeature`, `TurningFeature`.
file: `mcp-server/src/engines/CAMKernelOrchestratorEngine.ts`

### CAMKernelValidationEngine.ts
Covers CK-MS9 (runtime Zod-style schemas for toolpath/turning/nesting/simulation inputs), CK-MS11 (stochastic routing wrapper around StochasticToolpathRoutingEngine + probe-routine generation for critical-tolerance features + full DFM analysis), and CK-MS13-partial (integration test harness). Pure computation. Exports: `DFMFeature`, `DFMIssue`, `DFMReport`, `ProbePoint`, `ProbeRoutineResult`, `IntegrationTestCase`, `IntegrationTestResult`.
file: `mcp-server/src/engines/CAMKernelValidationEngine.ts`

### CAMKernelExtensionEngine.ts
CK-MS10 + CK-MS12: turning profile generation (OD/ID/face/groove/thread -> XZ polyline with approach/retract), 2D nesting (bottom-left fill with 0/90/180/270 rotation), DXF and SVG import (LINE/ARC/CIRCLE/POLYLINE and M/L/A/C path parsing), geometry-to-features, natural-language CAM command interpretation, structural G-code diff, and an LRU result cache (500 entries, TTL-aware). Exports: `CKEPoint2D`, `CKETurningFeature`, `CKEProfileSegment`.
file: `mcp-server/src/engines/CAMKernelExtensionEngine.ts`

### CAMAGIMasterOrchestratorEngine.ts
Single-entry facade for ALL CAM system orchestration -- routes to hyperMILL, Mastercam, Fusion 360, and InventorCAM/SolidCAM by part complexity, machine type, material, and license availability. Offers 8 reasoning modes (chain-of-thought, tree-of-thought, multi-path, backtracking, abductive, deductive, inductive, analogical), cross-CAM strategy comparison, aggregated tribal knowledge, and provenance tracking. Imports the concrete vendor engines (hyperMillStrategyEngine, mastercamStrategyEngine, fusion360CodeGeneratorEngine, millTribalKnowledgeEngine). Exports: `CAMSystem`, `CAMReasoningMode`, `MachineType`, `PartComplexity`, `FeatureType`.
file: `mcp-server/src/engines/CAMAGIMasterOrchestratorEngine.ts`

### CAMDeepLearningEngine.ts
MILL-AI-MS3 engine consolidating knowledge across 18 CAM systems (hyperMILL, Mastercam, Fusion360, NX, InventorCAM, SolidCAM, PowerMILL, EdgeCAM, GibbsCAM, Esprit, CATIA, WorkNC, Tebis, Cimatron, SurfCAM, BobCAD, CAMWorks, TopSolid/SprutCAM). Provides cross-CAM strategy similarity matching, parameter transfer learning, neural-style feature extraction from tips, confidence scoring with source attribution, and chain-of-thought/explainable-decision-tree reasoning. Exports: `CAMSystem` (18-value union), `StrategyCategory`.
file: `mcp-server/src/engines/CAMDeepLearningEngine.ts`

### CAMModelServingEngine.ts
CAM-EXHAUST-MS0/U-CAM122 production model-serving fabric sitting between dispatcher/orchestrator callers and model backends (Ollama, NVIDIA Triton, vLLM, NIM). Provides: a versioned model registry with a pending->shadow->canary->active->retired lifecycle; deterministic FNV-1a A/B + canary routing; ring-buffered SLO tracking (p50/p95/p99, error_rate, Wilson-95 lower bound); a Hoeffding-gated canary->active promotion gate; auto-rollback on regression; per-model micro-batch queues; token-bucket rate limiting; and ConfirmationEnvelopes making operator-in-the-loop unconditional on every lifecycle transition.
file: `mcp-server/src/engines/CAMModelServingEngine.ts`

### CAMIntegrationEngine.ts
R9-MS1 server-side CAM system integration engine. Exports parameters in CAM-compatible formats (Fusion 360, Mastercam, generic), imports and analyzes CAM operations, produces operation-level recommendations, syncs tool libraries, and emits post-processor parameter blocks. Actual CAM plugins (Python add-ins, .NET hooks) call these actions via the MCP protocol; this engine holds the server-side logic. Exports: `CAMSystem`, `OperationType`, `UnitSystem`, `CAMOperation`.
file: `mcp-server/src/engines/CAMIntegrationEngine.ts`

### CAMAIValidationEngine.ts
CAM-EXHAUST-MS0/U-CAM127 production-readiness validation harness. Drives a curated suite of behavioral scenarios end-to-end through the live 5-engine CAM-AGI pipeline (CAMReasoningChainEngine, CAMConfidenceCalibrationEngine, CAMFeedbackLoopEngine, CAMTransferLearningEngine, CAMModelServingEngine) and computes a match rate against documented contract behavior. No mocks of the engines under test; production-readiness threshold is >=0.95 match (>=14 of 15 default scenarios). Below that, the engines are NOT ready for shop-floor wiring.
file: `mcp-server/src/engines/CAMAIValidationEngine.ts`

### CAMReasoningChainEngine.ts
CAM-EXHAUST-MS0/U-CAM118 -- wraps CAMDeepLearningOrchestratorEngine's voices[]+decision output into a structured, replayable, auditable 8-step reasoning chain (input_parse -> physics_check -> ml_inference[Ollama] -> ml_inference[NIM/Triton] -> tribal_lookup -> aggregation -> escalation_check -> final_decision). Built for human-in-the-loop review with `decide/buildFromDecision/getChain/listChains/whyDecision/compareAlternatives`. In-memory Map with FIFO eviction at 1000 chains. Peer pattern: CADReasoningChainEngine.
file: `mcp-server/src/engines/CAMReasoningChainEngine.ts`

### HyperMillDeflectionThermalMappingEngine.ts
The largest engine in the galaxy by byte size. U-HKC42 mapping registry linking hyperMILL CAM parameters to their downstream deflection and thermal physics engines (ToolDeflectionEngine, PartDeflectionEngine, ThermalWearCouplingEngine, CuttingTemperatureEngine). Each entry captures the driving parameter, the physics chain (e.g. `ap -> Fc = kc1_1*ap*fz^(1-mc) -> Fr -> delta = FL^3/3EI`), a limit/threshold, material sensitivity (high/medium/low), and a confidence level. Cites Timoshenko and Shaw. Exports: `DeflectionThermalMapping`.
file: `mcp-server/src/engines/hypermill/HyperMillDeflectionThermalMappingEngine.ts`

### HyperMillSurfaceQualityMappingEngine.ts
U-HKC43 surface-quality + safety mapping registry. Maps hyperMILL CAM parameters to SurfaceFinishPredictorEngine (Ra/Rz), SurfaceIntegrityEngine (white layer/work hardening), and ResidualStressPredictionEngine, plus safety-hook mappings (collision, tool breakage, over-travel, spindle overspeed, negative stock). Claims >=178 surface-quality + >=120 safety = >=298 mappings. Cites Shaw (Ra = f^2/32R), Lasemi (scallop), Bouzakis (Rz), Ulutan/Ozel (residual), Chou/Evans (white layer).
file: `mcp-server/src/engines/hypermill/HyperMillSurfaceQualityMappingEngine.ts`

### HyperMillNonCAMMappingEngine.ts
U-HKC44 registry mapping non-CAM-domain parameters (CAD, fixture, linking, settings) to downstream physics/DFM/cost engines. Unlike the direct-force mapping engines, these are often advisory -- e.g. DFM feasibility, clamp-force validation (`F_clamp >= mu_safety * F_cutting` with a 2.5 safety factor per Sandvik), linking cycle-time impact, and WCS probe accuracy. Targets KienzleForceModelEngine, ToolDeflectionEngine, SurfaceFinishPredictorEngine, CycleTimeEstimatorEngine, DFMCheckEngine. Cites Bralla, NIST SP 260-136, Altintas. Exports: `NonCAMDomain`, `NonCAMMappingType`.
file: `mcp-server/src/engines/hypermill/HyperMillNonCAMMappingEngine.ts`

### HMCProjectParserEngine.ts
HM-KC-MS10-S1/U-HKC51 -- reads hyperMILL `.hmc` project files (XML-based, no USB dongle needed) and extracts complete FeatureSequenceRecords: operations, parameters, tools, stock, and WCS. Handles v31 and v33 format variations. Imports `RecognizedFeature`/`FeatureType`/`FeatureDimensions` from FeatureRecognitionEngine. Exports: `FeatureSequenceSource`, `SequenceOperation`, `SequenceTool`.
file: `mcp-server/src/engines/hypermill/HMCProjectParserEngine.ts`

### CAMAddInFrameworkEngine.ts
E1125 (CAMX-MS11/U01) reusable framework that generates CAM-system add-ins/plugins connecting a CAM seat to the PRISM MCP server on localhost:18361. Produces ready-to-use source templates for HTTP client, UI panel, tool sync, and post-processor integration across Mastercam (C#/.NET), SolidCAM (VBA), NX (Python), hyperMILL (Python), Fusion 360 (Python), PowerMill (macro), and CATIA (VBA). Exports: `CamSystem`, `Language`, `FeatureType`, `GeneratedFile`, `AddInResult`, and per-feature result types.
file: `mcp-server/src/engines/CAMAddInFrameworkEngine.ts`

## Full engine index

| Engine | Category | One-line |
|--------|----------|----------|
| CAMKernelEngine.ts | Kernel | Computer-Aided Manufacturing Kernel -- toolpath gen + collision + G-code (safety-critical) |
| CAMKernelOrchestratorEngine.ts | Kernel | Unified kernel pipeline orchestrator (cam_generate/cam_turn/cam_simulate) |
| CAMKernelExtensionEngine.ts | Kernel | CK-MS10+12 -- turning profile, 2D nesting, DXF/SVG import, NL CAM, G-code diff |
| CAMKernelValidationEngine.ts | Kernel | CK-MS9+11+13 -- runtime schemas, stochastic routing, probe gen, DFM |
| CAMKernelDispatcherBridge.ts | Kernel | CK-MS7+9 dispatcher bridge for the CAM kernel |
| CAMAGIMasterOrchestratorEngine.ts | Orchestration | Unified CAM AGI master orchestrator -- routes 4 CAM systems, 8 reasoning modes |
| CAMIntegrationEngine.ts | Orchestration | R9-MS1 CAM system integration (export/import/tool-sync/post-blocks) |
| CAMPostInvokeOrchestratorEngine.ts | Orchestration | Post-invoke orchestration (U-CAM-R3-10) |
| CAMStrategyRecommenderEngine.ts | Strategy | Production CAM strategy recommender |
| CAMRecommendEngine.ts | Strategy | CAM strategy recommendations |
| CAMParameterOptimizerEngine.ts | Strategy | Production CAM parameter optimizer |
| CAMParameterValidatorEngine.ts | Strategy | Production CAM parameter validator |
| CAMOptimizationSuggestionEngine.ts | Strategy | AI recommendations (U-CAM103) |
| CAMSpeedFeedBridgeEngine.ts | Strategy | Per-CAM speed/feed translation (U-CAM99) |
| CAMFunctionRouterEngine.ts | Strategy | Production CAM intent router |
| CAMFeatureLearningEngine.ts | Strategy | CAM feature recognition + operation suggest |
| CAMAnalyzeEngine.ts | Strategy | CAM operation analysis |
| CAMDeepLearningEngine.ts | CAM-AGI/DL | Deep learning + multi-CAM (18 systems) knowledge integration |
| CAMDeepLearningOrchestratorEngine.ts | CAM-AGI/DL | CAM AGI orchestrator producing voices[]+decision (U-CAM117) |
| CAMAGIReasoningEngine.ts | CAM-AGI/DL | Production CAM AGI reasoning surface |
| CAMReasoningChainEngine.ts | CAM-AGI/DL | 8-step replayable auditable reasoning chain (U-CAM118) |
| CAMConfidenceCalibrationEngine.ts | CAM-AGI/DL | Confidence calibration (U-CAM119) |
| CAMModelServingEngine.ts | CAM-AGI/DL | Model-serving fabric (registry/A-B canary/SLO/promotion/rollback) (U-CAM122) |
| CAMModelPromotionGateEngine.ts | CAM-AGI/DL | Close-the-loop self-driving promotion gate (U3) |
| CAMAIValidationEngine.ts | CAM-AGI/DL | Production-readiness behavioral-contract validation harness (U-CAM127) |
| CAMLoRAEngine.ts | ML/Training | CAM LoRA (U-CAM107) |
| CAMLoRAAdapterTrainerEngine.ts | ML/Training | LoRA adapter trainer (U-CAM-ML-05) |
| CAMTransferLearningEngine.ts | ML/Training | Cross-CAM transfer learning + domain similarity (U-CAM121) |
| CAMBaselineRegressorEngine.ts | ML/Training | ML baseline regressor (U-CAM-ML-04) |
| CAMFeatureExtractorEngine.ts | ML/Training | ML feature extractor (U-CAM-ML-02) |
| CAMMLSplitEngine.ts | ML/Training | Train/test split (U-CAM-ML-03) |
| CAMMLDriftMonitorEngine.ts | ML/Training | ML drift monitor (U-CAM-ML-07) |
| CAMTribalRAGEngine.ts | ML/Training | Tribal RAG retrieval (U-CAM-ML-06) |
| CAMFeedbackLoopEngine.ts | Closed-loop | Correction/outcome recording + LoRA export + accuracy drift (U-CAM120) |
| CAMOutcomeCaptureWireEngine.ts | Closed-loop | Close-the-loop CAM training producer (U5) |
| CAMMachiningErrorPredictionEngine.ts | Closed-loop | Predictive alerts (U-CAM102) |
| CAMScenarioGeneratorEngine.ts | Closed-loop | Scenario generation for test/train (U-CAMTEST08) |
| CAMCrossSystemTranslatorEngine.ts | Vendor bridges | Production cross-CAM parameter translator |
| CAMGeometryExchangeEngine.ts | Vendor bridges | Geometry transfer protocol (U-CAM97) |
| CAMAddInFrameworkEngine.ts | Vendor bridges | Generates CAM add-ins/plugins for 7 CAM systems (E1125) |
| CAMPluginCommunicationHubEngine.ts | Vendor bridges | Bidirectional plugin transport hub (U-CAM96) |
| CAMPluginRegistryEngine.ts | Vendor bridges | Plugin discovery/health/compatibility (U-CAM98) |
| CAMPluginSDKEngine.ts | Vendor bridges | Lightweight API for CAM vendor integration |
| CAMExportEngine.ts | Vendor bridges | CAM system export |
| CAMWorksFunctionIndexEngine.ts | Vendor bridges | CAMWorks function index (U-CAM-FIDX-14) |
| CAMCatalogLoaderEngine.ts | Catalog/tribal | Binds captured CAM catalog JSONs to canonical schemas |
| CAMCatalogSplitterEngine.ts | Catalog/tribal | PHASE-1 catalog fan-out |
| CAMCatalogPhysicsLinkerEngine.ts | Catalog/tribal | Catalog->physics linker (U-CAM-ENRICH-01) |
| CAMCatalogEnrichmentValidator.ts | Catalog/tribal | Catalog enrichment validator (U-CAM-ENRICH-04) |
| CAMTrainingExtractionAggregatorEngine.ts | Catalog/tribal | PHASE-4 normalization layer |
| CAMToolGetEngine.ts | Catalog/tribal | CAM tool data retrieval |
| CAMToolLibraryEngine.ts | Catalog/tribal | CAM tool library management |
| CAMTribalKnowledgeEngine.ts | Catalog/tribal | Production CAM tribal-knowledge surface |
| CAMTribalKnowledgeInjectionEngine.ts | Catalog/tribal | Context tooltips for CAM UI (U-CAM101) |
| CAMTribalTipLinkerEngine.ts | Catalog/tribal | Tribal tip linker (U-CAM-ENRICH-02) |
| CAMAIActionLinkerEngine.ts | Catalog/tribal | AI action linker (U-CAM-ENRICH-03) |
| CAMInHostAssertionBundleEngine.ts | Test/UI/util | In-host assertion bundle (U-CAMTEST14) |
| CAMInHostNightlyOrchestratorEngine.ts | Test/UI/util | Nightly orchestrator backend (U-CAMTEST16) |
| CAMInHostRegressionDetectorEngine.ts | Test/UI/util | Regression detector (U-CAMTEST17) |
| CAMInHostResultsBridgeEngine.ts | Test/UI/util | Results bridge (U-CAMTEST15) |
| CAMInputExhaustionPlannerEngine.ts | Test/UI/util | Input exhaustion planner (U-LP01) |
| CAMPostSelectorUIEngine.ts | Test/UI/util | Post-processor selector UI feed (U-CAM100) |
| CAMResultCacheEngine.ts | Test/UI/util | Result cache (CK-MS12 U03) |
| CAMUtilityEngines.ts | Test/UI/util | Shared CK-MS12 utility engines |
| CAMPhase5Stubs.ts | Test/UI/util | Phase-5 STUB engines (F5 scrutiny fix -- flagged as stub) |
| hypermill/HyperMillKienzleMappingEngine.ts | hyperMILL physics | Kienzle force mapping registry |
| hypermill/HyperMillSpeedFeedMappingEngine.ts | hyperMILL physics | Speed/feed + SLD parameter mapping |
| hypermill/HyperMillDeflectionThermalMappingEngine.ts | hyperMILL physics | Deflection + thermal parameter mapping (U-HKC42) |
| hypermill/HyperMillSurfaceQualityMappingEngine.ts | hyperMILL physics | Surface quality + safety mapping registry (U-HKC43) |
| hypermill/HyperMillNonCAMMappingEngine.ts | hyperMILL physics | CAD/fixture/linking/settings physics mappings (U-HKC44) |
| hypermill/HMCProjectParserEngine.ts | hyperMILL parse/seq | Parses .hmc (v31/v33) into FeatureSequenceRecords (U-HKC51) |
| hypermill/STEPFeatureExtractorEngine.ts | hyperMILL parse/seq | STEP feature extraction (U-HKC52) |
| hypermill/PartSimilaritySearchEngine.ts | hyperMILL parse/seq | Part similarity search (U-HKC53) |
| hypermill/FeatureSequenceReplicatorEngine.ts | hyperMILL parse/seq | Feature sequence replicator (U-HKC54) |
| hypermill/CADSequenceLearningEngine.ts | hyperMILL parse/seq | CAD sequence learning (U-HKC55) |
| hypermill/HyperMillCADArtifactGeneratorEngine.ts | hyperMILL artifacts | CAD artifact generator |
| hypermill/HyperMillCAMCoreArtifactGeneratorEngine.ts | hyperMILL artifacts | CAM core artifact batch generator |
| hypermill/HyperMillCAMAdvancedArtifactGeneratorEngine.ts | hyperMILL artifacts | CAM advanced artifact batch generator |
| hypermill/HyperMillFixtureArtifactGeneratorEngine.ts | hyperMILL artifacts | Fixture domain artifact generator |
| hypermill/HyperMillLinkingArtifactGeneratorEngine.ts | hyperMILL artifacts | Linking domain artifact generator |
| hypermill/HyperMillSettingsArtifactGeneratorEngine.ts | hyperMILL artifacts | Settings domain artifact generator |
| hypermill/HyperMillSimNCArtifactGeneratorEngine.ts | hyperMILL artifacts | Simulation + NC artifact batch generator |

## Notes / uncertainties
- No `.ts` engines live under `engines/cam/` -- that directory is doctrine-only (7 markdown files). The 82 code engines live in the root engine tree (`mcp-server/src/engines/CAM*.ts`, 65) plus `engines/hypermill/` (17), per `engines/cam/CLAUDE.md` sec 2. Count enumerated 2026-07-01.
- `CAMPhase5Stubs.ts` self-identifies as stub engines (F5 scrutiny fix). Flagged; do not treat as production.
- One-liners for the 67 non-detailed engines are the leading JSDoc title line grepped from each file, NOT full-body reads (token discipline) -- accurate at the title level, un-verified beyond the header.
- MEMORY.md high-ROI/failure-mode sections are qwen2.5-coder-synthesized (advisory); the `node_formula_*` references there are graph-node artifacts, not engines, and are excluded from this digest.

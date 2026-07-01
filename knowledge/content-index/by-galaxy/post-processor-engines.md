---
name: post-processor-engines
description: Strategic categorized engine digest for the post-processor galaxy (CAM->controller G-code emission, 188 engines)
type: reference
galaxy: post-processor
node_type: memory
---

# post-processor galaxy -- engine digest

## Overview

The post-processor galaxy (slot:echo) owns the CAM-output -> controller-dialect
translation surface: it turns kilo's CAM toolpaths (ToolpathBlock / NCI / APT) into
physics-optimized, safety-gated controller-native NC. The core is a 7-phase / ~35-stage
`PostProcessorPipelineEngine` (P0 defaults -> P1 Kienzle/Taylor physics -> P2 block-by-block
-> P3 motion-opt -> P4 stochastic CI95 -> P5 safety+alarm+tribal -> P6 emit + byte-equiv CI).
On top of that core sits the saleable MasterPost product line (7-engine fanout / 14-controller
AGI surface via `MasterPostProcessorUnifiedAGIEngine`) and the JM Die `.cps` production fleet
(Haas Classic, Hurco WinMax/MAX5, Okuma OSP-P300, Fanuc 31i). Primary MCP surface is
`prism_pp` (ppDispatcher, ~654-655 actions) -- NOT camDispatcher alone (which misses ~80%
of the pp_ action surface); productDispatcher carries the 24 `ppg_*` PPG product actions.
Engines live FLAT at `mcp-server/src/engines/`; this galaxy's subdir holds doctrine only.

Enumerated count (flat, doctrine-refined pattern): **188 engines**. Physics constants are
always imported from `src/physics/constants.ts`; dialect G/M tables from
`controller-knowledge.json` + `okuma-dialect-knowledge.ts` -- never inlined.

## Strategic categories

### 1. Post-engine pipeline core (the emit backbone)
- `PostProcessorPipelineEngine` -- 7-phase / 35+-stage universal emit orchestrator (the canonical path)
- `PostProcessorEngine` - `AdvancedPostProcessorEngine` - `PostOutputGenerationEngine` - `PostProcessorGeneratorEngine`
- `PostPhysicsFoundationEngine` - `AdvancedPostPhysicsEngine` - `PostProcessorPhysicsAwareGeneratorEngine` - `PostProcessorUnifiedPhysicsOrchestrationEngine`
- `PostProcessorFeedOptimizerEngine` - `PostProcessorUnificationEngine` (4 actions, reference impl) - `PostProcessorIntelligenceOrchestratorEngine`

### 2. MasterPost product (saleable 14-controller AGI surface)
- `MasterPostProcessorEngine` -- 7-engine fanout, MACHINE_FEATURE_DB
- `MasterPostProcessorUnifiedAGIEngine` -- 14-controller / 19-CAM / 25+-op AGI, CONTROLLER_PROFILES
- `MasterPostGeneratorEngine` -- generates production post code from ControllerKnowledge + tips
- `MasterPostFineTuningEngine` -- per-vendor calibration / Welford-corrected learner
- `MasterPostProcessorAGIOrchestrationEngine` - `MasterPostProcessorGeniusEngine` (both stub-wired, dark-in-practice)
- `PostProcessorMasterPostArchitectureEngine` - `PostProcessorAGIMasterRegistryEngine` - `PostProcessorAGIWiringIntegrationEngine`

### 3. Controller-dialect knowledge + translation
- `ControllerKnowledgeEngine` (176K) - `ControllerKnowledgeDBEngine` - `ControllerDialectEngine` - `ControllerFeatureMatrixEngine`
- `ControllerProgrammingIntelligenceEngine` - `ControllerStrategyValidatorEngine` - `MultiControllerCalibrationEngine`
- `PostProcessorNumericDialectEngine` - `PostProcessorDialectValidatorEngine` - `UnifiedProbingDialectEngine` - `OkumaDialectKnowledgeEngine`
- `GCodeTranspilerEngine` (cross-controller transpile) - `CpsDialectMapperEngine` - `PPDialectTransferEngine`
- CAM-catalog dialect maps: `Fusion360ControllerCatalogEngine` - `HyperMillControllerCatalogEngine` - `MastercamControllerCatalogEngine`

### 4. G-code intelligence (validate / optimize / reverse / estimate)
- `GCodeSafetyAnalyzerEngine` (central safety gate: rapid/coolant/retract) - `GCodeValidationEngine` - `GCodeVerificationEngine`
- `GCodeIntelligencePipelineEngine` - `GCodeTemplateEngine` - `GCodeSnippetEngine`
- `GCodeOptimizationEngine` - `GCodeEnergyOptimizerEngine` - `GCodeBidirectionalOptimizerEngine`
- `GCodeRuntimePredictorEngine` - `GCodeTimeEstimatorEngine`
- `GCodeUnderstandingTransformerEngine` (NL->GC) - `GCodeReverseCADEngine` (GC->CAD) - `SetupSheetFromGCodeEngine`

### 5. Per-vendor mill / lathe MasterPost specialists
- Mill: `HurcoV11MillMasterPostEngine` (JM canonical mill, 120K) - `OkumaOSPMillMasterPostEngine` - `HaasNGCMillMasterPostEngine` - `RokuRokuFanuc31iMillMasterPostEngine`
- Lathe: `OkumaB250LatheMasterPostEngine` - `HurcoWinMaxLatheMasterPostEngine` - `LathePostProcessorEngine` - `LatheSwissPostGeneratorEngine`
- Lathe MasterPost stack: `LatheMasterPost{API,Router,UnifiedOutput,SelfAwareness,DeepReasoning,EnsembleCrossCheck,RegressionMatrix}Engine`
- Okuma parametric/macro: `OkumaParametricProgramEngine` (160K) - `OkumaMacroConverterBridgeEngine` - `OkumaMacroHeaderGeneratorEngine` - `OkumaOSPParserEngine`

### 6. WEDM + EDM + specialty-process post (echo emits, mike physics)
- `EDMPostProcessGCodeEngine` (WEDM-P2P MS15/16, 128K) - `PPWireEDMPostEngine` - `PPSinkerEDMPostEngine` - `EDMPostProcessorExtension`
- `WEDMPost{Fanuc,Sodick,Makino,Mitsubishi,Agie}Engine` - `WEDMPostDialectRouterEngine` - `WEDMControllerDialectVerifierEngine`
- `MitsubishiMV1200RWireEDMMasterPostEngine` - `WEDMRLControllerEngine` - `WEDMRLPolicyPersistence`
- `LaserWaterjetPostExtension` - `FiveAxisPostEngine` - `PostProcessorMachineKinematicsEngine`

### 7. AI / learning / neural (PSN leg #10 participants)
- `PostProcessorDeepIntelligenceEngine` - `PostProcessorDeepLearningEngine` - `PostProcessorDeepReasoningEngine` - `PostProcessorUnifiedDeepReasoningEngine` - `PostProcessorDeepCognitionEngine`
- `PostProcessorNeuralNetworkEngine` - `PostProcessorVideoKnowledgeNeuralEngine` - `PostProcessorTransformerEngine` - `PostProcessorMetaLearningEngine` - `RLPostProcessorEngine`
- `JMDiePostProcessorLearningEngine` - `LathePostGeneratorActiveLearningEngine` - `PostProcessorAGIContinuousLearningEngine` - `CNCControllerDeepLearningEngine`
- `PostProcessorAICoordinationBridge` - `PostProcessorDeepAIHardeningEngine` - `PostProcessorUltimateAIEngine` - `LathePostProcessorAIEngine`

### 8. Knowledge base + tribal + CPS parsing + libraries
- Knowledge: `PostProcessorKnowledgeEngine` - `PostProcessorComprehensiveKnowledgeEngine` - `PostProcessorHyperMillKnowledgeEngine` - `PostProcessorKnowledgeGraphEngine` - `LathePostKnowledgeGraphEngine` - `PostProcessorTribalKnowledgeIntegrationEngine`
- CPS parse/impl: `CpsParserEngine` - `CpsPostParserEngine` - `FusionCPSParserEngine` - `PostProcessorCPSImplementationEngine`
- Post libraries + selection: `PostLibraryEngine` - `PostLibraryCatalogEngine` - `PostLibraryConfiguratorEngine` (per-customer product) - `PostSelectionEngine` - `PostDownloadEngine` - `PostVersioningEngine`
- Databases: `MonolithControllerDatabaseEngine` - `MonolithFusionPostDatabaseEngine` - `FusionLathePostDeltaRegistryEngine`

### 9. Validation / safety-gate / golden-snapshot (prove-out)
- `PostValidationSuiteEngine` - `PostValidationHardeningEngine` - `PostValidationReportEngine` - `PostVerificationSafetyEngine`
- `PostEmitSafetyGateEngine` - `PostFeatureAuditEngine` - `PostProcessorVerificationEngine` - `PostProcessorVerificationOrchestratorEngine`
- `PostProcessorCapabilityMatrixEngine` - `PostProcessorMatrixTestHarnessEngine` - `LathePostRegressionTestGeneratorEngine` - `LatheMasterPostRegressionMatrixEngine`

### 10. CAM->post bridges + orchestration + PPG statistics
- Bridges: `CAMPostInvokeOrchestratorEngine` - `CAMPostSelectorUIEngine` - `CrossCAMPostEngine` - `MultiCAMPostEngine` - `CrossProcessPostBridge` - `NovelPostProcessorBridgeEngine` - `HybridPostMergeEngine` - `FusionPostSyncEngine`
- PPG product / analysis: `PPGCodeLintEngine` - `PPGCodeMinimizerEngine` - `PPGCodeProgramAnalyzerEngine` - `PPGCodeStatisticsEngine` - `PPGDialectRankerEngine` - `PPGRAGDialectMatchEngine`
- PP adaptation: `PPController{Adaptation,Compatibility,Embedding}Engine` - `PPMachineSpecificPostEngine` - `PPEndToEndPostGeneratorEngine` - `PPOkuma{SubSpindleSync,TurningPost}Engine` - `MotionControllerInjectionEngine`

## Key engines (detailed)

### PostProcessorPipelineEngine.ts
Universal post-processor pipeline orchestrator -- chains 35+ optimization stages across 7 phases
(P0 input-normalize+defaults, P1 physics foundation, P2 block-by-block, P3 motion-opt, P4 stochastic
verify, P5 safety+knowledge, P6 output-gen) to emit mathematically optimized G-code for any
machine/controller/CAM. Imports Kienzle/Taylor physics from `constants.ts`; each stage is
independently toggleable and gracefully skips on missing input. This is echo's canonical emit path
(never string-concat NC).
Path: `mcp-server/src/engines/PostProcessorPipelineEngine.ts` (~224K)
Notable exports: `ToolpathBlock`, `ControllerFamily`, `ToolType`, `MoveType`, `OptimizationTarget`, `BlockClassification`, `StageStatus`.

### ControllerKnowledgeEngine.ts
AI-powered controller knowledge base -- the single-source dialect profile store consumed by
MasterPostGenerator and the dialect translators. Covers 12 controller families (Hurco WinMax BNC/ISNC,
Haas NGC, Fanuc 0i/30i/31i, Okuma OSP P200/P300, Siemens SINUMERIK 840D/ONE, Mazatrol, Heidenhain TNC,
Mitsubishi M70/M80, Fagor, Centroid, Brother C00, generic ISO) with per-controller cycle definitions,
M-code mappings, G-code dialect, and mode-specific behavior.
Path: `mcp-server/src/engines/ControllerKnowledgeEngine.ts` (~176K, 3722 lines)
Notable exports: `ControllerFamily`, `ControllerProfile`, `ControllerFeatures` (rigidTapping/lookAhead/maxAxes/supportsNURBS...).

### OkumaParametricProgramEngine.ts
Okuma OSP-P parametric macro-program generator using V-variable parametric programming, derived from
real production turning macros. Full auto-calculation chains for speeds/feeds/depths/clearances across
casing turning, counter-bore, face/OD/ID cycles, drill sequences, cutoff, chamfer/radius. Pure
computation (no imports); encodes Okuma-specific formulas (RPM=SFM*3.82/dia, drill point-depth, the
Okuma chamfer 180-angle convention).
Path: `mcp-server/src/engines/OkumaParametricProgramEngine.ts` (~160K)
Notable exports: `PartGeometry`, `ChamferConfig`, `ToolConfig`, `SpeedFeedConfig`, `CuttingParams`.

### EDMPostProcessGCodeEngine.ts
Consolidates WEDM-P2P MS15 (post-process planning: recast removal, stress relief, inspection, surface
treatment, sequencing) + MS16 (wire-EDM G-code gen: base EDM post, Fanuc/Sodick/Makino/Mitsubishi/
Agie-Charmilles dialects, multi-pass orchestrator rough D01 -> trims D02..Dn -> tab cuts). Pure
computation; handles wire threading, tech tables, multi-pass, and per-controller condition codes.
Path: `mcp-server/src/engines/EDMPostProcessGCodeEngine.ts` (~128K)
Notable exports: `PostProcessStep`, `PostProcessPlan`, `PostProcessInput` (actions: plan_post_process, generate_gcode, generate_fanuc/sodick/makino, full_generate).

### HurcoV11MillMasterPostEngine.ts
The CANONICAL JM Die mill post -- Hurco VMX24 / WinMax V11 (conversational + NC mode). All mill post
logic derives from here. Encodes machine specs (24-tool ATC, CT40, 10K RPM, +/-0.0001"), Hurco-specific
features (G65 conversational macros, UltiMotion, G68.2-equiv work surface, Renishaw OMP40 probing),
8 AGI reasoning modes, Kienzle-based feed optimization, and 20+ embedded JM tribal tips. Imports physics
from `constants.ts`; composes AutoSpeedFeed + RapidRepositionOpt + HSMDwellAtCorner + AdvancedPostProcessor.
Path: `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` (~120K)
Notable exports: `AdvancedPostFeaturesConfig`; method `.generateProgram(...)` -> `master_post_hurco_v11` (the fine-tune target).

### OkumaOSPMillMasterPostEngine.ts
Closes the OSP-P*M hard-reject branch in master_post_by_machine -- the Okuma-mill emission path for
MB-V (3-axis), MU-V (5-axis, OSP-P500M), and Genos M-series. Mirror of HurcoV11MillMasterPost (same
MillOperation shape, same BlockAnnotation[] flow, same Kienzle/Taylor gate). OSP-P*M dialect (G15 H1
offsets, two-line tool change, G81/83/73/84/85/87 cycles, G65 P88xx probing, parenthesis comments,
IJK arcs, P500 Super-NURBS G05.1 Q1 + G43.5 TCPC) is sourced from ControllerDialectEngine, never
hardcoded.
Path: `mcp-server/src/engines/OkumaOSPMillMasterPostEngine.ts` (~100K)
Notable exports: emits labelled spindle-start blocks + `BlockAnnotation[]` sidecar; imports `controllerDialectEngine`.

### PostProcessorDeepIntelligenceEngine.ts
PP-HARDEN-MS4 deep-intelligence engine -- the widest coverage matrix in the galaxy. Accounts for every
CNC variable across machines (lathe/mill/wire-EDM/sinker-EDM/grinder incl 5-axis kinematics), tooling
(500+ insert geometries, holders, turrets), 30+ controllers (Fanuc, Siemens, Heidenhain, Haas, Okuma,
Mazak, Hurco, Brother, Mitsubishi, Makino, DMG MORI, Citizen, Star, Tsugami, Sodick, Fidia, DATRON,
Index), and all 6 ISO material groups with deep-learning + deep-reasoning selection.
Path: `mcp-server/src/engines/PostProcessorDeepIntelligenceEngine.ts` (~84K)
Notable exports: (name-derived AI-tier; header is a coverage census, class body not read).

### MasterPostGeneratorEngine.ts
Generates fully functional production post-processor code for any supported controller by synthesizing
ControllerKnowledgeEngine profiles + tribal tips + math algorithms. Covers Hurco WinMax, Haas NGC (G187/
G234), Fanuc 0i/31i (AICC/Nano/G43.4-5/G68.2), Okuma OSP (Super-NURBS G08, CAS M510/511, G15 offsets),
Heidenhain (CYCL DEF/PLANE SPATIAL/M128 TCPM), Siemens 840D (TRAORI/CYCLE800/832), Mazak (G12.1 polar),
Brother C00 -- across 3-ax/4-ax/5-ax/mill-turn/Swiss configs with SFM<->RPM, feed, peck, retract math.
Path: `mcp-server/src/engines/MasterPostGeneratorEngine.ts` (~76K)
Notable exports: imports `controllerKnowledgeEngine` + `CONTROLLER_KNOWLEDGE_TIPS`; type defs for post-gen.

### LathePostProcessorAIEngine.ts
AI-powered lathe post intelligence (deep-learning + deep-reasoning + LLM CLI) across 21 lathe controllers
(Fanuc 0i/30i/31i/32i/35i-TF, Okuma OSP-P200/300/500L, Mazak SmoothG/C + Matrix2, Haas NGC, Siemens
828D/840D, DMG CELOS, Hurco MAX5/WinMax, Doosan). Provides cross-controller translation, canned-cycle
selection (G70-76, CYCLE93-98, GROU/GFIN), block-consolidation optimization, controller migration, and
Fanuc-B->Siemens-R->Okuma macro conversion. PATHS.md flags it as 73K largest-dark (single getPostProfile wired).
Path: `mcp-server/src/engines/LathePostProcessorAIEngine.ts` (~76K)
Notable exports: `LatheControllerFamily`, `PostControllerModel` (21-model enum).

### PostProcessorKnowledgeEngine.ts
Deep knowledge base extracted from the Post Processor Training Guide (314 pages) + Postability UPK docs
(26 pages). Encodes CPS/Fusion entry functions (onOpen/onSection/onCircular/onCyclePoint...), drilling
cycle types + params, multi-axis config (rotary switches, TCP, tilt planes), manual NC commands, work-
offset/WCS handling, machine setup, feed-per-rev handling, and G-code output patterns -- the reference
substrate for CPS-based post generation.
Path: `mcp-server/src/engines/PostProcessorKnowledgeEngine.ts` (~72K)
Notable exports: `EntryFunction`, `ParameterDefinition`, `ENTRY_FUNCTIONS[]` (categorized lifecycle/motion/cycle/command/manual/utility).

### MasterPostProcessorUnifiedAGIEngine.ts
The 14-controller / 19-CAM / 25+-op unified AGI surface for the MasterPost product -- carries the
`CONTROLLER_PROFILES` table (fanuc/siemens/haas/okuma/mazak/heidenhain/mitsubishi/fagor/hurco/dmg_mori/
brother/doosan/citizen/generic) that PATHS.md cites as the canonical 14 post-gen controller profiles.
Produces `UnifiedPostResult`. Header not read this pass; grounded in PATHS.md + CLAUDE.md sec2.
Path: `mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts` (~68K)
Notable exports: `CONTROLLER_PROFILES`, `UnifiedPostResult` (name/doctrine-derived).

### GCodeSafetyAnalyzerEngine.ts
The central 67K NC safety gate -- the P5 safety-phase workhorse. Analyzes emitted G/M sequences for rapid
moves into material, coolant-ordering (M8 must follow M3-at-speed), missing safe retracts between ops, and
dialect comment-bracket violations. Companion test suite exists (GCodeSafetyAnalyzerEngine.test.ts, 29 tests
per the 2026-06-24 test wave). Header not read this pass; grounded in PATHS.md + galaxy CLAUDE.md sec5.
Path: `mcp-server/src/engines/GCodeSafetyAnalyzerEngine.ts` (~68K)
Notable exports: safety-analysis surface (name/doctrine-derived).

### ControllerFeatureMatrixEngine.ts
Controller feature-matrix -- the per-controller capability grid (which vendor supports NURBS / TCP / high-
speed look-ahead / rigid tapping / probing cycles). Feeds the MasterPost feature-parity decision (what a
target controller can vs cannot emit). Header not read this pass; grounded in the 14-controller dialect-
matrix doctrine ([[architecture/post-processor-controller-dialect-matrix]]).
Path: `mcp-server/src/engines/ControllerFeatureMatrixEngine.ts` (~68K)
Notable exports: feature-matrix surface (name/doctrine-derived).

### PostProcessorNeuralNetworkEngine.ts
Neural-network post engine -- one of the 6 name-attributed AI engines echo owns (PSN leg #10). Part of the
deep-learning tier that classifies/predicts controller-dialect regimes and post-quality (wired via
pp_ai_* dispatcher actions). Header not read this pass; grounded in galaxy MEMORY.md AI-capabilities block.
Path: `mcp-server/src/engines/PostProcessorNeuralNetworkEngine.ts` (~64K)
Notable exports: neural post surface (name-derived).

### ControllerDialectEngine.ts
The single-source-of-truth dialect engine consumed by the mill/lathe MasterPost specialists (e.g.
OkumaOSPMillMasterPost imports `controllerDialectEngine` for G15/G81-cycle/probing/arc dialect rather than
hardcoding). Provides per-controller G/M dialect tables so specialist posts never inline codes. Header not
read this pass; grounded in the OkumaOSPMillMasterPost import + galaxy CLAUDE.md sec4.
Path: `mcp-server/src/engines/ControllerDialectEngine.ts` (~64K)
Notable exports: `controllerDialectEngine` singleton, `dialects` table (verified via consumer import).

## Full engine index

| Engine | Category | One-line |
|--------|----------|----------|
| PostProcessorPipelineEngine | pipeline-core | 7-phase / 35+-stage universal emit orchestrator (header-verified) |
| PostProcessorEngine | pipeline-core | base post-processor engine (name-derived) |
| AdvancedPostProcessorEngine | pipeline-core | advanced post pass (adaptive-clearing/HSM/feed-opt configs) (name-derived) |
| AdvancedPostPhysicsEngine | pipeline-core | advanced post physics layer (name-derived) |
| PostPhysicsFoundationEngine | pipeline-core | P1 physics-foundation stage engine (name-derived) |
| PostProcessorPhysicsAwareGeneratorEngine | pipeline-core | physics-aware post generator (name-derived) |
| PostProcessorUnifiedPhysicsOrchestrationEngine | pipeline-core | unified physics orchestration (name-derived) |
| PostProcessorFeedOptimizerEngine | pipeline-core | post feed optimizer (name-derived) |
| PostProcessorGeneratorEngine | pipeline-core | post-processor generator (name-derived) |
| PostOutputGenerationEngine | pipeline-core | P6 output-generation stage (name-derived) |
| PostProcessorUnificationEngine | pipeline-core | fully-wired unification (4 actions, reference impl) (doctrine-verified) |
| PostProcessorIntelligenceOrchestratorEngine | pipeline-core | post-intelligence orchestrator (name-derived) |
| MasterPostProcessorEngine | masterpost-product | 7-engine fanout, MACHINE_FEATURE_DB (doctrine-verified) |
| MasterPostProcessorUnifiedAGIEngine | masterpost-product | 14-controller/19-CAM AGI, CONTROLLER_PROFILES (header-verified via doctrine) |
| MasterPostGeneratorEngine | masterpost-product | generates production post code from ControllerKnowledge+tips (header-verified) |
| MasterPostFineTuningEngine | masterpost-product | per-vendor calibration / Welford learner (doctrine-verified) |
| MasterPostProcessorAGIOrchestrationEngine | masterpost-product | AGI orchestration (stub-wired, dark-in-practice) (doctrine-verified) |
| MasterPostProcessorGeniusEngine | masterpost-product | genius-tier gen (stub-wired, dark-in-practice) (doctrine-verified) |
| PostProcessorMasterPostArchitectureEngine | masterpost-product | masterpost architecture layer (name-derived) |
| PostProcessorAGIMasterRegistryEngine | masterpost-product | AGI master registry (name-derived) |
| PostProcessorAGIWiringIntegrationEngine | masterpost-product | AGI wiring integration (name-derived) |
| ControllerKnowledgeEngine | controller-dialect | 12-family controller knowledge base / profiles (header-verified) |
| ControllerKnowledgeDBEngine | controller-dialect | controller knowledge DB access (name-derived) |
| ControllerDialectEngine | controller-dialect | single-source G/M dialect tables (consumer-import-verified) |
| ControllerFeatureMatrixEngine | controller-dialect | per-controller capability grid (name-derived) |
| ControllerProgrammingIntelligenceEngine | controller-dialect | controller programming intelligence (name-derived) |
| ControllerStrategyValidatorEngine | controller-dialect | controller strategy validator (name-derived) |
| MultiControllerCalibrationEngine | controller-dialect | multi-controller calibration (name-derived) |
| PostProcessorNumericDialectEngine | controller-dialect | numeric dialect (decimal/format conventions) (name-derived) |
| PostProcessorDialectValidatorEngine | controller-dialect | dialect validator (name-derived) |
| UnifiedProbingDialectEngine | controller-dialect | unified probing-cycle dialect (name-derived) |
| OkumaDialectKnowledgeEngine | controller-dialect | Okuma dialect knowledge (name-derived) |
| CpsDialectMapperEngine | controller-dialect | CPS -> dialect mapper (name-derived) |
| PPDialectTransferEngine | controller-dialect | cross-dialect transfer (name-derived) |
| Fusion360ControllerCatalogEngine | controller-dialect | Fusion360 controller catalog map (name-derived) |
| HyperMillControllerCatalogEngine | controller-dialect | hyperMILL controller catalog map (name-derived) |
| MastercamControllerCatalogEngine | controller-dialect | Mastercam controller catalog map (name-derived) |
| CNCControllerDeepLearningEngine | controller-dialect/ai | CNC controller deep-learning (name-derived) |
| GCodeTranspilerEngine | gcode-intelligence | cross-controller G-code transpile (doctrine-verified) |
| GCodeSafetyAnalyzerEngine | gcode-intelligence | central NC safety gate (rapid/coolant/retract) (doctrine-verified) |
| GCodeValidationEngine | gcode-intelligence | pre-emit validation gate (name-derived) |
| GCodeVerificationEngine | gcode-intelligence | pre-emit verification gate (name-derived) |
| GCodeIntelligencePipelineEngine | gcode-intelligence | G-code intelligence orchestrator (name-derived) |
| GCodeTemplateEngine | gcode-intelligence | snippet/template library (name-derived) |
| GCodeSnippetEngine | gcode-intelligence | G-code snippet library (name-derived) |
| GCodeOptimizationEngine | gcode-intelligence | G-code optimization (name-derived) |
| GCodeEnergyOptimizerEngine | gcode-intelligence | energy-aware G-code optimization (name-derived) |
| GCodeBidirectionalOptimizerEngine | gcode-intelligence | bidirectional G-code optimizer (name-derived) |
| GCodeRuntimePredictorEngine | gcode-intelligence | cycle-time / runtime predictor (name-derived) |
| GCodeTimeEstimatorEngine | gcode-intelligence | cycle-time estimator (name-derived) |
| GCodeUnderstandingTransformerEngine | gcode-intelligence | NL -> G-code transformer (name-derived) |
| GCodeReverseCADEngine | gcode-intelligence | G-code -> CAD reverse (name-derived) |
| SetupSheetFromGCodeEngine | gcode-intelligence | setup-sheet from G-code (name-derived) |
| GCodeMaterialParserEngine | gcode-intelligence | material parse from G-code (name-derived) |
| HurcoV11MillMasterPostEngine | vendor-specialist | CANONICAL JM Hurco WinMax V11 mill post (header-verified) |
| OkumaOSPMillMasterPostEngine | vendor-specialist | Okuma OSP-P*M mill post (header-verified) |
| HaasNGCMillMasterPostEngine | vendor-specialist | Haas NGC mill master post (name-derived) |
| RokuRokuFanuc31iMillMasterPostEngine | vendor-specialist | Roku-Roku / Fanuc 31i mill post (name-derived) |
| OkumaB250LatheMasterPostEngine | vendor-specialist | Okuma B250 lathe master post (name-derived) |
| HurcoWinMaxLatheMasterPostEngine | vendor-specialist | Hurco WinMax lathe master post (name-derived) |
| LathePostProcessorEngine | vendor-specialist | base lathe post-processor (name-derived) |
| LatheSwissPostGeneratorEngine | vendor-specialist | Swiss-type lathe post generator (name-derived) |
| LatheMasterPostAPIEngine | vendor-specialist | lathe MasterPost API surface (name-derived) |
| LatheMasterPostRouterEngine | vendor-specialist | lathe MasterPost router (name-derived) |
| LatheMasterPostUnifiedOutputEngine | vendor-specialist | lathe MasterPost unified output (name-derived) |
| LatheMasterPostSelfAwarenessEngine | vendor-specialist | fully-wired lathe self-awareness (6 actions) (doctrine-verified) |
| LatheMasterPostDeepReasoningEngine | vendor-specialist/ai | lathe MasterPost deep reasoning (name-derived) |
| LatheMasterPostEnsembleCrossCheckEngine | vendor-specialist | lathe ensemble cross-check (name-derived) |
| LatheMasterPostRegressionMatrixEngine | validation | lathe MasterPost regression matrix (name-derived) |
| OkumaParametricProgramEngine | vendor-specialist | Okuma OSP-P V-variable parametric macro gen (header-verified) |
| OkumaMacroConverterBridgeEngine | vendor-specialist | Okuma macro converter bridge (name-derived) |
| OkumaMacroHeaderGeneratorEngine | vendor-specialist | Okuma macro header generator (name-derived) |
| OkumaOSPParserEngine | vendor-specialist | Okuma OSP program parser (name-derived) |
| OkumaGosigerTranscriptMinerEngine | knowledge | Okuma Gosiger transcript miner (name-derived) |
| OkumaMachineStepIngesterEngine | knowledge | Okuma machine STEP ingester (name-derived) |
| OkumaManualTipExtractorEngine | knowledge | Okuma manual tribal-tip extractor (name-derived) |
| OkumaRunLogParserEngine | knowledge | Okuma run-log parser (name-derived) |
| HaasParserEngine | knowledge | Haas program parser (name-derived) |
| HurcoParserEngine | knowledge | Hurco program parser (name-derived) |
| RokuRokuParserEngine | knowledge | Roku-Roku program parser (name-derived) |
| FanucLegacyControllerEngine | controller-dialect | Fanuc legacy controller support (name-derived) |
| OkumaLegacyControllerEngine | controller-dialect | Okuma legacy controller support (name-derived) |
| SiemensLegacyControllerEngine | controller-dialect | Siemens legacy controller support (name-derived) |
| EDMPostProcessGCodeEngine | wedm-edm-post | WEDM-P2P MS15/16 post-plan + wire-EDM gcode gen (header-verified) |
| PPWireEDMPostEngine | wedm-edm-post | wire-EDM post (name-derived) |
| PPSinkerEDMPostEngine | wedm-edm-post | sinker-EDM post (name-derived) |
| EDMPostProcessorExtension | wedm-edm-post | EDM post-processor extension (name-derived) |
| WEDMPostFanucEngine | wedm-edm-post | WEDM Fanuc dialect post (stub-wired) (doctrine-verified) |
| WEDMPostSodickEngine | wedm-edm-post | WEDM Sodick dialect post (stub-wired) (doctrine-verified) |
| WEDMPostMakinoEngine | wedm-edm-post | WEDM Makino dialect post (stub-wired) (doctrine-verified) |
| WEDMPostMitsubishiEngine | wedm-edm-post | WEDM Mitsubishi dialect post (stub-wired) (doctrine-verified) |
| WEDMPostAgieEngine | wedm-edm-post | WEDM Agie-Charmilles dialect post (stub-wired) (doctrine-verified) |
| WEDMPostDialectRouterEngine | wedm-edm-post | WEDM post dialect router (name-derived) |
| WEDMPostTypes | wedm-edm-post | WEDM post shared types (name-derived) |
| WEDMControllerDialectVerifierEngine | wedm-edm-post | WEDM controller dialect verifier (name-derived) |
| MitsubishiMV1200RWireEDMMasterPostEngine | wedm-edm-post | Mitsubishi MV1200R wire-EDM master post (name-derived) |
| WEDMRLControllerEngine | wedm-edm-post/ai | WEDM RL controller (name-derived) |
| WEDMRLPolicyPersistence | wedm-edm-post/ai | WEDM RL policy persistence (name-derived) |
| LaserWaterjetPostExtension | wedm-edm-post | laser/waterjet post extension (name-derived) |
| FiveAxisPostEngine | wedm-edm-post | 5-axis post (RTCP/G68.2) (name-derived) |
| PostProcessorMachineKinematicsEngine | wedm-edm-post | post machine-kinematics (name-derived) |
| PostProcessorDeepIntelligenceEngine | ai-learning | widest coverage matrix (machines/tooling/30+ ctrl/ISO) (header-verified) |
| PostProcessorDeepLearningEngine | ai-learning | post deep-learning (name-derived) |
| PostProcessorDeepReasoningEngine | ai-learning | post deep-reasoning (name-derived) |
| PostProcessorUnifiedDeepReasoningEngine | ai-learning | unified post deep-reasoning (name-derived) |
| PostProcessorDeepCognitionEngine | ai-learning | post deep-cognition (name-derived) |
| PostProcessorNeuralNetworkEngine | ai-learning | post neural network (name-derived) |
| PostProcessorVideoKnowledgeNeuralEngine | ai-learning | video-knowledge neural post (name-derived) |
| PostProcessorTransformerEngine | ai-learning | post transformer / tokenizer (name-derived) |
| PostProcessorMetaLearningEngine | ai-learning | post meta-learning (name-derived) |
| RLPostProcessorEngine | ai-learning | RL post-processor (name-derived) |
| JMDiePostProcessorLearningEngine | ai-learning | JM Die post closed-loop learner (stub-wired) (doctrine-verified) |
| LathePostGeneratorActiveLearningEngine | ai-learning | lathe post active-learning (stub-wired) (doctrine-verified) |
| PostProcessorAGIContinuousLearningEngine | ai-learning | post AGI continuous learning (name-derived) |
| PostProcessorAICoordinationBridge | ai-learning | post AI coordination bridge (name-derived) |
| PostProcessorDeepAIHardeningEngine | ai-learning | post deep-AI hardening (name-derived) |
| PostProcessorUltimateAIEngine | ai-learning | post ultimate-AI (name-derived) |
| PostProcessorAISelfAwarenessIntegrationEngine | ai-learning | post AI self-awareness integration (name-derived) |
| PostProcessorCognitiveEngine | ai-learning | post cognitive engine (name-derived) |
| LathePostProcessorAIEngine | ai-learning | 21-controller lathe post AI (largest-dark) (header-verified) |
| PostProcessorTrainerEngine | ai-learning | post model trainer (name-derived) |
| PostProcessorKnowledgeEngine | knowledge | 314-page training-guide entry-function KB (header-verified) |
| PostProcessorComprehensiveKnowledgeEngine | knowledge | comprehensive post KB (name-derived) |
| PostProcessorHyperMillKnowledgeEngine | knowledge | hyperMILL post KB (name-derived) |
| PostProcessorKnowledgeGraphEngine | knowledge | post knowledge graph (name-derived) |
| LathePostKnowledgeGraphEngine | knowledge | lathe post knowledge graph (name-derived) |
| PostProcessorTribalKnowledgeIntegrationEngine | knowledge | tribal-tip integration into post (name-derived) |
| PostProcessorProductionPatternEngine | knowledge | production-pattern KB (name-derived) |
| CpsParserEngine | cps-parse | CPS post parser (name-derived) |
| CpsPostParserEngine | cps-parse | CPS post parser (variant) (name-derived) |
| FusionCPSParserEngine | cps-parse | Fusion CPS parser (name-derived) |
| PostProcessorCPSImplementationEngine | cps-parse | CPS implementation engine (name-derived) |
| PostLibraryEngine | library-selection | post library engine (name-derived) |
| PostLibraryCatalogEngine | library-selection | post library catalog (name-derived) |
| PostLibraryConfiguratorEngine | library-selection | per-customer post config product surface (doctrine-verified) |
| PostSelectionEngine | library-selection | post selection engine (name-derived) |
| PostDownloadEngine | library-selection | post download engine (name-derived) |
| PostVersioningEngine | library-selection | post versioning engine (name-derived) |
| MonolithControllerDatabaseEngine | library-selection | Monolith controller DB (name-derived) |
| MonolithFusionPostDatabaseEngine | library-selection | Monolith Fusion-post DB (name-derived) |
| FusionLathePostDeltaRegistryEngine | library-selection | Fusion lathe-post delta registry (name-derived) |
| FusionPostSyncEngine | cam-bridge | Fusion post sync (name-derived) |
| PostValidationSuiteEngine | validation | post validation suite (backplot G0-norm safety fix 2026-06-24) (doctrine-verified) |
| PostValidationHardeningEngine | validation | post validation hardening (name-derived) |
| PostValidationReportEngine | validation | post validation report (name-derived) |
| PostVerificationSafetyEngine | validation | post verification safety (name-derived) |
| PostEmitSafetyGateEngine | validation | post-emit safety gate (dormant slot/echo) (doctrine-verified) |
| PostFeatureAuditEngine | validation | post feature audit (dormant slot/echo) (doctrine-verified) |
| PostProcessorVerificationEngine | validation | post verification engine (name-derived) |
| PostProcessorVerificationOrchestratorEngine | validation | post verification orchestrator (name-derived) |
| PostProcessorCapabilityMatrixEngine | validation | post capability matrix (name-derived) |
| PostProcessorMatrixTestHarnessEngine | validation | post matrix test harness (name-derived) |
| LathePostRegressionTestGeneratorEngine | validation | lathe post regression-test generator (name-derived) |
| LathePostProcessorDialectValidatorEngine | validation | lathe post dialect validator (name-derived) |
| LathePostGeneratorValidatorWiringEngine | validation | lathe post generator validator wiring (name-derived) |
| LathePostGeneratorUncertaintyEngine | validation | lathe post generator uncertainty (name-derived) |
| LathePostGeneratorSpecIngestEngine | knowledge | lathe post spec ingest (name-derived) |
| LathePostGeneratorDialectEngine | controller-dialect | lathe post generator dialect (name-derived) |
| CAMPostInvokeOrchestratorEngine | cam-bridge | CAM->post invoke orchestrator (name-derived) |
| CAMPostSelectorUIEngine | cam-bridge | CAM post selector UI (name-derived) |
| CrossCAMPostEngine | cam-bridge | cross-CAM post transfer (dark-tier) (doctrine-verified) |
| MultiCAMPostEngine | cam-bridge | multi-CAM post (name-derived) |
| CrossProcessPostBridge | cam-bridge | cross-process post bridge (name-derived) |
| NovelPostProcessorBridgeEngine | cam-bridge | novel post-processor bridge (name-derived) |
| HybridPostMergeEngine | cam-bridge | hybrid post merge (name-derived) |
| PPGCodeLintEngine | ppg-product | PPG G-code lint (name-derived) |
| PPGCodeMinimizerEngine | ppg-product | PPG G-code minimizer (name-derived) |
| PPGCodeProgramAnalyzerEngine | ppg-product | PPG G-code program analyzer (name-derived) |
| PPGCodeStatisticsEngine | ppg-product | PPG G-code statistics (name-derived) |
| PPGDialectRankerEngine | ppg-product | PPG dialect ranker (name-derived) |
| PPGRAGDialectMatchEngine | ppg-product | PPG RAG dialect match (name-derived) |
| PPControllerAdaptationEngine | pp-adaptation | PP controller adaptation (name-derived) |
| PPControllerCompatibilityEngine | pp-adaptation | PP controller compatibility (name-derived) |
| PPControllerEmbeddingEngine | pp-adaptation | PP controller embedding (name-derived) |
| PPMachineSpecificPostEngine | pp-adaptation | PP machine-specific post (name-derived) |
| PPEndToEndPostGeneratorEngine | pp-adaptation | PP end-to-end post generator (name-derived) |
| PPOkumaSubSpindleSyncEngine | pp-adaptation | PP Okuma sub-spindle sync (name-derived) |
| PPOkumaTurningPostEngine | pp-adaptation | PP Okuma turning post (name-derived) |
| MotionControllerInjectionEngine | pp-adaptation | motion-controller injection (name-derived) |
| MachinePostCrossRefEngine | pp-adaptation | machine<->post cross-reference (name-derived) |
| PostProcessorAutopilotEngine | pipeline-core | post-processor autopilot (name-derived) |
| PostProcessorAnalysisEngine | validation | post analysis engine (name-derived) |
| PostProcessorAnalyzerEngine | validation | post analyzer engine (name-derived) |
| PostProcessorAPIEngine | pipeline-core | post-processor API surface (name-derived) |
| PostProcessorTelemetryEngine | validation | post telemetry engine (name-derived) |
| PostAMFinishingPlanEngine | pipeline-core | additive-mfg finishing plan (name-derived) |
| PostCompactRestorationEngine | pipeline-core | post compact restoration (name-derived) |

## Notes / uncertainty

- **Count = 188** flat engines matched by a doctrine-refined pattern. This is inflated relative to the
  POST-GEN-COVERAGE-AUDIT "124 engines" figure because the pattern includes the full `PPG*`/`PPController*`
  families, the lathe MasterPost stack, all `Okuma*`/`Haas*`/`Hurco*` parsers/miners, and the WEDM-RL pair.
  ~15 are header-verified; the remaining ~173 one-liners are **name-derived** (marked in the table) or
  doctrine-derived from PATHS.md/CLAUDE.md/MEMORY.md -- not each independently header-read (R12).
- **Boundary calls:** `WEDMRLControllerEngine`/`WEDMRLPolicyPersistence`/`WEDMControllerDialectVerifierEngine`
  kept in (echo shares the WEDM-post dialect surface with mike per CLAUDE.md sec9). Excluded as cross-galaxy:
  `PIDControllerEngine`, `RadialEngagementControllerEngine`, `RealTimeAdaptiveControllerEngine` (control-theory),
  `AutoPostmortemEngine`/`BlamelessPostMortemEngine` (ops), `MCPServerRegistryEngine`/`GapEscalationControllerEngine`/
  `HookControllerEngine` (infra/orchestration), `PostPropertyTaxonomyEngine` (property-taxonomy, not post-gen).
  `SoftJawBoringGCodeEngine` + `GCodeMaterialParserEngine` were kept (genuine G-code domain).
- **Stub-wired / dark caveat (doctrine):** MEMORY.md's 2026-06-11 bravo re-audit found TRUE-DARK non-collision
  post engines = 0 once `prism_pp` (ppDispatcher, ~654 actions) is included; the "8 stub-wired / 14 AGI-dark"
  framing is largely a cam-only-grep artifact. Genuine remaining gaps are collision-locked (WEDMPost*/HurcoV11*),
  legal-gated (MS-MASTERPOST / U-LEGAL-13), or cross-domain soul-refuse -- NOT simple orphan wires.

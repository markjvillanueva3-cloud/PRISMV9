---
name: mill-engines
description: Strategic categorized engine digest for the PRISM mill galaxy (milling operations)
type: reference
galaxy: mill
node_type: memory
---

# mill galaxy -- engine digest

## Overview

The mill galaxy (slot:foxtrot, "Milling Wizard") owns face/end/pocket/contour milling, helical/trochoidal/high-feed strategies, thread milling, chamfering, drilling-via-mill, and 3-axis + indexed 4th/5th + simultaneous 5-axis work. Its production surface is `prism_mill` (49 actions via `millDispatcher.ts`, ~218K) with the print-to-program pipeline (`mill_print_to_program`), strategy selection, physics gates, collision/kinematics checks, and S(x) >= 0.98 safety validation. Per the galaxy MEMORY.md, backend wiring is 198/204 mill engines dispatcher-wired (~97%) via 308 dynamic `await import` lazy-loaders in the dispatcher.

Enumeration note (grounded, R12): the `mcp-server/src/engines/mill/` subdir itself contains only ONE `.ts` engine -- `MillPrintToProgramEngine.ts` -- plus the galaxy doctrine markdown (CLAUDE.md, MEMORY.md, PATHS.md, SOUL.md, TOOLBELT.md, AWARENESS.md). The mill CLAUDE.md and PATHS.md both confirm the ~222 real mill engines live FLAT in the parent `mcp-server/src/engines/` directory (not yet migrated into the `mill/` subdir), with a HyperMILL sub-galaxy of 17 dedicated engines at `mcp-server/src/engines/hypermill/`. This digest indexes the flat `Mill*` / `*Milling*` / op-specific engine set: **123 unique non-test engine files** matched by the mill naming heuristic (`ls Mill*.ts *Milling*.ts Trochoidal*.ts Chamfer*.ts Helical*.ts HighFeed*.ts BallEnd*.ts FaceMill*.ts ThreadMill*.ts` in `mcp-server/src/engines/`, deduped). The galaxy's own PATHS.md quotes a broader ~222 figure (includes HyperMILL flat + machine/tool/pipeline engines that do not carry the `Mill` prefix); this file indexes the name-attributed 123.

## Strategic categories

The 123 name-attributed mill engines fall into 8 logical sub-domains. Counts are of files whose names/headers place them in each group.

### 1. Physics core (force / thermal / deflection / MRR)
Canonical cutting-physics engines -- all import from `physics/constants.ts` (never inline Kienzle/Taylor).
- `MillingForceEngine.ts` -- canonical mill physics (5 dispatcher actions)
- `MillingPhysicsKernelEngine.ts` -- single-point-of-entry physics FACADE (delegates, no formulas)
- `MillingUnifiedScienceOrchestrationEngine.ts` -- 7-domain scientific integration

### 2. Toolpath strategy + operation-specific physics
Strategy selection, generation, and per-operation cutting models.
- `AdvancedMillingStrategiesEngine.ts` -- 5 toolpath algorithms (flowline/geodesic/scallop/swarf/thread)
- `MillingStrategyLibraryEngine.ts` -- 35+ strategy library + AI selection
- `MillStrategyNeuralEngine.ts` -- neural strategy recommendation (64->128->64 NN)
- `MillingHybridStrategySynthesizer.ts` -- hybrid strategy synthesis
- `MillingProgramPatternEngine.ts` -- program pattern extraction
- Op-specific: `TrochoidalMillingEngine.ts` `HighFeedMillingEngine.ts` `HelicalMillingEngine.ts` `HelicalInterpolationEngine.ts` `ChamferMillingEngine.ts` `ChamferEngine.ts` `BallEndMillEngine.ts` `PlungeMillingEngine.ts` `SplineMillingEngine.ts` `ThreadMillingEngine.ts` `ThreadMillingPhysicsEngine.ts` `MicroMillingEngine.ts` `MicroMillingSizeEffectEngine.ts` `HelicalSpringEngine.ts`

### 3. Print-to-program pipeline + kinematics/collision
The CAD-to-G-code core plus machine-motion safety.
- `MillPrintToProgramEngine.ts` (in `mill/` subdir) and `MillingPrintToProgramEngine.ts` (flat, route-wired) -- pipeline generators
- `MillKinematicsCollisionEngine.ts` -- 3/4/5-axis kinematics + collision + singularity detection
- `MillingEndToEndOrchestrationEngine.ts` -- print-to-program orchestration
- `MillScientificPipelineEngine.ts` `MillPipelineKnowledgeInjectorEngine.ts` `MillPrismaticAdapterEngine.ts`

### 4. AI / AGI orchestration + reasoning
Deep-reasoning, AGI-level orchestrators, critical-thinking gates.
- `MillingAIUltraIntelligenceEngine.ts` -- absolute-max AI hardening (2D..full-5axis)
- `MillingUltimateAIEngine.ts` -- 8-layer intelligence integration
- `MillingDeepAIHardeningEngine.ts` -- cross-engine hardening over 77 mill engines
- `MillingAGIMasterEngine.ts` `MillingAGIOrchestrationEngine.ts` -- AGI reasoning (8 modes)
- `MillingKnowledgeOrchestratorEngine.ts` `MillingAILearningOrchestratorEngine.ts` `MillingInferenceOrchestratorEngine.ts` `MillingReasoningDefaultEngine.ts` `MillingDeepReasoningEngine.ts` `MillingCriticalThinkingEngine.ts` `MillingAIUnificationEngine.ts` `MillingAIIntegrationEngine.ts` `MillingDeepIntegrationEngine.ts` `MillingDeepKnowledgeSynthesisEngine.ts` `MillMasterOrchestratorFacadeEngine.ts` `MillExpertAdvisorEngine.ts` `MillingHeadIntelligenceEngine.ts` `MillingMachineIntelligenceEngine.ts` `MillAISelfAwarenessIntegrationEngine.ts`

### 5. Neural / LoRA / learning substrate (PSN leg #10)
GNN/NN, LoRA training/deployment, meta/online/reinforcement learning.
- Neural: `MillNeuralNetworkEngine.ts` `MillComprehensiveNeuralEngine.ts` `MillingNeuralCognitiveEngine.ts` `MillDeepLearningEngine.ts`
- Learning loops: `MillingMetaLearningEngine.ts` `MillingReinforcementLearningEngine.ts` `MillingOnlineLearningTrackerEngine.ts` `MillAGIContinuousLearningEngine.ts` `MillProgramLearningEngine.ts` `MillingReasoningTraceLedgerEngine.ts`
- LoRA family (17): `MillLoRACadenceEngine.ts` `MillingLoRACadenceEngine.ts` `MillLoRADeploymentEngine.ts` `MillLoRAEmbeddingCacheEngine.ts` `MillLoRAEnsembleCombinerEngine.ts` `MillLoRAEnsembleOrchestratorEngine.ts` `MillLoRAExperimentTrackerEngine.ts` `MillLoRAMasterOrchestratorEngine.ts` `MillLoRAModelSelectorEngine.ts` `MillLoRAMonitoringEngine.ts` `MillLoRAPipelineCoordinatorEngine.ts` `MillLoRAResourceManagerEngine.ts` `MillLoRATribalAugmentationEngine.ts` `MillLoRATribalExtractorEngine.ts` `MillingLoRADatasetBuilderEngine.ts` `MillTurnLoRACadenceEngine.ts` `MillTurnLoRADatasetBuilderEngine.ts`

### 6. Knowledge harvest + tribal + program corpus
Mining JM Die's 24K+ programs for tribal patterns, families, and program analysis.
- `MillingProductionKnowledgeHarvesterEngine.ts` -- 25-yr tribal wisdom harvester
- `MillProgramOptimizerEngine.ts` -- optimize every JM Die mill program
- Corpus/analysis: `MillProgramCorpusEngine.ts` `MillProgramAnalyzerEngine.ts` `MillProgramBacktraceEngine.ts` `MillProgramReplicationEngine.ts` `MillPatternMinerEngine.ts` `MillPartFamilyMatcherEngine.ts` `MillPartFamilyTemplateExtractorEngine.ts` `MillPartClassifierEngine.ts`
- Tribal: `MillTribalKnowledgeEngine.ts` `MillTribalInjectorEngine.ts` `MillTribalIntegrationEngine.ts`

### 7. Validation / safety / quality / on-machine
Safety predicates, S(x) containment, metrology/probe, deviation, first-piece.
- `MillSafetyPredicateEngine.ts` `MillAGISafetyContainmentEngine.ts` `MillEnvelopeBreachReplayEngine.ts`
- `MillOnMachineProbeCycleEngine.ts` `MillCoaxialityRunoutValidatorEngine.ts` `MillDatumReferenceFrameEngine.ts` `MillDeviationMapEngine.ts`
- `MillFirstPieceApprovalEngine.ts` `MillProgramSignoffDossierEngine.ts` `MillAnomalyDetectionEngine.ts`
- `MillReplayFrameCompilerEngine.ts` `MillBlockEngagementSimulatorEngine.ts`

### 8. Shop-floor / cost / lifecycle + mill-turn bridge
Cost/profitability, changeover/timing, inventory, adaptive monitoring, mill-turn.
- Cost/business: `MillPartCostModelEngine.ts` `MillActualCostReconciliationEngine.ts` `MillJobProfitabilityAnalyticsEngine.ts` `MillCustomerOrderLifecycleEngine.ts` `MillInventoryIntelligenceEngine.ts`
- Timing/shop-floor: `MillBlockTimeProfilerEngine.ts` `MillOpTimeBreakdownEngine.ts` `MillAuxAxisTimingEngine.ts` `MillChangeoverBriefEngine.ts` `MillStockEvolutionEngine.ts` `MillActualFeedbackTuningEngine.ts` `MillResourceAwarenessEngine.ts`
- Adaptive/process: `AdaptiveMillingChipLoadMonitorEngine.ts` `MillChipEvacuationPredictorEngine.ts` `MillCoolantAdvisorEngine.ts` `MillCSSOptimizerEngine.ts` `MillViseJawSetupEngine.ts`
- Digital twin: `MillingDigitalTwinEngine.ts`
- Mill-turn bridge (also touches lathe/whiskey): `MillTurnSwissPipelineEngine.ts` `MillTurnCAMEngine.ts` `MillTurnOrchestrationEngine.ts`
- CAM-vendor index: `NXCAMMillingFunctionIndexEngine.ts`

## Key engines (detailed)

### MillingAIUltraIntelligenceEngine.ts
Absolute-maximum AI hardening across all milling categories (2D face/contour/pocket, 2.5D, 3D surface/rest, 3+2 indexed, full 5-axis delegated to `FiveAxisAIUltraIntelligenceEngine`). Exposes 8 AI capabilities: NL-to-pipeline, predictive tool life, deep-learning toolpath scorer, explainable AI, reinforcement learning, LLM troubleshooting, strategy intelligence, adaptive parameter optimization. Largest mill engine (~99K).
- file: `mcp-server/src/engines/MillingAIUltraIntelligenceEngine.ts`
- notable: imports `NLIntent`, `ToolLifePrediction`, `ToolpathQualityScore`, `ExplainableAIResponse` types from `FiveAxisAIUltraIntelligenceEngine`.

### MillingPrintToProgramEngine.ts
Flat print-to-program pipeline generating complete CNC milling G-code from blueprint feature descriptions (pockets/slots/holes/contours/faces/2.5D/3D freeform/indexed-5axis) for the JM Die fleet (Haas VF-2, Hurco VM10i/VMX30i, Roku-Roku HSM-5, Okuma MU-4000V). Physics inlined-by-reference (Kienzle with chip-thinning, Taylor, deflection, Ra, MRR) but all numeric constants import from `physics/constants.ts`. Marked `// WIRE-EXEMPT` -- consumed by the `routes/milling.ts` HTTP wizard-submit handler, not an MCP action; companion test is kebab-named `MILLING-PRINT-TO-PROGRAM.test.ts`.
- file: `mcp-server/src/engines/MillingPrintToProgramEngine.ts`
- notable: imports `CANONICAL_KIENZLE`, `CANONICAL_TAYLOR`, `CANONICAL_MILLING_SPEEDS/FEEDS`, `kienzleForce` from constants.

### MillingDeepAIHardeningEngine.ts
Cross-engine AI hardening layer unifying ALL 77 milling engines. Composes `MillingAIUltraIntelligenceEngine`, `MillingMachineIntelligenceEngine`, `MillingAIIntegrationEngine`, `HyperMillDeepLearningEngine`, `ManufacturerCatalogAIEngine`, `CNCControllerDeepLearningEngine`, `AdvancedMillingStrategiesEngine`, `TrochoidalMillingEngine`, `HighFeedMillingEngine`. Pulls resource knowledge from hyperMILL manuals + WinMax PDFs, grounded on the JM Die machine list.
- file: `mcp-server/src/engines/MillingDeepAIHardeningEngine.ts`
- notable: type-level coupling only to integrated engines (imports types, not runtime singletons).

### MillingPhysicsKernelEngine.ts
FACADE engine -- the single point of entry for milling physics in PRISM. Implements NO formulas; delegates to canonical sources: `constants.ts` (kienzleForce/taylorLife/extendedTaylorLife/toolDeflection/predictedRa), `ChipFormationPredictionEngine` (Merchant), `LoewenShawHeatPartitionEngine` (1954 temp model), `AdvancedCuttingMathEngine` (helix decomposition), plus a Phase-1 wiring of 5 force engines (Kienzle/CuttingForce/Stochastic/PowerBudget).
- file: `mcp-server/src/engines/MillingPhysicsKernelEngine.ts`
- notable: all mill intelligence engines should import physics from here, not from individual physics engines.

### MillTurnSwissPipelineEngine.ts
Comprehensive mill-turn / Swiss-type CNC pipeline (multi-tasking turning centers): live-tooling ops, sub-spindle transfer + sync, multi-channel Gantt/collision-zone programming, bar-feeder integration, Swiss guide-bushing deflection. Physics: effective Vc for live tools, grip-force > cut-force gates, bushing-overhang deflection, multi-channel critical-path timing.
- file: `mcp-server/src/engines/MillTurnSwissPipelineEngine.ts`
- notable: imports `machineEnvelopeGuardEngine`, `workholdingVerificationEngine`, `smartToolSelectorEngine`; references Altintas 2012, Citizen/Star, DMG MORI NTX/NLX.

### MillingStrategyLibraryEngine.ts
Comprehensive milling strategy library mapping 35+ strategies across 2D/3D/HSM/5-axis categories with feature-to-strategy mapping, material-suitability scoring (per ISO group P/M/K/N/S/H with speed/feed factors), and selection AI (when adaptive vs trochoidal). Integrates with `StrategyTaxonomyEngine` for cross-CAM normalization.
- file: `mcp-server/src/engines/MillingStrategyLibraryEngine.ts`
- notable: exports `MillingStrategyCategory` union + `MaterialSuitability` interface.

### MillingMachineIntelligenceEngine.ts
Deep machine/controller intelligence over 232+ machines and all major controllers (Heidenhain/Haas/Fanuc/Siemens/Okuma/Mazak). Knowledge sourced from the JM Die folder (24,114 programs), the Resources folder, PDF/video learning, and external references (Sandvik/Kennametal/Machinery's Handbook). Provides an LLM-CLI style Q&A surface for controller-specific G-code/macros.
- file: `mcp-server/src/engines/MillingMachineIntelligenceEngine.ts`
- notable: exports `MachineType` + `MachineManufacturer` unions; imports `JM_DIE_COMPANY`, `JM_DIE_SOURCE_ROOTS`.

### MillingUltimateAIEngine.ts
Maximum-intelligence milling AI integrating all PRISM intelligence layers (8): `DeepAIIntelligenceEngine` (8 reasoning modes), `CrossDisciplinaryDeepLearningEngine` (15 domains), `PRISMCreativeReasoningEngine` (6 creative modes), `MillNeuralNetworkEngine`, `MillComprehensiveNeuralEngine` (256-dim encoding), `TribalKnowledgeEngine`, `MachiningPlaybookEngine`, `ProactiveAIIntelligenceEngine`. Focus is variability maximization: explores all approaches, hybrid synthesis, Pareto/counterfactual analysis.
- file: `mcp-server/src/engines/MillingUltimateAIEngine.ts`
- notable: milestone MILL-ULTIMATE-AI-MS1; knowledge sources cite 77+ mill engines, 483+ JM programs, 499 formulas.

### ThreadMillingPhysicsEngine.ts
First-principles thread milling physics: single-point, multi-tooth, and helical-interpolation thread milling. Models helical-path kinematics, cutting forces with chip-thinning compensation, deflection-induced pitch-diameter error, thread-quality prediction, multi-pass optimization, cycle time, and tool selection. Self-contained (no external deps), deterministic PRNG for Monte Carlo.
- file: `mcp-server/src/engines/ThreadMillingPhysicsEngine.ts`
- notable: cites ISO 68-1:1998, ASME B1.1-2019, Araujo/Fromentin thread-milling papers, Kienzle 1952.

### MillingAIIntegrationEngine.ts
MILL-AI-MS2 -- binds `MillingAIUltraIntelligenceEngine` to JM Die's real shop data (7,091 Mastercam .mcx-8 files, 17,023 NC programs, 100+ customer folders, 21 machines). Documents JM Die's cold-heading-tooling reality: most programs are LATHE; milling is graphite electrodes (Roku-Roku) + die cases/bodies (Haas).
- file: `mcp-server/src/engines/MillingAIIntegrationEngine.ts`
- notable: real-archive integration layer -- ground-truth data binding, not physics.

### MillingAGIOrchestrationEngine.ts
Master AGI-level orchestration unifying 20+ milling AI engines with physics/chemistry/metallurgy/thermodynamics/tribology synergy. Integrates `MillingUnifiedScienceOrchestrationEngine`, `MillingProductionKnowledgeHarvesterEngine`, `MillingAGIMasterEngine`, `MillingEndToEndOrchestrationEngine`, `MillingMetaLearningEngine`, `MillingDeepKnowledgeSynthesisEngine`, `MillingNeuralCognitiveEngine`.
- file: `mcp-server/src/engines/MillingAGIOrchestrationEngine.ts`
- notable: top-of-stack orchestrator for the "near-AGI" mill reasoning tier.

### MillingProductionKnowledgeHarvesterEngine.ts
AGI-level production-knowledge harvester extracting tribal wisdom from JM Die's 25+ years of milling programs (speeds/feeds, tooling choices, strategies) via PhD-level pattern recognition. Reads real program files (`fs`/`path`) and builds `MaterialPattern` structures.
- file: `mcp-server/src/engines/MillingProductionKnowledgeHarvesterEngine.ts`
- notable: one of the few mill engines doing real filesystem I/O (program harvesting).

### MillingUnifiedScienceOrchestrationEngine.ts
PhD-level orchestration of all scientific disciplines for milling: mechanics/physics (Kienzle, Taylor, Merchant shear plane, chip compression, specific cutting energy, deflection) plus chemistry/metallurgy/thermodynamics/tribology. Marked `// WIRE-EXEMPT` -- an internal cross-domain orchestrator composed by 7 mill engines + the milling.ts route.
- file: `mcp-server/src/engines/MillingUnifiedScienceOrchestrationEngine.ts`
- notable: WIRE-EXEMPT with an explicit wrapper list (no direct dispatcher action).

### MillingForceEngine.ts
Canonical mill-domain physics: Kienzle cutting force, cantilever deflection, stability-lobe chatter prediction, spindle-power verification, quick speed/feed lookup. A STUB-RESCUE (slot:bravo, U-STUB-HUNT-03) that replaced a placeholder returning `{ok:false, stub:true}`; the dispatcher routes 5 actions here (`calculate`, `checkDeflection`, `predictChatter`, `verifyPower`, `quickSpeedFeed`).
- file: `mcp-server/src/engines/MillingForceEngine.ts`
- notable: the wired physics entry the mill CLAUDE.md cites for `mill_physics_force`.

### MillKinematicsCollisionEngine.ts
Machine kinematics + collision avoidance: 3/4/5-axis configurations, forward/inverse kinematics, collision detection (tool/holder/fixture/workpiece), safety-zone computation, jerk-limited S-curve motion profiles, and 5-axis singularity detection (the A=0 RTCP-divide-by-zero guard the CLAUDE.md warns about).
- file: `mcp-server/src/engines/MillKinematicsCollisionEngine.ts`
- notable: backs `mill_collision_check` + `mill_kinematics_verify`.

## Full engine index

| Engine | Category | One-line |
|--------|----------|----------|
| AdaptiveMillingChipLoadMonitorEngine.ts | Shop-floor/adaptive | Adaptive chip-load monitor (CLAUDE.md-cited) |
| AdvancedMillingStrategiesEngine.ts | Toolpath strategy | 5 toolpath algos (flowline/geodesic/scallop/swarf/thread) |
| BallEndMillEngine.ts | Op-specific | Ball-end geometry + scallop |
| ChamferEngine.ts | Op-specific | Chamfer geometry |
| ChamferMillingEngine.ts | Op-specific | Chamfer milling physics |
| HelicalInterpolationEngine.ts | Op-specific | Helical interpolation kinematics |
| HelicalMillingEngine.ts | Op-specific | Helical milling physics |
| HelicalSpringEngine.ts | Op-specific | Helical spring geometry |
| HighFeedMillingEngine.ts | Op-specific | HFM chip-thinning physics |
| MicroMillingEngine.ts | Op-specific | Micro-milling operations |
| MicroMillingSizeEffectEngine.ts | Op-specific | Micro-milling size-effect physics |
| MillActualCostReconciliationEngine.ts | Cost/lifecycle | Actual-vs-quoted mill cost reconciliation |
| MillActualFeedbackTuningEngine.ts | Shop-floor/adaptive | Actual-feedback parameter tuning |
| MillAGIContinuousLearningEngine.ts | Learning | AGI continuous-learning loop |
| MillAGISafetyContainmentEngine.ts | Validation/safety | AGI safety containment gate |
| MillAISelfAwarenessIntegrationEngine.ts | AI/AGI orch | Self-awareness integration |
| MillAnomalyDetectionEngine.ts | Validation/safety | Anomaly detection |
| MillAuxAxisTimingEngine.ts | Shop-floor/timing | Auxiliary-axis timing |
| MillBlockEngagementSimulatorEngine.ts | Validation | Per-block engagement simulation |
| MillBlockTimeProfilerEngine.ts | Shop-floor/timing | Per-block cycle-time profiler (CLAUDE.md-cited) |
| MillChangeoverBriefEngine.ts | Shop-floor | Changeover brief generation |
| MillChipEvacuationPredictorEngine.ts | Shop-floor/adaptive | Chip-evacuation prediction |
| MillCoaxialityRunoutValidatorEngine.ts | Validation/quality | Coaxiality + runout validation |
| MillComprehensiveNeuralEngine.ts | Neural/learning | 256-dim neural feature encoding |
| MillCoolantAdvisorEngine.ts | Shop-floor/adaptive | Coolant strategy advisor |
| MillCSSOptimizerEngine.ts | Shop-floor/adaptive | Constant-surface-speed optimizer |
| MillCustomerOrderLifecycleEngine.ts | Cost/lifecycle | Customer order lifecycle |
| MillDatumReferenceFrameEngine.ts | Validation/on-machine | Datum reference-frame setup |
| MillDeepLearningEngine.ts | Neural/learning | Deep AI training on JM Die programs (PROVEN PRG) |
| MillDeviationMapEngine.ts | Validation/quality | Machined-deviation mapping |
| MillEnvelopeBreachReplayEngine.ts | Validation/safety | Envelope-breach replay |
| MillExpertAdvisorEngine.ts | AI/AGI orch | Expert advisor surface |
| MillFirstPieceApprovalEngine.ts | Validation/quality | First-piece approval gate |
| MillingAGIMasterEngine.ts | AI/AGI orch | Mill AGI reasoning (8 modes) |
| MillingAGIOrchestrationEngine.ts | AI/AGI orch | Master AGI orchestration (20+ engines) |
| MillingAIIntegrationEngine.ts | Knowledge harvest | JM Die 7,091-Mastercam archive binding |
| MillingAILearningOrchestratorEngine.ts | AI/AGI orch | AI learning orchestration |
| MillingAIUltraIntelligenceEngine.ts | AI/AGI orch | Absolute-max AI hardening (2D..5axis), 8 capabilities |
| MillingAIUnificationEngine.ts | AI/AGI orch | AI unification layer |
| MillingCriticalThinkingEngine.ts | AI/AGI orch | Critical-thinking validation gates |
| MillingDeepAIHardeningEngine.ts | AI/AGI orch | Cross-engine hardening over 77 mill engines |
| MillingDeepIntegrationEngine.ts | AI/AGI orch | Deep engine integration |
| MillingDeepKnowledgeSynthesisEngine.ts | Knowledge harvest | 12-source deep knowledge synthesis |
| MillingDeepReasoningEngine.ts | AI/AGI orch | Deep reasoning surface |
| MillingDigitalTwinEngine.ts | Shop-floor | Milling digital twin |
| MillingEndToEndOrchestrationEngine.ts | Print-to-program | End-to-end print-to-program orchestration |
| MillingForceEngine.ts | Physics core | Canonical mill physics (5 actions; STUB-RESCUE) |
| MillingHeadIntelligenceEngine.ts | AI/AGI orch | Milling-head intelligence |
| MillingHybridStrategySynthesizer.ts | Toolpath strategy | Hybrid strategy synthesis |
| MillingInferenceOrchestratorEngine.ts | AI/AGI orch | Inference orchestration |
| MillingKnowledgeOrchestratorEngine.ts | AI/AGI orch | Unified knowledge orchestration (Opus-level) |
| MillingLoRACadenceEngine.ts | Neural/LoRA | LoRA training cadence |
| MillingLoRADatasetBuilderEngine.ts | Neural/LoRA | LoRA dataset builder |
| MillingMachineIntelligenceEngine.ts | AI/AGI orch | 232+ machine/controller intelligence |
| MillingMetaLearningEngine.ts | Neural/learning | Meta-learning loop |
| MillingNeuralCognitiveEngine.ts | Neural/learning | Neural cognitive reasoning |
| MillingOnlineLearningTrackerEngine.ts | Neural/learning | Online-learning tracker |
| MillingPhysicsKernelEngine.ts | Physics core | Physics FACADE (single entry, delegates) |
| MillingPrintToProgramEngine.ts | Print-to-program | Flat P2P pipeline (route-wired, WIRE-EXEMPT) |
| MillingProductionKnowledgeHarvesterEngine.ts | Knowledge harvest | 25-yr tribal harvester (real fs I/O) |
| MillingProgramPatternEngine.ts | Toolpath strategy | Program pattern extraction |
| MillingReasoningDefaultEngine.ts | AI/AGI orch | Reasoning default middleware (WIRE-EXEMPT per MEMORY) |
| MillingReasoningTraceLedgerEngine.ts | Learning | Reasoning-trace ledger |
| MillingReinforcementLearningEngine.ts | Neural/learning | Reinforcement learning |
| MillingStrategyLibraryEngine.ts | Toolpath strategy | 35+ strategy library + AI selection |
| MillingUltimateAIEngine.ts | AI/AGI orch | 8-layer maximum-intelligence integration |
| MillingUnifiedScienceOrchestrationEngine.ts | Physics core | 7-domain science orchestration (WIRE-EXEMPT) |
| MillInventoryIntelligenceEngine.ts | Cost/lifecycle | Inventory intelligence |
| MillJobProfitabilityAnalyticsEngine.ts | Cost/lifecycle | Job profitability analytics |
| MillKinematicsCollisionEngine.ts | Kinematics/collision | 3/4/5-axis kinematics + collision + singularity |
| MillLoRACadenceEngine.ts | Neural/LoRA | LoRA cadence |
| MillLoRADeploymentEngine.ts | Neural/LoRA | LoRA deployment |
| MillLoRAEmbeddingCacheEngine.ts | Neural/LoRA | LoRA embedding cache |
| MillLoRAEnsembleCombinerEngine.ts | Neural/LoRA | LoRA ensemble combiner |
| MillLoRAEnsembleOrchestratorEngine.ts | Neural/LoRA | LoRA ensemble orchestrator |
| MillLoRAExperimentTrackerEngine.ts | Neural/LoRA | LoRA experiment tracker |
| MillLoRAMasterOrchestratorEngine.ts | Neural/LoRA | LoRA master orchestrator |
| MillLoRAModelSelectorEngine.ts | Neural/LoRA | LoRA model selector |
| MillLoRAMonitoringEngine.ts | Neural/LoRA | LoRA monitoring |
| MillLoRAPipelineCoordinatorEngine.ts | Neural/LoRA | LoRA pipeline coordinator |
| MillLoRAResourceManagerEngine.ts | Neural/LoRA | LoRA resource manager |
| MillLoRATribalAugmentationEngine.ts | Neural/LoRA | LoRA tribal augmentation |
| MillLoRATribalExtractorEngine.ts | Neural/LoRA | LoRA tribal extractor |
| MillMasterOrchestratorFacadeEngine.ts | AI/AGI orch | Master orchestrator facade (routes to AGI) |
| MillNeuralNetworkEngine.ts | Neural/learning | Neural network parameter prediction |
| MillOnMachineProbeCycleEngine.ts | Validation/on-machine | On-machine probe cycle |
| MillOpTimeBreakdownEngine.ts | Shop-floor/timing | Operation time breakdown |
| MillPartClassifierEngine.ts | Knowledge harvest | Feature/part classification |
| MillPartCostModelEngine.ts | Cost/lifecycle | Part cost model |
| MillPartFamilyMatcherEngine.ts | Knowledge harvest | Part-family matching |
| MillPartFamilyTemplateExtractorEngine.ts | Knowledge harvest | Part-family template extraction |
| MillPatternMinerEngine.ts | Knowledge harvest | Program pattern mining |
| MillPipelineKnowledgeInjectorEngine.ts | Print-to-program | Pipeline knowledge injection |
| MillPrintToProgramEngine.ts | Print-to-program | P2P pipeline (in mill/ subdir; 35-stage) |
| MillPrismaticAdapterEngine.ts | Print-to-program | Prismatic feature adapter |
| MillProgramAnalyzerEngine.ts | Knowledge harvest | Program analysis |
| MillProgramBacktraceEngine.ts | Knowledge harvest | Program backtrace |
| MillProgramCorpusEngine.ts | Knowledge harvest | Program corpus management |
| MillProgramLearningEngine.ts | Learning | Program-learning loop |
| MillProgramOptimizerEngine.ts | Knowledge harvest | Optimize every JM Die mill program |
| MillProgramReplicationEngine.ts | Knowledge harvest | Program replication |
| MillProgramSignoffDossierEngine.ts | Validation/quality | Program sign-off dossier |
| MillReplayFrameCompilerEngine.ts | Validation | Replay-frame compiler |
| MillResourceAwarenessEngine.ts | Shop-floor | Resource awareness |
| MillSafetyPredicateEngine.ts | Validation/safety | Safety-predicate gate |
| MillScientificPipelineEngine.ts | Print-to-program | Scientific pipeline |
| MillStockEvolutionEngine.ts | Shop-floor | Stock-evolution tracking |
| MillStrategyNeuralEngine.ts | Toolpath strategy | Neural strategy selection (64->128->64 NN) |
| MillTribalInjectorEngine.ts | Knowledge harvest | Tribal-tip injection |
| MillTribalIntegrationEngine.ts | Knowledge harvest | Tribal integration |
| MillTribalKnowledgeEngine.ts | Knowledge harvest | Mill tribal-knowledge store |
| MillTurnCAMEngine.ts | Mill-turn bridge | Mill-turn CAM |
| MillTurnLoRACadenceEngine.ts | Neural/LoRA | Mill-turn LoRA cadence |
| MillTurnLoRADatasetBuilderEngine.ts | Neural/LoRA | Mill-turn LoRA dataset builder |
| MillTurnOrchestrationEngine.ts | Mill-turn bridge | Mill-turn orchestration |
| MillTurnSwissPipelineEngine.ts | Mill-turn bridge | Mill-turn + Swiss-type pipeline |
| MillViseJawSetupEngine.ts | Shop-floor | Vise-jaw setup |
| NXCAMMillingFunctionIndexEngine.ts | CAM-vendor index | NX CAM milling function index |
| PlungeMillingEngine.ts | Op-specific | Plunge milling |
| SplineMillingEngine.ts | Op-specific | Spline milling |
| ThreadMillingEngine.ts | Op-specific | Thread milling operations |
| ThreadMillingPhysicsEngine.ts | Op-specific | First-principles thread-milling physics |
| TrochoidalMillingEngine.ts | Op-specific | Trochoidal/dynamic milling (entry-angle validation) |

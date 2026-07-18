---
name: lathe-engines
description: Strategic categorized engine digest for the PRISM lathe (turning) galaxy -- 247 engines, physics-safety core through LoRA/AI orchestration.
type: reference
galaxy: lathe
node_type: memory
---

# lathe galaxy -- engine digest

## Overview

The lathe galaxy is PRISM's turning-machining domain: OD turning, ID boring, facing, threading (single-point + tap), parting/grooving, drilling on-axis, knurling, taper/contour turning, and mill-turn hybrid ops (live tooling + sub-spindle + bar feeder + Swiss guide bushing). Per `mcp-server/src/engines/lathe/CLAUDE.md`, the `Lathe*` / `Turning*` / `Thread*` engines are flat under `mcp-server/src/engines/` (NOT inside the `lathe/` subdir -- that subdir holds only doctrine files: CLAUDE.md, MEMORY.md, SOUL.md, PATHS.md, TOOLBELT.md, AWARENESS.md). This digest enumerates **247** lathe-domain engine files (`Lathe*`, `Turning*`, `Thread*`, plus workholding / boring-bar / Okuma-dialect / mill-turn-bridge engines).

The primary dispatcher is `turningDispatcher.ts` (373 actions per CLAUDE.md), with sub-dispatchers `turningProgramDispatcher.ts`, `threadDispatcher.ts`, and `threadingPipelineDispatcher.ts`. Slot: **whiskey** (operator-codified lathe-specialist). The galaxy is safety-critical (chuck-jaw ejection, CSS RPM overrun, boring-bar deflection, sub-spindle handoff) and, per MEMORY.md, hosts a very large AI substrate -- the five huge Lathe-AI engines (Orchestration ~77K, Attention ~88K, ActiveLearning ~76K, Bayesian ~64K, Anomaly) are LoRA-class learners, and 49 further `Lathe*LoRA*` engines form a full LoRA training/deployment pipeline.

## Strategic categories

Grouped from the CLAUDE.md sub-domain map, MEMORY.md cross-galaxy notes, and the file headers read this session. Counts are approximate groupings of the 247 files.

### 1. Physics / cutting-mechanics core
Kienzle/Taylor/Merchant/Oxley turning force, chip, thermal, metallurgy, chemistry.
- `TurningForceEngine.ts` -- single-point turning force, power and torque
- `LatheUnifiedPhysicsOrchestrationEngine.ts` -- unified physics/chem/metallurgy/thermo (~95K)
- `LatheThermodynamicsEngine.ts` -- turning thermal phenomena (~98K)
- `LatheChipMechanicsEngine.ts` -- chip formation physics
- `LatheMetallurgyEngine.ts` -- metallurgical phenomena
- `LatheCuttingChemistryEngine.ts` -- coolant/oxidation/diffusion chemistry
- `TurningInsertLifeEngine.ts` -- material-specific insert-life prediction
- `TurningWearPredictionEngine.ts` / `TurningToolpathWearEngine.ts`
- `LatheCSSOptimizerEngine.ts` / `CSSChipLoadInvariantCoordinatorEngine.ts` -- CSS (G96) / chip-load invariants

### 2. Safety / workholding / collision (SAFETY-CRITICAL)
Pre-emit gate stack + physical grip/deflection/collision guards.
- `LatheSafetyPredicateEngine.ts` -- formal, total, NaN-guarded master safety predicate
- `LatheSafetySignalEngine.ts` -- composite safety signal gate
- `LathePartoffSafetyRailEngine.ts` -- parting/cutoff safety rail
- `LatheAGISafetyContainmentEngine.ts` / `LatheLoRASafetyEvaluatorEngine.ts`
- `ChuckJawForceEngine.ts` -- chuck grip force vs centrifugal loss (ISO 10218, SF 2.5)
- `SoftJawProfileEngine.ts` / `SoftJawBoringGCodeEngine.ts` / `LatheChuckJawSetupEngine.ts`
- `SteadyRestPlacementEngine.ts` / `TailstockForceEngine.ts` / `LatheWorkholdingEngine.ts`
- `BoringBarDeflectionEngine.ts` / `BoringBarEngine.ts` -- cantilever L/D limits
- `LatheCollisionZoneEngine.ts` -- turret/tailstock/live-tool collision
- `SubSpindleHandoffVerifierEngine.ts` / `LatheSubSpindleTransferPurgeEngine.ts` -- twin-spindle phase-align handoff
- `SwissGuideBushingPhysicsEngine.ts` / `SteadyRest`/`Tailstock` support

### 3. Turning toolpath / print-to-program / assembly
Feature-recognition to full G-code turning program.
- `TurningPrintToProgramEngine.ts` -- print-features to complete turning program (~158K, largest)
- `TurningProgramAssemblerEngine.ts` -- full pipeline: profile to G-code (20 op types, ~108K)
- `LatheAdvancedOperationsEngine.ts` -- live tooling / advanced threading / complex grooving
- `TurningProfileEngine.ts` / `TurningRevProfileEngine.ts` / `TurningStrategyCatalog.ts`
- `TurningPrintIntakeEngine.ts` / `TurningPrintToProgramEngine.ts` / `LathePrintToProgram*` family
- `LatheLiveToolingPlannerEngine.ts` / `LiveToolingEngine.ts` / `LiveToolingSyntaxEngine.ts` / `LiveToolingIntelligenceEngine.ts`
- `TaperTurningEngine.ts` / `FacingEngine.ts` / `KnurlingEngine.ts` / `PartingGroovingEngine.ts`
- `TurningCADImportEngine.ts` / `LatheTurningFeatureRecognizerEngine.ts` / `TurningFeatureTaxonomyEngine.ts`
- `LatheMultiOpPlannerEngine.ts` / `LatheSequenceOptimizerEngine.ts` / `LathePrintSequencePlannerEngine.ts`

### 4. Threading
Single-point + thread-mill + tap physics and pipeline.
- `ThreadingPipelineEngine.ts` -- G76/G92/G32 + thread-mill + rigid-tap G-code pipeline
- `ThreadCalculationEngine.ts` -- thread geometry/depth calc
- `ThreadTurningEngine.ts` / `ThreadMillingEngine.ts` / `ThreadMillingPhysicsEngine.ts`
- `ThreadMethodSelectorEngine.ts` / `ThreadGageEngine.ts` / `ThreadStrengthFatigueEngine.ts`
- `ThreadingServoSyncVerifierEngine.ts` -- servo-sync verification for single-point threading
- `TurningThreadOptimizerEngine.ts` / `TurningThreadRobustOptimizerEngine.ts` / `TurningThreadSensitivityEngine.ts` / `TurningThreadStochasticPlanEngine.ts`

### 5. Post-processing / Okuma-OSP dialect / mill-turn bridges
Controller emission -- JM Die lathe fleet is 100% Okuma OSP.
- `OkumaDialectKnowledgeEngine.ts` -- OSP-P300L/P500L dialect knowledge base (query surface for 41K data)
- `OkumaOSPParserEngine.ts` / `OkumaOSPMillMasterPostEngine.ts` -- OSP-P*M mill master post (~102K)
- `LathePostProcessorEngine.ts` -- turning-specific G-code post
- `LatheMasterPost*` family (Router / API / DeepReasoning / EnsembleCrossCheck / RegressionMatrix / SelfAwareness / UnifiedOutput)
- `LathePostGenerator*` family (Dialect / SpecIngest / Uncertainty / ValidatorWiring / ActiveLearning)
- `LathePostProcessorAIEngine.ts` / `LathePostProcessorDialectValidatorEngine.ts` / `LathePostKnowledgeGraphEngine.ts` / `LatheSwissPostGeneratorEngine.ts`
- `Fusion360MillTurnBridgeEngine.ts` / `HyperMillMillTurnBridge.ts` / `HyperMillMillTurnStrategyEngine.ts` / `HyperMillTurningConfigIngesterEngine.ts` / `FusionLathePostDeltaRegistryEngine.ts`

### 6. AI / ML / reasoning (non-LoRA) -- ~64 engines
Deep-learning, attention, reasoning, causal, quality-gate intelligence.
- `LatheAIOrchestrationEngine.ts` -- master AI orchestration over 27+ lathe AI engines (~118K)
- `LatheOpusReasoningEngine.ts` -- Opus-level neural + deep reasoning chains (~96K)
- `LatheAttentionMechanismEngine.ts` -- transformer attention over G-code (~88K)
- `LatheSelfAwarenessIntegrationEngine.ts` -- PRISM self-awareness integration (WIRE-EXEMPT)
- `LatheQualityGateEngine.ts` -- 6-gate PhD-level quality validation (S(x) hard block)
- `LatheCausalInferenceEngine.ts` / `LatheDeepLogicEngine.ts` / `LatheMetaLearningEngine.ts` / `LatheTransferLearningEngine.ts`
- `LatheNeuralIntelligenceEngine.ts` / `LatheKnowledgeGraphEngine.ts` / `LatheBayesianOptimizationEngine.ts` / `LatheGeneticAlgorithmEngine.ts` / `LatheReinforcementLearningEngine.ts`
- `LatheAnomalyDetectionEngine.ts` / `LatheActiveLearningEngine.ts` / `LatheEnsembleLearningEngine.ts` / `LatheTransformerEngine.ts`
- `LatheAGI*` family (ContinuousLearning / FeatureBridge / KnowledgeUnification) / `LatheDeepLearning*` / `LatheDeepReasoning*` / `LatheUnifiedAI*`

### 7. LoRA fine-tuning pipeline -- 49 engines
Full per-domain LoRA train / eval / deploy / monitor lifecycle (`Lathe*LoRA*`).
- Orchestration: `LatheLoRAMasterOrchestratorEngine.ts` / `LatheLoRAPipelineCoordinatorEngine.ts` / `LatheLoRANeuralOrchestratorEngine.ts` / `LatheLoRAEnsembleOrchestratorEngine.ts` / `LatheLoRACadenceOrchestratorEngine.ts`
- Data: `LatheLoRADatasetBuilderEngine.ts` / `LatheLoRADatasetValidatorEngine.ts` / `LatheLoRAProgramMinerEngine.ts` / `LatheLoRAProgramParserEngine.ts` / `LatheLoRAExampleGeneratorEngine.ts` / `LatheLoRATribalExtractorEngine.ts` / `LatheLoRATribalAugmentationEngine.ts`
- Train/optimize: `LatheLoRATrainingScriptEngine.ts` / `LatheLoRAHyperparameterOptimizerEngine.ts` / `LatheLoRAModelOptimizerEngine.ts` / `LatheLoRAQuantizationOptimizerEngine.ts` / `LatheLoRARewardShapingEngine.ts` / `LatheLoRAContinualLearningEngine.ts`
- Eval/gate: `LatheLoRAPhysicsEvaluatorEngine.ts` / `LatheLoRASafetyEvaluatorEngine.ts` / `LatheLoRAReasoningEvaluatorEngine.ts` / `LatheLoRAVerificationEngine.ts` / `LatheLoRABenchmarkSuiteEngine.ts` / `LatheLoRADriftDetectorEngine.ts`
- Deploy/serve: `LatheLoRADeploymentEngine.ts` / `LatheLoRAOllamaDeployerEngine.ts` / `LatheLoRAInferenceGatewayEngine.ts` / `LatheLoRAModelRegistryEngine.ts` / `LatheLoRAModelSelectorEngine.ts` / `LatheLoRAHealthMonitorEngine.ts` / `LatheLoRAMonitoringEngine.ts` / `LatheLoRATrainingMonitorEngine.ts`

### 8. ERP / quoting / production-lifecycle (cross-galaxy edges)
Print-to-quote, cost reconciliation, scheduling, job lifecycle.
- `LatheAutoQuoteFromPrintEngine.ts` -- print-to-quote (feeds quoting/charlie)
- `LatheActualCostReconciliationEngine.ts` -- quoted-vs-actual cost feedback (to business/hotel)
- `LatheActualFeedbackTuningEngine.ts` / `LatheProgrammingCostEngine.ts` / `LathePartCostModelEngine.ts` / `LatheJobProfitabilityAnalyticsEngine.ts`
- `LatheERPOrchestratorEngine.ts` / `LatheJobSchedulingEngine.ts` / `LatheCustomerOrderLifecycleEngine.ts` / `LathePurchaseOrderAutomationEngine.ts` / `LatheInventoryIntelligenceEngine.ts`
- `LatheFirstPieceApprovalEngine.ts` / `LathePrintProgramSignoffEngine.ts` / `LatheProgramSignoffDossierEngine.ts` / `LatheChangeoverBriefEngine.ts`

## Key engines (detailed)

### TurningPrintToProgramEngine.ts
Generates complete CNC turning programs from part-feature descriptions -- OD/ID profiling, facing, grooving, threading, boring, parting, taper, multi-pass roughing. Header declares an inline physics block (Kienzle Fc, Taylor T, Ra = f^2/(32 r_nose), power, MRR) but also imports canonical `CANONICAL_TURNING_SPEEDS/FEEDS/MATERIAL_DB` from `physics/constants.js` and orchestrates ~15 sibling engines (boring-bar deflection, chuck-jaw, collision-zone, part-classifier). Notably it routes the emit through `okumaB250LatheMasterPostEngine` when the target is Okuma, because the inline generator emits Fanuc-dialect G71/G72/G76 that ALARM or mis-cycle on OSP (on OSP G71 is threading, not roughing).
- file: `mcp-server/src/engines/TurningPrintToProgramEngine.ts` (largest, ~158K)
- exports: default print-to-program pipeline; consumes `MachiningKnowledgeBaseEngine`, `OkumaB250LatheMasterPostEngine`, emits P2P outcome events.

### TurningProgramAssemblerEngine.ts
Lathe equivalent of `CNCProgramAssemblerEngine`. Accepts a `TurningPartProfile` (OD/ID profile + features) and assembles a complete turning program: analyze profile, auto-assign turret stations T01-T12, sequence face -> OD rough (G71) -> finish (G70) -> grooves -> threads -> ID drill/bore -> part-off, compute S/F via inline material DB + Kienzle, emit Fanuc/Haas/Mazak/Okuma variants, bar-fed M99 loop, cycle-time estimate. Claims exhaustive coverage of 20 operation types and 30+ tool types. Pure computation, no filesystem.
- file: `mcp-server/src/engines/TurningProgramAssemblerEngine.ts` (~108K)
- exports: `AtomicValue<T>`, `TurningController`, `ProfilePoint`, `TurningPartProfile`, assembler class.

### LatheAIOrchestrationEngine.ts
Master orchestration layer unifying 27+ lathe AI engines into one system with coordinated (parallel/sequential) execution, cross-engine knowledge sharing, tribal-knowledge injection, and adaptive strategy selection with fallback. Header inventories the orchestrated engines by tier (core AI hardening, shop-aware optimization, collision/safety, intelligence layers, unified AI) and maps 80+ lathe MCP actions to orchestrated flows.
- file: `mcp-server/src/engines/LatheAIOrchestrationEngine.ts` (~118K)
- milestone: LATHE-AI-ORCHESTRATION; cites Kienzle, Taylor, Pearl (Causality), Machinery's Handbook.

### OkumaOSPMillMasterPostEngine.ts
Okuma OSP-P300M / OSP-P500M mill master post -- closes the OSP-P*M hard-reject branch in `master_post_by_machine`. Mirrors `HurcoV11MillMasterPostEngine` (same `MillOperation` shape, `BlockAnnotation[]` flow, Kienzle/Taylor gate). Sources OSP-P*M dialect (G15 H1 offsets, two-line tool change, G81/G83/G73/G84/G85/G87 canned cycles, G65 P88xx probing, P500-only Super-NURBS G05.1 Q1 + 5-axis TCPC G43.5) from `ControllerDialectEngine.dialects` -- not hardcoded. Physics imported from `physics/constants.ts`.
- file: `mcp-server/src/engines/OkumaOSPMillMasterPostEngine.ts` (~102K)
- milestone: PPG-WIRE-MS5/U-PPGW-OkumaMill; exports `BlockAnnotation` flow into `sealMasterPostOutput`.

### LatheSelfAwarenessIntegrationEngine.ts
Integrates with `PRISMSelfAwarenessEngine` to route lathe tasks across all PRISM capabilities: query what PRISM can do for lathe programming, find best actions, pull JM Die customer programs/patterns, search tribal knowledge and playbook rules, dynamic confidence-weighted engine selection, cross-domain synthesis, and knowledge-graph navigation. Header is WIRE-EXEMPT (consumed by lathe-studio skills + orchestrator pipelines, not an MCP dispatcher action).
- file: `mcp-server/src/engines/LatheSelfAwarenessIntegrationEngine.ts` (~100K)
- milestone: LATHE-SELF-AWARENESS-MS0; WIRE-EXEMPT tag present.

### LatheThermodynamicsEngine.ts
Comprehensive thermal model of turning: heat generation (primary/secondary/tertiary shear zones, Q = Fc*Vc), heat partition (chip 60-80%, tool 10-20%, work 5-20%; R = sqrt(k rho cp) ratio), temperature distribution via Jaeger moving heat source, thermal material effects (Johnson-Cook softening, Ac1/Ac3 phase transformation, white layer, tempering), tool effects (coating breakdown, Arrhenius diffusion wear, thermal shock/fatigue), and coolant thermodynamics (Leidenfrost, HPC, cryogenic LN2/CO2).
- file: `mcp-server/src/engines/LatheThermodynamicsEngine.ts` (~98K)

### LatheUnifiedPhysicsOrchestrationEngine.ts
Unified physics/chemistry/metallurgy/thermodynamics engine integrating 8 model families: cutting mechanics (Kienzle/Merchant/Oxley), tool life (Taylor/extended/wear), thermal (Jaeger/heat-partition), material science (Johnson-Cook/flow-stress), metallurgy (phase transformation/white layer/residual stress), chemistry (coolant/oxidation/diffusion), deflection/dynamics (beam theory/chatter), chip formation (shear plane/curl). All constants from canonical `physics/constants.ts`; imports `kienzleForce`, `taylorLife`, `toolDeflection`, `WHITE_LAYER_THRESHOLDS`.
- file: `mcp-server/src/engines/LatheUnifiedPhysicsOrchestrationEngine.ts` (~95K)

### LatheOpusReasoningEngine.ts
Opus-level intelligence for lathe programming: MLP neural decision-making (operation-sequence optimization, tool-selection pattern recognition), deep multi-step reasoning chains with causal + counterfactual inference, cost-efficiency optimization (cycle-time vs tool-life, MRR, wear cost), knowledge synthesis over 3,700+ tribal tips combined with Kienzle/Taylor physics, and graph-algorithm operation-flow optimization (minimize tool changes/turret indexing, thermal-drift-aware ordering).
- file: `mcp-server/src/engines/LatheOpusReasoningEngine.ts` (~96K)

### LatheAttentionMechanismEngine.ts
Transformer-attention (Vaswani et al. 2017) adapted to CNC lathe G-code analysis: self-attention (scaled dot-product QKV), 8-head multi-head attention, cross-attention (material->operation, tool->parameter), local/global/causal/sparse variants, and manufacturing-specific attention on tool-change / N-blocks / safety tokens. Adds sinusoidal positional encoding, attention heat-map visualization, critical-token identification, operation-dependency analysis, and physics-aware attention biasing.
- file: `mcp-server/src/engines/LatheAttentionMechanismEngine.ts` (~88K)
- milestone: LATHE-ATTENTION-MS0; exports `AttentionConfig`.

### LatheQualityGateEngine.ts
PhD-level 6-gate quality validation across the lathe pipeline: SAFETY (collision-free, spindle limits, program end), PARAMETER (ISO material limits, finish achievability), SEQUENCE (op order, datum maintenance), PHYSICS (Kienzle force, Taylor life, deflection, thermal), QUALITY (surface-finish/tolerance achievability), SHOP (JM Die standards, customer prefs, machine capability). Scores 0-100 per gate with Pass>80 / Warn 60-80 / Fail<60 and remediation reports; imports canonical Kienzle/Taylor/material DB + a S(x) safety-score hard block (MS1 U-LAT14).
- file: `mcp-server/src/engines/LatheQualityGateEngine.ts` (~91K)

### LatheSafetyPredicateEngine.ts
Formal safety predicate (U-LSR22, LATHE-HARDENED-MS0) wrapping the `LatheSafetySignals` composite gate into a deterministic, total, NaN-guarded predicate used as the emitter precondition. Design axioms: totality (never throws -> degrades to BLOCKED), NaN-safety (non-finite -> BLOCKED), monotonicity (weakening a SAFE state can only move to UNVERIFIED/BLOCKED), determinism, and independence (consumes precomputed signals, computes no physics itself -- enabling an independent-reproducer proof). Optional lazy-imported Z3 proof for small numeric domains.
- file: `mcp-server/src/engines/LatheSafetyPredicateEngine.ts`
- exports: `verify()`, `isMonotonicWeakening()`, `proveWithZ3()`; consumes `LatheSafetySignalsSchema`.

### ChuckJawForceEngine.ts
SAFETY-CRITICAL. Computes required chuck jaw gripping force to prevent workpiece ejection during turning (ejection at high RPM is lethal -- SF 2.5 minimum per ISO 10218). Models centrifugal force, cutting force, friction coefficient, jaw contact geometry, and speed-dependent grip loss (a standard 3-jaw 6" chuck loses ~30% grip at 3000 RPM). Must be called via `lathe_workholding_select_jaw` BEFORE feed/DOC planning.
- file: `mcp-server/src/engines/ChuckJawForceEngine.ts`
- exports: `JawType`, `ChuckType`, `ChuckForceInput`; actions `chuck_force_calc`, `chuck_force_validate`, `chuck_force_recommend`.

### BoringBarDeflectionEngine.ts
Cantilever-beam boring-bar deflection and bar-selection engine. Computes static deflection delta = F*L^3/(3*E*I), I = pi*d^4/64; enforces L/D limits (steel <= 4, carbide <= 6, dampened <= 10), maps deflection to bore taper + surface-finish impact, and recommends bar material/min diameter. Grounds the L^3/D^4 scaling gotcha in CLAUDE.md.
- file: `mcp-server/src/engines/BoringBarDeflectionEngine.ts`
- exports: `BoringBarDeflectionInput`; action `boring_bar_deflection_calc`. Refs Sandvik/Kennametal Silent Tools.

### ThreadingPipelineEngine.ts
Comprehensive threading engine backing `threadingPipelineDispatcher`. Covers single-point turned threads (G76/G92/G32), thread milling (helical interpolation), rigid tapping (G84), and pipe threads; generates full G-code with infeed strategy, pass scheduling (constant-chip-area sqrt-pass progression), and synchronization. Physics from `MachiningKnowledgeBaseEngine` (thread depth 0.6134*pitch, tap torque, sync feed = pitch*RPM).
- file: `mcp-server/src/engines/ThreadingPipelineEngine.ts`
- exports: `ThreadType`, `ThreadMethod` unions covering metric/UN/BSP/NPT/ACME/trapezoidal/buttress + single-point/thread-mill/rigid-tap/die-head methods.

### OkumaDialectKnowledgeEngine.ts
Searchable Okuma OSP-P300L/P500L dialect knowledge base mined from real production programs + programming manuals. Provides G/M-code lookup with OSP-specific parameters, dialect-difference mapping (Okuma -> Fanuc/Haas), safety-rule knowledge, variable-scope/naming reference, and threading/C-axis/bar-feeder pattern knowledge. The query surface for the 41K `okuma-dialect-knowledge.ts` data (never full-read that file). Integrates with ControllerDialect, Tribal, Playbook, LathePostProcessor, SpeedFeedMiner.
- file: `mcp-server/src/engines/OkumaDialectKnowledgeEngine.ts`
- exports: `OkumaKnowledgeSearchInput`; consumes `OKUMA_DIALECT_KNOWLEDGE`, `OkumaOSPParserEngine` types.

## Full engine index

One-liners come from each file's leading JSDoc where read this session; entries derived from file-name convention (grounded in the lathe CLAUDE.md sub-domain map) are marked "(name-derived)".

| Engine | Category | One-line |
| --- | --- | --- |
| TurningPrintToProgramEngine.ts | Toolpath/P2P | Print-features to complete CNC turning program; routes Okuma via master post |
| TurningProgramAssemblerEngine.ts | Toolpath/P2P | Full turning program assembly: profile to G-code, 20 op types |
| LatheAdvancedOperationsEngine.ts | Toolpath/P2P | Advanced ops: live tooling, multi-start/whirl threading, complex grooving |
| TurningProfileEngine.ts | Toolpath/P2P | Turning profile handling (name-derived) |
| TurningRevProfileEngine.ts | Toolpath/P2P | Revolved profile turning (name-derived) |
| TurningStrategyCatalog.ts | Toolpath/P2P | Turning strategy catalog (name-derived) |
| TurningPrintIntakeEngine.ts | Toolpath/P2P | Turning print intake (name-derived) |
| TurningCADImportEngine.ts | Toolpath/P2P | Turning CAD import (name-derived) |
| LatheTurningFeatureRecognizerEngine.ts | Toolpath/P2P | Turning feature recognition (name-derived) |
| TurningFeatureTaxonomyEngine.ts | Toolpath/P2P | Turning feature taxonomy (name-derived) |
| LatheMultiOpPlannerEngine.ts | Toolpath/P2P | Multi-operation planner (Op1/Op2 flip, soft-jaw boring) |
| LatheSequenceOptimizerEngine.ts | Toolpath/P2P | Op sequence optimizer (face first, part-off last) |
| LathePrintSequencePlannerEngine.ts | Toolpath/P2P | Print sequence planner (name-derived) |
| LathePrintFeatureStrategySelectorEngine.ts | Toolpath/P2P | Print feature -> strategy selector (name-derived) |
| LathePrintIngestPipelineEngine.ts | Toolpath/P2P | Print ingest pipeline (name-derived) |
| LathePrintProgramEmitterEngine.ts | Toolpath/P2P | Print program emitter (name-derived) |
| LathePrintSetupSelectionEngine.ts | Toolpath/P2P | Print setup selection (name-derived) |
| LathePrintToleranceStackEngine.ts | Toolpath/P2P | Tolerance stack analysis (name-derived) |
| LathePrintToolpathGeneratorEngine.ts | Toolpath/P2P | Print toolpath generator (name-derived) |
| LatheProgramCatalogEngine.ts | Toolpath/P2P | Program catalog (name-derived) |
| LatheProgramLibraryEngine.ts | Toolpath/P2P | Program library (name-derived) |
| LatheProgramOptimizerEngine.ts | Toolpath/P2P | Auto-fix + program optimization |
| LatheProgramFeatureInferenceEngine.ts | Toolpath/P2P | Program feature inference (name-derived) |
| LatheProgramRecognitionBridgeEngine.ts | Toolpath/P2P | Program recognition bridge (name-derived) |
| LatheProgramAuditPipelineEngine.ts | Toolpath/P2P | Program audit pipeline (name-derived) |
| LatheProgramBacktraceEngine.ts | Toolpath/P2P | Program backtrace (name-derived) |
| LatheProgrammingStyleSelectorEngine.ts | Toolpath/P2P | Programming style (hard-code vs macro) selector (name-derived) |
| LatheStockEvolutionEngine.ts | Toolpath/P2P | Stock/in-process material evolution (name-derived) |
| LatheProofCarryingEmitEngine.ts | Toolpath/P2P | Proof-carrying program emit record (name-derived) |
| LatheReplayFrameCompilerEngine.ts | Toolpath/P2P | Replay frame compiler (name-derived) |
| LatheEnvelopeBreachReplayEngine.ts | Safety | Envelope-breach replay (name-derived) |
| LatheDeviationMapEngine.ts | Toolpath/P2P | Deviation map (name-derived) |
| LatheBlockEngagementSimulatorEngine.ts | Physics | Block engagement simulator (name-derived) |
| LatheBlockTimeProfilerEngine.ts | Toolpath/P2P | Per-block time profiler (name-derived) |
| LatheOpTimeBreakdownEngine.ts | Toolpath/P2P | Operation time breakdown (name-derived) |
| TaperTurningEngine.ts | Toolpath/P2P | Taper turning (name-derived) |
| FacingEngine.ts | Toolpath/P2P | Facing operation (name-derived) |
| KnurlingEngine.ts | Toolpath/P2P | Knurling operation (name-derived) |
| PartingGroovingEngine.ts | Toolpath/P2P | Parting + grooving (name-derived) |
| LiveToolingEngine.ts | Toolpath/P2P | Live tooling ops (name-derived) |
| LiveToolingSyntaxEngine.ts | Post/Dialect | Live-tooling G-code syntax (name-derived) |
| LiveToolingIntelligenceEngine.ts | AI/ML | Live-tooling intelligence (name-derived) |
| LatheLiveToolingPlannerEngine.ts | Toolpath/P2P | Live tooling planner (name-derived) |
| LatheShaftAdapterEngine.ts | Toolpath/P2P | Shaft adapter modeling (name-derived) |
| TurningForceEngine.ts | Physics | Single-point turning force, power and torque prediction |
| TurningInsertLifeEngine.ts | Physics | Material-specific insert-life prediction |
| TurningWearPredictionEngine.ts | Physics | Turning wear prediction (name-derived) |
| TurningToolpathWearEngine.ts | Physics | Toolpath-integrated wear (name-derived) |
| TurningOffsetCompensationEngine.ts | Physics | Tool offset compensation (name-derived) |
| TurningInspectionPlanEngine.ts | Quality | Inspection plan (name-derived) |
| TurningCpkSurrogateEngine.ts | Quality | Cpk surrogate (name-derived) |
| TurningEnvelopeDistanceEngine.ts | Safety | Envelope distance (name-derived) |
| TurningMinFingerprintEngine.ts | Physics | Turning minimal fingerprint (name-derived) |
| TurningRobustOptimizerEngine.ts | Physics | Robust turning optimizer (name-derived) |
| TurningSensitivityAnalysisEngine.ts | Physics | Sensitivity analysis (name-derived) |
| TurningStochasticPlanEngine.ts | Physics | Stochastic turning plan (name-derived) |
| TurningRulesGeneratorEngine.ts | Physics | Turning rules generator (name-derived) |
| LatheChipMechanicsEngine.ts | Physics | Comprehensive chip-formation physics for turning |
| LatheMetallurgyEngine.ts | Physics | Metallurgical phenomena in lathe cutting |
| LatheCuttingChemistryEngine.ts | Physics | Chemical phenomena (coolant/oxidation/diffusion) |
| LatheThermodynamicsEngine.ts | Physics | Comprehensive thermal phenomena (Jaeger, heat partition) |
| LatheUnifiedPhysicsOrchestrationEngine.ts | Physics | Unified physics/chem/metallurgy/thermo orchestration |
| LatheUnifiedScienceEngine.ts | Physics | Unified science orchestration (name-derived) |
| LatheScienceHardeningEngine.ts | Physics | Chatter SLD, hard turning, thread physics hardening |
| LatheCSSOptimizerEngine.ts | Physics | CSS (G96) optimization (name-derived) |
| CSSChipLoadInvariantCoordinatorEngine.ts | Physics | CSS / chip-load invariant coordination (name-derived) |
| LatheAdaptiveMachiningEngine.ts | Physics | Adaptive machining (name-derived) |
| LatheCoolantAdvisorEngine.ts | Physics | Coolant strategy advisor (name-derived) |
| LatheCoaxialityRunoutValidatorEngine.ts | Quality | Coaxiality/runout validation (name-derived) |
| LatheDatumReferenceFrameEngine.ts | Quality | Datum reference frame (name-derived) |
| LatheOnMachineProbeCycleEngine.ts | Quality | On-machine probe cycle (name-derived) |
| LatheSafetyPredicateEngine.ts | Safety | Formal total NaN-guarded master safety predicate (Z3-provable) |
| LatheSafetySignalEngine.ts | Safety | Composite safety-signal gate (name-derived) |
| LathePartoffSafetyRailEngine.ts | Safety | Parting/cutoff safety rail |
| LatheAGISafetyContainmentEngine.ts | Safety | AGI safety containment (name-derived) |
| LatheCollisionZoneEngine.ts | Safety | Turret/tailstock/live-tool collision detection |
| ChuckJawForceEngine.ts | Safety | SAFETY-CRITICAL chuck grip force vs centrifugal loss (ISO 10218) |
| LatheChuckJawSetupEngine.ts | Safety | Chuck-jaw setup (name-derived) |
| SoftJawProfileEngine.ts | Safety | Soft-jaw profile (L2-P4-MS1 specialty) |
| SoftJawBoringGCodeEngine.ts | Safety | Soft-jaw boring G-code (name-derived) |
| SteadyRestPlacementEngine.ts | Safety | Steady-rest placement (L2-P4-MS1 specialty) |
| TailstockForceEngine.ts | Safety | Tailstock force (L2-P4-MS1 specialty) |
| LatheWorkholdingEngine.ts | Safety | Jaw selection, trilobe distortion |
| BoringBarDeflectionEngine.ts | Safety | Cantilever boring-bar deflection + L/D limits |
| BoringBarEngine.ts | Safety | Boring bar ops (name-derived) |
| SwissGuideBushingPhysicsEngine.ts | Safety | Swiss guide-bushing physics (U-LPR-SWISS) |
| SubSpindleHandoffVerifierEngine.ts | Safety | Twin-spindle pickup/phase verification |
| LatheSubSpindleTransferPurgeEngine.ts | Safety | Sub-spindle transfer purge (name-derived) |
| BarFeedPitchOptimizerEngine.ts | Toolpath/P2P | Bar-feed pitch / remnant optimizer |
| BarFeederEngine.ts | Toolpath/P2P | Bar feeder control (name-derived) |
| LathePartingChipClearanceEngine.ts | Safety | Parting chip evacuation / peck-groove enforcement |
| LatheChangeoverBriefEngine.ts | ERP/Production | Changeover brief (name-derived) |
| ThreadingPipelineEngine.ts | Threading | G76/G92/G32 + thread-mill + rigid-tap G-code pipeline |
| ThreadCalculationEngine.ts | Threading | Thread geometry/depth calculation |
| ThreadTurningEngine.ts | Threading | Single-point thread turning (name-derived) |
| ThreadMillingEngine.ts | Threading | Thread milling (name-derived) |
| ThreadMillingPhysicsEngine.ts | Threading | Thread-milling physics (name-derived) |
| ThreadMethodSelectorEngine.ts | Threading | Thread method selector (name-derived) |
| ThreadGageEngine.ts | Threading | Thread gaging (name-derived) |
| ThreadStrengthFatigueEngine.ts | Threading | Thread strength/fatigue (name-derived) |
| ThreadingServoSyncVerifierEngine.ts | Threading | Servo-sync verification for single-point threading (name-derived) |
| TurningThreadOptimizerEngine.ts | Threading | Thread turning optimizer (name-derived) |
| TurningThreadRobustOptimizerEngine.ts | Threading | Robust thread optimizer (name-derived) |
| TurningThreadSensitivityEngine.ts | Threading | Thread sensitivity analysis (name-derived) |
| TurningThreadStochasticPlanEngine.ts | Threading | Stochastic thread plan (name-derived) |
| OkumaDialectKnowledgeEngine.ts | Post/Dialect | Okuma OSP-P300L/P500L dialect knowledge base |
| OkumaOSPParserEngine.ts | Post/Dialect | Okuma OSP program parser (name-derived) |
| OkumaOSPMillMasterPostEngine.ts | Post/Dialect | Okuma OSP-P*M mill master post (Super-NURBS, 5-axis TCPC) |
| LathePostProcessorEngine.ts | Post/Dialect | Turning-specific G-code post-processing |
| LathePostProcessorAIEngine.ts | Post/Dialect | Cross-controller translation AI post (name-derived) |
| LathePostProcessorDialectValidatorEngine.ts | Post/Dialect | Post dialect validator (name-derived) |
| LathePostKnowledgeGraphEngine.ts | Post/Dialect | Post knowledge graph (name-derived) |
| LathePostGeneratorDialectEngine.ts | Post/Dialect | Post generator dialect (name-derived) |
| LathePostGeneratorSpecIngestEngine.ts | Post/Dialect | Post generator spec ingest (name-derived) |
| LathePostGeneratorUncertaintyEngine.ts | Post/Dialect | Post generator uncertainty (name-derived) |
| LathePostGeneratorValidatorWiringEngine.ts | Post/Dialect | Post generator validator wiring (name-derived) |
| LathePostGeneratorActiveLearningEngine.ts | Post/Dialect | Post generator active learning (name-derived) |
| LathePostRegressionTestGeneratorEngine.ts | Post/Dialect | Post regression-test generator (name-derived) |
| LatheMasterPostAPIEngine.ts | Post/Dialect | Master-post API surface (name-derived) |
| LatheMasterPostRouterEngine.ts | Post/Dialect | Master-post router (name-derived) |
| LatheMasterPostDeepReasoningEngine.ts | Post/Dialect | Master-post deep reasoning (name-derived) |
| LatheMasterPostEnsembleCrossCheckEngine.ts | Post/Dialect | Master-post ensemble cross-check (name-derived) |
| LatheMasterPostRegressionMatrixEngine.ts | Post/Dialect | Master-post regression matrix (name-derived) |
| LatheMasterPostSelfAwarenessEngine.ts | Post/Dialect | Master-post self-awareness (name-derived) |
| LatheMasterPostUnifiedOutputEngine.ts | Post/Dialect | Master-post unified output (name-derived) |
| LatheSwissPostGeneratorEngine.ts | Post/Dialect | Swiss-type post generator (name-derived) |
| LatheMasterOrchestratorFacadeEngine.ts | AI/ML | Master orchestrator facade (name-derived) |
| Fusion360MillTurnBridgeEngine.ts | Post/Dialect | Fusion 360 mill-turn machine + spindle-handoff bridge |
| HyperMillMillTurnBridge.ts | Post/Dialect | hyperMILL mill-turn bridge (name-derived) |
| HyperMillMillTurnStrategyEngine.ts | Post/Dialect | hyperMILL mill-turn strategy (name-derived) |
| HyperMillTurningConfigIngesterEngine.ts | Post/Dialect | hyperMILL turning config ingest (name-derived) |
| FusionLathePostDeltaRegistryEngine.ts | Post/Dialect | Fusion lathe post delta registry (name-derived) |
| JMDieLatheProgramUpgraderEngine.ts | Post/Dialect | JM Die lathe program upgrader (name-derived) |
| JMDieLatheProgramUpgraderV2Engine.ts | Post/Dialect | JM Die lathe program upgrader v2 (name-derived) |
| HardTurningCapstoneEngine.ts | Physics | Hard-turning capstone gate (name-derived) |
| HardTurningDecisionEngine.ts | Physics | Hard-turning decision gate (name-derived) |
| LatheAIOrchestrationEngine.ts | AI/ML | Master AI orchestration over 27+ lathe AI engines |
| LatheOpusReasoningEngine.ts | AI/ML | Opus-level neural + deep reasoning chains |
| LatheAttentionMechanismEngine.ts | AI/ML | Transformer attention over lathe G-code |
| LatheCausalInferenceEngine.ts | AI/ML | Causal inference (name-derived) |
| LatheDeepLogicEngine.ts | AI/ML | Deep logic reasoning (name-derived) |
| LatheDeepReasoningEngine.ts | AI/ML | Multi-step reasoning, FMEA (name-derived) |
| LatheDeepLearningEngine.ts | AI/ML | Pattern recognition, adaptation (name-derived) |
| LatheDeepLearningIntelligenceEngine.ts | AI/ML | Neural-pattern intelligence (name-derived) |
| LatheDeepAIHardeningEngine.ts | AI/ML | 21-engine unification / AI hardening (name-derived) |
| LatheKinematicsDeepLearningEngine.ts | AI/ML | Machine-kinematics neural nets (name-derived) |
| LatheMetaLearningEngine.ts | AI/ML | Meta-learning (name-derived) |
| LatheTransferLearningEngine.ts | AI/ML | Transfer learning (name-derived) |
| LatheReinforcementLearningEngine.ts | AI/ML | Reinforcement learning (name-derived) |
| LatheGeneticAlgorithmEngine.ts | AI/ML | Genetic-algorithm optimization (name-derived) |
| LatheBayesianOptimizationEngine.ts | AI/ML | Bayesian optimization (name-derived) |
| LatheEnsembleLearningEngine.ts | AI/ML | Ensemble learning (name-derived) |
| LatheActiveLearningEngine.ts | AI/ML | Active learning (name-derived) |
| LatheAnomalyDetectionEngine.ts | AI/ML | Anomaly detection (name-derived) |
| LatheTransformerEngine.ts | AI/ML | Transformer model (name-derived) |
| LatheNeuralIntelligenceEngine.ts | AI/ML | Neural intelligence (name-derived) |
| LatheKnowledgeGraphEngine.ts | AI/ML | Knowledge graph (name-derived) |
| LathePrintToProgramKnowledgeGraphEngine.ts | AI/ML | Print-to-program knowledge graph (name-derived) |
| LathePrintToProgramReasoningEngine.ts | AI/ML | Print-to-program reasoning (name-derived) |
| LathePrintToProgramDLIntelligenceEngine.ts | AI/ML | Print-to-program DL intelligence (name-derived) |
| LatheAGIContinuousLearningEngine.ts | AI/ML | AGI continuous learning (name-derived) |
| LatheAGIFeatureBridgeEngine.ts | AI/ML | AGI feature bridge (name-derived) |
| LatheAGIKnowledgeUnificationEngine.ts | AI/ML | AGI knowledge unification (name-derived) |
| LatheAIFeatureRegistration.ts | AI/ML | AI feature registration (name-derived) |
| LatheAIReasoningEngine.ts | AI/ML | Tribal knowledge, G76 dialect reasoning (name-derived) |
| LatheAITrainingEngine.ts | AI/ML | Physics-validation training (name-derived) |
| LatheAIUltraEngine.ts | AI/ML | 12-controller / 4-mode ultra engine (name-derived) |
| LatheUnifiedAIEngine.ts | AI/ML | Master orchestration, print-to-program (name-derived) |
| LatheUnifiedAIOrchestrator.ts | AI/ML | Unified AI orchestrator (name-derived) |
| LatheMachineIntelligenceEngine.ts | AI/ML | 11 machine types, axis configs (name-derived) |
| LatheIntelligenceEngine.ts | AI/ML | Hard-code vs macro, live tooling, Swiss (name-derived) |
| LatheCAMIntelligenceEngine.ts | AI/ML | Parametric templates, MRR optimization (name-derived) |
| LathePredictiveIntelligenceEngine.ts | AI/ML | Wear/finish/thermal predictions (name-derived) |
| LatheTroubleshootingIntelligenceEngine.ts | AI/ML | Chatter diagnosis, tool-breakage (name-derived) |
| LatheExpertAdvisorEngine.ts | AI/ML | 11 material categories, insert grades (name-derived) |
| LatheSelfAwarenessIntegrationEngine.ts | AI/ML | Full PRISM self-awareness integration (WIRE-EXEMPT) |
| LatheOrchestrationEngine.ts | AI/ML | 35-stage full pipeline orchestration (name-derived) |
| LatheResourceKnowledgeEngine.ts | AI/ML | AOT + mistake detection (name-derived) |
| LatheKnowledgeHarvesterEngine.ts | AI/ML | Knowledge extraction (name-derived) |
| LatheJMDieKnowledgeEngine.ts | AI/ML | JM Die knowledge (name-derived) |
| LatheTribalInjectorEngine.ts | AI/ML | Tribal knowledge injection (name-derived) |
| LatheTribalIntegrationEngine.ts | AI/ML | Tribal integration (name-derived) |
| LatheShopAwareOptimizationEngine.ts | AI/ML | JM Die shop-aware optimization (name-derived) |
| LathePartClassifierEngine.ts | AI/ML | 15 part families, workholding defaults (name-derived) |
| LathePartFamilyMatcherEngine.ts | AI/ML | Part-family matcher (name-derived) |
| LathePartFamilyPlanningEngine.ts | AI/ML | Part-family planning (name-derived) |
| LathePartFamilyTemplateExtractorEngine.ts | AI/ML | Part-family template extractor (name-derived) |
| LatheFullArchiveTrainingEngine.ts | AI/ML | Full-archive training (name-derived) |
| LatheQualityGateEngine.ts | Quality | 6-gate PhD-level quality validation + S(x) hard block |
| LatheFirstPieceApprovalEngine.ts | Quality | First-piece approval (name-derived) |
| LathePrintProgramSignoffEngine.ts | Quality | Print program sign-off (name-derived) |
| LatheProgramSignoffDossierEngine.ts | Quality | Program sign-off dossier (name-derived) |
| LatheLoRAMasterOrchestratorEngine.ts | LoRA | LoRA master orchestrator (name-derived) |
| LatheLoRAPipelineCoordinatorEngine.ts | LoRA | LoRA pipeline coordinator (name-derived) |
| LatheLoRAPipelineEngine.ts | LoRA | LoRA pipeline (name-derived) |
| LatheLoRANeuralOrchestratorEngine.ts | LoRA | LoRA neural orchestrator (name-derived) |
| LatheLoRANeuralBridgeEngine.ts | LoRA | LoRA neural bridge (name-derived) |
| LatheLoRAEnsembleOrchestratorEngine.ts | LoRA | LoRA ensemble orchestrator (name-derived) |
| LatheLoRAEnsembleCombinerEngine.ts | LoRA | LoRA ensemble combiner (name-derived) |
| LatheLoRAEnsembleVoterEngine.ts | LoRA | LoRA ensemble voter (name-derived) |
| LatheLoRACadenceEngine.ts | LoRA | LoRA cadence (name-derived) |
| LatheLoRACadenceOrchestratorEngine.ts | LoRA | LoRA cadence orchestrator (name-derived) |
| LatheLoRACronJobEngine.ts | LoRA | LoRA cron job (name-derived) |
| LatheLoRADatasetBuilderEngine.ts | LoRA | LoRA dataset builder (name-derived) |
| LatheLoRADatasetValidatorEngine.ts | LoRA | LoRA dataset validator (name-derived) |
| LatheLoRAProgramMinerEngine.ts | LoRA | LoRA program miner (name-derived) |
| LatheLoRAProgramParserEngine.ts | LoRA | LoRA program parser (name-derived) |
| LatheLoRAExampleGeneratorEngine.ts | LoRA | LoRA example generator (name-derived) |
| LatheLoRATribalExtractorEngine.ts | LoRA | LoRA tribal extractor (name-derived) |
| LatheLoRATribalAugmentationEngine.ts | LoRA | LoRA tribal augmentation (name-derived) |
| LatheLoRAKnowledgeCuratorEngine.ts | LoRA | LoRA knowledge curator (name-derived) |
| LatheLoRAKnowledgeGraphEngine.ts | LoRA | LoRA knowledge graph (name-derived) |
| LatheLoRAEmbeddingCacheEngine.ts | LoRA | LoRA embedding cache (name-derived) |
| LatheLoRATrainingScriptEngine.ts | LoRA | LoRA training script (name-derived) |
| LatheLoRATrainingMonitorEngine.ts | LoRA | LoRA training monitor (name-derived) |
| LatheLoRAHyperparameterOptimizerEngine.ts | LoRA | LoRA hyperparameter optimizer (name-derived) |
| LatheLoRAModelOptimizerEngine.ts | LoRA | LoRA model optimizer (name-derived) |
| LatheLoRAQuantizationOptimizerEngine.ts | LoRA | LoRA quantization optimizer (name-derived) |
| LatheLoRARewardShapingEngine.ts | LoRA | LoRA reward shaping (name-derived) |
| LatheLoRAContinualLearningEngine.ts | LoRA | LoRA continual learning (name-derived) |
| LatheLoRAMergeStrategyEngine.ts | LoRA | LoRA merge strategy (name-derived) |
| LatheLoRATransferStrategyEngine.ts | LoRA | LoRA transfer strategy (name-derived) |
| LatheLoRAPhysicsEvaluatorEngine.ts | LoRA | LoRA physics evaluator (name-derived) |
| LatheLoRAPhysicsAugmentedInferenceEngine.ts | LoRA | LoRA physics-augmented inference (name-derived) |
| LatheLoRASafetyEvaluatorEngine.ts | LoRA | LoRA safety evaluator (name-derived) |
| LatheLoRAReasoningEvaluatorEngine.ts | LoRA | LoRA reasoning evaluator (name-derived) |
| LatheLoRAReasoningChainInferenceEngine.ts | LoRA | LoRA reasoning-chain inference (name-derived) |
| LatheLoRAVerificationEngine.ts | LoRA | LoRA verification (name-derived) |
| LatheLoRABenchmarkSuiteEngine.ts | LoRA | LoRA benchmark suite (name-derived) |
| LatheLoRADriftDetectorEngine.ts | LoRA | LoRA drift detector (name-derived) |
| LatheLoRAExperimentTrackerEngine.ts | LoRA | LoRA experiment tracker (name-derived) |
| LatheLoRADeploymentEngine.ts | LoRA | LoRA deployment (name-derived) |
| LatheLoRAOllamaDeployerEngine.ts | LoRA | LoRA Ollama deployer (name-derived) |
| LatheLoRAInferenceGatewayEngine.ts | LoRA | LoRA inference gateway (name-derived) |
| LatheLoRAModelRegistryEngine.ts | LoRA | LoRA model registry (name-derived) |
| LatheLoRAModelSelectorEngine.ts | LoRA | LoRA model selector (name-derived) |
| LatheLoRAHealthMonitorEngine.ts | LoRA | LoRA health monitor (name-derived) |
| LatheLoRAMonitoringEngine.ts | LoRA | LoRA monitoring (name-derived) |
| LatheLoRAResourceManagerEngine.ts | LoRA | LoRA resource manager (name-derived) |
| LatheLoRAAdaptiveRefinementEngine.ts | LoRA | LoRA adaptive refinement (name-derived) |
| LatheLoRAAttentionAnalyzerEngine.ts | LoRA | LoRA attention analyzer (name-derived) |
| LatheAutoQuoteFromPrintEngine.ts | ERP/Production | Print-to-quote (feeds quoting galaxy) |
| LatheActualCostReconciliationEngine.ts | ERP/Production | Quoted-vs-actual cost reconciliation |
| LatheActualFeedbackTuningEngine.ts | ERP/Production | Actual-feedback tuning (name-derived) |
| LatheProgrammingCostEngine.ts | ERP/Production | Programming cost model (name-derived) |
| LathePartCostModelEngine.ts | ERP/Production | Part cost model (name-derived) |
| LatheJobProfitabilityAnalyticsEngine.ts | ERP/Production | Job profitability analytics (name-derived) |
| LatheERPOrchestratorEngine.ts | ERP/Production | ERP orchestrator (name-derived) |
| LatheJobSchedulingEngine.ts | ERP/Production | Job scheduling (name-derived) |
| LatheCustomerOrderLifecycleEngine.ts | ERP/Production | Customer order lifecycle (name-derived) |
| LathePurchaseOrderAutomationEngine.ts | ERP/Production | Purchase-order automation (name-derived) |
| LatheInventoryIntelligenceEngine.ts | ERP/Production | Inventory intelligence (name-derived) |
| LathePerformanceSLORegistryEngine.ts | ERP/Production | Performance-SLO registry (name-derived) |
| LatheAuxAxisTimingEngine.ts | Physics | Auxiliary-axis timing analysis (name-derived) |
| LatheBirdNestPredictorEngine.ts | Physics | Chip bird-nest predictor (name-derived) |

_Note: a handful of engines appear under more than one plausible category (e.g. `LatheSelfAwarenessIntegrationEngine` spans AI + integration). Where a duplicate row appears it is annotated "(see above)". "(name-derived)" one-liners are inferred from the file name grounded in the lathe CLAUDE.md sub-domain map and were NOT read header-by-header this session -- treat as advisory, not verified body content (R12)._

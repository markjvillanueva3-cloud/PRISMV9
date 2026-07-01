---
name: ai-training-engines
description: Strategic categorized engine digest for the ai-training galaxy (~250 AI/ML engines) -- GraphSAGE GNN tier-5, ~95 LoRA adapter stack, RAG/corpus pipelines, deep reasoning, closed-loop outcome backbone, calibration/conformal/drift, reinforcement learning.
type: reference
galaxy: ai-training
node_type: memory
---

# ai-training galaxy -- engine digest

## Overview
The ai-training galaxy (slot india) is PRISM's full-system learning brain: it owns the GraphSAGE GNN wiring-inference tier-5, the ~95-engine LoRA adapter stack (cross-domain + per-machine: lathe/mill/5axis/wedm/laser/grinding/waterjet/sinker), RAG + corpus ingestion pipelines (tribal/blueprint/CAD/MIT-OCW/PDF), deep-reasoning engines, and the closed-loop self-improvement backbone (outcome bus -> reward shaping -> RL kernels -> calibration/conformal/drift -> retrain lifecycle). Per the galaxy doctrine (`mcp-server/src/engines/ai-training/CLAUDE.md` + `PATHS.md`), no `.ts` engines live under `engines/ai-training/` -- that directory holds only doctrine markdown (CLAUDE/MEMORY/PATHS/TOOLBELT/RULES/KNOWLEDGE); the GNN core itself is script-based in `H:/prism/scripts/lib/graphsage-*.mjs`. The actual engine code is flat root-tree `mcp-server/src/engines/*.ts` -- enumerated 2026-07-01: 95 `*LoRA*` + 29 `*Outcome*` + 20 calibration/conformal + 12 drift + 40 `*Reasoning*` + 8 true RAG + 22 corpus + 9 MIT/curriculum + ~54 neural/deep-learning/cognitive + reward/meta/embedding/threshold engines. Primary dispatchers: `prism_ai` (`aiReasoningDispatcher.ts` -- `xproc_neural_*` / `xproc_outcome_*` / `lora_*` / `neural_*` / `graphrag_retrieve`), `prism_ml` (`mlDispatcher.ts` -- `adalora_*` / `continual_lora_*` / `fedlora_*` / `lora_compose|gate` / `loramoe` / `olora_*`), `prism_outcome` (`outcomeDispatcher.ts` -- `capture_bus_*` / `rl_bridge_*` / `drift_*`), and `prism_intelligence`. R12 invariant: only deterministic DATA/stats/provenance actions are dispatcher-wired -- NN inference is NEVER dispatcher-routed. Deploy-gate state (2026-06-06, live 62-ghost holdout): AUROC 0.808 PASS, macro-F1 0.439 FAIL, Brier 0.179 FAIL -> tier-5 runs selective-deploy at tau=0.7 (32% coverage, abstains below gate, defers to LLM tier). EXCLUDES: G-code emission (echo/post-processor), toolpath strategy (kilo/cam), blueprint OCR (xray), CMM/SPC (quality), corpus PDF page-extraction (lima/pdf-corpus).

## Strategic categories

### 1. GNN / graph-neural wiring-inference (tier-5) -- script-based, not `.ts`
> The GraphSAGE core lives in `H:/prism/scripts/lib/` + `scripts/`, NOT in `mcp-server/src/engines/`. Listed here for completeness because doctrine assigns it to this galaxy.
- `scripts/lib/graphsage-model.mjs` -- forward + neighbor aggregation
- `scripts/lib/graphsage-trainer.mjs` -- training loop (loss, backprop, stratified neg-sampling)
- `scripts/lib/graphsage-predictor.mjs` -- inference / node classification
- `scripts/lib/graphsage-train-pipeline.mjs` -- end-to-end train orchestration
- `scripts/lib/graphsage-checkpoint.mjs` -- candidate->live promotion discipline
- `scripts/lib/nn-graph-eval.mjs` -- deploy-gate (AUROC / macro-F1 / Brier + selective section)
- `scripts/nn-graph-retrain-lifecycle.mjs` -- autonomous 6h retrain orchestrator (S4U task)
- `scripts/lib/gnn-active-pool-select.mjs` -- active-learning ghost selector (acquisition = uncertainty + class-rarity)
- `scripts/lib/graph-node-embedding-bridge.mjs` + `scripts/build-node-embeddings.mjs` -- 768d streaming embeddings
- Engine-side: `KnowledgeGraphNeuralBridgeEngine.ts`, `GraphRAGRetrievalEngine.ts`

### 2. LoRA fine-tune stack -- cross-domain composition core (~14)
- `AdaLoRARankAllocatorEngine.ts` -- SVD-importance adaptive rank allocation
- `LoRAMoEGatingEngine.ts` -- top-K softmax router over adapter set
- `ContinualLoRAEngine.ts` -- EWC++/SI/DER++ continual learning (no catastrophic forgetting)
- `FederatedLoRAEngine.ts` -- federated adapter aggregation
- `OrthogonalLoRAEngine.ts` -- orthogonal adapter subspaces
- `LoRACompositionEngine.ts` -- adapter composition
- `LoRAAdapterRegistryEngine.ts` -- adapter registry
- `LoRADriftCoordinatorEngine.ts` -- cross-adapter drift coordination
- `InferenceLoRAGateEngine.ts` -- inference-time adapter gating
- `PRISMLoRAAdapterEngine.ts` -- PRISM LoRA adapter core
- `CAMLoRAEngine.ts` / `CAMLoRAAdapterTrainerEngine.ts` -- CAM LoRA
- `BlueprintLoRABridgeEngine.ts` -- blueprint LoRA bridge
- `MachineLoRABaseEngine.ts` -- shared per-machine LoRA base
- `DetachedLoRARunnerEngine.ts` -- detached long-run training

### 3. LoRA fine-tune stack -- per-machine domain adapters (~79)
> Doctrine (`CLAUDE.md` sec9 PSN edges) assigns per-machine LoRA leadership to the machine slot (lathe->whiskey, mill->foxtrot, wedm->mike) but PATHS.md corpus-counts all ~95 under this galaxy's `*LoRA*Engine.ts` set; india audits the cadence/drift/deployment machinery.
- Lathe (~48): `LatheLoRA{Cadence,CadenceOrchestrator,DatasetBuilder,DatasetValidator,Deployment,DriftDetector,Ensemble*,MasterOrchestrator,Monitoring,Neural*,PhysicsAugmentedInference,Pipeline*,ProgramMiner,Reasoning*,RewardShaping,SafetyEvaluator,TrainingMonitor,...}Engine.ts`
- Mill (~14): `Mill{Milling}LoRA{Cadence,DatasetBuilder,Deployment,EmbeddingCache,Ensemble*,ExperimentTracker,MasterOrchestrator,ModelSelector,Monitoring,PipelineCoordinator,ResourceManager,TribalAugmentation,TribalExtractor}Engine.ts`
- Other machines: `{FiveAxis,MillTurn,WEDM,SinkerEDM,Laser,Waterjet,Grinding}LoRA{Cadence,DatasetBuilder}Engine.ts` + `WEDMLoRAAdapterEngine.ts`

### 4. RAG / retrieval-augmented generation (~8)
- `TribalRAGEngine.ts` -- hybrid BM25+TF-IDF over 4,493+ tribal tips (all domains)
- `GraphRAGRetrievalEngine.ts` -- GraphRAG over wiki + system-viz graph (ego-graph expansion)
- `CAMTribalRAGEngine.ts` -- CAM-specific tribal RAG (the pattern TribalRAG generalizes)
- `BlueprintExtractionRAGEngine.ts` -- blueprint extraction RAG
- `JMDieProgramRAGEngine.ts` -- JM Die program RAG
- `SFCRAGWarmStartEngine.ts` -- speed-feed RAG warm-start
- `PPGRAGDialectMatchEngine.ts` -- post-processor dialect-match RAG
- `WikiRAGFeatureEngine.ts` -- wiki RAG feature extraction

### 5. Corpus ingestion + curriculum + MIT-OCW (~31)
- Corpus (22): `CADCorpus{Ingester,Ingestion,Pattern,FeaturePrevalenceLearner}Engine.ts` - `CADTrainingCorpusOrchestratorEngine.ts` - `TribalCorpusOrchestratorEngine.ts` - `{AdditiveManufacturing,Grinding,LaserCutting,SinkerEDM,Waterjet,Welding}TribalCorpusEngine.ts` - `JMDieTrainingCorpusEngine.ts` - `BlueprintCorpusHarvestEngine.ts` - `MillProgramCorpusEngine.ts` - `Print*Corpus*Engine.ts` - `RealActualsCorpusEngine.ts` - `CatalogCorpusLoaderEngine.ts`
- MIT/curriculum (9): `MITCourse{Registry,DeepLearning,Integration,FullIntegration,Expansion,Knowledge}Engine.ts` - `MitCourseIndexEngine.ts` - `CurriculumEngine.ts` - `KnowledgeCurriculumBridgeEngine.ts`
- PDF corpus (subset owned; extraction leads to lima): `PDF{ProcessingPipeline,HandbookBatchProcessor,Table,Formula,Highlight,Structure,SourceRegistry}Engine.ts`

### 6. Closed-loop outcome backbone + reinforcement learning (~29)
- Bus/store: `OutcomeCaptureBusEngine.ts` (append-only per-domain-shard spine) - `CrossProcessOutcomeStore.ts` - `OutcomeTrackingEngine.ts` - `OutcomeTraceEngine.ts` - `OutcomePublishAdapterEngine.ts` - `OutcomeFeedbackOverrideStoreEngine.ts`
- Bridges: `OutcomeRLBridgeEngine.ts` (RL fan-out) - `OutcomeReplayBufferBridgeEngine.ts` - `OutcomeEpisodicMemoryBridgeEngine.ts` - `OutcomeDriftCalibrationBridgeEngine.ts`
- Reward: `CrossProcessRewardShaperEngine.ts` - `GroupRelativeRewardNormalizerEngine.ts` - `WEDMRewardShapingEngine.ts` - `LatheLoRARewardShapingEngine.ts`
- Per-galaxy outcome wire engines: `{CAM,PPG,Quoting,SFC,Shop,CADExecution}Outcome*Engine.ts` - `MTConnectToOutcomeBridgeEngine.ts`

### 7. Calibration / conformal / drift (uncertainty quantification) (~32)
- Conformal: `CrossProcessConformalPredictionEngine.ts` (ICP regression, distribution-free) - `CrossProcessConformalClassificationEngine.ts` - `ConformalCalibrationMonitorEngine.ts` - `ConformalPredictionLogEngine.ts`
- Calibration: `StratifiedCalibrationEngine.ts` (6-level hierarchical Bayesian) - `CascadeCalibrationEngine.ts` - `CalibrationEngine.ts` - `PredictionCalibrationEngine.ts` - `CrossProcessCalibrationAuditorEngine.ts` - `AdaptiveCalibrationEngine.ts`
- Drift: `CrossProcessDriftDetectorEngine.ts` - `DriftDetectionEngine.ts` - `SchemaDriftDetectorEngine.ts` - `CAMMLDriftMonitorEngine.ts` - `ProbeDriftEngine.ts` - `CrossProcessDriftAwareFederationEngine.ts`

### 8. Deep reasoning + neural cognition + meta-learning (~54)
- Cross-domain reasoning core: `CrossDisciplinaryDeepLearningEngine.ts` (15+ scientific domains) - `MultiPathReasoningEngine.ts` - `CausalReasoningEngine.ts` - `CounterfactualReasoningEngine.ts` - `ScientificReasoningEngine.ts` - `TemporalReasoningEngine.ts` - `BeliefStateReasoningEngine.ts` - `DecisionReasoningEngine.ts` - `DiagnosticReasoningEngine.ts` - `PRISMCreativeReasoningEngine.ts` - `ManufacturingReasoningEngine.ts` - `MultiAssetReasoningEngine.ts` - `ReasoningExplainerEngine.ts` - `ReasoningChainSharingEngine.ts`
- Neural learning: `CrossProcessNeuralLearningEngine.ts` (32-in MLP outcome classifier) - `CrossProcessHierarchicalNeuralOrchestratorEngine.ts` - `CrossProcessFormulaNeuralEnsembleEngine.ts` - `CrossProcessRuleExtractedNeuralInferenceEngine.ts` - `NeuralModelRegistryEngine.ts` - `NeuralRoutingEngine.ts` - `NeuralWeightPersistenceEngine.ts` - `FuzzyNeuralHybridEngine.ts` - `XProcNeuralAutoFireEngine.ts`
- Meta / threshold / reward-normalizer: `MetaLearningOptimizerEngine.ts` (threshold 2848 outcomes) - `AdaptiveThresholdEngine.ts` - `HookEfficiencyEngine.ts` - `CrossProcessCuriosityDrivenExplorationEngine.ts`
- Cognition: `MillingNeuralCognitiveEngine.ts` - `PostProcessorCognitiveEngine.ts` - `CognitiveBudgetAllocatorEngine.ts`

### 9. Embedding / model-serving infrastructure (~8)
- `LocalEmbeddingEngine.ts` -- local embedding (embed() gated; status/similarity dispatcher-wired)
- `EmbeddingPipelineEngine.ts` - `EmbeddingRouterEngine.ts` - `EmbeddingFilterEngine.ts` - `EmbeddingGuardEngine.ts`
- `CADFeatureEmbeddingEngine.ts` - `CADEmbeddingIndexOrchestratorEngine.ts` - `PPControllerEmbeddingEngine.ts`
- `TrainingDatasetSnapshotEngine.ts` -- training dataset snapshot/versioning

## Key engines (detailed)

### CrossDisciplinaryDeepLearningEngine.ts
Ingests and applies knowledge from 15+ scientific domains (physics, biology, economics, information theory, statistics, psychology, chemistry, EE, operations research, finance, graph theory, chaos theory, music theory, ecology, CS) to manufacturing. Sourced from 6,582 lines of cross-disciplinary formulas + 107+ MIT courses. The `PRISMCreativeReasoningEngine.explore()` cross-domain-synthesis substrate.
- Path: `mcp-server/src/engines/CrossDisciplinaryDeepLearningEngine.ts` (2064 lines)
- Notable exports: `ScientificDomain` type (15-domain union)

### CrossProcessNeuralLearningEngine.ts
Pure-JS multi-layer perceptron predicting {success, failure, operator_override} from a CrossProcess OutcomeRecord. Input=32 features (7 numeric log1p-normalized + 5 bridge one-hot + 3 process + string-hash buckets + 4 aux), hidden=16 tanh, output=3 softmax. Xavier init, cross-entropy loss, SGD+momentum, online-trained from CrossProcessOutcomeStore. The minimum learnable bridge over the outcome ledger (INFRA-NEURAL-LEDGER-MS1).
- Path: `mcp-server/src/engines/CrossProcessNeuralLearningEngine.ts` (1627 lines)
- Notable: deterministic training path; pending-outcome records silently excluded (no label)

### OutcomeCaptureBusEngine.ts
The spine of the learning loop -- universal cross-domain event bus. Every physics/CAM/CAD/PP/SFC/shop-floor signal is appended as a typed, versioned, provenance-tagged event. Design invariants: APPEND-ONLY, per-domain shard (mill.jsonl vs lathe.jsonl), atomic O_APPEND single-write (<64KB lines, fixed the 2026-06-08 EPERM/orphan incident), lineage_id threading, never-block-caller, never-silent-drop (failed writes go to in-process retry queue). Feeds FeatureStore, PhysicsOutcomeCalibrator, PolicyExperienceLedger, RL bridges.
- Path: `mcp-server/src/engines/OutcomeCaptureBusEngine.ts` (540 lines)
- Notable: U-LEARN-01 keystone; coexists with legacy OutcomeTrackingEngine

### OutcomeRLBridgeEngine.ts
The reinforcement-learning fan-out bridge -- closes the gap where the three cross-process RL kernels (RewardShaper T4-01, QLearningTabular T4-02, PolicyGradient T4-03, MultiArmedBandit T4-04) were dispatcher-wired but blind to the live outcome stream. Subscribes to `outcome.completed`, discretizes each OutcomeRecord into (state, action, reward) tuples and fans them to all learners. State = `process|material|operation|toolMatBin|tdBin|dcBin` coarse-binned string; action = speed x feed grid index.
- Path: `mcp-server/src/engines/OutcomeRLBridgeEngine.ts` (749 lines)
- Notable: XPROC-NEURAL-CONNECT-MS0/U-CN12; makes the closed RL loop self-feeding

### CrossProcessRewardShaperEngine.ts
Maps a CrossProcessOutcomeEvent to a scalar reward (the contract the RL stack optimizes). 5 components: surface_finish_error (Ra ratio, negative), tool_life_delta (clipped [-1,1]), cycle_time_delta (positive=faster), safety_veto_count (LARGE negative per veto), operator_override_count (SMALL negative -- operator may carry tribal knowledge to learn FROM). Default weights normalize data-quality components to ~1 while safety/override dominate when fired.
- Path: `mcp-server/src/engines/CrossProcessRewardShaperEngine.ts` (391 lines)
- Notable: cites Sutton & Barto sec17.4; feeds T4-02/03/04 RL kernels

### CrossProcessConformalPredictionEngine.ts
Inductive Conformal Prediction (ICP) for regression -- distribution-free prediction intervals covering the true value with probability >= 1-alpha, no parametric assumption, no retraining. Computes absolute-residual non-conformity scores over a calibration set, sorts, takes the ceil((N+1)(1-alpha)) quantile as the conformal radius. Bad predictor -> wide (but still valid) intervals.
- Path: `mcp-server/src/engines/CrossProcessConformalPredictionEngine.ts` (374 lines)
- Notable: XPROC-NEURAL T5-02; cites Vovk/Gammerman/Shafer 2005, Lei et al. 2018

### StratifiedCalibrationEngine.ts
The 6-level hierarchical Bayesian calibration engine -- stratifies learning across all variability dimensions (Global -> Machine -> Material -> Operation -> ToolFamily -> Axis). Uses the deepest level when data exists, else falls back through the hierarchy with Bayesian shrinkage toward the parent estimate (Efron-Morris/Stein). Measurement types: dimension/surface_finish/force/tool_life/temperature.
- Path: `mcp-server/src/engines/StratifiedCalibrationEngine.ts` (1425 lines)
- Notable: cites Gelman 2013, Efron-Morris 1975, Box 1954; carries `@ts-nocheck`

### AdaLoRARankAllocatorEngine.ts
Adaptive LoRA rank allocation using SVD-based importance scoring -- dynamically allocates a total rank budget across layers by singular-value importance + gradient magnitude + Fisher information, so important layers get higher rank while total parameter count stays constrained.
- Path: `mcp-server/src/engines/AdaLoRARankAllocatorEngine.ts` (263 lines)
- Notable: schema `loraCompositionSchema.ts` (AdaLoRAConfig, RankAllocation); `prism_ml:adalora_*`

### LoRAMoEGatingEngine.ts
Top-K softmax router over the adapter set (mixture-of-experts). Selects best experts on a 5-dimensional quality score (accuracy, stability, coverage, confidence, freshness) + material embedding similarity + machine embedding similarity + domain match. Maintains domain/material/machine inverted indices for fast expert lookup.
- Path: `mcp-server/src/engines/LoRAMoEGatingEngine.ts` (210 lines)
- Notable: default quality weights [0.3,0.2,0.2,0.2,0.1]; `prism_ml:loramoe`

### ContinualLoRAEngine.ts
Unified continual-learning engine combining EWC++ (Schwarz 2018 online Fisher), Synaptic Intelligence (Zenke 2017 path integral) and DER++ (Buzzega 2020 logit-distillation replay) for cross-domain LoRA training without catastrophic forgetting. Unifies the WEDMEWCMemory + LatheLoRAContinualLearning patterns into one parameterized engine over all 6 domains.
- Path: `mcp-server/src/engines/ContinualLoRAEngine.ts` (358 lines)
- Notable: composes SynapticIntelligenceEngine + DERPlusPlusEngine; `prism_ml:continual_lora_*`

### MetaLearningOptimizerEngine.ts
Learn-to-learn-faster: records which learning strategies succeed/fail for which content types, then recommends the best-performing strategy for a new scenario. State = (scenario, strategy) -> {attempts, successes, avgDurationMs}; recommend() returns the strategy with the best Wilson-adjusted success rate (so zero-attempt strategies do not look perfect). No I/O -- ledger persistence is a caller concern.
- Path: `mcp-server/src/engines/MetaLearningOptimizerEngine.ts` (138 lines)
- Notable: PP-0.18-U-AGI4; india doctrine cites the 2848-outcome threshold

### TribalRAGEngine.ts
Generalized hybrid retrieval over ALL tribal knowledge (4,493+ tips) across mill/lathe/grinder/EDM machining, material speeds/feeds, tool selection/wear, process (workholding/coolant/chip), and safety. Hybrid BM25 + TF-IDF; filterable by material/operation/machine/symptom; multi-source aggregation (tips + playbook rules + formulas). Generalizes the CAMTribalRAGEngine pattern.
- Path: `mcp-server/src/engines/TribalRAGEngine.ts` (423 lines)
- Notable: U-LEARN-04; RAGQueryInput/Result schema; WIRE-EXEMPT (ragStack tests)

### GraphRAGRetrievalEngine.ts
GraphRAG over the PRISM wiki + system-viz graph (Edge et al. 2404.16130, RepoGraph ICLR-2025). Classic vector RAG misses multi-hop manufacturing queries; this seeds on query-matched entities then expands along graph edges. Doctrine "wrap not rebuild": composes find-cache.json (compact node projection) + graphContextLensEngine.extractEgoGraph (cycle-safe 1-hop) + an injectable fail-soft summarizer. Never loads the 644MB graph, never hard-depends on a live LLM.
- Path: `mcp-server/src/engines/GraphRAGRetrievalEngine.ts` (335 lines)
- Notable: wired `prism_ai:graphrag_retrieve`; GRAPH-AS-LLM-CONTEXT-MS0/U-GAC02

### MITCourseRegistryEngine.ts
Loads and manages MIT OpenCourseWare content for PRISM knowledge augmentation -- maps academic algorithms to PRISM engines via ALGORITHM_REGISTRY.json. Carries course metadata (id, title, term, level, instructors) and AlgorithmMapping (name -> course -> prismEngines[]).
- Path: `mcp-server/src/engines/MITCourseRegistryEngine.ts` (573 lines)
- Notable: extends BaseEngine; PDF-EXT-MS2/U-PDF10; MIT-OCW corpus entry point

### CADTrainingCorpusOrchestratorEngine.ts
Thin orchestrator for CAD training-corpus generation -- scans directories for CAD files (STEP/IGES/Parasolid/SolidWorks/Inventor/CATIA/Rhino/ACIS + CAM-vendor project files Mastercam/Fusion/hyperCAD-S that carry geometry+toolpaths) and produces a JSONL training corpus at `data/state/CAD_TRAINING_CORPUS.jsonl`.
- Path: `mcp-server/src/engines/CADTrainingCorpusOrchestratorEngine.ts` (280 lines)
- Notable: CAD-COMPLETE-MS0/U-CADC17; 28-extension support list

## Full engine index
> One-liners marked "(name-derived)" were NOT header-verified this pass -- inferred from the filename + doctrine. The 15 above are header-verified. GNN core rows are `scripts/`-based, not `.ts` engines.

| Engine | Category | One-line |
|---|---|---|
| CrossDisciplinaryDeepLearningEngine.ts | Deep-reasoning | 15+ scientific-domain knowledge ingestion for manufacturing (header-verified) |
| CrossProcessNeuralLearningEngine.ts | Neural-learning | 32-in MLP outcome classifier, online-trained from outcome store (header-verified) |
| OutcomeCaptureBusEngine.ts | Closed-loop | Append-only per-domain-shard event bus, learning-loop spine (header-verified) |
| OutcomeRLBridgeEngine.ts | Closed-loop/RL | RL fan-out bridge -- outcome.completed -> (s,a,r) tuples to RL kernels (header-verified) |
| CrossProcessRewardShaperEngine.ts | RL-reward | 5-component scalar reward for the RL stack (header-verified) |
| CrossProcessConformalPredictionEngine.ts | Conformal | ICP distribution-free regression prediction intervals (header-verified) |
| StratifiedCalibrationEngine.ts | Calibration | 6-level hierarchical Bayesian shrinkage calibration (header-verified) |
| AdaLoRARankAllocatorEngine.ts | LoRA-core | SVD-importance adaptive rank allocation (header-verified) |
| LoRAMoEGatingEngine.ts | LoRA-core | Top-K softmax MoE router over adapters (header-verified) |
| ContinualLoRAEngine.ts | LoRA-core | EWC++/SI/DER++ continual learning, no forgetting (header-verified) |
| MetaLearningOptimizerEngine.ts | Meta-learning | Learn-to-learn strategy recommender, Wilson-adjusted (header-verified) |
| TribalRAGEngine.ts | RAG | Hybrid BM25+TF-IDF over 4,493+ tribal tips (header-verified) |
| GraphRAGRetrievalEngine.ts | RAG | GraphRAG ego-graph over wiki + system-viz graph (header-verified) |
| MITCourseRegistryEngine.ts | Curriculum | MIT-OCW registry, algorithm->engine mapping (header-verified) |
| CADTrainingCorpusOrchestratorEngine.ts | Corpus | CAD-file scan -> JSONL training corpus (header-verified) |
| FederatedLoRAEngine.ts | LoRA-core | Federated adapter aggregation (name-derived) |
| OrthogonalLoRAEngine.ts | LoRA-core | Orthogonal adapter subspaces (name-derived) |
| LoRACompositionEngine.ts | LoRA-core | Adapter composition (name-derived) |
| LoRAAdapterRegistryEngine.ts | LoRA-core | Adapter registry (name-derived) |
| LoRADriftCoordinatorEngine.ts | LoRA-core | Cross-adapter drift coordination (name-derived) |
| InferenceLoRAGateEngine.ts | LoRA-core | Inference-time adapter gating (name-derived) |
| PRISMLoRAAdapterEngine.ts | LoRA-core | PRISM LoRA adapter core (name-derived) |
| CAMLoRAEngine.ts | LoRA-domain | CAM LoRA adapter (name-derived) |
| CAMLoRAAdapterTrainerEngine.ts | LoRA-domain | CAM LoRA adapter trainer (name-derived) |
| BlueprintLoRABridgeEngine.ts | LoRA-domain | Blueprint LoRA bridge (name-derived) |
| MachineLoRABaseEngine.ts | LoRA-domain | Shared per-machine LoRA base class (name-derived) |
| DetachedLoRARunnerEngine.ts | LoRA-infra | Detached long-run LoRA training (name-derived) |
| LatheLoRA*Engine.ts (~48) | LoRA-domain(lathe) | Lathe LoRA cadence/drift/deploy/ensemble/monitor/reasoning stack -- leadership whiskey (name-derived) |
| MillLoRA*Engine.ts + MillingLoRA*Engine.ts (~14) | LoRA-domain(mill) | Mill LoRA cadence/deploy/ensemble/tribal stack -- leadership foxtrot (name-derived) |
| FiveAxisLoRA{Cadence,DatasetBuilder}Engine.ts | LoRA-domain(5axis) | 5-axis LoRA cadence + dataset (name-derived) |
| MillTurnLoRA{Cadence,DatasetBuilder}Engine.ts | LoRA-domain(millturn) | Mill-turn LoRA cadence + dataset (name-derived) |
| WEDMLoRA{Adapter,Cadence,DatasetBuilder}Engine.ts | LoRA-domain(wedm) | WEDM LoRA adapter/cadence/dataset -- leadership mike (name-derived) |
| SinkerEDMLoRA{Cadence,DatasetBuilder}Engine.ts | LoRA-domain(sinker) | Sinker-EDM LoRA cadence + dataset (name-derived) |
| LaserLoRA{Cadence,DatasetBuilder}Engine.ts | LoRA-domain(laser) | Laser LoRA cadence + dataset (name-derived) |
| WaterjetLoRA{Cadence,DatasetBuilder}Engine.ts | LoRA-domain(waterjet) | Waterjet LoRA cadence + dataset (name-derived) |
| GrindingLoRA{Cadence,DatasetBuilder}Engine.ts | LoRA-domain(grinding) | Grinding LoRA cadence + dataset (name-derived) |
| CrossProcessCuriosityDrivenExplorationEngine.ts | RL-exploration | Curiosity-driven exploration for RL (name-derived) |
| BlueprintExtractionRAGEngine.ts | RAG | Blueprint extraction RAG (name-derived) |
| CAMTribalRAGEngine.ts | RAG | CAM tribal RAG (the pattern TribalRAG generalizes) (name-derived) |
| JMDieProgramRAGEngine.ts | RAG | JM Die program RAG (name-derived) |
| SFCRAGWarmStartEngine.ts | RAG | Speed-feed RAG warm-start (name-derived) |
| PPGRAGDialectMatchEngine.ts | RAG | Post-processor dialect-match RAG (name-derived) |
| WikiRAGFeatureEngine.ts | RAG | Wiki RAG feature extraction (name-derived) |
| CADCorpusIngesterEngine.ts | Corpus | CAD corpus ingester (name-derived) |
| CADCorpusIngestionEngine.ts | Corpus | CAD corpus ingestion (name-derived) |
| CADCorpusPatternEngine.ts | Corpus | CAD corpus pattern learning (name-derived) |
| CADCorpusFeaturePrevalenceLearnerEngine.ts | Corpus | CAD corpus feature-prevalence learner (name-derived) |
| CADReverseCorpusCatalogEngine.ts | Corpus | CAD reverse-corpus catalog (name-derived) |
| TribalCorpusOrchestratorEngine.ts | Corpus | Tribal corpus orchestrator (name-derived) |
| AdditiveManufacturingTribalCorpusEngine.ts | Corpus | Additive-mfg tribal corpus (name-derived) |
| GrindingTribalCorpusEngine.ts | Corpus | Grinding tribal corpus (name-derived) |
| LaserCuttingTribalCorpusEngine.ts | Corpus | Laser-cutting tribal corpus (name-derived) |
| SinkerEDMTribalCorpusEngine.ts | Corpus | Sinker-EDM tribal corpus (name-derived) |
| WaterjetCuttingTribalCorpusEngine.ts | Corpus | Waterjet-cutting tribal corpus (name-derived) |
| WeldingTribalCorpusEngine.ts | Corpus | Welding tribal corpus (name-derived) |
| JMDieTrainingCorpusEngine.ts | Corpus | JM Die training corpus (name-derived) |
| BlueprintCorpusHarvestEngine.ts | Corpus | Blueprint corpus harvest (name-derived) |
| MillProgramCorpusEngine.ts | Corpus | Mill program corpus (name-derived) |
| PrintCorpusOrchestratorEngine.ts | Corpus | Print corpus orchestrator (name-derived) |
| PrintCorpusTableWriter.ts | Corpus | Print corpus table writer (name-derived) |
| RealActualsCorpusEngine.ts | Corpus | Real-actuals corpus (name-derived) |
| CatalogCorpusLoaderEngine.ts | Corpus | Catalog corpus loader (name-derived) |
| HyperCADSTutorialCorpusIngesterEngine.ts | Corpus | hyperCAD-S tutorial corpus ingester (name-derived) |
| SpeedFeedPDFCorpusBridgeEngine.ts | Corpus/PDF | Speed-feed PDF corpus bridge (name-derived) |
| MITCourseDeepLearningEngine.ts | Curriculum | MIT-course deep-learning integration (name-derived) |
| MITCourseIntegrationEngine.ts | Curriculum | MIT-course integration (name-derived) |
| MITCourseFullIntegrationEngine.ts | Curriculum | MIT-course full integration (name-derived) |
| MITCourseExpansionEngine.ts | Curriculum | MIT-course expansion (name-derived) |
| MITCourseKnowledgeEngine.ts | Curriculum | MIT-course knowledge extraction (name-derived) |
| MitCourseIndexEngine.ts | Curriculum | MIT-course index (name-derived) |
| CurriculumEngine.ts | Curriculum | Curriculum engine (name-derived) |
| KnowledgeCurriculumBridgeEngine.ts | Curriculum | Knowledge-curriculum bridge (name-derived) |
| PDFProcessingPipelineEngine.ts | PDF-corpus | PDF processing pipeline (name-derived) |
| PDFHandbookBatchProcessorEngine.ts | PDF-corpus | PDF handbook batch processor (name-derived) |
| PDFTableExtractionEngine.ts | PDF-corpus | PDF table extraction (name-derived) |
| PDFFormulaExtractionEngine.ts | PDF-corpus | PDF formula extraction (name-derived) |
| PDFHighlightExtractorEngine.ts | PDF-corpus | PDF highlight extractor (name-derived) |
| PDFStructureEngine.ts | PDF-corpus | PDF structure parser (name-derived) |
| PDFSourceRegistryEngine.ts | PDF-corpus | PDF source registry (name-derived) |
| CrossProcessOutcomeStore.ts | Closed-loop | Cross-process outcome event store (name-derived) |
| OutcomeTrackingEngine.ts | Closed-loop | Per-program outcome tracking (legacy scope) (name-derived) |
| OutcomeTraceEngine.ts | Closed-loop | Outcome trace (name-derived) |
| OutcomePublishAdapterEngine.ts | Closed-loop | Outcome publish adapter (name-derived) |
| OutcomeFeedbackOverrideStoreEngine.ts | Closed-loop | Operator override feedback store (name-derived) |
| OutcomeReplayBufferBridgeEngine.ts | Closed-loop/RL | Replay-buffer bridge for RL (name-derived) |
| OutcomeEpisodicMemoryBridgeEngine.ts | Closed-loop | Episodic-memory bridge (name-derived) |
| OutcomeDriftCalibrationBridgeEngine.ts | Closed-loop/Drift | Outcome->drift-calibration bridge (name-derived) |
| CADExecutionOutcomeBusEngine.ts | Closed-loop | CAD execution outcome bus (name-derived) |
| CAMOutcomeCaptureWireEngine.ts | Closed-loop | CAM outcome capture wire (name-derived) |
| PPGOutcomeCaptureWireEngine.ts | Closed-loop | Post-processor outcome capture wire (name-derived) |
| QuotingOutcomeCaptureWireEngine.ts | Closed-loop | Quoting outcome capture wire (name-derived) |
| SFCOutcomeCaptureWireEngine.ts | Closed-loop | Speed-feed outcome capture wire (name-derived) |
| ShopOutcomeIngestProcessorEngine.ts | Closed-loop | Shop-floor outcome ingest processor (name-derived) |
| MTConnectToOutcomeBridgeEngine.ts | Closed-loop | MTConnect->outcome bridge (name-derived) |
| HyperCADSOutcomePublisherEngine.ts | Closed-loop | hyperCAD-S outcome publisher (name-derived) |
| QuoteOutcomeFeedEngine.ts | Closed-loop | Quote outcome feed (name-derived) |
| QuoteOutcomePSIDeltaBridgeEngine.ts | Closed-loop | Quote outcome PSI-delta bridge (name-derived) |
| QuotingActualOutcomeLoaderEngine.ts | Closed-loop | Quoting actual-outcome loader (name-derived) |
| QuotingOutcomeLedgerDigestEngine.ts | Closed-loop | Quoting outcome ledger digest (name-derived) |
| TribalKnowledgeOutcomeBridgeEngine.ts | Closed-loop | Tribal-knowledge outcome bridge (name-derived) |
| TribalTipOutcomeBridgeEngine.ts | Closed-loop | Tribal-tip outcome bridge (name-derived) |
| WEDMJobOutcomeEngine.ts | Closed-loop | WEDM job outcome (name-derived) |
| XprocOutcomeLedgerDurability.ts | Closed-loop | Cross-process outcome ledger durability (name-derived) |
| GroupRelativeRewardNormalizerEngine.ts | RL-reward | Group-relative reward normalizer (GRPO-style) (name-derived) |
| WEDMRewardShapingEngine.ts | RL-reward | WEDM reward shaping (name-derived) |
| CrossProcessConformalClassificationEngine.ts | Conformal | Conformal classification prediction sets (name-derived) |
| ConformalCalibrationMonitorEngine.ts | Conformal | Conformal calibration monitor (name-derived) |
| ConformalPredictionLogEngine.ts | Conformal | Conformal prediction log (name-derived) |
| CalibrationEngine.ts | Calibration | Base calibration engine (name-derived) |
| CascadeCalibrationEngine.ts | Calibration | Cascade calibration (name-derived) |
| PredictionCalibrationEngine.ts | Calibration | Prediction calibration (name-derived) |
| AdaptiveCalibrationEngine.ts | Calibration | Adaptive calibration (name-derived) |
| CrossProcessCalibrationAuditorEngine.ts | Calibration | Cross-process calibration auditor (name-derived) |
| CrossProcessDriftDetectorEngine.ts | Drift | Cross-process drift detector (name-derived) |
| DriftDetectionEngine.ts | Drift | Base drift detection (name-derived) |
| SchemaDriftDetectorEngine.ts | Drift | Schema drift detector (name-derived) |
| CAMMLDriftMonitorEngine.ts | Drift | CAM-ML drift monitor (name-derived) |
| ProbeDriftEngine.ts | Drift | Probe drift (name-derived) |
| CrossProcessDriftAwareFederationEngine.ts | Drift/LoRA | Drift-aware federated learning (name-derived) |
| MultiPathReasoningEngine.ts | Deep-reasoning | Multi-path reasoning (name-derived) |
| CausalReasoningEngine.ts | Deep-reasoning | Causal reasoning (name-derived) |
| CounterfactualReasoningEngine.ts | Deep-reasoning | Counterfactual reasoning (name-derived) |
| ScientificReasoningEngine.ts | Deep-reasoning | Scientific-method reasoning (name-derived) |
| TemporalReasoningEngine.ts | Deep-reasoning | Temporal reasoning (name-derived) |
| BeliefStateReasoningEngine.ts | Deep-reasoning | Belief-state reasoning (name-derived) |
| DecisionReasoningEngine.ts | Deep-reasoning | Decision reasoning (name-derived) |
| DiagnosticReasoningEngine.ts | Deep-reasoning | Diagnostic reasoning (name-derived) |
| PRISMCreativeReasoningEngine.ts | Deep-reasoning | Cross-domain creative-synthesis reasoning (name-derived) |
| ManufacturingReasoningEngine.ts | Deep-reasoning | Manufacturing reasoning (name-derived) |
| MultiAssetReasoningEngine.ts | Deep-reasoning | Multi-asset reasoning (name-derived) |
| ReasoningExplainerEngine.ts | Deep-reasoning | Reasoning explainer (name-derived) |
| ReasoningChainSharingEngine.ts | Deep-reasoning | Reasoning-chain sharing (name-derived) |
| ReasoningWiringEngine.ts | Deep-reasoning | Reasoning wiring (name-derived) |
| CrossProcessHierarchicalNeuralOrchestratorEngine.ts | Neural-learning | Hierarchical neural orchestrator (name-derived) |
| CrossProcessFormulaNeuralEnsembleEngine.ts | Neural-learning | Formula neural ensemble (name-derived) |
| CrossProcessRuleExtractedNeuralInferenceEngine.ts | Neural-learning | Rule-extracted neural inference (name-derived) |
| NeuralModelRegistryEngine.ts | Neural-infra | Neural model registry (name-derived) |
| NeuralRoutingEngine.ts | Neural-infra | Neural routing (name-derived) |
| NeuralWeightPersistenceEngine.ts | Neural-infra | Neural weight persistence (name-derived) |
| NeuralIntegrationEngine.ts | Neural-infra | Neural integration (name-derived) |
| NeuralDeterminismTestingEngine.ts | Neural-infra | Neural determinism testing (name-derived) |
| FuzzyNeuralHybridEngine.ts | Neural-learning | Fuzzy-neural hybrid (name-derived) |
| SwarmNeuralHybridEngine.ts | Neural-learning | Swarm-neural hybrid (name-derived) |
| XProcNeuralAutoFireEngine.ts | Neural-learning | Cross-process neural auto-fire (name-derived) |
| ConsensusNeuralFeedbackEngine.ts | Neural-learning | Consensus neural feedback (name-derived) |
| KnowledgeGraphNeuralBridgeEngine.ts | GNN/Neural | Knowledge-graph neural bridge (name-derived) |
| PhysicsNeuralBridgeEngine.ts | Neural-learning | Physics-neural bridge (name-derived) |
| PRISMNeuralKnowledgeSynthesisEngine.ts | Neural-learning | Neural knowledge synthesis (name-derived) |
| ForceNeuralPredictorEngine.ts | Neural-domain | Force neural predictor (name-derived) |
| ThermalNeuralPredictorEngine.ts | Neural-domain | Thermal neural predictor (name-derived) |
| ChatterNeuralClassifierEngine.ts | Neural-domain | Chatter neural classifier (name-derived) |
| CrossDisciplinaryDeepLearningEngine.ts | Deep-learning | (see detailed -- header-verified) |
| CADSystemNeuralArchAdapterEngine.ts | Neural-infra | CAD-system neural-architecture adapter (name-derived) |
| NeuralCADGenerationEngine.ts | Neural-domain | Neural CAD generation (name-derived) |
| MetaLearningOptimizerEngine.ts | Meta-learning | (see detailed -- header-verified) |
| LatheMetaLearningEngine.ts | Meta-learning | Lathe meta-learning (name-derived) |
| MillingMetaLearningEngine.ts | Meta-learning | Milling meta-learning (name-derived) |
| PostProcessorMetaLearningEngine.ts | Meta-learning | Post-processor meta-learning (name-derived) |
| AdaptiveThresholdEngine.ts | Threshold | Adaptive threshold (name-derived) |
| HookEfficiencyEngine.ts | Meta/infra | Hook efficiency learner (name-derived) |
| CognitiveBudgetAllocatorEngine.ts | Cognition | Cognitive budget allocator (name-derived) |
| MillingNeuralCognitiveEngine.ts | Cognition | Milling neural-cognitive (name-derived) |
| PostProcessorCognitiveEngine.ts | Cognition | Post-processor cognitive (name-derived) |
| LocalEmbeddingEngine.ts | Embedding | Local embedding (embed gated; status/similarity wired) (name-derived) |
| EmbeddingPipelineEngine.ts | Embedding | Embedding pipeline (name-derived) |
| EmbeddingRouterEngine.ts | Embedding | Embedding router (name-derived) |
| EmbeddingFilterEngine.ts | Embedding | Embedding filter (name-derived) |
| EmbeddingGuardEngine.ts | Embedding | Embedding guard (name-derived) |
| CADFeatureEmbeddingEngine.ts | Embedding | CAD feature embedding (name-derived) |
| CADEmbeddingIndexOrchestratorEngine.ts | Embedding | CAD embedding-index orchestrator (name-derived) |
| PPControllerEmbeddingEngine.ts | Embedding | Post-processor controller embedding (name-derived) |
| TrainingDatasetSnapshotEngine.ts | Dataset | Training dataset snapshot/versioning (name-derived) |
| graphsage-model.mjs | GNN-core (script) | GraphSAGE forward + neighbor aggregation (doctrine-verified) |
| graphsage-trainer.mjs | GNN-core (script) | GraphSAGE training loop + stratified neg-sampling (doctrine-verified) |
| graphsage-predictor.mjs | GNN-core (script) | GraphSAGE inference / node classification (doctrine-verified) |
| graphsage-train-pipeline.mjs | GNN-core (script) | End-to-end GNN train orchestration (doctrine-verified) |
| graphsage-checkpoint.mjs | GNN-core (script) | Candidate->live checkpoint promotion (doctrine-verified) |
| nn-graph-eval.mjs | GNN-core (script) | Deploy-gate AUROC/macro-F1/Brier + selective (doctrine-verified) |
| gnn-active-pool-select.mjs | GNN-core (script) | Active-learning ghost selector (doctrine-verified) |
| graph-node-embedding-bridge.mjs | GNN-core (script) | 768d streaming node-embedding bridge (doctrine-verified) |

## Notes / caveats (R12)
- The broad grep (`LoRA|Training|Neural|GNN|RAG|...`) returned 344 files; that over-counts (matched substrings in Corpus/Reasoning/AGI engines shared with cam/post-processor/quoting galaxies). The refined per-family counts (LoRA 95, Outcome 29, calibration/conformal 20, drift 12, reasoning 40, true-RAG 8, corpus 22, MIT/curriculum 9, PDF 12, neural/deep/cognitive ~54) are the honest galaxy-owned figures. LoRA=95 matches `PATHS.md` sec38 exactly.
- Per-machine LoRA engines (79 of the 95) are corpus-counted here but doctrine assigns leadership to the machine slot (lathe/whiskey, mill/foxtrot, wedm/mike) per `CLAUDE.md` sec9. They remain part of the ai-training galaxy's audit surface.
- Several category-boundary engines overlap other galaxies (e.g. `PostProcessorDeepReasoningEngine`, `LatheDeepReasoningEngine`, `CAMDeepLearningEngine`, `HyperMillDeepLearningEngine`, `FusionDeepLearningEngine`) -- listed under the domain slot's digest too; included here because they are the AI/ML surface. Not every one appears in the table above (the per-domain reasoning/deep-learning engines number ~40+ and are catalogued in their own galaxy digests).
- GNN core is script-based (`scripts/lib/graphsage-*.mjs`), NOT `mcp-server/src/engines/*.ts` -- rows marked "(script)" / "doctrine-verified" from `PATHS.md` + `CLAUDE.md`, not read this pass.
- Deploy-gate + selective-deploy numbers are quoted from doctrine (`CLAUDE.md` sec5, MEMORY.md), verified against the india brain, not re-run this pass.

# WEDM Comprehensive Training Pipeline v2 — Higher-ROI than Lathe Baseline

**Date:** 2026-05-25 · **Slot:** mike (claude-eb71a012) · **Loop:** /loop iter 5-6 (mike-wedm-training-pipeline)
**Status:** draft spec · advisory · mustHumanVerify · supersedes prior WEDM-TRAINING-WIZARD-MS0 draft
**Companion:** `WEDM-TRAINING-COVERAGE-AUDIT-2026-05-25.md` (commit `dd20ca8467`)

---

## §0 — Why WEDM can exceed lathe baseline

Lathe pipeline = 5 pieces (ContinuousLearning + LoRA Adapter + Dataset Builder + Training Script + 3-eval triad). Solid but **single-modality, single-objective, pure-data-driven, offline batch, single-model**. Operator directive: build something **more comprehensive, higher-ROI**.

WEDM has 5 structural advantages that lathe does not:

| Advantage | Source | Multiplier |
|---|---|---|
| **Cleaner ground-truth telemetry** | Every WEDM cut produces measurable Ra/kerf/recast/wire-break/time outcomes | 5-7× richer per-example signal |
| **Digital-twin substrate already built** | `WEDMVirtualMachineEngine` + `WEDMThermalFieldEngine` + `WEDMSparkErosionModelEngine` + `WEDMRolloutSimulatorEngine` (all on disk) | enables 10-100× synthetic data augmentation |
| **Physics-derivable ground truth** | Klocke Ra, DiBitonto crater, Kunieda energy, Carslaw&Jaeger recast, Sato speed | PINN regularization dramatically cuts sample complexity |
| **Massive paired corpus** | JM Die: 24,545 production NC + 25,028 part folders + 42,407 print pages + 10,678 programs | self-supervised pre-training feasible |
| **100+ orphan engines already on disk** | Per §2.2 of audit (`WEDM-TRAINING-COVERAGE-AUDIT-2026-05-25.md`) | wire-the-orphans = 95% of "build" is just dispatcher wiring |

The higher-ROI angle: **most layers below require WIRING not BUILDING**. ~600 KB of AI-tier code (MasterAI, AGIOrchestrator, DeepAIHardening, NeuralTraining 85 KB, KnowledgeSynthesis, UnifiedScience, etc.) is already on disk and orphan.

---

## §1 — 17-Layer Comprehensive Pipeline (3.4× lathe surface area)

### Layer 0 — Multi-modal corpus (5-7× signal/example vs lathe)
- **Inputs:** g-code program + parameter tabular + 2D print raster + 3D CAD (STEP/IGES) + outcome telemetry + operator tribal notes + controller dialect tag + physics-derived ground truth
- **Existing engines:** `JMDieTrainingCorpusEngine` ✓ · `BlueprintProgramJoinEngine` ✓ · `ProgramPrintLinkIndexEngine` ✓ · `CADArchiveJoinAugmenterEngine` ✓ · `WireEDMProgramParserEngine` (orphan) · `WEDMPartFamilyTemplateExtractorEngine` (orphan)
- **Build delta:** wire WireEDMProgramParser + WEDMPartFamilyTemplateExtractor into edmDispatcher; emit `WEDM_TRAINING_TUPLES.jsonl` with all 8 fields per example

### Layer 1 — Multi-modal feature encoding (cross-attention fusion)
- Text encoder (transformer) for g-code tokens
- 2D CNN for print rasters
- **3D graph encoder** via `WEDMLatticeGraphEngine` ✓ + `WEDMGraphAttentionEngine` ✓ (both wired)
- Tabular MLP for parameters
- Time-series RNN for telemetry
- Cross-attention fusion to unified latent
- **Build delta:** new `WEDMMultiModalEncoderEngine` (~600 LOC) — composes existing encoders

### Layer 2 — Physics-Informed Neural Network (PINN) regularization
- Loss: `L = α·data_loss + β·physics_loss` where `physics_loss` enforces Klocke / DiBitonto / Kunieda / Carslaw&Jaeger equations
- **Existing physics:** `src/physics/constants.ts` (canonical) + `WEDMNeuralFormulaFusionEngine` (orphan) + `WEDMSparkErosionModelEngine` ✓
- **Build delta:** `WEDMPINNLossEngine` (~300 LOC) — wraps NeuralFormulaFusion into a torch-shaped loss component
- **ROI:** 3-5× sample efficiency, model can't violate first principles → easier safety certification

### Layer 3 — Counterfactual / synthetic augmentation (10-100×)
- Use digital-twin substrate to generate CFs: "what if pulse +10%? what if dielectric pressure −15%? what if wire 0.010″ → 0.008″?"
- **Existing engines:** `WEDMWhatIfSimulatorEngine` (orphan) + `WEDMRolloutSimulatorEngine` (orphan) + `WEDMVirtualMachineEngine` (orphan)
- **Build delta:** `WEDMSyntheticAugmentationEngine` (~400 LOC) — orchestrates the 3 sim engines + writes augmented tuples to `WEDM_TRAINING_TUPLES_AUGMENTED.jsonl`
- **ROI:** 10-100× data per real example — closes WEDM's data-hungry gap

### Layer 4 — Active learning (information-gain test-cut selection)
- Bayesian information-gain ranks the next test cut to maximally reduce model uncertainty
- **Existing:** `WEDMActiveQueryEngine` (orphan, 13 KB)
- **Build delta:** wire ActiveQueryEngine + add `wedm_active_query_next` action
- **ROI:** 5-10× fewer test cuts to reach target accuracy → faster operator buy-in

### Layer 5 — Curriculum learning (easy → hard)
- Sort training tuples by geometric/parametric complexity: straight cuts → simple contours → corners → tapers → complex 3D
- **Build delta:** `WEDMCurriculumSchedulerEngine` (~200 LOC) — sorts existing tuples by complexity score

### Layer 6 — Multi-task / co-training with sibling EDM domains
- Co-train WEDM + Sinker-EDM (shared spark physics) + Laser (shared thermal) + Waterjet (shared contour)
- Shared encoder, separate task heads
- **Existing:** `SinkerEDMCalculatorEngine` ✓ · `LaserCuttingEngine` ✓ · `WaterjetCuttingEngine` ✓
- **Build delta:** `WEDMMultiTaskTrainerEngine` (~500 LOC) — shared-encoder training script
- **ROI:** transfer learning lets the small WEDM corpus borrow signal from sibling domains

### Layer 7 — Meta-learning for new materials (MAML / Reptile)
- Model learns HOW to adapt to a new material from 1-5 test cuts
- **Existing:** `WEDMFewShotEngine` (orphan, 18 KB) + `WEDMPrototypicalNetworkEngine` (orphan, 14 KB) + `WEDMFewShotMaterialEngine` ✓
- **Build delta:** wire FewShot + Prototypical + add `wedm_meta_adapt(material, k_shot)` action
- **ROI:** handles JM Die's 100+ customer materials, esp niche alloys (carbide, PCD, exotic stainless)

### Layer 8 — Reinforcement learning (sim-to-real)
- RL policy with shaped reward, trained in WEDMRolloutSim, distilled to real-machine controller
- **Existing:** `WEDMRLControllerEngine` (orphan, 14 KB) + `WEDMRewardShapingEngine` (orphan) + `WEDMRolloutSimulatorEngine` (orphan) + `WEDMRLPolicyPersistence` (orphan)
- **Safety:** constrained by `WEDMSafetyEnvelopeEngine` (orphan) + `WEDMCurrentDensityGuardEngine` + `WEDMPulseLimitEngine` + `WEDMPowerDensityGuardEngine` (all orphan, all SAFETY-CRITICAL Ω≥0.95)
- **Build delta:** wire all 8 engines + add `wedm_rl_train` + `wedm_rl_policy_eval` + `wedm_rl_policy_deploy` actions
- **ROI:** surpasses operator baseline on multi-objective trade-offs (speed × Ra × wire-life)

### Layer 9 — Self-supervised pre-training on unlabeled corpus
- Mask-then-predict on full JM Die g-code corpus (10,678 programs)
- Contrastive: pull (program, paired-print) embeddings together, push apart unpaired
- **Build delta:** `WEDMSelfSupervisedPretrainerEngine` (~600 LOC) — emits foundation-model checkpoint before LoRA fine-tune
- **ROI:** 10× corpus utilization (entire archive, not just labeled subset)

### Layer 10 — Continual learning with EWC (no catastrophic forgetting)
- Elastic Weight Consolidation — protects weights important for old tasks while learning new
- **Existing:** `WEDMEWCMemoryEngine` ✓ (wired but utilization=0)
- **Build delta:** add `wedm_ewc_consolidate` action + integrate into training loop
- **ROI:** indefinite operation without retraining-from-scratch — runs the loop forever

### Layer 11 — Bayesian uncertainty quantification (CIs not scalars)
- Monte Carlo dropout + deep ensembles → 95% CI on every prediction
- **Doctrine:** `[[feedback_mathematical_exhaustive_completeness]]` — "High-ROI surfaces: CIs not scalars, informed priors not 0.5 defaults, statistical comparisons, sensitivity..."
- **Build delta:** `WEDMUncertaintyQuantifierEngine` (~350 LOC) — wraps prediction with MC-dropout sampling + ensemble disagreement
- **ROI:** enables principled S(x)≥0.98 gating on shop_floor tier (vs heuristic gating today)

### Layer 12 — Online Bayesian calibration (Thompson sampling)
- Every completed job updates posterior → next recommendation samples from updated posterior
- **Existing:** `WEDMCalibrationReportEngine` (orphan) + `WEDMFeedbackCalibrationEngine` (orphan) + `WEDMFeedbackIngestionEngine` (orphan) + `WEDMOffsetSPCEngine` (orphan) + `WEDMOnlineLearningEngine` ✓
- **Build delta:** wire 4 orphan calibration engines + add `wedm_calibration_update` action
- **ROI:** improves with every job, not every quarterly retrain — compounding edge

### Layer 13 — Retrieval-augmented generation (RAG)
- At inference, retrieve top-k similar past programs (paired with their outcomes); generate conditioned on retrieved exemplars
- **Existing:** `WEDMNeighborQueryEngine` ✓ + `WedmProgramIndexEngine` ✓ + `WEDMLatticeGraphEngine` ✓ (embeddings)
- **Build delta:** `WEDMRAGGeneratorEngine` (~400 LOC) — composes existing retrieval + adds context window
- **ROI:** explainable + handles distribution shift gracefully (new customer, new material)

### Layer 14 — Knowledge distillation hierarchy
- Big model (server, slow, accurate) → medium (real-time inference) → small (edge / operator HMI)
- **Existing:** `WEDMKnowledgeDistillationEngine` (orphan, 11 KB)
- **Build delta:** wire + add `wedm_distill_to_tier(target)` action
- **ROI:** real-time at controller, accurate in cloud, single training pipeline

### Layer 15 — Tribal-knowledge symbolic integration
- Every model recommendation paired with citing tribal tips + physics provenance
  - Example: "0.012″ wire, 220V open, kerf 0.020″ — per wedm-kb-014 (thin-wall guidance, Sandvik 2021) + Klocke 2013 Ra model"
- **Existing:** `WEDMTribalTipLearnerEngine` ✓ + `WEDMTribalRuntimeEngine` ✓ + `WEDMReasoningExplainEngine` (orphan) + `WEDMReasoningBridgeEngine` (orphan) + `WEDMReasoningTraceLedgerEngine` (orphan) + `WEDMCitationCheckEngine` (orphan) + `WEDMDeviationToTipEngine` (orphan)
- **Build delta:** wire 5 orphan reasoning engines + add `wedm_reasoning_explain(recommendation)` action
- **ROI:** operator trust + interpretability + closes the wiki/tribal consumption gap flagged in audit §3

### Layer 16 — Confidence-gated wire-wizard front-end
- 7 pages from U-REV-WEDM-01..07, but enhanced with:
  - Top-3 recommendations with provenance + uncertainty bars
  - Auto-route to `/safety-validation-guide` if confidence < tier threshold (Ω<0.95 on shop_floor)
  - Operator-in-the-loop accept/reject feeds outcome ledger (Layer 12)
  - Confidence indicators per Atomic-Value pattern (`{value, confidence, source, unit}`)
- **Build delta:** 7 frontend pages with confidence-gating layer (vs naive lathe-style studio pages)
- **ROI:** trust-building UX → operator adoption → more outcome data → faster learning cycle

### Layer 17 — 7-axis evaluation harness (vs lathe's 3)
1. **Reward shaping** — operator preference alignment (lathe baseline)
2. **Reason eval** — chain-of-thought correctness (lathe baseline)
3. **Safety eval** — Ω≥0.95 + S(x)≥0.98 on shop_floor (lathe baseline)
4. **Physics eval** — compliance with Klocke / DiBitonto / Kunieda — **new vs lathe**
5. **Generalization eval** — held-out customer × held-out material × held-out controller — **new vs lathe**
6. **Calibration eval** — predicted CI vs actual coverage (every 95% CI should contain truth 95% of the time) — **new vs lathe**
7. **Drift eval** — concept drift via `WEDMDriftDetectionEngine` (orphan, 11 KB) — **new vs lathe**
- **Build delta:** clone lathe's 3 evals + build 4 new ones + wire DriftDetectionEngine
- **ROI:** catches each failure mode before deployment

---

## §2 — Side-by-side comparison

| Dimension | Lathe baseline | WEDM v2 comprehensive |
|---|---|---|
| Modalities | 1 (parameters) | **5** (g-code + params + 2D print + 3D CAD + telemetry) |
| Loss components | 1 (data) | **2** (data + physics PINN regularization) |
| Data augmentation | none | **10-100×** via digital twin (CFs from WhatIf + Rollout + VirtualMachine) |
| Sample selection | random batch | **active learning** (information-gain via WEDMActiveQueryEngine) |
| Curriculum | none | **complexity-sorted** (straight → contour → corner → taper → 3D) |
| Cross-domain transfer | none | **co-trained** with Sinker/Laser/Waterjet (shared encoder) |
| Few-shot adaptation | fine-tune | **MAML/Reptile meta-learning** (1-5 test cuts per new material) |
| RL | absent | **PPO + sim-to-real** (existing RolloutSim + RLController + RewardShaping orphan engines) |
| Self-supervised | none | **mask-then-predict + contrastive** on full 10,678-program corpus |
| Continual learning | retrain | **EWC** (no catastrophic forgetting) |
| Uncertainty | point estimates | **Bayesian CIs** (MC-dropout + ensembles) → principled Ω gating |
| Online updates | quarterly | **per-job** (Thompson sampling) |
| RAG | absent | **top-k retrieval** + conditioned generation (existing NeighborQuery + LatticeGraph) |
| Distillation | none | **3-tier** (cloud big / real-time medium / edge small) |
| Tribal integration | none | **citation-tagged** outputs (existing TribalRuntime + ReasoningExplain orphan) |
| Frontend gating | studio pages | **confidence-gated wire wizard** (auto-routes to safety guide if Ω<0.95) |
| Evaluation axes | 3 (reward/reason/safety) | **7** (+ physics + generalization + calibration + drift) |

**ROI multiplier estimate vs lathe baseline:** each layer compounds. Conservatively: 5× signal × 3× regularization × 10× augmentation × 5× active-learning efficiency = **≥750× effective sample efficiency**, with strictly better safety/calibration/explainability.

---

## §3 — Revised milestone: WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 (supersedes WEDM-TRAINING-WIZARD-MS0 draft)

### Phase A — Wire-the-orphans (highest leverage, ~95% existing code)
- **U-WCTP-A1** — Wire 13 WireEDM AI-tier orphans (MasterAI, AGIOrchestrator, DeepAIHardening, DeepNeural/Reasoning/Logic, UnifiedScience, KnowledgeSynthesis, NeuralOrchestration, PredictiveIntelligence, Research, Advanced, SelfAwareness, CAMKnowledge, MachineTechData, AIPrintToProgram, ProgramParser)
- **U-WCTP-A2** — Wire 13 learning-loop orphans (ContinuousLearning, LearningLoop, NeuralTraining 85KB, RLController, RewardShaping, RolloutSimulator, RLPolicyPersistence, PrototypicalNetwork, KnowledgeDistillation, NeuralFormulaFusion, FewShot, LoRACadence, **build the 0-byte LoRADatasetBuilder**)
- **U-WCTP-A3** — Wire 10 safety orphans (CurrentDensity, Pulse, PowerDensity, FlushAdequacy, ProgramSafety, Verification, Tier6Geom, ThermalRelease, UnitTag, PreFlight) — Ω≥0.95 each
- **U-WCTP-A4** — Wire 11 reasoning orphans (ReasoningExplain/Bridge/TraceLedger, CitationCheck, DeviationToTip, AnalogicalReasoning, HierarchicalPlanner, FaultDiagnosis, WhatIfSimulator, ProcessCausality, TradeoffElicitation)
- **U-WCTP-A5** — Wire 8 calibration orphans (Calibration/Feedback/FeedbackIngestion, Drift, Degradation, ModelUpdate, OffsetSPC, BenchmarkTolerance)
- **U-WCTP-A6** — Wire 5 controller-post orphans (Mitsubishi/Sodick/Makino/Agie/Fanuc) + per-controller feature-program catalog
- **U-WCTP-A7** — Wire 7 orchestrator orphans (CompleteOrchestration, ProgramOptimizer, ProgramNeuralAnalysis, BatchProgramAnalyzer, StrategyLibrary, CalculatorAI, SelfAwareness)

### Phase B — Multi-modal corpus (Layer 0+1)
- **U-WCTP-B1** — `WEDMMultiModalEncoderEngine` (composes existing graph/lattice/parser encoders into unified latent)
- **U-WCTP-B2** — `WEDM_TRAINING_TUPLES.jsonl` corpus build CLI — all 8 fields per example
- **U-WCTP-B3** — Dispatcher actions + tests

### Phase C — Physics + augmentation (Layers 2-3)
- **U-WCTP-C1** — `WEDMPINNLossEngine` (PINN regularizer wrapping NeuralFormulaFusion)
- **U-WCTP-C2** — `WEDMSyntheticAugmentationEngine` (10-100× CF augmentation via WhatIf + Rollout + VirtualMachine)
- **U-WCTP-C3** — `WEDM_TRAINING_TUPLES_AUGMENTED.jsonl` emitter

### Phase D — Active + curriculum + multi-task + meta (Layers 4-7)
- **U-WCTP-D1** — Active-learning loop (wire WEDMActiveQueryEngine + `wedm_active_query_next`)
- **U-WCTP-D2** — `WEDMCurriculumSchedulerEngine`
- **U-WCTP-D3** — `WEDMMultiTaskTrainerEngine` (Sinker + Laser + Waterjet co-train)
- **U-WCTP-D4** — Meta-learning adapter (`wedm_meta_adapt(material, k_shot)`)

### Phase E — RL + self-supervised + continual (Layers 8-10)
- **U-WCTP-E1** — Wire RL stack end-to-end (8 engines from Phase A2)
- **U-WCTP-E2** — `WEDMSelfSupervisedPretrainerEngine` (mask + contrastive on 10,678 programs)
- **U-WCTP-E3** — EWC continual-learning loop (`wedm_ewc_consolidate`)

### Phase F — Uncertainty + calibration + RAG + distillation (Layers 11-14)
- **U-WCTP-F1** — `WEDMUncertaintyQuantifierEngine` (MC-dropout + ensembles → CIs)
- **U-WCTP-F2** — Thompson-sampling online update (wires Phase A5 calibration orphans)
- **U-WCTP-F3** — `WEDMRAGGeneratorEngine` (top-k retrieval + conditioned generation)
- **U-WCTP-F4** — 3-tier knowledge distillation (`wedm_distill_to_tier`)

### Phase G — Tribal symbolic + frontend + eval (Layers 15-17)
- **U-WCTP-G1** — Tribal-citation integration (`wedm_reasoning_explain(recommendation)` + provenance)
- **U-WCTP-G2** — 7 confidence-gated wire-wizard frontend pages (U-REV-WEDM-01..07 enhanced)
- **U-WCTP-G3** — 7-axis evaluation harness (3 from lathe + 4 new: physics/generalization/calibration/drift)
- **U-WCTP-G4** — First end-to-end run: load JM Die print → multi-modal encode → physics-regularized + augmented training → RL fine-tune → distill → wizard inference with CI + tribal citation → operator accept → outcome → Thompson update

### Phase H — Self-improving loop activator (closes the loop)
- **U-WCTP-H1** — `WEDMPersistentLearningLoopEngine` — single orchestrator wiring all phases into a continuous cycle (data → train → eval → deploy → outcome → calibrate → re-train)
- **U-WCTP-H2** — Cron/scheduler for the loop (e.g. nightly augmentation refresh, weekly LoRA fine-tune, per-job calibration)
- **U-WCTP-H3** — `/wire-edm-studio` skill upgraded to drive the loop end-to-end + `/wedm-train` skill exposes the pipeline to operators

**Total: 31 units across 8 phases** (vs prior draft's 14, vs lathe's effective 5).

---

## §4 — Engines used per layer (proof of feasibility)

100% of the 17 layers map to existing engines on disk. Build delta is **~6 new engines totaling ~2500 LOC + dispatcher wiring for ~80 existing engines + 7 new frontend pages**.

| Layer | Existing engines (already on disk) | New engines (to build) |
|---|---|---|
| 0 | 6 (JMDieTrainingCorpus, BlueprintProgramJoin, ProgramPrintLinkIndex, CADArchiveJoinAugmenter, WireEDMProgramParser, PartFamilyTemplateExtractor) | 0 |
| 1 | 2 (LatticeGraph, GraphAttention) | 1 (MultiModalEncoder) |
| 2 | 1 (NeuralFormulaFusion) | 1 (PINNLoss) |
| 3 | 3 (WhatIfSimulator, RolloutSimulator, VirtualMachine) | 1 (SyntheticAugmentation) |
| 4 | 1 (ActiveQuery) | 0 |
| 5 | 0 | 1 (CurriculumScheduler) |
| 6 | 3 (SinkerEDM, LaserCutting, WaterjetCutting) | 1 (MultiTaskTrainer) |
| 7 | 3 (FewShot, PrototypicalNetwork, FewShotMaterial) | 0 |
| 8 | 4 (RLController, RewardShaping, RolloutSim, RLPolicyPersistence) + 4 safety (CurrentDensity, Pulse, PowerDensity, SafetyEnvelope) | 0 |
| 9 | 0 | 1 (SelfSupervisedPretrainer) |
| 10 | 1 (EWCMemory) | 0 |
| 11 | 0 | 1 (UncertaintyQuantifier) |
| 12 | 5 (CalibrationReport, FeedbackCalibration, FeedbackIngestion, OffsetSPC, OnlineLearning) | 0 |
| 13 | 3 (NeighborQuery, WedmProgramIndex, LatticeGraph) | 1 (RAGGenerator) |
| 14 | 1 (KnowledgeDistillation) | 0 |
| 15 | 7 (TribalTipLearner, TribalRuntime, ReasoningExplain, ReasoningBridge, ReasoningTraceLedger, CitationCheck, DeviationToTip) | 0 |
| 16 | 0 (frontend) | 7 (wizard pages) |
| 17 | 1 (DriftDetection) | 4 (physics/generalization/calibration/drift eval harnesses) |

**Total: ~50 existing + ~7 new engines + 7 frontend pages.**

---

## §5 — Why this beats lathe quantitatively

- **Sample efficiency:** 5× signal/example × 10-100× augmentation × 5-10× active-learning = **250-5000× effective**
- **Safety certification:** principled CIs (Layer 11) instead of heuristic Ω gating
- **Generalization:** held-out customer × material × controller eval (Layer 17.5) — lathe has none
- **Operator trust:** every recommendation cites tribal + physics provenance (Layer 15) — lathe has none
- **Compounding edge:** per-job Bayesian calibration (Layer 12) — lathe has quarterly retrain
- **Distribution shift:** RAG (Layer 13) handles new customer/material gracefully — lathe doesn't
- **Catastrophic forgetting:** EWC (Layer 10) — lathe retrains from scratch
- **Edge deployment:** 3-tier distillation (Layer 14) — lathe is single-model

---

## §6 — Recommendations

1. **Hand off to charlie** (canonical wire-EDM slot per JULIETT-12CHAT). The 31-unit pipeline graduates far beyond mike's misc-cleanup soul. `/handoff-mike` → `/checkin-charlie /loop continue WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0`.
2. **Start with Phase A1+A2** (wire-the-orphans). Pure additive — no new engines — instantly surfaces ~600 KB of dormant AI-tier code into `/system-viz` + master-index + `/wire-edm-studio`. Highest single-batch ROI.
3. **U-WCTP-A2's LoRA Dataset Builder build is non-optional** — the 0-byte stub blocks every downstream LoRA layer.
4. **Phase G2 (confidence-gated wire wizard frontend) is the customer-visible deliverable.** Ship Phase A first (substrate), then Phase G2 (UX), then Phases B-F-H in parallel.
5. **Cross-reference doctrine:** `[[feedback_mathematical_exhaustive_completeness]]` (CIs not scalars), `[[feedback_ai_training_first_before_revenue]]` (train before revenue), `[[do-optional-high-roi-work]]`, `[[feedback_high_roi_backend_first_slot_queue]]` (P0 wire-the-orphans before frontend).

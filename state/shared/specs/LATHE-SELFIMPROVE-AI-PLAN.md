# LATHE-SELFIMPROVE-AI-PLAN
**Slot:** whiskey · **Milestone:** `LATHE-LORA-MS0` · **Template:** india/ai-training · **Status:** ✅ SHIPPED 8/8 (2026-05-30)

> ### ✅ COMPLETE — all 8 composition-tier engines shipped on `slot/whiskey` (2026-05-30, slot:whiskey)
> Each unit: built → per-file 2-reviewer scrutiny PASS (0 P0/P1) → tsc --noEmit clean → vitest → slot commit. Milestone-close **3-of-3 PASS** recorded (session 57dfea65; arms A holistic + B test-integrity + C regression).
> | # | Unit | Engine / wiring | Commit | Tests |
> |---|---|---|---|---|
> | #2 | U-LLR-LEDGER(+P2) | LatheLoRAExperienceLedgerEngine (facade over crossProcessOutcomeStore) | 5a25e98018 | 20 |
> | #1 | U-LLR-EXTRACT | LatheLoRAKnowledgeExtractorEngine | 65b89e693e | 10 |
> | #3 | U-LLR-CONTEXT | LatheLoRASemanticContextEngine (RAG) | 9d7e02b4c3 | 9 |
> | #4 | U-LLR-FUSION | LatheLoRAKnowledgeFusionEngine (Kienzle/Taylor anchor, R7 conflicts) | 3a9af41a78 | 20 |
> | #5 | U-LLR-UNCERTAINTY | LatheLoRAUncertaintyQuantifierEngine (calibration gate, **dual-wired prism_safety**, S(x) bands) | 438b97ba43 | 20 |
> | #6 | U-LLR-SELECT | WIRE existing LatheLoRAModelSelectorEngine runtime (select/register/record/release) | ab1617f193 | 7 |
> | #7 | U-LLR-ENSEMBLE | WIRE existing LatheLoRAEnsembleVoterEngine runtime (vote+consensus/history) | 30f1c0c856 | 9 |
> | #8 | U-LLR-META | LatheLoRAMetaAdaptationEngine (promotion gate: deploy-ready + measured lift) | 324c5f013c | 15 |
>
> **All wired on `prism_turning`** (11 new actions); #5 also on `prism_safety` (`lathe_lora_calibration_gate`). #6/#7 are WIRING units (selector/voter existed but only `getStats` was reachable — R8 found this; duplication-guard avoided rebuilds).
> **P2 deferred:** route #2 `computeReward` through the richer existing `LatheLoRARewardShapingEngine.calculateReward` in a future unit — current scalar reward is an intentional self-contained store-labeling signal.
**Verified 2026-05-29** (Workflow `wf_efe40eea-99a`, 4 adversarial agents): all template files-of-record present · `CANONICAL_KIENZLE` (L34) + `CANONICAL_TAYLOR` (L57) exported in `physics/constants.ts` · all 8 target engines ABSENT by exact name · all near-dup siblings present on disk · `turningDispatcher.ts` (227KB) owns the lathe surface with **0** existing `lora_ai_*` actions (clean namespace).

> **Whiskey's job is wiring + 8 fusion/feedback engines, not rebuilding the layers.** The ~65-engine lathe LoRA stack is the most complete instantiation of india's template already on disk and already wired through `prism_turning`. The closed loop is ~90% built; the missing links are an **outcome-feedback backbone**, a **context/RAG layer**, and the **fusion/selection/meta composition tier**.

> ### ⚠️ SUPERSEDING REFINEMENT (2026-05-29 india-substrate discovery — [[LATHE-AI-DISCOVERY-BRIEF]], [[reference_whiskey_india_ai_substrate_2026_05_29]])
> The "outcome-feedback backbone" link below does **NOT** need building — india OWNS it and **lathe is already a first-class `process`** in `crossProcessOutcomeStore` (∈ `OUTCOME_PROCESSES`) + `CrossProcessNeuralLearningEngine` (∈ `REPLAY_PROCESSES`). All shared singletons (`feedbackBusEngine`, `crossProcessOutcomeStore`, the neural learner, `prism_ai:xproc_*`, the retrain-lifecycle promote-gate) **EXIST in the slot worktree — ZERO edits**. So:
> - **`#2 LatheLoRAExperienceLedgerEngine` = a THIN wrapper** over `crossProcessOutcomeStore.record({process:"lathe", ...})` — NOT a parallel ledger. Recording auto-fans-out to the bus → shared auto-train+replay pulls lathe rows for free.
> - **Do NOT build a lathe feedback-bus, auto-train loop, or retrain-gate** — call/reuse india's. Reuse `nn-graph-retrain-lifecycle.mjs` `promoteDecision` (promote IFF `deferred===false && grade.pass===true`).
> - The 8 engines remain the **domain composition tier** (extract→fuse→context→uncertainty→select→ensemble→meta) — they PRODUCE the signal + COMPOSE inference, the loop is shared-singleton calls.
> - **Caveat:** the `outcome-bus-auto-tap.mjs` auto-instrument hook is absent in-slot → record outcomes EXPLICITLY via `xproc_outcome_record {process:"lathe"}` until the slot syncs.

## Relationship to PSN-SELF-IMPROVING-LOOP-MS0 (R7/R8 — not a fork)
`PSN-SELF-IMPROVING-LOOP-MS0` (`U-LOOP-WIRE`, `U-OUTCOME-INGEST-PROCESSOR`) is the **fleet/cross-domain** coordination loop. This plan is the **domain-local** lathe loop (the per-domain-ownership rule [[feedback_domains_own_ai_training_systems]]). They **compose**: lathe's L3 ExperienceLedger (#2) + L9 lifecycle publish through `feedbackBusEngine` → the fleet PSN loop ingests them via its outcome processor. The lathe loop is a *producer* into the fleet loop, never a parallel reimplementation.

## 1. Loop coverage map (link by link)
| india layer | Lathe engine covering it | Status |
|---|---|---|
| L1 knowledge extraction / corpus | ProgramParser, ProgramMiner, TribalExtractor, TribalAugmentation, KnowledgeCurator, KnowledgeGraph | BUILT+WIRED |
| L1+ training-record harvest | **#1 `LatheLoRAKnowledgeExtractorEngine`** (NEW → `LatheTrainingRecord[]`) | TO-BUILD |
| L2 featurize | `LatheLoRADatasetBuilderEngine` (.MIN→SFT) | BUILT+WIRED |
| L3 experience ledger | **#2 `LatheLoRAExperienceLedgerEngine`** (NEW; reuses `crossProcessOutcomeStore` filtered `process:"lathe"`) | TO-BUILD |
| L4 feedback bus | `feedbackBusEngine` (shared india singleton) | WIRE-ONLY |
| L1-context RAG | **#3 `LatheLoRASemanticContextEngine`** (NEW; vectors from `LatheLoRAEmbeddingCacheEngine`) | TO-BUILD |
| L_fuse fusion | **#4 `LatheLoRAKnowledgeFusionEngine`** (NEW; physics-anchored, surfaces conflicts R7) | TO-BUILD |
| L5 train | AITraining, RL, ActiveLearning + LoRA DatasetBuilder/HPOpt/TrainingScript/Monitor/RewardShaping/Merge/Quant | BUILT+WIRED |
| L6 inference | AIReasoning, DeepReasoning, AIUltra, Causal, Attention + LoRA InferenceGateway/ReasoningChain/PhysicsAugmented/NeuralBridge | BUILT+WIRED |
| L7 uncertainty | BayesianOpt(GP), ActiveLearning(committee) + **#5 `LatheLoRAUncertaintyQuantifierEngine`** (NEW) | #5 TO-BUILD |
| L8 model selection | `LatheLoRAModelSelectorEngine` (runtime) + **#6 `LatheLoRAModelSelectionEngine`** (NEW; decision-time) | #6 TO-BUILD |
| L8-ensemble | EnsembleVoter/Combiner/Orchestrator + **#7 `LatheLoRAEnsembleInferenceEngine`** (NEW; *delegates* voting) | #7 TO-BUILD |
| L9 outcome→drift→retrain | AnomalyDetection, LoRA DriftDetector/AdaptiveRefinement/HealthMonitor/Cadence/CronJob/Deployment/OllamaDeployer | BUILT — **no gated lifecycle script** → close-out step |
| L10 continual learning | `LatheLoRAContinualLearningEngine` (replay+EWC) | BUILT+WIRED |
| L_meta meta-adaptation | MetaLearning(MAML), AIOrchestration + **#8 `LatheLoRAMetaAdaptationEngine`** (NEW; the loop-closer) | #8 TO-BUILD |
| L0 master orchestrator | `LatheLoRAMasterOrchestratorEngine` (registers the 8 new as subsystems) | BUILT — WIRE-ONLY |

## 2. Build order (dependency-sorted)
Foundation (data producers) → fusion → consumers → loop-closer. ModelSelection before EnsembleInference; MetaAdaptation last.

| # | Engine | Mirrors india | Dispatcher action | Test path |
|---|---|---|---|---|
| 1 | `LatheLoRAKnowledgeExtractorEngine` | corpus-aggregation + knowledge-conversion router | `prism_turning:lora_ai_extract_knowledge` | `src/__tests__/LatheLoRAKnowledgeExtractorEngine.test.ts` |
| 2 | `LatheLoRAExperienceLedgerEngine` | OutcomeFeedbackBus + outcome-bus.jsonl | `lora_ai_experience_append` + `lora_ai_experience_query` | `…/LatheLoRAExperienceLedgerEngine.test.ts` |
| 3 | `LatheLoRASemanticContextEngine` | blueprint-rag + `xproc_rag_features` | `lora_ai_semantic_context` | `…/LatheLoRASemanticContextEngine.test.ts` |
| 4 | `LatheLoRAKnowledgeFusionEngine` | knowledge-conversion fusion + creative-reasoning | `lora_ai_fuse_knowledge` | `…/LatheLoRAKnowledgeFusionEngine.test.ts` |
| 5 | `LatheLoRAUncertaintyQuantifierEngine` | `xproc_calibration_monitor` + `xproc_conformal` | `lora_ai_quantify_uncertainty` (**dual-wire `prism_safety`**) | `…/LatheLoRAUncertaintyQuantifierEngine.test.ts` |
| 6 | `LatheLoRAModelSelectionEngine` | agent-orchestration routing + MetaLearningOptimizer | `lora_ai_select_model` | `…/LatheLoRAModelSelectionEngine.test.ts` |
| 7 | `LatheLoRAEnsembleInferenceEngine` | ensemble inference + MoE gating (delegates to `EnsembleVoterEngine`) | `lora_ai_ensemble_infer` | `…/LatheLoRAEnsembleInferenceEngine.test.ts` |
| 8 | `LatheLoRAMetaAdaptationEngine` | MetaLearningOptimizer + AdaptiveThreshold + NN-GRAPH promote-on-gate | `lora_ai_meta_adapt` | `…/LatheLoRAMetaAdaptationEngine.test.ts` |

**Close-out step (after the 8):** (a) WIRE-ONLY register all 8 as subsystems on `LatheLoRAMasterOrchestratorEngine` + confirm each reaches `turningDispatcher` (audit `stop_on_unwired_assets`); (b) BUILD the L9 actuator `scripts/lathe-lora-retrain-lifecycle.mjs` — mirror `scripts/nn-graph-retrain-lifecycle.mjs` (6 stages FINGERPRINT→DRIFT→RETRAIN(`.candidate`)→EVALUATE(`runAssessment`)→PROMOTE→LEDGER), gate AUROC≥0.78/macroF1≥0.55/Brier≤0.15 + physics-accuracy (`LatheLoRAPhysicsEvaluatorEngine`) + safety (`LatheLoRASafetyEvaluatorEngine`). **SAFETY INVARIANT:** `promoteDecision()`→promote IFF `deferred===false && grade.pass===true`. Live checkpoint NEVER touched by training; prior preserved `.prev.json`. Co-located test + ≥1 real-data E2E oracle driving the actual `runAssessment`. Install 6h/S4U scheduled task (`install-lathe-lora-retrain-task.ps1`).

## 3. Closed-loop wiring (the precise edges)
```
EnsembleInference.infer(req) → predicted+adapterId
  → [2] ExperienceLedger.append({predicted,actual,reward,success,...})
  → on append publish feedbackBusEngine.publish("outcome.recorded", outcome)
  → [5-train] CrossProcessNeuralLearningEngine.enableAutoTrain (subscribed) → buildReplayMixedBatch(lathe∈REPLAY)+EWC → train → "neural.train.tick"
       AND LatheLoRAContinualLearningEngine consumes same topic
  → next inference: [6] ModelSelection.select(req) uses [2].stats(reward-by-task-family)
       → [3] SemanticContext.buildContext(req) retrieves [1]+[2] (top-K via EmbeddingCache)
       → [4] KnowledgeFusion.fuse({physics,tribal,corpus,outcomes}) anchored on CANONICAL_KIENZLE/TAYLOR
       → [7] EnsembleInference.infer → aggregate via EnsembleVoterEngine → gate via [5] UncertaintyQuantifier → auto/review/reject
  → outcome → [2].recordOutcome (pending→success/failure/operator_override) → closes to [2]
  → [9-lifecycle] (scheduled) lathe-lora-retrain-lifecycle.mjs: FINGERPRINT→RETRAIN→EVALUATE→promoteDecision
  → [8-meta] MetaAdaptation.adapt({taskFamily, history:[2].query, currentPolicy}) → apply IFF expectedLift>threshold → updates #6 thresholds / #7 weights / #3 retrieval-K
```
Rules: pending records excluded from training; the bus is the only wiring primitive; #8 and #9 both gate on measured improvement (never auto-apply on regression).

## 4. Per-unit ship contract (all 8, identical gate)
Unit ids `U-LLR51`..`U-LLR58` (next free in series). Per engine: (1) `duplicationGuardEngine.mustCheckBeforeCreating()` pre-write (record near-dup verdict in JSDoc); (2) real-behavior test (no stubs; #4 asserts physics-anchored conflict resolution vs real `CANONICAL_KIENZLE`/`CANONICAL_TAYLOR`; #2/#6/#8 ship ≥1 real-data E2E oracle); (3) per-file 2-reviewer scrutiny — A=`code-analyzer`, B=independent `reviewer`, +`physics-review-agent` for #4/#5; fix P0+P1 before next; (4) singleton export `export const latheLoRA<x>Engine = new …()` + JSDoc header (milestone/unit, why, determinism Mulberry32 if it learns weights, persistence `serialize()`/`fromSerialized()` atomic tmp+rename + `SCHEMA_VERSION`); (5) wire `prism_turning:lora_ai_*` (`await import()` pattern) + register subsystem; #5 dual-wires `prism_safety`; closure-input engines → `// WIRE-EXEMPT`; (6) commit `[whiskey] [LATHE-LORA-MS0]/U-LLR<id>: <title>`; (7) end-of-task 3-of-3.

**Namespace:** all 8 stay `prism_turning:lora_ai_*` (9 actions) — turningDispatcher already owns the lathe surface, 0 existing `lora_ai_*`. Spin a dedicated `prism_lathe_ai` only if action count later justifies isolation.

## 5. Risks / boundary
- **Compute boundary:** whiskey owns engines+wiring+lifecycle script, NOT the GPU training loop (defers to india `graphsage-train-pipeline.mjs` + `LatheLoRAOllamaDeployerEngine`).
- **#6 overlap (highest):** `LatheLoRAModelSelectionEngine` vs existing `LatheLoRAModelSelectorEngine` — keep #6 strictly decision-time (consumes ExperienceStats, emits plan), delegate runtime routing. MERGE-fallback (`selectBestForFamily()` on Selector, drop new file) if per-file review judges overlap too tight. Decide at review, not after commit.
- **#7 re-impl risk:** must *delegate* aggregation to `LatheLoRAEnsembleVoterEngine` (R8); test asserts Voter is invoked.
- **GNN tier OUT OF SCOPE:** no GraphSAGE/GNN lathe tier yet (`LatheLoRAKnowledgeGraphEngine` is symbolic, not trained). A trained lathe GNN = future `LATHE-LORA-MS1`.
- **L9 deploy-gate data dependency:** if #2 ledger has insufficient labeled outcomes, `runAssessment` returns `deferred:true` and the lifecycle declines to promote (correct; surface loud per R12, never force-pass).
- **Shared-singleton contention:** `crossProcessOutcomeStore` + `feedbackBusEngine` are india-owned; lathe publishes/filters, never mutates their schema. Lathe-specific schema → #2 backs its own `lathe-outcome-bus.jsonl` + mirrors selected rows as `process:"lathe"`.

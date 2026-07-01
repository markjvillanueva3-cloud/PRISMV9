---
name: reference_india_open_loops_rescan_2026_06_22
description: "India-core open-learning-loop EXHAUSTIVE re-scan + closures (slot:india /loop 2026-06-22, fresh ctx post-compact). After the original 8-item backlog, a Mill-pattern grep + a single sonnet Explore agent scanned all india-core AI/ML engines (predict method + UNWIRED feedback/train method). 4 NEW finds beyond the 8; 4 closures SHIPPED this session (Mill, Ensemble, Lathe-LoRA, PP-AGI); 2 verified-DEFER (SpeedFeed-DL dedup, WEDM-neural caveat). The clean india-solo open-loop set is now largely EXHAUSTED -- remaining are owner-design/dedup-risk. Pattern: wire the existing-but-unwired actuals-feedback method; R8-verify each (3 scout 'clean' picks turned out owner-entangled on inspection)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.619Z
aliases: reference_india_open_loops_rescan_2026_06_22
---


# India open-learning-loops -- exhaustive re-scan + closures (2026-06-22)

Fresh-context /loop continuation. Closed per-domain AI learning loops (predictions emit but
actuals never fed back). The unifying engine pattern: an engine has a predict/select/recommend
method wired, but its recordOutcome/updateWeights/recordFeedback/train method is UNWIRED -> the
model is frozen / calibration starved. Closure = wire the existing typed feedback method.

## SHIPPED this session (4 closures, all 2-arm scrutiny PASS)

| commit | engine | what was open | closure |
|---|---|---|---|
| `775a94a91b` | **MillStrategyNeuralEngine** | `addTrainingExample` buffered but NO training step + unwired; predict() on `v0.1.0-random` forever | added `recordOutcome` + `trainFromBuffer` (REAL online-SGD backprop + divergence-guard rollback) + fixed dead `mill_strategy_recommend` -> predict(); `mill_strategy_{record_outcome,train}`. 29/29 |
| `87e676f14e` | **EnsembleModelSelectorEngine** | `updateWeights` (re-weight on error) unwired; predicted on frozen weights | `ensemble_{update_weights,get_weights}` (aiReasoningDispatcher; Map->Object.fromEntries). 6/6 |
| `15856d1b65` | **LatheLoRAModelSelectorEngine** | whole selector unwired except getStats (register/select/record all missing) | wired full loop `lathe_lora_model_selector_{register,unregister,select,record,release,models}` (turningDispatcher, parity mill_lora_sel_*). 7/7 + defensive batch10 reset guard |
| `4f1a59ed92` | **PostProcessorAGIContinuousLearningEngine** | 3 read actions wired, `recordFeedback` (actuals) unwired -> read-only learner | `pp_agi_cl_record_feedback` (camDispatcher, parity lathe_agi_feedback). R8/R12 catch: recordFeedback CRASHES on minimal feedback (extractKnowledgeFromSuccess reads operations[0] unguarded) -> enforce FULL required ProductionFeedback contract at boundary. 7/7 |

## VERIFIED-DEFER (R8 caught owner-entanglement / dedup -- do NOT build solo)

- **SpeedFeed-DL recordFeedback** -- DEFER (oscar). The SFC actuals-feedback loop is ALREADY closed
  via `speedfeed_outcome_record_actuals` (calcDispatcher:9495 -> SpeedFeedOutcomeFeedbackBridgeEngine,
  the OSCAR-SFC-SELFLEARN-WIRE work). Wiring SpeedFeedDeepLearningEngine.recordFeedback = a 2nd SFC
  actuals sink (dedup) in oscar's safety-critical domain + an "untrained SFC AI, don't wire inference"
  caution. The scan's "clean Rank 1" missed the existing loop.
- **WEDM-neural transferLearn** -- DONE `95c5112eb8` (5/5). The scan's "blocking sync disk read /
  needs background runner" caveat was a FALSE defer: grep of the whole engine finds NO
  readFileSync/existsSync/fs -- transferLearn iterates IN-MEMORY constants (JM_DIE_ANALYZED_PROGRAMS /
  MITSUBISHI_FA / MAKINO_TECH). CPU-bound in-memory training, a clean additive wire.
  `wedm_neural_training_transfer` -> transferLearn (edmDispatcher; ensemblePredict was wired, train
  was not). R8 LESSON: "verify, don't assume" cuts BOTH ways -- it caught 3 false "clean" picks AND
  this 1 false "blocked" pick. The P2 (transferLearn lacked try/finally around its singleton state
  reset/restore) is now CLOSED -- entry snapshot + completed flag + finally (always clear isTraining,
  roll corpus back on incomplete); 5 throw-injection tests, 2-arm scrutiny PASS. SHIPPED but absorbed
  into peer commit a895131184 (shared-tree git-add-all). Detail: [[reference_wedm_neural_transfer_rollback_2026_06_22]].

## STILL owner-design (from the original 8, R8 archaeology done this session)
- **CAM #4** = kilo (process() needs a stable decisionId + decision-log; redesigns AGIDecision emission).
- **CAD #3** = delta (feature_recognize engine swap risks cad->cam output contract).
- **Quoting #5** = charlie (ml_knn + findSimilarJobs already exist; new engine would duplicate).
- **Post #2** = echo (P6 recordEmission in-pipeline-vs-dispatcher placement is echo's design call).

## Status
The clean india-solo open-loop set is COMPLETE -- **5 closures shipped** (Mill 775a94a91b,
Ensemble 87e676f14e, Lathe-LoRA 15856d1b65, PP-AGI 4f1a59ed92, WEDM-neural 95c5112eb8). The only
remaining open-learning-loop items are the 4 OWNER-DESIGN ones (CAM=kilo, CAD=delta, Quoting=charlie,
Post=echo) -- they need owner coordination, NOT india-solo builds. Next india work: hunt a NEW theme
(GNN/LoRA/RAG substrate, failing-test fixes, ghost wirings) -- the open-learning-loops theme has
yielded all its clean india-solo wins. Backlog detail: [[reference_open_learning_loops_backlog_2026_06_22]].

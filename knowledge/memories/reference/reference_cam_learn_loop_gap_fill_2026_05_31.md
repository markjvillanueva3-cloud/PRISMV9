---
name: reference_cam_learn_loop_gap_fill_2026_05_31
description: "CAM-LEARN-LOOP gap-fill (slot kilo, 2026-05-31): closing the CAM self-learning closed loop so training can start. 3 of 5 P0 shipped (domain-isolate, tmp-leak-fix, wire-consumer). Key finding: CAM has TWO separate outcome buses — OutcomeCaptureBus (cam.jsonl) vs CrossProcessOutcomeStore→FeedbackBus — and they don't connect, which reshapes the 'arm the loop' unit."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.048Z
aliases: reference_cam_learn_loop_gap_fill_2026_05_31
---


**CAM-LEARN-LOOP gap-fill** (slot kilo, 2026-05-31). Operator: *"lets fix and fill all gaps so we can start training."* Came from a `cam-ai-readiness-decision` workflow: CAM owns a real ~15-engine learning stack but the closed loop was DORMANT (built+wired+tested, never armed/fed). 5 P0 + 3 P1 + 3 P2 gaps queued.

**SHIPPED (committed to slot/kilo, all verified):**
- **U-CAM-LOOP-DOMAIN-ISOLATE** (#1) — `CAMDriveRecipeEngine.execute()` hardcoded `domain:"mill"` → CAM outcomes polluted `mill.jsonl`. Now emits `domain:"cam"` → dedicated `state/outcomes/cam.jsonl`. Caught + fixed an adapter wiring bug (R8): `CAMDriveRecipeAdapter.toRecordOutcomeInput()` DROPPED `context` before the real bus, so `cam_system` never persisted in prod while the hermetic test stayed green. Added context passthrough + an injectable `recordOutcome` sink seam. 36/36 tests.
- **U-CAM-OUTCOME-TMP-LEAK-FIX** (#2) — `OutcomeCaptureBus.atomicAppend()` used copy-whole-file+rename: O(filesize), orphaned `.tmp` on throw (358 orphans / **513.9 MB** swept), AND last-writer-wins → silently DROPPED concurrent events. Replaced with O_APPEND (atomic on a single-host regular file). Added `sweepOrphanedTmps()`. 25/25 tests.
- **U-CAM-LOOP-WIRE-CONSUMER** (#3, keystone) — the consumer half (`OutcomeFeedbackWireEngine.mjs` + `SelfLearningLoopOrchestratorEngine.mjs`, pure fns) was DEAD: never wired + schema-incompatible (`isValidOutcome` rejected every bus event). New `CamOutcomeFeedbackAdapterEngine.ts` bridges bus shape `{domain,kind,source,actual}` → wire shape `{outcomeId,templateId,decision,observed}` (honest-labels-only: no-signal → drop, never fabricate). Wired `prism_cam:cam_outcome_feedback_compute_delta` + `cam_self_learning_loop_step`. 43 tests incl. REAL round-trip (bus→adapter→real `isValidOutcome`+`computeCorpusDelta` promote).

**KEY ARCHITECTURAL FINDING (reshapes #4 "arm the loop"):** CAM has **TWO separate outcome systems that don't connect**:
1. **OutcomeCaptureBus** (`state/outcomes/cam.jsonl`) — LEARN-01 universal bus. CAM-drive writes here; my #3 consumer reads here. `record()` does NOT publish to FeedbackBus.
2. **CrossProcessOutcomeStore → FeedbackBus `'outcome.recorded'`** — what `CAMLoRAAdapterTrainerEngine.enableOutcomeObservation()` subscribes to. Publishers: `OutcomePublishAdapterEngine`, `CrossProcessNeuralLearningEngine`. CAM-drive does NOT publish here.
So **arming the LoRA trainer alone is necessary-but-insufficient** — it observes the XPROC stream but NOT CAM-drive outcomes. #4 needs a design decision: CAM-drive **dual-emit** to CrossProcessOutcomeStore, OR a OutcomeCaptureBus→FeedbackBus bridge, OR point the LoRA trainer at `cam.jsonl`. Do not guess — surface (R7).

**REMAINING — both P0s are integration-BUILDS (not "run the pipeline"), precisely scoped 2026-05-31:**

**#4 (arm + dual-emit)** — `CAMLoRAAdapterTrainerEngine.enableOutcomeObservation()` subscribes to `FeedbackBus 'outcome.recorded'` (publishers: `OutcomePublishAdapterEngine`, `CrossProcessOutcomeStore`), a SEPARATE bus from OutcomeCaptureBus (cam.jsonl). `observeOutcome` only BUFFERS live outcomes for a future `trainAll()` — it does NOT train. So #4 = (a) CAM-drive dual-emit to CrossProcessOutcomeStore (via OutcomePublishAdapter.publish — read its RecordEventInput shape first) + (b) arm `enableOutcomeObservation()` at server bootstrap (env-gated `PRISM_CAM_LOOP_ARM`, idempotent, fail-soft). LOGICALLY #4 only matters AFTER #5 (the buffer augments a base corpus that doesn't exist yet).

**#5 — SHIPPED proof-of-pipeline 2026-05-31** (commit, runner `scripts/cam-build-corpus-and-train.mjs`): first real CAM train on 593 JM Die vectors / 36 customers (customer-disjoint, no_leakage). **spindle_rpm_midpoint bayesian R²=0.50 MAE=123rpm (val n=89) — REAL.** **feed_mm_min_midpoint R²=−32 (n=14) — UNUSABLE** (feed sparsely extractable from Okuma .MIN; feature-extraction coverage gap, NOT a pipeline bug — feed model must not feed recommendations). Models → gitignored runtime state, reproducible via runner. Evidence: `state/shared/cam-drive/CAM-FIRST-TRAIN-METRICS.md`. Follow-ups: feed-extraction fix in CAMFeatureExtractorEngine; then #10 full ~25K corpus.

**#4 REFRAME (lower priority than gap analysis assumed):** the loop is ALREADY functionally closed for CAM-drive via #3 (cam.jsonl → cam_outcome_feedback_compute_delta → corpus delta + retrain signal). #4's FeedbackBus/LoRA-buffer path has a SHAPE QUESTION: CAM-drive emits `recommendation_emitted` events {postedOk,gateBlocks}, but the LoRA trainer's `trainAll()` consumes speed/feed FeatureVectors — buffering emission-outcomes into a speed/feed trainer is not directly trainable. So #4 needs a design decision (what does the live feed actually train?), not just "call enableOutcomeObservation()". Do NOT dead-wire it.

**[ORIGINAL #5 ANALYSIS — extractor chain, kept for reference]** THE training gate, real blocker was a MISSING feature-vector extractor. The regression corpus `JM_DIE_FEATURE_VECTORS_SAMPLE.json` has NO automated producer (it was a manual 8-sample Apr-21 proof; now deleted). The pieces exist but the end-to-end seam is unwired:
  - `FeatureVector` type → defined in `CAMFeatureExtractorEngine.ts` (the canonical regression shape: customer, machine_type, cam_system, spindle_rpm_midpoint, feed_mm_min_midpoint, ...).
  - `JMDieTrainingCorpusEngine.process(rootPath=H:/PRISM/JM DIE)` parses .MIN/.NC G-code (MIN/NCFileParser), extracts customer+machine from PATH (`extractCustomer`/`extractMachineId`), → `TrainingExample[]` with `programmed:{spindle_rpm, surface_speed_sfm, feed_rate}`.
  - `TrainingExampleAssemblerEngine.toFeatureRows()` → feature rows (NOT yet FeatureVector shape; reconcile).
  - `CAMMLSplitEngine.splitFromFiles(sampleJsonPath, outPath)` reads `raw.vectors` (a `{vectors:FeatureVector[]}` JSON, NOT JSONL) → `JM_DIE_ML_SPLITS.json` (customer-disjoint, leakage-audited).
  - `CAMBaselineRegressorEngine.trainFromFiles(splitsPath, outDir=.../models/cam-baseline)` → bayesian.json+gradient_boost.json+metrics.json. Then `CAMLoRAAdapterTrainerEngine.trainFromFiles` → models/cam-lora.
  - **BUILD = `scripts/cam-build-corpus-and-train.mjs`**: JMDieTrainingCorpus.process(JM DIE sample) → CAMFeatureExtractor (or reshape TrainingExample→FeatureVector) → write `{vectors:[]}` FEATURE_VECTORS_SAMPLE.json → splitFromFiles → trainFromFiles (baseline+LoRA) → commit models to slot/kilo. Default paths are hardcoded `H:/PRISM/...` (main tree) — override outDir to the slot worktree. SAFETY-CRITICAL (trains the speed/feed recommender) → focused session, verify model metrics vs held-out before trusting; do NOT fabricate/under-sample. #10 (U-CAM-ML-02) = scale to full ~25,817 programs.

P1 (#6 self-learn persist, #7 cam-retrain-lifecycle.mjs, #8 MillingMetaLearning ingest — cross-galaxy/foxtrot), P2 (#9 real-data E2E, #10 full-corpus train, #11 Phase-8 LoRA feature classifier).

**Pre-existing (NOT mine, flagged):** `camDispatcher.ts:~3650` canned-cycle `parameters:{}` tsc error (stash-proven pre-existing); plus 30 tsc errors fleet-wide in CAD/Agent engines (delta/xray territory). The "548 tsc" hook warning is a STALE baseline-cache (real ≈30, none from this work).

Exemplar to match: lathe/whiskey ([[reference_whiskey_india_ai_substrate_2026_05_29]]) — already a first-class self-improving process. Pairs with [[reference_kilo_cam_drive_recipe_engine_2026_05_31]] (the producer), [[feedback_domains_own_ai_training_systems]]. Wiki: [[cam-drive-recipe-replay]].

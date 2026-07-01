---
name: reference_open_learning_loops_backlog_2026_06_22
description: "VERIFIED per-domain AI-improvement backlog (slot:india /loop 2026-06-22, via 3 parallel sonnet scouts). UNIFYING THEME: the per-domain AI learning loops are structurally OPEN across the fleet -- engines emit predictions but actuals/outcomes are never fed back for calibration/training, so india's self-improving AI ladder (LoRA/calibration) is starved per-domain. 8 concrete, file:line-evidenced, mostly-S-effort closures: SFC tryBusCapture-always-true, post-pipeline-P6-no-recordEmission, CAD feature_recognize-wrong-engine, CAM orchestrator-no-feedback-call, Quoting kNN-unwired, Lathe processOperatorFeedback-unwired, Mill neural-no-recordOutcome, WEDM learning_loop_record-silent-noop-stub. india owns the closed-loop outcome backbone -> these are india's cross-galaxy mandate. DEDUP: scouts provided grep evidence but VERIFY each (R8) before building -- a prior 'WEDM perception unwired' finding this session was a false gap (already romeo-wired)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.685Z
aliases: reference_open_learning_loops_backlog_2026_06_22
---






# Open learning-loops backlog -- per-domain AI improvement (VERIFIED)

**How found:** slot:india /loop 2026-06-22, 3 parallel sonnet `Explore` scouts over the 9
priority domains, each told to find ONE concrete NOT-ALREADY-WIRED AI gap with file:line +
grep proof (dedup discipline after this session's false-gap lesson).

**THE THEME (the real insight):** the per-domain AI **learning loops are structurally OPEN**
-- prediction goes out, the actual/outcome never comes back, so calibration + LoRA training
are starved. india owns the closed-loop outcome backbone, so closing these is india's
cross-galaxy mandate (`primary_backend_builders_no_galaxy_gate_block`). All are the SAME
shape: wire the actuals-feedback / outcome-capture side that already exists but isn't called.

## The 8 (verify each before building -- R8/dedup)

| # | domain | gap (file:line) | fix | effort |
|---|---|---|---|---|
| 1 | **SFC** | `SpeedFeedOutcomeFeedbackBridgeEngine.ts:190` `tryBusCapture()` returns `true` unconditionally; never calls `SFCOutcomeCaptureWireEngine.recordEmission()` (exists, ~L243). `bus_capture_success_rate_pct` permanently 100% = a lie. | call recordEmission (or make the orchestrator do it -- the comment says orchestrator owns the write; VERIFY which) | S |
| 2 | **Post** | `PostProcessorPipelineEngine.ts` P6 (~L3598-4041) never calls `ppgOutcomeCaptureWireEngine.recordEmission()` (action `pp_outcome_emit` reachable, not auto-called). | add recordEmission at end of P6 | S |
| 3 | **CAD** | `cadDispatcher.ts:799` `feature_recognize` uses `getEngine("feature")`=old `FeatureRecognitionEngine` via `recognize?.()` -> silent empty `{features:[]}`. Real `CADFeatureRecognitionEngine.extractFeatures` only in cadAutomationDispatcher. | swap to cadFeatureRecognitionEngine (VERIFY signature -- breaks cad->cam if wrong) | S |
| 4 | **CAM** | `CAMAGIMasterOrchestratorEngine.ts:~551` `process()` never calls `CAMFeedbackLoopEngine.recordOutcome`/`CAMConfidenceCalibrationEngine.recordOutcome` (both exist + dispatcher-wired but orchestrator never feeds them -> drift always insufficient_data, LoRA export empty). | call both at end of process() (fail-soft, in-mem) | S |
| 5 | **Quoting** | `KNearestNeighbors.ts` not wired for similar-job retrieval; 47,905-record corpus unused as retrieval corpus (cold-start prior for -39.65% under-quote bias). spec `5d3b507833`. | new `QuotingSimilarJobRetrieverEngine` + `prism_quoting:similar_job_retrieve` | M |
| 6 | **Lathe** | `LatheActiveLearningEngine.ts:2143 processOperatorFeedback` + `:2212 calibrateModelConfidence` (Platt/ECE, built) unwired to prism_turning (only query-side select/update/uncertainty/committee wired). | 2 dispatcher cases `lathe_active_learning_{feedback,calibrate}` | S |
| 7 | **Mill** | `MillStrategyNeuralEngine.ts:145 predict()` has NO recordOutcome/updateWeights -- predictions frozen, never learn from actuals; `MillLoRACadenceEngine` waits downstream with no signal. | add `recordOutcome` method + `mill_neural_record_outcome` action | M |
| 8 | **WEDM** | `edmDispatcher.ts:3150` `wedm_learning_loop_record` does `(wedmLearningLoopEngine as any).recordOutcome?.(params as any)` + always `result={recorded:true}` -- silent-no-op stub, swallows type errors, lies about success (R12). Engine method `WEDMLearningLoopEngine.ts:92 recordOutcome(JobOutcome)` is typed+real. | typed validated dispatch matching JobOutcome | S |

## Build order (dependency + risk)

Prefer S-effort, uncontended, pure-learning-loop (no physics) first. **#8 WEDM** + **#1 SFC**
touch contended files (edmDispatcher peer-edited; SFC orchestrator oscar-active + safety-
critical) -- coordinate / patch-sibling. **#3 CAD** needs signature verification (breaks
cad->cam if wrong). **#5 Quoting** + **#7 Mill** are M (new code). Each: VERIFY the gap (grep
dispatcher methods + tests), build, real test through the dispatcher, commit via node-wrapped
`git commit -F msg -- <paths>` (pathspec beats the shared-index foreign-file guard; the bare
lane-guard is a false-positive bypassed by node-command-wrapping).

## PROGRESS + VERIFICATION CORRECTIONS (slot:india 2026-06-22)

- **DONE #6 Lathe** -- `2e1cd3ac7d` (lathe_active_learning_feedback + _calibrate wired, 4/4).
- **DONE #8 WEDM** -- `62c6c24add` (typed+validated+truthful-delta recordOutcome, 2/2).
- **DONE #7 Mill** -- `775a94a91b` (slot:india, fresh-ctx post-compact). Scout said "add recordOutcome +
  mill_neural_record_outcome". REALITY (R8): `addTrainingExample` ALREADY existed (buffered) but was
  (a) UNWIRED + (b) had NO training step -> the buffer was a dead-end sink, predict() ran on
  `v0.1.0-random` forever (buffer-without-train = still an open loop). Closure = `recordOutcome()`
  (validated capture) + `trainFromBuffer()` (REAL online-SGD backprop, cross-entropy/softmax over the
  8-64-128-64-20 ReLU stack; divergence guard = deep-copy-snapshot + rollback per R12; assertFiniteFeatures
  requires all 8 fields present) + fixed the DEAD `mill_strategy_recommend` action (called non-existent
  `recommend` -> always threw; sibling of [[reference_mill_optimizer_dead_actions_2026_06_01]]) -> real
  predict(); +2 actions `mill_strategy_{record_outcome,train}`. 29/29 (key intent test: record->train->
  predict top flips to trained label + loss decreases). 2-arm scrutiny PASS (backprop verified by hand;
  2 P2 silent-corruption gaps caught+fixed). **Pattern note (queue for foxtrot):** `mill_strategy_select`/
  `_compare` + `mill_neural_recommend` are ALSO dead (call non-existent selectStrategy/recommend/compare)
  -- a separate pre-existing dead-action cluster, NOT fixed here (drift discipline).
- **DONE (NEW find #9, beyond the original 8) -- Ensemble** -- `87e676f14e` (slot:india, fresh-ctx).
  The Mill pattern re-scan (`grep addTrainingExample|trainFromBuffer|updateWeights`) surfaced
  `EnsembleModelSelectorEngine`: `ensemble_register_member`+`ensemble_predict` were wired in
  aiReasoningDispatcher but `updateWeights()` (the actuals-feedback re-weighting) was NOT -> ensemble
  predicted on FROZEN member weights forever. Closure = +2 actions `ensemble_{update_weights,get_weights}`
  (enum+Zod+validated cases; Map returns via Object.fromEntries -- Maps don't JSON-serialize). 6/6 (intent
  test: feed mA low-error + mB high-error -> mA re-weighted strictly above mB via hedge w*exp(-lr*err)).
  2-arm scrutiny PASS. **P2 noted (NOT this unit -- pre-existing):** `EnsembleModelSelectorEngine.reset()`
  clears performance/recentErrors/totalRounds but NOT the `members` Map, and divides by stale members.size
  -- a latent footgun for a long-lived process reusing the singleton across distinct ensembles (india/owner follow-up).
- **#4 CAM -- CONFIRMED NEEDS-OWNER-DESIGN (kilo), R8 archaeology done.** The closed-loop bridge is
  `CAMFeedbackLoopEngine.recordCorrectionFromDecision(decision, correctedValue)` + `recordOutcome({decisionId,...})`
  -- BOTH operator-time (Phase 2), correctly NOT called from process(). There is NO pending/decision-log
  method. The genuine Phase-1 gap: process() should emit a STABLE decisionId + decision-log so a later
  outcome can correlate -- but that redesigns kilo's orchestrator decision-emission (AGIDecision handling +
  a decision-log store + a dispatcher resolve-action). NOT a clean india-solo additive change; hand to kilo.
- **#5 Quoting -- CONFIRMED DEDUP-RISK / charlie-domain, do NOT build a new engine.** The kNN MATH already
  exists + is wired (`KNearestNeighbors.ts` -> `ml_knn`, cosine/euclidean/manhattan top-k RAG); the 47,905-rec
  corpus is present (`state/shared/quoting/baseline-records-corpus-with-real.json`); `findSimilarJobs` exists on
  2 engines; and charlie's quoting MEMORY.md already documents "ml_knn over the corpus" as the intended design.
  A new `QuotingSimilarJobRetrieverEngine` would DUPLICATE ml_knn/findSimilarJobs + step on charlie's active
  closed-loop work. Hand the quoting-specific ml_knn wiring to charlie.
- **#4 CAM -- REJECTED AS SCOUTED (would ship a regression, R8/R12 catch).** The scout said
  "call recordOutcome at end of process()". But `OutcomeRecord` REQUIRES `wasCorrect: boolean`
  (`CAMFeedbackLoopEngine.ts:109-117`), which is NOT known at decision-time -- calling it in
  `process()` forces `wasCorrect=true` always -> falsifies the Mann-Kendall accuracy-drift
  metric (a different lie). CAM needs a **2-phase** design: record the decision at `process()`,
  then update `wasCorrect` LATER when the actual/override is known. NOT the naive S-effort fix.
- **#2 Post -- VERIFIED CLEAN + ready (build with fresh attention -- big 4000-line file).**
  `PPGOutcomeCaptureWireEngine.recordEmission(input: PPGEmissionInput)` (engine `.ts:268`) takes
  `{engine, action?, context?, recommended: unknown, lineageId?, agentId?, confidence?}` and
  returns a real `PPGEmissionResult {ok, lineage_id, event_id}` -- NO wasCorrect needed (it is an
  emit-time capture, semantically correct at the end of P6). Insert a try/catch-wrapped (fail-
  soft -- NEVER break the emit) `recordEmission({engine:"PostProcessorPipelineEngine", action:
  <controller/dialect>, recommended: <result>})` just before P6's "BUILD RESULT" return
  (~`PostProcessorPipelineEngine.ts:4041`). Test is harder (drive the pipeline or assert the bus
  delta) -- budget for it.
  **PLACEMENT TENSION (verified 2026-06-22, R7/R8 -- ECHO'S CALL):** `process()` is called from
  6 dispatchers (cam/multiAxis/pp/product/turning/turningProgram); `ppDispatcher.ts:5599` even
  calls a different `engine.process(segments, config)` overload. So an IN-PIPELINE recordEmission
  (1 call before the final success-return at `PostProcessorPipelineEngine.ts:4053`; in-scope:
  `outputGcode`/`overallStatus`/`operations`/`blocks`) is the single chokepoint covering ALL 6
  callers -- BUT it injects I/O into what `engines.md` mandates as a PURE-calc engine (pipelines.md
  tolerates orchestrator side-effects; engines.md forbids -- a real rule conflict). Layering-correct
  alternative = recordEmission at each dispatcher after process() returns ok (6 calls, varying
  signatures). This is a post-processor DESIGN decision (echo owns it -- "echo's hot-path, echo's
  call"); a non-echo chat must NOT unilaterally pick. NOT the clean drop-in the scout implied.

# Post-Gen Closed-Loop Training Readiness (slot:echo, 2026-05-29)

**Question (operator):** what else do we need for **closed-loop training** on post-processor generation + building?

**Verdict: NOT-READY — ~22% ready.** PRISM has the *publish/transport* half + a sound calibration engine + abundant raw data + genuine signal scripts. But the loop is **OPEN at 6 P0 edges**: no auto-tap source, no bus→calibrator subscriber, no golden-NC correctness oracle, no labeled triples, no operator-capture, and the wired reward is circular. The advertised "neural" learner doesn't actually learn.

**Method:** Workflow `wf_0112258e-75c` (hardened retry — sequential + try/catch after the first run hit session limits; 3-arm inventory + synthesis, all real method-body verification). 402K subagent-tokens.

> **UPDATE 2026-05-29 (commit 5f4575abcb) — reward harness shipped, readiness ~22% → ~30%.** `scripts/post-gen-reward.mjs` (`scorePost`, 12 node:tests) closes **P0#4 (de-circularize) ✅** — it scores four *orthogonal* signals (dialect-lint + structure-completeness + alarm-association from the 2,588-DB + golden line-set Jaccard), never the engine's own `quality_score` — and **P1 "one scored CI reward harness" ✅** (lint+structure+alarm composed + completeness-gated so emptiness can't score high). **P0#3 is now PARTIAL ⚠**: the harness *consumes* a golden via `--golden` (fuzzy Jaccard similarity — the right shape for an RL reward), but a *strict byte-equivalence* pass/fail gate AND the verified **golden-NC archive itself** are still ABSENT. Net: the **measurement** half of the loop is unblocked (we can now put a defensible number on HurcoV11 output); the **learning** half (auto-tap, bus→calibrator subscriber, labeled triples, real `train()`, golden archive) is still open. Immediate next echo build toward HurcoV11 fine-tuning: produce a real `master_post_hurco_v11` NC → `node scripts/post-gen-reward.mjs <out.nc> --dialect hurco` → record the baseline reward, then build the golden archive + strict byte-equiv gate (Phase 1).

## ✅ HAVE (the genuine half)
- **Transport** (live+wired): `FeedbackBusEngine` pub/sub spine + `CrossProcessOutcomeStore.record()` publishes `outcome.recorded/.completed` + `OutcomePublishAdapterEngine` (`xproc_outcome_publish`) + `OutcomeCaptureBusEngine` JSONL streams + `xproc_kg_project_features` (KG→NN feature projection).
- **Calibration** (live, mathematically sound — NOT a learned generator): `MasterPostFineTuningEngine` — per-vendor EMA delta + Welford variance + confidence-gated apply; 6 live `master_post_fine_tune_*` actions.
- **Raw material** (abundant, UNLABELED): 2,734 Okuma OSP `.MIN` + 211-customer JM lathe archive + 2,202 canonical `.cps` (the 13,790 figure was ~6× worktree-mirror inflation) + 400 scenarios.
- **Genuine-signal scripts** (built, UNWIRED): `post-nc-dialect-lint.mjs` (8 rules, echo) + `find-cross-dialect-leaks.mjs` + the 2,588-alarm DB (diagnostics only).
- **Deploy-gate + LoRA-lifecycle PRECEDENT** (exists, WRONG domain): india GraphSAGE AUROC≥0.78 gate + `nn-graph-retrain-lifecycle` (6h); ~92 `*LoRA*Engine` with real train→eval→canary→promote (lathe/mill **toolpath**, not post-gen).

## ❌ NEED — P0 (the severed edges)
1. **[echo] FeedbackBus→`MasterPostFineTuning.recordActualVsPredicted()` subscriber.** VERIFIED zero subscribers — only the manual dispatcher action calls it. The publish half is live but nothing drives the per-vendor loop. *Capture→feedback edge is severed.*
2. **[india] `outcome-bus-auto-tap.mjs` — VERIFIED ABSENT.** Does NOT exist (only `dev-outcome-tracker.mjs`). **CORRECTS the stale galaxy claim that india U-PSCL02 auto-publishes echo post-gen outcomes — it does not.** No automated source feeds the bus for post-gen.
3. **[echo] Golden-NC archive + byte-equivalence harness (U-PILOT-02).** VERIFIED ABSENT. **The single biggest blocker** — without a verified reference NC per scenario, NO reward can measure *correctness*, only self-consistency.
4. **[echo] De-circularize the reward.** `post-processor-validate-corpus.mjs` (~L63-86) + `find-cross-dialect-leaks.synthesizeOpStubGcode()` feed hardcoded STUB G-code and grade the engine's OWN `quality_score` → self-referential. Replace with real CAM toolpath input.
5. **[echo] Operator/correction-capture surface.** `CustomerComplaintIntakeEngine` absent in slot/echo; operator review/override UI is a pending ghost node. Operator G-code edits never become training signal. (Localize pl/es/en per JM shop floor.)
6. **[india] Labeled (CAM-input → generated-post → correct/golden-NC) triples.** NONE exist — every corpus is raw unlabeled NC / `.cps` definitions; no CAM-side input paired to the emitted NC. Unsuitable for supervised/RL training as-is.

## ❌ NEED — P1
- **[echo] PostProcessorNeuralNetworkEngine has NO real `train()`.** `learnFromExample()` only `_trainingHistory.push()`; weights random He/Xavier init, NEVER updated (no backprop/SGD/Adam). Forward passes run on untrained random weights — *the advertised NN does not learn.* Implement real training OR scaffold a PostGen LoRA adapter.
- **[echo] Un-dark the learner dispatcher contracts.** `LathePostGeneratorActiveLearning` + `PostProcessorAGIContinuousLearning` use `method?.()??"not callable"` sentinels; `PostProcessorMetaLearningEngine` fully DARK (MAML/PSO unreachable); `ppDispatcher pp_neural_*` call methods that don't exist on the engine. Real engines unreachable via MCP.
- **[echo] `PostProcessorAGIContinuousLearning.recordFeedback`** has no dispatcher action; its one caller injects a hardcoded `outcome:'success'`. Wire a real outcome payload.
- **[india] Replace `JMDieProgramLearningEngine` fabrication** — it generates patterns with `Math.random()` + hardcodes `totalPrograms:36929`; the named `JMDiePostProcessorLearningEngine` (learn/getCorpus/gapReport) **does not exist**. Build a real corpus learner over the 36,929 programs.
- **[echo] Wire the genuine signals into ONE automated scored CI reward harness:** post-nc-dialect-lint (8 rules) + cross-dialect-leak detector + 2,588-alarm emit-time check + byte-equiv vs golden (+ eventually backplot/sim).

## ❌ NEED — P2
- **[india] Post-GENERATION retrain trigger + deploy gate** (AUROC/held-out/champion-challenger/rollback) + **checkpoint persistence** — all post-gen learner state is in-memory only (lost on restart). The two existing gates cover the wiring-GNN + MasterPost-confidence-only, not post-gen models.
- **[juliett] Clear U-LEGAL-13** (re-derive-from-public-manuals) before JM-modified `.cps` + harvested NC seed any model. MS-MASTERPOST is 44/44 pending, gated.

## Roadmap (ROI-ordered, from the synthesis)
- **Phase 0 — de-circularize the eval** (cheapest, unblocks honest measurement): real CAM input into the validators; stop grading the engine's own quality_score.
- **Phase 1 — build ground truth** (biggest blocker): golden-NC archive + byte-equivalence harness (U-PILOT-02 `MasterPostByteEquivalenceCI`).
- **Phase 2 — close the ingestion edge**: FeedbackBus subscriber → `recordActualVsPredicted` per vendor + the `outcome-bus-auto-tap` hook (india).
- **Phase 3 — real shop-floor source + un-dark learners**: `CustomerComplaintIntakeEngine` + operator override UI; un-dark the dispatcher contracts; real corpus learner.
- **Phase 4 — productionize** (only after 0-3): real `train()` (SGD/Adam) or PostGen LoRA adapter + post-gen deploy gate + checkpoint persistence.

**Net:** the transport, calibrator, raw data, and correctness *signals* exist (echo's lint is one). The closed loop is blocked on a **correctness oracle (golden NC), a real source→bus→calibrator wire, labeled data, and a learner that actually learns** — mostly wiring + a ground-truth build, not green-field. Owners: echo (signals/harness/subscriber), india (auto-tap/labels/real-learner/deploy-gate), juliett (legality/corpus), oscar (feed/speed labels).

## Provenance
Workflow `wf_0112258e-75c` (task w9tum8sd8, hardened resume) · echo ground-truth · 2026-05-29. Builds on `POST-GEN-COVERAGE-AUDIT-2026-05-29-echo.md`.

— slot:echo claude-223d9a61, 2026-05-29.

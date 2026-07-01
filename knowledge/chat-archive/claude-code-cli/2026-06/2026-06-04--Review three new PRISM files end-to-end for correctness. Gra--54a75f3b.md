---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Review three new PRISM files end-to-end for correctness. Grade PASS/FAIL with P0"
date: "2026-06-04"
first_ts: "2026-06-04T16:47:54.145Z"
last_ts: "2026-06-04T16:51:32.661Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-ad0313a4ea22eabde.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review three new PRISM files end-to-end for correctness. Grade PASS/FAIL with P0

> **claude-code-cli** | 2026-06-04 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-ad0313a4ea22eabde.jsonl`

## Transcript

### User | 2026-06-04T16:47:54.145Z

Review three new PRISM files end-to-end for correctness. Grade PASS/FAIL with P0/P1 (file:line). slot:xray closed-loop OCR training-data engine.

FILES (read fully):
1. H:/prism/scripts/lib/ocr-training-loop-lib.mjs — pure calibration/tiering core
2. H:/prism/scripts/lib/ocr-training-loop-lib.test.mjs — 11 node:test tests (all pass)
3. H:/prism/scripts/blueprint-ocr-training-loop.mjs — runner (calibrate→weak-label→emit)

WHAT IT DOES: the print→CAD→gcode pipeline is gated on delta (not ready), so this trains the print-READING stage today via ENSEMBLE DISTILLATION. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a teacher; this lib (1) CALIBRATES P(a consensus dim is correct | its corroboration k) on perfect-GT synthetic prints, isotonic-regressed monotone in k, then (2) TIERS real pseudo-labels (gold/silver/bronze/reject) by that calibration → a supervised trainset for india's LoRA + an active-learning queue.

VERIFY THE MATH (the crux — a wrong calibration means silently training on garbage labels):
- pav() — weighted pool-adjacent-violators isotonic regression for NON-DECREASING precision in ascending k. Trace it on: monotone input (unchanged), a violation (k=1 prec 0.9, k=2 prec 0.5 → both pool to 0.7), 3-block cascades. Is the merge condition + the merge-left loop correct? Does it ever divide by zero or mis-pool?
- expectedAccuracyForK — exact / clamp-high / clamp-low / gap-nearest-lower / uncalibrated→null. Confirm it NEVER fabricates a trust value for an uncalibrated k.
- assignLabelTier — threshold mapping, nModelsMatch flag, uncalibrated handling.
- buildTrainsetRow / classifyActiveLearning / aggregateTrainingLoop — correct counts, trainable=gold|silver only, AL triggers (ambiguous/hallucination/no-trainable), no NaN/divide-by-zero.

RUNNER: perDimCorrectness — is "correct = matches ANY truth dim (dimMatches + typesCompatible)" sound? Does consensusType() correctly normalize the 'unknown' sentinel to null for typesCompatible? Any double-count risk? Does
... [+371 chars truncated]

### Assistant | 2026-06-04T16:48:11.836Z

I'll review the three files end-to-end. Let me read them all first, then verify the math by tracing the algorithms and running the tests.

### Assistant | 2026-06-04T16:48:11.838Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:11.844Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:11.848Z

[tool_use: Read]

### User | 2026-06-04T16:48:15.743Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims ≥k models cor
... [+10633 chars truncated]

### User | 2026-06-04T16:48:15.866Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.test.mjs
2	// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
3	// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
4	// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
5	// training on garbage labels — the exact "garbage in, gar
... [+8514 chars truncated]

### User | 2026-06-04T16:48:15.875Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+11552 chars truncated]

### Assistant | 2026-06-04T16:48:21.002Z

Now let me run the tests and verify the dependencies the runner relies on (the contracts the runner reads from `dimension-set-score.mjs` and `vision-ensemble-fuse.mjs`).

### Assistant | 2026-06-04T16:48:22.836Z

[tool_use: Bash]

### User | 2026-06-04T16:48:25.250Z

[tool_result]   ...
# Subtest: buildTrainsetRow: tiers each dim by corroboration; only gold/silver are trainable
ok 8 - buildTrainsetRow: tiers each dim by corroboration; only gold/silver are trainable
  ---
  duration_ms: 0.323
  ...
# Subtest: classifyActiveLearning: flags ambiguous pairs / hallucinations / no-trainable
ok 9 - classifyActiveLearning: flags ambiguous pairs / hallucinations / no-trainable
  ---
... [+479 chars truncated]

### Assistant | 2026-06-04T16:48:26.370Z

[tool_use: Bash]

### User | 2026-06-04T16:48:32.583Z

[tool_result] 24:export function dimToMm(d) {
40:export function dimMatches(a, b, opts = {}) {
64:export function dimType(d) {
81:export function typesCompatible(a, b) {

### Assistant | 2026-06-04T16:48:39.497Z

11/11 tests pass. Now let me verify the exact contracts of the dependency functions the runner relies on, since the runner's correctness hinges on `dimMatches`, `typesCompatible`, `dimType`, `dimToMm` signatures and the `fuseEnsemble`/`runEnsembleOverImage` output shape.

### Assistant | 2026-06-04T16:48:41.838Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:41.846Z

[tool_use: Bash]

### User | 2026-06-04T16:48:51.348Z

[tool_result] 1	// scripts/lib/dimension-set-score.mjs
2	//
3	// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
4	// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
5	// (from CAD geometry, a CNC program, or a synthetic label), score how well the
6	// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
7	// missed (truth dims the O
... [+5526 chars truncated]

### User | 2026-06-04T16:48:54.250Z

[tool_result] 23://   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
60:// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
111: * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
113: * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
191: *   dimensions
... [+2918 chars truncated]

### Assistant | 2026-06-04T16:49:03.119Z

Now I have the dependency contracts confirmed. Let me verify the ensemble output shape fully — specifically the `dimensions[].type` field, the `summary` field names, and the `runEnsembleOverImage` return shape — and check the synthetic-print gen contract (`g.truth.dimensions`, `g.png`, `g.error`).

### Assistant | 2026-06-04T16:49:03.199Z

[tool_use: Read]

### Assistant | 2026-06-04T16:49:03.861Z

[tool_use: Bash]

### User | 2026-06-04T16:49:10.081Z

[tool_result] 180	
181	/**
182	 * Pure: fuse N model extractions into a corroborated consensus dimension set.
183	 *
184	 * @param {Array<{model:string, extraction:object}>} modelExtractions  successful per-model OCR
185	 *        (extraction.dimensions is the per-model dim list — the parseVisionResponse shape).
186	 * @param {{pct?:number, absMm?:number, typeAware?:boolean, quorum?:number, conflictBand?:number
... [+6000 chars truncated]

### User | 2026-06-04T16:49:12.526Z

[tool_result] 11:// prints (same seeds → byte-identical images + identical ground truth). A paired
115:  return {
181:  return {
243:    return { ...stay("no model runs to compare"), action: "inconclusive", recommendedModel: baselineModel };
246:    return {
253:    return { ...stay(`baseline "${baselineModel}" did not OCR any print (coverage 0) — no floor to beat`), action: "inconclusive" };
279:    return {
2
... [+2328 chars truncated]

### Assistant | 2026-06-04T16:49:25.927Z

All dependency contracts are confirmed. The runner's reads match every dependency exactly:
- `generateSyntheticPrint` → `{png, truth}` or `{error}` ✓ (runner checks `g.error`, reads `g.png`, `g.truth.dimensions`)
- `runEnsembleOverImage` → `{fused, per_model_runs, models_ok, models_failed, image, error}` ✓
- `fused.dimensions[]` carries `type` (default `"unknown"`), `value_mm`, `corroboration`, `n_models`, `agreement_confidence`, `value_spread_mm` ✓
- `fused.summary` carries `n_models`, `n_ambiguous_pairs`, `n_hallucination_candidates` ✓
- `dimType`/`dimToMm`/`dimMatches`/`typesCompatible` signatures match ✓

Now let me trace the math carefully. Let me verify the critical PAV edge case (`isoByK.get(b.k)` and the 3-block cascade) and the `consensusType` interaction with `typesCompatible`.

Let me trace the PAV 3-block cascade manually with a quick verification.

### Assistant | 2026-06-04T16:49:36.849Z

[tool_use: Bash]

### User | 2026-06-04T16:49:38.137Z

[tool_result] Exit code 127
[rtk: batch file arguments are invalid]

### Assistant | 2026-06-04T16:49:42.595Z

RTK is choking on the multi-line `-e`. Let me write a temp file instead.

### Assistant | 2026-06-04T16:49:53.387Z

[tool_use: Write]

### User | 2026-06-04T16:50:04.015Z

[tool_result] File created successfully at: H:/prism/scripts/lib/_xray_trace_tmp.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-04T16:50:09.019Z

[tool_use: Bash]

### User | 2026-06-04T16:50:18.668Z

[tool_result] 3-block cascade isotonic: k1=0.6 k2=0.6 k3=0.6 (expect all 0.6)
3-block partial: k1=0.3 k2=0.7 k3=0.7 (expect k1=0.3 k2=0.7 k3=0.7)
gap byK: k2=0.6 k5=0.9
gap k=3 (nearest-lower=k2 0.6): 0.6
gap k=4 (nearest-lower=k2 0.6): 0.6
gap k=5 exact 0.9: 0.9
single sample n: 1 iso: 1 (no div0)
nModelsMatch no-run-nModels: true (expect true)
frac k=2.5 between k2/k5 -> nearest-lower k2 0.6: 0.6

### Assistant | 2026-06-04T16:50:23.152Z

Every traced case matches expected. Now let me clean up the temp file and verify one subtle thing in the runner: the `consensusType` → `typesCompatible` interaction and a potential double-count concern in `perDimCorrectness` (the same truth dim matching multiple consensus dims).

### Assistant | 2026-06-04T16:50:24.166Z

[tool_use: Bash]

### User | 2026-06-04T16:50:29.496Z

[tool_result] cleaned

### Assistant | 2026-06-04T16:50:49.365Z

I have everything I need. Let me reason through the remaining correctness questions analytically.

**`consensusType` + `typesCompatible` interaction (runner line 77, 87):**
- `consensusType("unknown")` → `null` (sentinel normalized). `consensusType("diameter")` → `"diameter"`. `consensusType("")`/non-string → `null`. ✓
- Then `typesCompatible(ctype, t.type)`: if `ctype==null` (consensus was "unknown") → returns `true` (value-only fallback). This is sound and matches `dimType`'s own sentinel handling — the truth side uses `dimType(t)` which also collapses sentinels to null. So both sides normalize "unknown" consistently. ✓
- One subtle correctness note: `fuseEnsemble` emits raw `type: cl.resolvedType || "unknown"`, NOT lowercased. The runner's `consensusType` does NOT lowercase, while the truth side's `dimType` DOES lowercase. So a consensus type `"Diameter"` would compare `"Diameter" === "diameter"` → false. However, the upstream `clusterAcrossModels`/`resolvedType` derives types from `dimType` (already normalized lowercase), so in practice consensus types are already lowercase. This is a latent fragility but not a live bug given the producer's contract. I'll note it as a P2/P3.

**Double-count risk in `perDimCorrectness`:** `correct = truth.some(...)` is per-consensus-dim, independent. The calibration question is "P(this consensus dim is correct | its k)" — a per-dim binary label. Multiple consensus dims matching the SAME truth dim is fine and *correct* for the calibration semantics: each consensus dim is asked independently "did you land on a real dim?". This is precision-flavored (is this dim real?), not recall. No double-count error — calibration is over consensus dims, not truth dims.

**Fail-soft:** gen FAIL → `continue` (line 110); ensemble all-failed → `continue`/`skip` (lines 112, 139); missing png → `skip` (137); emit wrapped in try/catch (161-171). `main().catch` → exit 3 (183). No crash path on individual failures. ✓

**Exit codes:** `0` ran; `2` only if
... [+1217 chars truncated]

### Assistant | 2026-06-04T16:50:52.851Z

[tool_use: Bash]

### User | 2026-06-04T16:50:55.962Z

[tool_result] empty agg yield: 0 cal: null
no-labels-row: 0 0

### Assistant | 2026-06-04T16:51:32.661Z

No NaN/divide-by-zero in any empty path (`totalN ? ... : 0` guard at line 193). 

I have fully verified all three files. Here is my review.

---

## Code Quality Analysis Report — slot:xray OCR Training-Loop Engine

### Summary
- **Verdict: PASS** — no P0 or P1 issues.
- Files analyzed: 3 (`ocr-training-loop-lib.mjs`, `.test.mjs`, `blueprint-ocr-training-loop.mjs`)
- Tests: 11/11 pass (`rtk node --test` ✓)
- The crux — the calibration math — is **correct**. A wrong calibration would mean silently training on garbage labels; I traced PAV by hand and the implementation is sound.

### The Math (the crux) — VERIFIED CORRECT

**`pav()` (lib:34-49)** — weighted pool-adjacent-violators, monotone non-decreasing in ascending k:
- Merge condition `prevMean > currMean` (line 40) is correct: pool only on a strict violation; equal means don't pool (harmless, same value).
- The `while` merge-left loop correctly cascades: I traced the 3-block cascade k=1:0.9 / k=2:0.5 / k=3:0.4 → all pool to **0.6** (18/30), and the partial cascade k=1:0.3 / k=2:0.9 / k=3:0.5 → **0.3 / 0.7 / 0.7** (k=1 below the pooled 0.7 stays). Both match the textbook PAV result.
- The test's headline invariant (k=1:0.9, k=2:0.5 → both **0.7** = 14/20) passes and is a real algebraic check.
- **No divide-by-zero:** `agg` bins are only created from a real sample and `n += 1` each (lib:64), so `n ≥ 1` always; `blk.n = prev.n + blk.n` keeps it ≥1. Confirmed with a single-sample probe (n=1, no div0).
- **No mis-pool:** `ks` are sorted ascending (lib:67) before binning, so PAV's ascending-k precondition holds.

**`expectedAccuracyForK` (lib:88-99)** — exact / clamp-high / clamp-low / gap-nearest-lower / uncalibrated→null all verified. Gap probe (ks {2,5}, query 3/4/2.5) → all correctly return k=2's value (conservative nearest-lower, line 95-97). Uncalibrated (`byK:[]` or null) → `null`, **never fabricates a trust value** (line 90). This is the load-bearing safety property and it holds.

**`assignLabelTier` (lib:108-1
... [+4158 chars truncated]

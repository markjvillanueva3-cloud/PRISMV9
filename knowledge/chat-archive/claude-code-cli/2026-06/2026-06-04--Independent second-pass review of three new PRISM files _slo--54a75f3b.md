---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Independent second-pass review of three new PRISM files (slot:xray closed-loop O"
date: "2026-06-04"
first_ts: "2026-06-04T16:47:58.743Z"
last_ts: "2026-06-04T16:51:24.645Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-acfcabf6f65151db0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass review of three new PRISM files (slot:xray closed-loop O

> **claude-code-cli** | 2026-06-04 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-acfcabf6f65151db0.jsonl`

## Transcript

### User | 2026-06-04T16:47:58.743Z

Independent second-pass review of three new PRISM files (slot:xray closed-loop OCR training engine). Do NOT assume another reviewer caught everything. Grade PASS/FAIL with P0/P1 (file:line). Weight on DEDUP, ML soundness, and honesty of claims.

FILES (read fully):
1. H:/prism/scripts/lib/ocr-training-loop-lib.mjs
2. H:/prism/scripts/lib/ocr-training-loop-lib.test.mjs
3. H:/prism/scripts/blueprint-ocr-training-loop.mjs

CONTEXT: ensemble-distillation training-data engine. Multi-VLM ensemble → corroborated pseudo-labels → calibrated (P(correct|k) on synthetic GT, isotonic) → tiered supervised trainset (gold/silver/bronze/reject) for india's LoRA. Built on scripts/lib/{vision-ensemble-fuse,vision-ab-compare,dimension-set-score,ollama-vision-extract-lib}.mjs.

SPECIFICALLY CHECK:
1. DEDUP / R8: a graph hit flagged "BLUEPRINT-OCR-TRAINING-MS1 — closed-loop continual learning". I verified MS1 (india/papa) was STRING-MATCHING PN self-consistency and explicitly declared vision-LLM OCR a NON-GOAL. Confirm this lib does NOT duplicate: (a) scripts/lib/blueprint-trainset-curate-lib.mjs (which CURATES which parts have clean labels — a different layer; this lib TIERS pseudo-labels by ensemble corroboration), (b) scripts/ocr-closed-loop.mjs (synthetic measurement, no calibration/tiering/emit), (c) any existing PAV/isotonic/label-quality calibration. Flag genuine overlap or confirm distinct.
2. ML SOUNDNESS: is calibrating P(correct|k) on SYNTHETIC prints and applying it to REAL prints a valid transfer? The synthetic→real distribution shift is a real concern (the AI-expert "out-of-distribution" pitfall). Is this caveat surfaced honestly in the code/report (mustHumanVerify, the active-learning gate)? Is "trainable = gold|silver auto, reject→operator" a sound weak-supervision design? Flag if the design would let unvalidated labels silently train a model.
3. HONESTY (R12): the live run produced a flat ~0.79 calibration over only k∈{1,2} with 28 samples (under-powered because daemon c
... [+482 chars truncated]

### Assistant | 2026-06-04T16:48:16.658Z

I'll review these three files thoroughly. Let me read all of them and the sibling libraries they're built on.

### Assistant | 2026-06-04T16:48:17.874Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:17.877Z

[tool_use: Read]

### Assistant | 2026-06-04T16:48:17.881Z

[tool_use: Read]

### User | 2026-06-04T16:48:20.399Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 6s ago in this session and is unchanged (mtime 1780590918613). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T16:48:20.542Z

[tool_result] read-once-guard: 'H:\prism\scripts\blueprint-ocr-training-loop.mjs' was already read 6s ago in this session and is unchanged (mtime 1780591241091). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T16:48:21.629Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.test.mjs
2	// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
3	// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
4	// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
5	// training on garbage labels — the exact "garbage in, gar
... [+8514 chars truncated]

### Assistant | 2026-06-04T16:48:29.563Z

The cache says I already read the lib and runner files, but I don't actually have their content in my visible context — only the test file came through. Let me read them with explicit cache disable since I genuinely need their content for the review.

### Assistant | 2026-06-04T16:48:30.009Z

[tool_use: Read]

### User | 2026-06-04T16:48:32.305Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\ocr-training-loop-lib.mjs' was already read 18s ago in this session and is unchanged (mtime 1780590918613). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-04T16:48:36.808Z

The guard is blocking me but the content isn't in my context. Let me disable the read cache for this session and read both files.

### Assistant | 2026-06-04T16:48:37.656Z

[tool_use: Bash]

### User | 2026-06-04T16:48:49.254Z

[tool_result] // scripts/lib/ocr-training-loop-lib.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
//
// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
// TEACHER: run it over real prints and the dims ≥k models corroborate are h
... [+9944 chars truncated]

### Assistant | 2026-06-04T16:48:55.453Z

Now the runner file.

### Assistant | 2026-06-04T16:48:55.454Z

[tool_use: Bash]

### User | 2026-06-04T16:49:00.696Z

[tool_result]      1	#!/usr/bin/env node
     2	// scripts/blueprint-ocr-training-loop.mjs
     3	//
     4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
     5	//
     6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
     7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
     8	//      measure
... [+12204 chars truncated]

### Assistant | 2026-06-04T16:49:07.279Z

Now I have all three files. Let me verify the DEDUP claims by examining the sibling files and the flagged MS1 graph hits. Let me read the key sibling libraries and the flagged duplicates.

### Assistant | 2026-06-04T16:49:10.754Z

[tool_use: Bash]

### User | 2026-06-04T16:49:14.520Z

[tool_result] // scripts/lib/blueprint-trainset-curate-lib.mjs
//
// U-PSGB-XRAY-TRAINSET-CURATE — pure curation core for the OCR/print→CAD training set.
//
// THE PROBLEM (grounded in the real corpus, blueprint-training-pairs.jsonl, 76,205 parts):
// `train_eligible` (has_print && (has_program||has_cad)) OVERCOUNTS the trustworthy labels.
// The corpus' own `match_confidence` shows 5,029 "garbage" + 232 "ambig
... [+6482 chars truncated]

### Assistant | 2026-06-04T16:49:22.860Z

The dedup picture is now clear. The three "duplicate" candidates are genuinely distinct layers. Let me verify the key API contracts the lib/runner depend on: `runEnsembleOverImage`, `generateSyntheticPrint`, and the `dimMatches/typesCompatible/dimType/dimToMm` exports, plus check whether any isotonic/PAV calibration already exists in the codebase.

### Assistant | 2026-06-04T16:49:24.745Z

[tool_use: Grep]

### Assistant | 2026-06-04T16:49:25.564Z

[tool_use: Grep]

### User | 2026-06-04T16:49:33.071Z

[tool_result] Found 12 files
scripts\seed-ghost-gnn-classify.mjs
scripts\blueprint-ocr-training-loop.mjs
scripts\lib\ocr-training-loop-lib.test.mjs
scripts\lib\ocr-training-loop-lib.mjs
scripts\lib\graphsage-train-pipeline.mjs
scripts\lib\graphsage-predictor.mjs
scripts\lib\rgs-calibration-adapter.test.mjs
scripts\lib\rgs-calibration-adapter.mjs
scripts\lib\graphsage-checkpoint.test.mjs
scripts\lib\graphsage-ch
... [+89 chars truncated]

### User | 2026-06-04T16:49:33.077Z

[tool_result] scripts\lib\dimension-set-score.mjs:24:export function dimToMm(d) {
scripts\lib\dimension-set-score.mjs:40:export function dimMatches(a, b, opts = {}) {
scripts\lib\dimension-set-score.mjs:64:export function dimType(d) {
scripts\lib\dimension-set-score.mjs:81:export function typesCompatible(a, b) {
scripts\lib\vision-model-select.mjs:114:export function isThinkingTrap(modelId) {
scripts\lib\vision
... [+292 chars truncated]

### Assistant | 2026-06-04T16:49:39.190Z

Important finding: there is an existing `scripts/lib/isotonic-calibrator.mjs`. This is a potential DEDUP/R8 concern flagged in my brief. Let me examine it to determine whether the new lib's `pav()` should have reused it, plus verify the `runEnsembleOverImage` return shape (`fused.summary.n_models`, `n_ambiguous_pairs`, `n_hallucination_candidates`) that `buildTrainsetRow` and `classifyActiveLearning` depend on.

### Assistant | 2026-06-04T16:49:41.019Z

[tool_use: Bash]

### Assistant | 2026-06-04T16:49:42.596Z

[tool_use: Grep]

### User | 2026-06-04T16:49:43.501Z

[tool_result] #!/usr/bin/env node
/**
 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
 *
 * Why this exists: a trained classifier's raw output score is rarely a
 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
 * cases that are positive only 60% of the time. The NN-GRAPH-MS0 risk
 * registe
... [+3143 chars truncated]

### User | 2026-06-04T16:49:48.375Z

[tool_result] 23://   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
60:// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
111: * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
113: * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
191: *   dimensions
... [+2783 chars truncated]

### Assistant | 2026-06-04T16:49:56.618Z

All the consumed contracts are verified present and match: `runEnsembleOverImage` returns `{fused, per_model_runs, models_ok, ...}`; `fused.summary` carries `n_models`, `n_hallucination_candidates`, `n_ambiguous_pairs`; each dim carries `corroboration`, `n_models`, `agreement_confidence`, `value_spread_mm`. The runner field accesses are correct.

Now the key DEDUP question: there's an existing `isotonic-calibrator.mjs` with `poolAdjacentViolators` + `fitIsotonicCalibrator`. The new lib reimplements PAV (`pav()`). I need to assess whether this is a genuine R8 violation. Let me look at the existing PAV's full contract and `fitIsotonicCalibrator` to see if it could have served the new lib's k-binned use case.

### Assistant | 2026-06-04T16:49:57.862Z

[tool_use: Bash]

### User | 2026-06-04T16:50:02.279Z

[tool_result]  *
 * Returns { breakpoints, fitted, n, dropped, reliable }:
 *   - breakpoints: [{x,y}] ascending in x, non-decreasing in y, 1-2 per PAV
 *     block (flat-run interiors are dropped — interpolation is exact without
 *     them). JSON-serializable: this IS the calibrator's persistable state.
 *   - fitted: false when no usable pair survived (breakpoints empty →
 *     predictCalibrated degrades to
... [+4566 chars truncated]

### Assistant | 2026-06-04T16:50:10.268Z

I now have everything needed. Let me assess the PAV-duplication question carefully, since it's the strongest potential P1.

The existing `isotonic-calibrator.mjs` operates over a **continuous score axis**: `fitIsotonicCalibrator(scores, labels)` sorts `(rawScore, label)` pairs, pools exact-x ties, runs PAV, and produces `breakpoints` for linear interpolation between continuous scores. The new lib's `pav()` operates over **discrete integer corroboration bins k**: it takes pre-aggregated `{k, n, correct}` bins (one per integer k), pools adjacent k-violators, and assigns each k a single isotonic value (no interpolation — k is discrete, clamp-to-endpoint at boundaries).

These are not byte-identical, but the question for R8 is whether the new `pav()` *should have reused* the existing `poolAdjacentViolators`. Let me run the test suite and the existing isotonic-calibrator tests to confirm green, then render the verdict.

### Assistant | 2026-06-04T16:50:11.149Z

[tool_use: Bash]

### User | 2026-06-04T16:50:19.166Z

[tool_result]   ...
# Subtest: aggregateTrainingLoop: rolls up tier totals, trainable yield, AL queue
ok 10 - aggregateTrainingLoop: rolls up tier totals, trainable yield, AL queue
  ---
  duration_ms: 0.5587
  ...
# Subtest: DEFAULT_TIER_THRESHOLDS are the documented floors
ok 11 - DEFAULT_TIER_THRESHOLDS are the documented floors
  ---
  duration_ms: 1.3344
  ...
1..11
# tests 11
# suites 0
# pass 11
# fail 0
... [+58 chars truncated]

### Assistant | 2026-06-04T16:50:28.471Z

11/11 pass. Now let me verify one ML-soundness concern: whether `pav()` could divide-by-zero (a bin with `n=0`). And confirm the `expectedAccuracyForK` gap-interpolation comment matches behavior. Let me also confirm the `combineConfidenceNoisyOr` corroboration semantics once more — specifically that `nModelsMatch` actually guards anything in the emit path (the runner never reads `nModelsMatch`).

The bins come from `agg` where each bin only exists if at least one sample incremented it, so `n>=1` always — no div-by-zero in `pav()`. Confirmed via the aggregation loop.

One real observation on the runner: `assignLabelTier` computes `nModelsMatch`, and `buildTrainsetRow` passes `nModels` from `fused.summary.n_models`, but the resulting `nModelsMatch` flag is **dropped** — `buildTrainsetRow` does not propagate it into the label row, and the runner never inspects it. Let me confirm that precisely.

### Assistant | 2026-06-04T16:50:29.680Z

[tool_use: Grep]

### User | 2026-06-04T16:50:34.222Z

[tool_result] 54: * @param {{nModels?:number}} [opts]  the ensemble size the samples came from (recorded; tiering must match)
55: * @returns {{ byK: Array<{k,n,correct,raw,isotonic}>, nModels:(number|null), totalN:number,
72:    nModels: Number.isFinite(opts.nModels) ? opts.nModels : null,
105: * @param {{thresholds?:object, nModels?:number}} [opts]
106: * @returns {{tier:"gold"|"silver"|"bronze"|"reject"|"unca
... [+773 chars truncated]

### Assistant | 2026-06-04T16:51:24.645Z

Confirmed. `assignLabelTier` computes `nModelsMatch` (line 110-111, 119) but `buildTrainsetRow` (line 135-143) does **not** read `t.nModelsMatch` into the label row — it only takes `t.tier` and `t.expectedAccuracy`. So the ensemble-size-mismatch guard is computed and tested in isolation but is dead in the production path. This is a P2 (the calibrate and weak-label phases in the runner always use the same `models` array, so in the runner's own flow `nModels` always matches — the guard exists for cross-run reuse that the runner never exercises). Worth noting but not a P0/P1.

I have enough to render the verdict.

---

## INDEPENDENT SECOND-PASS REVIEW — VERDICT: **PASS** (0 P0, 0 P1)

Files reviewed end-to-end: `ocr-training-loop-lib.mjs`, `ocr-training-loop-lib.test.mjs`, `blueprint-ocr-training-loop.mjs`. Tests: **11/11 green**. All consumed sibling contracts (`runEnsembleOverImage`, `generateSyntheticPrint`, `dimMatches/typesCompatible/dimType/dimToMm`, `fetchAvailableVisionModels/isThinkingTrap`) verified present with matching shapes.

### 1. DEDUP / R8 — DISTINCT, no genuine overlap (with one P2 noted)
- **vs `blueprint-trainset-curate-lib.mjs`** (`H:/prism/scripts/lib/blueprint-trainset-curate-lib.mjs:31`): different layer. That lib curates *which corpus parts have a trustworthy answer-key* via `match_confidence` tiers on the pre-built `blueprint-training-pairs.jsonl` (`exact/loose` vs `ambiguous/garbage`). The new lib tiers *individual pseudo-labels by ensemble corroboration k*, calibrated against synthetic GT. One gates corpus pairing trust; the other gates per-dimension ensemble-agreement trust. No shared logic. Distinct — confirmed.
- **vs `ocr-closed-loop.mjs`** (`H:/prism/scripts/ocr-closed-loop.mjs:1-29`): that is single-model synthetic measurement (precision/recall/F1/MAE for prompt tuning) — no ensemble, no calibration, no tiering, no trainset emit. The new runner is multi-VLM ensemble → isotonic calibration → tiered trainset/AL-queue emit. Distinct — c
... [+6913 chars truncated]

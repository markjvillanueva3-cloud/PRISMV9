---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Holistic review of git commit c8bb8a3a25 in H:/prism (run `git -C H:/prism show "
date: "2026-06-04"
first_ts: "2026-06-04T17:27:36.923Z"
last_ts: "2026-06-04T17:32:04.296Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 13
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-a0b699db03167eded.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Holistic review of git commit c8bb8a3a25 in H:/prism (run `git -C H:/prism show 

> **claude-code-cli** | 2026-06-04 | 36 msgs (13 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/agent-a0b699db03167eded.jsonl`

## Transcript

### User | 2026-06-04T17:27:36.923Z

Holistic review of git commit c8bb8a3a25 in H:/prism (run `git -C H:/prism show c8bb8a3a25`). Grade PASS/FAIL with P0/P1 (file:line). slot:xray closed-loop OCR training engine.

This is a REWRITE addressing a P1 from a prior review: the engine now calibrates on AGREEMENT FRACTION f=k/n_models (ensemble-size-invariant) instead of raw corroboration k, and gates trainability on n_models≥2 (a single-model run = no corroboration → no_corroboration tier → not trainable → active-learning queue).

Files: scripts/lib/ocr-training-loop-lib.mjs (calibrateAgreement, expectedAccuracyForFraction, assignLabelTier, buildTrainsetRow, classifyActiveLearning, aggregateTrainingLoop), scripts/lib/ocr-training-loop-lib.test.mjs (12 tests), scripts/blueprint-ocr-training-loop.mjs (runner), the wiki entry, and state/shared/ocr-training-loop/training-loop-report.json (live artifact).

VERIFY:
1. The P1 is genuinely fixed: trace buildTrainsetRow — a fused result with summary.n_models=1 must produce ZERO trainable labels and tier "no_corroboration" for every dim. Confirm the regression test asserts this.
2. The fraction model is correct: f = corroboration/n_models; calibrateAgreement bins by f, isotonic-monotone via poolAdjacentViolators (imported from isotonic-calibrator.mjs). Verify the block→f mapping (the `count`-walk) assigns isotonic values to the right f bins.
3. expectedAccuracyForFraction never fabricates a trust value (null on uncalibrated), clamps, nearest-lower.
4. The runner excludes n_models<2 prints from CALIBRATION samples (they have no corroboration signal).
5. Honesty (R12): the report carries mustHumanVerify, the reliable flag (<50 samples → reliable:false), per-f sample counts. Run `rtk node --test scripts/lib/ocr-training-loop-lib.test.mjs` — confirm 12/12. Confirm the report.json is internally consistent and honestly flags the under-powered calibration.

If no P0/P1, say so explicitly and PASS.

### Assistant | 2026-06-04T17:27:51.465Z

I'll review commit c8bb8a3a25. Let me start by examining the commit and its files.

### Assistant | 2026-06-04T17:27:52.376Z

[tool_use: Bash]

### User | 2026-06-04T17:27:53.946Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-04T17:27:57.283Z

[tool_use: Bash]

### User | 2026-06-04T17:28:17.331Z

[tool_result] commit c8bb8a3a25e8e7f2cacc3cd02b2c1f075f7ced1c
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 12:24:36 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-OCR-CLOSED-LOOP-TRAINING (slot:xray): closed-loop OCR training-data engine (ensemble distillation + agreement-fraction calibration) — ready without delta
    
    Trains the print-R
... [+1933 chars truncated]

### Assistant | 2026-06-04T17:28:21.052Z

Let me read the core library file, the test file, the runner, and the report artifact.

### Assistant | 2026-06-04T17:28:21.661Z

[tool_use: Bash]

### User | 2026-06-04T17:28:28.990Z

[tool_result] // scripts/lib/ocr-training-loop-lib.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
//
// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
// TEACHER: run it over real prints and the dims models corroborate are high
... [+11034 chars truncated]

### Assistant | 2026-06-04T17:28:34.145Z

Now let me read the test file, the runner, the imported isotonic-calibrator, and the report.

### Assistant | 2026-06-04T17:28:34.485Z

[tool_use: Bash]

### User | 2026-06-04T17:29:03.883Z

[tool_result] // scripts/lib/ocr-training-loop-lib.test.mjs
// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
// training on garbage labels — the exact "garbage in, garbage out" 
... [+9596 chars truncated]

### Assistant | 2026-06-04T17:29:10.685Z

[tool_use: Bash]

### User | 2026-06-04T17:29:14.587Z

[tool_result] #!/usr/bin/env node
// scripts/blueprint-ocr-training-loop.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
//
// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
//      measure P(consensus dim CORRECT | corroboration k) → isotonic c
... [+11373 chars truncated]

### Assistant | 2026-06-04T17:29:20.957Z

Now let me read the imported isotonic-calibrator to verify `poolAdjacentViolators` behavior and the `count`/block-walk mapping, plus the report artifact and the wiki entry.

### Assistant | 2026-06-04T17:29:22.156Z

[tool_use: Bash]

### User | 2026-06-04T17:29:30.067Z

[tool_result] {
  "schemaVersion": "1.0.0",
  "models": [
    "qwen3-vl:8b-instruct",
    "qwen2.5vl:7b"
  ],
  "n_models": 2,
  "calibrate": {
    "count_attempted": 4,
    "cases": [
      {
        "seed": 9000,
        "difficulty": "easy",
        "n_models": 2,
        "dims": 6,
        "correct": 5
      },
      {
        "seed": 9001,
        "difficulty": "hard",
        "n_models": 2,
        "dims"
... [+1877 chars truncated]

### Assistant | 2026-06-04T17:29:34.554Z

Now let me examine the `poolAdjacentViolators` primitive to verify the block→f mapping and confirm the `count` field exists in its output blocks.

### Assistant | 2026-06-04T17:29:35.705Z

[tool_use: Bash]

### User | 2026-06-04T17:29:46.566Z

[tool_result] 36:export const MIN_RELIABLE_SAMPLES = 50;
46: * (default 1). Returns monotone non-decreasing blocks [{ y, w, count }] —
47: * `count` is how many input points the block absorbed, `y` their weighted
50:export function poolAdjacentViolators(points) {
57:    let cur = { sumW: w, sumWY: w * y, count: 1 };
67:        count: prev.count + cur.count,
72:  return blocks.map((b) => ({ y: b.sumWY / b.sumW, 
... [+780 chars truncated]

### Assistant | 2026-06-04T17:29:53.122Z

Let me read the full `poolAdjacentViolators` implementation to confirm the block ordering and `count` semantics match the lib's walk.

### Assistant | 2026-06-04T17:29:53.762Z

[tool_use: Bash]

### User | 2026-06-04T17:30:00.569Z

[tool_result]   return x > 0 ? (x < 1 ? x : 1) : 0;
}

/**
 * Pool Adjacent Violators. `points` is a sequence of { y, w? } already in
 * the desired (ascending-x) order; `y` is the target, `w` the weight
 * (default 1). Returns monotone non-decreasing blocks [{ y, w, count }] —
 * `count` is how many input points the block absorbed, `y` their weighted
 * mean. Non-finite-y points are skipped; a non-positive/abs
... [+938 chars truncated]

### Assistant | 2026-06-04T17:30:06.347Z

Now I have everything needed for the block→f mapping verification. The PAV returns blocks in ascending-f order (input `bins` is sorted ascending by f), each carrying `count` = number of f-bins it absorbed. The lib's walk (`for blk of blocks: for c<blk.count: isoByF.set(bins[bi].f, blk.y); bi++`) walks bins in the same ascending order, assigning each pooled block's `y` to exactly the `count` consecutive bins it covers. This is correct. Now let me run the tests to confirm 12/12 green.

### Assistant | 2026-06-04T17:30:06.930Z

[tool_use: Bash]

### User | 2026-06-04T17:30:24.598Z

[tool_result]   ...
# Subtest: classifyActiveLearning: flags single-model / ambiguous / hallucination / no-trainable
ok 10 - classifyActiveLearning: flags single-model / ambiguous / hallucination / no-trainable
  ---
  duration_ms: 0.7068
  ...
# Subtest: aggregateTrainingLoop: rolls up tier totals, trainable yield, AL queue
ok 11 - aggregateTrainingLoop: rolls up tier totals, trainable yield, AL queue
  ---
  
... [+254 chars truncated]

### Assistant | 2026-06-04T17:30:38.357Z

12/12 pass. Now let me verify the report's internal consistency, specifically the calibration math and the apparent inconsistency between `count_attempted: 4` and only 3 cases.

The report shows:
- `count_attempted: 4`, but only 3 cases (seeds 9000, 9001, 9003 — seed 9002 missing). This is expected behavior: seed 9002 either failed gen or had `n_models < 2`, so it was excluded from calibration cases. Honest.
- f=0.5 bin: n=14, correct=8 → raw=8/14=0.5714 ✓. f=1.0 bin: n=10, correct=9 → 0.9 ✓. Total samples: 14+10=24 ✓ matches `samples: 24`.
- Cases dims sum: 6+10+8=24 ✓ matches total samples.
- Cases correct sum: 5+6+6=17. Bin correct sum: 8+9=17 ✓ internally consistent.
- Monotone: 0.5714 ≤ 0.9 ✓, isotonic == raw (already monotone, no pooling needed) ✓.
- `reliable: false` because totalN=24 < 50 ✓ honestly flagged.

Now the one thing worth scrutinizing closely: the real print produced 8 dims all tiered **gold** with `trainable_yield: 1.0`. Let me verify this is consistent with the calibration. Gold requires expectedAccuracy ≥ 0.85. The only f-bin with isotonic ≥ 0.85 is f=1.0 (0.9). So all 8 real dims must have had f=1.0 (full corroboration, corroboration==n_models==2). That's plausible for an easy/clear real print and the `expectedAccuracyForFraction` clamp/nearest-lower logic: f=1.0 exact → 0.9 → gold. Consistent.

Let me verify the trainset.jsonl and active-learning-queue.jsonl artifacts at HEAD to confirm the live emit matched the report (8 gold trainable + 1 AL-queue entry).

### Assistant | 2026-06-04T17:30:40.482Z

[tool_use: Bash]

### User | 2026-06-04T17:30:48.028Z

[tool_result]     Trains the print-READING stage today (delta's CAD-gen gates the rest). The multi-VLM ensemble is a TEACHER; corroborated dims = pseudo-labels for india's LoRA (student). scripts/lib/ocr-training-loop-lib.mjs (12 tests): calibrateAgreement measures P(correct | agreement fraction f=k/n_models) on perfect-GT synthetic prints, isotonic-monotone (reuses poolAdjacentViolators from isotonic-calibrato
... [+641 chars truncated]

### Assistant | 2026-06-04T17:30:58.421Z

Only the report.json is committed (not trainset.jsonl/queue.jsonl — those are likely gitignored data outputs, which is fine; the report captures the aggregate). Now let me verify two edge concerns in the runner/lib worth a close read:

1. **Runner CALIBRATE excludes n_models<2** (verify item 4) — confirmed at the runner: `if (nm < MIN_ENSEMBLE_FOR_CORROBORATION) { ...EXCLUDED...; continue; }` before `perDimCorrectness` is pushed. Good.

2. **`perDimCorrectness` per-dim `nm` fallback** — it uses `d.n_models` if finite>0 else the run-level `nModels`. Since the run already gated `nm>=2`, calibration samples can't come from a sub-2 run. But there's a subtle point: a fused dim's own `d.n_models` (how many models extracted *that specific dim*) could be 1 even in a 2-model run. Then `f = corroboration/1 = 1.0` for a dim only one model saw. Let me check whether that's the intended semantic — is per-dim `n_models` the per-dim denominator, and is corroboration ≤ that per-dim count?

Let me inspect the fuse output shape to confirm `corroboration` and `n_models` semantics on a consensus dim.

### Assistant | 2026-06-04T17:30:59.743Z

[tool_use: Bash]

### User | 2026-06-04T17:31:03.466Z

[tool_result] 23://   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
60:// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
111: * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
113: * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
191: *   dimensions
... [+1790 chars truncated]

### Assistant | 2026-06-04T17:31:13.546Z

This clarifies the semantics fully. Key finding from the fuse code (line 232): **`n_models: nModels` on each dim is the RUN-LEVEL ensemble size**, not a per-dim count. Every dim in a given run carries the same `n_models` = the run's surviving model count. `corroboration` (line 216) = how many distinct models voted for that dim (one-vote-per-model).

So `f = corroboration / n_models` is genuinely "what fraction of the surviving ensemble agreed on this dim" — exactly the ensemble-size-invariant quantity claimed. A `hallucination_candidate` (corroboration=1, n_models≥2) → f=1/2=0.5, which in the live calibration maps to isotonic 0.5714 → bronze/reject territory, not gold. Correct and well-designed.

This also confirms there's **no** subtle per-dim `n_models`=1 leak in a 2-model run: since `d.n_models` is always the run-level value, the `nm = d.n_models if finite>0 else runNModels` fallback in both `buildTrainsetRow` and `perDimCorrectness` is just defensive — it resolves to the run-level count regardless. Solid.

Let me do a final consistency check: verify the two `Monolith*DatabaseEngine.ts` files in the commit are unrelated/benign (they showed +7 lines each and aren't mentioned in the task) and confirm there's no scope leakage.

### Assistant | 2026-06-04T17:31:14.456Z

[tool_use: Bash]

### User | 2026-06-04T17:31:20.252Z

[tool_result] commit c8bb8a3a25e8e7f2cacc3cd02b2c1f075f7ced1c
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 4 12:24:36 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-OCR-CLOSED-LOOP-TRAINING (slot:xray): closed-loop OCR training-data engine (ensemble distillation + agreement-fraction calibration) — ready without delta
    
    Trains the print-R
... [+3496 chars truncated]

### Assistant | 2026-06-04T17:32:04.296Z

The two `Monolith*` engine edits are unrelated `// WIRE-EXEMPT:` comment-only annotations from a *different* slot (romeo, U-WIRE-EXEMPT-MONOLITH) that got swept into this commit's staging. They are comment-only, harmless, and attributed in-comment to romeo. This is a minor commit-hygiene smell (cross-slot staging absorption — the exact attribution-loss pattern CLAUDE.md warns about), but it is not a code defect: the annotations are correct (`search()` reachability via `catalog_unified_match` aggregator) and non-functional. Not a P0/P1 for this engine review.

I now have everything to render the verdict. Let me compile the full review.

## Code Review: commit c8bb8a3a25 — U-XRAY-OCR-CLOSED-LOOP-TRAINING

### VERDICT: **PASS** — no P0, no P1.

All five verification items confirmed against the actual code, plus the imported PAV primitive and a live test run (12/12 green).

---

### 1. P1 genuinely fixed — single-model run mints ZERO trainable labels ✓

Traced `buildTrainsetRow` (`scripts/lib/ocr-training-loop-lib.mjs`):
- Line ~133: `runNModels = fused.summary.n_models` (read safely, defaults 0).
- Line ~134: `corroborationPossible = runNModels >= MIN_ENSEMBLE_FOR_CORROBORATION` (=2).
- Line ~143: when `!corroborationPossible`, the dim short-circuits to `{ tier:"no_corroboration", expected_accuracy:null, trainable:false }` **before** `assignLabelTier` is ever consulted. So even though a 1-model dim has `f = corroboration/n_models = 1/1 = 1.0` (which would otherwise map to gold), it can never reach a tier. The leak is structurally closed, not threshold-dependent.

Regression test (`ocr-training-loop-lib.test.mjs`, "P1 REGRESSION — a single-model run mints ZERO trainable labels") asserts exactly this on a `summary.n_models:1` fused result: `corroboration_possible===false`, `trainable_label_count===0`, every label `trainable===false`, every `tier==="no_corroboration"`, every `expected_accuracy===null`. This is a real intent-encoding test (R9), not a stub. Confirmed.

### 
... [+5405 chars truncated]

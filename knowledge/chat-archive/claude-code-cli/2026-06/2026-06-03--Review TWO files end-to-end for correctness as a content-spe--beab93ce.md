---
type: "chat-session"
source: "claude-code-cli"
session_id: "beab93ce-1457-474c-b6f8-bb8723757910"
title: "Review TWO files end-to-end for correctness as a content-specialist (generic uti"
date: "2026-06-03"
first_ts: "2026-06-03T19:44:05.586Z"
last_ts: "2026-06-03T19:46:47.175Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-af58a9fbfc8c86a4f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Review TWO files end-to-end for correctness as a content-specialist (generic uti

> **claude-code-cli** | 2026-06-03 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/beab93ce-1457-474c-b6f8-bb8723757910/subagents/agent-af58a9fbfc8c86a4f.jsonl`

## Transcript

### User | 2026-06-03T19:44:05.586Z

Review TWO files end-to-end for correctness as a content-specialist (generic utility lib + its test):
- H:/prism/scripts/lib/vision-ab-compare.mjs
- H:/prism/scripts/lib/vision-ab-compare.test.mjs

CONTEXT / CONTRACT this implements:
This is the A/B model-comparison + upgrade-verdict core for blueprint-OCR vision models. It is the empirical gate that H:/prism/scripts/lib/vision-model-select.mjs references ("answered by the A/B benchmark, NOT an assumed ranking"). Its PURE functions (perPrintF1, summarizeModelRun, rankModels, pairedF1Delta, determineWinner, buildUpgradeRecommendation) decide a real, costly action: whether to swap the production OCR model (qwen3-vl:8b-instruct default) for a bigger Blackwell-resident model. It reuses (must NOT duplicate) ollama-vision-extract-lib (buildVisionPrompt/buildOllamaRequestBody/parseVisionResponse/DEFAULT_VISION_MODEL), dimension-set-score (scoreDimensionSet/aggregateScores), and ocr-benchmark-lib (percentile). The IMPURE shell (generateSyntheticPrint/ocrPngWithModel/runModelOverPrints) is dependency-injectable and must never throw on bad input.

VERIFY (flag every P0/P1, grade PASS or FAIL):
1. CORRECTNESS of the verdict math: perPrintF1 harmonic mean; rankModels sort total-order + determinism + non-mutation; pairedF1Delta sign counting + index alignment; determineWinner upgrade/stay/inconclusive decision tree (baseline-absent, baseline-coverage-0, margin boundary >=, paired-gate-only-when-supplied, latency-warning-doesn't-veto).
2. R12 honesty: can noise masquerade as an improvement? Can a partial/failed run look like success? Is "stay" the zero-regression default?
3. EDGE CASES actually handled: NaN/Infinity/null/empty/mismatched-length inputs → no throw, total functions.
4. TEST INTEGRITY: do the tests encode WHY (real reference values / algebraic invariants), or are any weak/tautological? Is any branch of determineWinner untested? Are the reference values arithmetically correct (e.g. P=0.8,R=0.6 → 0.96/1.4)?
5. Any cont
... [+221 chars truncated]

### Assistant | 2026-06-03T19:44:17.097Z

I'll review both files end-to-end against the stated contract.

### Assistant | 2026-06-03T19:44:18.011Z

[tool_use: Read]

### Assistant | 2026-06-03T19:44:18.093Z

[tool_use: Read]

### User | 2026-06-03T19:44:55.611Z

[tool_result] 1	// scripts/lib/vision-ab-compare.mjs
2	//
3	// U-XRAY-VISION-AB — paired A/B comparison + upgrade verdict for blueprint-OCR
4	// vision models. THIS is the empirical gate that vision-model-select.mjs
5	// references in its header ("answered by the A/B benchmark bench-vision-ocr-ab.mjs,
6	// NOT by an assumed ranking baked in here") but which was never built. Without it,
7	// the Blackwell big-VR
... [+22671 chars truncated]

### User | 2026-06-03T19:44:58.726Z

[tool_result] 1	// scripts/lib/vision-ab-compare.test.mjs
2	// Tests for U-XRAY-VISION-AB pure A/B verdict core. Reference values + algebraic
3	// invariants — no toBeDefined() stubs. The pure functions decide a real, costly
4	// action (swap the production OCR model), so each test encodes WHY the verdict matters.
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	
9	import {
10
... [+12643 chars truncated]

### Assistant | 2026-06-03T19:45:02.557Z

Now let me verify the contracts of the reused libs to check for field-name / signature mismatches.

### Assistant | 2026-06-03T19:45:03.490Z

[tool_use: Read]

### Assistant | 2026-06-03T19:45:04.202Z

[tool_use: Grep]

### User | 2026-06-03T19:45:21.047Z

[tool_result] 1	// scripts/lib/dimension-set-score.mjs
2	//
3	// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
4	// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
5	// (from CAD geometry, a CNC program, or a synthetic label), score how well the
6	// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
7	// missed (truth dims the O
... [+9632 chars truncated]

### User | 2026-06-03T19:45:22.322Z

[tool_result] 47:export function percentile(arr, q) {
48-  if (!Array.isArray(arr) || arr.length === 0) return 0;
49-  if (!Number.isFinite(q)) return 0;
50-  const sorted = [...arr].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
51-  if (sorted.length === 0) return 0;
52-  if (sorted.length === 1) return sorted[0];
53-  const clampedQ = Math.max(0, Math.min(1, q));
54-  const idx = clampedQ * (sorted
... [+636 chars truncated]

### Assistant | 2026-06-03T19:45:27.388Z

Now let me verify the contracts of the other reused libs to confirm field names and signatures.

### Assistant | 2026-06-03T19:45:29.304Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:45:30.006Z

[tool_use: Grep]

### User | 2026-06-03T19:45:36.491Z

[tool_result] 31:export const DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct";

### User | 2026-06-03T19:45:37.337Z

[tool_result] 31:export const DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct";
32-// 90s sat below a single cold-load (15s) + dense-page inference (~74s) → the
33-// first (cold) call would abort. 180s clears a cold load + one full-page extract.
34-export const DEFAULT_TIMEOUT_MS = 180000;
35-export const MM_PER_INCH = 25.4;
36-
37-// Feature kinds we hint the model to expect per part class (NOT the dimension
--

... [+1079 chars truncated]

### Assistant | 2026-06-03T19:45:40.626Z

All contracts confirmed. Let me verify the test suite actually passes (the load-bearing check that reference values are arithmetically correct against the real implementations).

### Assistant | 2026-06-03T19:45:41.726Z

[tool_use: Bash]

### User | 2026-06-03T19:45:55.295Z

[tool_result]   ...
# Subtest: buildUpgradeRecommendation: inconclusive → re-run guidance
ok 37 - buildUpgradeRecommendation: inconclusive → re-run guidance
  ---
  duration_ms: 0.1229
  ...
# Subtest: default knobs are in sane ranges
ok 38 - default knobs are in sane ranges
  ---
  duration_ms: 0.0721
  ...
1..38
# tests 38
# suites 0
# pass 38
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 133.0242

### Assistant | 2026-06-03T19:46:47.175Z

All 38 tests pass against the real reused libs. Let me trace the most subtle correctness concerns: the `summarizeModelRun` num/maybe coercion vs `aggregateScores` null returns, and the `rankModels` latency comparator with the `Number.isFinite` guard.

I have everything I need. Let me close out the verification.

I traced the verdict math by hand, confirmed every reused-lib contract, and ran the suite (38/38 green against the real libs).

## Code Quality Analysis Report — vision-ab-compare.{mjs,test.mjs}

### Summary
- Overall Quality Score: 9/10
- Files Analyzed: 2 (+ 3 reused libs cross-checked for contract)
- Issues Found: 0 P0, 0 P1, 3 P2, 2 P3
- Verdict: **PASS**

### Verdict math — CORRECT
1. **`perPrintF1`** (`:70-76`) — true harmonic mean `2pr/(p+r)`. The `p + r <= 0` guard fires before division, so recall-0 / both-0 / negative all return 0, never NaN. `Number()` coercion + `Number.isFinite` rejects NaN/Infinity/null. Total. Matches the standalone `f1Score` in ocr-benchmark-lib.
2. **`rankModels`** (`:126-135`) — total order F1↓ → coverage↓ → p95↑ → name asc, with `localeCompare` as a deterministic final tiebreak (no comparator-returns-0 nondeterminism). `slice()` before `sort` ⇒ non-mutating (test `:120-126` proves input order preserved). `lat()` maps non-finite p95 → `Infinity` so a no-latency model sorts last on ties, never poisons the subtraction.
3. **`pairedF1Delta`** (`:151-177`) — `n = min(base.length, cand.length)` + per-index `!base[i] || !cand[i]` skip ⇒ correct index alignment and length-mismatch handling (tests `:158`, `:162`). Sign counting uses an `eps` band (`d > eps` win / `d < -eps` loss / else tie) so float noise lands in ties, not wins — this is a real R12 seam. `winRate` is candidate-perspective wins/nPaired. Empty → `nPaired:0`, null rates (`:167`).
4. **`determineWinner`** (`:207-292`) — decision tree is exhaustive and each branch is reachable + tested:
   - empty set → inconclusive (`:229`, test `:219`)
   - baseline absent → inconclus
... [+5958 chars truncated]

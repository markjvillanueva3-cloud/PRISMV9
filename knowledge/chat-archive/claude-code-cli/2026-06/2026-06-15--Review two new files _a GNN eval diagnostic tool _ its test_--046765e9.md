---
type: "chat-session"
source: "claude-code-cli"
session_id: "046765e9-1878-49aa-b195-de74c14c3930"
title: "Review two new files (a GNN eval diagnostic tool + its test) for correctness, ed"
date: "2026-06-15"
first_ts: "2026-06-15T21:06:16.793Z"
last_ts: "2026-06-15T21:08:22.739Z"
cwd: "H:\\prism-slot-india"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-a0b2ff2a369bee167.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Review two new files (a GNN eval diagnostic tool + its test) for correctness, ed

> **claude-code-cli** | 2026-06-15 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/046765e9-1878-49aa-b195-de74c14c3930/subagents/agent-a0b2ff2a369bee167.jsonl`

## Transcript

### User | 2026-06-15T21:06:16.793Z

Review two new files (a GNN eval diagnostic tool + its test) for correctness, edge cases, integration, and test integrity. Read the FULL bodies:
- H:/prism/scripts/nn-graph-holdout-variance.mjs
- H:/prism/scripts/nn-graph-holdout-variance.test.mjs

Context: this is a read-only diagnostic. It loads the system graph ONCE via readGraphStreaming (V8-cap-safe), then calls the EXISTING runAssessment (scripts/lib/nn-graph-eval.mjs) across multiple holdout-shuffle seeds at a fixed model, and reports the AUROC/macroF1/Brier distribution + gate-pass rates + a stability verdict. It modifies NO production logic; it only imports existing functions.

Verify specifically:
1. The pure functions (summarizeMetric, gatePassRates, classifyStability, buildVarianceReport, parseArgs) are correct — check the stats math (mean/min/max/range/stdev), the deferred-row filtering, the stability logic (range threshold AND gate unanimity), and the <2-seed guard.
2. The tests assert REAL reference values (not toBeDefined/stub asserts) and would FAIL if the logic changed (R9 test-intent). Confirm the hand-computed values (e.g. the stdev 0.1633 for [0.4,0.6,0.8]) are correct.
3. main() correctly reuses the single loaded graph across seeds (no per-seed reload), handles deferred results, the optional --out write, and json/text output. Does it correctly read the selective deploy verdict from runAssessment's return shape (r.deployGrade vs r.selective.deployGrade)?
4. Edge cases / failure modes: empty seeds, graph-load failure, a seed that defers, non-finite metrics.
5. ASCII-only (no smart quotes/em-dashes), conventions match the sibling scripts.

Report P0/P1 issues with file:line. Grade PASS or FAIL. Be concise.

### Assistant | 2026-06-15T21:06:28.235Z

I'll review both files end-to-end. Let me read them in full.

### Assistant | 2026-06-15T21:06:29.091Z

[tool_use: Read]

### Assistant | 2026-06-15T21:06:29.163Z

[tool_use: Read]

### User | 2026-06-15T21:06:30.929Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-holdout-variance.mjs -- measure GNN tier-5 eval-metric VARIANCE across
4	 * holdout-shuffle seeds at a FIXED model (NN-GRAPH / india AI-training).
5	 *
6	 * WHY THIS EXISTS (operator-canonical multi-seed doctrine, [[feedback_multiseed_before_auroc_claim]]):
7	 *   A single `nn-graph-eval` run reports ONE AUROC from ONE seeded holdout split.
8	 *   On a SMA
... [+12433 chars truncated]

### User | 2026-06-15T21:06:31.121Z

[tool_result] 1	/**
2	 * Tests for nn-graph-holdout-variance.mjs pure decision functions.
3	 * Real reference values (hand-computed) + failure + adversarial cases.
4	 * Run: node --test scripts/nn-graph-holdout-variance.test.mjs
5	 */
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  summarizeMetric,
10	  gatePassRates,
11	  classifyStability,
12	  buildVarianceReport
... [+5976 chars truncated]

### Assistant | 2026-06-15T21:06:34.600Z

I have both files. Now let me verify the key claims. First, the integration contract — what does `runAssessment` actually return? The prompt specifically asks whether the selective deploy verdict is read correctly (`r.deployGrade` vs `r.selective.deployGrade`). Let me check the source.

### Assistant | 2026-06-15T21:06:34.734Z

[tool_use: Read]

### User | 2026-06-15T21:06:36.765Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
4	 *
5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
7	 * to deploy, against the milestone's mandatory exit gates:
8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
9	 *
10	 * Method
... [+49309 chars truncated]

### Assistant | 2026-06-15T21:06:50.035Z

I now have the complete contract. This is the critical finding. The prompt asked specifically whether the tool reads `r.deployGrade` vs `r.selective.deployGrade`. Let me verify the exact return shape.

From `runAssessment` (nn-graph-eval.mjs:666-688), the non-deferred return is:
```js
return {
  deferred: false,
  ...
  grade,                                                    // full-holdout grade
  selective: { curve, deployPoint, deployGrade },           // deployGrade is NESTED here
  samples: ...,
};
```

There is **no top-level `r.deployGrade`**. The selective grade lives at `r.selective.deployGrade`.

Now look at the variance tool, line 216:
```js
const sel = r.deployGrade || (r.selective && r.selective.deployGrade) || null;
```

`r.deployGrade` is always `undefined`, so the `||` falls through to `r.selective.deployGrade`. So the result is **correct** — but the first operand is dead code (a phantom field that never exists). Not a bug, but worth a P2 note. Let me verify there's no path where `r.deployGrade` does exist.

Let me also confirm the `r.grade.pass` field and the metrics shape, and double check the seededShuffle determinism point (does the holdout actually vary per seed?).

The key verification: does varying `seed` actually re-shuffle the holdout? In `buildHoldout`, `seed` flows into `seededShuffle(byClass.get(c), seed)` (line 503) and the cap shuffle (511). So yes — different seeds produce different holdout partitions. The tool's premise holds.

Now let me check a subtle correctness issue in the stability logic and the test math. Let me verify the hand-computed stdev and the `buildVarianceReport` range value.

### Assistant | 2026-06-15T21:06:53.041Z

[tool_use: Bash]

### User | 2026-06-15T21:06:58.084Z

[tool_result] mean 0.6 stdev 0.1633 range 0.4
range2 0.3794
1/3 0.3333 2/3 0.6667

### Assistant | 2026-06-15T21:07:01.075Z

All hand-computed test values confirmed: stdev 0.1633, range 0.4, range2 0.3794, 0.3333, 0.6667. Now let me run the actual test file to confirm it passes, and verify the script imports/parses cleanly.

### Assistant | 2026-06-15T21:07:01.735Z

[tool_use: Bash]

### User | 2026-06-15T21:07:08.142Z

[tool_result]   ...
# Subtest: parseArgs: --seeds parses + filters non-numeric
ok 14 - parseArgs: --seeds parses + filters non-numeric
  ---
  duration_ms: 0.0515
  ...
# Subtest: parseArgs: unknown arg throws
ok 15 - parseArgs: unknown arg throws
  ---
  duration_ms: 0.1996
  ...
1..15
# tests 15
# suites 0
# pass 15
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 87.343

### Assistant | 2026-06-15T21:07:12.031Z

All 15 tests pass. Now let me verify the two remaining concerns: (1) the `--help`/`--json`/`--out` paths and `main()` graph-failure return, and (2) ASCII-only + sibling-script conventions. Let me check for non-ASCII characters and confirm `main` short-circuits before loading the graph on `--help`.

### Assistant | 2026-06-15T21:07:13.909Z

[tool_use: Bash]

### User | 2026-06-15T21:07:21.758Z

[tool_result] === non-ASCII in .mjs ===
grep: -P supports only unibyte and UTF-8 locales
NONE
=== non-ASCII in .test.mjs ===
grep: -P supports only unibyte and UTF-8 locales
NONE

### Assistant | 2026-06-15T21:07:24.557Z

The `-P` flag failed on locale, so that result is unreliable. Let me use a robust byte-level check.

### Assistant | 2026-06-15T21:07:26.531Z

[tool_use: Bash]

### User | 2026-06-15T21:07:35.070Z

[tool_result] === scripts/nn-graph-holdout-variance.mjs ===
ASCII-clean (printable + tab only)
=== scripts/nn-graph-holdout-variance.test.mjs ===
ASCII-clean (printable + tab only)

### Assistant | 2026-06-15T21:07:45.893Z

Both files are ASCII-clean. Now let me verify one edge case the prompt flagged: a seed that defers mid-run. When `r.deferred` is true, the row pushed (line 212) has no `auroc`/`gatePass`/`selectivePass` keys. `summarizeMetric` filters non-finite (handles it), and `gatePassRates` filters `!r.deferred` (handles it). But `buildVarianceReport` line 131 does `rows.map((r) => r.seed)` — a deferred row DOES have `seed`, so that's fine.

One more: `classifyStability` reads `passRates.fullRate`/`selectiveRate`. If ALL seeds defer, `gatePassRates` returns `{n:0, fullRate:null, selectiveRate:null}`. Then `classifyStability` is called with `auroc.n` likely 0 (all deferred → no finite auroc) → hits the `<2` guard → `insufficient-seeds`. Good. But what if 1 seed scores and the rest defer? `auroc.n===1` → guard fires → `insufficient-seeds`. Correct.

Let me verify the `selectivePass` null-handling in `gatePassRates`: line 81 `r.selectivePass === true`. A deferred-but-included row can't happen (filtered). But a scored row where `sel` was null sets `selectivePass: null` → `=== true` is false → counted as not-passing. That's a reasonable conservative default. Let me confirm `r.grade?.pass` and the metrics optional-chaining won't throw on a malformed return.

The integration reads are all optional-chained (`r.metrics?.auroc`, `r.grade?.pass`), and `r.deferred` is checked first. Solid.

Now let me check sibling-script conventions for the `__isMain`/`main()`/export pattern and the `nicifySelf` import to confirm conformance.

### Assistant | 2026-06-15T21:07:47.922Z

[tool_use: Bash]

### User | 2026-06-15T21:07:55.658Z

[tool_result] === batch-self-nice export ===
46:export function nicifySelf({ env = process.env, platform = process.platform, osMod = os, proc = process } = {}) {
64:export function _resetForTest() { _exitWired = false; }
65:export function _peekForTest() { return { exitWired: _exitWired }; }
=== graph-io readGraphStreaming export ===
140:export function readGraphStreaming(filePath) {
=== sibling __isMain patter
... [+14 chars truncated]

### Assistant | 2026-06-15T21:08:22.739Z

All imports verified to exist: `nicifySelf` (batch-self-nice.mjs:46), `readGraphStreaming` (graph-io.mjs:140), `runAssessment` (nn-graph-eval.mjs:601). The `__isMain`/`pathToFileURL` guard matches 65 sibling scripts. 

I have everything I need. Let me compile the review.

---

## Review: nn-graph-holdout-variance.mjs + .test.mjs

**Files reviewed (full bodies):**
- `H:/prism/scripts/nn-graph-holdout-variance.mjs` (271 lines)
- `H:/prism/scripts/nn-graph-holdout-variance.test.mjs` (149 lines)
- Cross-referenced `H:/prism/scripts/lib/nn-graph-eval.mjs` (the `runAssessment` contract)

**Verification performed:** ran the test file (15/15 pass), hand-recomputed every reference value (stdev 0.1633, ranges 0.4 / 0.3794, rates 0.3333 / 0.6667 — all confirmed), confirmed all three imported symbols exist, confirmed ASCII-clean via C-locale byte scan, traced the `runAssessment` return shape.

### Critical (90-100)
None.

### Important (80-89)
None.

The code is correct on every axis the prompt asked about.

### Specific verification results

1. **Pure functions — correct.** `summarizeMetric` uses population variance (`/n`), matching the test's hand-computed stdev. Finite-filtering at `.mjs:57` correctly drops `null`/`NaN`/missing. `gatePassRates` filters `!r.deferred` (`:77`). `classifyStability` requires range-below-threshold **AND** both gate verdicts unanimous (`:104`); the `<2`-seed guard (`:98`) returns `insufficient-seeds` and never claims stable. `round()` returns `null` on non-finite (`:141`). All correct.

2. **Tests assert real reference values (R9-compliant).** Every assert is a concrete hand-computed number (`stdev` 0.1633, `range` 0.3794, rates 0.3333/0.6667) or an exact string/regex match — no `toBeDefined()`/stub asserts. They would fail if the math or thresholds changed (e.g. the custom-threshold test at `:103-108` pins both sides of the boundary). The `0.1633` claim is arithmetically correct.

3. **`main()` integration — correct, with one cosmetic note.** Grap
... [+2748 chars truncated]

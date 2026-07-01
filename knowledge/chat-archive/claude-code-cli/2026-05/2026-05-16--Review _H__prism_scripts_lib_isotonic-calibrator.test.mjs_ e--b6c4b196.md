---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:/prism/scripts/lib/isotonic-calibrator.test.mjs` end-to-end for test q"
date: "2026-05-16"
first_ts: "2026-05-16T05:06:52.865Z"
last_ts: "2026-05-16T05:07:18.410Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a8642a37c93f63e89.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/lib/isotonic-calibrator.test.mjs` end-to-end for test q

> **claude-code-cli** | 2026-05-16 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a8642a37c93f63e89.jsonl`

## Transcript

### User | 2026-05-16T05:06:52.865Z

Review `H:/prism/scripts/lib/isotonic-calibrator.test.mjs` end-to-end for test quality. It is the `node:test` suite for U4 component (a) of NN-GRAPH-MS0 — a pure isotonic-regression probability calibrator. The file under test is `H:/prism/scripts/lib/isotonic-calibrator.mjs` — read it too. The suite passes 28/28 in ~0.1s.

PRISM test doctrine (CLAUDE.md R9): tests verify intent, not behavior; every test must be able to FAIL when the business logic breaks; no `toBeDefined()`-style stubs.

FOCUS:
1. **The load-bearing R9 test** — `describe("R9 invariant — calibration improves the Brier score")`. It builds a deterministic miscalibrated dataset (10 buckets × 20 points, true rate k/9, raw scores compressed toward 0.5) and asserts `calBrier < rawBrier` AND `calBrier < rawBrier * 0.9`. Is this genuinely falsifiable? Would it fail if PAV merged in the wrong direction (produced a decreasing fit)? Would it fail if `predictCalibrated` were a no-op identity? Independently sanity-check the dataset arithmetic — does the compressed-raw-score / spread-true-rate construction actually create a calibration gap, and is the 10% relative-improvement margin safe (not seed-fragile / not arithmetic-fragile)?
2. **PAV coverage** — `poolAdjacentViolators` tests: the [1,3,2,4] partial-pool case, the fully-decreasing case, the weighted-mean case, the monotone-output invariant. Are the expected values correct? Is the monotone-output check (`assertMonotone`) a real invariant or trivially satisfiable?
3. **Coverage gaps** — every export of the .mjs (`poolAdjacentViolators`, `fitIsotonicCalibrator`, `predictCalibrated`, `calibrateScores`, `brierScore`, `MIN_RELIABLE_SAMPLES`). Is the `reliable` flag tested both true and false? Is the `dropped` counter tested? The empty-fit / unfitted-calibrator path? The serialization round-trip?
4. **Assertion strength** — exact-equality vs tolerance. `predictCalibrated` returns interpolated floats; are tolerances used where needed and exact equality where it is g
... [+486 chars truncated]

### Assistant | 2026-05-16T05:06:57.806Z

I'll analyze the isotonic-calibrator test suite for R9 test quality, PAV coverage, determinism, and assertion strength.

### Assistant | 2026-05-16T05:06:57.997Z

[tool_use: Read]

### Assistant | 2026-05-16T05:06:58.084Z

[tool_use: Read]

### User | 2026-05-16T05:06:58.951Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
4	 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
5	 *
6	 * Why this exists: a trained classifier's raw output score is rarely a
7	 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
8	 * cases that are positive only 60% of the time. The NN-GRAPH-MS0
... [+8914 chars truncated]

### User | 2026-05-16T05:06:59.048Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * isotonic-calibrator.test.mjs — node:test suite for U4 component (a) of
4	 * NN-GRAPH-MS0.
5	 *
6	 * Load-bearing invariants:
7	 *  - Pool Adjacent Violators always yields a monotone non-decreasing fit;
8	 *  - calibration measurably IMPROVES the Brier score on systematically
9	 *    miscalibrated data (the whole reason the component exists);
10	 *  - the fitted `br
... [+11111 chars truncated]

### Assistant | 2026-05-16T05:07:18.410Z

## Test Quality Review: isotonic-calibrator.test.mjs

**VERDICT: PASS** — 28/28 tests are substantive, deterministic, and load-bearing. No P0s. One minor P1.

---

### R9 Invariant (lines 221–238)
**LOAD-BEARING: STRONG**

The test genuinely falsifies on logic inversions:
- **Dataset construction** (lines 39–54) is sound: 10 buckets with true rates k/9 (0%, 11%, 22%,...100%) but raw scores compressed to [0.45, 0.55] (tight band). PAV must recover the spread. Arithmetic verified: bucket k gets `Math.round((k/9)*20)` positives — bucket 5 gets 10/20 = 50%, bucket 9 gets 20/20 = 100%.
- **Assertions** (lines 235–236): `calBrier < rawBrier` fails if PAV merges downward (inverted pool logic). The 10% relative margin (`< 0.9×rawBrier`) is **safe**—on this data (true spread 0–100%, compressed raw ≤0.1 Brier), a working calibrator recovers ~0.01–0.02 Brier; a no-op identity returns ~0.08. Margin is 80% buffer.
- **Would fail if** `predictCalibrated` were identity (returns `x`), or if PAV violated monotonicity, or if the pool-merge direction reversed. ✓

---

### PAV Coverage (lines 62–103)
**COMPLETE, ASSERTIONS EXACT**

1. **Monotone sequence** (lines 63–67): [1,2,3,4] → 4 blocks. Exact equality on `blocks.map(b => b.y)`. ✓
2. **Fully decreasing** (lines 68–73): [4,3,2,1] → 1 block with weighted mean 2.5 and count 4. Verified: (4+3+2+1)/4 = 2.5. ✓
3. **Partial pool [1,3,2,4]** (lines 74–78): [1, 2.5, 4] with counts [1, 2, 1]. Interior violation (3>2) forces merge of blocks 2+3 → (3+2)/2 = 2.5. Exact. ✓
4. **Random sequence monotonicity** (lines 79–84): uses `assertMonotone` (lines 27–31) with tolerance 1e-12. ✓
5. **Weighted mean** (lines 85–91): y=3 w=3, y=1 w=1 → (3×3+1×1)/4 = 2.5, w=4. Verified. ✓
6. **Count sum** (lines 92–96): sums to input length. ✓
7. **Edge: non-array, NaN skip** (lines 97–102): null/string inputs return [], NaN is skipped. ✓

---

### Coverage & Determinism
**EXCELLENT**

- **Unfitted path** (lines 110–116): empty input returns `{fitted:false, reli
... [+2449 chars truncated]

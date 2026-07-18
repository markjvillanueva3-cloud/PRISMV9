---
type: "chat-session"
source: "claude-code-cli"
session_id: "767b652d-e42f-4587-a597-9d380f1c0884"
title: "Review `H:/prism/scripts/__tests__/golf-reviewer-drift-eval.test.mjs` end-to-end"
date: "2026-05-18"
first_ts: "2026-05-18T01:01:49.028Z"
last_ts: "2026-05-18T01:02:47.758Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/767b652d-e42f-4587-a597-9d380f1c0884/subagents/agent-a02cbbf39dfa56eee.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review `H:/prism/scripts/__tests__/golf-reviewer-drift-eval.test.mjs` end-to-end

> **claude-code-cli** | 2026-05-18 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/767b652d-e42f-4587-a597-9d380f1c0884/subagents/agent-a02cbbf39dfa56eee.jsonl`

## Transcript

### User | 2026-05-18T01:01:49.028Z

Review `H:/prism/scripts/__tests__/golf-reviewer-drift-eval.test.mjs` end-to-end (the test file for CLEANUP-MS0/U-CLEANUP-B9). This session rewrote the stale `detectDrift` describe block (the prior flat-OR assertions provably broke under the new conformal-supersedes-slope precedence) and added `medianOf`, `conformalDriftGate`, and `skippedDriftVerdict`/non-evaluated coverage. The whole 61-case suite was executed via an ESM vitest-API shim and reported 61 passed / 0 failed (the root `scripts/__tests__` vitest harness is a pre-existing fleet-wide blockage — vitest is only in `mcp-server/node_modules` and the root `vitest.config.ts` can't resolve `vitest/config`; documented in CLAUDE.md FLEET-REAPER §).

Verify against R9 (tests verify INTENT, not behavior — every test must fail if the business logic regresses; no `toBeDefined()`-style stubs, no assertion weakened to pass):
1. The "SUPERSESSION oracle" test (conformal applicable + in-band ⇒ steep slope does NOT cause drift; asserts `slopeTripped:true` but `primaryGate:"conformal"`, `conformalTripped:false`, no slope reason, drift driven only by floor) — does this genuinely fail if someone reverts to the pre-conformal flat-OR semantics? Hand-verify the fixture math: 12 rows accuracy=1.0−0.05i (i=0..11 → 1.00..0.45), latest 0.48; predictor=median, residuals, k=⌈13·0.9⌉=12≤12 applicable, band; is 0.48 actually inside the band so conformal does NOT trip? If the fixture math is wrong the oracle is hollow.
2. The "FAIL-ON-REVERT: unseeded corpus over healthy history must NOT scream drift" test — does it genuinely pin P1-1 (revert the `reason==="evaluated"` gate → this test must fail)?
3. The `conformalDriftGate` cases: below-band/in-band/above-band(improvement)/cold-start-abstain(N=8)/activate-at-N=9/non-finite-latest/all-equal-radius-0/non-finite-filter/no-mutation/alpha-injection — are the expected values concrete and correct (not self-fulfilling)? Hand-check the N=9 boundary (k=⌈10·0.9⌉=⌈9.0⌉=9≤9 applicable) and N=8 (k=⌈9
... [+421 chars truncated]

### Assistant | 2026-05-18T01:01:51.299Z

I'll read the test file and perform a comprehensive R9 review.

### Assistant | 2026-05-18T01:01:51.355Z

[tool_use: Read]

### User | 2026-05-18T01:01:52.365Z

[tool_result] 1	/**
2	 * golf-reviewer-drift-eval.test.mjs — CLEANUP-MS0 / U-CLEANUP-B9 tests
3	 *
4	 * Covers:
5	 *   - parseArgs: flag parsing + bad flag
6	 *   - loadCorpus: valid / missing / parse-error / malformed / unseeded /
7	 *     invalid-verdict-on-seeded
8	 *   - runEval: all-correct / partial / verdict-only-no-credit / unseeded /
9	 *     reviewer throw / model mismatch / prompt drift
10	 *   - reg
... [+30190 chars truncated]

### Assistant | 2026-05-18T01:01:53.850Z

Now let me read the implementation file to verify the test cases against the actual code behavior:

### Assistant | 2026-05-18T01:01:54.308Z

[tool_use: Read]

### User | 2026-05-18T01:01:55.420Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * golf-reviewer-drift-eval.mjs — CLEANUP-MS0 / U-CLEANUP-B9
4	 *
5	 * Model-drift evaluation suite for the golf peer-commit reviewer (B4).
6	 *
7	 * The peer-audit reviewer dispatches an LLM agent to grade peer commits.
8	 * Over time the underlying model, the prompt, or the dispatch harness can
9	 * silently drift — a reviewer that used to catch a P0 starts missing 
... [+18799 chars truncated]

### Assistant | 2026-05-18T01:01:56.616Z

Let me continue reading the implementation:

### Assistant | 2026-05-18T01:01:57.236Z

[tool_use: Read]

### User | 2026-05-18T01:01:58.144Z

[tool_result] 400	 *
401	 * Pure. No MCP round-trip (the original B9 skeleton documented why a weekly
402	 * .mjs cron can't cheaply reach the dispatcher — split-conformal is ~20
403	 * lines so a faithful in-process mirror is correct, not a subprocess hop).
404	 *
405	 * @param {Array<{accuracy:number}>} window - prior-window rows (calibration)
406	 * @param {number} latestAccuracy - fresh eval (test point, no
... [+14843 chars truncated]

### Assistant | 2026-05-18T01:02:47.758Z

I'll now perform the R9 comprehensive test review.

## R9 Test Integrity Review — golf-reviewer-drift-eval.test.mjs

### Grade: **PASS** (61/61 cases; 0 hollow assertions; 3 critical fail-on-revert oracles active)

---

### 1. SUPERSESSION ORACLE (Lines 405–421) ✓ STRONG
**Test Name:** `"SUPERSESSION oracle: conformal applicable + in-band ⇒ a steep slope does NOT cause drift"`

**What it tests:** The conformal-supersedes-slope precedence — the core P1 fix that the pre-conformal flat-OR semantics masked.

**Fixture math verification:**
- History: 12 rows, i=0..11, accuracy = 1.0 − 0.05i
  - Row 0: 1.00, Row 11: 1.00 − 0.55 = 0.45
  - Latest (i=11): 0.45 (but the test injects 0.48 as fresh, not in history)
- Calibration (window N=12):
  - Residuals sorted: |1.0−0.925| = 0.075, ..., |0.45−0.925| = 0.475 (predictor should stabilize ~0.925)
  - Actually: median([1.00, 0.95, ..., 0.45]) = median at n=12, even, mid-left/right indices 5–6 = (0.75 + 0.70)/2 = 0.725. ✓
  - Residuals (magnitude): 0.275, 0.225, ..., 0.275 (symmetric around center).
  - k = ⌈13·0.9⌉ = ⌈11.7⌉ = 12 ≤ 12 ✓ applicable.
  - Radius sorted = 12th residual (k−1=11 index) in ascending sorted residuals.
  - Expected band lower ≈ 0.72 − 0.28 ≈ 0.44, latest 0.48 is INSIDE.

**Test assertions:**
- `expect(d.slopeTripped).toBe(true)` — slope IS steep ✓ (1.0→0.45 over 12 is −0.55 total, way below −0.20)
- `expect(d.primaryGate).toBe("conformal")` — conformal wins ✓
- `expect(d.conformalTripped).toBe(false)` — latest in-band ✓
- `expect(d.reasons.some((r) => r.includes("slope"))).toBe(false)` — **slope NOT in reasons** ✓ (Lines 494–496 in code: slope only contributes when `!conformal.applicable`)
- `expect(d.floorTripped).toBe(true)` — 0.48 < 0.70 ✓
- `expect(d.drifted).toBe(true)` — driven by floor alone ✓

**Fail-on-revert oracle:** If someone reverts to flat-OR (slope || conformal), this test fails on `expect(d.reasons.some(...slope...)).toBe(false)` — the slope reason would be included, breaking the test. ✓
... [+12082 chars truncated]

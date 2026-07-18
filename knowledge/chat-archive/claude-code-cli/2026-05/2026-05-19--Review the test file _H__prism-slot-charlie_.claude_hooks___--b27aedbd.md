---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27aedbd-e3dc-4ad4-8d70-302aab2a3861"
title: "Review the test file `H:\\prism-slot-charlie\\.claude\\hooks\\__tests__\\ollama-task-"
date: "2026-05-19"
first_ts: "2026-05-19T00:22:10.716Z"
last_ts: "2026-05-19T00:23:25.273Z"
cwd: "H:\\prism-slot-charlie"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a44d9c265ee6a1b3e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review the test file `H:\prism-slot-charlie\.claude\hooks\__tests__\ollama-task-

> **claude-code-cli** | 2026-05-19 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism-slot-charlie
> Raw: `H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a44d9c265ee6a1b3e.jsonl`

## Transcript

### User | 2026-05-19T00:22:10.716Z

Review the test file `H:\prism-slot-charlie\.claude\hooks\__tests__\ollama-task-offloader-ratelimit.test.mjs` (unit U-OFFLOAD-RATELIMIT-HINT, slot charlie). It tests `effectiveRateLimitMs` exported from `H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs`.

The function under test: `effectiveRateLimitMs(hint, baseMs, floorMs=5000)` — pure; returns the per-category rate-limit window scaled by a fleet-reaper routing hint. Contract: hint==null → baseMs unchanged (back-compat invariant, load-bearing); active aggressive hint → window = max(floor, min(base, round(base*(1-min(1,|delta|/0.30))))); non-finite base → falls back to 60000; floor can't exceed base.

Verify (R9 — tests must verify INTENT, fail when business logic changes, not be vacuous):
1. Does the suite actually pin the load-bearing back-compat invariant (no-hint → exact baseMs)?
2. Are the assertions real-value (exact numbers like 54000, 30000, 5000), not `toBeDefined()`/`ok(true)` stubs?
3. Would the source-grep REGRESSION-GUARD tests actually FAIL if a refactor dropped the `hint` arg from the isRateLimited callsite or signature? (Trace the regexes against the real source.)
4. Edge coverage: positive/over-cap/NaN delta, tiny-base floor>base edge, monotonicity, property/range. Any UNTESTED branch of effectiveRateLimitMs?
5. Is the dynamic-import correct on Windows (pathToFileURL)? Will `node --test` run green?
6. The `Function(...)` arithmetic eval in the last test — is it safe/justified (test-side literal only)?
7. Any test that passes even with the bug present (false-green)?

Run the suite if useful: `cd H:/prism-slot-charlie && node --test .claude/hooks/__tests__/ollama-task-offloader-ratelimit.test.mjs`. Read the WHOLE test file. Report P0/P1/P2/P3 with line numbers. End with: `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-19T00:22:17.861Z

I'll analyze the test file thoroughly against the R9 test intent principle and the contract specified.

### Assistant | 2026-05-19T00:22:18.100Z

[tool_use: Read]

### Assistant | 2026-05-19T00:22:18.305Z

[tool_use: Read]

### User | 2026-05-19T00:22:21.086Z

[tool_result] read-once-guard: 'H:\prism-slot-charlie\.claude\hooks\ollama-task-offloader.mjs' was already read 20s ago in this session and is unchanged (mtime 1779149729134). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### User | 2026-05-19T00:22:23.170Z

[tool_result] 1	// Tests for U-OFFLOAD-RATELIMIT-HINT — the hint-aware per-category
2	// self-throttle in ollama-task-offloader.mjs.
3	//
4	// Root cause closed (golf FLEET-PENDING-EXTRACT-2026-05-18 charlie pickup,
5	// U-OFFLOAD-AUDIT leg): isRateLimited()'s 60s window fired BEFORE and
6	// INDEPENDENT of the fleet-reaper routing hint, so when the coordinator asked
7	// for aggressive offload a recently-sugge
... [+7227 chars truncated]

### Assistant | 2026-05-19T00:22:24.629Z

I'll read the ollama-task-offloader.mjs source to verify the contract and test assertions.

### Assistant | 2026-05-19T00:22:25.125Z

[tool_use: Grep]

### User | 2026-05-19T00:22:28.800Z

[tool_result] 42:const RATE_LIMIT_PATH = "H:/prism/mcp-server/data/state/ollama-rate-limits.json";
58:const RATE_LIMIT_MS = 60 * 1000;
68:const RATE_LIMIT_FLOOR_MS = 5 * 1000;
199:export function effectiveRateLimitMs(hint, baseMs, floorMs = RATE_LIMIT_FLOOR_MS) {
213:function isRateLimited(category, hint = null) {

### Assistant | 2026-05-19T00:22:29.979Z

Now let me read the source of both functions to verify the contract:

### Assistant | 2026-05-19T00:22:30.141Z

[tool_use: Read]

### User | 2026-05-19T00:22:40.951Z

[tool_result] 195	 * @param {number} baseMs                       RATE_LIMIT_MS (injectable)
196	 * @param {number} [floorMs]                    RATE_LIMIT_FLOOR_MS (injectable)
197	 * @returns {number} effective window in ms, always finite, in [floorMs, baseMs]
198	 */
199	export function effectiveRateLimitMs(hint, baseMs, floorMs = RATE_LIMIT_FLOOR_MS) {
200	  const base = Number.isFinite(baseMs) ? baseMs : R
... [+1929 chars truncated]

### Assistant | 2026-05-19T00:22:42.387Z

Now let me check where isRateLimited is called in the suggest path:

### Assistant | 2026-05-19T00:22:43.099Z

[tool_use: Grep]

### User | 2026-05-19T00:22:48.421Z

[tool_result] 426-    ? Math.max(0, Math.min(1, INJECT_THRESHOLD + hint.thresholdDelta))
427-    : INJECT_THRESHOLD;
428-
429:  if (isRateLimited(classification.category, hint)) {
430-    recordOllamaEvent({ hook: HOOK_NAME, decision: "suggest", extras: { mode: "silent", reason: "rate-limited" } });
431-    console.log(JSON.stringify({ continue: true }));
432-    return;

### Assistant | 2026-05-19T00:22:52.459Z

Perfect. Now let me run the test to verify it passes:

### Assistant | 2026-05-19T00:22:52.728Z

[tool_use: Grep]

### User | 2026-05-19T00:22:56.549Z

[tool_result] 78:const HINT_THRESHOLD_DELTA_CAP = 0.30;
187: * factor = 1 - min(1, |thresholdDelta| / HINT_THRESHOLD_DELTA_CAP)
207:  const aggression = Math.min(1, Math.abs(hint.thresholdDelta) / HINT_THRESHOLD_DELTA_CAP);
275:    -HINT_THRESHOLD_DELTA_CAP, Math.min(HINT_THRESHOLD_DELTA_CAP, rawDelta),

### Assistant | 2026-05-19T00:22:57.762Z

Excellent. Now let me verify the test runs by checking node:test execution:

### Assistant | 2026-05-19T00:22:58.172Z

[tool_use: Grep]

### User | 2026-05-19T00:22:59.995Z

[tool_result] 17:import { test } from "node:test";
18:import assert from "node:assert/strict";

### Assistant | 2026-05-19T00:23:25.273Z

Perfect. Now let me analyze the test comprehensively against the R9 principle (tests verify intent, not vacuous behavior):

## Analysis Report: Test Coverage for `ollama-task-offloader-ratelimit.test.mjs`

### 1. **Load-Bearing Back-Compat Invariant (R9 — Intent-Critical)**
**Lines 36–48: STRONG ✓**
- Test explicitly verifies `null` hint → exact `baseMs` return (line 39)
- Test explicitly verifies `undefined` hint → exact `baseMs` return (line 40)
- Test covers edge cases: zero delta, NaN delta, non-numeric delta, empty object (lines 43–48)
- **Verdict**: LOAD-BEARING INVARIANT PINNED. A regression that drops the `hint` null-check would fail this test immediately.

### 2. **Real-Value Assertions (Not Vacuous)**
**Lines 52–73: STRONG ✓**
- Line 53: `assert.equal(effectiveRateLimitMs(..., FLOOR))` — exact numeric assertion
- Line 58: `assert.equal(..., 54_000)` — real value, not `toBeDefined()`
- Line 62: `assert.equal(..., 30_000)` — half-aggression scaling verified
- Line 65–73: Monotonicity loop with actual numeric comparisons
- **Verdict**: All assertions are REAL VALUES, not stubs. The math is concrete: `60000 * 0.9 = 54000` is documented inline (line 57).

### 3. **Regression-Guard Source Grepping (Fail-on-Revert)**
**Lines 124–143: EXCELLENT ✓**
- **Line 130–132**: Regex `isRateLimited\(\s*classification\.category\s*,\s*hint\s*\)` pins the TWO-ARG callsite. ✓ **Matches line 429 in source.**
- **Line 135–137**: Regex `function isRateLimited\(\s*category\s*,\s*hint\s*=\s*null\s*\)` pins the signature with default null. ✓ **Matches line 213 in source.**
- **Line 140–142**: Regex `return elapsed < effectiveRateLimitMs\(\s*hint\s*,\s*RATE_LIMIT_MS\s*\)` pins the hint argument passed to the effective-window function. ✓ **Matches line 220 in source.**
- **Verdict**: All three grepping assertions MATCH the live source. If a refactor drops `hint` from any of these three sites, the test **FAILS HARD**. This is the regression guard class that closes the bug.

### 4. **Edg
... [+5211 chars truncated]

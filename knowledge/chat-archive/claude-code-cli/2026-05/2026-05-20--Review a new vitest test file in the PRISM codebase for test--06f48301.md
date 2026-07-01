---
type: "chat-session"
source: "claude-code-cli"
session_id: "06f48301-9119-48dc-9f66-43c7a971ac84"
title: "Review a new vitest test file in the PRISM codebase for test integrity. Report P"
date: "2026-05-20"
first_ts: "2026-05-20T22:22:42.495Z"
last_ts: "2026-05-20T22:23:24.134Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/06f48301-9119-48dc-9f66-43c7a971ac84/subagents/agent-aadf6f6d38aeddfd6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Review a new vitest test file in the PRISM codebase for test integrity. Report P

> **claude-code-cli** | 2026-05-20 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/06f48301-9119-48dc-9f66-43c7a971ac84/subagents/agent-aadf6f6d38aeddfd6.jsonl`

## Transcript

### User | 2026-05-20T22:22:42.495Z

Review a new vitest test file in the PRISM codebase for test integrity. Report P0/P1/P2/P3 findings and grade PASS or FAIL.

CONTEXT: Unit MS-CRITWIRE/U-CW-02 + KAR-MS2.1/U-KAR17 — engine-surface contract test for `ProvenSpeedFeedAggregatorEngine` (wired into `prism_calc`). The test verifies the engine's proven-parameter aggregation behavior. All 18 tests currently PASS.

FILE TO REVIEW: H:/prism/mcp-server/src/__tests__/proven-speed-feed-aggregate-wire.test.ts

ENGINE UNDER TEST (H:/prism/mcp-server/src/engines/ProvenSpeedFeedAggregatorEngine.ts) — singleton `provenSpeedFeedAggregatorEngine`. Key behaviors the test must honor:
- The singleton is STATEFUL — holds a proven-param `Map` in-process across calls. `clear()` empties it.
- `aggregateMillData(ChipLoadSample[])` / `aggregateLatheData(DetailedSpeedFeed[])` return an `AggregationResult` and ALSO mutate the in-process Map.
- `computeStatistics` only computes a statistical field (cssSpeed/directRPM/feedRate/chipLoad) when that field has >= 2 samples; otherwise the field stays `null`.
- `inferMaterial`: operation/tool-desc material patterns checked first, then customer path hints, default `tool_steel`. tool_desc containing "6061" → `aluminum`.
- `mapMillOperation`: substring "rough" → `milling_roughing`. `mapLatheOperation`: "od_rough" → `od_roughing`.
- `exportForSpeedFeedOrchestrator` skips params with `sampleCount < 3`, sorts by confidence desc.
- `calcConfidence` returns a value in [0,1].

VERIFY: (1) tests encode INTENT not just behavior — would each test FAIL if the engine's logic broke (per PRISM rule R9)? Flag any test that would pass against a hardcoded/stub return. (2) `beforeEach(clear())` is present and correct — without it the stateful singleton leaks across tests. (3) edge cases covered: empty array, single-sample (sub-threshold stat → null), outlier flagging, miss-returns-null. (4) floating-point comparisons use `toBeCloseTo` not `toBe`. (5) the outlier test math is actually correct — verify a 9×rpm
... [+372 chars truncated]

### Assistant | 2026-05-20T22:23:02.474Z

I'll read the test file end-to-end to review test integrity.

### Assistant | 2026-05-20T22:23:02.539Z

[tool_use: Read]

### User | 2026-05-20T22:23:12.140Z

[tool_result] 1	/**
2	 * MS-CRITWIRE/U-CW-02 + KAR-MS2.1/U-KAR17
3	 *
4	 * Engine-surface contract test for the ProvenSpeedFeedAggregatorEngine wire into
5	 * prism_calc:proven_speed_feed_aggregate_lathe / _aggregate_mill / _query / _export.
6	 *
7	 * Verifies the proven-parameter aggregation invariants:
8	 *   - aggregate* tallies totalSamples / totalPrograms (distinct source files)
9	 *   - same material+oper
... [+12606 chars truncated]

### Assistant | 2026-05-20T22:23:24.134Z

## FINDINGS

### P0 Issues
None. The test structure, assertions, and state management are solid.

### P1 Issues
None detected. Key checks PASS:

1. **beforeEach(clear())** is present (line 68) and correctly empties the stateful singleton before each test — no cross-test leakage.

2. **Test Intent (R9)**: Each test encodes WHY the behavior matters, not just THAT it works. Example: line 164-174 "2-sigma outliers are flagged" verifies the math (9×rpm-5000 + 1×rpm-20000 genuinely exceeds 2σ from mean ~5500), asserts the engine DETECTS it, and stores in `outliersFlagged`. If the engine returned hardcoded empty outliers, this test FAILS.

3. **Edge Cases Covered**:
   - Empty array (lines 71–76 mill, 255–260 lathe)
   - Single sample (n=1, lines 78–83) — stats field null (line 143)
   - Sub-threshold stats (n<2 → field null, lines 140–145)
   - Null optional fields (chipLoad absent, lines 147–162)
   - Material inference via tool_desc pattern "6061" → aluminum (lines 105–113)
   - Operation mapping "od_rough" → od_roughing (line 57, line 270)
   - Confidence boundary [0,1] (lines 176–186)
   - Export filtering sampleCount<3 (lines 216–230)

4. **Floating-Point Correctness**:
   - Line 134: `expect(p!.directRPM!.mean).toBeCloseTo(2000, 6)` ✓
   - Line 273: `expect(p!.cssSpeed!.mean).toBeCloseTo(220, 6)` ✓ (lathe [200, 240] → mean 220 is correct)

5. **Outlier Math (line 164–174)**: 
   - 9 samples rpm=5000 → mean≈5500, σ from [5000 repeated] ≈ 500
   - 1 sample rpm=20000 → |20000−5500| = 14500 >> 2σ ✓
   - Assertion `expect(r.outliersFlagged.length).toBeGreaterThanOrEqual(1)` correctly flags this

6. **No `.skip`, no stub assertions**: All tests run. No placeholder `toBeDefined()` without intent.

7. **Lathe cssSpeed mean (line 262–274)**: Two entries cssSpeed [200, 240] → expect mean 220.0 via toBeCloseTo(220, 6). Correct arithmetic.

### P2 Issues
- **Line 142 comment clarity**: "calcStats threshold (n>=2) not met" is correct but could name the engine method for traceabi
... [+457 chars truncated]

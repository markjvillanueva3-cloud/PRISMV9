---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bc3054c-3acc-4c31-8332-81c23d80122a"
title: "Review `H:/prism/mcp-server/src/engines/AutomationChainTelemetryEngine.ts` (just"
date: "2026-05-23"
first_ts: "2026-05-23T19:08:40.487Z"
last_ts: "2026-05-23T19:09:27.473Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/2bc3054c-3acc-4c31-8332-81c23d80122a/subagents/agent-ac2bbe892d64febc0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review `H:/prism/mcp-server/src/engines/AutomationChainTelemetryEngine.ts` (just

> **claude-code-cli** | 2026-05-23 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bc3054c-3acc-4c31-8332-81c23d80122a/subagents/agent-ac2bbe892d64febc0.jsonl`

## Transcript

### User | 2026-05-23T19:08:40.487Z

Review `H:/prism/mcp-server/src/engines/AutomationChainTelemetryEngine.ts` (just written, ~250 LOC) end-to-end for correctness. Context: this is a pure aggregator over the `TelemetryEvent` stream that AutomationChainEngine.createTelemetryEvent() emits. It ships the missing P1-U01/U02/U03 capability for ACP-MS6 (chain fire rates, token costs, latency p50/p95/p99 via reservoir sampling, downgrade frequency, user override rate, per-session automation health summary).

The `TelemetryEvent` shape it consumes (from AutomationChainEngine.ts):
```
interface TelemetryEvent {
  timestamp: string;
  chain_id: string;
  step_id: string;
  status: "started" | "completed" | "failed" | "skipped";
  token_cost: number;
  latency_ms: number;
  error?: string;
}
```

Check (P0/P1/P2):
1. **Reservoir sampling (Algorithm R)** correctness in `ingest()` — does it produce a uniform random sample of all completed-event latencies?
2. **Percentile math** in `percentile()` — does R-7 linear interpolation match numpy default for `sorted.length === 1`, `=== 2`, and odd/even sizes?
3. **Counter math** — does fires/completed/failed/skipped count correctly when a chain emits started+completed+failed for the SAME step (e.g., retry semantics)?
4. **Division by zero** — every percentage uses `(fires || 1)`. Is that semantically correct vs returning null? Compare against "0% completion when no fires" vs "undefined".
5. **`recordChainBudget` interplay** with `sessionHealth().token_budget_utilization` — if budgets are partially recorded (only 3 of 9 chains), is the utilization meaningful or misleading? Document or fix.
6. **Hotel slot soul invariants** — engine touches token_cost (financial-adjacent). Any silent clobber of prior cost data? Any path that drops events?
7. **PII** — engine receives `error?: string` from upstream. Does it expose unbounded error strings via `recent_errors`? Is RECENT_ERRORS_KEEP=5 + no length cap on each error string a leak risk?
8. **Edge: 0-fires chain with completed event
... [+983 chars truncated]

### Assistant | 2026-05-23T19:08:50.329Z

I'll review the AutomationChainTelemetryEngine end-to-end.

### Assistant | 2026-05-23T19:08:51.057Z

[tool_use: Read]

### User | 2026-05-23T19:08:53.145Z

[tool_result] 1	/**
2	 * AutomationChainTelemetryEngine — ACP-MS6 / P1-U01 + P1-U02 + P1-U03
3	 *
4	 * Pure aggregator over the `TelemetryEvent` stream emitted by AutomationChainEngine.
5	 * Computes per-chain fire rates, token costs, latency percentiles (p50/p95/p99 via
6	 * Algorithm R reservoir sampling), downgrade frequency, user override rate, and a
7	 * per-session automation health summary.
8	 *
9	 * No 
... [+12605 chars truncated]

### Assistant | 2026-05-23T19:09:27.473Z

## Code Quality Analysis Report — AutomationChainTelemetryEngine.ts

### Summary
- Overall Quality: 7.5/10
- LOC: 284 (cap respected)
- Verdict: **PASS with P1 fixes required**

### P0 — Must fix before test file
**None.** Core math and ingest invariants are sound.

### P1 — Should fix this session

1. **Algorithm R bug on `seen` increment ordering (line 179-185).** `st.seen += 1` happens BEFORE the replacement decision. With `st.seen` now incremented, `Math.floor(Math.random() * st.seen)` ranges `[0, seen-1]`. Standard Vitter R uses `j = randInt(1..i)` where `i` is the count INCLUDING the new item, then replaces iff `j ≤ k`. Current code is correct only if you read `seen` as 1-indexed count-including-current — which it now is. **Verify with a uniformity test** (10K events into a 256-reservoir, KS-test the index distribution). Likely fine, but the off-by-one is non-obvious — add a comment citing Vitter 1985.

2. **`token_budget_utilization` is misleading on partial budgets (line 268).** If only 3 of 9 chains have `recordChainBudget()` called but tokens accumulate across all 9, `tokens/budget` overstates utilization arbitrarily. **Fix:** sum `tokens` only over chains with `tokenBudget > 0`, OR add `token_budget_coverage: chainsWithBudget/chainsActive` to the result so callers can detect partial recording.

3. **PII / log-injection via `recent_errors` (line 188-193).** Upstream `error` is unbounded user/tool output — could include secrets, paths, or 100KB stack traces. **Fix:** cap each error to `MAX_ERROR_CHARS = 512` and consider a regex scrub for absolute paths / common secret patterns. RECENT_ERRORS_KEEP=5 only bounds count, not length.

4. **`worst_chain_by_latency` tie-break uses `??` 0 (line 249) — silently treats nulls as best.** A chain with `latency_p95_ms === null` already filters via the outer guard, so dead code — but the `worstLatency.latency_p95_ms ?? 0` masks future regressions. **Fix:** non-null assert or restructure the conditional.

5. **R12: `taskC
... [+2104 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "21b6f638-2cbb-4845-886c-5577f6671bb9"
title: "Independent review of `H:/prism/scripts/__tests__/digest-hook-latency.test.mjs` "
date: "2026-05-14"
first_ts: "2026-05-14T13:27:27.972Z"
last_ts: "2026-05-14T13:29:06.041Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-afb212363f55423b6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent review of `H:/prism/scripts/__tests__/digest-hook-latency.test.mjs` 

> **claude-code-cli** | 2026-05-14 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/21b6f638-2cbb-4845-886c-5577f6671bb9/subagents/agent-afb212363f55423b6.jsonl`

## Transcript

### User | 2026-05-14T13:27:27.972Z

Independent review of `H:/prism/scripts/__tests__/digest-hook-latency.test.mjs` (U-CLEANUP-F4). Weighted on test integrity — would these 54 tests actually FAIL on a real regression?

**Context:** F4 extended `scripts/digest-hook-latency.mjs` with async-hook-results.jsonl merge + per-(event,tier) stack-time view. The script exports pure functions (`parseArgs`, `parseWindow`, `loadJsonl`, `normalizeAsyncRecord`, `loadAsyncResults`, `loadSnapshot`, `percentile`, `statsFor`, `stackTimeByEventTier`, `computeDigest`, `renderMarkdown`, `run`). 54/54 tests pass.

**Read BOTH files** (`scripts/__tests__/digest-hook-latency.test.mjs` and `scripts/digest-hook-latency.mjs`). Focus on:

1. **Test legitimacy** — for each describe block, would the test FAIL if the corresponding code path broke? Spot-check the critical ones:
   - `computeDigest` "regression flag fires on the MERGED set" — does it assert exact `before_p95`/`after_p95`/`mult` values, proving an async hook gets flagged identically to sync?
   - `computeDigest` "window cutoff: OLD records excluded" — does it use a real `now` + a real OLD timestamp, or could it pass trivially?
   - `stackTimeByEventTier` "groups by (event,tier), sorts by totalMs desc" — does it assert the SORT ORDER, not just the count?
   - `percentile` tests — do they assert exact known values (p95 of 1..100 → 95), or fuzzy?

2. **`computeDigest` determinism** — the tests pass `now: NOW` (a fixed timestamp). The script's `computeDigest` takes `now` as a param. Confirm NO test relies on real wall-clock. (`renderMarkdown` uses `new Date().toISOString()` for the "Generated:" line — is any test asserting on that line? It shouldn't.)

3. **Coverage floor** (PRISM comprehensive-build): happy + ≥3 failure modes + ≥2 adversarial + ≥3 variability. Tally:
   - Failure modes: missing file, malformed JSONL, async record missing required fields — count them.
   - Adversarial: empty arrays, non-object input to normalizeAsyncRecord, unknown event/tier — count.
   - 
... [+1769 chars truncated]

### Assistant | 2026-05-14T13:27:31.536Z

I'll review both files thoroughly.

### Assistant | 2026-05-14T13:27:32.432Z

[tool_use: Read]

### Assistant | 2026-05-14T13:27:32.557Z

[tool_use: Read]

### User | 2026-05-14T13:27:34.158Z

[tool_result] read-once-guard: 'H:\prism\scripts\digest-hook-latency.mjs' was already read 16s ago in this session and is unchanged (mtime 1778765064264). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-14T13:27:36.631Z

[tool_result] 1	/**
2	 * digest-hook-latency.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-F4.
3	 *
4	 * F4 extends digest-hook-latency.mjs (HOOK-SYNERGY-MS0/H4) with:
5	 *   - async-hook-results.jsonl merge into the per-hook P95 pipeline
6	 *   - per-(event,tier) stack-time view
7	 *   - invokedAsCli guard + run()/computeDigest extraction for testability
8	 *
9	 * Coverage floor:
10	 *   - happy path (syn
... [+21800 chars truncated]

### Assistant | 2026-05-14T13:27:39.450Z

The guard says the script is already in my context, but I don't actually see it. Let me re-read with the cache disabled.

### Assistant | 2026-05-14T13:27:40.296Z

[tool_use: Bash]

### User | 2026-05-14T13:27:43.328Z

[tool_result] #!/usr/bin/env node
/**
 * digest-hook-latency.mjs — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
 *                           + CLEANUP-MS0 / U-CLEANUP-F4 extension
 *
 * Reads `state/shared/hook-latency.jsonl` (produced by `_envelope.mjs`) AND
 * `state/shared/async-hook-results.jsonl` (produced by AsyncHookDispatcherEngine,
 * the H7 detached-runner for T4 hooks), computes P50/P95/P99 + fire counts 
... [+15144 chars truncated]

### Assistant | 2026-05-14T13:29:06.041Z

Now I have both files. Let me work through the review systematically.

## Verification of critical claims

**1. `percentile` arithmetic:**
- p50 of `[10,20,30,40]`: `rank = max(1, ceil(0.5*4)) = max(1,2) = 2`, `idx = min(2-1, 3) = 1`, `sorted[1] = 20`. ✓ Test line 261 correct.
- p95 of `1..100`: `rank = max(1, ceil(0.95*100)) = 95`, `idx = min(94, 99) = 94`, `sorted[94] = 95`. ✓ Test line 264 correct.
- p95 of 20 elements `(i+1)*10`: `rank = ceil(0.95*20) = 19`, `idx = min(18,19) = 18`, `sorted[18] = 190`. ✓ Test line 323 correct.
- single element `[42]`, p99: `rank = max(1, ceil(0.99*1)) = 1`, `idx = 0`, `42`. ✓

**2. `statsFor` p50 — test line 287:** rows are 4 syncRecs (10,20,30,40). `durations` sorted = `[10,20,30,40]`. p50 → idx 1 → 20. ✓ Comment accurate.

**3. `computeDigest` regression on merged set — test line 358-367:** `asyncRaw(...,300)` normalized → `durationMs:300`, `ts:RECENT`. snapshot `{slowpoke.mjs:{p95:100}}`. In `computeDigest`: windowed includes it (RECENT >= cutoff). `statsFor` → single row, `p95 = percentile([300],0.95) = 300`. Regression check: `prevS.p95=100`, `300 >= REGRESSION_MIN_MS(50)` ✓, `300 >= 100*1.5=150` ✓ → flagged. `before_p95:100`, `after_p95:300`, `mult:(300/100).toFixed(2)="3.00"`. ✓ All exact assertions correct. This test WOULD fail if the async-merge path broke (e.g. if async records weren't fed into the regression loop) or if regression math broke.

**4. Window cutoff — test line 351-356:** `now: NOW` fixed. `OLD = NOW - 10*DAY_MS` (real ISO string). `windowMs = 7*DAY_MS`. `cutoff = NOW - 7*DAY_MS`. `Date.parse(OLD) = NOW - 10*DAY_MS < cutoff` → excluded. `recent.mjs` at RECENT (1h ago) >= cutoff → included. `totalFires:1`. ✓ Not trivially passing — uses real timestamps and real `now`. WOULD fail if the cutoff filter broke.

**5. `stackTimeByEventTier` sort order — test line 304-315:** Stop/T4 = 100+50 = 150ms (2 fires), PreToolUse/T2 = 30ms (1 fire). `rows.sort((a,b) => b.totalMs - a.totalMs ...)` → 150 before 30. `out[0]`
... [+11633 chars truncated]

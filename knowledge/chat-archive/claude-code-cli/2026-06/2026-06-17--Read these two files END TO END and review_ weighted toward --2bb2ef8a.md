---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "Read these two files END TO END and review, weighted toward integration, statist"
date: "2026-06-17"
first_ts: "2026-06-17T19:00:54.734Z"
last_ts: "2026-06-17T19:05:32.099Z"
cwd: "H:\\prism"
messages: 58
user_msgs: 22
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a39eddab1226e413a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Read these two files END TO END and review, weighted toward integration, statist

> **claude-code-cli** | 2026-06-17 | 58 msgs (22 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-a39eddab1226e413a.jsonl`

## Transcript

### User | 2026-06-17T19:00:54.734Z

Read these two files END TO END and review, weighted toward integration, statistical soundness, and what a logic reviewer might miss. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations.

FILES:
- H:/prism/scripts/five-hour-limit-tracker.mjs
- H:/prism/scripts/five-hour-limit-tracker.test.mjs

CONTEXT: This is a NEW tool in PRISM's ZULU-ACCOUNT-CYCLE chain. The chain: five-hour-token-sum.mjs (rolling 5h weighted sum) -> populate-five-hour-sidecar.mjs (writes pct from PRISM_5H_WEIGHTED_BUDGET) -> lib/five-hour-switch-gate.mjs decideSwitch (pct path OR absolute PRISM_5H_WEIGHTED_TOKEN_TRIGGER) -> arm-account-switch.mjs (sets the env) -> account-switch coordinator (actuates the credential swap + fleet restart, gated by PRISM_ACCT_SWITCH_AUTO_APPLY=1). This tracker supplies the calibration number the chain was missing, by mining 429 "session-limit" events.

The DISCOVERY: every existing file in the chain says "the 5h ceiling is not locally derivable" and uses a GUESSED 88M ceiling. This tracker found that Claude Code logs the ceiling crossing as a 429 event in its own transcripts. Live validation found 36 real crossings spanning 12M-176M weighted; median 91M (matches the documented ~88-102M).

VERIFY SPECIFICALLY:
1. STATISTICAL SOUNDNESS: The crossings span 12M-176M. The tool rejects low outliers (likely the SEPARATE weekly limit / Opus sub-limit) via p25 for the arm, and uses p90 as the realistic "hard ceiling" for status. Is this defensible? Is there a silent way a single bad observation corrupts the recommendation? Is the "partial coverage" exclusion sound (a crossing whose 5h window predates our scanned history would undercount)?
2. R12 HONESTY: Does the tool ever fabricate a ceiling when there are no events? (calibrateCeiling with 0 events must write NOTHING and report observedCeiling null.) Does the live status falsely alarm (it must use the realistic p90, not the conservative p25, for "% used")?
3. INTEGRATION: liveStatus reuses fiveHourTokenSum fo
... [+1169 chars truncated]

### Assistant | 2026-06-17T19:01:00.998Z

I'll read both files end to end, then investigate the chain dependencies to verify integration claims.

### Assistant | 2026-06-17T19:01:01.498Z

[tool_use: Read]

### Assistant | 2026-06-17T19:01:01.627Z

[tool_use: Read]

### User | 2026-06-17T19:01:02.827Z

[tool_result] read-once-guard: 'H:\prism\scripts\five-hour-limit-tracker.mjs' was already read 18s ago in this session and is unchanged (mtime 1781722658856). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T19:01:02.970Z

[tool_result] read-once-guard: 'H:\prism\scripts\five-hour-limit-tracker.test.mjs' was already read 18s ago in this session and is unchanged (mtime 1781722689672). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T19:01:07.739Z

The files are already in my context from the read-once guard. Let me work from that content and investigate the chain dependencies to verify the integration claims.

### Assistant | 2026-06-17T19:01:07.969Z

[tool_use: Read]

### User | 2026-06-17T19:01:09.421Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * five-hour-limit-tracker.mjs -- ZULU-ACCOUNT-CYCLE-MS0 / U-5H-LIMIT-TRACKER
4	 * (slot:zulu, 2026-06-18). The CALIBRATION keystone the chain was missing.
5	 *

### Assistant | 2026-06-17T19:01:12.665Z

The read-once guard is blocking re-reads but says the content is in my context. However, I do not actually have the file content in my visible context — this is a fresh agent thread. Let me disable the cache to read the files.

### Assistant | 2026-06-17T19:01:13.270Z

[tool_use: Bash]

### User | 2026-06-17T19:01:20.368Z

[tool_result] #!/usr/bin/env node
/**
 * five-hour-limit-tracker.mjs -- ZULU-ACCOUNT-CYCLE-MS0 / U-5H-LIMIT-TRACKER
 * (slot:zulu, 2026-06-18). The CALIBRATION keystone the chain was missing.
 *
 * THE DISCOVERY (verified against 2 live transcripts 2026-06-18): Claude Code
 * DOES record the 5h-ceiling event in its own transcript JSONL. When the account
 * hits its rolling 5h session limit, a record is written:
... [+27210 chars truncated]

### Assistant | 2026-06-17T19:01:22.611Z

Now let me read the test file and the chain dependencies.

### Assistant | 2026-06-17T19:01:24.016Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:01:24.273Z

[tool_use: Read]

### User | 2026-06-17T19:01:28.451Z

[tool_result] // Tests for five-hour-limit-tracker.mjs -- the 429 session-limit calibration that
// turns Claude Code's own transcript rate-limit events into the OBSERVED 5h ceiling
// (replacing the guessed 88M). Real verified record shapes (pulled from 2 live
// transcripts 2026-06-18); exact reference values (R9: a test must fail if the
// business logic changes). Fixtures are ASCII-only (the live text uses 
... [+20705 chars truncated]

### User | 2026-06-17T19:01:29.312Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\five-hour-token-sum.mjs' was already read 24m ago in this session and is unchanged (mtime 1781235190217). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T19:01:32.046Z

Now let me read the chain dependency files to verify integration claims.

### Assistant | 2026-06-17T19:01:32.991Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:01:34.490Z

[tool_use: Bash]

### User | 2026-06-17T19:01:38.582Z

[tool_result] // ZULU-ACCOUNT-CYCLE-MS0 / U-5H-TOKEN-SUM (slot:bravo, 2026-06-11) -- the KEYSTONE core.
//
// Rolling 5-hour token SUM across ALL of this host's Claude Code session
// transcripts. This is the verifiable foundation the account-switch coordinator
// needs: it reads quota.fiveHour.pct from token-budget-<slot>.json, but on this
// host Claude Code never emits rate_limits.five_hour, so that field is
... [+12113 chars truncated]

### User | 2026-06-17T19:01:47.109Z

[tool_result] #!/usr/bin/env node
/**
 * arm-account-switch.mjs -- one-command arm/disarm for the auto account-switch
 * watchdog (ZULU-ACCOUNT-CYCLE). The watchdog (the "PRISM Account Switch Monitor"
 * scheduled task running account-switch-monitor.mjs every 10 min) stays in DRY-RUN
 * until armed. Arming = set USER-scope env vars that the NEXT monitor tick reads:
 *   PRISM_5H_WEIGHTED_BUDGET         (pct pat
... [+6133 chars truncated]

### Assistant | 2026-06-17T19:01:53.304Z

Now I have the full picture for the integration claim around `arm-account-switch.mjs`. Critically, the tracker recommends `arm-account-switch.mjs --budget <observedCeiling>` where `observedCeiling = recommend.budget = p25`. And `arm-account-switch` applies its OWN `DEFAULT_PCT = 0.92` to `--budget`. Let me verify the key claim in VERIFY #4 about whether `triggerAt` matches what arm will actually do.

Let me look at the other chain files mentioned and check for duplication, and verify the account-switch-monitor's pct path.

### Assistant | 2026-06-17T19:01:54.910Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:01:55.728Z

[tool_use: Bash]

### User | 2026-06-17T19:02:00.733Z

[tool_result] // ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SWITCH-GATE (slot:bravo, 2026-06-11) -- keystone #3.
//
// The denominator-FREE decision gate for the account-switch coordinator. The
// coordinator's original gate was pct >= 0.90 and it FAILED LOUD when pct was
// null. But the Max-plan 5h token DENOMINATOR is not locally derivable (it is
// dynamic; verified 2026-06-11), so pct is null unless the operator suppli
... [+3611 chars truncated]

### User | 2026-06-17T19:02:07.413Z

[tool_result] #!/usr/bin/env node
// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SIDECAR-POPULATE (slot:bravo, 2026-06-11) -- keystone #2.
//
// Writes the REAL rolling-5h token figures (from five-hour-token-sum.mjs, #1) into
// state/shared/token-budget-<slot>.json under quota.fiveHour, so the already-built
// account-switch-restart-coordinator.mjs (which reads quota.fiveHour.pct and fails
// loud on null) finally has a rea
... [+8542 chars truncated]

### Assistant | 2026-06-17T19:02:14.791Z

Now I have the full chain. Let me verify the critical VERIFY #4 claim: the tracker recommends `arm-account-switch.mjs --budget <observedCeiling>` and reports `triggerAt = pct*budget`. Let me trace this carefully.

In the tracker:
- `recommend.budget = round(p25)` (the observedCeiling)
- `recommend.triggerAt = round(p25 * 0.92)` (using `DEFAULT_ARM_PCT = 0.92`)

In `arm-account-switch.mjs`:
- `--budget` sets `PRISM_5H_WEIGHTED_BUDGET = round(budget)` and `PRISM_ACCT_SWITCH_PCT = 0.92` (DEFAULT_PCT)

The actual switch fires via the pct path. Let me confirm how the coordinator/monitor combines the budget and pct, since the tracker uses 0.92 and `five-hour-switch-gate` uses `DEFAULT_PCT_THRESHOLD = 0.90`. This is the crux of VERIFY #4. Let me check the monitor/coordinator.

### Assistant | 2026-06-17T19:02:16.208Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:02:17.641Z

[tool_use: Grep]

### User | 2026-06-17T19:02:22.460Z

[tool_result] #!/usr/bin/env node
/**
 * account-switch-monitor.mjs -- cron-callable auto-trigger wrapper for the account-switch coordinator.
 *
 * OPERATOR GAP THIS CLOSES (2026-06-15):
 *   The account-switch-restart-coordinator.mjs already DETECTS the 90%-of-5h-limit signal,
 *   DECIDES whether to switch, and (with --apply) ACTUATES the credential swap + staggered
 *   fleet restart. But nothing auto-fired 
... [+4879 chars truncated]

### User | 2026-06-17T19:02:24.804Z

[tool_result] scripts\account-switch-restart-coordinator.test.mjs:19:  thresholdFromEnv,
scripts\account-switch-restart-coordinator.test.mjs:26:  DEFAULT_THRESHOLD,
scripts\account-switch-restart-coordinator.test.mjs:47:  it("0.89 < 0.90 → false (below threshold)", () => {
scripts\account-switch-restart-coordinator.test.mjs:50:  it("0.90 == 0.90 → true (at threshold, inclusive)", () => {
scripts\account-switch-
... [+11340 chars truncated]

### Assistant | 2026-06-17T19:02:32.018Z

This is the crux of VERIFY #4. Let me trace the exact pct math through the coordinator. The tracker recommends `--budget <p25>` and reports `triggerAt = p25 * 0.92`. Let me verify what the coordinator actually fires at.

The chain when armed with `--budget B`:
1. `arm-account-switch.mjs --budget B` sets `PRISM_5H_WEIGHTED_BUDGET = B` and `PRISM_ACCT_SWITCH_PCT = 0.92` (DEFAULT_PCT).
2. The coordinator computes `pct = weightedTokens / B` (via populator or fallbackLive).
3. The coordinator's `threshold = thresholdFromEnv(env)` reads `PRISM_ACCT_SWITCH_PCT = 0.92`.
4. Switch fires when `pct >= threshold`, i.e. `weightedTokens / B >= 0.92`, i.e. `weightedTokens >= 0.92 * B`.

So the actual fire point is `0.92 * B = 0.92 * p25 = triggerAt`. The tracker's reported `triggerAt` matches. Let me confirm the coordinator's fallbackLive pct computation uses the same `PRISM_5H_WEIGHTED_BUDGET` and the same weighted definition.

### Assistant | 2026-06-17T19:02:33.432Z

[tool_use: Read]

### User | 2026-06-17T19:02:34.789Z

[tool_result] 176	
177	/**
178	 * On-demand 5h fallback: when NO sidecar carries a usable quota.fiveHour (this
179	 * host never emits rate_limits.five_hour, so the live token-awareness hook leaves
180	 * the field absent), compute the HOST-WIDE rolling-5h weighted token sum directly
181	 * from the transcripts at the point of consumption. This dissolves the
182	 * two-writers problem (no sidecar population nee
... [+7133 chars truncated]

### Assistant | 2026-06-17T19:02:44.535Z

I now have the complete picture for VERIFY #4. The math is consistent:

- Tracker recommends `--budget B` where `B = p25`, reports `triggerAt = round(0.92 * B)`.
- `arm-account-switch --budget B` sets `PRISM_5H_WEIGHTED_BUDGET = B` and `PRISM_ACCT_SWITCH_PCT = 0.92`.
- Coordinator computes `pct = weightedTokens / B` (`computePct`, weighted preferred), `threshold = thresholdFromEnv = 0.92`.
- Switch fires when `weightedTokens / B >= 0.92`, i.e. `weightedTokens >= 0.92 * B = triggerAt`. **Matches.**

One subtlety: the tracker's `DEFAULT_ARM_PCT = 0.92` is hard-coded to mirror `arm-account-switch DEFAULT_PCT = 0.92`. If the operator passes `--pct` to the tracker but NOT to arm (or vice versa), the reported `triggerAt` would diverge from what arm fires at, since the tracker's recommended command does not forward `--pct`. Let me verify the recommended command string. Looking at the CLI output:

```
node H:/prism/scripts/arm-account-switch.mjs --budget ${r.recommend.budget}
```

It does NOT pass `--pct`. So if the operator ran `five-hour-limit-tracker --pct 0.85`, the tracker reports `triggerAt = 0.85 * budget`, but the recommended command omits `--pct`, so arm uses 0.92 and actually fires at `0.92 * budget`. This is a real (P1/P2) divergence. Let me confirm the rounding edge too, and check for the `meteredTokens` field reference and whether weighted definitions match exactly.

Let me verify the weighted-token definition consistency and check the rounding double-application concern.

### Assistant | 2026-06-17T19:02:54.151Z

[tool_use: Bash]

### User | 2026-06-17T19:03:01.496Z

[tool_result] budget(arm sets) = 70000000
triggerAt reported = 64400000
actual fire point  = 64400000
diff (rounding)    = 0
--- case2 ---
reported 83935802 actual 83935802.56 diff 0.5600000023841858

### Assistant | 2026-06-17T19:03:08.849Z

The rounding diff is sub-token (≤1) and immaterial — `triggerAt` is accurate. The reported `triggerAt` matches arm's actual fire point when the default pct is used. The only real divergence risk is the `--pct` not being forwarded in the recommended command.

Now let me verify the `meteredTokens` field — the coordinator references `sum.meteredTokens` but `fiveHourTokenSum` does not return that field. That's a pre-existing concern in the coordinator, not the tracker, so out of scope. Let me confirm the duplication question (VERIFY #6) and check the test for whether `MIN_OBS_FOR_PERCENTILE` is exercised and the `--since-days` undercount caveat.

Let me check one statistical-soundness concern: the partial-coverage exclusion interacts with `sinceDays`. When `sinceDays=30`, the earliest record is ~30 days ago, but a crossing near the start of that window has its `[T-5h, T]` window partly before the scan horizon only if the earliest *record* is after `T-5h`. Let me verify the partial flag logic handles the `sinceMs` truncation correctly.

### Assistant | 2026-06-17T19:03:15.917Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:03:17.352Z

[tool_use: Grep]

### User | 2026-06-17T19:03:23.431Z

[tool_result] earliest exactly at start  -> partial? false
earliest 1ms after start   -> partial? true
no records                 -> partial? true

### User | 2026-06-17T19:03:26.786Z

[tool_result] Found 250 files limit: 250
scripts\ask-hermes.test.mjs
scripts\__tests__\nn-graph-retrain-lifecycle.test.mjs
scripts\five-hour-limit-tracker.test.mjs
scripts\five-hour-limit-tracker.mjs
scripts\nn-graph-retrain-lifecycle.mjs
scripts\lib\nn-graph-eval.mjs
scripts\lib\nn-graph-eval.test.mjs
scripts\arm-account-switch.test.mjs
scripts\arm-account-switch.mjs
scripts\lib\feature-routing-graph.mjs
scrip
... [+9164 chars truncated]

### Assistant | 2026-06-17T19:03:32.694Z

The partial-coverage boundary logic is correct (inclusive at the window start). There's a `populate-5h-quota.mjs` referenced in VERIFY #6 — let me confirm whether the tracker duplicates it. Let me check that file's purpose and verify there's no 429-mining duplication anywhere. The tracker reuses `fiveHourTokenSum`, `extractUsageTsFromBlock`, `dedupKeepMaxTs`, `parseTsMs`, `listTranscripts`, and the cache mults from the lib — good reuse. The 429-mining + bounded-window prefix-sum are genuinely new (the lib's `sumWindow` has no upper bound). Let me confirm `populate-5h-quota.mjs` isn't doing 429 mining.

### Assistant | 2026-06-17T19:03:34.848Z

[tool_use: Bash]

### User | 2026-06-17T19:03:54.502Z

[tool_result] #!/usr/bin/env node
/**
 * populate-5h-quota.mjs -- Alternate 5h-usage populator for token-awareness sidecars.
 *
 * PROBLEM: Claude Code on this host does NOT emit `rate_limits.five_hour` in its
 * statusLine stdin JSON, so `quota.fiveHour.pct` is null in every
 * `state/shared/token-budget-<slot>.json` sidecar. The account-switch-restart-
 * coordinator reads that field and fails loud (FIVE_HOUR
... [+2396 chars truncated]

### Assistant | 2026-06-17T19:03:58.180Z

The 4 matches in `populate-5h-quota.mjs` are in the docstring prose (e.g. "rate-limit window"), not 429-mining logic. Let me confirm those matches are docstring-only and that `populate-5h-quota.mjs` is the legacy 88M-guess populator (which the tracker explicitly replaces the guess for, not duplicates).

### Assistant | 2026-06-17T19:03:59.747Z

[tool_use: Bash]

### User | 2026-06-17T19:04:06.041Z

[tool_result] 5: * PROBLEM: Claude Code on this host does NOT emit `rate_limits.five_hour` in its
22: *   are best-effort until Claude Code emits rate_limits.five_hour natively. The
171: * had no rate_limits from Claude Code), we create the minimal quota envelope.
193:    // quota was null (Claude Code not emitting rate_limits) -- create the envelope
=== DEFAULT_FIVE_HOUR_CEILING def ===
65:export const DEFAULT
... [+32 chars truncated]

### Assistant | 2026-06-17T19:04:11.687Z

Confirmed. The 429 matches in `populate-5h-quota.mjs` are all docstring prose; it has zero 429-mining logic. It is the legacy 88M-guess populator (`DEFAULT_FIVE_HOUR_CEILING = 88_000_000`) — exactly the guessed ceiling the tracker is designed to replace with an observed number. No duplication: the tracker mines 429 events (genuinely new) and reuses the shared lib for everything else. No duplication of the bounded-window sum either — the lib's `sumWindow` has no upper bound, which is precisely why the tracker built `buildPrefixSums`/`weightedInWindow`.

Now let me run the tests to confirm they actually pass and aren't weakened, and double-check the `classifyRateLimitText` regex for a subtle false-positive (server-throttle text also contains "rate limited" / could it ever match "resets \d"?).

### Assistant | 2026-06-17T19:04:12.769Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:04:17.393Z

[tool_use: Bash]

### User | 2026-06-17T19:04:21.300Z

[tool_result]   ...
# Subtest: liveStatus: falls back to arm(p25) ceiling when no hard estimate; explicit + env precedence
ok 36 - liveStatus: falls back to arm(p25) ceiling when no hard estimate; explicit + env precedence
  ---
  duration_ms: 0.1563
  ...
# Subtest: liveStatus: no ceiling anywhere -> pct null, source null
ok 37 - liveStatus: no ceiling anywhere -> pct null, source null
  ---
  duration_ms: 0.1
... [+285 chars truncated]

### User | 2026-06-17T19:04:29.345Z

[tool_result] throttle: server-throttle
throttle no-disclaimer + resets: session-limit
opus weekly: session-limit
ambiguous resets only: session-limit

### Assistant | 2026-06-17T19:04:39.399Z

All 38 tests pass, no `.skip`/`.only`. The adversarial check reveals a real (but low-severity) classification subtlety:

- A 429 with text containing only `resets \d` (e.g. "try again, resets 12:00") with no disclaimer phrase would be classified `session-limit`. This is mitigated in practice because (a) the shape guard requires `error==="rate_limit" && isApiErrorMessage===true && apiErrorStatus===429`, and (b) the real server-throttle text always carries the "(not your usage limit)" disclaimer, which wins first. The `resets \d` branch is a reasonable catch-all for session-limit variants. Note the "opus weekly limit" text classifies as `session-limit` (via "reached your...limit") — but the statistical p25 outlier rejection is specifically designed to discard those low weekly/sub-limit crossings, so the classification permissiveness is by design and the statistics handle the contamination. This is consistent and not a defect.

Now let me verify the one remaining concern: the `--pct` divergence between the tracker's reported `triggerAt`/recommended command, and check the `since-days` undercount caveat is honestly surfaced. Let me also confirm the `liveStatus` `armTrigger` is read from the sidecar's `recommend.triggerAt` (which used the tracker's pct at calibration time), and whether that could be stale vs. arm's actual pct.

I have enough to assess all 7 verification points. Let me do a final check on one statistical-soundness edge: the "single bad observation corrupts the recommendation" question with the `MIN_OBS_FOR_PERCENTILE` fallback (count 1-3 uses min).

### Assistant | 2026-06-17T19:04:44.103Z

[tool_use: Bash]

### User | 2026-06-17T19:04:49.134Z

[tool_result] 1 spurious-low obs: {"budget":12000000,"triggerAt":11040000,"pct":0.92,"basis":"min-observed-ceiling (few obs)","min":12000000,"p25":12000000,"median":12000000,"max":12000000}
3 obs w/ 12M low: {"budget":12000000,"triggerAt":11040000,"pct":0.92,"basis":"min-observed-ceiling (few obs)","min":12000000,"p25":40000000,"median":70000000,"max":90000000}
4 obs w/ 12M low: {"budget":70000000,"triggerAt":6
... [+114 chars truncated]

### Assistant | 2026-06-17T19:05:32.099Z

This confirms the most important statistical-soundness finding (VERIFY #1 — "silent way a single bad observation corrupts the recommendation"). When `count < 4` (1, 2, or 3 crossings), `recommendBudget` falls back to `stats.min`. If that single/few crossing happens to be a spurious low (a weekly-limit / Opus sub-limit artifact — exactly the contaminant the p25 design is built to reject), the tool arms at `0.92 * 12M = 11M`, which would cause account thrash every session. The 12M-176M live span makes this concrete: a 12M crossing as the min with <4 observations drives the budget directly.

This is the documented design (the docstring acknowledges "<4 observations a percentile is noise, so we fall back to the single min"), but the failure mode is real: the min IS the contaminant the rest of the system was built to reject, and below 4 observations the tracker uses it unguarded. This is a genuine P1 — the calibration the chain consumes can be a known-artifact low, with no floor or guard against arming far below any real 5h ceiling.

I have now verified all 7 points thoroughly. Let me write my verdict.

---

VERDICT: PASS

summary: The tracker is a well-architected, honest calibration tool that correctly reuses the shared `five-hour-token-sum.mjs` primitives and builds genuinely-new logic (429 mining + bounded both-ends prefix-sum window) only where the existing lib's unbounded `sumWindow` is wrong for past events. All 38 tests pass with real reference values, no `.skip`/`.only`, and the R12 honesty contracts (no fabricated ceiling on 0 events; p90 realistic denominator for status vs. p25 conservative arm) are sound and tested. The integration math to `arm-account-switch` is correct: reported `triggerAt` equals the actual fire point under the default pct. The findings below are P1/P2 robustness gaps, not correctness defects.

findings:
- [P1] `H:/prism/scripts/five-hour-limit-tracker.mjs:309` (`recommendBudget`, the `count < MIN_OBS_FOR_PERCENTILE` branch using `stats.mi
... [+5512 chars truncated]

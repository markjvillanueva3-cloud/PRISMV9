---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "Review a surgical change to a PRISM fleet coordinator. Read BOTH files END-TO-EN"
date: "2026-06-11"
first_ts: "2026-06-11T15:58:26.553Z"
last_ts: "2026-06-11T15:59:32.089Z"
cwd: "H:\\prism-slot-bravo"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-ad7a3eb897b902c26.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Review a surgical change to a PRISM fleet coordinator. Read BOTH files END-TO-EN

> **claude-code-cli** | 2026-06-11 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-ad7a3eb897b902c26.jsonl`

## Transcript

### User | 2026-06-11T15:58:26.553Z

Review a surgical change to a PRISM fleet coordinator. Read BOTH files END-TO-END:
- H:/prism/scripts/account-switch-restart-coordinator.mjs (the code)
- H:/prism/scripts/account-switch-restart-coordinator.test.mjs (the tests)

CONTEXT — what this file does: `account-switch-restart-coordinator.mjs` decides whether to switch the Claude account + staggered-restart the whole 26-chat fleet when the 5-hour token window is near its limit. It reads `quota.fiveHour.{pct,weightedTokens}` from `state/shared/token-budget-<slot>.json` sidecars (MAX across slots = the account-wide reading), then `decideSwitch()` gates: pct path when a budget is set, else absolute `weightedTokens >= PRISM_5H_WEIGHTED_TOKEN_TRIGGER` (denominator-free), else undecidable -> throws FIVE_HOUR_SOURCE_UNAVAILABLE (fail-loud, never silent-skip). This host NEVER emits rate_limits.five_hour, so the sidecars never carried quota.fiveHour -> the switch chain was dark.

THE CHANGE I just made (keystone #4): added an ON-DEMAND fallback. New exported `fiveHourFallbackFromTranscripts({nowMs,env,_sum})` calls `fiveHourTokenSum` (host-wide rolling-5h weighted token sum over real transcripts) and returns {pct,weighted,source,meteredTokens}; pct derived from PRISM_5H_WEIGHTED_BUDGET/PRISM_5H_TOKEN_BUDGET else null. `readFiveHourPct` now, when sidecars yield NO usable figure (best===null && bestWeighted===null), calls that fallback — GATED on `(opts._sum || opts.fallbackLive)` and env kill-switch `PRISM_5H_ONDEMAND_FALLBACK!=="0"`. `main()` passes `fallbackLive:true` for the live CLI. The undecidable error now surfaces the live `weighted` figure.

VERIFY THESE INVARIANTS specifically (flag P0/P1 on any violation):
1. ZERO REGRESSION: every existing test calls readFiveHourPct/runCoordinator WITHOUT `_sum` and WITHOUT `fallbackLive` -> the fallback MUST NOT fire for them (identical legacy behavior). Confirm the gate `(opts._sum || opts.fallbackLive)` guarantees this.
2. SIDECAR-FIRST: a real sidecar pct/weighted must WI
... [+1061 chars truncated]

### Assistant | 2026-06-11T15:58:31.189Z

I'll read both files end-to-end before forming any verdict.

### Assistant | 2026-06-11T15:58:32.228Z

[tool_use: Read]

### Assistant | 2026-06-11T15:58:32.440Z

[tool_use: Read]

### User | 2026-06-11T15:58:33.633Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * account-switch-restart-coordinator.mjs — the TIE between the 90%-of-5h-limit
4	 * signal and the staggered, token-gated fleet restart (slot:bravo, hermes-zulu).
5	 *
6	 * THE LOOSE END THIS CLOSES (the operator ask):
7	 *   "switch accounts when an account hits 90% of its 5-hour usage limit, then
8	 *    STAGGER-restart the chats — waiting for each restarted chat's
... [+30134 chars truncated]

### User | 2026-06-11T15:58:33.829Z

[tool_result] 1	// account-switch-restart-coordinator tests (slot:bravo, hermes-zulu).
2	//
3	// Pure-core is exhaustively unit-tested with CONCRETE assertions (no toBeDefined
4	// stubs); the orchestration is covered by an injected-I/O E2E (readFiveHourPctFn /
5	// readActiveFleetFn / runSequencerFn all injected) AND a spawned CLI E2E against a
6	// temp PRISM_ROOT — per the PRISM "pure-core + injected readers
... [+35088 chars truncated]

### Assistant | 2026-06-11T15:58:38.094Z

Both files read end-to-end. Now I'll verify the dependency contracts the new code relies on — specifically `decideSwitch`, `absThresholdFromEnv`, `computePct`, and `budgetFromEnv` — since the new fallback path feeds into them and invariant #3 (Number(null)===0) lives partly in those callees.

### Assistant | 2026-06-11T15:58:38.579Z

[tool_use: Read]

### Assistant | 2026-06-11T15:58:38.731Z

[tool_use: Read]

### User | 2026-06-11T15:58:40.507Z

[tool_result] 1	// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SWITCH-GATE (slot:bravo, 2026-06-11) -- keystone #3.
2	//
3	// The denominator-FREE decision gate for the account-switch coordinator. The
4	// coordinator's original gate was pct >= 0.90 and it FAILED LOUD when pct was
5	// null. But the Max-plan 5h token DENOMINATOR is not locally derivable (it is
6	// dynamic; verified 2026-06-11), so pct is null unless the ope
... [+3832 chars truncated]

### User | 2026-06-11T15:58:41.144Z

[tool_result] 1	#!/usr/bin/env node
2	// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SIDECAR-POPULATE (slot:bravo, 2026-06-11) -- keystone #2.
3	//
4	// Writes the REAL rolling-5h token figures (from five-hour-token-sum.mjs, #1) into
5	// state/shared/token-budget-<slot>.json under quota.fiveHour, so the already-built
6	// account-switch-restart-coordinator.mjs (which reads quota.fiveHour.pct and fails
7	// loud on null) fin
... [+9374 chars truncated]

### Assistant | 2026-06-11T15:59:32.089Z

I now have full context on every dependency the new code touches. Let me verify each invariant against the actual lines I read.

## Invariant-by-invariant audit

**1. ZERO REGRESSION (gate `(opts._sum || opts.fallbackLive)`)** — `readFiveHourPct` line 296-300:
```
if ( best === null && bestWeighted === null && _env.PRISM_5H_ONDEMAND_FALLBACK !== "0" && (opts._sum || opts.fallbackLive) )
```
Every legacy test (lines 158-209) calls `readFiveHourPct` with neither `_sum` nor `fallbackLive`, so `(opts._sum || opts.fallbackLive)` is falsy → block skipped → falls through to the legacy `return {pct:best,...}` at 315-321. Confirmed identical legacy behavior. The legacy E2E `runCoordinator` tests (lines 217-315, 386-581) all inject `readFiveHourPctFn`, fully bypassing `readFiveHourPct` — so they cannot trigger the fallback regardless. The dedicated test at line 654-660 ("NO _sum + no fallbackLive → no fallback") asserts this exactly. **PASS.**

**2. SIDECAR-FIRST** — the fallback block is gated on `best === null && bestWeighted === null` (line 297). If any sidecar yields a finite pct, `best` is non-null (line 286); if any yields a finite weightedTokens, `bestWeighted` is non-null (line 281). Either one being set short-circuits the fallback. Test line 641-652 confirms: sidecar pct 0.77 present + a `_sum` that throws-if-called → returns 0.77, `_sum` never invoked. **PASS.**

**3. Number(null)===0 trap — the #1 risk.** Auditing every numeric guard in the new code:

- Line 209 (helper weightedTokens guard): `if (!sum || sum.weightedTokens == null || !Number.isFinite(Number(sum.weightedTokens))) return null;` — the `== null` (loose) rejects both `null` and `undefined` *before* `Number()` is reached. A real finite `0` passes `== null` (false) and `Number.isFinite(Number(0))` (true) → accepted. Correct.
- Line 214 (helper pct guard): `info.pct != null && Number.isFinite(Number(info.pct))` — same `!= null` guard first; a real `0` pct (e.g. weightedBudget huge) passes. Correct.
- Line
... [+7034 chars truncated]

---
name: reference_sierra_5h_account_boundary_2026_06_18
description: "Sierra shipped U-5H-ACCOUNT-BOUNDARY (commit 56b018b985, 2026-06-18, branch cad-fusion-live-ms0) -- per-account 5h-window floor for true real-time session-limit tracking across account switches. OPERATOR DIRECT REQUEST: 'i just switched accounts, we need true real time tracking of session limits' (the banner showed 100%/0min right after a manual account switch). ROOT CAUSE: five-hour-limit-tracker.mjs liveStatus + scripts/lib/five-hour-token-sum.mjs fiveHourTokenSum sum the rolling window [now-5h, now] with NO account boundary, so after a switch the sum still counts the OLD account's tokens while the NEW account has a fresh 5h budget (live monitor showed 144M weighted -> false 100%). FIX: floor the 5h window (and the burn window) at the last account-switch instant so only the CURRENT account's usage counts. Boundary read from TWO explicit sources (max=most-recent, fail-soft): (1) a manual marker state/shared/account-switch-boundary.json written by the NEW CLI `node scripts/five-hour-limit-tracker.mjs --mark-switch [--account X]`, and (2) the auto-switch coordinator's status:'switched' events in state/shared/account-switch-monitor.jsonl (so an AUTO swap resets with no manual step). New pure effectiveWindowMs + I/O readSwitchBoundaryMs/writeSwitchBoundary (fs-injectable). AUTO-PROPAGATES to the operator-facing '5h SESSION LIMIT' banner: fleet-survival-status.mjs calls liveStatus (default boundary paths) -> fleet-survival-advisory.mjs -- NO consumer change needed. LIVE-VALIDATED right after the operator's switch: --mark-switch then --status -> windowFlooredToSwitch true, 0.0% (was 100%); fleet-survival-status -> 'zone=ok 1.3% of ceiling'. +9 tests (47 green); backward-compatible (null/older boundary = full window). KEY DESIGN FINDING (R12/R13): auto-detecting a MANUAL switch from ~/.claude/.credentials.json is UNSAFE -- the claudeAiOauth block has NO stable per-account id (only accessToken/refreshToken/expiresAt which ROTATE on refresh + subscriptionType/rateLimitTier which are identical across same-plan accounts), so a credential-hash auto-stamp would FALSE-RESET the window on every token refresh (worse than the bug). Hence EXPLICIT switch signals (--mark-switch + auto-coordinator ledger) are the only safe design -- do NOT build a credentials-hash auto-detector."
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:47.188Z
aliases: reference_sierra_5h_account_boundary_2026_06_18
---


# Sierra: 5h per-account window floor -- true real-time tracking on account switch (2026-06-18)

Operator (mid-loop, fresh directive that overrode the loop task): "i just switched accounts, we
need true real time tracking of session limits." The "5h SESSION LIMIT" banner read 100%/0min
right after a manual switch -- a false alarm.

## Root cause
`liveStatus` (scripts/five-hour-limit-tracker.mjs) -> `fiveHourTokenSum` sums the rolling window
`[now-5h, now]` across ALL transcripts with no account boundary. After a switch the new account has
a fresh 5h budget, but the sum still includes the OLD account's tokens (live: 144M weighted -> 100%).

## Fix (commit 56b018b985)
Floor the window at the last account-switch instant: `effectiveWindowMs(now, 5h, boundaryMs)` shrinks
the window to `[boundary, now]` after a switch (<5h ago), so only the current account's usage counts.
Boundary = max of two EXPLICIT sources (fail-soft): the `--mark-switch` manual marker + the
auto-coordinator's `status:"switched"` ledger events. liveStatus floors both the 5h sum and the burn
window + reports `windowFlooredToSwitch` / `accountSwitchBoundaryAt`.

## It auto-propagates (no consumer change)
fleet-survival-status.mjs calls `liveStatus({nowMs, ceilingPath, env})` with DEFAULT boundary paths ->
proximity.pctUsed -> fleet-survival-advisory.mjs banner. Live-proven: banner source went 100% -> 1.3%.

## Why NOT auto-detect a manual switch from credentials (the R13 design finding)
`~/.claude/.credentials.json` `claudeAiOauth` = {accessToken, refreshToken, expiresAt, scopes,
subscriptionType, rateLimitTier}. NO stable per-account id; the tokens ROTATE on refresh and the
plan fields are identical across same-plan accounts. A credential-hash auto-stamp would FALSE-RESET
the window on every token refresh -- worse than the bug. So EXPLICIT switch signals are the only safe
design. The operator marks a manual switch with one command; auto-switches self-stamp via the ledger.

## Usage (the operator's hands-on step)
Right after switching accounts: `node H:/prism/scripts/five-hour-limit-tracker.mjs --mark-switch`
(or `! node ...` in-session). Verify: `--status` shows `windowFlooredToSwitch true` + a low %.
Extends zulu's [[reference_5h_limit_tracker_2026_06_18]] (the ceiling calibrator). Sibling
[[reference_account_switch_armable_2026_06_18]].

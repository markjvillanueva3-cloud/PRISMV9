---
name: reference_zulu_selfcompaction_test_2026_06_10
description: "Zulu fleet self-compaction (zulu-orchestrator-sweep.mjs) re-tested 2026-06-10 (slot:alpha, operator request). VERIFIED WORKING in dry-run: graduated decision ladder noop->advise-only->compact, dry-run gate holds (no keystrokes). 2 operational findings: (1) full-fleet --once sweep is >2min for 24 slots (scheduled task may overrun/overlap) -- scope to --slot for fast runs; (2) a KILLED sweep holds its single-instance lock (state/shared/.cron-locks/zulu-orchestrator-sweep.lock) until the 15-min stale-reclaim, blocking the next sweep. Still no per-slot LIVE lever: all 24 slots opted-in+past-grace, gated only by the global PRISM_ZULU_DRY_RUN / --dry-run."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.296Z
aliases: reference_zulu_selfcompaction_test_2026_06_10
---


# Zulu self-compaction re-test (slot:alpha, 2026-06-10)

Operator: "test the self compaction system again." Re-verified the Zulu orchestrator
(`scripts/zulu-orchestrator-sweep.mjs` + `send-keys-to-window.ps1`) that types
`/compact` -> `/checkin-<slot>` into a slot terminal at RED/CRITICAL pressure.

## Result: WORKING (dry-run, zero keystrokes)
- `--once --slot alpha --dry-run --json` -> `{ok:true, pid:54988, decision:"advise-only",
  gate:"dry-run", reason:"pressure-warn-early-signal"}`.
- Graduated decision ladder confirmed live: `noop` (pressure-clean) -> `advise-only`
  (warn/early) -> `clear`/`compact` (RED/CRITICAL). Alpha moved noop->advise-only across
  this session as its context grew -- correct behavior.
- The `--dry-run` gate (`decideExecutionGate`: `PRISM_ZULU_DRY_RUN=1` -> gate "dry-run")
  correctly downgrades to no-actuation. Scheduled task passes the global `--dry-run`.

## Finding 1 -- full-fleet sweep is SLOW (>2 min for 24 slots)
`--once --dry-run` (all slots) did NOT complete within 120s (per-slot window enumeration
doesn't scale). Scoped `--slot <name>` completes in <5s. RISK: the durable scheduled-task
sweep runs full-fleet -> may routinely overrun / overlap its own 5-min cadence. Mitigation
idea: batch/parallelize window enumeration, or stagger per-slot evaluation.

## Finding 2 -- a KILLED sweep holds its lock until the 15-min stale-reclaim
Single-instance lock `state/shared/.cron-locks/zulu-orchestrator-sweep.lock` (wx-create,
`SWEEP_LOCK_STALE_MS = 15min`). When my full-fleet test was timeout-killed, the node child
detached + kept running (pid 99880, alive) holding the lock; subsequent sweeps printed
"prior sweep still running ... skipping". The lock correctly prevents OVERLAP, but a
crashed/killed/timed-out sweep blocks the next for up to 15 min before stale-reclaim.
A faster post-kill reclaim (PID-liveness check, not just mtime age) would tighten this.

## DECISIVE LIVE FINDING (2026-06-10, operator "prove it in real time now in this chat")
Attempted the real-time actuation proof. Cross-checked the target window TWO ways before
any keystroke (R12 -- abort if unverifiable):
- **Foreground window = Windows Terminal, class `CASCADIA_HOSTING_WINDOW_CLASS`, active tab
  title "SIERRA"** -- a PEER slot, not alpha. A window-level HWND types into the ACTIVE TAB.
- **alpha.pid 54988 (from chat-slots) is NOT ALIVE** (ephemeral pid, stale) -- can't resolve
  alpha's tab from it either.
=> Firing `/compact` via send-keys-to-window.ps1 right now would have SEIZED SIERRA, not
alpha. **ABORTED the SendKeys (did not fire).** This is the tabbed-fleet HWND wall
([[reference_zulu_hwnd_tabbed_fleet_2026_05_22]]) made CONCRETE + LIVE: **Win32 cannot
address an individual Windows Terminal tab; SendInput hits the active tab. So the Zulu
SendKeys orchestrator CANNOT safely actuate a specific slot while the fleet runs as WT tabs
(one window, many tabs).** This is a HARD architectural blocker for "apply SendKeys
self-compaction to the full fleet" -- NOT a config/grace/opt-in issue.

## ...BUT the fleet does NOT need SendKeys (native path PROVEN LIVE)
Self-compaction + auto-continuation is ALREADY solved natively, no cross-tab keystroke needed:
1. **auto-compact@90%** (`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`) natively self-compacts each chat at
   threshold -- the harness does it, no orchestrator.
2. **precompact-handoff** writes a non-stub slot-scoped RESUME (proven this session:
   "Last work (slot alpha): 0e12da9955...(slot:alpha)" + the /startup-alpha /loop /goal re-entry).
3. **session-start-auto-resume** emits `/startup-alpha /loop [10m] /goal` on the post-compact
   SessionStart -- PROVEN LIVE this turn: piped `{source:compact, session_id:db273e77...}` ->
   additionalContext NEXT ACTION = `/startup-alpha /loop [10m] /goal` + the resume directive.
**Conclusion: fleet-wide self-compaction + auto-session-start = native auto-compact@90% +
U-AUTOSTART-LOOP-GOAL (be9182dca7), which is WT-tab-agnostic. The SendKeys/Zulu orchestrator
is the WRONG mechanism for a tabbed fleet -- deprecate it for tab-based fleets, or run each
slot in a SEPARATE WT WINDOW (own HWND) if external actuation is ever required.**

## Standing gap (unchanged from the canary investigation earlier this session)
All 24 manageable slots are opted-in AND past the 24h dry-run grace (optInAt 2026-05-22) ->
every one reads "LIVE (grace expired -- sweeps will SendKeys)". The ONLY thing keeping the
fleet in dry-run is the GLOBAL `PRISM_ZULU_DRY_RUN` / `--dry-run` on the scheduled task.
There is NO per-slot live-actuation lever -- so "canary alpha live first" cannot be done by
opt-in (already done) or by the global flag (flips all 24 at once). A per-slot live override
(subordinate to the two hard kills `PRISM_ZULU_DISABLE` / `PRISM_SENDKEYS_DISABLE`) is the
build needed for true canary actuation. See `decideExecutionGate` in
`scripts/lib/zulu-orchestrator-lib.mjs:136`.
